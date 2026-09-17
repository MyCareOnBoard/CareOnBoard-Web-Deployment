import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLazyGetAnalyticsInsightsQuery } from "@/lib/api/reports";
import ComplianceInsights from "./ComplianceInsights";

vi.mock("@/lib/api/reports", () => ({
  useLazyGetAnalyticsInsightsQuery: vi.fn(),
}));

const data = [
  {
    key: "expiredCertification",
    label: "Expired Certification",
    value: 1,
    color: "#f33500",
  },
];

describe("ComplianceInsights", () => {
  beforeEach(() => {
    vi.mocked(useLazyGetAnalyticsInsightsQuery).mockReturnValue([
      vi.fn(),
      { data: undefined, isLoading: false },
    ] as never);
  });

  it("matches the agency analytics card and AI button styling", () => {
    render(
      <MemoryRouter>
        <ComplianceInsights total={1} data={data} availability="available" />
      </MemoryRouter>,
    );

    const heading = screen.getByRole("heading", {
      name: "Selected risk indicators",
    });
    const card = heading.parentElement?.parentElement?.parentElement;
    const insightsButton = screen.getByRole("button", { name: "AI insights" });

    expect(card).toHaveClass("border-[#E8ECEF]", "bg-[#FFFFFF66]");
    expect(card).not.toHaveClass("border-border", "bg-card/60");
    expect(insightsButton).toHaveClass(
      "border-[#EEF2F4]",
      "bg-white",
      "text-[#111827]",
    );
    expect(insightsButton).not.toHaveClass("border-border", "bg-card");
  });

  it("has no sample findings on failure or hidden findings when restricted", () => {
    const { rerender } = render(
      <MemoryRouter>
        <ComplianceInsights />
      </MemoryRouter>,
    );
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Expired Certification")).not.toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <ComplianceInsights total={739} data={data} availability="restricted" />
      </MemoryRouter>,
    );
    expect(screen.queryByText("739")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "AI insights" }),
    ).not.toBeInTheDocument();
  });
  it("uses the agency analytics skeleton palette while loading", () => {
    const { container } = render(
      <MemoryRouter>
        <ComplianceInsights total={1} data={data} isLoading />
      </MemoryRouter>,
    );

    expect(container.firstElementChild).toHaveClass(
      "border-[#E8ECEF]",
      "bg-[#FFFFFF66]",
    );
    expect(container.querySelector(".bg-gray-100")).toBeInTheDocument();
  });
});
