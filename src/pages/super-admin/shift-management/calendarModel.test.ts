import { beforeEach, describe, expect, it, vi } from "vitest";

const axiosGet = vi.hoisted(() => vi.fn());

vi.mock("@/lib/axios", () => ({
  default: { get: axiosGet },
}));

import { listCalendarShifts, ShiftStatus } from "@/lib/api/shifts";
import type { OperationalAgencySummary } from "@/lib/operational-agency/types";
import {
  createCalendarState,
  mapWithConcurrency,
  markCalendarAgencyError,
  markCalendarAgencyLoading,
  mergeCalendarAgencyPage,
} from "./calendarModel";

const agencyA: OperationalAgencySummary = {
  id: "agency-a",
  name: "Atlas Care",
  status: "active",
  supportedClientTypes: ["ddd", "hha"],
  timezone: "America/New_York",
};

const agencyB: OperationalAgencySummary = {
  id: "agency-b",
  name: "Beacon Supports",
  status: "active",
  supportedClientTypes: ["ddd"],
  timezone: "America/New_York",
};

describe("calendar shift API", () => {
  beforeEach(() => {
    axiosGet.mockReset();
  });

  it("sends one agency, the cursor, a bounded limit, and the caller AbortSignal", async () => {
    const signal = new AbortController().signal;
    axiosGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          month: "2026-08",
          shifts: [{
            id: "shift-1",
            date: "2026-08-03",
            startTime: "09:00",
            endTime: "12:00",
            status: "pending",
            clientId: "client-1",
            clientName: "Jamie Client",
            employeeId: "staff-1",
            staffName: "Robin Staff",
            serviceCode: "H2021",
            anomalyCodes: [],
          }],
          nextCursor: "page-2",
        },
      },
    });

    await expect(listCalendarShifts({
      agencyId: "agency-a",
      month: "2026-08",
      clientType: "ddd",
      cursor: "page-1",
      limit: 999,
    }, { signal })).resolves.toEqual({
      month: "2026-08",
      shifts: [expect.objectContaining({ id: "shift-1", clientName: "Jamie Client" })],
      nextCursor: "page-2",
    });

    expect(axiosGet).toHaveBeenCalledWith("/shifts/calendar", {
      params: {
        agencyId: "agency-a",
        month: "2026-08",
        clientType: "ddd",
        cursor: "page-1",
        limit: 200,
      },
      signal,
    });
  });

  it("rejects an empty agency before issuing a request", async () => {
    await expect(listCalendarShifts({
      agencyId: "",
      month: "2026-08",
      clientType: "ddd",
    })).rejects.toThrow("agencyId is required");
    expect(axiosGet).not.toHaveBeenCalled();
  });
});

