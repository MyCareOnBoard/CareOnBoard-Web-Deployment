import React from 'react';
import { BarChart2, Loader2, Sparkles } from 'lucide-react';

interface AIInsightsCardProps {
  insight: string;
  recommendation: string;
  isLoading?: boolean;
}

const AIInsightsCard: React.FC<AIInsightsCardProps> = ({ insight, recommendation, isLoading }) => {
  if (isLoading) {
    return (
      <div className="absolute right-0 top-full mt-2 z-30 w-[300px] rounded-2xl border border-[#E8ECEF] bg-white p-6 shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex items-center justify-center gap-2 text-[#12B5B0]">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-[13px] font-medium">Generating insights…</span>
      </div>
    );
  }

  return (
    <div className="absolute right-0 top-full mt-2 z-30 w-[300px] rounded-2xl border border-[#E8ECEF] bg-white p-3 shadow-[0_8px_32px_rgba(0,0,0,0.1)] space-y-2">
      {/* AI insights */}
      <div className="rounded-xl bg-[#E6F5F5] p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-[#12B5B0]" />
          <span className="text-[13px] font-semibold text-[#12B5B0]">AI insights</span>
        </div>
        <p className="text-[14px] leading-snug text-[#111827]">{insight}</p>
      </div>

      {/* Recommendations */}
      <div className="rounded-xl bg-[#EEEEF6] p-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart2 className="h-4 w-4 text-[#12B5B0]" />
          <span className="text-[13px] font-semibold text-[#12B5B0]">Recommendations</span>
        </div>
        <p className="text-[14px] leading-snug text-[#111827]">{recommendation}</p>
      </div>
    </div>
  );
};

export default AIInsightsCard;
