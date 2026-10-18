import { describe, expect, it } from "vitest";
import type { BillingClaimListItem } from "@/lib/api/claims";
import {
  agencyDefaultPlaceholder,
  countIssues,
  formatCents,
  getClaimX12Action,
  getExportableClaims,
  groupClaimIssues,
} from "./x12ExportUtils";

function claim(overrides: Partial<BillingClaimListItem>): BillingClaimListItem {
  return {
    id: "c1",
    claimNumber: "CLM-1",
    status: "pending",
    amount: 100,
    clientId: "client-1",
    clientName: "Zahra Barbour",
    serviceCode: "H2016",
    serviceDate: null,
    shiftCount: 1,
    createdAt: "2026-10-01T00:00:00.000Z",
    rejectionReason: null,
    ...overrides,
  };
}

describe("getExportableClaims", () => {
  const claims = [
    claim({ id: "pending" }),
    claim({ id: "paid", status: "paid" }),
    claim({
      id: "exported",
      ediExport: { batchId: "b1", controlNumber: "000000001", usageIndicator: "T", exportedAt: null },
    }),
  ];

  it("keeps pending claims that are not in a file yet", () => {
    expect(getExportableClaims(claims).map((c) => c.id)).toEqual(["pending"]);
  });

  it("includes exported claims when resubmitting", () => {
    expect(getExportableClaims(claims, { resubmit: true }).map((c) => c.id)).toEqual([
      "pending",
      "exported",
    ]);
  });
});

describe("groupClaimIssues", () => {
  it("lists each claim once with all of its problems", () => {
    expect(
      groupClaimIssues([
        { claimId: "a", claimNumber: "CLM-A", message: "Missing patient signature" },
        { claimId: "b", claimNumber: "CLM-B", message: "Missing Medicaid ID" },
        { claimId: "a", claimNumber: "CLM-A", message: "Missing provider signature" },
      ]),
    ).toEqual([
      { claimId: "a", claimNumber: "CLM-A", messages: ["Missing patient signature", "Missing provider signature"] },
      { claimId: "b", claimNumber: "CLM-B", messages: ["Missing Medicaid ID"] },
    ]);
  });
});

describe("formatting", () => {
  it("formats cents as dollars", () => {
    expect(formatCents(2167000)).toBe("$21,670.00");
  });

  it("counts blocking issues", () => {
    expect(countIssues(null)).toBe(0);
    expect(
      countIssues({
        valid: false,
        claimCount: 1,
        settingsErrors: [{ message: "x" }],
        claimErrors: [{ message: "y" }, { message: "z" }],
        warnings: [{ message: "w" }],
      }),
    ).toBe(3);
  });
});

describe("agencyDefaultPlaceholder", () => {
  it("shows the agency value a blank field will use", () => {
    expect(agencyDefaultPlaceholder("submitterName", { submitterName: "CareOnBoard LLC" })).toBe(
      "From agency profile: CareOnBoard LLC",
    );
    expect(agencyDefaultPlaceholder("billingTaxId", { submitterName: "CareOnBoard LLC" })).toBeUndefined();
    expect(agencyDefaultPlaceholder("billingTaxId", { taxIdLast4: "4321" })).toBe("From agency EIN: ••4321");
    expect(agencyDefaultPlaceholder("billingCity", { billingCity: "  " })).toBeUndefined();
  });

  it("asks for the +4 when the agency ZIP has only 5 digits", () => {
    expect(agencyDefaultPlaceholder("billingZip", { billingZip: "08608" })).toBe(
      "Agency profile has 08608. Enter the full ZIP+4",
    );
    expect(agencyDefaultPlaceholder("billingZip", { billingZip: "08608-1234" })).toBe(
      "From agency profile: 08608-1234",
    );
  });
});

describe("getClaimX12Action", () => {
  it("downloads an exported claim, exports a pending one, and hides otherwise", () => {
    expect(getClaimX12Action({ canManage: true, status: "paid", ediExport: { batchId: "b1" } })).toBe("download");
    expect(getClaimX12Action({ canManage: true, status: "pending" })).toBe("export");
    expect(getClaimX12Action({ canManage: true, status: "rejected" })).toBeNull();
    expect(getClaimX12Action({ canManage: false, status: "pending" })).toBeNull();
  });
});
