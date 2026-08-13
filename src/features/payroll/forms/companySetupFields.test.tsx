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
});
