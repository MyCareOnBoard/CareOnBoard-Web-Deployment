// AnalyticsPage.tsx

import React from "react";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import OperationReportHeader from "./components/AnalyticsReportHeader";
import AnalyticsDateRangeModal from "./components/AnalyticsDateRangeModal";
import OverviewCards from "./components/OverviewCards";
import ComplianceInsights from "./components/ComplianceInsights";
import RiskTrends from "./components/RiskTrends";
import OperationalEfficiency from "./components/OperationalEfficiency";
import BillingSummary from "./components/BillingSummary";

export default function AnalyticsPage() {
  const [dateRange, setDateRange] =
    React.useState({
      startDate: "",
      endDate: "",
    });

  const [
    showDateModal,
    setShowDateModal,
  ] = React.useState(false);

  // Download analytics report
  const downloadPDF = async () => {
    const element =
      document.getElementById(
        "analytics-report"
      );

    if (!element) {
      return;
    }

    const canvas =
      await html2canvas(element, {
        scale: 2,
        useCORS: true,
      });

    const image =
      canvas.toDataURL(
        "image/png"
      );

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth =
      pdf.internal.pageSize.getWidth();

    const pdfHeight =
      (canvas.height * pdfWidth) /
      canvas.width;

    pdf.addImage(
      image,
      "PNG",
      0,
      0,
      pdfWidth,
      pdfHeight
    );

    pdf.save(
      `analytics-report-${Date.now()}.pdf`
    );
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="no-print">
        <OperationReportHeader
          dateRange={
            dateRange
          }
          onOpenDateModal={() =>
            setShowDateModal(
              true
            )
          }
          onActionSelect={(
            action
          ) => {
            switch (action) {
              case "Download report":
                downloadPDF();
                break;

              case "Share report":
                console.log(
                  "share report"
                );
                break;

              default:
                break;
            }
          }}
        />
      </div>

      {/* Report */}
      <div
        id="analytics-report"
        className="space-y-6  print-container"
      >
        {/* Analytics cards */}
        <div className="print-card">
          <OverviewCards />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="print-card">
            <ComplianceInsights />
          </div>

          <div className="print-card">
            <RiskTrends />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="print-card">
            <OperationalEfficiency />
          </div>

          <div className="print-card">
            <BillingSummary />
          </div>
        </div>
      </div>

      {/* Date modal */}
      <AnalyticsDateRangeModal
        open={showDateModal}
        onClose={() =>
          setShowDateModal(
            false
          )
        }
        values={dateRange}
        onChange={
          setDateRange
        }
        onApply={(values) => {
          setDateRange(
            values
          );

          console.log(
            "refresh analytics",
            values
          );

          // fetch analytics here
        }}
      />
    </div>
  );
}