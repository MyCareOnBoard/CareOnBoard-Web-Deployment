import { describe, expect, it } from "vitest";
import type { ReadyToClaimRow } from "@/lib/api/claims";
import {
  formatAgencyMileageRate,
  mapReadyToClaimRowToRecentClaim,
} from "./readyToClaimUtils";

describe("readyToClaimUtils", () => {
  it("formatAgencyMileageRate formats agency rate per mile", () => {
    expect(formatAgencyMileageRate(0.67)).toBe("$0.67/mi");
    expect(formatAgencyMileageRate(0)).toBe("—");
  });

  it("mapReadyToClaimRowToRecentClaim falls back to sortDate for ride service date", () => {
    const row: ReadyToClaimRow = {
      id: "ride:ride-2",
      sourceType: "ride",
      sourceId: "ride-2",
      clientId: "client-1",
      clientName: "Alex",
      staffId: "rHxnNp",
      serviceCode: "A0090HI22",
      sortDate: "2026-06-05",
      weekRange: "2026-06-05",
      actualDistance: 5,
    };

    const claim = mapReadyToClaimRowToRecentClaim(row, 0.58);
    expect(claim.serviceDate).toBe("June 5, 2026");
  });

  it("mapReadyToClaimRowToRecentClaim uses mileage rate for rides", () => {
    const row: ReadyToClaimRow = {
      id: "ride-row-1",
      sourceType: "ride",
      sourceId: "ride-1",
      clientId: "client-1",
      clientName: "Alex Bran-Monzon",
      staffId: "rHxnNp",
      serviceCode: "A0090HI22",
      sortDate: "2026-06-05",
      weekRange: "2026-06-05",
      actualDistance: 5,
    };

    const claim = mapReadyToClaimRowToRecentClaim(row, 0.58);
    expect(claim.rate).toBe("$0.58/mi");
  });

  it("mapReadyToClaimRowToRecentClaim formats 15-min shift rate", () => {
    const row: ReadyToClaimRow = {
      id: "shift-1",
      sourceType: "shift",
      sourceId: "shift-1",
      clientId: "client-1",
      clientName: "Alex",
      staffId: "rHxnNp",
      serviceCode: "H2021HI",
      sortDate: "2026-06-05",
      weekRange: "June 1 - June 7, 2026",
      shiftDate: "2026-06-05",
      clockedInAt: "2026-06-05T13:00:00.000Z",
      clockedOutAt: "2026-06-05T16:30:00.000Z",
      clientRate: "9.61",
      clientPayType: "15-min",
    };

    const claim = mapReadyToClaimRowToRecentClaim(row);
    expect(claim.rate).toBe("$9.61/15-min");
  });
});
