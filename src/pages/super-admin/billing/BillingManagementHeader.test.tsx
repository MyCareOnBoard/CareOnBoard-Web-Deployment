import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import BillingManagementHeader from "./BillingManagementHeader";

vi.mock("react-router", async () => vi.importActual<typeof import("react-router")>("react-router"));

vi.mock("@/components/operational-agency/OperationalAgencySelector", () => ({
  default: ({ emptySelectionLabel, onSelectionChange, selectedIds }: {
    emptySelectionLabel: string;
    onSelectionChange: (ids: string[]) => void;
    selectedIds: string[];
  }) => (
    <div>
      <output aria-label="Selected agency IDs">{selectedIds.join(",") || "none"}</output>
      <button type="button" onClick={() => onSelectionChange([])}>{emptySelectionLabel}</button>
      <button type="button" onClick={() => onSelectionChange(["atlas"])}>Atlas Care</button>
    </div>
  ),
}));

vi.mock("@/components/shifts/ShiftDateRangeControl", () => ({
  default: ({ controlLabel, dialogTitle, onApply, value }: {
    controlLabel?: string;
    dialogTitle?: string;
    onApply: (range: { startDate: string; endDate: string }) => void;
    value: { startDate: string; endDate: string };
  }) => (
    <div>
      <output aria-label="Date control copy">{`${controlLabel}|${dialogTitle}`}</output>
      <button type="button" onClick={() => onApply({ startDate: "2026-06-01", endDate: "2026-06-30" })}>
        Dates {value.startDate} to {value.endDate}
      </button>
    </div>
  ),
}));

function renderHeader({
  path = "/super-admin/billing/claims?scope=network&status=open",
  payrollTab = "due" as const,
}: {
  path?: string;
  payrollTab?: "due" | "saved";
} = {}) {
  cleanup();
  const onScopeChange = vi.fn();
  const onDateRangeChange = vi.fn();
  const onModeChange = vi.fn();
  const onPayrollWeekChange = vi.fn();
  const router = createMemoryRouter([
    {
      path: "*",
      element: (
          <BillingManagementHeader
            search="?scope=network&status=open"
            workspace={{
              scope: { kind: "network" },
              startDate: "2026-07-01",
              endDate: "2026-07-31",
              mode: null,
              payrollWeekStart: "2026-07-27",
              payrollTab,
            }}
            onScopeChange={onScopeChange}
            onDateRangeChange={onDateRangeChange}
            onModeChange={onModeChange}
            onPayrollWeekChange={onPayrollWeekChange}
          />
      ),
    },
  ], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return { onScopeChange, onDateRangeChange, onModeChange, onPayrollWeekChange };
}

describe("BillingManagementHeader", () => {
  it("matches the operational command hierarchy and exposes every billing control", () => {
    renderHeader();

    expect(screen.getByText("Operations")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Billing Management" })).toBeVisible();
    expect(screen.getByRole("button", { name: "All authorized agencies" })).toBeVisible();
    expect(screen.getByRole("button", { name: /Dates 2026-07-01 to 2026-07-31/ })).toBeVisible();
    expect(screen.getByLabelText("Date control copy")).toHaveTextContent(
      "Change billing date range|Select billing date range",
    );
    expect(screen.getByRole("combobox", { name: "Program mode" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Billing workspace sections" })).toBeVisible();
    for (const name of ["Overview", "Claims", "Payroll", "Expenses", "Timesheets"]) {
      expect(screen.getByRole("link", { name })).toBeVisible();
    }
  });

  it("emits scope, date, and mode changes through accessible controls", async () => {
    const user = userEvent.setup();
    const callbacks = renderHeader();

    await user.click(screen.getByRole("button", { name: "Atlas Care" }));
    expect(callbacks.onScopeChange).toHaveBeenCalledWith({ kind: "agency", agencyId: "atlas" });

    await user.click(screen.getByRole("button", { name: "All authorized agencies" }));
    expect(callbacks.onScopeChange).toHaveBeenCalledWith({ kind: "network" });

    await user.click(screen.getByRole("button", { name: /Dates 2026-07-01 to 2026-07-31/ }));
    expect(callbacks.onDateRangeChange).toHaveBeenCalledWith({ startDate: "2026-06-01", endDate: "2026-06-30" });

    await user.selectOptions(screen.getByRole("combobox", { name: "Program mode" }), "hha");
    expect(callbacks.onModeChange).toHaveBeenCalledWith("hha");
  });

  it("preserves workspace search in section destinations and identifies the active route", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "Claims" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Payroll" })).toHaveAttribute(
      "href",
      "/super-admin/billing/payroll-management?scope=network&status=open",
    );
  });

  it("uses an accessible payroll-week control only for network due payroll", async () => {
    const user = userEvent.setup();
    const callbacks = renderHeader({
      path: "/super-admin/billing/payroll-management?scope=network&payrollTab=due",
    });

    expect(screen.getByLabelText("Payroll week")).toHaveTextContent("Jul 27, 2026");
    expect(screen.queryByRole("button", { name: /Dates 2026-07-01/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous payroll week" }));
    expect(callbacks.onPayrollWeekChange).toHaveBeenCalledWith("2026-07-20");

    renderHeader({
      path: "/super-admin/billing/payroll-management?scope=network&payrollTab=saved",
      payrollTab: "saved",
    });
    expect(screen.getAllByRole("button", { name: /Dates 2026-07-01/ })).toHaveLength(1);
  });
});
