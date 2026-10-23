import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ClearinghouseResult, X12Batch } from "@/lib/api/claims";
import X12ClearinghouseDialog from "./X12ClearinghouseDialog";
import { clearinghouseResultsCsv } from "./x12ExportUtils";

const mocks = vi.hoisted(() => ({ submit: vi.fn(), report: vi.fn() }));
vi.mock("@/lib/operational-agency/OperationalAgencyProvider", () => ({
  useOperationalAgency: () => ({ agencyId: "a", mode: "hha" }),
}));
vi.mock("@/lib/api/claims", () => ({
  submitX12BatchToClearinghouse: mocks.submit,
  getX12ClearinghouseReport: mocks.report,
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

  it("switches to Claim.MD and asks to confirm a production file", async () => {
    mocks.submit.mockResolvedValue({ ...RESULT, vendor: "claimmd" });
    const user = userEvent.setup();
    render(<X12ClearinghouseDialog batch={{ ...BATCH, usageIndicator: "P" }} onClose={vi.fn()} onSent={vi.fn()} />);

    await user.click(screen.getByRole("radio", { name: /Claim\.MD/ }));
    const send = screen.getByRole("button", { name: "Send to Claim.MD" });
    expect(send.hasAttribute("disabled")).toBe(true);
    await user.click(screen.getByRole("checkbox", { name: "Send this production file" }));
    await user.click(send);
    expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({ vendor: "claimmd", payerId: undefined }));
  });

  it("loads earlier results and blocks a second clearinghouse for a production file", async () => {
    mocks.report.mockResolvedValue({ ...RESULT, vendor: "claimmd" });
    const user = userEvent.setup();
    const sent = { ...BATCH, usageIndicator: "P", clearinghouse: { claimmd: SUBMISSION } } as X12Batch;
    render(<X12ClearinghouseDialog batch={sent} onClose={vi.fn()} onSent={vi.fn()} />);

    expect(screen.getByText(/already went through Claim\.MD/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send to Stedi" }).hasAttribute("disabled")).toBe(true);
    await user.click(screen.getByRole("radio", { name: /Claim\.MD/ }));
    expect(mocks.report).toHaveBeenCalledWith(expect.objectContaining({ batchId: "batch-1", vendor: "claimmd" }));
    expect(await screen.findByText("Bad member ID")).toBeTruthy();
  });
});

describe("clearinghouseResultsCsv", () => {
  it("writes one row per claim and defuses formulas", () => {
    const csv = clearinghouseResultsCsv({
      ...RESULT,
      claims: [{ ...RESULT.claims[1], errors: [{ code: "", message: "=HYPERLINK(1)", field: "" }] }],
    });
    const [header, row] = csv.split("\r\n");
    expect(header).toBe("Clearinghouse,Claim number,Result,Reference,Messages,Sent at,Payer ID");
    expect(row).toBe("Stedi,CLM-1,Rejected,R2,'=HYPERLINK(1),2026-10-23T14:00:00.000Z,100229");
  });
});
