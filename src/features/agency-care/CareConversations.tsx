import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import {
  ArrowDown,
  ArrowLeft,
  ChevronDown,
  FileText,
  LoaderCircle,
  MessageCircle,
  Paperclip,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  agencyCareApi,
  type CareMessage,
  type CareConversation,
  type CareRole,
} from "@/lib/api/agencyCare";
import { useAgencyCare } from "./AgencyCareLayout";
import type { CareWorkspaceProps } from "./AgencyCareClientWorkspace";
import {
  careError,
  hasCapability,
  useScopedMutation,
  useScopedRequest,
} from "./hooks";
import {
  ProtectedDocumentPreview,
  type CarePreview,
} from "./ProtectedDocumentPreview";
import {
  CareButton as Button,
  CareAvatar,
  CareRoleBadge,
  CARE_ROLE_LABELS,
  CareEmpty,
  CareFailure,
  CareFormDialog,
  CareHeading,
  CareLoad,
  CareNotice,
  CarePager,
  careDate,
} from "./ui";
import "./conversations.css";

export function useActiveConversation(
  scope: string,
  conversationId: string,
  agencyKey: string,
  messageId = "",
) {
  const key = `${scope}|${conversationId}|${messageId}`;
  const currentKey = useRef(key);
  currentKey.current = key;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    key: string;
    items: CareMessage[];
    cursor: string | null;
    loading: boolean;
    history: boolean;
    error?: string;
  }>({ key, items: [], cursor: null, loading: true, history: false });
  const messages = useRef<CareMessage[]>([]);
  const history = useRef(false);
  const olderController = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let request: AbortController | null = null;
    let hasLoaded = false;
    messages.current = [];
    history.current = false;
    setState({ key, items: [], cursor: null, loading: true, history: false });
    async function load(initial = !hasLoaded) {
      if (
        controller.signal.aborted ||
        request ||
        history.current ||
        document.visibilityState !== "visible"
      )
        return;
      const pending = new AbortController();
      request = pending;
      try {
        const latest = Math.max(
          0,
          ...messages.current.map((item) => item.sequence),
        );
        const page = await agencyCareApi.messages(conversationId, {
          agencyKey,
          signal: pending.signal,
          ...(initial
            ? messageId
              ? { message: messageId }
              : {}
            : { afterSequence: latest }),
        });
        if (
          controller.signal.aborted ||
          pending.signal.aborted ||
          history.current ||
          currentKey.current !== key
        )
          return;
        hasLoaded = true;
        const merged = new Map(messages.current.map((item) => [item.id, item]));
        page.items.forEach((item) => merged.set(item.id, item));
        if (merged.size > 100) {
          setRevision((value) => value + 1);
          return;
        }
        messages.current = [...merged.values()]
          .sort((a, b) => a.sequence - b.sequence)
          .slice(-100);
        history.current = Boolean(messageId);
        setState((previous) => ({
          key,
          items: messages.current,
          cursor: initial ? page.nextCursor : previous.cursor,
          loading: false,
          history: Boolean(messageId),
        }));
      } catch (error) {
        if (
          !controller.signal.aborted &&
          !pending.signal.aborted &&
          currentKey.current === key
        ) {
          messages.current = [];
          hasLoaded = false;
          history.current = Boolean(messageId);
          setState({
            key,
            items: [],
            cursor: null,
            loading: false,
            history: Boolean(messageId),
            error: careError(error),
          });
        }
      } finally {
        if (request !== pending) return;
        request = null;
        if (
          !controller.signal.aborted &&
          !history.current &&
          currentKey.current === key &&
          document.visibilityState === "visible"
        )
          timer = setTimeout(() => void load(), 5000);
      }
    }
    function visibility() {
      if (timer) clearTimeout(timer);
      if (document.visibilityState === "visible") void load();
      else {
        request?.abort();
        request = null;
        olderController.current?.abort();
        olderController.current = null;
      }
    }
    document.addEventListener("visibilitychange", visibility);
    void load(true);
    return () => {
      controller.abort();
      request?.abort();
      const older = olderController.current;
      olderController.current = null;
      older?.abort();
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [key, conversationId, agencyKey, messageId, revision]);
  async function older() {
    if (state.key !== key || !state.cursor || olderController.current) return;
    const controller = new AbortController();
    const previousHistory = state.history;
    history.current = true;
    setState((previous) => ({ ...previous, loading: true, history: true }));
    olderController.current = controller;
    controller.signal.addEventListener(
      "abort",
      () => {
        if (
          olderController.current !== controller ||
          currentKey.current !== key
        )
          return;
        history.current = previousHistory;
        setState((previous) =>
          previous.key === key
            ? { ...previous, loading: false, history: previousHistory }
            : previous,
        );
      },
      { once: true },
    );
    try {
      const page = await agencyCareApi.messages(conversationId, {
        agencyKey,
        cursor: state.cursor,
        signal: controller.signal,
      });
      if (controller.signal.aborted || currentKey.current !== key) return;
      messages.current = [...page.items].sort(
        (a, b) => a.sequence - b.sequence,
      );
      setState({
        key,
        items: messages.current,
        cursor: page.nextCursor,
        loading: false,
        history: true,
      });
    } catch (error) {
      if (!controller.signal.aborted && currentKey.current === key) {
        messages.current = [];
        setState({
          key,
          items: [],
          cursor: null,
          loading: false,
          history: true,
          error: careError(error),
        });
      }
    } finally {
      if (olderController.current === controller)
        olderController.current = null;
    }
  }
  return {
    items: state.key === key ? state.items : [],
    loading: state.key !== key || state.loading,
    error: state.key === key ? state.error : undefined,
    cursor: state.key === key ? state.cursor : null,
    history: state.key === key && state.history,
    older,
    reload: () => setRevision((value) => value + 1),
  };
}

