import { describe, expect, it, vi } from "vitest";
import type { Shift } from "@/lib/api/shifts";
import {
  loadAllShiftPages,
  operationAgencyId,
  scopedShiftListParams,
} from "@/lib/operational-agency/shiftScope";

const shift = (id: string, agencyId: string): Shift => ({
  id,
  agencyId,
  date: "2026-08-01",
  startTime: "09:00",
  status: "pending" as Shift["status"],
});

describe("super-admin shift scope", () => {
  it("omits agencyId for all-agencies reads while preserving the URL range", () => {
    expect(scopedShiftListParams(
      "",
      "?startDate=2026-07-03&endDate=2026-08-01",
      "ddd",
    )).toEqual({
      startDate: "2026-07-03",
      endDate: "2026-08-01",
      client: true,
      employee: true,
      agency: true,
      clientType: "ddd",
      limit: 200,
    });
  });

  it("adds the optional agency filter when one agency is selected", () => {
    expect(scopedShiftListParams(
      "atlas",
      "?startDate=2026-07-03&endDate=2026-08-01",
      "hha",
    )).toMatchObject({ agencyId: "atlas", clientType: "hha" });
  });

  it("loads every cursor page and rejects a repeated cursor", async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce({ success: true, count: 1, shifts: [shift("a", "atlas")], nextCursor: "a" })
      .mockResolvedValueOnce({ success: true, count: 1, shifts: [shift("b", "beacon")], nextCursor: null });
    await expect(loadAllShiftPages(fetchPage, { limit: 200 })).resolves.toEqual([
      shift("a", "atlas"),
      shift("b", "beacon"),
    ]);
    expect(fetchPage).toHaveBeenNthCalledWith(2, { limit: 200, startAfter: "a" });

    const repeated = vi.fn().mockResolvedValue({
      success: true,
      count: 0,
      shifts: [],
      nextCursor: "same",
    });
    await expect(loadAllShiftPages(repeated, { limit: 200 })).rejects.toThrow("Repeated shift cursor");
  });

  it("uses the row agency for mutations in an all-agencies view", () => {
    expect(operationAgencyId(shift("a", "atlas"), "")).toBe("atlas");
    expect(() => operationAgencyId({ ...shift("a", ""), agencyId: undefined }, "")).toThrow("Shift agency is missing");
  });
});
