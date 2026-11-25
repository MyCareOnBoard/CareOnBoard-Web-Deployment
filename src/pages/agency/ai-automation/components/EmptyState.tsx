import { CalendarDays, ChevronRight, CreditCard, FileSpreadsheet, ShieldCheck } from "lucide-react";
import type { ComponentType } from "react";
import { AiInsightsIcon } from "@/components/agency/AgencyIcons";
import { agencyRowLink } from "@/components/agency/AgencyListKit";

const QUICK_ACTIONS: Array<{
  title: string;
  description: string;
  actionLabel: string;
  icon: ComponentType<{ className?: string }>;
  payload: string;
}> = [
  {
    title: "Find shift coverage",
    description: "Quickly fill open shifts with the best available staff.",
    actionLabel: "Find now",
    icon: CalendarDays,
    payload: "Find shift coverage",
  },
  {
    title: "Check compliance risks",
    description: "See expiring items, missing documents, and potential issues.",
    actionLabel: "View risks",
    icon: ShieldCheck,
    payload: "Check compliance risks",
  },
  {
    title: "Agency Compliance Report",
    description: "Generate the MSRT monitoring workbook for a period.",
    actionLabel: "Generate",
    icon: FileSpreadsheet,
    payload: "Generate the Agency Compliance Report for this quarter",
  },
  {
    title: "Review billing issues",
    description: "Identify overdue invoices, anomalies, and errors.",
    actionLabel: "Review now",
    icon: CreditCard,
    payload: "Review billing issues",
  },
];

interface EmptyStateProps {
  userName?: string;
  onOpenConversations: () => void;
  onNewConversation: () => void;
  onAction: (text: string) => void;
  onQuickAction: (text: string) => void;
}

export default function EmptyState({ userName, onQuickAction }: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-[860px] flex-col items-center py-4 text-center sm:py-8">
      <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full bg-[#007679] text-white dark:bg-[#0f7e7d]">
        <AiInsightsIcon className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-[26px] font-medium leading-tight text-[#10141a] sm:text-[30px] dark:text-[#f4f6f7]">
        Good to see you{userName ? `, ${userName}` : ""}
      </h2>
      <p className="mt-1.5 text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">
        What would you like to do today?
      </p>

      <div className="mt-7 w-full">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Quick actions</h3>
          <button type="button" onClick={() => onQuickAction("Show me all quick actions")} className={agencyRowLink}>
            View all
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <ul className="grid grid-cols-1 gap-3 text-left sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACTIONS.map(({ title, description, actionLabel, icon: Icon, payload }) => (
            <li key={title}>
              <button
                type="button"
                onClick={() => onQuickAction(payload)}
                aria-label={`${title}: ${actionLabel}`}
                className="group flex h-full w-full cursor-pointer flex-col rounded-[12px] bg-[#f4f5f6] p-3.5 text-left transition-colors hover:bg-[#eaf4f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:bg-white/5 dark:hover:bg-white/10"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#007679] dark:bg-white/10 dark:text-[#7fd3d3]">
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="mt-3 text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{title}</span>
                <span className="mt-1 flex-1 text-[12px] leading-[18px] text-[#4b535b] dark:text-[#9aa4a8]">{description}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-[#007679] group-hover:underline dark:text-[#7fd3d3]">
                  {actionLabel}
                  <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
