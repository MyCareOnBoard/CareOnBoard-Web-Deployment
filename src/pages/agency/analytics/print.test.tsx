import { act, render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import AnalyticsPrintPage from "./print";
// Exercise real location changes; the global setup mocks useNavigate.
vi.mock("react-router", async (importOriginal) => await importOriginal());
import { useGetAnalyticsSummaryQuery } from "@/lib/api/reports";
vi.mock("@/lib/api/reports", () => ({ useGetAnalyticsSummaryQuery: vi.fn() }));
vi.mock("@/hooks/useAssignmentReview", () => ({
  useAssignmentReviewScope: () => "actor-db-permission",
}));
vi.mock("@/utils/auth", () => ({
  useAuth: () => ({ user: { agencyId: "a" } }),
}));
const metric = { value: 12, trend: 2, sparkline: [] };
const makeSummary = () => ({
  overview: {
    complianceRate: { value: 90, sparkline: [] },
    totalIssues: metric,
    revenue: metric,
    shiftsBilled: metric,
  },
  populationTotal: 10,
  complianceAvailability: {
    rate: "available",
    flags: "available",
    indicators: "available",
  },
  currentRecordSources: [],
  complianceInsights: { total: 2, breakdown: [] },
  riskTrends: [],
  billingSummary: { total: 1, breakdown: [] },
  operationalEfficiency: {
    completionRate: { ...metric, value: "10%" },
    onTimeRate: { ...metric, value: "20%" },
    manualRate: { ...metric, value: "30%" },
  },
  reportScope: {
    startDate: "2026-09-01",
    endDate: "2026-09-16",
    mode: "hha",
    checkedAt: "2026-09-17T12:00:00Z",
  },
});
let result: any;
const renderPage = (
  search = "?startDate=2026-09-01&endDate=2026-09-16&mode=hha",
) =>
  render(
    <MemoryRouter initialEntries={["/agency/analytics/print" + search]}>
      <AnalyticsPrintPage />
    </MemoryRouter>,
  );
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(window, "print").mockImplementation(() => {});
  result = {
    currentData: { success: true, data: makeSummary() },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
    requestId: "r1",
  };
  vi.mocked(useGetAnalyticsSummaryQuery).mockImplementation(() => result);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
describe("Analytics print", () => {
  it("cancels pending printing on a URL mode change", () => {
    function ChangeScope() {
      const navigate = useNavigate();
      return (
        <button
          onClick={() =>
            navigate("?startDate=2026-09-01&endDate=2026-09-16&mode=ddd")
          }
        >
          Change scope
        </button>
      );
    }
    render(
      <MemoryRouter
        initialEntries={["?startDate=2026-09-01&endDate=2026-09-16&mode=hha"]}
      >
        <ChangeScope />
        <AnalyticsPrintPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Change scope" }));
    act(() => vi.runAllTimers());
    expect(window.print).not.toHaveBeenCalled();
  });
  it.each([
    "",
    "?startDate=2026-09-01",
    "?startDate=2026-02-30&endDate=2026-09-16",
    "?startDate=2026-09-01&endDate=2026-09-16&mode=unknown",
    "?startDate=2026-09-01&endDate=2026-09-16&mode=hha&mode=ddd",
    "?startDate=2026-09-01&endDate=2026-09-16&cursor=x",
  ])("rejects invalid URL %s without defaults", (search) => {
    renderPage(search);
    expect(
      screen.getByText(/report link is incomplete or invalid/),
    ).toBeInTheDocument();
    expect(
      vi.mocked(useGetAnalyticsSummaryQuery).mock.calls[0][1],
    ).toMatchObject({ skip: true });
    act(() => vi.runAllTimers());
    expect(window.print).not.toHaveBeenCalled();
  });
  it("requests exact dates/mode and prints once with returned checked time and limited labels", () => {
    const view = renderPage();
    expect(
      vi.mocked(useGetAnalyticsSummaryQuery).mock.calls[0][0],
    ).toMatchObject({
      startDate: "2026-09-01",
      endDate: "2026-09-16",
      mode: "hha",
      scopeKey: expect.any(String),
    });
    expect(screen.getByText("No expiry/signature flags")).toBeInTheDocument();
    expect(screen.getByText("Document & incident flags")).toBeInTheDocument();
    expect(screen.getByText(/2026-09-17T12:00:00Z/)).toBeInTheDocument();
    act(() => vi.runAllTimers());
    view.rerender(
      <MemoryRouter>
        <AnalyticsPrintPage />
      </MemoryRouter>,
    );
    act(() => vi.runAllTimers());
    expect(window.print).toHaveBeenCalledTimes(1);
  });
  it.each(["error", "denied", "unavailable", "mismatch"])(
    "does not print %s",
    (kind) => {
      if (kind === "error" || kind === "denied") {
        result.isError = true;
        result.error = { status: kind === "denied" ? 403 : 500 };
      }
      if (kind === "unavailable")
        result.currentData.data.complianceAvailability.rate = "unavailable";
      if (kind === "mismatch") result.currentData.data.reportScope.mode = "ddd";
      renderPage();
      act(() => vi.runAllTimers());
      expect(window.print).not.toHaveBeenCalled();
      expect(
        screen.getByRole("link", { name: "Return to Analytics" }),
      ).toBeInTheDocument();
    },
  );
  it("prints an empty rate without inventing 100 percent", () => {
    result.currentData.data.complianceAvailability.rate = "empty";
    result.currentData.data.populationTotal = 0;
    delete result.currentData.data.overview.complianceRate;
    renderPage();
    expect(screen.getByText("No records to assess")).toBeInTheDocument();
    act(() => vi.runAllTimers());
    expect(window.print).toHaveBeenCalledTimes(1);
  });
  it("omits restricted metrics and still prints allowed sections", () => {
    result.currentData.data.complianceAvailability = {
      rate: "restricted",
      flags: "restricted",
      indicators: "restricted",
    };
    result.currentData.data.overview.complianceRate.value = 739;
    renderPage();
    expect(screen.queryByText("739%")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Selected risk indicators"),
    ).not.toBeInTheDocument();
    act(() => vi.runAllTimers());
    expect(window.print).toHaveBeenCalledTimes(1);
  });
  it("cancels printing when unmounted", () => {
    const view = renderPage();
    view.unmount();
    act(() => vi.runAllTimers());
    expect(window.print).not.toHaveBeenCalled();
  });
  it("cancels pending printing on request failure and retries exact filters", () => {
    const view = renderPage();
    result = { ...result, isError: true };
    view.rerender(
      <MemoryRouter>
        <AnalyticsPrintPage />
      </MemoryRouter>,
    );
    act(() => vi.runAllTimers());
    expect(window.print).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(result.refetch).toHaveBeenCalled();
  });
});
