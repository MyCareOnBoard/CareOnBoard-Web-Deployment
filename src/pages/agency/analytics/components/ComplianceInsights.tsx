import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

import ComplianceBreakdownChart, {
  type ComplianceBreakdownItem,
} from "@/components/compliance/ComplianceBreakdownChart";
import type { MetricAvailability } from "@/lib/api/reports";
import { INDICATORS_HELPER } from "../analyticsScope";
import AIInsightsCard, { useScopedAnalyticsInsights } from "./AIInsightsCard";

export type ComplianceSegment = ComplianceBreakdownItem;

interface ComplianceInsightsProps {
  total?: number;
  availability?: MetricAvailability;
  data?: ComplianceSegment[];
  isLoading?: boolean;
  startDate?: string;
  endDate?: string;
  scopeKey?: string;
  mode?: string;
}

export default function ComplianceInsights({
  total,
  data,
  availability,
  isLoading,
  startDate,
  endDate,
  scopeKey,
  mode,
}: ComplianceInsightsProps) {
  const { fetchInsights, insightsData, insightsLoading, insightsDisabled } =
    useScopedAnalyticsInsights({ startDate, endDate, mode, scopeKey });
  const [showInsights, setShowInsights] = useState(false);
  const insightsBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showInsights) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        insightsBtnRef.current &&
        !insightsBtnRef.current.contains(event.target as Node)
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
    if (!showInsights) {
      fetchInsights();
    }
    setShowInsights((isVisible) => !isVisible);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-[32px] border border-[#E8ECEF] bg-[#FFFFFF66] p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-6 w-40 rounded bg-gray-100" />
          <div className="h-10 w-28 rounded-full bg-gray-100" />
        </div>
        <div className="flex flex-col items-center gap-6">
          <div className="h-[190px] w-[190px] rounded-full bg-gray-100" />
          <div className="w-full space-y-3">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-center justify-between">
                <div className="h-4 w-40 rounded bg-gray-100" />
                <div className="h-4 w-10 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (availability === "restricted") return null;
  if (availability !== "available" || !data || !Number.isFinite(total))
    return (
      <div
        role="status"
        className="rounded-[32px] border border-[#E8ECEF] bg-[#FFFFFF66] p-6"
      >
        <h3 className="text-[22px] font-semibold">Selected risk indicators</h3>
        <p>Unavailable</p>
      </div>
    );
  return (
    <div className="rounded-[32px] border border-[#E8ECEF] bg-[#FFFFFF66] p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[22px] font-semibold text-[#111827]">
            Selected risk indicators
          </h3>
          <p className="mt-2 text-[15px] text-[#6B7280]">{INDICATORS_HELPER}</p>
        </div>

        <div ref={insightsBtnRef} className="relative">
          <button
            disabled={insightsDisabled}
            type="button"
            aria-expanded={showInsights}
            onClick={handleInsightsClick}
            className="inline-flex items-center gap-2 rounded-full border border-[#EEF2F4] bg-white px-4 py-3 text-[15px] font-medium text-[#111827] transition-colors hover:bg-[#F9FAFB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#12B5B0]/25"
          >
            <Sparkles className="h-4 w-4 text-[#12B5B0]" />
            AI insights
          </button>
          {showInsights && (
            <AIInsightsCard
              limitedCoverage
              isLoading={insightsLoading}
              insight={insightsData?.compliance?.insight ?? ""}
              recommendation={insightsData?.compliance?.recommendation ?? ""}
            />
          )}
        </div>
      </div>

      <ComplianceBreakdownChart
        total={total!}
        totalLabel="Indicator findings"
        findingNoun="finding"
        data={data}
        mode={mode}
      />
    </div>
  );
}
