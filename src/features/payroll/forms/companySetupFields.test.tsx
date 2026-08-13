import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CompanySetupFields } from "./companySetupFields";

describe("CompanySetupFields", () => {
  it("associates field-specific payroll errors with their labeled controls", () => {
    render(<CompanySetupFields formData={{ payrollEin: "bad", payrollLegalAddress: { line1: "", city: "", state: "", postalCode: "", country: "US" } }} onChange={vi.fn()} fieldsWithErrors={["payrollEin", "payrollLegalAddress"]} />);
    const ein = screen.getByLabelText("EIN");
    expect(ein).toHaveAttribute("aria-invalid", "true");
    expect(ein).toHaveAttribute("aria-describedby", "payrollEin-error");
    expect(screen.getAllByRole("alert")).toHaveLength(3);
    expect(screen.getByLabelText("Line1", { selector: "#payrollLegalAddress-line1" })).toHaveAttribute("aria-describedby", "payrollLegalAddress-error");
  });

  it("associates select, attestation, signer, count, and date errors with focusable controls", () => {
    render(<CompanySetupFields
      formData={{
        payrollEntityType: "",
        payrollIndustry: "",
        payrollFrequency: "weekly",
        payrollActualWorkLocationAttested: false,
      }}
      onChange={vi.fn()}
      fieldsWithErrors={[
        "payrollEntityType",
        "payrollIndustry",
        "payrollFrequency",
        "payrollActualWorkLocationAttested",
        "payrollStartDate",
        "proposedSignerEmail",
        "expectedW2Workers",
      ]}
    />);

    for (const label of ["Entity type", "Industry", "Pay frequency"]) {
      const control = screen.getByLabelText(label);
      expect(control).toHaveAttribute("aria-invalid", "true");
      expect(control.getAttribute("aria-describedby")).toMatch(/-error$/);
    }
    expect(screen.getByLabelText("This is the actual work location.")).toHaveAttribute("aria-describedby", "payrollActualWorkLocationAttested-error");
    expect(screen.getByLabelText("Local payroll start date")).toHaveAttribute("aria-describedby", "payrollStartDate-error");
    expect(screen.getByLabelText("Proposed signer email")).toHaveAttribute("aria-describedby", "proposedSignerEmail-error");
    expect(screen.getByLabelText("Expected W-2 workers")).toHaveAttribute("aria-describedby", "expectedW2Workers-error");
  });
});
