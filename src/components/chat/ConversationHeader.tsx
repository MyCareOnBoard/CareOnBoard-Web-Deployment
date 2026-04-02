/**
 * Conversation Header Component
 * Shows conversation participant info and actions
 */

import React, { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Conversation } from "@/lib/hooks/useMessaging";
import { OnlineStatusIndicator } from "./OnlineStatusIndicator";
import { formatRoleLabel, getInitials, validateImageUrl } from "@/lib/utils/string-utils";

interface ConversationHeaderProps {
  conversation: Conversation | null;
  currentUserId?: string;
  onDelete?: () => void;
}

export const ConversationHeader = React.memo(function ConversationHeader({
  conversation,
  currentUserId,
  onDelete,
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
