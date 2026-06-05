import { describe, expect, it } from "vitest";
import type { BillingClaimListItem } from "@/lib/api/claims";
import { groupSavedClaimsByClient } from "./groupSavedClaimsByClient";

function makeClaim(
  overrides: Partial<BillingClaimListItem> & Pick<BillingClaimListItem, "id" | "claimNumber">,
): BillingClaimListItem {
  return {
    status: "pending",
    amount: 10,
    clientId: "client-1",
    clientName: "Alex Bran-Monzon",
    serviceCode: "H2021HI",
    serviceDate: "2026-06-05",
    shiftCount: 1,
    createdAt: "2026-06-05T12:00:00.000Z",
    rejectionReason: null,
    ...overrides,
  };
}

describe("groupSavedClaimsByClient", () => {
  it("groups claims by clientId", () => {
    const groups = groupSavedClaimsByClient([
      makeClaim({ id: "c1", claimNumber: "CLM-001" }),
      makeClaim({ id: "c2", claimNumber: "CLM-002" }),
      makeClaim({
        id: "c3",
        claimNumber: "CLM-003",
        clientId: "client-2",
        clientName: "Jane Doe",
      }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.claims).toHaveLength(2);
    expect(groups[1]?.claims).toHaveLength(1);
  });
});
