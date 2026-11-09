/**
 * Conversation Header Component
 * Shows conversation participant info and actions
 */

import React, { useMemo } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Conversation } from "@/lib/hooks/useMessaging";
import { OnlineStatusIndicator } from "./OnlineStatusIndicator";
import { formatRoleLabel, getInitials, validateImageUrl } from "@/lib/utils/string-utils";

interface ConversationHeaderProps {
  conversation: Conversation | null;
  currentUserId?: string;
  onDelete?: () => void;
  variant?: "classic" | "panel";
}

export const ConversationHeader = React.memo(function ConversationHeader({
  conversation,
  currentUserId,
  onDelete,
  variant = "classic",
}: ConversationHeaderProps) {
  // Get participant info (not the current user) - memoized
  const participant = useMemo(() => {
    if (!conversation) return null;
    const participants = conversation.participantDetails || conversation.participants || [];
    return participants.find((p) => p.uid !== currentUserId) || participants[0] || null;
  }, [conversation, currentUserId]);

  // Validate and memoize avatar URL
  const validatedAvatar = useMemo(() => {
    return participant ? validateImageUrl(participant.avatar) : null;
  }, [participant?.avatar]);

  if (!conversation || !participant) return null;

  if (variant === "panel") {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10 rounded-full">
              <AvatarImage src={validatedAvatar || undefined} alt="" className="rounded-full object-cover" />
              <AvatarFallback className="rounded-full bg-[#e3f6f6] text-[13px] font-semibold text-[#007679] dark:bg-[#00a3a7]/20 dark:text-[#7fe0e2]">{getInitials(participant.name)}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5"><OnlineStatusIndicator userId={participant.uid} /></div>
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{participant.name}</h3>
            <p className="truncate text-[12px] capitalize text-[#5d6b73] dark:text-[#9aa4a8]">{formatRoleLabel(participant.role)}</p>
          </div>
        </div>
        {onDelete && <DropdownMenu>
          <DropdownMenuTrigger aria-label="Conversation options"
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-[#10141a] hover:bg-[#f3f5f6] focus-visible:outline-2 focus-visible:outline-[#007679] dark:text-[#f4f6f7] dark:hover:bg-white/5">
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onDelete} className="cursor-pointer text-[#b3371c] focus:text-[#b3371c] dark:text-[#f3a08c]">
              <Trash2 className="h-4 w-4" aria-hidden="true" />Delete conversation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#e5e7eb]">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="w-10 h-12 rounded-[8px]">
            <AvatarImage
              src={validatedAvatar || undefined}
              alt={participant.name}
              className="rounded-[8px]"
            />
            <AvatarFallback className="bg-[#00b8d4] text-white text-sm font-semibold rounded-[8px]">
              {getInitials(participant.name)}
            </AvatarFallback>
          </Avatar>
          {/* Online status indicator */}
          <div className="absolute -bottom-0.5 -right-0.5">
            <OnlineStatusIndicator userId={participant.uid} />
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-[15px] text-[#10141a]">{participant.name}</h3>
          <p className="text-[13px] text-[#808081]">{formatRoleLabel(participant.role)}</p>
        </div>
      </div>
      {onDelete && (
        <button
          onClick={onDelete}
          className="p-2 hover:bg-[#fef2f2] rounded-lg transition-colors"
          title="Delete conversation"
        >
          <Trash2 className="w-5 h-5 text-[#ef4444]" />
        </button>
      )}
    </div>
  );
});
