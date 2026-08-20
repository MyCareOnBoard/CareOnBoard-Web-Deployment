import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignerSetupCard } from "./SignerSetupCard";
const projection = (designatedSignerPresent: boolean, canDesignateSigner = true, signerCandidate: { userUid: string; fullName: string; email: string; title: string; identityVersion: string; designated: boolean } | null = { userUid: "verified-owner", fullName: "Ada Owner", email: "ada@able.example", title: "Owner", identityVersion: `check_signer_v1_${"a".repeat(64)}`, designated: designatedSignerPresent }): import("../model/types").AgencyPayrollSetupProjection => ({ projectionRevision: 1, integration: { state: "configured", environment: "sandbox" }, preflight: { values: {}, missingFieldCodes: [] }, readiness: { status: "ready", blockers: [], nextAction: null }, setup: { companyOnboardRevision: null, designatedSignerPresent, signerCandidate, designatedSigner: designatedSignerPresent ? signerCandidate : null, companyLinked: true, officeWorkplaceLinked: true, payScheduleLinked: true, enrollmentProfileLocked: false, signatoryLinked: false }, capabilities: { canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner, createCompanyOnboardSession: false, canSubmitCompanyImplementation: false, canRetryCompanySync: false, canRefreshCompanyReconciliation: false } });
describe("SignerSetupCard", () => {
  it("renders clear only for a server-designated signer", () => { render(<SignerSetupCard projection={projection(true)} onAction={vi.fn()} />); expect(screen.getByRole("button", { name: /clear signer/i })).toBeInTheDocument(); });
  it("withholds designation controls and shows safe guidance without a verified candidate", () => { render(<SignerSetupCard projection={projection(false, false, null)} />); expect(screen.queryByRole("button", { name: /designate this account/i })).not.toBeInTheDocument(); expect(screen.getByText(/verified agency owner account/i)).toBeInTheDocument(); });
  it("renders the exact verified candidate and requires explicit authority attestation", async () => { const action = vi.fn(); const user = userEvent.setup(); render(<SignerSetupCard projection={projection(false)} onAction={action} />); expect(screen.getByText("Ada Owner")).toBeInTheDocument(); expect(screen.getByText("ada@able.example")).toBeInTheDocument(); expect(screen.getByText("Owner")).toBeInTheDocument(); const button = screen.getByRole("button", { name: "Designate this account" }); expect(button).toBeDisabled(); await user.click(screen.getByRole("checkbox", { name: "I confirm this verified account is authorized to act as the agency's payroll signer." })); await user.click(button); expect(action).toHaveBeenCalledWith("designate_signer", true); });
  it("requires a new attestation after designation is cleared", async () => {
    const action = vi.fn().mockResolvedValue(true);
    const user = userEvent.setup();
    const view = render(<SignerSetupCard projection={projection(false)} onAction={action} />);

    await user.click(screen.getByRole("checkbox", { name: "I confirm this verified account is authorized to act as the agency's payroll signer." }));
    await user.click(screen.getByRole("button", { name: "Designate this account" }));
    await waitFor(() => expect(action).toHaveBeenCalledWith("designate_signer", true));

    view.rerender(<SignerSetupCard projection={projection(true)} onAction={action} />);
    await user.click(screen.getByRole("button", { name: "Clear signer" }));
    await waitFor(() => expect(action).toHaveBeenCalledWith("clear_signer", undefined));

    view.rerender(<SignerSetupCard projection={projection(false)} onAction={action} />);
    expect(screen.getByRole("checkbox", { name: "I confirm this verified account is authorized to act as the agency's payroll signer." })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Designate this account" })).toBeDisabled();
  });
  it("shows an already designated verified candidate without a duplicate designation action", () => { render(<SignerSetupCard projection={projection(true)} />); expect(screen.getByText("Ada Owner")).toBeInTheDocument(); expect(screen.queryByRole("button", { name: "Designate this account" })).not.toBeInTheDocument(); });
  it("distinguishes an existing signer from an undesignated verified owner candidate", () => {
    render(<SignerSetupCard projection={projection(true, true, { userUid: "verified-owner", fullName: "Ada Owner", email: "ada@able.example", title: "Owner", identityVersion: `check_signer_v1_${"a".repeat(64)}`, designated: false })} onAction={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Existing signer designated" })).toBeInTheDocument();
    expect(screen.getByText("Verified owner candidate")).toBeInTheDocument();
    expect(screen.getByText("Another existing signer must be cleared before this account can be designated.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear signer" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Designate this account" })).not.toBeInTheDocument();
  });

  it("displays the actual designated staff signer rather than the current owner candidate", () => {
    const configured = projection(true, true, { userUid: "verified-owner", fullName: "Ada Owner", email: "ada@able.example", title: "Owner", identityVersion: `check_signer_v1_${"a".repeat(64)}`, designated: false });
    configured.setup.designatedSigner = { userUid: "staff-1", fullName: "Taylor Staff", email: "taylor@able.example", title: "Payroll Director", identityVersion: `check_signer_v1_${"a".repeat(64)}`, designated: true };
    render(<SignerSetupCard projection={configured} onAction={vi.fn()} />);
    expect(screen.getByText("Taylor Staff")).toBeInTheDocument();
    expect(screen.queryByText("Ada Owner")).not.toBeInTheDocument();
  });

  it("displays the closed provider signatory status separately from signer designation", () => {
    const configured = projection(false);
    configured.setup.signatoryLinked = true;
    render(<SignerSetupCard projection={configured} />);
    expect(screen.getByText("Signer not designated")).toBeInTheDocument();
    expect(screen.getByText("Provider signatory link: Linked")).toBeInTheDocument();
  });
});
