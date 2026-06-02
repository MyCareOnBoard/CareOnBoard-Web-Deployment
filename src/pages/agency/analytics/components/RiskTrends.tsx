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
import AIInsightsCard from "./AIInsightsCard";
import { useLazyGetAnalyticsInsightsQuery } from "@/lib/api/reports";

interface RiskTrendsProps {
  data?: RiskTrendPoint[];
  isLoading?: boolean;
  startDate?: string;
  endDate?: string;
}

const FALLBACK_DATA: RiskTrendPoint[] = [
  { month: "Jan", expired: 4, overtime: 7, missing: 0 },
  { month: "Feb", expired: 8, overtime: 12, missing: 4 },
  { month: "Mar", expired: 10, overtime: 13, missing: 9 },
  { month: "Apr", expired: 8, overtime: 12, missing: 10 },
  { month: "May", expired: 6, overtime: 10, missing: 4 },
  { month: "Jun", expired: 6, overtime: 9, missing: 4 },
  { month: "Jul", expired: 8, overtime: 7, missing: 4 },
  { month: "Aug", expired: 10, overtime: 6, missing: 4 },
];

export default function RiskTrends({ data = FALLBACK_DATA, isLoading, startDate, endDate }: RiskTrendsProps) {
  const [showInsights, setShowInsights] = useState(false);
  const insightsBtnRef = useRef<HTMLDivElement>(null);
  const [fetchInsights, { data: insightsData, isLoading: insightsLoading }] = useLazyGetAnalyticsInsightsQuery();

  useEffect(() => {
    if (!showInsights) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (insightsBtnRef.current && !insightsBtnRef.current.contains(e.target as Node)) {
        setShowInsights(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showInsights]);

  const handleInsightsClick = () => {
    if (!showInsights) fetchInsights({ startDate, endDate });
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
          {[1, 2, 3].map((i) => <div key={i} className="h-4 w-36 rounded bg-gray-100" />)}
        </div>
        <div className="h-[320px] w-full rounded-2xl bg-gray-100" />
      </div>
    );
  }
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
            Risk over time
          </p>
        </div>

        <div ref={insightsBtnRef} className="relative">
          <button
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
              isLoading={insightsLoading}
              insight={insightsData?.data.risk.insight ?? ""}
              recommendation={insightsData?.data.risk.recommendation ?? ""}
            />
          )}
        </div>
      </div>

      {/* Legends */}
      <div className="flex flex-wrap gap-6 mb-8">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-[#f33500]" />
          <span className="text-[14px] text-[#111827]">Expired Certification</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-[#FF7A00]" />
          <span className="text-[14px] text-[#111827]">Overtime risk</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-[#3B82F6]" />
          <span className="text-[16px] text-[#111827]">Missing document</span>
        </div>
      </div>

      {/* Graph */}
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="0" />

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

            <Line type="monotone" dataKey="expired" stroke="#E5390A" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="overtime" stroke="#FF7A00" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="missing" stroke="#3B82F6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
