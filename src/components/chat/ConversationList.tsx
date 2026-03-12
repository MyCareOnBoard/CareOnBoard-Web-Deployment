/**
 * Conversation List Component
 * Displays list of conversations with real-time updates
 * Supports visual differentiation between one-to-one and group conversations
 */

import React, { useMemo, useCallback } from "react";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Conversation, ConversationParticipant } from "@/lib/hooks/useMessaging";
import { format } from "date-fns";
import { formatRoleLabel, getInitials, sanitizeSearchQuery, validateImageUrl } from "@/lib/utils/string-utils";
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
  filterTab?: "all" | "dsp" | "staff" | "administration" | "agency";
  onFilterChange?: (tab: "all" | "dsp" | "staff" | "administration" | "agency") => void;
  /** Show agency name alongside role (for super admin) */
  showAgencyName?: boolean;
}

/** Helper to check if conversation is a group chat */
const isGroupConversation = (conversation: Conversation): boolean => {
  return conversation.type === "group" || (conversation.participantIds?.length || 0) > 2;
};

/** Classify role as DSP/employee-like (matches backend: DSP, employee) */
const isDspRole = (role: string): boolean => {
  const r = (role || "").toLowerCase();
  return r.includes("dsp") || r === "employee";
};

/** Classify role as staff-like (matches backend: Agency Admin, Agency Staff) */
const isStaffRole = (role: string): boolean => {
  const r = (role || "").toLowerCase();
  return (r.includes("agency") || r.includes("staff")) && !r.includes("super");
};

/** Classify role as administration-like (matches backend: Super Admin only) */
const isAdministrationRole = (role: string): boolean => {
  const r = (role || "").toLowerCase();
  return r.includes("super");
};

/** Helper to get display name for group conversations */
const getGroupDisplayName = (
  participants: ConversationParticipant[],
  conversationName?: string | null,
  maxNames: number = 2
): string => {
  // Use conversation name if available
  if (conversationName) return conversationName;

  // Otherwise, build from participant names
  if (participants.length === 0) return "Group Chat";

  const names = participants.map(p => p.name.split(" ")[0]); // First names only
  if (names.length <= maxNames) {
    return names.join(", ");
  }

  const displayedNames = names.slice(0, maxNames).join(", ");
  const remainingCount = names.length - maxNames;
  return `${displayedNames}, +${remainingCount}`;
};

