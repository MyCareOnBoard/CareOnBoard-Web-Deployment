import { useEffect, useRef, useState } from "react";

import { Sparkles } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { RiskTrendPoint } from "@/lib/api/reports";
import AIInsightsCard, { useScopedAnalyticsInsights } from "./AIInsightsCard";

interface RiskTrendsProps {
  data?: RiskTrendPoint[];
  isLoading?: boolean;
  startDate?: string;
  endDate?: string;
  scopeKey?: string;
  mode?: string;
}

export default function RiskTrends({
  data,
  isLoading,
  startDate,
  endDate,
  mode,
  scopeKey,
}: RiskTrendsProps) {
  const [showInsights, setShowInsights] = useState(false);
  const insightsBtnRef = useRef<HTMLDivElement>(null);
  const { fetchInsights, insightsData, insightsLoading, insightsDisabled } =
    useScopedAnalyticsInsights({ startDate, endDate, mode, scopeKey });

  useEffect(() => {
    if (!showInsights) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        insightsBtnRef.current &&
        !insightsBtnRef.current.contains(e.target as Node)
      ) {
        setShowInsights(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showInsights]);

  useEffect(() => {
    setShowInsights(false);
  }, [startDate, endDate, mode, scopeKey]);

  const handleInsightsClick = () => {
    if (!showInsights) fetchInsights();
    setShowInsights((p) => !p);
  };

  if (isLoading) {
    return (
      <div className="rounded-[32px] border border-[#E6EAEC] bg-[#FFFFFF66] p-6 animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-6 w-32 rounded bg-gray-100" />
            <div className="h-4 w-24 rounded bg-gray-100" />
          </div>
          <div className="h-10 w-28 rounded-full bg-gray-100" />
        </div>
        <div className="flex gap-6 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-36 rounded bg-gray-100" />
          ))}
        </div>
        <div className="h-[320px] w-full rounded-2xl bg-gray-100" />
      </div>
    );
  }
  const series = [
    { key: "expired", label: "Expired Certification", color: "#E5390A" },
    { key: "overtime", label: "Overtime risk", color: "#FF7A00" },
    { key: "missing", label: "Missing document", color: "#3B82F6" },
    { key: "unsignedForm485", label: "Unsigned Form 485", color: "#8B5CF6" },
  ].filter(
    (item) =>
      data?.some(
        (row) => typeof row[item.key as keyof RiskTrendPoint] === "number",
      ) &&
      (item.key !== "unsignedForm485" || mode !== "ddd"),
  );
  if (!data || !series.length)
    return (
      <div
        role="status"
        className="rounded-[32px] border border-[#E6EAEC] bg-[#FFFFFF66] p-6"
      >
        <h4 className="text-[20px] font-semibold">Risk trends</h4>
        <p>{data ? "No permitted trend data" : "Unavailable"}</p>
      </div>
    );
  return (
    <div
      className="
        rounded-[32px]
        border border-[#E6EAEC]
        bg-[#FFFFFF66]
        p-6
      "
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-[20px] font-semibold text-[#111827]">
            Risk trends
          </h4>

          <p className="mt-1 text-[16px] text-[#6B7280]">
            Selected risk indicators over time; categories may overlap.
          </p>
        </div>

        <div ref={insightsBtnRef} className="relative">
          <button
            disabled={insightsDisabled}
            onClick={handleInsightsClick}
            className="
              inline-flex items-center gap-2
              rounded-full bg-white
              px-5 py-3
              text-[15px] font-medium
              shadow-sm
            "
          >
            <Sparkles className="h-4 w-4 text-[#12B5B0]" />
            AI insights
          </button>
          {showInsights && (
            <AIInsightsCard
              limitedCoverage
              isLoading={insightsLoading}
              insight={insightsData?.risk?.insight ?? ""}
              recommendation={insightsData?.risk?.recommendation ?? ""}
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-6 mb-8">
        {series.map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            <div
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[14px] text-[#111827]">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Graph */}
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="#E5E7EB"
              strokeDasharray="0"
            />

            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#6B7280", fontSize: 14 }}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#6B7280", fontSize: 14 }}
            />

            <Tooltip
              contentStyle={{
                borderRadius: "16px",
                border: "1px solid #E5E7EB",
                background: "#fff",
              }}
            />

            {series.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={item.color}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
