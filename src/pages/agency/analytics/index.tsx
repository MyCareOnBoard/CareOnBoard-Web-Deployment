import React from "react";

import { Clock3, WandSparkles, UserRoundCog } from "lucide-react";
import { Routes } from "@/routes/constants";

import OperationReportHeader from "./components/AnalyticsReportHeader";
import AnalyticsDateRangeModal from "./components/AnalyticsDateRangeModal";
import ShareReportModal from "./components/ShareReportModal";
import OverviewCards from "./components/OverviewCards";
import ComplianceInsights from "./components/ComplianceInsights";
import RiskTrends from "./components/RiskTrends";
import OperationalEfficiency, { type OperationalMetric } from "./components/OperationalEfficiency";
import BillingSummary from "./components/BillingSummary";

import { useGetAnalyticsSummaryQuery } from "@/lib/api/reports";
import type { AnalyticsSummaryData } from "@/lib/api/reports";

function buildOperationalMetrics(data: AnalyticsSummaryData["operationalEfficiency"]): OperationalMetric[] {
  return [
    {
      id: "completion",
      title: "Shift completion rate",
      value: data.completionRate.value,
      trend: data.completionRate.trend,
      icon: Clock3,
      chartColor: "#12B5B0",
      data: data.completionRate.sparkline,
    },
    {
      id: "ontime",
      title: "On-time start rate",
      value: data.onTimeRate.value,
      trend: data.onTimeRate.trend,
      icon: WandSparkles,
      chartColor: "#12B5B0",
      data: data.onTimeRate.sparkline,
    },
    {
      id: "manual",
      title: "Manual interventions",
      value: data.manualRate.value,
      trend: data.manualRate.trend,
      icon: UserRoundCog,
      chartColor: "#E5484D",
      data: data.manualRate.sparkline,
    },
  ];
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = React.useState({ startDate: "", endDate: "" });
  const [showDateModal, setShowDateModal] = React.useState(false);
  const [showShareModal, setShowShareModal] = React.useState(false);

  const { data: analyticsResponse, isLoading, isFetching } = useGetAnalyticsSummaryQuery(
    {
      startDate: dateRange.startDate || undefined,
      endDate: dateRange.endDate || undefined,
    },
    { refetchOnMountOrArgChange: true }
  );

  const summary = analyticsResponse?.data;

  const downloadPDF = () => {
    window.open(Routes.agency.analyticsPrint, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="no-print">
        <OperationReportHeader
          title="AI Analytics & Operation report"
          dateRange={dateRange}
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

      {/* Report */}
      <div id="analytics-report" className="space-y-6 print-container">
        {/* Overview KPI cards */}
        <div className="print-card">
          <OverviewCards data={summary?.overview} isLoading={isLoading || isFetching} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="print-card">
            <ComplianceInsights
              total={summary?.complianceInsights.total}
              data={summary?.complianceInsights.breakdown}
              isLoading={isLoading || isFetching}
              startDate={dateRange.startDate || undefined}
              endDate={dateRange.endDate || undefined}
            />
          </div>

          <div className="print-card">
            <RiskTrends
              data={summary?.riskTrends}
              isLoading={isLoading || isFetching}
              startDate={dateRange.startDate || undefined}
              endDate={dateRange.endDate || undefined}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="print-card">
            <OperationalEfficiency
              metrics={summary ? buildOperationalMetrics(summary.operationalEfficiency) : undefined}
              isLoading={isLoading || isFetching}
              startDate={dateRange.startDate || undefined}
              endDate={dateRange.endDate || undefined}
            />
          </div>

          <div className="print-card">
            <BillingSummary
              total={summary?.billingSummary.total}
              data={summary?.billingSummary.breakdown}
              isLoading={isLoading || isFetching}
              startDate={dateRange.startDate || undefined}
              endDate={dateRange.endDate || undefined}
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
