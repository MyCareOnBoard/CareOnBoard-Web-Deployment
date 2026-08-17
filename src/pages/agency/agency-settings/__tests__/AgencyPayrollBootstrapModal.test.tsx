import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AgencyPayrollBootstrapModal, {
  AGENCY_PAYROLL_REQUIRED_FIELD_MAP,
  validateAgencyPayrollBootstrapForm,
} from "../components/AgencyPayrollBootstrapModal";
import type { CheckPayrollProfileFormValues } from "@/lib/agency/agency-profile-payload";

const requiredCodes = [
  "legalName", "ein", "entityType", "industry",
  "legalAddress.line1", "legalAddress.city", "legalAddress.state", "legalAddress.postalCode", "legalAddress.country",
  "officeWorkplace.name", "officeWorkplace.actualWorkLocationAttested",
  "officeWorkplace.address.line1", "officeWorkplace.address.city", "officeWorkplace.address.state", "officeWorkplace.address.postalCode", "officeWorkplace.address.country",
  "website", "phone",
  "payrollContact.name", "payrollContact.email", "payrollContact.phone",
  "proposedSignerContact.firstName", "proposedSignerContact.lastName", "proposedSignerContact.title", "proposedSignerContact.email",
  "paySchedule.frequency", "paySchedule.firstPayday", "paySchedule.secondPayday", "paySchedule.firstPeriodEnd", "paySchedule.payrollStartDate",
  "expectedWorkerCounts.w2", "expectedWorkerCounts.contractor",
] as const;

describe("AgencyPayrollBootstrapModal", () => {
  it("maps every closed server missing-field code to its local field or group", () => {
    expect(Object.keys(AGENCY_PAYROLL_REQUIRED_FIELD_MAP)).toEqual(requiredCodes);
    expect(AGENCY_PAYROLL_REQUIRED_FIELD_MAP["payrollContact.name"].target).toBe("payrollContactName");
    expect(AGENCY_PAYROLL_REQUIRED_FIELD_MAP["officeWorkplace.name"].target).toBe("officeName");
    expect(AGENCY_PAYROLL_REQUIRED_FIELD_MAP["paySchedule.frequency"].target).toBe("payFrequency");
    expect(AGENCY_PAYROLL_REQUIRED_FIELD_MAP["proposedSignerContact.firstName"].target).toBe("proposedSignerFirstName");
    expect(AGENCY_PAYROLL_REQUIRED_FIELD_MAP["expectedWorkerCounts.w2"].target).toBe("expectedW2Workers");
  });

  it("treats fixed US countries and zero contractor count as already satisfied", () => {
    render(<AgencyPayrollBootstrapModal open values={{}} missingFieldCodes={["legalAddress.country", "officeWorkplace.address.country", "expectedWorkerCounts.contractor"]} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByLabelText(/legal address line 1/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/actual workplace name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/expected w-2 workers/i)).not.toBeInTheDocument();
  });

  it("merges a 422 missing code into the visible field error without resetting entered values", async () => {
    const { rerender } = render(<AgencyPayrollBootstrapModal open values={{}} missingFieldCodes={["legalName"]} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Legal name"), "Able Care LLC");
    rerender(<AgencyPayrollBootstrapModal open values={{}} missingFieldCodes={["legalName"]} submissionError="Complete the highlighted payroll details." submissionFieldCodes={["payrollContact.name"]} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Legal name")).toHaveValue("Able Care LLC");
    const payrollContact = screen.getByLabelText("Payroll contact name");
    expect(payrollContact).toHaveAttribute("aria-invalid", "true");
    expect(payrollContact).toHaveAccessibleDescription("This required payroll field is missing.");
  });

  it("accepts a complete form even when the empty profile reported every required code", () => {
    const complete: CheckPayrollProfileFormValues = {
      legalName: "Able Care LLC", ein: "12-3456789", entityType: "llc", industry: "health_care",
      legalAddress: { line1: "1 Legal St", city: "Austin", state: "TX", postalCode: "78701", country: "US" },
      officeName: "Main office", officeAddress: { line1: "2 Work St", city: "Austin", state: "TX", postalCode: "78702", country: "US" }, actualWorkLocationAttested: true,
      website: "https://able.example", phone: "+15125550123",
      payrollContactName: "Pat Payroll", payrollContactEmail: "payroll@able.example", payrollContactPhone: "+15125550124",
      payFrequency: "weekly", firstPayday: "2026-09-04", secondPayday: "", firstPeriodEnd: "2026-09-03", payrollStartDate: "2026-08-28",
      proposedSignerFirstName: "Ava", proposedSignerLastName: "Owner", proposedSignerTitle: "Owner", proposedSignerEmail: "ava@able.example",
      expectedW2Workers: 12,
    };
    expect(validateAgencyPayrollBootstrapForm(complete, [...requiredCodes])).toEqual({});
  });

  it("focuses the first missing interactive control when multiple groups are present", async () => {
    render(<AgencyPayrollBootstrapModal open values={{}} missingFieldCodes={["entityType", "website", "payrollContact.name"]} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Entity type" })).toHaveFocus());
  });
});
