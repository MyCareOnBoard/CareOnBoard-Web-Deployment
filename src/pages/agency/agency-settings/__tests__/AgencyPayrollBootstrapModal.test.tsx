import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
      website: "https://able.example", phone: "5125550123",
      payrollContactName: "Pat Payroll", payrollContactEmail: "payroll@able.example", payrollContactPhone: "5125550124",
      payFrequency: "weekly", firstPayday: "2026-09-04", secondPayday: "", firstPeriodEnd: "2026-09-03", payrollStartDate: "2026-08-28",
      expectedW2Workers: 12,
    };
    expect(validateAgencyPayrollBootstrapForm(complete, [...requiredCodes])).toEqual({});
  });

  it.each([
    [
      "first pay period end date",
      { payFrequency: "weekly", firstPayday: "2026-09-04", firstPeriodEnd: "2026-09-04", payrollStartDate: "2026-08-28" },
      "paySchedule.firstPeriodEnd",
      "firstPeriodEnd",
      "The first pay period must end before the first scheduled payday.",
    ],
    [
      "payroll tracking start date",
      { payFrequency: "weekly", firstPayday: "2026-09-04", firstPeriodEnd: "2026-09-03", payrollStartDate: "2026-09-04" },
      "paySchedule.payrollStartDate",
      "payrollStartDate",
      "The payroll tracking start date must be on or before the first pay period end date.",
    ],
  ])("keeps the specific %s error instead of replacing it with a generic missing-field error", (_label, form, code, target, expected) => {
    expect(validateAgencyPayrollBootstrapForm(form, [code])).toMatchObject({ [target]: expected });
  });

  it("validates the first payday before pay frequency is selected", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-28T12:00:00Z"));
    try {
      expect(validateAgencyPayrollBootstrapForm(
        { firstPayday: "2026-08-28" },
        ["paySchedule.frequency", "paySchedule.firstPayday"],
      )).toMatchObject({
        firstPayday: "Choose a future U.S. banking day. Today, weekends, and Federal Reserve holidays are not accepted.",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not mark an earlier schedule date missing while later dates are still empty", () => {
    const requiredScheduleCodes = [
      "paySchedule.firstPayday",
      "paySchedule.firstPeriodEnd",
      "paySchedule.payrollStartDate",
    ];

    expect(validateAgencyPayrollBootstrapForm(
      { payrollStartDate: "2026-08-31" },
      requiredScheduleCodes,
    )).not.toHaveProperty("payrollStartDate");
    expect(validateAgencyPayrollBootstrapForm(
      { payrollStartDate: "2026-08-31", firstPeriodEnd: "2026-09-04" },
      requiredScheduleCodes,
    )).not.toHaveProperty("firstPeriodEnd");
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

  it("orders payroll dates chronologically and explains each date from a focusable tooltip", async () => {
    render(<AgencyPayrollBootstrapModal open values={{}} missingFieldCodes={[
      "paySchedule.frequency", "paySchedule.firstPayday", "paySchedule.firstPeriodEnd", "paySchedule.payrollStartDate",
    ]} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);

    const trackingStart = screen.getByRole("button", { name: "Payroll tracking start date" });
    const periodEnd = screen.getByRole("button", { name: "First pay period end date" });
    const firstPayday = screen.getByRole("button", { name: "First scheduled payday" });
    expect(trackingStart.compareDocumentPosition(periodEnd) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(periodEnd.compareDocumentPosition(firstPayday) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);

    const tooltipCases = [
      ["About payroll tracking start date", /first date CareOnBoard should include approved work and reimbursements/i],
      ["About first pay period end date", /final work date included in your first payroll/i],
      ["About first scheduled payday", /banking day employees receive their first payroll through Check/i],
    ] as const;
    for (const [name, copy] of tooltipCases) {
      const trigger = screen.getByRole("button", { name });
      expect(trigger).not.toHaveAttribute("tabindex", "-1");
      fireEvent.focus(trigger);
      expect((await screen.findAllByText(copy)).length).toBeGreaterThan(0);
    }
  });

  it("shows why a prefilled scheduled payday is not accepted", () => {
    render(<AgencyPayrollBootstrapModal
      open
      values={{ paySchedule: { frequency: "weekly", firstPayday: "2026-08-29", secondPayday: null, firstPeriodEnd: "2026-08-28", payrollStartDate: "2026-08-21" } }}
      missingFieldCodes={["paySchedule.firstPayday", "paySchedule.firstPeriodEnd", "paySchedule.payrollStartDate"]}
      onOpenChange={vi.fn()}
      onSubmit={vi.fn()}
    />);

    expect(screen.getByRole("button", { name: "First scheduled payday" })).toHaveAccessibleDescription(/choose a U\.S\. banking day/i);
  });

  it("marks today's first payday with a red border and a small validation message", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-28T12:00:00Z"));
    try {
      render(<AgencyPayrollBootstrapModal
        open
      values={{ paySchedule: { frequency: "weekly", firstPayday: "2026-08-28", secondPayday: null, firstPeriodEnd: "2026-08-27", payrollStartDate: "2026-08-21" } }}
      missingFieldCodes={["paySchedule.firstPayday", "paySchedule.firstPeriodEnd", "paySchedule.payrollStartDate"]}
      submissionFieldCodes={["paySchedule.firstPayday"]}
      onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />);

      const payday = screen.getByRole("button", { name: "First scheduled payday" });
      expect(payday).toHaveAttribute("aria-invalid", "true");
      expect(payday.firstElementChild).toHaveClass("border-[#dc2626]");
      expect(payday).toHaveAccessibleDescription(/choose a future U\.S\. banking day/i);
      expect(screen.getByRole("alert")).toHaveClass("text-xs");
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears a generic submission error after a valid schedule date is selected", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-28T12:00:00Z"));
    try {
      render(<AgencyPayrollBootstrapModal
        open
        values={{ paySchedule: { frequency: "weekly", firstPayday: "2026-09-11", secondPayday: null, firstPeriodEnd: "2026-09-04", payrollStartDate: "2026-08-31" } }}
        missingFieldCodes={["paySchedule.firstPayday", "paySchedule.firstPeriodEnd", "paySchedule.payrollStartDate"]}
        submissionFieldCodes={["paySchedule.payrollStartDate"]}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />);

      const trackingStart = screen.getByRole("button", { name: "Payroll tracking start date" });
      expect(trackingStart).not.toHaveAttribute("aria-invalid", "true");
      expect(trackingStart).not.toHaveAccessibleDescription(/this required payroll field is missing/i);
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the expected EIN format in the empty input", () => {
    render(<AgencyPayrollBootstrapModal open values={{}} missingFieldCodes={["ein"]} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText("Employer Identification Number (EIN)")).toHaveAttribute("placeholder", "##-#######");
  });

  it("exposes EIN validity while the required value is edited", async () => {
    const user = userEvent.setup();
    render(<AgencyPayrollBootstrapModal open values={{}} missingFieldCodes={["ein"]} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    const ein = screen.getByLabelText("Employer Identification Number (EIN)");

    expect(ein).toHaveAttribute("aria-invalid", "false");
    await user.type(ein, "12-3");
    expect(ein).toHaveAttribute("aria-invalid", "true");
    expect(ein).toHaveAccessibleDescription(/enter a nine-digit federal tax id/i);
    await user.type(ein, "456789");
    expect(ein).toHaveAttribute("aria-invalid", "false");
  });

  it("clears a server-reported EIN error after the value is corrected", async () => {
    const user = userEvent.setup();
    render(<AgencyPayrollBootstrapModal open values={{}} missingFieldCodes={["ein"]} submissionFieldCodes={["ein"]} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    const ein = screen.getByLabelText("Employer Identification Number (EIN)");

    await waitFor(() => expect(ein).toHaveAccessibleDescription(/this required payroll field is missing/i));
    await user.type(ein, "12-3456789");
    expect(ein).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByText("This required payroll field is missing.")).not.toBeInTheDocument();
  });

  it("renders fixed +1 US phone controls that own exactly ten digits", () => {
    render(<AgencyPayrollBootstrapModal
      open
      values={{ phone: "+15125550123", payrollContact: { name: "Pat Payroll", email: "pat@able.example", phone: "+15125550124" } }}
      missingFieldCodes={["phone", "payrollContact.phone"]}
      onOpenChange={vi.fn()}
      onSubmit={vi.fn()}
    />);

    for (const label of ["Company phone number", "Payroll contact’s phone number"]) {
      const input = screen.getByLabelText(label);
      expect(input).toHaveValue(label.startsWith("Company") ? "5125550123" : "5125550124");
      expect(input).toHaveAttribute("type", "tel");
      expect(input).toHaveAttribute("inputmode", "numeric");
      expect(input).toHaveAttribute("maxlength", "10");
      expect(input).toHaveAccessibleDescription("Enter a U.S. ten-digit phone number.");
    }
    expect(screen.getAllByText("+1")).toHaveLength(2);
  });

  it("does not strip or truncate a noncanonical phone prefill during an edit", async () => {
    const user = userEvent.setup();
    render(<AgencyPayrollBootstrapModal open values={{ phone: "+445125550123" }} missingFieldCodes={["phone"]} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    const phone = screen.getByLabelText("Company phone number");
    expect(phone).toHaveValue("+445125550123");
    await user.type(phone, "9");
    expect(phone).toHaveValue("+445125550123");
    expect(phone).toHaveAccessibleDescription(/enter a valid us ten-digit phone number/i);
  });
});
