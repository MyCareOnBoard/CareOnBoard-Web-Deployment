import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ShiftDateRangeControl from "./ShiftDateRangeControl";

describe("ShiftDateRangeControl", () => {
  it("accepts an ordered range longer than 31 days when no maximum is configured", async () => {
    const onApply = vi.fn();
    const value = { startDate: "2024-01-01", endDate: "2026-08-01" };
    render(<ShiftDateRangeControl value={value} onApply={onApply} />);

    await userEvent.click(screen.getByRole("button", { name: /Change shift date range/i }));
    expect(screen.getByRole("heading", { name: "Select shift date range" })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Use this date range" }));

    expect(onApply).toHaveBeenCalledWith(value);
    expect(screen.queryByText(/maximum|31 days/i)).not.toBeInTheDocument();
  });

  it("uses caller-provided accessible control and dialog copy", async () => {
    render(
      <ShiftDateRangeControl
        value={{ startDate: "2026-07-01", endDate: "2026-07-31" }}
        onApply={vi.fn()}
        controlLabel="Change billing date range"
        dialogTitle="Select billing date range"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Change billing date range/i }));

    expect(screen.getByRole("heading", { name: "Select billing date range" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Select shift date range" })).not.toBeInTheDocument();
  });
});
