import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/super-admin-operations", () => ({ listOperationalAgencies: vi.fn(() => new Promise(() => undefined)) }));

import ShiftManagementHeader from "./ShiftManagementHeader";

const props = {
  dateRange: { startDate: "2026-07-20", endDate: "2026-08-18" },
  selectedAgencyIds: [] as string[],
  onDateRangeChange: vi.fn(),
  onAgencySelectionChange: vi.fn(),
};

describe("ShiftManagementHeader", () => {
  it("shows the workspace scope without duplicating the view control", () => {
    render(<ShiftManagementHeader {...props} />);
    expect(screen.getByRole("heading", { name: "Shift management" })).toBeVisible();
    expect(screen.getByRole("button", { name: /Change shift date range, Jul 20, 2026 - Aug 18, 2026/i })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Calendar view" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "List view" })).not.toBeInTheDocument();
  });

  it("opens the Billing date-range dialog", async () => {
    render(<ShiftManagementHeader {...props} />);
    await userEvent.click(screen.getByRole("button", { name: /Change shift date range/i }));
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByText("Select shift date range")).toBeVisible();
    expect(screen.getByRole("button", { name: "Use this date range" })).toBeVisible();
  });

  it("supports List view with the all-agencies scope", () => {
    render(<ShiftManagementHeader {...props} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select an agency, all agencies" })).toBeVisible();
  });
});
