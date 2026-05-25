import { AlertCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RiskItem {
  id: string;
  title: string;
  description: string;
  risk: "high" | "medium" | "low";
  actions?: Array<{
    label: string;
    onClick?: () => void;
  }>;
}

interface RiskSummaryData {
  title?: string;
  subtitle?: string;
  risks: RiskItem[];
  recommendation?: string;
}

function riskBadgeColor(risk: string) {
  const r = risk.toLowerCase();
  if (r === "high") return "bg-red-100 text-red-700 border-red-200";
  if (r === "medium") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
}

export default function RiskSummaryCard({ data }: { data: unknown }) {
  const cardData = data as RiskSummaryData;

  return (
    <div className="rounded-[18px] border border-[#e5e7eb] bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e7eb] bg-[#f9fafb]">
        <AlertCircle className="h-4 w-4 text-[#dc2626]" />
        <span className="text-[13px] font-semibold text-[#10141a]">
          {cardData.title || "Risk Summary"}
        </span>
      </div>

      {/* Subtitle */}
      {cardData.subtitle && (
        <div className="px-4 py-2.5 border-b border-[#f3f4f6] bg-white">
          <p className="text-[12px] text-[#6b7280]">{cardData.subtitle}</p>
        </div>
      )}

      {/* Risk Items */}
      <div className="divide-y divide-[#f3f4f6]">
        {cardData.risks.map((risk, idx) => (
          <div key={risk.id || idx} className="px-4 py-3.5 bg-white hover:bg-[#f9fafb] transition">
            {/* Title and Badge */}
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <p className="text-[13px] font-semibold text-[#10141a]">{risk.title}</p>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize whitespace-nowrap ${riskBadgeColor(risk.risk)}`}
              >
                {risk.risk} risk
              </span>
            </div>
            {/* Description */}
            <p className="text-[12px] text-[#6b7280] mb-2.5">{risk.description}</p>
            {/* Actions */}
            {risk.actions && risk.actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {risk.actions.map((action, actionIdx) => (
                  <button
                    key={actionIdx}
                    onClick={action.onClick}
                    className="inline-flex items-center gap-1 text-[11px] sm:text-[12px] font-medium text-[#00b4b8] hover:text-[#0d9fa7] transition"
                  >
                    {action.label}
                    <ChevronRight className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recommendation */}
      {cardData.recommendation && (
        <div className="px-4 py-3 bg-blue-50 border-t border-[#e5e7eb]">
          <p className="text-[12px] text-blue-900 flex items-start gap-2">
            <span className="mt-0.5">💡</span>
            <span>{cardData.recommendation}</span>
          </p>
        </div>
      )}
    </div>
  );
}
