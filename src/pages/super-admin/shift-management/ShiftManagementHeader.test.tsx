import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listOperationalAgencies = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/super-admin-operations", () => ({ listOperationalAgencies }));

import ShiftManagementHeader from "./ShiftManagementHeader";

describe("ShiftManagementHeader", () => {
  beforeEach(() => {
    listOperationalAgencies.mockReturnValue(new Promise(() => undefined));
  });

  it("renders a semantic operational header with view state and agency count", () => {
    render(
      <ShiftManagementHeader
        view="calendar"
        month="2026-07"
        selectedAgencyIds={["atlas", "birch"]}
        onViewChange={vi.fn()}
        onMonthChange={vi.fn()}
        onAgencySelectionChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("banner")).toBeVisible();
    expect(screen.getByRole("heading", { level: 1, name: "Shift management" })).toBeVisible();
    expect(screen.getByRole("group", { name: "Shift workspace view" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Calendar view" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("status")).toHaveTextContent("2 agencies selected");
    expect(screen.getByText("July 2026")).toBeVisible();
  });

  it("moves by calendar month and reports requested view changes", async () => {
    const user = userEvent.setup();
    const onMonthChange = vi.fn();
    const onViewChange = vi.fn();
    render(
      <ShiftManagementHeader
        view="calendar"
        month="2026-01"
        selectedAgencyIds={["atlas"]}
        onViewChange={onViewChange}
        onMonthChange={onMonthChange}
        onAgencySelectionChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Previous month" }));
    await user.click(screen.getByRole("button", { name: "Next month" }));
    await user.click(screen.getByRole("button", { name: "List view" }));

    expect(onMonthChange).toHaveBeenNthCalledWith(1, "2025-12");
    expect(onMonthChange).toHaveBeenNthCalledWith(2, "2026-02");
    expect(onViewChange).toHaveBeenCalledWith("list");
  });

  it("prompts for exactly one agency when List has no singular selection", () => {
    render(
      <ShiftManagementHeader
        view="list"
        month="2026-07"
        selectedAgencyIds={[]}
        onViewChange={vi.fn()}
        onMonthChange={vi.fn()}
        onAgencySelectionChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Choose one agency to use List view.");
    expect(screen.getByRole("button", { name: "Select an agency, none selected" })).toBeVisible();
  });
});
