import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import OverviewCards from "./OverviewCards";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <>{children}</>,
  AreaChart: ({ children }: { children: ReactNode }) => <svg>{children}</svg>,
  Area: () => null,
}));

const metric = (value: number, trend: number) => ({
  value,
  trend,
  sparkline: [{ value: 1 }, { value: 2 }],
});

describe("OverviewCards", () => {
  it("preserves agency value, direction, and color semantics", () => {
    render(
      <OverviewCards
        data={{
          complianceRate: metric(92, 10),
          totalIssues: metric(3, 5),
          revenue: metric(2400, -10),
          shiftsBilled: metric(28, 4),
        }}
      />,
    );

    expect(screen.getByText("92%")).toBeInTheDocument();
    const improvements = screen.getAllByLabelText("10% improvement");
    expect(improvements[0]).toHaveClass("text-[#12B5B0]");
    expect(improvements[0].querySelector(".lucide-arrow-up")).not.toBeNull();

    const regression = screen.getByLabelText("10% regression");
    expect(regression).toHaveClass("text-[#E5484D]");
    expect(regression.querySelector(".lucide-arrow-down")).not.toBeNull();
  });

  it("renders four shared skeletons", () => {
    render(<OverviewCards isLoading />);

    expect(screen.getAllByTestId("analytics-metric-skeleton")).toHaveLength(4);
  });
});
