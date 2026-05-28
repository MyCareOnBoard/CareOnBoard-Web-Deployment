import { Sparkles } from "lucide-react";

export default function BillingAiInsightsButton() {
  return (
    <button
      type="button"
      className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 self-start rounded-full border border-[#e5e5e6] bg-white px-4 py-2.5 text-[14px] font-medium text-[#10141a] transition-colors hover:bg-[#eef4f5]"
    >
      <Sparkles className="h-4 w-4 text-[#00b4b8]" />
      AI insights
    </button>
  );
}
