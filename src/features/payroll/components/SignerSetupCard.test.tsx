import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignerSetupCard } from "./SignerSetupCard";
const projection = (designatedSignerPresent: boolean, canDesignateSigner = true): import("../model/types").AgencyPayrollSetupProjection => ({ projectionRevision: 1, integration: { state: "configured", environment: "sandbox" }, preflight: { values: {}, missingFieldCodes: [] }, readiness: { status: "ready", blockers: [], nextAction: null }, setup: { designatedSignerPresent, companyLinked: true, officeWorkplaceLinked: true, payScheduleLinked: true, enrollmentProfileLocked: false }, capabilities: { canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner, createCompanyOnboardSession: false } });
describe("SignerSetupCard", () => {
  it("renders clear only for a server-designated signer", () => { render(<SignerSetupCard projection={projection(true)} onAction={vi.fn()} />); expect(screen.getByRole("button", { name: /clear signer/i })).toBeInTheDocument(); });
  it("withholds designation controls when the server denies self-designation", () => { render(<SignerSetupCard projection={projection(false, false)} />); expect(screen.queryByRole("button")).not.toBeInTheDocument(); });
  it("requires explicit authority attestation before self-designation", async () => { const action = vi.fn(); const user = userEvent.setup(); render(<SignerSetupCard projection={projection(false)} onAction={action} />); const button = screen.getByRole("button", { name: /designate myself/i }); expect(button).toBeDisabled(); await user.click(screen.getByRole("checkbox")); await user.click(button); expect(action).toHaveBeenCalledWith("designate_signer", true); });
});
