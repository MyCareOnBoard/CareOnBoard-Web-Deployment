import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ClearinghouseResult, X12Batch } from "@/lib/api/claims";
import X12ClearinghouseDialog from "./X12ClearinghouseDialog";
import { clearinghouseResultsCsv } from "./x12ExportUtils";

const mocks = vi.hoisted(() => ({ submit: vi.fn(), report: vi.fn(), check: vi.fn() }));
vi.mock("@/lib/operational-agency/OperationalAgencyProvider", () => ({
  useOperationalAgency: () => ({ agencyId: "a", mode: "hha" }),
}));
vi.mock("@/lib/api/claims", () => ({
  submitX12BatchToClearinghouse: mocks.submit,
  getX12ClearinghouseReport: mocks.report,
  checkStediResponses: mocks.check,
  saveBlob: vi.fn(),
}));

const BATCH = {
  id: "batch-1",
  status: "ready",
  usageIndicator: "T",
  claimCount: 2,
  fileName: "SUB-20261023-837P-00001.edi",
  clearinghouse: null,
} as unknown as X12Batch;

const SUBMISSION = {
  status: "submitted",
  payerId: "100229",
  usageIndicator: "T",
  submittedAt: "2026-10-23T14:00:00.000Z",
  submittedBy: "u",
  acceptedClaims: 1,
  rejectedClaims: 1,
  pendingClaims: 0,
  errorClaims: 0,
  fileId: "",
  message: "",
} as const;

const RESULT: ClearinghouseResult = {
  vendor: "stedi",
  batchId: "batch-1",
  submission: SUBMISSION,
  claims: [
    { claimId: "c0", claimNumber: "CLM-0", status: "accepted", reference: "R1", message: "", errors: [] },
    { claimId: "c1", claimNumber: "CLM-1", status: "rejected", reference: "R2", message: "", errors: [{ code: "33", message: "Bad member ID", field: "" }] },
  ],
};

