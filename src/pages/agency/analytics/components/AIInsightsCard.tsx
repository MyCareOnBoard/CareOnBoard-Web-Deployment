import React from "react";
import {
  useLazyGetAnalyticsInsightsQuery,
  type AnalyticsFilters,
} from "@/lib/api/reports";
import { matchesReportScope, parsePrintFilters } from "../analyticsScope";

export function useScopedAnalyticsInsights(filters: AnalyticsFilters) {
  const [fetch, result] = useLazyGetAnalyticsInsightsQuery();
  const { currentData, originalArgs, isError, isFetching } = result;
  const enabled =
    !!filters.startDate &&
    !!filters.endDate &&
    parsePrintFilters(
      new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        ...(filters.mode ? { mode: filters.mode } : {}),
      }),
    ) !== null;
  const matching =
    originalArgs?.scopeKey === filters.scopeKey &&
    originalArgs?.mode === filters.mode &&
    originalArgs?.startDate === filters.startDate &&
    originalArgs?.endDate === filters.endDate;
  const data =
    enabled &&
    matching &&
    !isError &&
    !isFetching &&
    currentData?.success &&
    matchesReportScope(currentData.reportScope, filters)
      ? currentData.data
      : undefined;
  return {
    fetchInsights: () => (enabled ? fetch(filters) : undefined),
    insightsDisabled: !enabled,
    insightsData: data,
    insightsLoading: isFetching,
  };
}

import { BarChart2, Loader2, Sparkles } from "lucide-react";

interface AIInsightsCardProps {
  insight: string;
  recommendation: string;
  isLoading?: boolean;
  limitedCoverage?: boolean;
}

const AIInsightsCard: React.FC<AIInsightsCardProps> = ({
  insight,
  recommendation,
  isLoading,
  limitedCoverage,
}) => {
  if (isLoading) {
    return (
      <div className="absolute right-0 top-full mt-2 z-30 w-[300px] rounded-2xl border border-[#E8ECEF] bg-white p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex items-center justify-center gap-2 text-[#12B5B0]">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-[13px] font-medium">Generating insights…</span>
      </div>
    );
  }

  if (!insight && !recommendation)
    return (
      <div
        role="status"
        className="absolute right-0 top-full mt-2 z-30 w-[300px] rounded-2xl border border-[#E8ECEF] bg-white p-4 shadow-lg"
      >
        Insights unavailable. Try again.
      </div>
    );

  return (
    <div className="absolute right-0 top-full mt-2 z-30 w-[300px] rounded-2xl border border-[#E8ECEF] bg-white p-3 shadow-[0_8px_32px_rgba(0,0,0,0.1)] space-y-2">
      {limitedCoverage && (
        <p className="text-xs text-[#6B7280]">
          Selected risk indicators only. Categories may overlap; this is not an
          overall compliance assessment.
        </p>
      )}
      {/* AI insights */}
      <div className="rounded-xl bg-[#E6F5F5] p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-[#12B5B0]" />
          <span className="text-[13px] font-semibold text-[#12B5B0]">
            AI insights
          </span>
        </div>
        <p className="text-[14px] leading-snug text-[#111827]">{insight}</p>
      </div>

      {/* Recommendations */}
      <div className="rounded-xl bg-[#EEEEF6] p-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart2 className="h-4 w-4 text-[#12B5B0]" />
          <span className="text-[13px] font-semibold text-[#12B5B0]">
            Recommendations
          </span>
        </div>
        <p className="text-[14px] leading-snug text-[#111827]">
          {recommendation}
        </p>
      </div>
    </div>
  );
};

export default AIInsightsCard;
