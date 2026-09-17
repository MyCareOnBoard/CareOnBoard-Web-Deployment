import { render, renderHook, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLazyGetAnalyticsInsightsQuery } from "@/lib/api/reports";
import { useScopedAnalyticsInsights } from "./AIInsightsCard";
import ComplianceInsights from "./ComplianceInsights";
import RiskTrends from "./RiskTrends";
import BillingSummary from "./BillingSummary";
import OperationalEfficiency from "./OperationalEfficiency";
vi.mock("@/lib/api/reports", () => ({
  useLazyGetAnalyticsInsightsQuery: vi.fn(),
}));
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  AreaChart: () => null,
  Area: () => null,
  LineChart: ({ data, children }: any) => (
    <div data-testid="chart-data" data-values={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: ({ dataKey }: any) => <span>{dataKey}</span>,
  CartesianGrid: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));
const filters = {
  mode: "hha",
  startDate: "2026-09-01",
  endDate: "2026-09-16",
  scopeKey: "actor-db-permissions-a",
};
const reportScope = { ...filters, checkedAt: "2026-09-17T12:00:00Z" };
let result: any;
let trigger: ReturnType<typeof vi.fn>;
beforeEach(() => {
  trigger = vi.fn();
  result = {
    currentData: {
      success: true,
      reportScope,
      data: Object.fromEntries(
        ["compliance", "risk", "efficiency", "billing"].map((key) => [
          key,
          {
            insight: "Sensitive 739 findings",
            recommendation: "Private recommendation",
          },
        ]),
      ),
    },
    originalArgs: filters,
    isFetching: false,
  };
  vi.mocked(useLazyGetAnalyticsInsightsQuery).mockImplementation(
    () => [trigger, result] as never,
  );
});
describe("scope-bound Analytics AI", () => {
  it.each([
    ["compliance", ComplianceInsights],
    ["risk", RiskTrends],
    ["billing", BillingSummary],
    ["efficiency", OperationalEfficiency],
  ] as const)(
    "clears %s AI immediately for a new actor/date/mode scope",
    (_name, Component) => {
      const props = {
        ...filters,
        availability: "available" as const,
        total: 1,
        data: [
          {
            label: "Expired",
            value: 1,
            color: "red",
            month: "Sep",
            overtime: 1,
          },
        ],
        metrics: [],
      };
      const view = render(
        <MemoryRouter>
          <Component {...props} />
        </MemoryRouter>,
      );
      fireEvent.click(screen.getByRole("button", { name: "AI insights" }));
      expect(screen.getByText("Sensitive 739 findings")).toBeInTheDocument();
      expect(trigger).toHaveBeenCalledWith(filters);
      view.rerender(
        <MemoryRouter>
          <Component {...props} scopeKey="actor-db-permissions-b" mode="ddd" />
        </MemoryRouter>,
      );
      expect(
        screen.queryByText("Sensitive 739 findings"),
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "AI insights" }));
      expect(
        screen.queryByText("Sensitive 739 findings"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText("Insights unavailable. Try again."),
      ).toBeInTheDocument();
    },
  );
  it("omitted AI sections are unavailable, never empty success", () => {
    result.currentData.data = {};
    render(
      <MemoryRouter>
        <ComplianceInsights
          {...filters}
          availability="available"
          total={0}
          data={[]}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "AI insights" }));
    expect(
      screen.getByText("Insights unavailable. Try again."),
    ).toBeInTheDocument();
  });
  it("omits denied trend series from legends and chart data", () => {
    render(<RiskTrends data={[{ month: "Sep", overtime: 7 }]} {...filters} />);
    expect(screen.getByText("Overtime risk")).toBeInTheDocument();
    expect(screen.queryByText("Expired Certification")).not.toBeInTheDocument();
    expect(screen.getByTestId("chart-data").getAttribute("data-values")).toBe(
      '[{"month":"Sep","overtime":7}]',
    );
    expect(screen.queryByText("expired")).not.toBeInTheDocument();
  });
});

it("blocks an undated AI trigger and rejects an already-returned default-period narrative", () => {
  const { startDate: _start, endDate: _end, ...undated } = filters;
  result.originalArgs = undated;
  const hook = renderHook(() => useScopedAnalyticsInsights(undated));
  expect(hook.result.current.insightsData).toBeUndefined();
  hook.result.current.fetchInsights();
  expect(trigger).not.toHaveBeenCalled();
});
