import { describe, expect, it } from "vitest";
import type { BillingClaimListItem } from "@/lib/api/claims";
import {
  filterClaimsByClientSearch,
  filterSavedClaims,
  PENDING_CLAIM_STATUS_OPTIONS,
  STATUS_LABEL_TO_FILTER,
} from "./savedClaimUtils";

const sampleClaims: BillingClaimListItem[] = [
  {
    id: "claim_1",
    claimNumber: "CLM-000001",
    status: "pending",
    amount: 100,
    clientId: "client_1",
    clientName: "Alice Example",
    serviceCode: "H2021",
    serviceDate: "2026-05-20",
    shiftCount: 1,
    createdAt: "2026-05-20T10:00:00.000Z",
    rejectionReason: null,
  },
  {
    id: "claim_2",
    claimNumber: "CLM-000002",
    status: "paid",
    amount: 200,
    clientId: "client_2",
    clientName: "Bob Example",
    serviceCode: "H2021",
    serviceDate: "2026-05-22",
    shiftCount: 2,
    createdAt: "2026-05-22T10:00:00.000Z",
    rejectionReason: null,
  },
];

describe("savedClaimUtils", () => {
  it("filterSavedClaims filters by status and client query", () => {
    expect(filterSavedClaims(sampleClaims, { status: "paid" })).toHaveLength(1);
    expect(
      filterSavedClaims(sampleClaims, { clientQuery: "alice" })[0]?.claimNumber,
    ).toBe("CLM-000001");
  });

  it("filterClaimsByClientSearch filters by client query without status", () => {
    expect(filterClaimsByClientSearch(sampleClaims, { clientQuery: "bob" })).toHaveLength(1);
    expect(filterClaimsByClientSearch(sampleClaims, { clientQuery: "missing" })).toHaveLength(0);
  });

  it("PENDING_CLAIM_STATUS_OPTIONS includes current and target statuses", () => {
    expect(PENDING_CLAIM_STATUS_OPTIONS).toEqual(["pending", "paid", "rejected"]);
  });

  it("STATUS_LABEL_TO_FILTER maps chart labels to status filters", () => {
    expect(STATUS_LABEL_TO_FILTER.Pending).toBe("pending");
    expect(STATUS_LABEL_TO_FILTER.Paid).toBe("paid");
  });
});
