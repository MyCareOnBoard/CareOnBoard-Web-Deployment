import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Search,
} from "lucide-react";
import { Link } from "react-router";

import AnalyticsMetricCard, {
  AnalyticsMetricCardSkeleton,
  type TrendSentiment,
} from "@/components/analytics/AnalyticsMetricCard";
import ComparisonSparkline from "@/components/analytics/ComparisonSparkline";
import ComplianceBreakdownChart from "@/components/compliance/ComplianceBreakdownChart";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DotGridIcon, menuItemClassName } from "@/components/ui/dot-grid-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import AnalyticsDateRangeModal from "@/pages/agency/analytics/components/AnalyticsDateRangeModal";
import { Routes } from "@/routes/constants";
import {
  type AgencyComplianceRow,
  type ComplianceMode,
  type ComplianceSortBy,
  type ComplianceSortOrder,
  type ComplianceTrendMetric,
  type ComplianceTrends,
  useGetAgencyComplianceQuery,
  useGetNetworkComplianceSummaryQuery,
} from "../api";

const PAGE_SIZE = 20;

// Keep this full class literal shared by the header, rows, and skeleton rows so
// Tailwind generates one aligned responsive table grid.
const AGENCY_GRID =
  "gap-2 md:grid-cols-[minmax(180px,2fr)_minmax(100px,1fr)_120px_90px_100px_56px]";

type DateRange = {
  startDate: string;
  endDate: string;
};

function defaultDateRange(): DateRange {
  const today = new Date();
  return {
    startDate: format(subDays(today, 30), "yyyy-MM-dd"),
    endDate: format(today, "yyyy-MM-dd"),
  };
}

function formatRangeParts(range: DateRange) {
  return {
    start: format(new Date(range.startDate + "T00:00:00"), "MMM d"),
    end: format(new Date(range.endDate + "T00:00:00"), "MMM d, yyyy"),
  };
}

function formatProgram(program: string) {
  return program.toUpperCase();
}

function monitorUrl(agency: AgencyComplianceRow) {
  const query = new URLSearchParams({
    agencyId: agency.agencyId,
    agencyName: agency.agencyName,
  });
  return Routes.superAdmin.complianceMonitor + "?" + query.toString();
}

function SummaryLoading() {
  return (
    <div
      aria-label="Loading network compliance summary"
      className="space-y-5"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} data-testid="network-summary-skeleton">
            <AnalyticsMetricCardSkeleton withHelper />
          </div>
        ))}
      </div>
      <div className="rounded-[32px] border border-[#E8ECEF] bg-white/40 p-6">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="mt-3 h-4 w-72 max-w-full" />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-2xl" />
          <div className="space-y-3">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AgencySkeletonRow() {
  return (
    <div
      data-testid="agency-compliance-skeleton-row"
      className={
        "grid grid-cols-1 border-b border-[#e5e5e6] px-4 py-4 md:items-center " +
        AGENCY_GRID
      }
    >
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-24 md:hidden" />
      </div>
      <Skeleton className="mt-3 h-6 w-16 rounded-full md:mt-0" />
      <Skeleton className="mt-3 h-7 w-16 rounded-full md:mt-0" />
      <Skeleton className="mt-3 h-4 w-8 md:mt-0" />
      <Skeleton className="mt-3 h-4 w-12 md:mt-0" />
      <Skeleton className="mt-3 h-8 w-8 md:mt-0" />
    </div>
  );
}

function ErrorState({
  message,
  retryLabel,
  onRetry,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#fecaca] bg-[#fff7f5] p-5 sm:flex-row sm:items-center"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#d53411]" />
        <p className="text-sm font-medium text-[#7f1d1d]">{message}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        aria-label={retryLabel}
        onClick={onRetry}
        className="border-[#fecaca] bg-white text-[#7f1d1d] hover:bg-[#fef2f2]"
      >
        Try again
      </Button>
    </div>
  );
}

function metricSentiment(
  trend: number,
  lowerIsBetter: boolean,
): TrendSentiment {
  if (trend === 0) {
    return "neutral";
  }

  return (lowerIsBetter ? trend < 0 : trend > 0)
    ? "improvement"
    : "regression";
}

function trendColor(sentiment: TrendSentiment) {
  if (sentiment === "improvement") {
    return "#12B5B0";
  }
  if (sentiment === "regression") {
    return "#E5484D";
  }
  return "#808081";
}

function rateClasses(rate: number) {
  if (rate < 75) {
    return "border-[#fecaca] bg-[#fef2f2] text-[#b42318]";
  }
  if (rate < 90) {
    return "border-[#fed7aa] bg-[#fff7ed] text-[#b54708]";
  }
  return "border-[#99e0e2] bg-[#edfafa] text-[#007f83]";
}

