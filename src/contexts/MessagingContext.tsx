/**
 * Messaging Context Provider
 * Provides shared messaging state and methods across the application
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  useConversations,
  useConversationMessages,
  useConversation,
  Conversation,
  Message,
} from "@/lib/hooks/useMessaging";
import { useMultiplePresence, UserPresence } from "@/lib/hooks/usePresence";
import {
  useLazyGetContactsQuery,
  useLazyGetConversationsQuery,
  useCreateConversationMutation,
  useSendMessageMutation,
  useMarkMessagesAsReadMutation,
  useLeaveConversationMutation,
  useGetConversationByIdQuery,
  useGetConversationsQuery,
  useGetMessagesQuery,
  AgencyContact,
  CursorPageParams,
  CursorPagination,
  GetContactsResponse,
  GetConversationsResponse,
  UserConversation,
} from "@/lib/api/userMessaging";
import {
  mapRestConversation,
  mapRestMessage,
} from "@/lib/chat/restMessagingAdapters";
import { buildMessagingAuthScopeKey } from "@/lib/chat/messagingAuthScope";
import { useAuth } from "@/utils/auth";
import { UserType } from "@/utils/auth/types/user.types";
import { useToast } from "@/hooks/use-toast";

export interface MessagingListQuery {
  search?: string;
  role?: string;
  /** Client-only identity for local filters that change the visible scope. */
  scopeKey?: string;
}

export interface MessagingContinuationState {
  hasMore: boolean;
  nextCursor: string | null;
  isLoadingMore: boolean;
  error: Error | null;
}

interface MessagingContextType {
  // State
  conversations: Conversation[];
  contacts: AgencyContact[];
  currentConversation: Conversation | null;
  currentMessages: Message[];
  presenceMap: Record<string, UserPresence>;
  loading: boolean;
  /** Loading state for conversations list only */
  conversationsLoading: boolean;
  /** Loading state for selected conversation metadata */
  conversationLoading: boolean;
  /** Loading state for messages in selected conversation */
  messagesLoading: boolean;
  contactsLoading: boolean;
  conversationPagination: MessagingContinuationState;
  contactPagination: MessagingContinuationState;
  error: Error | null;

  // Actions
  selectConversation: (conversationId: string | null) => void;
  sendMessage: (
    conversationId: string,
    content: string,
    attachments?: Array<{ type: "image" | "file"; url: string; name?: string }>
  ) => Promise<void>;
  createConversation: (participantIds: string[]) => Promise<Conversation | null>;
  markAsRead: (conversationId: string, messageIds: string[]) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  getContacts: (query?: MessagingListQuery) => Promise<AgencyContact[]>;
  setConversationQuery: (query?: MessagingListQuery) => void;
  loadMoreConversations: () => Promise<void>;
  loadMoreContacts: () => Promise<void>;
  getPresence: (userId: string) => UserPresence | null;
  refreshConversation: (conversationId: string) => Promise<void>;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

interface MessagingProviderProps {
  children: React.ReactNode;
}

const SUPER_ADMIN_REFRESH_INTERVAL_MS = 15_000;
const MESSAGING_PAGE_LIMIT = 50;

interface ConversationListOwner {
  baseKey: string;
  generation: number;
}

interface RestConversationListState extends MessagingContinuationState {
  owner: ConversationListOwner;
  key: string;
  items: UserConversation[];
  continuationLoaded: boolean;
}

function emptyContinuation(): MessagingContinuationState {
  return {
    hasMore: false,
    nextCursor: null,
    isLoadingMore: false,
    error: null,
  };
}

function continuationFrom(
  pagination?: CursorPagination,
): MessagingContinuationState {
  return {
    hasMore: Boolean(pagination?.hasMore),
    nextCursor: pagination?.nextCursor || null,
    isLoadingMore: false,
    error: null,
  };
}

function normalizeListQuery(query: MessagingListQuery = {}): MessagingListQuery {
  const search = query.search?.trim();
  const role = query.role?.trim();
  const scopeKey = query.scopeKey?.trim();
  return {
    ...(search ? { search } : {}),
    ...(role ? { role } : {}),
    ...(scopeKey ? { scopeKey } : {}),
  };
}

function listQueryKey(query: MessagingListQuery): string {
  return JSON.stringify([
    query.search || "",
    query.role || "",
    query.scopeKey || "",
  ]);
}

function appendCanonical<T>(
  current: T[],
  incoming: T[],
  getKey: (item: T) => string,
): T[] {
  const incomingOrder: string[] = [];
  const incomingById = new Map<string, T>();
  for (const item of incoming) {
    const key = getKey(item);
    if (!incomingById.has(key)) incomingOrder.push(key);
    incomingById.set(key, item);
  }
  const merged = current.map((item) => incomingById.get(getKey(item)) || item);
  const existingIds = new Set(current.map(getKey));
  for (const key of incomingOrder) {
    if (!existingIds.has(key)) merged.push(incomingById.get(key)!);
  }
  return merged;
}

function refreshCanonicalWindow<T>(
  current: T[],
  refreshed: T[],
  getKey: (item: T) => string,
): T[] {
  const canonicalRefreshed = appendCanonical([], refreshed, getKey);
  const refreshedIds = new Set(canonicalRefreshed.map(getKey));
  return [
    ...canonicalRefreshed,
    ...current.filter((item) => !refreshedIds.has(getKey(item))),
  ];
}

function messagingError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error;
  if (error && typeof error === "object") {
    const candidate = error as {
      data?: { message?: string; error?: string } | string;
      error?: string;
      message?: string;
    };
    const dataMessage = typeof candidate.data === "string"
      ? candidate.data
      : candidate.data?.message || candidate.data?.error;
    return new Error(dataMessage || candidate.error || candidate.message || fallback);
  }
  return new Error(fallback);
}

