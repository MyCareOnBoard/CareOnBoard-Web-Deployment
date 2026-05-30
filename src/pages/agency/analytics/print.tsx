import React, { useEffect } from "react";
import { useGetAnalyticsSummaryQuery } from "@/lib/api/reports";

export default function AnalyticsPrintPage() {
  const { data: res, isLoading } = useGetAnalyticsSummaryQuery({});
  const d = res?.data;

  useEffect(() => {
    if (!isLoading && d) {
      // Give the browser a frame to lay out before opening the print dialog
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [isLoading, d]);

  if (isLoading || !d) {
    return (
      <div style={{ fontFamily: "sans-serif", padding: 40, color: "#111" }}>
        Loading report…
      </div>
    );
  }

  const { overview, complianceInsights, billingSummary, riskTrends, operationalEfficiency } = d;

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
          Generated {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}
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
              { label: "Compliance Rate", m: overview.complianceRate, fmt: (v: number) => `${v}%` },
              { label: "Total Issues", m: overview.totalIssues, fmt: (v: number) => `${v}` },
              { label: "Revenue Generated", m: overview.revenue, fmt: (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v}` },
              { label: "Shifts Billed", m: overview.shiftsBilled, fmt: (v: number) => `${v}` },
            ].map(({ label, m, fmt }) => (
              <tr key={label}>
                <td style={tdStyle}>{label}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmt(m.value)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  {m.trend >= 0 ? "+" : ""}{m.trend}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Compliance Insights */}
        <p style={sectionTitle}>Compliance Insights</p>
        <p style={{ fontSize: 13, marginBottom: 8 }}>
          Total issues: <strong>{complianceInsights.total}</strong>
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
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>

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
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{row.value}</td>
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
              <th style={{ ...thStyle, textAlign: "right" }}>Expired Certs</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Overtime Risk</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Missing Docs</th>
            </tr>
          </thead>
          <tbody>
            {riskTrends.map((row) => (
              <tr key={row.month}>
                <td style={tdStyle}>{row.month}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{row.expired}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{row.overtime}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{row.missing}</td>
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
              { label: "Shift Completion Rate", m: operationalEfficiency.completionRate },
              { label: "On-time Start Rate", m: operationalEfficiency.onTimeRate },
              { label: "Manual Interventions", m: operationalEfficiency.manualRate },
            ].map(({ label, m }) => (
              <tr key={label}>
                <td style={tdStyle}>{label}</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{m.value}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  {m.trend >= 0 ? "+" : ""}{m.trend}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}