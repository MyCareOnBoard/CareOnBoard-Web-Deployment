import { ArrowRight, CalendarDays, CreditCard, ShieldCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

const QUICK_ACTIONS = [
  {
    title: "Find shift coverage",
    description: "Quickly fill open shifts with the best available staff.",
    actionLabel: "Find now",
    icon: <CalendarDays className="w-5 h-5" />,
    payload: "Find shift coverage",
  },
  {
    title: "Check compliance risks",
    description: "See expiring items, missing documents, and potential issues.",
    actionLabel: "View risks",
    icon: <ShieldCheck className="w-5 h-5" />,
    payload: "Check compliance risks",
  },
  {
    title: "Review billing issues",
    description: "Identify overdue invoices, anomalies, and errors.",
    actionLabel: "Review now",
    icon: <CreditCard className="w-5 h-5" />,
    payload: "Review billing issues",
  },
];

interface EmptyStateProps {
  onOpenConversations: () => void;
  onNewConversation: () => void;
  onAction: (text: string) => void;
  onQuickAction: (text: string) => void;
}

function QuickAction({
  title,
  description,
  actionLabel,
  icon,
  payload,
  onQuickAction
}: {
  title: string;
  description: string;
  actionLabel: string;
  icon: ReactNode;
  payload: string;
  onQuickAction: (text: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 md:p-6 flex flex-col justify-between min-h-[180px] sm:min-h-[200px] shadow-[0_10px_30px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_36px_rgba(15,23,42,0.08)] transition">
      <div className="flex items-center justify-between gap-3">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[16px] sm:rounded-2xl bg-[#e0f7f7] grid place-items-center flex-shrink-0">
          {icon}
        </div>
      </div>
      <div className="mt-4 sm:mt-6">
        <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#10141a] mb-2">
          {title}
        </h3>
        <p className="text-[12px] sm:text-[13px] leading-[1.5] sm:leading-6 text-[#6b7280]">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onQuickAction(payload)}
        className="mt-4 sm:mt-6 inline-flex items-center justify-between w-full text-[12px] sm:text-[13px] font-semibold cursor-pointer text-[#00b4b8] hover:text-[#009199] transition"
      >
        {actionLabel}
        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
    </div>
  );
}

export default function EmptyState({
  onOpenConversations, onQuickAction }: EmptyStateProps)
    {
  return (
    <div className="rounded-[20px] sm:rounded-[28px] md:rounded-[32px] bg-[#f2f7f8]">
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="text-center">
                  <p className="text-[12px] sm:text-[14px] md:text-[20px] font-semibold text-[#10141a] leading-tight">
                   Quick Actions
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onQuickAction("Show me all quick actions")}
                  className="self-start mt-2 sm:mt-0 inline-flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] font-semibold text-[#10141a] hover:border-[#00b4b8] hover:text-[#00b4b8] cursor-pointer transition"
                >
                  View all <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              {/* Quick Action Cards */}
              <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3">
                {QUICK_ACTIONS.map((action) => (
                  <QuickAction key={action.title} {...action} onQuickAction={onQuickAction} />
                ))}
              </div>
            </div>
          </div>
  );
}
