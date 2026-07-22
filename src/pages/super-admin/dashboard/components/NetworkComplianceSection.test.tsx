import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useGetAgencyComplianceQuery,
  useGetNetworkComplianceSummaryQuery,
} from "../api";
import NetworkComplianceSection from "./NetworkComplianceSection";

vi.mock("../api", () => ({
  useGetAgencyComplianceQuery: vi.fn(),
  useGetNetworkComplianceSummaryQuery: vi.fn(),
}));

vi.mock(
  "@/pages/agency/analytics/components/AnalyticsDateRangeModal",
  () => ({
    default: () => null,
  }),
);

const breakdown = [
  {
    key: "expiredCertification",
    label: "Expired certification",
    value: 2,
    color: "#f33500",
  },
  {
    key: "overtimeRisk",
    label: "Overtime risk",
    value: 1,
    color: "#ff7a00",
  },
];

describe("NetworkComplianceSection", () => {
  beforeEach(() => {
    vi.mocked(useGetNetworkComplianceSummaryQuery).mockReturnValue({
      data: {
        success: true,
        data: {
          generatedAt: "2026-07-21T12:00:00.000Z",
          scope: {
            startDate: "2026-06-21",
            endDate: "2026-07-21",
          },
          comparison: {
            startDate: "2026-05-21",
            endDate: "2026-06-20",
          },
          trends: {
            complianceRate: {
              trend: 10,
              sparkline: [{ value: 84 }, { value: 92 }],
            },
            totalIssues: {
              trend: -25,
              sparkline: [{ value: 4 }, { value: 3 }],
            },
            agenciesWithIssues: {
              trend: 50,
              sparkline: [{ value: 2 }, { value: 3 }],
            },
            populationTotal: {
              trend: 0,
              sparkline: [{ value: 125 }, { value: 125 }],
            },
          },
          aggregate: {
            complianceRate: 92,
            populationTotal: 125,
            nonCompliantPeople: 10,
            totalIssues: 3,
            agenciesWithIssues: 3,
            breakdown,
          },
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);

    vi.mocked(useGetAgencyComplianceQuery).mockReturnValue({
      data: {
        success: true,
        data: [
          {
            agencyId: "agency-1",
            agencyName: "Bright Care",
            programs: ["hha"],
            complianceRate: 80,
            populationTotal: 10,
            nonCompliantPeople: 2,
            totalIssues: 3,
            breakdown,
          },
          {
            agencyId: "agency-2",
            agencyName: "Complete Care",
            programs: ["ddd"],
            complianceRate: 100,
            populationTotal: 8,
            nonCompliantPeople: 0,
            totalIssues: 0,
            breakdown: [],
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
        scope: {
          startDate: "2026-06-21",
          endDate: "2026-07-21",
        },
        generatedAt: "2026-07-21T12:00:00.000Z",
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
  });

  it("shows the weighted network summary and expandable agency details", () => {
    render(
      <MemoryRouter>
        <NetworkComplianceSection />
      </MemoryRouter>,
    );

    expect(screen.getByText("Network compliance")).toBeInTheDocument();
    expect(screen.getByText("92%")).toBeInTheDocument();
    expect(screen.getByText("Bright Care")).toBeInTheDocument();
    expect(screen.queryByText("Agency issue breakdown")).not.toBeInTheDocument();

    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Agency actions for Bright Care" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "View breakdown" }));

    expect(screen.getByText("Agency issue breakdown")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /open bright care in compliance monitor/i }),
    ).toHaveAttribute(
      "href",
      "/super-admin/compliance-monitor?agencyId=agency-1&agencyName=Bright+Care",
    );
  });

  it("shows outcome-aware trends and lightweight comparison graphs", () => {
    render(
      <MemoryRouter>
        <NetworkComplianceSection />
      </MemoryRouter>,
    );

    const complianceImprovement = screen.getByLabelText("10% improvement");
    expect(complianceImprovement).toHaveClass("text-[#12B5B0]");
    expect(
      complianceImprovement.querySelector(".lucide-arrow-up"),
    ).not.toBeNull();

    const issuesImprovement = screen.getByLabelText("25% improvement");
    expect(issuesImprovement).toHaveClass("text-[#12B5B0]");
    expect(
      issuesImprovement.querySelector(".lucide-arrow-down"),
    ).not.toBeNull();

    const agencyRegression = screen.getByLabelText("50% regression");
    expect(agencyRegression).toHaveClass("text-[#E5484D]");
    expect(
      agencyRegression.querySelector(".lucide-arrow-up"),
    ).not.toBeNull();

    expect(screen.getByLabelText("No change")).toHaveClass("text-[#808081]");
    expect(screen.getAllByTestId("comparison-sparkline")).toHaveLength(4);
  });

  it("falls back to neutral trends with an older summary response", () => {
    vi.mocked(useGetNetworkComplianceSummaryQuery).mockReturnValue({
      data: {
        success: true,
        data: {
          generatedAt: "2026-07-21T12:00:00.000Z",
          scope: {
            startDate: "2026-06-21",
            endDate: "2026-07-21",
          },
          aggregate: {
            complianceRate: 92,
            populationTotal: 125,
            nonCompliantPeople: 10,
            totalIssues: 3,
            agenciesWithIssues: 1,
            breakdown,
          },
        },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);

    render(
      <MemoryRouter>
        <NetworkComplianceSection />
      </MemoryRouter>,
    );

    expect(screen.getAllByLabelText("No change")).toHaveLength(4);
  });
  it("renders the backend page without re-filtering pagination results", () => {
    render(
      <MemoryRouter>
        <NetworkComplianceSection />
      </MemoryRouter>,
    );

    expect(screen.getByText("Bright Care")).toBeInTheDocument();
    expect(screen.getByText("Complete Care")).toBeInTheDocument();
    expect(screen.getByText("2 agencies requiring attention")).toBeInTheDocument();
  });

  it("renders a readable date range with an arrow separator", () => {
    render(
      <MemoryRouter>
        <NetworkComplianceSection />
      </MemoryRouter>,
    );

    const dateButton = screen.getByRole("button", {
      name: /[A-Z][a-z]{2} \d{1,2}.*\d{4}/,
    });

    expect(dateButton).toHaveAccessibleName(/[A-Z][a-z]{2} \d{1,2} to [A-Z][a-z]{2} \d{1,2}, \d{4}/);
    expect(dateButton).not.toHaveTextContent("Ã");
    expect(dateButton.querySelector("svg.lucide-arrow-right")).not.toBeNull();
  });

  it("renders readable agency sort labels without mojibake", () => {
    render(
      <MemoryRouter>
        <NetworkComplianceSection />
      </MemoryRouter>,
    );

    const sortTrigger = screen.getByRole("combobox", {
      name: "Sort agencies",
    });
    fireEvent.keyDown(sortTrigger, { key: "ArrowDown" });

    expect(
      screen.getByRole("option", { name: "Agency name: A to Z" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/â|Ã/)).not.toBeInTheDocument();
  });

  it("uses agency-dashboard skeletons for both loading states", () => {
    vi.mocked(useGetNetworkComplianceSummaryQuery).mockReturnValue({
      isLoading: true,
      isFetching: true,
      isError: false,
      refetch: vi.fn(),
    } as never);
    vi.mocked(useGetAgencyComplianceQuery).mockReturnValue({
      isLoading: true,
      isFetching: true,
      isError: false,
      refetch: vi.fn(),
    } as never);

    render(
      <MemoryRouter>
        <NetworkComplianceSection />
      </MemoryRouter>,
    );

    expect(
      screen.getByLabelText("Loading network compliance summary"),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("network-summary-skeleton")).toHaveLength(4);
    expect(
      screen.getAllByTestId("agency-compliance-skeleton-row"),
    ).toHaveLength(6);
  });

  it("keeps summary and agency errors independently retryable", () => {
    const retrySummary = vi.fn();
    const retryAgencies = vi.fn();

    vi.mocked(useGetNetworkComplianceSummaryQuery).mockReturnValue({
      isLoading: false,
      isError: true,
      refetch: retrySummary,
    } as never);
    vi.mocked(useGetAgencyComplianceQuery).mockReturnValue({
      isLoading: false,
      isError: true,
      refetch: retryAgencies,
    } as never);

    render(
      <MemoryRouter>
        <NetworkComplianceSection />
      </MemoryRouter>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Retry network summary" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Retry agency results" }),
    );

    expect(retrySummary).toHaveBeenCalledOnce();
    expect(retryAgencies).toHaveBeenCalledOnce();
  });
});
