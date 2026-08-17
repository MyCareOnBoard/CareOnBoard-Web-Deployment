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
  "paySchedule.frequency", "paySchedule.firstPayday", "paySchedule.secondPayday", "paySchedule.firstPeriodEnd", "paySchedule.payrollStartDate",
  "expectedWorkerCounts.w2", "expectedWorkerCounts.contractor",
] as const;

describe("AgencyPayrollBootstrapModal", () => {
  it("maps every closed server missing-field code to its local field or group", () => {
    expect(Object.keys(AGENCY_PAYROLL_REQUIRED_FIELD_MAP)).toEqual(requiredCodes);
    expect(AGENCY_PAYROLL_REQUIRED_FIELD_MAP["payrollContact.name"].target).toBe("payrollContactName");
    expect(AGENCY_PAYROLL_REQUIRED_FIELD_MAP["officeWorkplace.name"].target).toBe("officeName");
    expect(AGENCY_PAYROLL_REQUIRED_FIELD_MAP["paySchedule.frequency"].target).toBe("payFrequency");
    expect(AGENCY_PAYROLL_REQUIRED_FIELD_MAP["expectedWorkerCounts.w2"].target).toBe("expectedW2Workers");
  });

  it("treats fixed US countries and zero contractor count as already satisfied", () => {
    render(<AgencyPayrollBootstrapModal open values={{}} missingFieldCodes={["legalAddress.country", "officeWorkplace.address.country", "expectedWorkerCounts.contractor"]} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByLabelText(/street address/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/primary workplace name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/estimated number of w-2 employees/i)).not.toBeInTheDocument();
  });

  it("merges a 422 missing code into the visible field error without resetting entered values", async () => {
    const { rerender } = render(<AgencyPayrollBootstrapModal open values={{}} missingFieldCodes={["legalName"]} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Legal business name"), "Able Care LLC");
    rerender(<AgencyPayrollBootstrapModal open values={{}} missingFieldCodes={["legalName"]} submissionError="Complete the highlighted payroll details." submissionFieldCodes={["payrollContact.name"]} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Legal business name")).toHaveValue("Able Care LLC");
    const payrollContact = screen.getByLabelText("Payroll contact’s full name");
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
      expectedW2Workers: 12,
    };
    expect(validateAgencyPayrollBootstrapForm(complete, [...requiredCodes])).toEqual({});
  });

  it("focuses the first missing interactive control when multiple groups are present", async () => {
    render(<AgencyPayrollBootstrapModal open values={{}} missingFieldCodes={["entityType", "website", "payrollContact.name"]} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Business structure" })).toHaveFocus());
  });

  it("uses clear payroll setup labels, helpers, and unique address input IDs", () => {
    const { unmount } = render(<AgencyPayrollBootstrapModal open values={{}} missingFieldCodes={[...requiredCodes]} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);

    [
      "Legal business name", "Employer Identification Number (EIN)", "Business structure", "Industry",
      "Find legal business address", "Primary workplace name", "Find primary workplace address",
      "Company website", "Company phone number", "Payroll contact’s full name", "Payroll contact’s email address", "Payroll contact’s phone number",
      "How often employees are paid",
      "Estimated number of W-2 employees",
    ].forEach((label) => expect(screen.getByLabelText(label)).toBeInTheDocument());
    expect(screen.queryByLabelText(/proposed signer/i)).not.toBeInTheDocument();
    ["First scheduled payday", "First pay period end date", "Payroll tracking start date"].forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
    expect(screen.getByRole("checkbox", { name: "I confirm employees physically work at this location." })).toBeInTheDocument();
    expect(screen.getAllByLabelText("Street address")).toHaveLength(2);
    expect(screen.getAllByLabelText("City")).toHaveLength(2);
    expect(screen.getAllByLabelText("State abbreviation")).toHaveLength(2);
    expect(screen.getAllByLabelText("ZIP code")).toHaveLength(2);
    expect(screen.getByLabelText("Employer Identification Number (EIN)")).toHaveAccessibleDescription("Enter your nine-digit federal tax ID. For security, we won’t display it again after you save.");
    expect(screen.getByLabelText("Estimated number of W-2 employees")).toHaveAccessibleDescription("Include employees you expect to pay through payroll. Do not include independent contractors.");
    expect(screen.getByRole("combobox", { name: "How often employees are paid" })).toHaveTextContent("Select pay frequency");
    const addressIds = [
      ...screen.getAllByLabelText("Street address"), ...screen.getAllByLabelText("City"),
      ...screen.getAllByLabelText("State abbreviation"), ...screen.getAllByLabelText("ZIP code"),
    ].map((input) => input.id);
    expect(new Set(addressIds).size).toBe(addressIds.length);
    unmount();
    render(<AgencyPayrollBootstrapModal open values={{ paySchedule: { frequency: "semimonthly", firstPayday: "2026-09-04", secondPayday: "2026-09-18", firstPeriodEnd: "2026-09-03", payrollStartDate: "2026-08-28" } }} missingFieldCodes={["paySchedule.frequency", "paySchedule.secondPayday"]} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByText("Second scheduled payday")).toBeInTheDocument();
  });
});
