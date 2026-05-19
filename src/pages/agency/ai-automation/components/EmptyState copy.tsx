import { ArrowRight, CalendarDays, CreditCard, Clock, Plus, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

const QUICK_ACTIONS = [
  {
    title: "Find shift coverage",
    description: "Quickly fill open shifts with the best available staff.",
    actionLabel: "Find now",
    icon: <CalendarDays className="w-5 h-5 text-[#00b4b8]" />,
    payload: "Find shift coverage",
  },
  {
    title: "Check compliance risks",
    description: "See expiring items, missing documents, and potential issues.",
    actionLabel: "View risks",
    icon: <ShieldCheck className="w-5 h-5 text-[#00b4b8]" />,
    payload: "Check compliance risks",
  },
  {
    title: "Review billing issues",
    description: "Identify overdue invoices, anomalies, and errors.",
    actionLabel: "Review now",
    icon: <CreditCard className="w-5 h-5 text-[#00b4b8]" />,
    payload: "Review billing issues",
  },
];

interface EmptyStateProps {
  onQuickAction: (text: string) => void;
}

export default function EmptyState({ onQuickAction }: EmptyStateProps) {
  return (
    <div className="flex min-h-[320px] sm:min-h-[420px] flex-col items-center justify-center gap-4 sm:gap-6 rounded-[20px] sm:rounded-[28px] md:rounded-[32px] border border-dashed border-[#d1d5db] bg-[#f8fafb] px-4 py-6 sm:px-6 sm:py-10 text-center">
      <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-[18px] sm:rounded-[24px] bg-[#e0f7f7] flex-shrink-0">
        <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-[#00b4b8]" />
      </div>
      <div className="max-w-xl">
        <h2 className="text-[18px] sm:text-[22px] font-semibold text-[#10141a] leading-tight">
          What can I help you with?
        </h2>
        <p className="mt-2 sm:mt-3 text-[13px] sm:text-[14px] leading-6 sm:leading-7 text-[#6b7280]">
          Ask me anything about shifts, DSPs, clients, incidents, billing, and more.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {/* {QUICK_ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => onQuickAction(action)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e7eb] bg-white px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] text-[#374151] hover:border-[#00b4b8] hover:text-[#00b4b8] transition"
          >
            <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#00b4b8]" />
            {action} */}
          {/* </button> */}
        {/* ))} */}
      </div>
    </div>
  );
}
