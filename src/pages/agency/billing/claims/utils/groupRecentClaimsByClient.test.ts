import { describe, expect, it } from "vitest";
import type { RecentClaim } from "../data/mockClaimsDashboardData";
import { groupRecentClaimsByClient } from "./groupRecentClaimsByClient";

function makeClaim(overrides: Partial<RecentClaim> & Pick<RecentClaim, "id" | "client">): RecentClaim {
  return {
    staffId: "staff-1",
    serviceCode: "H2021HI",
    paNumber: "123",
    serviceDate: "June 5, 2026",
    durationStart: "8:00 AM",
    durationEnd: "11:30 AM",
    totalHours: "3.5",
    rate: "$9.61/hr",
    ...overrides,
  };
}

describe("groupRecentClaimsByClient", () => {
  it("groups claims by clientId and sorts groups alphabetically", () => {
    const groups = groupRecentClaimsByClient([
      makeClaim({ id: "1", client: "Zoe Example", clientId: "c-z" }),
      makeClaim({ id: "2", client: "Alex Bran-Monzon", clientId: "c-a" }),
      makeClaim({ id: "3", client: "Alex Bran-Monzon", clientId: "c-a" }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.clientName).toBe("Alex Bran-Monzon");
    expect(groups[0]?.claims).toHaveLength(2);
    expect(groups[1]?.clientName).toBe("Zoe Example");
  });

  it("falls back to client name when clientId is missing", () => {
    const groups = groupRecentClaimsByClient([
      makeClaim({ id: "1", client: "No Id Client" }),
      makeClaim({ id: "2", client: "No Id Client" }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.clientKey).toBe("No Id Client");
  });
});
