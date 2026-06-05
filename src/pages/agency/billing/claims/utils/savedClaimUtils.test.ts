import { describe, expect, it } from "vitest";
import type { BillingClaimDetail, BillingClaimListItem } from "@/lib/api/claims";
import type { MileageRide } from "@/lib/api/mileage";
import type { Shift } from "@/lib/api/shifts";
import {
  buildRecentClaimFromBillingDetail,
  buildRecentClaimFromSavedClaim,
  filterClaimsByClientSearch,
  filterSavedClaims,
  PENDING_CLAIM_STATUS_OPTIONS,
  STATUS_LABEL_TO_FILTER,
} from "./savedClaimUtils";
import { EMPTY_CLAIM_REPORT } from "../data/mockClaimReportData";

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

const baseDetail: BillingClaimDetail = {
  id: "claim_1",
  claimNumber: "CLM-000001",
  status: "pending",
  amount: 50,
  clientId: "client_1",
  clientName: "Alice Example",
  serviceCode: "A0090HI22",
  weekRange: "2026-06-05",
  serviceDate: "2026-06-05",
  shiftIds: [],
  rideIds: ["ride_1"],
  rejectionReason: null,
  reportPrefill: {
    ...EMPTY_CLAIM_REPORT,
    paNumber: "1553253313",
  },
  createdAt: "2026-06-05T10:00:00.000Z",
  updatedAt: "2026-06-05T10:00:00.000Z",
  shifts: [],
  rides: [],
};

describe("buildRecentClaimFromBillingDetail", () => {
  it("merges shift claims from billing detail", () => {
    const shift = {
      id: "shift_1",
      clientId: "client_1",
      serviceCode: "H2021HI",
      date: "2026-06-05",
      clockedInAt: "2026-06-05T13:00:00.000Z",
      clockedOutAt: "2026-06-05T16:30:00.000Z",
    } as Shift;

    const detail: BillingClaimDetail = {
      ...baseDetail,
      serviceCode: "H2021HI",
      shiftIds: ["shift_1"],
      rideIds: [],
      shifts: [shift],
      rides: [],
    };

    const claim = buildRecentClaimFromBillingDetail(detail);
    const savedClaim = buildRecentClaimFromSavedClaim(detail, shift);

    expect(claim).toEqual(savedClaim);
    expect(claim.client).toBe("Alice Example");
    expect(claim.serviceCode).toBe("H2021HI");
    expect(claim.paNumber).toBe("1553253313");
    expect(claim.serviceDate).toBe("June 5, 2026");
  });

  it("merges ride claims from billing detail", () => {
    const ride = {
      id: "ride_1",
      clientId: "client_1",
      clientName: "Alice Example",
      caregiverId: "cg_1",
      serviceCode: "A0090HI22",
      completedAt: "2026-06-05T15:00:00.000Z",
      actualDistance: 5,
    } as MileageRide;

    const detail: BillingClaimDetail = {
      ...baseDetail,
      shifts: [],
      rides: [ride],
    };

    const claim = buildRecentClaimFromBillingDetail(detail);

    expect(claim.sourceType).toBe("ride");
    expect(claim.sourceId).toBe("ride_1");
    expect(claim.client).toBe("Alice Example");
    expect(claim.clientId).toBe("client_1");
    expect(claim.serviceCode).toBe("A0090HI22");
    expect(claim.paNumber).toBe("1553253313");
    expect(claim.serviceDate).toBe("June 5, 2026");
  });

  it("throws when billing detail has no linked shifts or rides", () => {
    expect(() => buildRecentClaimFromBillingDetail(baseDetail)).toThrow(
      "This claim has no linked shifts or rides.",
    );
  });
});
