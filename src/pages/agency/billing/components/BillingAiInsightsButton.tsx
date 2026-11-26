import { AiInsightsIcon } from "@/components/agency/AgencyIcons";

export default function BillingAiInsightsButton() {
  return (
    <button
      type="button"
      className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-[8px] border border-[#cfe9e8] bg-white px-2.5 text-[13px] font-medium text-[#005c5e] transition-colors hover:bg-[#eef8f8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:border-white/15 dark:bg-transparent dark:text-[#7fd3d3] dark:hover:bg-white/5"
    >
      <AiInsightsIcon aria-hidden="true" className="h-[18px] w-[18px]" />
      AI insights
    </button>
  );
}
