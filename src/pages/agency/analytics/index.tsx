import { useAssignmentReviewScope } from "@/hooks/useAssignmentReview";
import { matchesReportScope, printParams } from "./analyticsScope";
import { useAuth } from "@/utils/auth";
import React from "react";

import { BarChart3, CalendarDays, ChevronDown, Download, RefreshCw, Share2 } from "lucide-react";
import { Routes } from "@/routes/constants";

import { AgencyPageHeader } from "@/components/agency/AgencyShell";
import { agencyOutlineButton, agencyPrimaryButton } from "@/components/agency/AgencyListKit";
import AnalyticsDateRangeModal from "./components/AnalyticsDateRangeModal";
import ShareReportModal from "./components/ShareReportModal";
// The report shows the same sections as the agency dashboard, so it uses the dashboard's cards.
import DashboardKpis from "../dashboard/components/DashboardKpis";
import RiskIndicatorsCard from "../dashboard/components/RiskIndicatorsCard";
import RiskTrendsCard from "../dashboard/components/RiskTrendsCard";
import NeedsAttentionCard from "../dashboard/components/NeedsAttentionCard";
import OperationalEfficiencyCard from "../dashboard/components/OperationalEfficiencyCard";
import BillingSummaryCard from "../dashboard/components/BillingSummaryCard";

import { useGetAnalyticsSummaryQuery } from "@/lib/api/reports";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = React.useState({
    startDate: "",
    endDate: "",
  });
  const [showDateModal, setShowDateModal] = React.useState(false);
  const [showShareModal, setShowShareModal] = React.useState(false);
  const mode = useEffectiveAgencyMode();

  const { user } = useAuth();
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const scopeKey = JSON.stringify([
    useAssignmentReviewScope(),
    user?.agencyId || user?.agency?.id,
    user?.agency?.status,
    mode,
  ]);
  const {
    currentData: analyticsResponse,
    isLoading,
    isFetching,
    isError: analyticsError,
    refetch: refreshAnalytics,
  } = useGetAnalyticsSummaryQuery(
    {
      startDate: dateRange.startDate || undefined,
      endDate: dateRange.endDate || undefined,
      mode: mode ?? undefined,
      scopeKey,
    },
    { refetchOnMountOrArgChange: true },
  );

  const summary =
    !analyticsError &&
    analyticsResponse?.success &&
    matchesReportScope(analyticsResponse.data.reportScope, {
      mode: mode ?? undefined,
      startDate: dateRange.startDate || undefined,
      endDate: dateRange.endDate || undefined,
    })
      ? analyticsResponse.data
      : undefined;
  const reportQuery = printParams(summary?.reportScope);
  const reportDisabled = isLoading || isFetching || !summary || !reportQuery;
  const widgetScope = JSON.stringify([
    scopeKey,
    dateRange,
    summary?.reportScope.checkedAt,
    summary?.complianceAvailability,
    summary?.currentRecordSources,
  ]);
  const insightsScope = {
    startDate: summary?.reportScope.startDate,
    endDate: summary?.reportScope.endDate,
    mode: mode ?? undefined,
    scopeKey,
  };
  const shownRange = summary?.reportScope ?? dateRange;
  const checkedAt = summary ? new Date(summary.reportScope.checkedAt) : undefined;

  const downloadPDF = () => {
    if (!reportDisabled && reportQuery)
      window.open(
        `${Routes.agency.analyticsPrint}?${reportQuery}`,
        "_blank",
        "noopener,noreferrer",
      );
  };

  return (
    <div className="min-h-screen pb-4">
      {/* Header */}
      <div className="no-print">
        <AgencyPageHeader
          icon={BarChart3}
          title="Analytics"
          description="AI-assisted operations report. Indicators use the period you pick; current records can differ."
          actions={
            <>
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className={agencyOutlineButton}
              >
                <Share2 aria-hidden="true" className="h-4 w-4" />
                Share report
              </button>
              <button
                type="button"
                disabled={reportDisabled}
                onClick={downloadPDF}
                className={agencyPrimaryButton}
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                Download report
              </button>
            </>
          }
        />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowDateModal(true)}
            className={agencyOutlineButton}
          >
            <CalendarDays aria-hidden="true" className="h-4 w-4 text-[#4b535b] dark:text-[#9aa4a8]" />
            <span className="text-[#4b535b] dark:text-[#9aa4a8]">Period:</span>
            <span>
              {shownRange.startDate && shownRange.endDate
                ? `${shownRange.startDate} - ${shownRange.endDate}`
                : "Select date range"}
            </span>
            <ChevronDown aria-hidden="true" className="h-4 w-4 text-[#4b535b] dark:text-[#9aa4a8]" />
          </button>
          {checkedAt && Number.isFinite(checkedAt.getTime()) && (
            <p className="text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">
              Last updated{" "}
              {checkedAt.toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>
      </div>

      {analyticsError && (
        <div
          role="alert"
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#f5c2c0] bg-[#fdf2f1] px-4 py-3 text-[14px] text-[#8a1c14] dark:border-[#ff6b5e]/30 dark:bg-[#ff6b5e]/10 dark:text-[#ffb4ad]"
        >
          <span>Could not load this report. Your reporting dates have been kept.</span>
          <button
            type="button"
            onClick={() => refreshAnalytics()}
            className="inline-flex cursor-pointer items-center gap-1.5 font-semibold underline underline-offset-4"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}

      {/* Report */}
      <div id="analytics-report" className="print-container mt-5 space-y-5">
        <div className="print-card">
          <DashboardKpis summary={summary} isLoading={isLoading || isFetching} />
        </div>

        {/* Links to the current records behind the indicators (was "Review current records"). */}
        <NeedsAttentionCard
          summary={summary}
          mode={mode}
          agencyId={agencyId}
          scopeKey={scopeKey}
          isLoading={isLoading || isFetching}
          showPatterns
        />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <RiskIndicatorsCard
            key={widgetScope + "compliance"}
            summary={summary}
            isLoading={isLoading || isFetching}
            scope={insightsScope}
            mode={mode ?? undefined}
          />
          <RiskTrendsCard
            key={widgetScope + "risk"}
            data={summary?.riskTrends}
            isLoading={isLoading || isFetching}
            scope={insightsScope}
            mode={mode ?? undefined}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <OperationalEfficiencyCard
            key={widgetScope + "efficiency"}
            data={summary?.operationalEfficiency}
            isLoading={isLoading || isFetching}
            scope={insightsScope}
          />
          <BillingSummaryCard
            key={widgetScope + "billing"}
            data={summary?.billingSummary}
            isLoading={isLoading || isFetching}
            scope={insightsScope}
          />
        </div>
      </div>

      {/* Date modal */}
      <AnalyticsDateRangeModal
        open={showDateModal}
        onClose={() => setShowDateModal(false)}
        values={dateRange}
        onChange={setDateRange}
        onApply={(values) => {
          setDateRange(values);
        }}
      />

      {/* Share modal */}
      <ShareReportModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
}
