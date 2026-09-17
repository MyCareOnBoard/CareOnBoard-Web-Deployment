import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OverviewCards from "./OverviewCards";

const metric = (value: number, trend: number) => ({
  value,
  trend,
  sparkline: [{ value: 1 }, { value: 2 }],
});

describe("OverviewCards", () => {
  it("hides comparisons when a flag value is unavailable", () => {
    render(
      <OverviewCards
        data={{
          totalIssues: metric(NaN, 17),
          revenue: metric(10, 1),
          shiftsBilled: metric(2, 1),
        }}
        availability={{
          rate: "restricted",
          flags: "available",
          indicators: "restricted",
        }}
      />,
    );
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.queryByLabelText("17% improvement")).not.toBeInTheDocument();
  });
  it("preserves agency value, direction, and color semantics", () => {
    render(
      <OverviewCards
        availability={{
          rate: "available",
          flags: "available",
          indicators: "available",
        }}
        populationTotal={10}
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

    const colorBlocks = screen.getAllByTestId("overview-metric-color-block");
    expect(colorBlocks).toHaveLength(4);
    expect(colorBlocks[0]).toHaveClass("opacity-80");
    expect(colorBlocks[0]).toHaveStyle({ backgroundColor: "#12B5B0" });
    expect(colorBlocks[2]).toHaveStyle({ backgroundColor: "#E5484D" });
  });

  it("uses limited labels and never samples a missing response", () => {
    render(<OverviewCards />);
    expect(screen.getByText("No expiry/signature flags")).toBeInTheDocument();
    expect(screen.getByText("Document & incident flags")).toBeInTheDocument();
    expect(screen.queryByText("78%")).not.toBeInTheDocument();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
  });
  it.each([0, -1, undefined])(
    "does not invent a rate for population %s",
    (populationTotal) => {
      render(
        <OverviewCards
          data={{
            complianceRate: metric(100, 15),
            totalIssues: metric(3, 1),
            revenue: metric(10, 1),
            shiftsBilled: metric(2, 1),
          }}
          availability={{
            rate: populationTotal === 0 ? "empty" : "available",
            flags: "available",
            indicators: "available",
          }}
          populationTotal={populationTotal}
        />,
      );
      expect(screen.queryByText("100%")).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText("15% improvement"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(
          populationTotal === 0 ? "No records to assess" : "Unavailable",
        ),
      ).toBeInTheDocument();
    },
  );
  it("omits restricted metrics including hidden trends", () => {
    const { container } = render(
      <OverviewCards
        data={{
          complianceRate: metric(91, 17),
          totalIssues: metric(739, 19),
          revenue: metric(10, 1),
          shiftsBilled: metric(2, 1),
        }}
        availability={{
          rate: "restricted",
          flags: "restricted",
          indicators: "restricted",
        }}
        populationTotal={10}
      />,
    );
    expect(container.innerHTML).not.toMatch(/91%|739|17%|19%/);
  });
  it.each([-1, 101, NaN])(
    "marks invalid rate %s unavailable and hides its comparison",
    (value) => {
      render(
        <OverviewCards
          data={{
            complianceRate: metric(value, 15),
            totalIssues: metric(3, 1),
            revenue: metric(10, 1),
            shiftsBilled: metric(2, 1),
          }}
          availability={{
            rate: "available",
            flags: "available",
            indicators: "available",
          }}
          populationTotal={10}
        />,
      );
      expect(screen.getByText("Unavailable")).toBeInTheDocument();
      expect(
        screen.queryByLabelText("15% improvement"),
      ).not.toBeInTheDocument();
    },
  );
  it("omits a missing prior comparison without fabricating zero", () => {
    render(
      <OverviewCards
        data={{
          complianceRate: { value: 90, sparkline: [] },
          revenue: metric(10, 1),
          shiftsBilled: metric(2, 1),
        }}
        availability={{
          rate: "available",
          flags: "restricted",
          indicators: "restricted",
        }}
        populationTotal={10}
      />,
    );
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.queryByLabelText("0% improvement")).not.toBeInTheDocument();
  });
  it("renders four shared skeletons", () => {
    render(<OverviewCards isLoading />);

    expect(screen.getAllByTestId("analytics-metric-skeleton")).toHaveLength(4);
  });
});