export function CareConversationsPage(props: CareWorkspaceProps) {
  const { network, scope, agencyKey } = props;
  const [search, setSearch] = useSearchParams();
  const [cursor, setCursor] = useState("");
  const [create, setCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [readThrough, setReadThrough] = useState<Record<string, number>>({});
  const selected = search.get("conversation") || "";
  const previousSelection = useRef(selected);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const backButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (previousSelection.current !== selected) {
      if (selected) backButtonRef.current?.focus({ preventScroll: true });
      else searchInputRef.current?.focus({ preventScroll: true });
      previousSelection.current = selected;
    }
  }, [selected]);
  const list = useScopedRequest(`${scope}|conversations|${cursor}`, (signal) =>
    agencyCareApi.conversations(network.id, { agencyKey, cursor, signal }),
  );
  const selectedDetail = useScopedRequest(
    `${scope}|conversation|${selected}`,
    (signal) => agencyCareApi.conversation(selected, { agencyKey, signal }),
    Boolean(selected),
  );
  const conversation =
    selectedDetail.data?.networkId === network.id
      ? selectedDetail.data
      : undefined;
  function openConversation(id: string) {
    const next = new URLSearchParams(search);
    if (id) next.set("conversation", id);
    else next.delete("conversation");
    next.delete("message");
    setSearch(next);
  }
  function unread(item: CareConversation) {
    const read = readThrough[`${scope}|${item.id}`];
    return read === undefined
      ? item.unreadCount || 0
      : Math.min(
          item.unreadCount || 0,
          Math.max(0, item.latestSequence - read),
        );
  }
  const items = list.data?.items || [];
  const matching = items.filter(
    (item) =>
      item.title
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()) &&
      (filter === "all" || unread(item) > 0),
  );
  const unreadThreads = items.filter((item) => unread(item) > 0).length;
  return (
    <div
      className="ac-stack ac-conversations"
      data-thread-open={Boolean(selected)}
    >
      <CareHeading
        title="Conversations"
        description="Keep this client’s care discussions together."
        actions={
          hasCapability(network, "send") && (
            <Button onClick={() => setCreate(true)}>
              <Plus size={16} aria-hidden="true" />
              New conversation
            </Button>
          )
        }
      />
      <div className="ac-chat-grid">
        <aside className="ac-chat-sidebar" aria-label="Client conversations">
          <div className="ac-chat-sidebar-head">
            <h2>Client conversations</h2>
            <Button
              variant="ghost"
              aria-label="Refresh conversations"
              disabled={list.loading}
              onClick={list.reload}
            >
              <RefreshCw size={16} aria-hidden="true" />
            </Button>
            <small>{items.length} on this page</small>
          </div>
          <label className="ac-chat-search">
            <Search size={17} aria-hidden="true" />
            <Input
              ref={searchInputRef}
              aria-label="Search conversations on this page"
              placeholder="Search conversations…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div
            className="ac-chat-filters"
            role="group"
            aria-label="Conversation filters"
          >
            <Button
              variant="ghost"
              aria-pressed={filter === "all"}
              onClick={() => setFilter("all")}
            >
              All <span>{items.length}</span>
            </Button>
            <Button
              variant="ghost"
              aria-pressed={filter === "unread"}
              onClick={() => setFilter("unread")}
            >
              Unread <span>{unreadThreads}</span>
            </Button>
          </div>
          {list.loading ? (
            <CareLoad rows={2} />
          ) : list.error ? (
            <CareFailure message={list.error} onRetry={list.reload} />
          ) : matching.length ? (
            <ul className="ac-list ac-conversation-list">
              {matching.map((item) => {
                const roles = [
                  ...new Set(
                    item.members
                      .map((member) => member.careRole)
                      .filter((role): role is CareRole =>
                        Boolean(
                          role && typeof CARE_ROLE_LABELS[role] === "string",
                        ),
                      ),
                  ),
                ];
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="ac-conversation-row"
                      aria-current={item.id === selected ? "true" : undefined}
                      onClick={() => openConversation(item.id)}
                    >
                      <CareAvatar name={item.title} size="sm" />
                      <span className="ac-conversation-copy">
                        <strong>{item.title}</strong>
                        <small>
                          {item.type === "direct"
                            ? "Direct conversation"
                            : `${item.members.length} participants`}
                        </small>
                        <span
                          className="ac-conversation-roles"
                        >
                          {roles.slice(0, 3).map((role) => (
                            <CareRoleBadge key={role} role={role} />
                          ))}
                          {roles.length > 3 && (
                            <span
                              className="ac-care-role-badge"
                              title="More participant roles"
                            >
                              +{roles.length - 3}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="ac-conversation-meta">
                        {item.updatedAt && (
                          <time
                            dateTime={item.updatedAt}
                            title={careDate(item.updatedAt)}
                          >
                            {conversationDate(item.updatedAt)}
                          </time>
                        )}
                        {unread(item) > 0 && (
                          <span
                            className="ac-unread-count"
                            aria-label={`${unread(item)} unread messages`}
                          >
                            {unread(item) > 99 ? "99+" : unread(item)}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <CareEmpty
              title={
                items.length
                  ? "No matching conversations"
                  : "No conversations yet"
              }
            >
              {items.length
                ? "Try another search or view all conversations on this page."
                : "Start a conversation with permitted members of this client’s care team."}
            </CareEmpty>
          )}
          <CarePager cursor={list.data?.nextCursor} onNext={setCursor} />
          {cursor && (
            <Button variant="ghost" onClick={() => setCursor("")}>
              Back to first page
            </Button>
          )}
        </aside>
        <div className="ac-chat-thread-container">
          {selected && (
            <Button
              ref={backButtonRef}
              variant="ghost"
              className="ac-chat-back"
              onClick={() => openConversation("")}
            >
              <ArrowLeft size={17} aria-hidden="true" />
              Back to conversations
            </Button>
          )}
          {selectedDetail.loading ? (
            <CareLoad rows={2} />
          ) : selectedDetail.error ? (
            <CareFailure
              message={selectedDetail.error}
              onRetry={selectedDetail.reload}
            />
          ) : conversation ? (
            <ConversationThread
              {...props}
              conversation={conversation}
              key={`${scope}|${conversation.id}`}
              onRead={(sequence) =>
                setReadThrough((current) => ({
                  ...current,
                  [`${scope}|${conversation.id}`]: sequence,
                }))
              }
            />
          ) : selected ? (
            <CareNotice>
              This conversation is unavailable in this client workspace.
            </CareNotice>
          ) : (
            <div className="ac-chat-placeholder">
              <MessageCircle size={36} aria-hidden="true" />
              <CareEmpty title="Choose a conversation">
                Messages and file previews load when you open a conversation.
              </CareEmpty>
            </div>
          )}
        </div>
      </div>
      {create && (
        <NewConversation
          {...props}
          onClose={() => setCreate(false)}
          onCreated={(item) => {
            setCreate(false);
            setCursor("");
            list.reload();
            openConversation(item.id);
          }}
        />
      )}
    </div>
  );
}

function conversationDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ConversationThread({
  network,
  scope,
  agencyKey,
  conversation,
  onRead,
}: CareWorkspaceProps & {
  conversation: CareConversation;
  onRead: (sequence: number) => void;
}) {
  const { uid, me } = useAgencyCare();
  const [search, setSearch] = useSearchParams();
  const selectedMessage = search.get("message") || "";
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [conversation.id]);
  const messages = useActiveConversation(
    scope,
    conversation.id,
    agencyKey,
    selectedMessage,
  );
  const selectedMessageRef = useRef<HTMLElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const lastDisplayedSequence = useRef<number | null>(null);
  const forceLatestScroll = useRef(false);
  const focusLatestAfterLoad = useRef(false);
  const [atBottom, setAtBottom] = useState(true);
  const [newMessages, setNewMessages] = useState(0);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  useEffect(() => {
    if (messages.loading || messages.error || messages.history) return;
    const element = messageListRef.current;
    if (!element) return;
    const latest = Math.max(0, ...messages.items.map((item) => item.sequence));
    if (
      lastDisplayedSequence.current === null ||
      atBottom ||
      forceLatestScroll.current
    ) {
      element.scrollTop = element.scrollHeight;
      forceLatestScroll.current = false;
      setNewMessages(0);
      setAtBottom(true);
      if (focusLatestAfterLoad.current) {
        element.focus({ preventScroll: true });
        focusLatestAfterLoad.current = false;
      }
    } else if (latest > lastDisplayedSequence.current) {
      const addedCount = messages.items.filter(
        (item) => item.sequence > (lastDisplayedSequence.current || 0),
      ).length;
      setNewMessages((current) => current + addedCount);
    }
    lastDisplayedSequence.current = latest;
  }, [
    messages.items,
    messages.loading,
    messages.error,
    messages.history,
    atBottom,
  ]);
  useEffect(() => {
    if (!messages.loading && selectedMessageRef.current) {
      selectedMessageRef.current.scrollIntoView?.({ block: "center" });
      selectedMessageRef.current.focus({ preventScroll: true });
    }
  }, [selectedMessage, messages.loading, messages.items]);
  const mutation = useScopedMutation(`${scope}|${conversation.id}`);
  const pendingMessage = useRef<{
    text: string;
    inReplyToMessageId?: string;
    attachmentVersionIds?: string[];
  } | null>(null);
  const [retryRequested, setRetryRequested] = useState(false);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<CareMessage | null>(null);
  const [preview, setPreview] = useState<CarePreview | null>(null);
  const [attachmentPicker, setAttachmentPicker] = useState(false);
  const [attachments, setAttachments] = useState<
    Array<{
      submissionId: string;
      versionId: string;
      fileName: string;
      title: string;
    }>
  >([]);
  const lastRead = useRef(0);
  useEffect(() => {
    if (
      messages.loading ||
      messages.error ||
      (!atBottom && !selectedMessage) ||
      document.visibilityState !== "visible"
    )
      return;
    const latest = Math.max(0, ...messages.items.map((item) => item.sequence));
    if (latest <= lastRead.current) return;
    const controller = new AbortController();
    agencyCareApi
      .readConversation(conversation.id, latest, {
        agencyKey,
        signal: controller.signal,
      })
      .then(() => {
        if (!controller.signal.aborted) {
          lastRead.current = latest;
          onRead(latest);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [
    conversation.id,
    agencyKey,
    messages.items,
    messages.loading,
    messages.error,
    atBottom,
    selectedMessage,
    onRead,
  ]);
  async function send() {
    if (
      !canSend ||
      messages.loading ||
      mutation.saving ||
      mutation.uncertain ||
      (!pendingMessage.current && (!text.trim() || text.length > 4000))
    )
      return;
    pendingMessage.current ||= {
      text: text.trim(),
      ...(replyTo ? { inReplyToMessageId: replyTo.id } : {}),
      ...(attachments.length
        ? { attachmentVersionIds: attachments.map((item) => item.versionId) }
        : {}),
    };
    const payload = pendingMessage.current;
    const sent = await mutation.run((operationId, signal) =>
      agencyCareApi.sendMessage(
        conversation.id,
        { ...payload, operationId },
        { agencyKey, signal },
      ),
    );
    if (sent) {
      setText("");
      setReplyTo(null);
      setAttachments([]);
      pendingMessage.current = null;
      showLatest();
      composerRef.current?.focus();
    }
  }
  useEffect(() => {
    if (retryRequested && !mutation.uncertain && !mutation.saving) {
      setRetryRequested(false);
      void send();
    }
  }, [retryRequested, mutation.uncertain, mutation.saving]);
  const draftFrozen = mutation.saving || Boolean(pendingMessage.current);
  const canSend =
    hasCapability(conversation, "send") &&
    hasCapability(network, "send") &&
    !messages.error;
  function showLatest() {
    forceLatestScroll.current = true;
    if (selectedMessage) {
      const next = new URLSearchParams(search);
      next.delete("message");
      setSearch(next);
    } else messages.reload();
  }
  function sender(message: CareMessage) {
    return message.senderUid === uid && message.senderAgencyKey === agencyKey
      ? "You"
      : message.senderName || "Care team member";
  }
  function viewMessage(id: string) {
    const next = new URLSearchParams(search);
    next.set("message", id);
    setSearch(next);
  }
  return (
    <section className="ac-chat-thread" aria-label={conversation.title}>
      <header className="ac-chat-thread-head">
        <CareAvatar name={conversation.title} />
        <div>
          <h2 ref={headingRef} tabIndex={-1}>
            {conversation.title}
          </h2>
          <small>
            {conversation.type === "direct"
              ? "Direct conversation"
              : "Care team conversation"}{" "}
            · {conversation.members.length} participants
          </small>
        </div>
        <Popover open={participantsOpen} onOpenChange={setParticipantsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="ac-chat-participants-trigger"
              aria-label={`View ${conversation.members.length} conversation participants`}
            >
              <Users size={16} aria-hidden="true" />
              Participants
              <span className="ac-participant-count">
                {conversation.members.length}
              </span>
              <ChevronDown size={14} aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={10}
            collisionPadding={16}
            className="agency-care ac-chat-participant-panel"
            aria-label="Conversation participants"
          >
            <header>
              <div>
                <h3>Participants</h3>
                <p>{conversation.members.length} people in this conversation</p>
              </div>
              <Button
                variant="ghost"
                aria-label="Close participant list"
                onClick={() => setParticipantsOpen(false)}
              >
                <X size={16} aria-hidden="true" />
              </Button>
            </header>
            <ul>
              {conversation.members.map((member) => (
                <li key={`${member.agencyKey}|${member.uid}`}>
                  <CareAvatar
                    size="sm"
                    name={member.name || "Care team member"}
                  />
                  <div className="ac-participant-copy">
                    <strong>{member.name || "Care team member"}</strong>
                    <CareRoleBadge role={member.careRole} />
                  </div>
                  {member.uid === uid && member.agencyKey === agencyKey && (
                    <span className="ac-participant-you">You</span>
                  )}
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      </header>
      <div className="ac-chat-history">
        {!me.restrictedPortal &&
          conversation.sourceContext?.url &&
          /^\/user-panel\/clients-and-services\/[^/?#]+\/monitoring(?:[?#]|$)/.test(
            conversation.sourceContext.url,
          ) && (
            <Button asChild variant="outline">
              <Link to={conversation.sourceContext.url}>
                {conversation.sourceContext.label}
              </Link>
            </Button>
          )}
        {messages.cursor && (
          <Button
            variant="ghost"
            disabled={messages.loading}
            onClick={() => void messages.older()}
          >
            {messages.loading && (
              <LoaderCircle
                size={15}
                aria-hidden="true"
                className="motion-safe:animate-spin"
              />
            )}
            Load earlier messages
          </Button>
        )}
      </div>
      <div className="ac-chat-message-area">
        {messages.loading && !messages.items.length ? (
          <div className="ac-message-list">
            <CareLoad rows={2} />
          </div>
        ) : messages.error ? (
          <CareFailure message={messages.error} onRetry={messages.reload} />
        ) : (
          <div
            className="ac-message-list"
            aria-label="Conversation messages"
            tabIndex={-1}
            ref={messageListRef}
            onScroll={(event) => {
              const element = event.currentTarget;
              const nearBottom =
                element.scrollHeight -
                  element.scrollTop -
                  element.clientHeight <
                80;
              setAtBottom(nearBottom);
              if (nearBottom) setNewMessages(0);
            }}
          >
            {messages.items.length ? (
              messages.items.map((message, index) => {
                const repliedTo = messages.items.find(
                  (item) => item.id === message.inReplyToMessageId,
                );
                const day = new Date(message.createdAt).toLocaleDateString(
                  undefined,
                  { month: "long", day: "numeric", year: "numeric" },
                );
                const previousDay = index
                  ? new Date(
                      messages.items[index - 1].createdAt,
                    ).toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "";
                return (
                  <div className="ac-message-run" key={message.id}>
                    {day !== previousDay && (
                      <div className="ac-message-day">
                        <span>{day}</span>
                      </div>
                    )}
                    <article
                      className={`ac-message${message.senderUid === uid && message.senderAgencyKey === agencyKey ? " ac-message-mine" : ""}${message.id === selectedMessage ? " ac-message-target" : ""}`}
                      ref={
                        message.id === selectedMessage
                          ? selectedMessageRef
                          : undefined
                      }
                      tabIndex={message.id === selectedMessage ? -1 : undefined}
                      aria-label={
                        message.id === selectedMessage
                          ? "Message linked to your notification"
                          : undefined
                      }
                    >
                      <div className="ac-message-author">
                        <CareAvatar size="sm" name={sender(message)} />
                        <strong>{sender(message)}</strong>
                        <CareRoleBadge role={message.senderCareRole} />
                      </div>
                      {message.inReplyToMessageId && (
                        <blockquote className="ac-message-reply-context">
                          {repliedTo ? (
                            <>
                              <strong>{sender(repliedTo)}</strong>
                              <p>
                                {repliedTo.text.slice(0, 160)}
                                {repliedTo.text.length > 160 ? "…" : ""}
                              </p>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              onClick={() =>
                                viewMessage(message.inReplyToMessageId!)
                              }
                            >
                              <Reply size={14} aria-hidden="true" />
                              View referenced message
                            </Button>
                          )}
                        </blockquote>
                      )}
                      <p className="ac-preserve ac-message-body">
                        {message.text}
                      </p>
                      {Boolean(message.attachments?.length) && (
                        <div className="ac-message-files">
                          {message.attachments?.map((item) =>
                            item.kind === "care_update" ? (
                              <Button
                                key={item.versionId}
                                className="ac-message-file"
                                variant="outline"
                                asChild
                              >
                                <Link
                                  aria-label={`Open this version of ${item.title}`}
                                  to={`/agency-care/networks/${encodeURIComponent(network.id)}/updates?${new URLSearchParams({ agencyKey, submission: item.submissionId, version: item.versionId })}`}
                                >
                                  <FileText size={18} aria-hidden="true" />
                                  <span>
                                    <strong>{item.title}</strong>
                                    <small>Open this update version</small>
                                  </span>
                                </Link>
                              </Button>
                            ) : (
                              <Button
                                className="ac-message-file"
                                key={item.versionId}
                                variant="outline"
                                onClick={() => setPreview(item)}
                              >
                                <FileText size={18} aria-hidden="true" />
                                <span>
                                  <strong>{item.title}</strong>
                                  <small>View {item.fileName}</small>
                                </span>
                              </Button>
                            ),
                          )}
                        </div>
                      )}
                      <footer className="ac-message-footer">
                        <time
                          dateTime={message.createdAt}
                          title={careDate(message.createdAt)}
                        >
                          {new Date(message.createdAt).toLocaleTimeString(
                            undefined,
                            { hour: "numeric", minute: "2-digit" },
                          )}
                        </time>
                        {canSend && (
                          <Button
                            variant="ghost"
                            disabled={draftFrozen}
                            aria-label={`Reply to this message from ${sender(message)}`}
                            onClick={() => {
                              setReplyTo(message);
                              composerRef.current?.focus();
                            }}
                          >
                            <Reply size={14} aria-hidden="true" />
                            Reply
                          </Button>
                        )}
                      </footer>
                    </article>
                  </div>
                );
              })
            ) : (
              <CareEmpty title="No messages yet">
                Send the first message to this conversation’s permitted
                audience.
              </CareEmpty>
            )}
          </div>
        )}
        {(messages.history || !atBottom || newMessages > 0) &&
          !messages.loading && (
            <Button
              className="ac-chat-latest"
              aria-label={`Go to latest message${newMessages > 0 ? ` (${newMessages} new ${newMessages === 1 ? "message" : "messages"})` : ""}`}
              title="Go to latest message"
              onClick={() => {
                if (messages.history || selectedMessage) {
                  focusLatestAfterLoad.current = true;
                  showLatest();
                } else {
                  const element = messageListRef.current;
                  if (element) {
                    element.scrollTop = element.scrollHeight;
                    element.focus({ preventScroll: true });
                  }
                }
                setAtBottom(true);
                setNewMessages(0);
              }}
            >
              <ArrowDown size={19} aria-hidden="true" />
              {newMessages > 0 && (
                <span className="ac-chat-latest-count" aria-hidden="true">
                  {newMessages}
                </span>
              )}
            </Button>
          )}
      </div>
      {canSend && (
        <form
          className="ac-chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          {replyTo && (
            <div className="ac-reply-preview">
              <Reply size={17} aria-hidden="true" />
              <div>
                <strong>Replying to {sender(replyTo)}</strong>
                <p>
                  {replyTo.text.slice(0, 160)}
                  {replyTo.text.length > 160 ? "…" : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                disabled={draftFrozen}
                aria-label="Cancel reply"
                onClick={() => setReplyTo(null)}
              >
                <X size={16} aria-hidden="true" />
              </Button>
            </div>
          )}
          {attachments.length > 0 && (
            <ul className="ac-composer-attachments">
              {attachments.map((item) => (
                <li key={item.versionId}>
                  <FileText size={15} aria-hidden="true" />
                  <span>
                    {item.title} · {item.fileName}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={draftFrozen}
                    aria-label={`Remove ${item.title}`}
                    onClick={() =>
                      setAttachments((rows) =>
                        rows.filter((row) => row.versionId !== item.versionId),
                      )
                    }
                  >
                    <X size={14} aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="ac-composer-input">
            <label className="ac-field">
              <span className="sr-only">Message</span>
              <Textarea
                ref={composerRef}
                required
                rows={2}
                disabled={draftFrozen}
                value={text}
                maxLength={4000}
                aria-describedby={`care-message-hint-${conversation.id}`}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    (event.ctrlKey || event.metaKey) &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Write a care message…"
              />
            </label>
            <div className="ac-composer-toolbar">
              <Button
                type="button"
                variant="ghost"
                aria-label="Attach an approved version"
                title="Attach an approved version"
                disabled={draftFrozen || attachments.length >= 10}
                onClick={() => setAttachmentPicker(true)}
              >
                <Paperclip size={17} aria-hidden="true" />
              </Button>
              <small aria-label="Message length">
                {text.length.toLocaleString()} / 4,000
              </small>
              <Button
                type="submit"
                aria-label="Send message"
                aria-busy={mutation.saving}
                title={mutation.saving ? "Sending message" : "Send message"}
                disabled={!text.trim() || draftFrozen || messages.loading}
              >
                {mutation.saving ? (
                  <LoaderCircle
                    size={18}
                    aria-hidden="true"
                    className="motion-safe:animate-spin"
                  />
                ) : (
                  <Send size={18} aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
          <p className="sr-only" id={`care-message-hint-${conversation.id}`}>
            Enter for a new line · Ctrl or ⌘ + Enter to send
          </p>
          {mutation.error && (
            <CareNotice danger>
              <p>{mutation.error}</p>
              <div className="ac-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    mutation.reset();
                    setRetryRequested(true);
                  }}
                >
                  Retry same message
                </Button>
                {!mutation.uncertain && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      pendingMessage.current = null;
                      mutation.reset();
                    }}
                  >
                    Edit draft
                  </Button>
                )}
              </div>
            </CareNotice>
          )}
        </form>
      )}
      {(!hasCapability(conversation, "send") ||
        !hasCapability(network, "send")) && (
        <CareNotice>
          You can read this conversation. Ask your agency administrator for
          messaging access to reply.
        </CareNotice>
      )}
      <ProtectedDocumentPreview
        scope={scope}
        agencyKey={agencyKey}
        item={preview}
        onClose={() => setPreview(null)}
      />
      {attachmentPicker && (
        <ConversationAttachmentPicker
          network={network}
          scope={scope}
          agencyKey={agencyKey}
          conversation={conversation}
          selected={attachments.map((item) => item.versionId)}
          onClose={() => setAttachmentPicker(false)}
          onSelect={(item) => {
            setAttachments((rows) => [...rows, item]);
            setAttachmentPicker(false);
          }}
        />
      )}
    </section>
  );
}

function ConversationAttachmentPicker({
  network,
  scope,
  agencyKey,
  conversation,
  selected,
  onClose,
  onSelect,
}: Pick<CareWorkspaceProps, "network" | "scope" | "agencyKey"> & {
  conversation: CareConversation;
  selected: string[];
  onClose: () => void;
  onSelect: (item: {
    submissionId: string;
    versionId: string;
    fileName: string;
    title: string;
  }) => void;
}) {
  const [cursor, setCursor] = useState("");
  const [choice, setChoice] = useState("");
  const list = useScopedRequest(
    `${scope}|attachment-list|${cursor}`,
    (signal) =>
      agencyCareApi.attachmentCandidates(conversation.id, {
        agencyKey,
        cursor,
        signal,
      }),
  );
  const eligible =
    list.data?.items.filter((item) => !selected.includes(item.versionId)) || [];
  const item = eligible.find((row) => row.versionId === choice);
  const canSelect = Boolean(item && !list.error && !list.loading);
  return (
    <CareFormDialog
      className="ac-form-dialog"
      open
      title="Attach an approved document version"
      description={`${network.client.name} · Choose a version available to every current conversation recipient. Access is checked again when you send.`}
      onClose={onClose}
    >
      <div className="ac-dialog-form">
        <div className="ac-dialog-body ac-stack">
          {list.loading ? (
            <CareLoad rows={1} />
          ) : list.error ? (
            <CareFailure message={list.error} onRetry={list.reload} />
          ) : eligible.length ? (
            <fieldset className="ac-audience">
              <legend>Approved documents</legend>
              <div className="ac-audience-options">
                {eligible.map((row) => (
                  <label className="ac-audience-option" key={row.versionId}>
                    <input
                      type="radio"
                      name="care-attachment"
                      aria-label={`${row.title} · Version ${row.versionNumber} · ${row.fileName}`}
                      checked={choice === row.versionId}
                      onChange={() => setChoice(row.versionId)}
                    />
                    <span className="ac-row-icon" aria-hidden="true">
                      <FileText size={18} />
                    </span>
                    <span className="ac-audience-details">
                      <strong>{row.title}</strong>
                      <small>
                        Version {row.versionNumber} · {row.fileName}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <CareEmpty title="No eligible documents">
              Only approved documents in this client workspace with the required
              conversation audience appear here.
            </CareEmpty>
          )}
          <CarePager
            cursor={list.data?.nextCursor}
            onNext={(value) => {
              setChoice("");
              setCursor(value);
            }}
          />
        </div>
        <div className="ac-dialog-footer">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSelect}
            onClick={() => {
              if (canSelect && item)
                onSelect({
                  submissionId: item.submissionId,
                  versionId: item.versionId,
                  title: `${item.title} · Version ${item.versionNumber}`,
                  fileName: item.fileName,
                });
            }}
          >
            Attach this exact version
          </Button>
        </div>
      </div>
    </CareFormDialog>
  );
}

function NewConversation({
  network,
  scope,
  agencyKey,
  onClose,
  onCreated,
}: CareWorkspaceProps & {
  onClose: () => void;
  onCreated: (item: CareConversation) => void;
}) {
  const { uid } = useAgencyCare();
  const [recipientCursor, setRecipientCursor] = useState("");
  const candidates = useScopedRequest(
    `${scope}|conversation-recipients|${recipientCursor}`,
    (signal) =>
      agencyCareApi.relationships(network.id, {
        agencyKey,
        cursor: recipientCursor,
        signal,
      }),
  );
  const [title, setTitle] = useState("");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [type, setType] = useState<"direct" | "group">("direct");
  const [members, setMembers] = useState<
    Array<{ uid: string; agencyKey: string; name: string; agencyName: string }>
  >([]);
  const [error, setError] = useState("");
  const mutation = useScopedMutation(`${scope}|create-conversation`);
  const pendingCreate = useRef<{
    title: string;
    type: "direct" | "group";
    members: Array<{ uid: string; agencyKey: string }>;
  } | null>(null);
  const [retryRequested, setRetryRequested] = useState(false);
  const frozen = mutation.saving || Boolean(pendingCreate.current);
  const currentMembers =
    candidates.data?.items
      .filter((item) => item.state === "active")
      .flatMap((item) =>
        (item.members || [])
          .filter(
            (member) =>
              member.canMessage === true ||
              (member.canMessage === undefined &&
                member.capabilities?.includes("send")),
          )
          .map((member) => ({
            ...member,
            agencyKey: item.agencyKey,
            agencyName: item.name,
          })),
      )
      .filter((item) => !(item.uid === uid && item.agencyKey === agencyKey)) ||
    [];
  const matchingMembers = currentMembers.filter((item) =>
    `${item.name} ${item.agencyName}`
      .toLocaleLowerCase()
      .includes(recipientQuery.trim().toLocaleLowerCase()),
  );
  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (mutation.saving || mutation.uncertain) return;
    setError("");
    if (
      !members.length ||
      members.length > 49 ||
      (type === "direct" && members.length !== 1)
    ) {
      setError(
        "Choose one recipient for a direct conversation or permitted recipients for a group.",
      );
      return;
    }
    pendingCreate.current ||= {
      title: title.trim(),
      type,
      members: members.map((item) => ({
        uid: item.uid,
        agencyKey: item.agencyKey,
      })),
    };
    const payload = pendingCreate.current;
    const saved = await mutation.run(
      (operationId, signal) =>
        agencyCareApi.createConversation(
          network.id,
          { ...payload, operationId },
          { agencyKey, signal },
        ),
      { title: "Conversation created" },
    );
    if (saved) {
      pendingCreate.current = null;
      onCreated(saved);
    }
  }
  useEffect(() => {
    if (retryRequested && !mutation.uncertain && !mutation.saving) {
      setRetryRequested(false);
      void submit();
    }
  }, [retryRequested, mutation.uncertain, mutation.saving]);
  return (
    <CareFormDialog
      className="ac-form-dialog"
      open
      title="New client conversation"
      description={network.client.name}
      onClose={onClose}
      busy={mutation.saving || mutation.uncertain}
    >
      <form className="ac-dialog-form" onSubmit={(event) => void submit(event)}>
        <fieldset className="ac-dialog-body ac-stack" disabled={frozen}>
          <label className="ac-field">
            <span>Conversation title</span>
            <Input
              required
              value={title}
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="ac-field">
            <span>Conversation type</span>
            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value as typeof type);
                setMembers([]);
              }}
            >
              <option value="direct">Direct</option>
              <option value="group">Group</option>
            </select>
          </label>
          <fieldset className="ac-audience">
            <legend>Currently permitted recipients</legend>
            {currentMembers.length > 0 && (
              <label className="ac-field">
                <span className="sr-only">Search permitted recipients</span>
                <Input
                  aria-label="Search permitted recipients"
                  placeholder="Search by name or agency…"
                  value={recipientQuery}
                  onChange={(event) => setRecipientQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.nativeEvent.isComposing)
                      event.preventDefault();
                  }}
                />
              </label>
            )}
            {candidates.loading ? (
              <CareLoad rows={1} />
            ) : candidates.error ? (
              <CareFailure
                message={candidates.error}
                onRetry={candidates.reload}
              />
            ) : currentMembers.length ? (
              <div className="ac-audience-options">
                {matchingMembers.map((item) => {
                  const key = `${item.agencyKey}|${item.uid}`;
                  const checked = members.some(
                    (member) =>
                      member.agencyKey === item.agencyKey &&
                      member.uid === item.uid,
                  );
                  return (
                    <label className="ac-audience-option" key={key}>
                      <input
                        type={type === "direct" ? "radio" : "checkbox"}
                        name="conversation-recipient"
                        aria-label={`${item.name} · ${item.agencyName}`}
                        checked={checked}
                        disabled={
                          type === "group" && members.length >= 49 && !checked
                        }
                        onChange={(event) =>
                          setMembers((current) =>
                            type === "direct"
                              ? [item]
                              : event.target.checked
                                ? current.length < 49
                                  ? [...current, item]
                                  : current
                                : current.filter(
                                    (value) =>
                                      !(
                                        value.agencyKey === item.agencyKey &&
                                        value.uid === item.uid
                                      ),
                                  ),
                          )
                        }
                      />
                      <CareAvatar size="sm" name={item.name} />
                      <span className="ac-audience-details">
                        <strong>{item.name}</strong>
                        <small>{item.agencyName}</small>
                      </span>
                    </label>
                  );
                })}
                {!matchingMembers.length && (
                  <CareEmpty title="No matching recipients">
                    Try another name or agency.
                  </CareEmpty>
                )}
                <small className="ac-muted">
                  {members.length} selected · {currentMembers.length} recipients
                  on this page. Groups support up to 49 recipients.
                </small>
              </div>
            ) : (
              <CareEmpty title="No permitted recipients">
                Your agency administrator must grant care users access before
                they can join this conversation.
              </CareEmpty>
            )}
          </fieldset>
          <CarePager
            cursor={candidates.data?.nextCursor}
            onNext={(value) => {
              setRecipientCursor(value);
              setRecipientQuery("");
            }}
          />
          {recipientCursor && (
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setRecipientCursor("");
                setRecipientQuery("");
              }}
            >
              Back to first recipient page
            </Button>
          )}
          {members.length > 0 && (
            <div className="ac-selected-recipients">
              <strong>Selected recipients ({members.length})</strong>
              <ul>
                {members.map((item) => (
                  <li key={`${item.agencyKey}|${item.uid}`}>
                    <span>
                      {item.name} · {item.agencyName}
                    </span>
                    <Button
                      variant="ghost"
                      type="button"
                      aria-label={`Remove recipient ${item.name}`}
                      onClick={() =>
                        setMembers((current) =>
                          current.filter(
                            (member) =>
                              !(
                                member.uid === item.uid &&
                                member.agencyKey === item.agencyKey
                              ),
                          ),
                        )
                      }
                    >
                      <X size={14} aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {error && <CareNotice danger>{error}</CareNotice>}
        </fieldset>
        {mutation.error && (
          <div className="ac-dialog-feedback">
            <CareNotice danger>
              <p>{mutation.error}</p>
              {mutation.uncertain && (
                <p>
                  Retrying confirms the original request without creating a
                  second conversation.
                </p>
              )}
              <div className="ac-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    mutation.reset();
                    setRetryRequested(true);
                  }}
                >
                  Retry same conversation
                </Button>
                {!mutation.uncertain && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      pendingCreate.current = null;
                      mutation.reset();
                    }}
                  >
                    Edit conversation draft
                  </Button>
                )}
              </div>
            </CareNotice>
          </div>
        )}
        <div className="ac-dialog-footer">
          <Button
            type="button"
            variant="outline"
            disabled={mutation.saving || mutation.uncertain}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              frozen ||
              candidates.loading ||
              Boolean(candidates.error) ||
              !members.length ||
              !title.trim()
            }
          >
            {mutation.saving && (
              <LoaderCircle
                size={16}
                aria-hidden="true"
                className="motion-safe:animate-spin"
              />
            )}
            {mutation.saving ? "Creating conversation…" : "Create conversation"}
          </Button>
        </div>
      </form>
    </CareFormDialog>
  );
}
