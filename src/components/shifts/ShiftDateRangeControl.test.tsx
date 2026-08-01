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
    await userEvent.click(screen.getByRole("button", { name: "Use this date range" }));

    expect(onApply).toHaveBeenCalledWith(value);
    expect(screen.queryByText(/maximum|31 days/i)).not.toBeInTheDocument();
  });
});