export default function NetworkComplianceSection() {
  const initialRange = useMemo(defaultDateRange, []);
  const [dateRange, setDateRange] = useState<DateRange>(initialRange);
  const [draftDateRange, setDraftDateRange] =
    useState<DateRange>(initialRange);
  const [showDateModal, setShowDateModal] = useState(false);
  const [mode, setMode] = useState<"all" | ComplianceMode>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] =
    useState<ComplianceSortBy>("complianceRate");
  const [sortOrder, setSortOrder] =
    useState<ComplianceSortOrder>("asc");
  const [page, setPage] = useState(1);
  const [expandedAgencyId, setExpandedAgencyId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const scope = {
    ...dateRange,
    ...(mode === "all" ? {} : { mode }),
  };

  const summaryQuery = useGetNetworkComplianceSummaryQuery(scope);
  const agencyQuery = useGetAgencyComplianceQuery({
    ...scope,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    sortBy,
    sortOrder,
    page,
    limit: PAGE_SIZE,
  });

  const formattedRange = formatRangeParts(dateRange);
  const aggregate = summaryQuery.data?.data.aggregate;
  const summaryTrends = summaryQuery.data?.data.trends;
  const summaryCards = useMemo(() => {
    if (!aggregate) {
      return [];
    }

    const fallbackMetric = (value: number): ComplianceTrendMetric => ({
      trend: 0,
      sparkline: [{ value }, { value }],
    });
    const makeCard = (
      key: keyof ComplianceTrends,
      label: string,
      value: number,
      formattedValue: string,
      helper: string,
      lowerIsBetter = false,
    ) => {
      const metric = summaryTrends?.[key] ?? fallbackMetric(value);
      const sentiment = metricSentiment(metric.trend, lowerIsBetter);
      return {
        key,
        label,
        value: formattedValue,
        helper,
        metric,
        sentiment,
      };
    };

    return [
      makeCard(
        "complianceRate",
        "Compliance rate",
        aggregate.complianceRate,
        aggregate.complianceRate + "%",
        aggregate.nonCompliantPeople +
          " of " +
          aggregate.populationTotal +
          " people have an issue",
      ),
      makeCard(
        "totalIssues",
        "Total issues",
        aggregate.totalIssues,
        String(aggregate.totalIssues),
        "Issues found in the selected period",
        true,
      ),
      makeCard(
        "agenciesWithIssues",
        "Agencies with issues",
        aggregate.agenciesWithIssues,
        String(aggregate.agenciesWithIssues),
        "Active agencies requiring attention",
        true,
      ),
      makeCard(
        "populationTotal",
        "Measured population",
        aggregate.populationTotal,
        String(aggregate.populationTotal),
        "Staff and clients included",
      ),
    ];
  }, [aggregate, summaryTrends]);
  const agencies = agencyQuery.data?.data ?? [];
  const pagination = agencyQuery.data?.pagination;
  const summaryLoading =
    summaryQuery.isLoading ||
    (summaryQuery.isFetching && !summaryQuery.data);
  const agenciesLoading =
    agencyQuery.isLoading || (agencyQuery.isFetching && !agencyQuery.data);

  const updateSort = (value: string) => {
    const [nextSortBy, nextSortOrder] = value.split(":") as [
      ComplianceSortBy,
      ComplianceSortOrder,
    ];
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    setPage(1);
  };

  return (
    <section
      aria-labelledby="network-compliance-title"
      className="mt-8 min-w-0 space-y-6 font-['Urbanist']"
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#00b4b8]">
            Active agencies
          </p>
          <h2
            id="network-compliance-title"
            className="mt-1 text-[30px] font-bold leading-tight text-[#10141a]"
          >
            Network compliance
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
            A population-weighted view of staff and client compliance across
            the agency network.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-[#E8ECEF] bg-white p-3 shadow-sm sm:flex-row">
          <Button
            type="button"
            aria-label={`${formattedRange.start} to ${formattedRange.end}`}
            variant="outline"
            onClick={() => {
              setDraftDateRange(dateRange);
              setShowDateModal(true);
            }}
            className="justify-start border-[#E6EAEC] bg-white text-[#10141a]"
          >
            <CalendarDays className="h-4 w-4 text-[#00b4b8]" />
            <span className="inline-flex items-center gap-1.5">
              <span>{formattedRange.start}</span>
              <span className="sr-only">to</span>
              <ArrowRight
                aria-hidden="true"
                className="h-3.5 w-3.5 text-[#808081]"
              />
              <span>{formattedRange.end}</span>
            </span>
          </Button>

          <Select
            value={mode}
            onValueChange={(value) => {
              setMode(value as "all" | ComplianceMode);
              setPage(1);
            }}
          >
            <SelectTrigger
              aria-label="Filter by program"
              className="w-full border-[#E6EAEC] bg-white sm:w-[170px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All programs</SelectItem>
              <SelectItem value="hha">HHA</SelectItem>
              <SelectItem value="ddd">DDD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {summaryLoading ? (
        <SummaryLoading />
      ) : summaryQuery.isError ? (
        <ErrorState
          message="We couldn't load the network compliance summary. Try again."
          retryLabel="Retry network summary"
          onRetry={() => void summaryQuery.refetch()}
        />
      ) : aggregate ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <AnalyticsMetricCard
                key={card.key}
                value={card.value}
                label={card.label}
                trend={card.metric.trend}
                sentiment={card.sentiment}
                helper={card.helper}
                graph={
                  <ComparisonSparkline
                    data={card.metric.sparkline}
                    color={trendColor(card.sentiment)}
                  />
                }
              />
            ))}
          </div>

          <div className="rounded-[32px] border border-[#E8ECEF] bg-white/40 p-6">
            <div className="mb-5">
              <h3 className="text-[22px] font-bold text-[#10141a]">
                Compliance insights
              </h3>
              <p className="mt-1 text-sm text-[#6b7280]">
                Issue distribution across the selected network scope
              </p>
            </div>
            {aggregate.populationTotal === 0 ? (
              <p className="rounded-2xl bg-[#f5f7f8] p-5 text-sm text-[#6b7280]">
                No measured staff or clients in this scope.
              </p>
            ) : aggregate.totalIssues === 0 ? (
              <p className="rounded-2xl border border-[#a7e8d0] bg-[#effbf7] p-5 text-sm font-medium text-[#136c52]">
                No compliance issues found for this scope.
              </p>
            ) : (
              <ComplianceBreakdownChart
                total={aggregate.totalIssues}
                data={aggregate.breakdown}
                mode={mode === "all" ? undefined : mode}
              />
            )}
          </div>
        </>
      ) : null}

      <div className="min-w-0 overflow-hidden rounded-xl bg-white shadow-sm sm:rounded-2xl">
        <div className="border-b border-[#e5e5e6] p-4 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h3 className="text-[22px] font-bold text-[#10141a]">
                Compliance by agency
              </h3>
              <p className="mt-1 text-sm text-[#6b7280]">
                Agencies below 100% compliance, ordered by the attention they
                need.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative block">
                <span className="sr-only">Search agencies needing attention</span>
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#808081]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search agencies"
                  className="h-9 w-full rounded-full border-[#cccccd] pl-9 sm:w-[230px]"
                />
              </label>

              <Select
                value={sortBy + ":" + sortOrder}
                onValueChange={updateSort}
              >
                <SelectTrigger
                  aria-label="Sort agencies"
                  size="sm"
                  className="w-full rounded-full border-[#cccccd] bg-white sm:w-[215px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complianceRate:asc">
                    Compliance: lowest first
                  </SelectItem>
                  <SelectItem value="complianceRate:desc">
                    Compliance: highest first
                  </SelectItem>
                  <SelectItem value="totalIssues:desc">
                    Issues: most first
                  </SelectItem>
                  <SelectItem value="agencyName:asc">
                    Agency name: A to Z
                  </SelectItem>
                  <SelectItem value="populationTotal:desc">
                    Population: largest first
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {pagination && !agenciesLoading && !agencyQuery.isError && (
            <p className="mt-4 text-xs font-medium text-[#808081]">
              {pagination.total}{" "}
              {pagination.total === 1 ? "agency" : "agencies"} requiring
              attention
            </p>
          )}
        </div>

        <div
          className={
            "hidden grid-cols-1 bg-[#f9fafb] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#808081] md:grid " +
            AGENCY_GRID
          }
        >
          <span>Agency</span>
          <span>Programs</span>
          <span>Compliance</span>
          <span>Issues</span>
          <span>Population</span>
          <span className="sr-only">Actions</span>
        </div>

        {agenciesLoading ? (
          <div aria-label="Loading agency compliance results">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <AgencySkeletonRow key={item} />
            ))}
          </div>
        ) : agencyQuery.isError ? (
          <div className="p-5">
            <ErrorState
              message="We couldn't load agency compliance results. Try again."
              retryLabel="Retry agency results"
              onRetry={() => void agencyQuery.refetch()}
            />
          </div>
        ) : agencies.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-12 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#edfafa]">
              <Building2 className="h-5 w-5 text-[#00b4b8]" />
            </span>
            <p className="mt-4 text-sm font-semibold text-[#10141a]">
              {debouncedSearch
                ? "No agencies match your search."
                : "Every agency in this scope is fully compliant."}
            </p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-[#808081]">
              Only agencies below 100% compliance appear in this table.
            </p>
          </div>
        ) : (
          <div>
            {agencies.map((agency) => {
              const isExpanded = expandedAgencyId === agency.agencyId;
              return (
                <AgencyRows
                  key={agency.agencyId}
                  agency={agency}
                  isExpanded={isExpanded}
                  onToggle={() =>
                    setExpandedAgencyId(
                      isExpanded ? null : agency.agencyId,
                    )
                  }
                  mode={mode === "all" ? undefined : mode}
                />
              );
            })}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 border-t border-[#e5e5e6] px-4 py-4">
            <p className="text-sm text-[#6b7280]">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Previous agency page"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-full border-[#dfe3e5] bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Next agency page"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-full border-[#dfe3e5] bg-white"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AnalyticsDateRangeModal
        open={showDateModal}
        onClose={() => setShowDateModal(false)}
        values={draftDateRange}
        onChange={setDraftDateRange}
        onApply={(values) => {
          setDateRange(values);
          setPage(1);
        }}
      />
    </section>
  );
}

function AgencyRows({
  agency,
  isExpanded,
  onToggle,
  mode,
}: {
  agency: AgencyComplianceRow;
  isExpanded: boolean;
  onToggle: () => void;
  mode?: ComplianceMode;
}) {
  return (
    <>
      <div
        className={
          "grid grid-cols-1 border-t border-[#e5e5e6] px-4 py-4 transition-colors first:border-t-0 md:items-center " +
          AGENCY_GRID +
          (isExpanded ? " bg-[#f4fbfb]" : " hover:bg-[#fbfcfc]")
        }
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#10141a]">
            {agency.agencyName}
          </p>
          <p className="mt-1 text-xs text-[#808081] md:hidden">
            Agency requiring attention
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 md:mt-0">
          <span className="mr-1 text-[11px] font-semibold uppercase text-[#808081] md:hidden">
            Programs
          </span>
          {agency.programs.length ? (
            agency.programs.map((program) => (
              <span
                key={program}
                className="rounded-full border border-[#dfe3e5] bg-[#f7f8f8] px-2.5 py-1 text-[11px] font-semibold text-[#4b5563]"
              >
                {formatProgram(program)}
              </span>
            ))
          ) : (
            <span className="text-xs text-[#808081]">Not specified</span>
          )}
        </div>

        <div className="mt-3 md:mt-0">
          <span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">
            Compliance
          </span>
          <span
            className={
              "inline-flex rounded-full border px-3 py-1 text-xs font-bold " +
              rateClasses(agency.complianceRate)
            }
          >
            {agency.complianceRate}%
          </span>
        </div>

        <p className="mt-3 text-sm font-semibold text-[#10141a] md:mt-0">
          <span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">
            Issues
          </span>
          {agency.totalIssues}
        </p>

        <p className="mt-3 text-sm text-[#10141a] md:mt-0">
          <span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">
            Population
          </span>
          {agency.populationTotal}
        </p>

        <div className="mt-3 flex justify-end md:mt-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={"Agency actions for " + agency.agencyName}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-white transition-colors hover:bg-[#e5e5e6] active:bg-[#e5e5e6]"
              >
                <DotGridIcon />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="z-[100] min-w-[190px] rounded-xl border-0 bg-white p-0 shadow-lg"
            >
              <DropdownMenuItem
                className={menuItemClassName}
                onClick={onToggle}
              >
                <Eye className="mr-2 h-3.5 w-3.5" />
                {isExpanded ? "Hide breakdown" : "View breakdown"}
              </DropdownMenuItem>
              <DropdownMenuItem asChild className={menuItemClassName}>
                <Link to={monitorUrl(agency)}>
                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  Open compliance monitor
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-[#dceced] bg-[#f7fbfb] px-4 py-5 sm:px-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#00a3a7]">
                {agency.agencyName}
              </p>
              <h4 className="mt-1 text-lg font-bold text-[#10141a]">
                Agency issue breakdown
              </h4>
              <p className="mt-1 text-sm text-[#6b7280]">
                {agency.nonCompliantPeople} of {agency.populationTotal} people
                have at least one issue.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="border-[#99e0e2] bg-white text-[#007f83] hover:bg-[#edfafa]"
            >
              <Link
                to={monitorUrl(agency)}
                aria-label={
                  "Open " + agency.agencyName + " in compliance monitor"
                }
              >
                Open compliance monitor
              </Link>
            </Button>
          </div>

          {agency.totalIssues === 0 ? (
            <p className="rounded-2xl border border-[#a7e8d0] bg-[#effbf7] p-4 text-sm font-medium text-[#136c52]">
              No compliance issues found for this agency.
            </p>
          ) : (
            <ComplianceBreakdownChart
              total={agency.totalIssues}
              data={agency.breakdown}
              mode={mode}
            />
          )}
        </div>
      )}
    </>
  );
}