export function MessagingProvider({ children }: MessagingProviderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isFamilyMember = user?.userType === UserType.FAMILY_MEMBER;
  const isSuperAdmin = user?.userType === UserType.SUPER_ADMIN;
  const authScopeKey = buildMessagingAuthScopeKey(user);
  const [selectedConversation, setSelectedConversation] = useState<{
    scopeKey: string;
    id: string | null;
  }>(() => ({ scopeKey: authScopeKey, id: null }));
  const selectionIsCurrent = selectedConversation.scopeKey === authScopeKey;
  const selectedConversationId = selectionIsCurrent
    ? selectedConversation.id
    : null;
  const [conversationQuery, setConversationQueryState] = useState<MessagingListQuery>({});
  const [contacts, setContacts] = useState<AgencyContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactStateKey, setContactStateKey] = useState("");
  const [contactOwnerScopeKey, setContactOwnerScopeKey] = useState("");
  const [contactPagination, setContactPagination] =
    useState<MessagingContinuationState>(emptyContinuation);

  // RTK Query hooks - skip for unauthenticated users and family members (they use their own messaging API)
  const conversationListBaseKey = useMemo(() => JSON.stringify([
    authScopeKey,
    listQueryKey(conversationQuery),
  ]), [authScopeKey, conversationQuery]);
  const conversationListGenerationRef = useRef(0);
  const conversationListOwnerRef = useRef<ConversationListOwner | null>(null);
  if (
    !conversationListOwnerRef.current ||
    conversationListOwnerRef.current.baseKey !== conversationListBaseKey
  ) {
    conversationListGenerationRef.current += 1;
    conversationListOwnerRef.current = {
      baseKey: conversationListBaseKey,
      generation: conversationListGenerationRef.current,
    };
  }
  const conversationListOwner = conversationListOwnerRef.current;
  const conversationRequestParams = useMemo<CursorPageParams>(() => ({
    limit: MESSAGING_PAGE_LIMIT,
    ...conversationQuery,
    scopeKey: `${authScopeKey}|${conversationQuery.scopeKey || ""}` +
      `|generation:${conversationListOwner.generation}`,
  }), [authScopeKey, conversationListOwner, conversationQuery]);
  const conversationListKey = useMemo(
    () => JSON.stringify(conversationRequestParams),
    [conversationRequestParams],
  );
  const [restConversationState, setRestConversationState] =
    useState<RestConversationListState>(() => ({
      owner: conversationListOwner,
      key: conversationListKey,
      items: [],
      continuationLoaded: false,
      ...emptyContinuation(),
    }));
  const authScopeKeyRef = useRef(authScopeKey);
  authScopeKeyRef.current = authScopeKey;
  const conversationLoadSequenceRef = useRef(0);
  const activeConversationLoadRef = useRef<number | null>(null);
  const contactLoadSequenceRef = useRef(0);
  const activeContactLoadRef = useRef<number | null>(null);
  const contactQueryRef = useRef<MessagingListQuery>({});
  const contactQueryKeyRef = useRef("");
  const contactRequestIdRef = useRef(0);

  useEffect(() => {
    setSelectedConversation((current) => current.scopeKey === authScopeKey
      ? current
      : { scopeKey: authScopeKey, id: null });
  }, [authScopeKey]);

  const [fetchConversationContinuation] = useLazyGetConversationsQuery();
  const [fetchContactPage] = useLazyGetContactsQuery();
  const [createConversationMutation] = useCreateConversationMutation();
  const [sendMessageMutation] = useSendMessageMutation();
  const [markMessagesAsReadMutation] = useMarkMessagesAsReadMutation();
  const [leaveConversationMutation] = useLeaveConversationMutation();
  const {
    currentData: apiConversationsData,
    isLoading: apiConversationsLoading,
    error: apiConversationsError,
    refetch: refetchConversations,
  } = useGetConversationsQuery(conversationRequestParams, {
    skip: !user || !isSuperAdmin,
  });
  const {
    currentData: apiConversationData,
    isLoading: apiConversationLoading,
    error: apiConversationError,
    refetch: refetchConversation,
  } = useGetConversationByIdQuery(
    {
      conversationId: selectedConversationId || "",
      scopeKey: authScopeKey,
    },
    { skip: !user || !isSuperAdmin || !selectedConversationId },
  );
  const {
    currentData: apiMessagesData,
    isLoading: apiMessagesLoading,
    error: apiMessagesError,
    refetch: refetchMessages,
  } = useGetMessagesQuery(
    {
      conversationId: selectedConversationId || "",
      limit: 50,
      scopeKey: authScopeKey,
    },
    { skip: !user || !isSuperAdmin || !selectedConversationId },
  );

  const applyConversationFirstWindow = useCallback((
    response: GetConversationsResponse,
    requestOwner: ConversationListOwner,
  ) => {
    if (conversationListOwnerRef.current !== requestOwner) return;
    const refreshed = response.conversations || response.data || [];
    setRestConversationState((current) => {
      const state = current.owner === requestOwner
        ? current
        : {
          owner: requestOwner,
          key: requestOwner.baseKey,
          items: [],
          continuationLoaded: false,
          ...emptyContinuation(),
        };
      const firstWindowPagination = continuationFrom(response.pagination);
      return {
        ...state,
        items: refreshCanonicalWindow(
          state.items,
          refreshed,
          (conversation) => conversation.id,
        ),
        hasMore: state.continuationLoaded
          ? state.hasMore
          : firstWindowPagination.hasMore,
        nextCursor: state.continuationLoaded
          ? state.nextCursor
          : firstWindowPagination.nextCursor,
        error: null,
      };
    });
  }, []);

  useEffect(() => {
    conversationLoadSequenceRef.current += 1;
    activeConversationLoadRef.current = null;
    setRestConversationState({
      owner: conversationListOwner,
      key: conversationListKey,
      items: [],
      continuationLoaded: false,
      ...emptyContinuation(),
    });
  }, [conversationListKey, conversationListOwner]);

  useEffect(() => {
    if (!isSuperAdmin || !apiConversationsData) return;
    applyConversationFirstWindow(apiConversationsData, conversationListOwner);
  }, [
    apiConversationsData,
    applyConversationFirstWindow,
    conversationListOwner,
    isSuperAdmin,
  ]);

  const refreshConversationFirstWindow = useCallback(async () => {
    const requestOwner = conversationListOwnerRef.current;
    if (!requestOwner) return;
    const result = await refetchConversations() as
      | { data?: GetConversationsResponse }
      | undefined;
    if (result?.data) applyConversationFirstWindow(result.data, requestOwner);
  }, [applyConversationFirstWindow, refetchConversations]);

  useEffect(() => {
    if (!user || !isSuperAdmin) return;

    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      void refreshConversationFirstWindow();
      if (selectedConversationId) {
        void refetchConversation();
        void refetchMessages();
      }
    };
    const interval = window.setInterval(
      refresh,
      SUPER_ADMIN_REFRESH_INTERVAL_MS,
    );
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [
    isSuperAdmin,
    refetchConversation,
    refetchMessages,
    refreshConversationFirstWindow,
    selectedConversationId,
    user,
  ]);

  // Subscribe to conversations list (already checks for user internally)
  const {
    conversations: firestoreConversations,
    loading: firestoreConversationsLoading,
    error: firestoreConversationsError,
    hasMore: firestoreConversationsHasMore,
    loadMore: loadMoreFirestoreConversations,
  } = useConversations({ limit: 50, skip: isSuperAdmin });

  // Subscribe to selected conversation (already checks for user internally)
  const {
    conversation: firestoreConversation,
    loading: firestoreConversationLoading,
    error: firestoreConversationError,
  } = useConversation(selectedConversationId, { skip: isSuperAdmin });

  // Subscribe to messages in selected conversation (already checks for user internally)
  const {
    messages: firestoreMessages,
    loading: firestoreMessagesLoading,
    error: firestoreMessagesError,
  } = useConversationMessages(selectedConversationId, {
    limit: 50,
    reverse: true,
    skip: isSuperAdmin,
  });

  const restConversationStateIsCurrent =
    restConversationState.owner === conversationListOwner;
  const contactStateIsCurrent =
    contactOwnerScopeKey === authScopeKey && Boolean(contactStateKey);
  const visibleContacts = contactStateIsCurrent ? contacts : [];
  const visibleContactPagination = contactStateIsCurrent
    ? contactPagination
    : emptyContinuation();
  const visibleContactsLoading = contactStateIsCurrent
    ? contactsLoading
    : false;
  const conversations = useMemo(
    () => isSuperAdmin
      ? (restConversationStateIsCurrent
        ? restConversationState.items.map(mapRestConversation)
        : [])
      : firestoreConversations,
    [
      firestoreConversations,
      isSuperAdmin,
      restConversationState.items,
      restConversationStateIsCurrent,
    ],
  );
  const currentConversation = useMemo(
    () => !selectedConversationId
      ? null
      : isSuperAdmin
        ? (apiConversationData?.conversation || apiConversationData?.data
          ? mapRestConversation(
            (apiConversationData.conversation || apiConversationData.data)!,
          )
          : null)
        : firestoreConversation,
    [
      apiConversationData,
      firestoreConversation,
      isSuperAdmin,
      selectedConversationId,
    ],
  );
  const currentMessages = useMemo(
    () => !selectedConversationId
      ? []
      : isSuperAdmin
        ? (apiMessagesData?.messages || apiMessagesData?.data || [])
          .map((message) => mapRestMessage(message, user?.uid))
        : firestoreMessages,
    [
      apiMessagesData,
      firestoreMessages,
      isSuperAdmin,
      selectedConversationId,
      user?.uid,
    ],
  );
  const conversationsLoading = isSuperAdmin
    ? apiConversationsLoading
    : firestoreConversationsLoading;
  const conversationLoading = Boolean(selectedConversationId) && (isSuperAdmin
    ? apiConversationLoading
    : firestoreConversationLoading);
  const messagesLoading = Boolean(selectedConversationId) && (isSuperAdmin
    ? apiMessagesLoading
    : firestoreMessagesLoading);
  const conversationsError = isSuperAdmin && apiConversationsError
    ? new Error("Failed to load conversations")
    : firestoreConversationsError;
  const conversationError = !selectedConversationId
    ? null
    : isSuperAdmin && apiConversationError
      ? new Error("Failed to load conversation")
      : firestoreConversationError;
  const messagesError = !selectedConversationId
    ? null
    : isSuperAdmin && apiMessagesError
      ? new Error("Failed to load messages")
      : firestoreMessagesError;
  const conversationPagination = useMemo<MessagingContinuationState>(() =>
    isSuperAdmin
      ? (restConversationStateIsCurrent ? {
        hasMore: restConversationState.hasMore,
        nextCursor: restConversationState.nextCursor,
        isLoadingMore: restConversationState.isLoadingMore,
        error: restConversationState.error,
      } : emptyContinuation())
      : {
        hasMore: firestoreConversationsHasMore,
        nextCursor: null,
        isLoadingMore: restConversationState.isLoadingMore,
        error: restConversationState.error,
      }, [
    firestoreConversationsHasMore,
    isSuperAdmin,
    restConversationState.error,
    restConversationState.hasMore,
    restConversationState.isLoadingMore,
    restConversationState.nextCursor,
    restConversationStateIsCurrent,
  ]);

  useEffect(() => {
    contactRequestIdRef.current += 1;
    contactLoadSequenceRef.current += 1;
    activeContactLoadRef.current = null;
    contactQueryRef.current = {};
    contactQueryKeyRef.current = "";
    setContactStateKey("");
    setContactOwnerScopeKey("");
    setContacts([]);
    setContactsLoading(false);
    setContactPagination(emptyContinuation());
  }, [authScopeKey]);

  // Subscribe to presence for conversation participants
  const participantIds = useMemo(() => {
    if (!currentConversation?.participantIds) return [];
    return currentConversation.participantIds.filter((id) => id !== user?.uid);
  }, [currentConversation?.participantIds, user?.uid]);

  const { presenceMap } = useMultiplePresence(participantIds);

  // Combined loading state
  const loading = conversationsLoading || conversationLoading || messagesLoading;
  const error = conversationsError || conversationError || messagesError ||
    conversationPagination.error || visibleContactPagination.error;

  // Select conversation
  const selectConversation = useCallback((conversationId: string | null) => {
    setSelectedConversation({ scopeKey: authScopeKey, id: conversationId });
  }, [authScopeKey]);

  const setConversationQuery = useCallback((query: MessagingListQuery = {}) => {
    const normalized = normalizeListQuery(query);
    setConversationQueryState((current) =>
      listQueryKey(current) === listQueryKey(normalized) ? current : normalized);
  }, []);

  const loadMoreConversations = useCallback(async () => {
    if (activeConversationLoadRef.current !== null) return;

    if (!isSuperAdmin) {
      if (!firestoreConversationsHasMore) return;
      const requestOwner = conversationListOwnerRef.current;
      if (!requestOwner) return;
      const loadId = conversationLoadSequenceRef.current + 1;
      conversationLoadSequenceRef.current = loadId;
      activeConversationLoadRef.current = loadId;
      setRestConversationState((current) => current.owner === requestOwner
        ? {
          ...current,
          isLoadingMore: true,
          error: null,
        }
        : current);
      try {
        await loadMoreFirestoreConversations();
      } catch (caught) {
        if (
          conversationListOwnerRef.current !== requestOwner ||
          activeConversationLoadRef.current !== loadId
        ) {
          return;
        }
        const loadError = messagingError(caught, "Failed to load more conversations");
        setRestConversationState((current) => current.owner === requestOwner
          ? { ...current, error: loadError }
          : current);
        toast({
          title: "Error",
          description: loadError.message,
          variant: "destructive",
        });
      } finally {
        if (activeConversationLoadRef.current === loadId) {
          activeConversationLoadRef.current = null;
          if (conversationListOwnerRef.current === requestOwner) {
            setRestConversationState((current) =>
              current.owner === requestOwner
                ? { ...current, isLoadingMore: false }
                : current);
          }
        }
      }
      return;
    }

    const requestOwner = restConversationState.owner;
    const cursor = restConversationState.nextCursor;
    if (
      requestOwner !== conversationListOwnerRef.current ||
      !restConversationState.hasMore ||
      !cursor
    ) {
      return;
    }

    const loadId = conversationLoadSequenceRef.current + 1;
    conversationLoadSequenceRef.current = loadId;
    activeConversationLoadRef.current = loadId;
    setRestConversationState((current) => ({
      ...current,
      isLoadingMore: true,
      error: null,
    }));
    try {
      const response = await fetchConversationContinuation({
        ...conversationRequestParams,
        cursor,
      }, false).unwrap() as GetConversationsResponse;
      if (
        conversationListOwnerRef.current !== requestOwner ||
        activeConversationLoadRef.current !== loadId
      ) {
        return;
      }
      const incoming = response.conversations || response.data || [];
      const next = continuationFrom(response.pagination);
      setRestConversationState((current) => current.owner === requestOwner
        ? {
          ...current,
          items: appendCanonical(
            current.items,
            incoming,
            (conversation) => conversation.id,
          ),
          continuationLoaded: true,
          hasMore: next.hasMore,
          nextCursor: next.nextCursor,
          error: null,
        }
        : current);
    } catch (caught) {
      if (
        conversationListOwnerRef.current !== requestOwner ||
        activeConversationLoadRef.current !== loadId
      ) {
        return;
      }
      const loadError = messagingError(caught, "Failed to load more conversations");
      setRestConversationState((current) => current.owner === requestOwner
        ? { ...current, error: loadError }
        : current);
      toast({
        title: "Error",
        description: loadError.message,
        variant: "destructive",
      });
    } finally {
      if (activeConversationLoadRef.current === loadId) {
        activeConversationLoadRef.current = null;
        if (conversationListOwnerRef.current === requestOwner) {
          setRestConversationState((current) => current.owner === requestOwner
            ? { ...current, isLoadingMore: false }
            : current);
        }
      }
    }
  }, [
    conversationRequestParams,
    fetchConversationContinuation,
    firestoreConversationsHasMore,
    isSuperAdmin,
    loadMoreFirestoreConversations,
    restConversationState.hasMore,
    restConversationState.nextCursor,
    restConversationState.owner,
    toast,
  ]);

  // Send message
  const sendMessage = useCallback(
    async (
      conversationId: string,
      content: string,
      attachments?: Array<{ type: "image" | "file"; url: string; name?: string }>
    ) => {
      const trimmedContent = content.trim();
      const hasText = trimmedContent.length > 0;
      const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

      // Require at least text or one attachment
      if (!hasText && !hasAttachments) return;

      if (!conversationId || typeof conversationId !== 'string' || conversationId.trim() === '') {
        console.error("Invalid conversation ID:", conversationId);
        toast({
          title: "Error",
          description: "Invalid conversation ID",
          variant: "destructive",
        });
        return;
      }

      try {
        await sendMessageMutation({
          conversationId,
          payload: {
            content: trimmedContent,
            attachments: hasAttachments ? attachments : undefined,
          }
        }).unwrap();
        // Real-time update will come via Firestore subscription
      } catch (error: any) {
        console.error("Error sending message:", error);
        toast({
          title: "Error",
          description: error.data?.message || error.message || "Failed to send message",
          variant: "destructive",
        });
        throw error;
      }
    },
    [sendMessageMutation, toast]
  );

  // Create conversation
  const createConversation = useCallback(
    async (participantIds: string[]): Promise<Conversation | null> => {
      if (participantIds.length === 0) return null;

      try {
        const response = await createConversationMutation({ participantIds }).unwrap();
        if (response.success && response.data) {
          if (!response.data.id) {
            console.error("Conversation created but missing ID:", response.data);
            toast({
              title: "Error",
              description: "Failed to create conversation: missing ID",
              variant: "destructive",
            });
            return null;
          }

          const mappedConversation = mapRestConversation(response.data);
          // Select the new conversation
          setSelectedConversation({
            scopeKey: authScopeKey,
            id: mappedConversation.id,
          });
          return mappedConversation;
        }
        return null;
      } catch (error: any) {
        console.error("Error creating conversation:", error);
        toast({
          title: "Error",
          description: error.data?.message || error.message || "Failed to create conversation",
          variant: "destructive",
        });
        throw error;
      }
    },
    [authScopeKey, createConversationMutation, toast]
  );

  // Mark messages as read
  const markAsRead = useCallback(
    async (conversationId: string, messageIds: string[]) => {
      if (messageIds.length === 0) return;

      try {
        await markMessagesAsReadMutation({
          conversationId,
          payload: { messageIds }
        }).unwrap();
        // Real-time update will come via Firestore subscription
      } catch (error: any) {
        console.error("Error marking messages as read:", error);
        // Don't show toast for read errors, just log
      }
    },
    [markMessagesAsReadMutation]
  );

  // Delete conversation
  const deleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        await leaveConversationMutation(conversationId).unwrap();
        if (isSuperAdmin) {
          setRestConversationState((current) => ({
            ...current,
            items: current.items.filter((item) => item.id !== conversationId),
          }));
        }
        if (selectedConversationId === conversationId) {
          setSelectedConversation({ scopeKey: authScopeKey, id: null });
        }
        toast({
          title: "Success",
          description: "Conversation deleted successfully",
        });
      } catch (error: any) {
        console.error("Error deleting conversation:", error);
        toast({
          title: "Error",
          description: error.data?.message || error.message || "Failed to delete conversation",
          variant: "destructive",
        });
        throw error;
      }
    },
    [
      authScopeKey,
      isSuperAdmin,
      leaveConversationMutation,
      selectedConversationId,
      toast,
    ]
  );

  // Get the first contact window. A different search/filter scope invalidates
  // the old cursor before the new request starts.
  const getContacts = useCallback(async (
    query: MessagingListQuery = {},
  ): Promise<AgencyContact[]> => {
    if (!user || isFamilyMember) return [];

    const normalized = normalizeListQuery(query);
    const requestKey = `${authScopeKey}|${listQueryKey(normalized)}`;
    const requestId = contactRequestIdRef.current + 1;
    contactRequestIdRef.current = requestId;
    contactLoadSequenceRef.current += 1;
    activeContactLoadRef.current = null;
    contactQueryRef.current = normalized;
    contactQueryKeyRef.current = requestKey;
    setContactStateKey(requestKey);
    setContactOwnerScopeKey(authScopeKey);
    setContacts([]);
    setContactsLoading(true);
    setContactPagination(emptyContinuation());

    try {
      const response = await fetchContactPage({
        limit: MESSAGING_PAGE_LIMIT,
        ...normalized,
        scopeKey: `${authScopeKey}|${normalized.scopeKey || ""}`,
      }, false).unwrap() as GetContactsResponse;
      if (
        authScopeKeyRef.current !== authScopeKey ||
        contactRequestIdRef.current !== requestId ||
        contactQueryKeyRef.current !== requestKey
      ) {
        return [];
      }
      const nextContacts = response.data || [];
      setContacts(appendCanonical(
        [],
        nextContacts,
        (contact) => contact.uid || contact.id,
      ));
      setContactPagination(continuationFrom(response.pagination));
      return nextContacts;
    } catch (caught) {
      if (
        authScopeKeyRef.current !== authScopeKey ||
        contactRequestIdRef.current !== requestId ||
        contactQueryKeyRef.current !== requestKey
      ) {
        return [];
      }
      const loadError = messagingError(caught, "Failed to load contacts");
      console.error("Error fetching contacts:", caught);
      setContactPagination({ ...emptyContinuation(), error: loadError });
      toast({
        title: "Error",
        description: loadError.message,
        variant: "destructive",
      });
      return [];
    } finally {
      if (
        authScopeKeyRef.current === authScopeKey &&
        contactRequestIdRef.current === requestId &&
        contactQueryKeyRef.current === requestKey
      ) {
        setContactsLoading(false);
      }
    }
  }, [authScopeKey, fetchContactPage, isFamilyMember, toast, user]);

  const loadMoreContacts = useCallback(async () => {
    const cursor = contactPagination.nextCursor;
    const requestKey = contactQueryKeyRef.current;
    if (
      activeContactLoadRef.current !== null ||
      !contactPagination.hasMore ||
      !cursor ||
      !requestKey ||
      !user ||
      isFamilyMember
    ) {
      return;
    }

    const query = contactQueryRef.current;
    const requestId = contactRequestIdRef.current;
    const loadId = contactLoadSequenceRef.current + 1;
    contactLoadSequenceRef.current = loadId;
    activeContactLoadRef.current = loadId;
    setContactPagination((current) => ({
      ...current,
      isLoadingMore: true,
      error: null,
    }));
    try {
      const response = await fetchContactPage({
        limit: MESSAGING_PAGE_LIMIT,
        ...query,
        cursor,
        scopeKey: `${authScopeKey}|${query.scopeKey || ""}`,
      }, false).unwrap() as GetContactsResponse;
      if (
        authScopeKeyRef.current !== authScopeKey ||
        contactRequestIdRef.current !== requestId ||
        contactQueryKeyRef.current !== requestKey
      ) {
        return;
      }
      const next = continuationFrom(response.pagination);
      setContacts((current) => appendCanonical(
        current,
        response.data || [],
        (contact) => contact.uid || contact.id,
      ));
      setContactPagination(next);
    } catch (caught) {
      if (
        authScopeKeyRef.current !== authScopeKey ||
        contactRequestIdRef.current !== requestId ||
        contactQueryKeyRef.current !== requestKey
      ) {
        return;
      }
      const loadError = messagingError(caught, "Failed to load more contacts");
      setContactPagination((current) => ({ ...current, error: loadError }));
      toast({
        title: "Error",
        description: loadError.message,
        variant: "destructive",
      });
    } finally {
      if (activeContactLoadRef.current === loadId) {
        activeContactLoadRef.current = null;
        if (
          authScopeKeyRef.current === authScopeKey &&
          contactRequestIdRef.current === requestId &&
          contactQueryKeyRef.current === requestKey
        ) {
          setContactPagination((current) => ({
            ...current,
            isLoadingMore: false,
          }));
        }
      }
    }
  }, [
    authScopeKey,
    contactPagination.hasMore,
    contactPagination.nextCursor,
    fetchContactPage,
    isFamilyMember,
    toast,
    user,
  ]);

  // Get presence for a user
  const getPresence = useCallback(
    (userId: string): UserPresence | null => {
      return presenceMap[userId] || null;
    },
    [presenceMap]
  );

  // Refresh conversation (trigger refetch)
  const refreshConversation = useCallback(
    async (conversationId: string) => {
      if (isSuperAdmin && conversationId === selectedConversationId) {
        await Promise.all([
          refreshConversationFirstWindow(),
          refetchConversation(),
          refetchMessages(),
        ]);
      }
    },
    [
      isSuperAdmin,
      refetchConversation,
      refetchMessages,
      refreshConversationFirstWindow,
      selectedConversationId,
    ]
  );

  const value: MessagingContextType = useMemo(
    () => ({
      conversations,
      contacts: visibleContacts,
      currentConversation,
      currentMessages,
      presenceMap,
      loading,
      conversationsLoading,
      conversationLoading,
      messagesLoading,
      contactsLoading: visibleContactsLoading,
      conversationPagination,
      contactPagination: visibleContactPagination,
      error,
      selectConversation,
      sendMessage,
      createConversation,
      markAsRead,
      deleteConversation,
      getContacts,
      setConversationQuery,
      loadMoreConversations,
      loadMoreContacts,
      getPresence,
      refreshConversation,
    }),
    [
      conversations,
      visibleContacts,
      currentConversation,
      currentMessages,
      presenceMap,
      loading,
      conversationsLoading,
      conversationLoading,
      messagesLoading,
      visibleContactsLoading,
      conversationPagination,
      visibleContactPagination,
      error,
      selectConversation,
      sendMessage,
      createConversation,
      markAsRead,
      deleteConversation,
      getContacts,
      setConversationQuery,
      loadMoreConversations,
      loadMoreContacts,
      getPresence,
      refreshConversation,
    ]
  );

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

/**
 * Hook to use messaging context
 */
export function useMessaging() {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error("useMessaging must be used within a MessagingProvider");
  }
  return context;
}
