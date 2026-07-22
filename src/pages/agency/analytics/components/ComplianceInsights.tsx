import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router";

import ComplianceBreakdownChart, {
  type ComplianceBreakdownItem,
} from "@/components/compliance/ComplianceBreakdownChart";
import { useLazyGetAnalyticsInsightsQuery } from "@/lib/api/reports";
import { Routes } from "@/routes/constants";
import AIInsightsCard from "./AIInsightsCard";

export type ComplianceSegment = ComplianceBreakdownItem;

interface ComplianceInsightsProps {
  total?: number;
  data?: ComplianceSegment[];
  isLoading?: boolean;
  startDate?: string;
  endDate?: string;
  mode?: string;
}

const FALLBACK_DATA: ComplianceSegment[] = [
  {
    label: "Expired Certification",
    value: 4,
    color: "#f33500",
    description: "Staff certifications expired this week",
  },
  {
    label: "Overtime risk",
    value: 2,
    color: "#FF7A00",
    description: "Staff exceeding safe overtime thresholds",
  },
  {
    label: "Missing document",
    value: 1,
    color: "#3B82F6",
    description: "Required compliance documents missing",
  },
  {
    label: "Unsigned Form 485",
    value: 0,
    color: "#8B5CF6",
    description: "HHA clients active on an unsigned Form 485",
  },
  {
    label: "Other",
    value: 0,
    color: "#BDBDBD",
    description: "Additional uncategorized compliance issues",
  },
];

export default function ComplianceInsights({
  total = 6,
  data = FALLBACK_DATA,
  isLoading,
  startDate,
  endDate,
  mode,
}: ComplianceInsightsProps) {
  const [fetchInsights, { data: insightsData, isLoading: insightsLoading }] =
    useLazyGetAnalyticsInsightsQuery();
  const [showInsights, setShowInsights] = useState(false);
  const insightsBtnRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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

  const handleInsightsClick = () => {
    if (!showInsights) {
      fetchInsights({ startDate, endDate, mode });
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

  return (
    <div className="rounded-[32px] border border-[#E8ECEF] bg-[#FFFFFF66] p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[22px] font-semibold text-[#111827]">
            Compliance insights
          </h3>
          <p className="mt-2 text-[15px] text-[#6B7280]">
            Issue distribution
          </p>
        </div>

        <div ref={insightsBtnRef} className="relative">
          <button
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
              isLoading={insightsLoading}
              insight={insightsData?.data.compliance.insight ?? ""}
              recommendation={
                insightsData?.data.compliance.recommendation ?? ""
              }
            />
          )}
        </div>
      </div>

      <ComplianceBreakdownChart
        total={total}
        data={data}
        mode={mode}
        onSegmentClick={() => navigate(Routes.agency.complianceAlerts)}
      />
    </div>
  );
}
