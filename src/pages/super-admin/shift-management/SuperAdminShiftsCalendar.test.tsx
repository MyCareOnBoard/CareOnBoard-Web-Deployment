import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useNavigate } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarShiftPage, CompactCalendarShift } from "@/lib/api/shifts";
import type { OperationalAgencySummary } from "@/lib/operational-agency/types";

const listCalendarShifts = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/shifts", () => ({ listCalendarShifts }));

import SuperAdminShiftsCalendar from "./SuperAdminShiftsCalendar";

function agency(id: string, name: string, supportedClientTypes: readonly ("ddd" | "hha")[] = ["ddd", "hha"]): OperationalAgencySummary {
  return { id, name, status: "active", supportedClientTypes, timezone: "America/New_York" };
}

function shift(id: string, date: string, overrides: Partial<CompactCalendarShift> = {}): CompactCalendarShift {
  return {
    id,
    date,
    startTime: "09:00",
    endTime: "12:00",
    status: "pending" as CompactCalendarShift["status"],
    clientId: `client-${id}`,
    clientName: `Client ${id}`,
    employeeId: `staff-${id}`,
    staffName: `Staff ${id}`,
    serviceCode: "H2021",
    anomalyCodes: [],
    ...overrides,
  };
}

function page(shifts: CompactCalendarShift[], nextCursor: string | null = null, month = "2026-08"): CalendarShiftPage {
  return { month, shifts, nextCursor };
}

