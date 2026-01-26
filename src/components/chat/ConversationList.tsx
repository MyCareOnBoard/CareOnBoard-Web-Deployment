/**
 * Conversation List Component
 * Displays list of conversations with real-time updates
 */

import React, { useMemo, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Conversation } from "@/lib/hooks/useMessaging";
import { format } from "date-fns";
import { getInitials, sanitizeSearchQuery, validateImageUrl } from "@/lib/utils/string-utils";
import { useDebounce } from "@/hooks/useDebounce";
import { useMultiplePresence } from "@/lib/hooks/usePresence";

export interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  loading?: boolean;
  currentUserId?: string;
  filterTab?: "all" | "dsp" | "administration" | "agency";
  onFilterChange?: (tab: "all" | "dsp" | "administration" | "agency") => void;
}

export const ConversationList = React.memo(function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  searchQuery = "",
  onSearchChange,
  loading = false,
  currentUserId,
  filterTab = "all",
  onFilterChange,
}: ConversationListProps) {
  // Debounce search query to avoid filtering on every keystroke
  const sanitizedSearchQuery = useMemo(() => sanitizeSearchQuery(searchQuery), [searchQuery]);
  const debouncedSearchQuery = useDebounce(sanitizedSearchQuery, 300);

  // Get participant info (not the current user) - memoized
  const getParticipantInfo = useCallback((conversation: Conversation) => {
    const participants = conversation.participantDetails || conversation.participants || [];
    return participants.find((p) => p.uid !== currentUserId) || participants[0] || null;
  }, [currentUserId]);

  // Memoize conversations with participant info to avoid repeated calls
  const conversationsWithParticipants = useMemo(() => {
    return conversations.map(conv => ({
      ...conv,
      participant: getParticipantInfo(conv),
    }));
  }, [conversations, getParticipantInfo]);

  // Get all unique participant IDs for presence tracking
  const allParticipantIds = useMemo(() => {
    const ids = new Set<string>();
    conversationsWithParticipants.forEach(({ participant }) => {
      if (participant?.uid) {
        ids.add(participant.uid);
      }
    });
    return Array.from(ids);
  }, [conversationsWithParticipants]);

  // Get presence for all participants
  const { presenceMap } = useMultiplePresence(allParticipantIds);

  // Format time - memoized per conversation (matches Figma: "08.36 AM")
  const formatTime = useCallback((dateString: string | null | undefined): string => {
    if (!dateString) return "";
    try {
      const formatted = format(new Date(dateString), "hh.mm a");
      return formatted;
    } catch {
      return "";
    }
  }, []);

  // Memoize filtered conversations
  const filteredConversations = useMemo(() => {
    return conversationsWithParticipants.filter(({ participant }) => {
      if (!participant) return false;

      // Apply search filter
      if (debouncedSearchQuery) {
        const searchLower = debouncedSearchQuery.toLowerCase();
        return (
          participant.name.toLowerCase().includes(searchLower) ||
          participant.role.toLowerCase().includes(searchLower)
        );
      }

      // Apply tab filter
      if (filterTab !== "all") {
        const roleLower = participant.role.toLowerCase();

        if (filterTab === "dsp" || filterTab === "administration") {
          // For DSP/Administration filter, check if it's NOT agency
          return !roleLower.includes("agency") && !roleLower.includes("admin");
        } else if (filterTab === "agency") {
          return roleLower.includes("agency") || roleLower.includes("admin");
        }
      }

      return true;
    });
  }, [conversationsWithParticipants, debouncedSearchQuery, filterTab]);

  // Get unread count (handle both number and object formats)
  const getUnreadCount = (conversation: Conversation): number => {
    if (typeof conversation.unreadCount === "number") {
      return conversation.unreadCount;
    }
    if (typeof conversation.unreadCount === "object" && currentUserId) {
      return conversation.unreadCount[currentUserId] || 0;
    }
    return 0;
  };

  return (
    <div className="w-full md:w-[380px] border-r border-[#e5e7eb] flex flex-col bg-white">
      {/* Header with Search */}
      <div className="p-6 border-b border-[#e5e7eb]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold text-[#10141a]">Conversations</h2>
        </div>

        {/* Search Input */}
        {onSearchChange && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#808081]" />
            <Input
              type="text"
              placeholder="Search conversations"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-3"
            />
          </div>
        )}

        {/* Filter Tabs */}
        {onFilterChange && (
          <div className="flex gap-2">
            <button
              onClick={() => onFilterChange("all")}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${filterTab === "all"
                  ? "bg-[#2563eb] text-white"
                  : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]"
                }`}
            >
              All
            </button>
            <button
              onClick={() => onFilterChange("dsp")}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${filterTab === "dsp"
                  ? "bg-[#2563eb] text-white"
                  : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]"
                }`}
            >
              DSP
            </button>
            <button
              onClick={() => onFilterChange("administration")}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${filterTab === "administration"
                  ? "bg-[#2563eb] text-white"
                  : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]"
                }`}
            >
              Administration
            </button>
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 rounded-full border-2 border-[#e5e7eb] border-t-[#2563eb] animate-spin mx-auto mb-2"></div>
              <p className="text-[14px] text-[#808081]">Loading conversations...</p>
            </div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12">
            <p className="text-[14px] text-[#808081]">No conversations found</p>
          </div>
        ) : (
          filteredConversations.map((item) => {
            const { participant, ...conversation } = item;
            if (!participant) return null;

            const unreadCount = getUnreadCount(conversation);
            const isSelected = selectedConversationId === conversation.id;

            // Get presence status for online indicator
            const presence = presenceMap[participant.uid];
            const isOnline = presence?.status === "online";
            const validatedAvatar = validateImageUrl(participant.avatar);

            return (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors rounded-[8px] mx-2 my-1 ${isSelected
                    ? "bg-[#e0f7fa]"
                    : "bg-[#f7f7f7] hover:bg-[#f0f0f0]"
                  }`}
              >
                {/* Avatar with Online Status */}
                <div className="relative flex-shrink-0">
                  <Avatar className="w-12 h-14 rounded-[8px]">
                    <AvatarImage
                      src={validatedAvatar || undefined}
                      alt={participant.name}
                      className="rounded-[8px]"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-[#e5e7eb] to-[#d1d5db] text-[#10141a] text-[16px] font-semibold rounded-[8px]">
                      {getInitials(participant.name)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online Status Indicator - small circular dot on top-right */}
                  <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isOnline ? "bg-[#10b981]" : "bg-[#d1d5db]"
                    }`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col relative">
                  <div className="flex items-start justify-between mb-0.5">
                    <h3 className="text-[15px] font-bold text-[#10141a] truncate flex-1">
                      {participant.name}
                    </h3>
                    {conversation.lastMessageAt && (
                      <span className="text-[12px] text-[#a0a0a1] flex-shrink-0 ml-2 font-normal">
                        {formatTime(conversation.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] text-[#808081] font-normal leading-tight">{participant.role}</p>
                    {/* Unread Badge - positioned bottom right, aligned with role */}
                    {unreadCount > 0 && (
                      <div className="flex-shrink-0 w-5 h-5 bg-[#ef4444] rounded-full flex items-center justify-center ml-2">
                        <span className="text-[10px] text-white font-bold">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo
  return (
    prevProps.conversations === nextProps.conversations &&
    prevProps.selectedConversationId === nextProps.selectedConversationId &&
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.loading === nextProps.loading &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.filterTab === nextProps.filterTab
  );
});
