import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AnalyticsMetricCard, {
  AnalyticsMetricCardSkeleton,
} from "./AnalyticsMetricCard";

describe("AnalyticsMetricCard", () => {
  it("uses arrow direction independently from improvement color", () => {
    const { rerender } = render(
      <AnalyticsMetricCard
        value="6"
        label="Total issues"
        trend={-25}
        sentiment="improvement"
        graph={<svg data-testid="graph" />}
      />,
    );

    const improvement = screen.getByLabelText("25% improvement");
    expect(improvement).toHaveClass("text-[#12B5B0]");
    expect(improvement.querySelector(".lucide-arrow-down")).not.toBeNull();

    rerender(
      <AnalyticsMetricCard
        value="8"
        label="Total issues"
        trend={25}
        sentiment="regression"
        graph={<svg data-testid="graph" />}
      />,
    );

    const regression = screen.getByLabelText("25% regression");
    expect(regression).toHaveClass("text-[#E5484D]");
    expect(regression.querySelector(".lucide-arrow-up")).not.toBeNull();
  });

  it("announces an unchanged value without a directional arrow", () => {
    render(
      <AnalyticsMetricCard
        value="120"
        label="Measured population"
        trend={0}
        sentiment="neutral"
        helper="Staff and clients included"
        graph={<svg data-testid="graph" />}
      />,
    );

    const neutral = screen.getByLabelText("No change");
    expect(neutral).toHaveClass("text-[#808081]");
    expect(neutral.querySelector("svg")).toBeNull();
    expect(screen.getByText("Staff and clients included")).toBeInTheDocument();
  });

  it("reserves helper and graph space in the loading state", () => {
    render(<AnalyticsMetricCardSkeleton withHelper />);

    expect(screen.getByTestId("analytics-metric-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("analytics-metric-helper-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("analytics-metric-graph-skeleton")).toHaveClass(
      "h-[52px]",
      "w-[92px]",
    );
  });
});
