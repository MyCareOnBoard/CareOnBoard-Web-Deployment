import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import NetworkPayrollWeekControl from "./NetworkPayrollWeekControl";

describe("NetworkPayrollWeekControl", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshes next-week availability at the Monday UTC boundary without changing the selected week", () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(new Date("2026-08-02T23:59:59.000Z"));
    const onChange = vi.fn();
    render(<NetworkPayrollWeekControl value="2026-07-27" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "Next payroll week" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Current" })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.getByRole("button", { name: "Next payroll week" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Current" })).toBeEnabled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
