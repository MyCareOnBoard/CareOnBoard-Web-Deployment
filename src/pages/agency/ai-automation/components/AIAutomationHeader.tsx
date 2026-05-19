import { ArrowRight, CalendarDays, CreditCard, Clock, Plus, ShieldCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SelectAreaDropdown from "./SelectAreaDropdown";
import type { ReactNode } from "react";

interface AIAutomationHeaderProps {
  onOpenConversations: () => void;
  onNewConversation: () => void;
  userName?: string;
  selectedArea: string;
  onSelectArea: (area: string) => void;
}

export default function AIAutomationHeader({
  onOpenConversations,
  onNewConversation,
  userName,
  selectedArea,
  onSelectArea,
}: AIAutomationHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[28px] sm:text-[36px] md:text-[40px] font-bold text-[#10141a] leading-tight">
          AI Automation
        </h1>

        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button
            type="button"
            className="gap-2 rounded-[60px] bg-white border-[#e5e7eb] text-[#374151] hover:border-[#00b4b8] hover:text-white text-[12px] sm:text-[13px] px-3 sm:px-4 py-2"
            onClick={onOpenConversations}
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Conversations</span>
            <span className="sm:hidden">Chats</span>
          </Button>
          <SelectAreaDropdown selected={selectedArea} onSelect={onSelectArea} />
        </div>
      </div>

      <div className="flex-col items-center justify-center">
        <div className="text-center">
          <p className="text-[18px] sm:text-[22px] md:text-[26px] font-semibold text-[#10141a] leading-tight">
            Good to see you{userName ? `, ${userName}` : ""}
          </p>
          <p className="mt-1 text-[13px] sm:text-[14px] text-[#6b7280]">
            What would you like to do today?
          </p>
        </div>
      </div>
    </div>
  );
}
