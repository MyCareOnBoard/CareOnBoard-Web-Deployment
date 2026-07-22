import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ComplianceBreakdownChart from "./ComplianceBreakdownChart";

const data = [
  { key: "expiredCertification", label: "Expired Certification", value: 4, color: "#f33500" },
  { key: "overtimeRisk", label: "Overtime risk", value: 2, color: "#FF7A00" },
  { key: "missingDocument", label: "Missing document", value: 1, color: "#3B82F6" },
  { key: "unsignedForm485", label: "Unsigned Form 485", value: 1, color: "#8B5CF6" },
  { key: "other", label: "Other", value: 0, color: "#BDBDBD" },
];

describe("ComplianceBreakdownChart", () => {
  it("renders issue counts and percentages with accessible labels", () => {
    render(<ComplianceBreakdownChart total={8} data={data} />);

    expect(screen.getByText("8")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Expired Certification: 4 issues, 50% of total",
      }),
    ).toBeInTheDocument();
  });

  it("omits the HHA-only Form 485 segment in DDD mode", () => {
    render(<ComplianceBreakdownChart total={7} data={data} mode="ddd" />);

    expect(screen.queryByText("Unsigned Form 485")).not.toBeInTheDocument();
  });

  it("normalizes non-overlapping slice geometry from visible categories", () => {
    const visibleData = [
      { key: "first", label: "First category", value: 3, color: "#f33500" },
      { key: "second", label: "Second category", value: 1, color: "#3B82F6" },
    ];
    const { container } = render(
      <ComplianceBreakdownChart total={10} data={visibleData} />,
    );

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "First category: 3 issues, 75% of total",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Second category: 1 issue, 25% of total",
      }),
    ).toBeInTheDocument();

    const slices = container.querySelectorAll("svg circle[data-segment]");
    expect(slices).toHaveLength(2);
    expect(slices[0]).toHaveAttribute("pathLength", "100");
    expect(slices[0]).toHaveAttribute("stroke-linecap", "butt");
    expect(slices[0]).toHaveAttribute("stroke-dasharray", "75 25");
    expect(slices[0]).toHaveAttribute("stroke-dashoffset", "0");
    expect(slices[1]).toHaveAttribute("stroke-dasharray", "25 75");
    expect(slices[1]).toHaveAttribute("stroke-dashoffset", "-75");
  });

  it("allocates whole percentages that add up to 100", () => {
    const cumulativeData = [
      {
        key: "expiredCertification",
        label: "Expired Certification",
        value: 7,
        color: "#f33500",
      },
      {
        key: "unsignedForm485",
        label: "Unsigned Form 485",
        value: 1,
        color: "#8B5CF6",
      },
    ];
    const { container } = render(
      <ComplianceBreakdownChart total={8} data={cumulativeData} />,
    );

    expect(
      screen.getByRole("button", {
        name: "Expired Certification: 7 issues, 88% of total",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Unsigned Form 485: 1 issue, 12% of total",
      }),
    ).toBeInTheDocument();

    const slices = container.querySelectorAll("svg circle[data-segment]");
    expect(slices[0]).toHaveAttribute("stroke-dasharray", "87.5 12.5");
    expect(slices[1]).toHaveAttribute("stroke-dasharray", "12.5 87.5");
    expect(slices[1]).toHaveAttribute("stroke-dashoffset", "-87.5");
  });

  it("reports zero percent when there are no issues", () => {
    render(
      <ComplianceBreakdownChart
        total={0}
        data={data.map((item) => ({ ...item, value: 0 }))}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Missing document: 0 issues, 0% of total",
      }),
    ).toBeInTheDocument();
  });

  it("reports the selected segment when interaction is enabled", () => {
    const onSegmentClick = vi.fn();
    render(
      <ComplianceBreakdownChart
        total={8}
        data={data}
        onSegmentClick={onSegmentClick}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Overtime risk: 2 issues, 25% of total",
      }),
    );

    expect(onSegmentClick).toHaveBeenCalledWith(data[1]);
  });
});
