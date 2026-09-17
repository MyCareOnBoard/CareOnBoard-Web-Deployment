import React, { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import { useAssignmentReviewScope } from "@/hooks/useAssignmentReview";
import { useAuth } from "@/utils/auth";
import { Routes } from "@/routes/constants";
import {
  parsePrintFilters,
  matchesReportScope,
  rateState,
  RATE_HELPER,
  FLAGS_HELPER,
  INDICATORS_HELPER,
} from "./analyticsScope";
import { useGetAnalyticsSummaryQuery } from "@/lib/api/reports";

export default function AnalyticsPrintPage() {
  const [params] = useSearchParams();
  const filters = parsePrintFilters(params);
  const { user } = useAuth();
  const scopeKey = JSON.stringify([
    useAssignmentReviewScope(),
    user?.agencyId || user?.agency?.id,
    user?.agency?.status,
  ]);
  const {
    currentData: res,
    isLoading,
    isFetching,
    isError,
    refetch,
    requestId,
  } = useGetAnalyticsSummaryQuery(
    { ...filters, scopeKey },
    { skip: !filters, refetchOnMountOrArgChange: true },
  );
  const d = res?.success && !isError ? res.data : undefined;
  const matched = !!filters && matchesReportScope(d?.reportScope, filters);
  const rate = d ? rateState(d) : "unavailable";
  const unavailable =
    !!d &&
    (!d.complianceAvailability ||
      rate === "unavailable" ||
      Object.values(d.complianceAvailability).includes("unavailable") ||
      (d.complianceAvailability.flags === "available" &&
        !Number.isFinite(d.overview.totalIssues?.value)) ||
      (d.complianceAvailability.indicators === "available" &&
        !d.complianceInsights));
  const ready =
    !!d && matched && !unavailable && !isLoading && !isFetching && !isError;
  const printKey = JSON.stringify([
    scopeKey,
    params.toString(),
    requestId || d?.reportScope.checkedAt,
  ]);
  const printed = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || printed.current === printKey) return;
    const timer = setTimeout(() => {
      printed.current = printKey;
      window.print();
    }, 300);
    return () => clearTimeout(timer);
  }, [ready, printKey]);
  if (!filters || (!isLoading && !isFetching && d && !matched))
    return (
      <div role="alert" className="p-10">
        <p>
          This report link is incomplete or invalid. Open Analytics and choose
          the reporting dates again.
        </p>
        <Link to={Routes.agency.analytics}>Return to Analytics</Link>
      </div>
    );
  if (isError || (!isLoading && !isFetching && (!d || unavailable)))
    return (
      <div role="alert" className="p-10">
        <p>
          {unavailable
            ? "Some report figures are unavailable. Refresh the report before printing."
            : "Could not load this report. Your reporting dates have been kept."}
        </p>
        <button onClick={() => refetch()}>Retry</button>{" "}
        <Link to={Routes.agency.analytics}>Return to Analytics</Link>
      </div>
    );
  if (!ready || !d)
    return (
      <div
        role="status"
        style={{ fontFamily: "sans-serif", padding: 40, color: "#111" }}
      >
        Loading report…
      </div>
    );

  const {
    overview,
    complianceInsights,
    billingSummary,
    riskTrends,
    operationalEfficiency,
  } = d;

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: 24,
    fontSize: 13,
  };
  const thStyle: React.CSSProperties = {
    borderBottom: "2px solid #000",
    textAlign: "left",
    padding: "6px 8px",
    fontWeight: 700,
  };
  const tdStyle: React.CSSProperties = {
    borderBottom: "1px solid #ccc",
    padding: "5px 8px",
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 8,
    marginTop: 28,
    borderBottom: "1px solid #000",
    paddingBottom: 4,
  };

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 18mm 14mm; }
          .no-print { display: none !important; }
        }
        body { font-family: Arial, sans-serif; color: #111; background: #fff; }
      `}</style>

      {/* Print / close bar — hidden when printing */}
      <div
        className="no-print"
        style={{
          position: "sticky",
          top: 0,
          background: "#f3f4f6",
          borderBottom: "1px solid #d1d5db",
          padding: "10px 24px",
          display: "flex",
          gap: 12,
          alignItems: "center",
          zIndex: 10,
        }}
      >
        <button
          onClick={() => window.print()}
          style={{
            padding: "7px 18px",
            background: "#111827",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Print / Save as PDF
        </button>
        <button
          onClick={() => window.close()}
          style={{
            padding: "7px 18px",
            background: "#fff",
            color: "#111",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Close
        </button>
        <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 8 }}>
          In the print dialog choose <strong>Save as PDF</strong> to download.
        </span>
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          AI Analytics &amp; Operations Report
        </h1>
        <p style={{ color: "#555", fontSize: 12, marginTop: 4 }}>
          Reporting dates: {d.reportScope.startDate} – {d.reportScope.endDate}.
          Program: {d.reportScope.mode?.toUpperCase() || "All programs"}.
          Checked at {d.reportScope.checkedAt}. A later report may differ as
          records change.
        </p>

        {/* Overview */}
        <p style={sectionTitle}>Overview</p>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Metric</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Value</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Trend</th>
            </tr>
          </thead>
          <tbody>
            {[
              ...(rate === "restricted"
                ? []
                : [
                    {
                      label: "No expiry/signature flags",
                      m:
                        rate === "available"
                          ? overview.complianceRate
                          : undefined,
                      fmt: (v: number) => `${v}%`,
                      empty:
                        rate === "empty"
                          ? "No records to assess"
                          : "Unavailable",
                    },
                  ]),
              ...(d.complianceAvailability.flags === "restricted"
                ? []
                : [
                    {
                      label: "Document & incident flags",
                      m: overview.totalIssues,
                      fmt: (v: number) => `${v}`,
                      empty: "Unavailable",
                    },
                  ]),
              {
                label: "Revenue Generated",
                m: overview.revenue,
                empty: "Unavailable",
                fmt: (v: number) =>
                  v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v}`,
              },
              {
                label: "Shifts Billed",
                m: overview.shiftsBilled,
                empty: "Unavailable",
                fmt: (v: number) => `${v}`,
              },
            ].map(({ label, m, fmt, empty }) => (
              <tr key={label}>
                <td style={tdStyle}>{label}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>
                  {m ? fmt(m.value) : empty}
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  {typeof m?.trend === "number" && Number.isFinite(m.trend)
                    ? `${m.trend >= 0 ? "+" : ""}${m.trend}%`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rate !== "restricted" && <p style={{ fontSize: 12 }}>{RATE_HELPER}</p>}
        {d.complianceAvailability.flags !== "restricted" && (
          <p style={{ fontSize: 12 }}>{FLAGS_HELPER}</p>
        )}
        {/* Compliance Insights */}
        {d.complianceAvailability.indicators === "available" &&
          complianceInsights && (
            <>
              <p style={sectionTitle}>Selected risk indicators</p>
              <p style={{ fontSize: 12 }}>{INDICATORS_HELPER}</p>
              <p style={{ fontSize: 13, marginBottom: 8 }}>
                Indicator findings: <strong>{complianceInsights.total}</strong>
              </p>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Category</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {complianceInsights.breakdown.map((row) => (
                    <tr key={row.label}>
                      <td style={tdStyle}>{row.label}</td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          fontWeight: 600,
                        }}
                      >
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        {/* Billing Summary */}
        <p style={sectionTitle}>Billing Summary</p>
        <p style={{ fontSize: 13, marginBottom: 8 }}>
          Total billable shifts: <strong>{billingSummary.total}</strong>
        </p>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Status</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Count</th>
            </tr>
          </thead>
          <tbody>
            {billingSummary.breakdown.map((row) => (
              <tr key={row.label}>
                <td style={tdStyle}>{row.label}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Risk Trends */}
        <p style={sectionTitle}>Risk Trends</p>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Month</th>
              {(["expired", "overtime", "missing", "unsignedForm485"] as const)
                .filter((key) =>
                  riskTrends.some((row) => typeof row[key] === "number"),
                )
                .map((key) => (
                  <th key={key} style={{ ...thStyle, textAlign: "right" }}>
                    {
                      {
                        expired: "Expired Certification",
                        overtime: "Overtime risk",
                        missing: "Missing document",
                        unsignedForm485: "Unsigned Form 485",
                      }[key]
                    }
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {riskTrends.map((row) => (
              <tr key={row.month}>
                <td style={tdStyle}>{row.month}</td>
                {(
                  ["expired", "overtime", "missing", "unsignedForm485"] as const
                )
                  .filter((key) =>
                    riskTrends.some((point) => typeof point[key] === "number"),
                  )
                  .map((key) => (
                    <td key={key} style={{ ...tdStyle, textAlign: "right" }}>
                      {row[key] ?? "—"}
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Operational Efficiency */}
        <p style={sectionTitle}>Operational Efficiency</p>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Metric</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Value</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Trend</th>
            </tr>
          </thead>
          <tbody>
            {[
              {
                label: "Shift Completion Rate",
                m: operationalEfficiency.completionRate,
              },
              {
                label: "On-time Start Rate",
                m: operationalEfficiency.onTimeRate,
              },
              {
                label: "Manual Interventions",
                m: operationalEfficiency.manualRate,
              },
            ].map(({ label, m }) => (
              <tr key={label}>
                <td style={tdStyle}>{label}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>
                  {m.value}
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  {m.trend >= 0 ? "+" : ""}
                  {m.trend}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