describe("X12ClearinghouseDialog", () => {
  beforeEach(() => {
    mocks.submit.mockReset();
    mocks.report.mockReset();
    mocks.check.mockReset();
  });

  it("sends a test file to Stedi with the typed payer ID and lists each claim's result", async () => {
    mocks.submit.mockResolvedValue(RESULT);
    const onSent = vi.fn();
    const user = userEvent.setup();
    render(<X12ClearinghouseDialog batch={BATCH} onClose={vi.fn()} onSent={onSent} />);

    await user.type(screen.getByLabelText("Payer ID for this send (optional)"), "100229");
    await user.click(screen.getByRole("button", { name: "Send to Stedi" }));

    expect(mocks.submit).toHaveBeenCalledWith({ context: { agencyId: "a" }, batchId: "batch-1", vendor: "stedi", payerId: "100229" });
    expect(onSent).toHaveBeenCalled();
    expect(await screen.findByText("Bad member ID")).toBeTruthy();
    expect(screen.getAllByText("Stedi: 1 accepted, 1 rejected").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Sent to Stedi" }).hasAttribute("disabled")).toBe(true);
  });

  it("explains that a test file goes through Stedi's test mode", () => {
    render(<X12ClearinghouseDialog batch={BATCH} onClose={vi.fn()} onSent={vi.fn()} />);
    expect(screen.getByText("Test mode")).toBeTruthy();
    expect(screen.getByText(/nothing is\s+sent to NJ Medicaid/)).toBeTruthy();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByText(/Claim\.MD/)).toBeNull();
  });

  it("asks to confirm a production file before sending it to Stedi", async () => {
    mocks.submit.mockResolvedValue(RESULT);
    const user = userEvent.setup();
    render(<X12ClearinghouseDialog batch={{ ...BATCH, usageIndicator: "P" }} onClose={vi.fn()} onSent={vi.fn()} />);

    expect(screen.getByText("Production mode")).toBeTruthy();
    const send = screen.getByRole("button", { name: "Send to Stedi" });
    expect(send.hasAttribute("disabled")).toBe(true);
    await user.click(screen.getByRole("checkbox", { name: "Send this production file" }));
    await user.click(send);
    expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({ vendor: "stedi", payerId: undefined }));
  });

  it("loads earlier Stedi results", async () => {
    mocks.report.mockResolvedValue(RESULT);
    const sent = { ...BATCH, clearinghouse: { stedi: SUBMISSION } } as X12Batch;
    render(<X12ClearinghouseDialog batch={sent} onClose={vi.fn()} onSent={vi.fn()} />);

    expect(mocks.report).toHaveBeenCalledWith(expect.objectContaining({ batchId: "batch-1", vendor: "stedi" }));
    expect(await screen.findByText("Bad member ID")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sent to Stedi" }).hasAttribute("disabled")).toBe(true);
  });

  it("shows NJ Medicaid's 277CA and 835 per claim and checks for new ones", async () => {
    const withPayer: ClearinghouseResult = {
      ...RESULT,
      submission: { ...SUBMISSION, usageIndicator: "P" },
      claims: [
        {
          ...RESULT.claims[0],
          payerAcknowledgment: { outcome: "accepted", mode: "production", effectiveDate: "2026-10-24", payerClaimNumber: "P123", statuses: [], messages: [], receivedAt: null },
          remittance: {
            outcome: "processed",
            mode: "production",
            statusText: "Processed as primary",
            chargeCents: 10000,
            paidCents: 9000,
            patientResponsibilityCents: 0,
            paymentDate: "2026-10-30",
            traceNumber: "EFT123",
            payerName: "NJ MEDICAID",
            adjustments: [{ level: "line", group: "CO", reason: "45", reasonText: "Charge exceeds fee schedule", amountCents: 1000 }],
            receivedAt: null,
          },
        },
        {
          ...RESULT.claims[1],
          status: "accepted",
          errors: [],
          payerAcknowledgment: {
            outcome: "rejected",
            mode: "production",
            effectiveDate: null,
            payerClaimNumber: "",
            statuses: [{ category: "A7", categoryText: "Rejected", code: "33", codeText: "Subscriber not found", entity: "" }],
            messages: [],
            receivedAt: null,
          },
        },
      ],
    };
    // The first load has no payer answers yet; the reload after "Check now" has them.
    mocks.report.mockResolvedValueOnce({ ...withPayer, claims: withPayer.claims.map((claim) => ({ ...claim, payerAcknowledgment: null, remittance: null })) });
    mocks.report.mockResolvedValue(withPayer);
    mocks.check.mockResolvedValue({ ran: true, reason: null, hadErrors: false, finishedAt: null });
    const onSent = vi.fn();
    const user = userEvent.setup();
    const sent = { ...BATCH, usageIndicator: "P", clearinghouse: { stedi: { ...SUBMISSION, usageIndicator: "P" } } } as X12Batch;
    render(<X12ClearinghouseDialog batch={sent} onClose={vi.fn()} onSent={onSent} />);

    await user.click(await screen.findByRole("button", { name: "Check now" }));
    expect(mocks.check).toHaveBeenCalledWith({ context: { agencyId: "a" } });
    expect(await screen.findByText("Found 2 new responses from NJ Medicaid.")).toBeTruthy();
    expect(onSent).toHaveBeenCalled();
    expect(screen.getByText("NJ Medicaid accepted")).toBeTruthy();
    expect(screen.getByText("Paid $90.00")).toBeTruthy();
    expect(screen.getByText("CO-45 Charge exceeds fee schedule: $10.00")).toBeTruthy();
    expect(screen.getByText("NJ Medicaid rejected")).toBeTruthy();
    expect(screen.getByText("Subscriber not found")).toBeTruthy();
  });

  it("blocks a production file that already went through Claim.MD", () => {
    const sent = { ...BATCH, usageIndicator: "P", clearinghouse: { claimmd: SUBMISSION } } as X12Batch;
    render(<X12ClearinghouseDialog batch={sent} onClose={vi.fn()} onSent={vi.fn()} />);

    expect(screen.getByText(/already went through Claim\.MD/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send to Stedi" }).hasAttribute("disabled")).toBe(true);
  });
});

describe("clearinghouseResultsCsv", () => {
  it("writes one row per claim and defuses formulas", () => {
    const csv = clearinghouseResultsCsv({
      ...RESULT,
      claims: [{ ...RESULT.claims[1], errors: [{ code: "", message: "=HYPERLINK(1)", field: "" }] }],
    });
    const [header, row] = csv.split("\r\n");
    expect(header).toBe("Clearinghouse,Claim number,Result,Reference,Messages,Sent at,Payer ID,Payer status,Payment");
    expect(row).toBe("Stedi,CLM-1,Rejected,R2,'=HYPERLINK(1),2026-10-23T14:00:00.000Z,100229,,");
  });
});