/** Stacked Avatar Component for group chats */
const StackedAvatars = React.memo(function StackedAvatars({
  participants
}: {
  participants: ConversationParticipant[]
}) {
  // Show up to 3 avatars
  const displayParticipants = participants.slice(0, 3);
  const avatarSize = displayParticipants.length === 1 ? "w-12 h-14" : "w-8 h-8";

  if (displayParticipants.length === 1) {
    const participant = displayParticipants[0];
    const validatedAvatar = validateImageUrl(participant.avatar);
    return (
      <Avatar className={`${avatarSize} rounded-[8px]`}>
        <AvatarImage
          src={validatedAvatar || undefined}
          alt={participant.name}
          className="rounded-[8px]"
        />
        <AvatarFallback className="bg-gradient-to-br from-[#e5e7eb] to-[#d1d5db] text-[#10141a] text-[16px] font-semibold rounded-[8px]">
          {getInitials(participant.name)}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div className="relative w-12 h-14 flex items-center justify-center">
      {displayParticipants.map((participant, index) => {
        const validatedAvatar = validateImageUrl(participant.avatar);
        const offset = index * 10; // Stagger each avatar
        const zIndex = displayParticipants.length - index;

        return (
          <Avatar
            key={participant.uid}
            className={`${avatarSize} rounded-full absolute border-2 border-white`}
            style={{
              left: `${offset}px`,
              zIndex,
            }}
          >
            <AvatarImage
              src={validatedAvatar || undefined}
              alt={participant.name}
              className="rounded-full"
            />
            <AvatarFallback className="bg-gradient-to-br from-[#e5e7eb] to-[#d1d5db] text-[#10141a] text-[11px] font-semibold rounded-full">
              {getInitials(participant.name)}
            </AvatarFallback>
          </Avatar>
        );
      })}
      {/* Group icon badge */}
      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#2563eb] rounded-full flex items-center justify-center border-2 border-white z-10">
        <Users className="w-2.5 h-2.5 text-white" />
      </div>
    </div>
  );
});

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
  showAgencyName = false,
}: ConversationListProps) {
  // Debounce search query to avoid filtering on every keystroke
  const sanitizedSearchQuery = useMemo(() => sanitizeSearchQuery(searchQuery), [searchQuery]);
  const debouncedSearchQuery = useDebounce(sanitizedSearchQuery, 300);

  // Get all other participants (excluding current user) - for groups
  const getOtherParticipants = useCallback((conversation: Conversation): ConversationParticipant[] => {
    const participants = conversation.participantDetails || conversation.participants || [];
    return participants.filter((p) => p.uid !== currentUserId);
  }, [currentUserId]);

  // Memoize conversations with participant info to avoid repeated calls
  const conversationsWithParticipants = useMemo(() => {
    return conversations.map(conv => {
      const otherParticipants = getOtherParticipants(conv);
      const isGroup = isGroupConversation(conv);
      return {
        ...conv,
        otherParticipants,
        isGroup,
        // For direct chats, use first participant; for groups, this is for fallback
        primaryParticipant: otherParticipants[0] || null,
      };
    });
  }, [conversations, getOtherParticipants]);

  // Get all unique participant IDs for presence tracking
  const allParticipantIds = useMemo(() => {
    const ids = new Set<string>();
    conversationsWithParticipants.forEach(({ otherParticipants }) => {
      otherParticipants.forEach(p => {
        if (p?.uid) ids.add(p.uid);
      });
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
    return conversationsWithParticipants.filter(({ otherParticipants, isGroup, name }) => {
      if (otherParticipants.length === 0) return false;

      // Apply search filter
      if (debouncedSearchQuery) {
        const searchLower = debouncedSearchQuery.toLowerCase();
        // Search by group name or any participant name/role
        const matchesGroupName = name?.toLowerCase().includes(searchLower);
        const matchesParticipant = otherParticipants.some(p =>
          p.name.toLowerCase().includes(searchLower) ||
          p.role.toLowerCase().includes(searchLower)
        );
        return matchesGroupName || matchesParticipant;
      }

      // Apply tab filter (only for non-group chats for simplicity)
      if (filterTab !== "all" && !isGroup) {
        const primaryParticipant = otherParticipants[0];
        if (!primaryParticipant) return false;

        const role = primaryParticipant.role || "";

        if (filterTab === "dsp") {
          return isDspRole(role);
        }
        if (filterTab === "staff" || filterTab === "agency") {
          return isStaffRole(role);
        }
        if (filterTab === "administration") {
          return isAdministrationRole(role);
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
    <div className="w-full md:w-[380px] border-r border-[#e5e7eb] flex flex-col min-h-0 bg-white overflow-hidden">
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
              onClick={() => onFilterChange("staff")}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${filterTab === "staff"
                ? "bg-[#2563eb] text-white"
                : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]"
                }`}
            >
              Staff
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
            const { otherParticipants, isGroup, primaryParticipant, ...conversation } = item;
            if (otherParticipants.length === 0) return null;

            const unreadCount = getUnreadCount(conversation as Conversation);
            const isSelected = selectedConversationId === conversation.id;

            // For direct chats, check online status of the single participant
            const isOnline = !isGroup && primaryParticipant
              ? presenceMap[primaryParticipant.uid]?.status === "online"
              : false;

            // Display name: group name or participant name(s)
            const displayName = isGroup
              ? getGroupDisplayName(otherParticipants, conversation.name)
              : primaryParticipant?.name || "Unknown";

            // Subtitle: member count for groups, role for direct
            const subtitle = isGroup
              ? `${otherParticipants.length + 1} members`
              : formatRoleLabel(primaryParticipant?.role || "");

            return (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors rounded-[8px] mx-2 my-1 ${isSelected
                  ? "bg-[#e0f7fa]"
                  : "bg-[#f7f7f7] hover:bg-[#f0f0f0]"
                  }`}
              >
                {/* Avatar(s) */}
                <div className="relative flex-shrink-0">
                  {isGroup ? (
                    <StackedAvatars participants={otherParticipants} />
                  ) : primaryParticipant ? (
                    <>
                      <Avatar className="w-12 h-14 rounded-[8px]">
                        <AvatarImage
                          src={validateImageUrl(primaryParticipant.avatar) || undefined}
                          alt={primaryParticipant.name}
                          className="rounded-[8px]"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-[#e5e7eb] to-[#d1d5db] text-[#10141a] text-[16px] font-semibold rounded-[8px]">
                          {getInitials(primaryParticipant.name)}
                        </AvatarFallback>
                      </Avatar>
                      {/* Online Status Indicator - only for direct chats */}
                      <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isOnline ? "bg-[#10b981]" : "bg-[#d1d5db]"
                        }`} />
                    </>
                  ) : null}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col relative">
                  <div className="flex items-start justify-between mb-0.5">
                    <h3 className="text-[15px] font-bold text-[#10141a] truncate flex-1">
                      {displayName}
                    </h3>
                    {conversation.lastMessageAt && (
                      <span className="text-[12px] text-[#a0a0a1] flex-shrink-0 ml-2 font-normal">
                        {formatTime(conversation.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] text-[#808081] font-normal leading-tight truncate">
                      {subtitle}
                      {!isGroup && showAgencyName && primaryParticipant?.agencyName && (
                        <span> | {primaryParticipant.agencyName}</span>
                      )}
                    </p>
                    {/* Unread Badge */}
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
    prevProps.filterTab === nextProps.filterTab &&
    prevProps.showAgencyName === nextProps.showAgencyName
  );
});