describe("calendar model", () => {
  it("binds state to the request key used for synchronous render suppression", () => {
    const state = createCalendarState([agencyA], 9, "agency-a|2026-08|ddd");
    expect(state.requestKey).toBe("agency-a|2026-08|ddd");
  });

  it("dedupes through one Map lookup per incoming shift and sorts stably", () => {
    const state = createCalendarState([agencyA, agencyB], 4);
    const has = vi.spyOn(Map.prototype, "has");
    const page = {
      month: "2026-08",
      shifts: [
        { id: "late", date: "2026-08-04", startTime: "11:00", endTime: null, status: ShiftStatus.PENDING, clientId: "c1", clientName: "Client 1", employeeId: "e1", staffName: "Staff 1", serviceCode: null, anomalyCodes: [] },
        { id: "early-z", date: "2026-08-04", startTime: "09:00", endTime: null, status: ShiftStatus.PENDING, clientId: "c2", clientName: "Client 2", employeeId: "e2", staffName: "Staff 2", serviceCode: null, anomalyCodes: [] },
        { id: "early-a", date: "2026-08-04", startTime: "09:00", endTime: null, status: ShiftStatus.PENDING, clientId: "c3", clientName: "Client 3", employeeId: "e3", staffName: "Staff 3", serviceCode: null, anomalyCodes: [] },
        { id: "early-a", date: "2026-08-04", startTime: "09:00", endTime: null, status: ShiftStatus.PENDING, clientId: "c3", clientName: "Client 3", employeeId: "e3", staffName: "Staff 3", serviceCode: null, anomalyCodes: [] },
      ],
      nextCursor: null,
    };

    const mergedA = mergeCalendarAgencyPage(state, agencyB, page, 4);
    const merged = mergeCalendarAgencyPage(mergedA, agencyA, {
      month: "2026-08",
      shifts: [{ id: "first", date: "2026-08-03", startTime: "15:00", endTime: null, status: ShiftStatus.COMPLETED, clientId: "c4", clientName: "Client 4", employeeId: "e4", staffName: "Staff 4", serviceCode: null, anomalyCodes: [] }],
      nextCursor: null,
    }, 4);

    expect(has).toHaveBeenCalledTimes(5);
    expect(merged.shifts.map((shift) => `${shift.agencyName}:${shift.id}`)).toEqual([
      "Atlas Care:first",
      "Beacon Supports:early-a",
      "Beacon Supports:early-z",
      "Beacon Supports:late",
    ]);
    expect(merged.shiftById.size).toBe(4);
    expect(merged.shifts[1]).toMatchObject({ agencyId: "agency-b", agencyName: "Beacon Supports" });
    expect(merged).not.toHaveProperty("pages");
    has.mockRestore();
  });

  it("rejects stale generation updates and keeps per-agency failures isolated", () => {
    const state = createCalendarState([agencyA, agencyB], 8);
    const loading = markCalendarAgencyLoading(state, agencyA.id, 8);
    const failed = markCalendarAgencyError(loading, agencyA.id, "Timed out", 8);
    const stale = mergeCalendarAgencyPage(failed, agencyB, {
      month: "2026-08",
      shifts: [{ id: "stale", date: "2026-08-01", startTime: "08:00", endTime: null, status: ShiftStatus.PENDING, clientId: null, clientName: null, employeeId: null, staffName: null, serviceCode: null, anomalyCodes: [] }],
      nextCursor: null,
    }, 7);

    expect(stale).toBe(failed);
    expect(failed.agencies.get("agency-a")).toEqual({ status: "error", error: "Timed out" });
    expect(failed.agencies.get("agency-b")).toEqual({ status: "idle", error: null });
  });

  it("bounds active workers while preserving input order and observes aborts", async () => {
    let active = 0;
    let peak = 0;
    const releases: Array<() => void> = [];
    const controller = new AbortController();

    const work = mapWithConcurrency([0, 1, 2, 3, 4, 5], 4, async (value, signal) => {
      expect(signal).toBe(controller.signal);
      active += 1;
      peak = Math.max(peak, active);
      await new Promise<void>((resolve) => releases.push(resolve));
      active -= 1;
      return value * 2;
    }, controller.signal);

    await vi.waitFor(() => expect(releases).toHaveLength(4));
    releases.splice(0, 4).forEach((release) => release());
    await vi.waitFor(() => expect(releases).toHaveLength(2));
    releases.splice(0, 2).forEach((release) => release());

    await expect(work).resolves.toEqual([0, 2, 4, 6, 8, 10]);
    expect(peak).toBe(4);

    controller.abort();
    await expect(mapWithConcurrency([1], 4, async () => 1, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  });

  it("keeps normalized state bounded across generated pages", () => {
    let state = createCalendarState([agencyA], 12);
    const pageSize = 200;
    for (let pageNumber = 0; pageNumber < 8; pageNumber += 1) {
      state = mergeCalendarAgencyPage(state, agencyA, {
        month: "2026-08",
        shifts: Array.from({ length: pageSize }, (_, index) => ({
          id: `shift-${pageNumber}-${index}`,
          date: `2026-08-${String((index % 28) + 1).padStart(2, "0")}`,
          startTime: `${String(index % 24).padStart(2, "0")}:00`,
          endTime: null,
          status: ShiftStatus.PENDING,
          clientId: null,
          clientName: null,
          employeeId: null,
          staffName: null,
          serviceCode: null,
          anomalyCodes: [],
        })),
        nextCursor: pageNumber === 7 ? null : `cursor-${pageNumber + 1}`,
      }, 12);
    }

    expect(state.shifts).toHaveLength(1_600);
    expect(state.shiftById.size).toBe(1_600);
    expect([...state.agencies.values()]).toEqual([{ status: "idle", error: null }]);
    expect(Object.keys(state)).toEqual(["generation", "requestKey", "shiftById", "shifts", "agencies"]);
  });
});
