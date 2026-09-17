import { useAssignmentReviewScope } from "@/hooks/useAssignmentReview";
import { matchesReportScope, printParams } from "./analyticsScope";
import CurrentRecordsLinks from "./components/CurrentRecordsLinks";
import { useAuth } from "@/utils/auth";
import React from "react";

import { Clock3, WandSparkles, UserRoundCog } from "lucide-react";
import { Routes } from "@/routes/constants";

import OperationReportHeader from "./components/AnalyticsReportHeader";
import AnalyticsDateRangeModal from "./components/AnalyticsDateRangeModal";
import ShareReportModal from "./components/ShareReportModal";
import OverviewCards from "./components/OverviewCards";
import ComplianceInsights from "./components/ComplianceInsights";
import RiskTrends from "./components/RiskTrends";
import OperationalEfficiency, {
  type OperationalMetric,
} from "./components/OperationalEfficiency";
import BillingSummary from "./components/BillingSummary";

import { useGetAnalyticsSummaryQuery } from "@/lib/api/reports";
import type { AnalyticsSummaryData } from "@/lib/api/reports";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";

function buildOperationalMetrics(
  data: AnalyticsSummaryData["operationalEfficiency"],
): OperationalMetric[] {
  return [
    {
      id: "completion",
      title: "Shift completion rate",
      value: data.completionRate.value,
      path: Routes.agency.shifts,
      trend: data.completionRate.trend,
      icon: Clock3,
      chartColor: "#12B5B0",
      data: data.completionRate.sparkline,
    },
    {
      id: "ontime",
      title: "On-time start rate",
      value: data.onTimeRate.value,
      path: Routes.agency.shifts,
      trend: data.onTimeRate.trend,
      icon: WandSparkles,
      chartColor: "#12B5B0",
      data: data.onTimeRate.sparkline,
    },
    {
      id: "manual",
      title: "Manual interventions",
      value: data.manualRate.value,
      path: Routes.agency.shifts,
      trend: data.manualRate.trend,
      icon: UserRoundCog,
      chartColor: "#E5484D",
      data: data.manualRate.sparkline,
    },
  ];
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = React.useState({
    startDate: "",
    endDate: "",
  });
  const [showDateModal, setShowDateModal] = React.useState(false);
  const [showShareModal, setShowShareModal] = React.useState(false);
  const mode = useEffectiveAgencyMode();

  const { user } = useAuth();
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

  const downloadPDF = () => {
    if (!reportDisabled && reportQuery)
      window.open(
        `${Routes.agency.analyticsPrint}?${reportQuery}`,
        "_blank",
        "noopener,noreferrer",
      );
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="no-print">
        <OperationReportHeader
          reportDisabled={reportDisabled}
          title="AI Analytics & Operation report"
          dateRange={summary?.reportScope ?? dateRange}
          onOpenDateModal={() => setShowDateModal(true)}
          onActionSelect={(action) => {
            switch (action) {
              case "Download report":
                downloadPDF();
                break;
              case "Share report":
                setShowShareModal(true);
                break;
              default:
                break;
            }
          }}
        />
      </div>

      {analyticsError && (
        <div role="alert" className="mb-4">
          Could not load this report. Your reporting dates have been kept.{" "}
          <button onClick={() => refreshAnalytics()}>Retry</button>
        </div>
      )}
      {/* Report */}
      <div id="analytics-report" className="space-y-6 print-container">
        {summary && !reportDisabled && (
          <CurrentRecordsLinks summary={summary} mode={mode} />
        )}
        {/* Overview KPI cards */}
        <div className="print-card">
          <OverviewCards
            availability={summary?.complianceAvailability}
            populationTotal={summary?.populationTotal}
            data={summary?.overview}
            isLoading={isLoading || isFetching}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="print-card">
            <ComplianceInsights
              key={widgetScope + "compliance"}
              scopeKey={scopeKey}
              availability={summary?.complianceAvailability.indicators}
              total={summary?.complianceInsights?.total}
              data={summary?.complianceInsights?.breakdown}
              isLoading={isLoading || isFetching}
              startDate={summary?.reportScope.startDate}
              endDate={summary?.reportScope.endDate}
              mode={mode ?? undefined}
            />
          </div>

          <div className="print-card">
            <RiskTrends
              key={widgetScope + "risk"}
              scopeKey={scopeKey}
              data={summary?.riskTrends}
              isLoading={isLoading || isFetching}
              startDate={summary?.reportScope.startDate}
              endDate={summary?.reportScope.endDate}
              mode={mode ?? undefined}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="print-card">
            <OperationalEfficiency
              key={widgetScope + "efficiency"}
              scopeKey={scopeKey}
              mode={mode ?? undefined}
              metrics={
                summary
                  ? buildOperationalMetrics(summary.operationalEfficiency)
                  : undefined
              }
              isLoading={isLoading || isFetching}
              startDate={summary?.reportScope.startDate}
              endDate={summary?.reportScope.endDate}
            />
          </div>

          <div className="print-card">
            <BillingSummary
              key={widgetScope + "billing"}
              scopeKey={scopeKey}
              mode={mode ?? undefined}
              total={summary?.billingSummary.total}
              data={summary?.billingSummary.breakdown}
              isLoading={isLoading || isFetching}
              startDate={summary?.reportScope.startDate}
              endDate={summary?.reportScope.endDate}
            />
          </div>
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
