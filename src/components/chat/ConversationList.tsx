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
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { formatRoleLabel, getInitials, sanitizeSearchQuery, validateImageUrl } from "@/lib/utils/string-utils";
import { roleLabel, matchesAgencyMode, isProgramScopedRole } from "@/lib/roleLabel";
import { useDebounce } from "@/hooks/useDebounce";
import { useMultiplePresence } from "@/lib/hooks/usePresence";
import type { AgencyMode } from "@/store/redux/agencyModeSlice";

export interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  loading?: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => Promise<void>;
  currentUserId?: string;
  filterTab?: "all" | "dsp" | "staff" | "administration" | "agency";
  onFilterChange?: (tab: "all" | "dsp" | "staff" | "administration" | "agency") => void;
  /** Show agency name alongside role (for super admin) */
  showAgencyName?: boolean;
  /**
   * Active DDD/HHA program mode. When set, direct chats with the other program's
   * field staff are hidden and the field-staff tab is relabelled. Omit to disable.
   */
  programMode?: AgencyMode | null;
  /** "panel" is the caregiver/DSP look: round avatars, last message preview, teal selection. */
  variant?: "classic" | "panel";
}

/** "2:20 PM" today, "Yesterday", else "Nov 3". */
export function conversationTime(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMM d");
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

/**
 * Role tag for a direct conversation participant.
 * Maps DSP/HHA roles through roleLabel (so an HHA user shows "Caregiver"),
 * and falls back to the existing underscore-stripping formatter for all
 * other roles to preserve current behaviour exactly.
 */
const getParticipantRoleTag = (role: string): string => {
  if (isDspRole(role) || role.toLowerCase() === "hha" || role.toLowerCase() === "caregiver") {
    return roleLabel({ role });
  }
  return formatRoleLabel(role);
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
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  currentUserId,
  filterTab = "all",
  onFilterChange,
  showAgencyName = false,
  programMode = null,
  variant = "classic",
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
    return conversationsWithParticipants.filter(({ otherParticipants, isGroup, name, primaryParticipant }) => {
      if (otherParticipants.length === 0) return false;

      // Program scope (agency Support): hide direct chats with the other
      // program's field staff. Runs before search so search stays scoped too.
      // Groups are always shown (a mixed group's program is ambiguous).
      if (programMode && !isGroup && !matchesAgencyMode(primaryParticipant?.role, programMode)) {
        return false;
      }

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
          // Under a program mode the gate above already restricts to the current
          // program, so the field-staff tab matches that program's field staff
          // (DSPs in DDD, caregivers in HHA).
          return programMode ? isProgramScopedRole(role) : isDspRole(role);
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
  }, [conversationsWithParticipants, debouncedSearchQuery, filterTab, programMode]);

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

  if (variant === "panel") {
    return (
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[16px] border border-[#e8edef] bg-white dark:border-white/10 dark:bg-[#1b232b]">
        <h2 className="sr-only">Conversations</h2>
        {onSearchChange && (
          <div className="shrink-0 p-3">
            <label className="relative block">
              <span className="sr-only">Search conversations</span>
              <input type="search" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search for your conversation here"
                className="h-10 w-full rounded-[8px] border border-[#e3e8ea] bg-white pl-3 pr-9 text-[13px] text-[#10141a] outline-none placeholder:text-[#8a979d] focus-visible:border-[#007679] focus-visible:ring-2 focus-visible:ring-[#007679]/20 dark:border-white/10 dark:bg-[#141b21] dark:text-[#f4f6f7]" />
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5d6b73]" aria-hidden="true" />
            </label>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto pb-2">
          {loading ? (
            <div role="status" aria-label="Loading conversations" className="flex flex-col gap-1 px-3">
              {[0, 1, 2, 3].map((row) => <div key={row} className="flex items-center gap-3 py-2.5">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-[#edf1f2] motion-reduce:animate-none dark:bg-white/10" />
                <div className="flex-1 space-y-2"><div className="h-3 w-2/3 animate-pulse rounded bg-[#edf1f2] motion-reduce:animate-none dark:bg-white/10" /><div className="h-3 w-full animate-pulse rounded bg-[#edf1f2] motion-reduce:animate-none dark:bg-white/10" /></div>
              </div>)}
            </div>
          ) : filteredConversations.length === 0 ? (
            <p className="px-4 py-12 text-center text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">
              {debouncedSearchQuery ? "No conversations match your search." : "No conversations yet. Start one with New message."}
            </p>
          ) : (
            <ul>
              {filteredConversations.map((item) => {
                const { otherParticipants, isGroup, primaryParticipant, ...conversation } = item;
                const unreadCount = getUnreadCount(conversation as Conversation);
                const isSelected = selectedConversationId === conversation.id;
                const isOnline = !isGroup && primaryParticipant ? presenceMap[primaryParticipant.uid]?.status === "online" : false;
                const displayName = isGroup ? getGroupDisplayName(otherParticipants, conversation.name) : primaryParticipant?.name || "Unknown";
                const preview = conversation.lastMessagePreview || conversation.lastMessage
                  || (isGroup ? `${otherParticipants.length + 1} members` : getParticipantRoleTag(primaryParticipant?.role || ""));
                const time = conversationTime(conversation.lastMessageAt);
                return (
                  <li key={conversation.id}>
                    <button type="button" onClick={() => onSelectConversation(conversation.id)} aria-current={isSelected ? "true" : undefined}
                      className={cn("flex w-full cursor-pointer items-center gap-3 border-l-2 px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#007679]",
                        isSelected ? "border-[#007679] bg-[#e3f6f6] dark:bg-[#00a3a7]/15" : "border-transparent hover:bg-[#f3f5f6] dark:hover:bg-white/5")}>
                      <span className="relative shrink-0">
                        {isGroup ? <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e3f6f6] text-[#007679] dark:bg-[#00a3a7]/20 dark:text-[#7fe0e2]"><Users className="h-5 w-5" aria-hidden="true" /></span>
                          : <Avatar className="h-10 w-10 rounded-full">
                            <AvatarImage src={validateImageUrl(primaryParticipant?.avatar) || undefined} alt="" className="rounded-full object-cover" />
                            <AvatarFallback className="rounded-full bg-[#e3f6f6] text-[13px] font-semibold text-[#007679] dark:bg-[#00a3a7]/20 dark:text-[#7fe0e2]">{getInitials(displayName)}</AvatarFallback>
                          </Avatar>}
                        {isOnline && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#20a35c] dark:border-[#1b232b]"><span className="sr-only">Online</span></span>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{displayName}</span>
                          {time && <span className="shrink-0 text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{time}</span>}
                        </span>
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span className={cn("truncate text-[13px]", unreadCount > 0 ? "font-semibold text-[#10141a] dark:text-[#f4f6f7]" : "text-[#5d6b73] dark:text-[#9aa4a8]")}>{preview}</span>
                          {unreadCount > 0 && <span className="grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full bg-[#003839] px-1 text-[11px] font-semibold text-white dark:bg-[#7fe0e2] dark:text-[#06292a]">
                            {unreadCount > 9 ? "9+" : unreadCount}<span className="sr-only"> unread</span>
                          </span>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {hasMore && onLoadMore && !loading && (
            <div className="flex justify-center px-4 py-3">
              <button type="button" onClick={() => void onLoadMore()} disabled={loadingMore}
                className="cursor-pointer text-[13px] font-semibold text-[#007679] hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#7fe0e2]">
                {loadingMore ? "Loading more..." : "Load more conversations"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

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
              {roleLabel({ role: programMode === "hha" ? "hha" : "dsp" })}
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
              : getParticipantRoleTag(primaryParticipant?.role || "");

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
        {hasMore && onLoadMore && !loading && (
          <div className="flex justify-center px-4 py-3">
            <button
              type="button"
              onClick={() => void onLoadMore()}
              disabled={loadingMore}
              className="text-[13px] font-medium text-[#2563eb] hover:text-[#114fd7] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingMore ? "Loading more..." : "Load more conversations"}
            </button>
          </div>
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
    prevProps.hasMore === nextProps.hasMore &&
    prevProps.loadingMore === nextProps.loadingMore &&
    prevProps.onLoadMore === nextProps.onLoadMore &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.filterTab === nextProps.filterTab &&
    prevProps.showAgencyName === nextProps.showAgencyName &&
    prevProps.programMode === nextProps.programMode &&
    prevProps.variant === nextProps.variant
  );
});