function abortable<T>(signal: AbortSignal | undefined, work: () => Promise<T>): Promise<T> {
  if (!signal) return work();
  if (signal.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    void work().then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

describe("SuperAdminShiftsCalendar", () => {
  const navigate = vi.fn();

  beforeEach(() => {
    listCalendarShifts.mockReset();
    navigate.mockReset();
    vi.mocked(useNavigate).mockReturnValue(navigate);
  });

  it("issues no request for an explicit empty selection", () => {
    render(
      <SuperAdminShiftsCalendar
        agencies={[]}
        month="2026-08"
        mode="ddd"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Choose one or more agencies to view shifts.")).toBeVisible();
    expect(listCalendarShifts).not.toHaveBeenCalled();
  });

  it("keeps at most four agency chains active and consumes pages sequentially", async () => {
    const agencies = Array.from({ length: 6 }, (_, index) => agency(`agency-${index}`, `Agency ${index}`));
    const active = new Set<string>();
    let peak = 0;
    const cursors = new Map<string, Array<string | undefined>>();

    listCalendarShifts.mockImplementation((params, options) => abortable(options?.signal, async () => {
      const seen = cursors.get(params.agencyId) ?? [];
      seen.push(params.cursor);
      cursors.set(params.agencyId, seen);
      active.add(params.agencyId);
      peak = Math.max(peak, active.size);
      await new Promise((resolve) => window.setTimeout(resolve, 5));
      if (!params.cursor) {
        return page([shift(`${params.agencyId}-one`, "2026-08-04")], "next-page");
      }
      active.delete(params.agencyId);
      return page([shift(`${params.agencyId}-two`, "2026-08-05")]);
    }));

    render(
      <SuperAdminShiftsCalendar
        agencies={agencies}
        month="2026-08"
        mode="ddd"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    expect(await screen.findByText("Client agency-0-one")).toBeVisible();
    await waitFor(() => expect(screen.getByText("12 shifts across 6 agencies.")).toBeVisible());
    expect(peak).toBe(4);
    for (const selectedAgency of agencies) {
      expect(cursors.get(selectedAgency.id)).toEqual([undefined, "next-page"]);
    }
  });

  it("retains successful agencies and retries only the failed chain", async () => {
    const atlas = agency("atlas", "Atlas Care");
    const beacon = agency("beacon", "Beacon Supports");
    let beaconAttempts = 0;

    listCalendarShifts.mockImplementation(async (params) => {
      if (params.agencyId === "atlas") return page([shift("atlas-shift", "2026-08-03")]);
      beaconAttempts += 1;
      if (beaconAttempts === 1) throw new Error("Gateway timeout");
      return page([shift("beacon-shift", "2026-08-06")]);
    });

    render(
      <SuperAdminShiftsCalendar
        agencies={[atlas, beacon]}
        month="2026-08"
        mode="ddd"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    expect(await screen.findByText("Client atlas-shift")).toBeVisible();
    const retry = await screen.findByRole("button", { name: "Retry Beacon Supports" });
    await userEvent.click(retry);

    expect(await screen.findByText("Client beacon-shift")).toBeVisible();
    expect(screen.getByText("Client atlas-shift")).toBeVisible();
    expect(listCalendarShifts.mock.calls.filter(([params]) => params.agencyId === "atlas")).toHaveLength(1);
    expect(beaconAttempts).toBe(2);
  });

  it("replaces changed rows and removes deleted rows when a partial agency retry succeeds", async () => {
    const atlas = agency("atlas", "Atlas Care");
    const beacon = agency("beacon", "Beacon Supports");
    let beaconAttempt = 0;

    listCalendarShifts.mockImplementation(async (params) => {
      if (params.agencyId === "atlas") {
        return page([shift("atlas-stable", "2026-08-02", { clientName: "Atlas stable" })]);
      }
      beaconAttempt += 1;
      if (beaconAttempt === 1) {
        return page([
          shift("beacon-changed", "2026-08-03", { clientName: "Old Beacon client" }),
          shift("beacon-deleted", "2026-08-04", { clientName: "Deleted Beacon client" }),
        ], "beacon-page-2");
      }
      if (beaconAttempt === 2) throw new Error("Second page failed");
      return page([
        shift("beacon-changed", "2026-08-06", { clientName: "Fresh Beacon client", status: "completed" as CompactCalendarShift["status"] }),
      ]);
    });

    render(
      <SuperAdminShiftsCalendar
        agencies={[atlas, beacon]}
        month="2026-08"
        mode="ddd"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    expect(await screen.findByText("Old Beacon client")).toBeVisible();
    expect(screen.getByText("Deleted Beacon client")).toBeVisible();
    await userEvent.click(await screen.findByRole("button", { name: "Retry Beacon Supports" }));

    expect(await screen.findByText("Fresh Beacon client")).toBeVisible();
    expect(screen.queryByText("Old Beacon client")).not.toBeInTheDocument();
    expect(screen.queryByText("Deleted Beacon client")).not.toBeInTheDocument();
    expect(screen.getByText("Atlas stable")).toBeVisible();
    expect(beaconAttempt).toBe(3);
  });

  it("rejects a repeated agency cursor without issuing a third page request", async () => {
    listCalendarShifts
      .mockResolvedValueOnce(page([shift("atlas-one", "2026-08-03")], "repeat"))
      .mockResolvedValueOnce(page([], "repeat"))
      .mockRejectedValueOnce(new Error("Runaway cursor request"));

    render(
      <SuperAdminShiftsCalendar
        agencies={[agency("atlas", "Atlas Care")]}
        month="2026-08"
        mode="ddd"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    expect(await screen.findByText("Atlas Care: Repeated calendar cursor.")).toBeVisible();
    expect(listCalendarShifts).toHaveBeenCalledTimes(2);
  });

  it("queues one retry behind four active chains and suppresses duplicate clicks", async () => {
    const blockers = new Map<string, ReturnType<typeof deferred<CalendarShiftPage>>>();
    let retryAttempts = 0;
    let active = 0;
    let peak = 0;
    listCalendarShifts.mockImplementation(async (params) => {
      active += 1;
      peak = Math.max(peak, active);
      if (params.agencyId === "retry") {
        retryAttempts += 1;
        active -= 1;
        if (retryAttempts === 1) throw new Error("Temporary failure");
        return page([shift("retried", "2026-08-07")]);
      }
      const pending = deferred<CalendarShiftPage>();
      blockers.set(params.agencyId, pending);
      const result = await pending.promise;
      active -= 1;
      return result;
    });

    render(
      <SuperAdminShiftsCalendar
        agencies={[
          agency("retry", "Retry Care"),
          ...Array.from({ length: 4 }, (_, index) => agency(`block-${index}`, `Block ${index}`)),
        ]}
        month="2026-08"
        mode="ddd"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    const retry = await screen.findByRole("button", { name: "Retry Retry Care" });
    await waitFor(() => expect(blockers.size).toBe(4));
    fireEvent.click(retry);
    fireEvent.click(retry);
    fireEvent.click(retry);

    expect(retryAttempts).toBe(1);
    expect(peak).toBe(4);

    await act(async () => {
      blockers.get("block-0")?.resolve(page([]));
    });
    await waitFor(() => expect(retryAttempts).toBe(2));
    expect(peak).toBe(4);
    await act(async () => {
      for (const pending of blockers.values()) pending.resolve(page([]));
    });
  });

  it("skips agencies that do not support the selected mode", async () => {
    listCalendarShifts.mockResolvedValue(page([shift("hha-shift", "2026-08-03")]));

    render(
      <SuperAdminShiftsCalendar
        agencies={[
          agency("hha", "Home Health", ["hha"]),
          agency("ddd", "Community Supports", ["ddd"]),
        ]}
        month="2026-08"
        mode="hha"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    expect(await screen.findByText("Client hha-shift")).toBeVisible();
    expect(screen.getByText("Community Supports does not support HHA.")).toBeVisible();
    expect(listCalendarShifts).toHaveBeenCalledTimes(1);
  });

  it("preserves the model's date, time, agency, and id tuple order in each day", async () => {
    listCalendarShifts.mockImplementation(async (params) => params.agencyId === "atlas"
      ? page([shift("z-atlas", "2026-08-03", { startTime: "09:00", anomalyCodes: ["missed"] })])
      : page([shift("a-beacon", "2026-08-03", { startTime: "09:00" })]));

    render(
      <SuperAdminShiftsCalendar
        agencies={[agency("atlas", "Atlas Care"), agency("beacon", "Beacon Supports")]}
        month="2026-08"
        mode="ddd"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    await waitFor(() => expect(screen.getByText("2 shifts across 2 agencies.")).toBeVisible());
    const day = screen.getByRole("gridcell", { name: /August 3, 2 shifts/i });
    expect(day).toHaveAccessibleName(/First: Client z-atlas/i);
  });

  it("renders backend anomaly metadata and names the caregiver, status, and anomaly", async () => {
    listCalendarShifts.mockResolvedValue(page([
      shift("flagged", "2026-08-03", { anomalyCodes: ["missed"] }),
    ]));

    render(
      <SuperAdminShiftsCalendar
        agencies={[agency("atlas", "Atlas Care")]}
        month="2026-08"
        mode="ddd"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    expect(await screen.findByTitle("Missed shift")).toHaveTextContent("Missed");
    expect(screen.getByRole("gridcell", { name: /August 3, 1 shift/i })).toHaveAccessibleName(
      /Staff flagged.*Atlas Care.*Pending.*Missed shift/i,
    );
  });

  it("aborts a stale month generation and never renders its late result", async () => {
    const observedSignals: AbortSignal[] = [];
    listCalendarShifts.mockImplementation((params, options) => {
      observedSignals.push(options.signal);
      if (params.month === "2026-08") {
        return abortable(options.signal, () => new Promise((resolve) => {
          window.setTimeout(() => resolve(page([shift("stale-shift", "2026-08-03")], null, "2026-08")), 50);
        }));
      }
      return Promise.resolve(page([shift("fresh-shift", "2026-09-03")], null, "2026-09"));
    });

    const view = render(
      <SuperAdminShiftsCalendar
        agencies={[agency("atlas", "Atlas Care")]}
        month="2026-08"
        mode="ddd"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );
    view.rerender(
      <SuperAdminShiftsCalendar
        agencies={[agency("atlas", "Atlas Care")]}
        month="2026-09"
        mode="ddd"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    expect(await screen.findByText("Client fresh-shift")).toBeVisible();
    expect(observedSignals[0]?.aborted).toBe(true);
    expect(screen.queryByText("Client stale-shift")).not.toBeInTheDocument();
  });

  it("keeps incomplete shift details non-interactive with an accessible reason", async () => {
    listCalendarShifts.mockResolvedValue(page([shift("shared-id", "2026-08-03")]));
    render(
      <SuperAdminShiftsCalendar
        agencies={[agency("atlas", "Atlas Care"), agency("beacon", "Beacon Supports")]}
        month="2026-08"
        mode="ddd"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    expect(await screen.findByText("Client shared-id")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Open shift details for Client shared-id/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Shift details are not available yet/i)).toBeVisible();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("suppresses the empty result while agencies are loading or failed", async () => {
    const pending = deferred<CalendarShiftPage>();
    listCalendarShifts.mockReturnValueOnce(pending.promise).mockRejectedValueOnce(new Error("Broken feed"));
    const view = render(
      <SuperAdminShiftsCalendar
        agencies={[agency("atlas", "Atlas Care")]}
        month="2026-08"
        mode="ddd"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(screen.queryByText("No shifts found for these agencies.")).not.toBeInTheDocument();
    view.rerender(
      <SuperAdminShiftsCalendar
        agencies={[agency("beacon", "Beacon Supports")]}
        month="2026-08"
        mode="ddd"
        onMonthChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );
    expect(await screen.findByText("Beacon Supports: Broken feed")).toBeVisible();
    expect(screen.queryByText("No shifts found for these agencies.")).not.toBeInTheDocument();
    await act(async () => pending.resolve(page([])));
  });
});
