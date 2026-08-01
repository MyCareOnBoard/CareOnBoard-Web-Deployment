import { beforeEach, describe, expect, it, vi } from "vitest";

const axiosGet = vi.hoisted(() => vi.fn());

vi.mock("@/lib/axios", () => ({
  default: { get: axiosGet },
}));

import { listCalendarShifts } from "./shifts";

describe("shift calendar API", () => {
  beforeEach(() => {
    axiosGet.mockReset();
  });

  it("rejects an invalid request month before issuing a request", async () => {
    await expect(listCalendarShifts({
      agencyId: "agency-a",
      month: "2026-8",
      clientType: "ddd",
    })).rejects.toThrow("month must use YYYY-MM.");

    expect(axiosGet).not.toHaveBeenCalled();
  });

  it("rejects malformed calendar envelopes and compact rows", async () => {
    const validShift = {
      id: "shift-1",
      date: "2026-08-12",
      startTime: "09:00 AM",
      endTime: null,
      status: "pending",
      clientId: "client-1",
      clientName: "Jamie Client",
      employeeId: null,
      staffName: null,
      serviceCode: "H2021",
      anomalyCodes: ["unassigned"],
    };
    const malformed = [
      { success: true, data: { month: "2026-09", shifts: [validShift], nextCursor: null } },
      { success: true, data: { month: "2026-08", shifts: [validShift], nextCursor: 42 } },
      { success: true, data: { month: "2026-08", shifts: [{ ...validShift, clientName: 17 }], nextCursor: null } },
      { success: true, data: { month: "2026-08", shifts: [{ ...validShift, anomalyCodes: ["private_note"] }], nextCursor: null } },
    ];

    for (const data of malformed) {
      axiosGet.mockResolvedValueOnce({ data });
      await expect(listCalendarShifts({
        agencyId: "agency-a",
        month: "2026-08",
        clientType: "ddd",
      })).rejects.toThrow("Invalid shift calendar response.");
    }
  });
});
