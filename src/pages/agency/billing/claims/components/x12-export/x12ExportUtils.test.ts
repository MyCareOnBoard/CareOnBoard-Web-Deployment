import { describe, expect, it } from "vitest";
import type { BillingClaimListItem } from "@/lib/api/claims";
import {
  agencyDefaultPlaceholder,
  claimX12ButtonText,
  countIssues,
  formatCents,
  getClaimX12Action,
  getExportableClaims,
  groupClaimIssues,
  readUploadFile,
  runPreviewText,
  submissionLabel,
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

describe("claimX12ButtonText", () => {
  it("says a new file is made and the report locks", () => {
    expect(claimX12ButtonText({ mode: "export" })).toEqual({
      label: "Create & download 837P file",
      detail: "Electronic claim for NJMMIS. Locks this report",
    });
    expect(claimX12ButtonText({ mode: "export", busy: true }).label).toBe("Creating 837P file…");
  });

  it("names the file a claim is already in", () => {
    expect(claimX12ButtonText({ mode: "download", ediExport: { fileName: "837P_TEST.x12", controlNumber: "000000001" } }).detail).toBe("837P_TEST.x12");
    expect(claimX12ButtonText({ mode: "download", ediExport: { controlNumber: "000000001" } }).detail).toBe("Control #000000001");
  });
});

describe("submissionLabel", () => {
  it("shows the NJMMIS response, then sent, then not sent", () => {
    const submission = { status: "rejected" as const, ackType: "999", receivedAt: null, responseId: null, errors: [] };
    expect(submissionLabel({ status: "ready", submission, uploadedAt: null })).toEqual({ label: "Rejected", tone: "danger" });
    expect(submissionLabel({ status: "ready", submission: null, uploadedAt: "2026-10-22T10:00:00.000Z" })?.label).toBe("Sent");
    expect(submissionLabel({ status: "ready", submission: null, uploadedAt: null })?.label).toBe("Not sent");
    expect(submissionLabel({ status: "invalid", submission: null, uploadedAt: null })).toBeNull();
  });
});

describe("runPreviewText", () => {
  it("reads like the spec", () => {
    expect(runPreviewText({ claims: 312, files: 1, totalChargeCents: 4821000 })).toBe("312 claims in 1 file, $48,210.00");
    expect(runPreviewText({ claims: 1, files: 2, totalChargeCents: 100 })).toBe("1 claim in 2 files, $1.00");
  });
});

describe("readUploadFile", () => {
  it("sends text files as text and zips as base64", async () => {
    const text = await readUploadFile(new File(["ISA*00~"], "a.999"));
    expect(text).toEqual({ fileName: "a.999", content: "ISA*00~", encoding: "utf8" });
    const zip = await readUploadFile(new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x01])], "r.zip"));
    expect(zip.encoding).toBe("base64");
    expect(zip.content).toBe(btoa(String.fromCharCode(0x50, 0x4b, 0x03, 0x04, 0x01)));
  });
});
