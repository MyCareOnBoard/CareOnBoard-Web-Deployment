import { Clock, Headset, Plus } from "lucide-react";
import { Link } from "react-router";
import { AgencyPageHeader } from "@/components/agency/AgencyShell";
import { AiInsightsIcon } from "@/components/agency/AgencyIcons";
import { agencyOutlineButton, agencyPrimaryButton } from "@/components/agency/AgencyListKit";
import { Routes } from "@/routes/constants";

interface AIAutomationHeaderProps {
  onOpenConversations: () => void;
  onNewConversation: () => void;
  /** Program view the open conversation is pinned to; hidden when agency-wide. */
  conversationMode?: string | null;
}

export default function AIAutomationHeader({
  onOpenConversations,
  onNewConversation,
  conversationMode,
}: AIAutomationHeaderProps) {
  return (
    <AgencyPageHeader
      icon={AiInsightsIcon}
      title={
        <span className="flex flex-wrap items-center gap-3">
          AI automation
          {conversationMode && (
            <span className="inline-flex h-6 items-center rounded-[6px] bg-[#e6f4f4] px-2 text-[12px] font-semibold uppercase tracking-wide text-[#007679] dark:bg-[#12b5b0]/15 dark:text-[#7fd3d3]">
              {conversationMode}
            </span>
          )}
        </span>
      }
      description="Ask about shifts, compliance and billing."
      actions={
        <>
          <Link to={Routes.agency.support} className={agencyOutlineButton}>
            <Headset aria-hidden="true" className="h-4 w-4" />
            Support
          </Link>
          <button type="button" onClick={onOpenConversations} className={agencyOutlineButton}>
            <Clock aria-hidden="true" className="h-4 w-4" />
            History
          </button>
          <button type="button" onClick={onNewConversation} className={agencyPrimaryButton}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            New conversation
          </button>
        </>
      }
    />
  );
}
