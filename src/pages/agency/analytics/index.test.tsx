import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AnalyticsPage from "./index";
import {
  useGetAnalyticsSummaryQuery,
  useLazyGetAnalyticsInsightsQuery,
} from "@/lib/api/reports";
vi.mock("@/lib/api/reports", () => ({
  useGetAnalyticsSummaryQuery: vi.fn(),
  useLazyGetAnalyticsInsightsQuery: vi.fn(),
}));
vi.mock("@/hooks/useAssignmentReview", () => ({
  useAssignmentReviewScope: () => "actor-database-permissions",
}));
vi.mock("@/hooks/useEffectiveAgencyMode", () => ({
  useEffectiveAgencyMode: () => "hha",
}));
vi.mock("@/utils/auth", () => ({
  useAuth: () => ({ user: { agencyId: "a" } }),
}));
vi.mock("./components/AnalyticsDateRangeModal", () => ({
  default: ({
    onApply,
  }: {
    onApply: (dates: { startDate: string; endDate: string }) => void;
  }) => (
    <button
      onClick={() =>
        onApply({ startDate: "2026-09-01", endDate: "2026-09-16" })
      }
    >
      Apply selected dates
    </button>
  ),
}));
vi.mock("./components/ShareReportModal", () => ({ default: () => null }));
vi.mock("./components/ComplianceInsights", () => ({ default: () => null }));
vi.mock("./components/RiskTrends", () => ({ default: () => null }));
vi.mock("recharts", () => ({
  ResponsiveContainer: () => null,
  AreaChart: () => null,
  Area: () => null,
}));
const metric = { value: 12, trend: 0, sparkline: [] };
const summary = {
  overview: {
    complianceRate: { ...metric, value: 91 },
    totalIssues: metric,
    revenue: metric,
    shiftsBilled: metric,
  },
  complianceAvailability: {
    rate: "available",
    flags: "available",
    indicators: "available",
  },
  populationTotal: 10,
  reportScope: {
    startDate: "2026-09-01",
    endDate: "2026-09-16",
    mode: "hha",
    checkedAt: "2026-09-17T12:00:00Z",
  },
  currentRecordSources: [],
  riskTrends: [],
  complianceInsights: { total: 0, breakdown: [] },
  billingSummary: { total: 0, breakdown: [] },
  operationalEfficiency: {
    completionRate: metric,
    onTimeRate: metric,
    manualRate: metric,
  },
};
let result: any;
const fetchInsights = vi.fn();
beforeEach(() => {
  fetchInsights.mockClear();
  vi.mocked(useLazyGetAnalyticsInsightsQuery).mockReturnValue([
    fetchInsights,
    { isFetching: false },
  ] as never);
  result = {
    currentData: { success: true, data: summary },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  };
  vi.mocked(useGetAnalyticsSummaryQuery).mockImplementation(() => result);
  vi.spyOn(window, "open").mockImplementation(() => null);
});
it("opens print using resolved returned dates and mode", () => {
  render(
    <MemoryRouter>
      <AnalyticsPage />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Take action" }));
  fireEvent.click(screen.getByRole("button", { name: "Download report" }));
  expect(window.open).toHaveBeenCalledWith(
    "/agency/analytics/print?startDate=2026-09-01&endDate=2026-09-16&mode=hha",
    "_blank",
    "noopener,noreferrer",
  );
});
it.each(["pending", "failure"])(
  "does not reuse another scope's cached report during %s",
  (kind) => {
    result = {
      ...result,
      currentData: undefined,
      data: { success: true, data: summary },
      isFetching: kind === "pending",
      isError: kind === "failure",
    };
    render(
      <MemoryRouter>
        <AnalyticsPage />
      </MemoryRouter>,
    );
    expect(screen.queryByText("91%")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Take action" }));
    expect(
      screen.getByRole("button", { name: "Download report" }),
    ).toBeDisabled();
  },
);

it("blocks billing and operational AI after the selected report fails, then resumes with its resolved dates", () => {
  const view = render(
    <MemoryRouter>
      <AnalyticsPage />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Apply selected dates" }));
  result = { ...result, currentData: undefined, isError: true };
  view.rerender(
    <MemoryRouter>
      <AnalyticsPage />
    </MemoryRouter>,
  );
  const controls = screen.getAllByRole("button", { name: "AI insights" });
  expect(controls).toHaveLength(2);
  controls.forEach((button) => fireEvent.click(button));
  expect(fetchInsights).not.toHaveBeenCalled();
  controls.forEach((button) => expect(button).toBeDisabled());
  expect(
    screen.queryByText("Default-period narrative"),
  ).not.toBeInTheDocument();
  result = {
    ...result,
    currentData: { success: true, data: summary },
    isError: false,
  };
  view.rerender(
    <MemoryRouter>
      <AnalyticsPage />
    </MemoryRouter>,
  );
  screen.getAllByRole("button", { name: "AI insights" }).forEach((button) => {
    expect(button).toBeEnabled();
    fireEvent.click(button);
  });
  expect(fetchInsights).toHaveBeenCalledTimes(2);
  for (const [args] of fetchInsights.mock.calls)
    expect(args).toMatchObject({
      mode: "hha",
      startDate: "2026-09-01",
      endDate: "2026-09-16",
    });
});
