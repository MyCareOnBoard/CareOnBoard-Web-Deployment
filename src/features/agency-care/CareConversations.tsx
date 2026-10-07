import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  agencyCareApi,
  type CareMessage,
  type CareConversation,
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
  CareEmpty,
  CareFailure,
  CareFormDialog,
  CareHeading,
  CareLoad,
  CareNotice,
  CarePager,
  CarePanel,
  CareStatus,
  careDate,
} from "./ui";

export function useActiveConversation(
  scope: string,
  conversationId: string,
  agencyKey: string,
) {
  const key = `${scope}|${conversationId}`;
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
          ...(initial ? {} : { afterSequence: latest }),
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
        setState((previous) => ({
          key,
          items: messages.current,
          cursor: initial ? page.nextCursor : previous.cursor,
          loading: false,
          history: false,
        }));
      } catch (error) {
        if (
          !controller.signal.aborted &&
          !pending.signal.aborted &&
          currentKey.current === key
        ) {
          messages.current = [];
          setState({
            key,
            items: [],
            cursor: null,
            loading: false,
            history: false,
            error: careError(error),
          });
        }
      } finally {
        if (request !== pending) return;
        request = null;
        if (
          !controller.signal.aborted &&
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
  }, [key, conversationId, agencyKey, revision]);
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
        if (olderController.current !== controller || currentKey.current !== key)
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
  const selected = search.get("conversation") || "";
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
  return (
    <div className="ac-stack">
      <CareHeading
        title="Conversations"
        description="Communicate within this client’s authorized care audience."
        actions={
          hasCapability(network, "send") && (
            <Button onClick={() => setCreate(true)}>New conversation</Button>
          )
        }
      />
      {list.loading ? (
        <CareLoad />
      ) : list.error ? (
        <CareFailure message={list.error} onRetry={list.reload} />
      ) : (
        <div className="ac-chat-grid">
          <CarePanel title="Client conversations">
            {list.data?.items.length ? (
              <ul className="ac-list">
                {list.data.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="ac-row-link"
                      aria-current={item.id === selected ? "true" : undefined}
                      onClick={() => setSearch({ conversation: item.id })}
                    >
                      <strong>{item.title}</strong>
                      <small>
                        {item.type}{" "}
                        {item.unreadCount ? `· ${item.unreadCount} unread` : ""}
                      </small>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <CareEmpty title="No conversations yet">
                Start a conversation with currently permitted care users.
              </CareEmpty>
            )}
            <CarePager cursor={list.data?.nextCursor} onNext={setCursor} />
          </CarePanel>
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
            />
          ) : selected ? (
            <CareNotice>
              This conversation is unavailable in this client workspace.
            </CareNotice>
          ) : (
            <CareEmpty title="Choose a conversation">
              Messages and file previews load when you open a conversation.
            </CareEmpty>
          )}
        </div>
      )}
      {create && (
        <NewConversation
          {...props}
          onClose={() => setCreate(false)}
          onCreated={(item) => {
            setCreate(false);
            setCursor("");
            list.reload();
            setSearch({ conversation: item.id });
          }}
        />
      )}
    </div>
  );
}

function ConversationThread({
  network,
  scope,
  agencyKey,
  conversation,
}: CareWorkspaceProps & { conversation: CareConversation }) {
  const { uid, me } = useAgencyCare();
  const messages = useActiveConversation(scope, conversation.id, agencyKey);
  const mutation = useScopedMutation(`${scope}|${conversation.id}`);
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
        if (!controller.signal.aborted) lastRead.current = latest;
      })
      .catch(() => {});
    return () => controller.abort();
  }, [
    conversation.id,
    agencyKey,
    messages.items,
    messages.loading,
    messages.error,
  ]);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim() || text.length > 4000) return;
    const sent = await mutation.run((operationId, signal) =>
      agencyCareApi.sendMessage(
        conversation.id,
        {
          text: text.trim(),
          operationId,
          ...(replyTo ? { inReplyToMessageId: replyTo.id } : {}),
          ...(attachments.length
            ? {
                attachmentVersionIds: attachments.map((item) => item.versionId),
              }
            : {}),
        },
        { agencyKey, signal },
      ),
    );
    if (sent) {
      setText("");
      setReplyTo(null);
      setAttachments([]);
      messages.reload();
    }
  }
  const canSend =
    hasCapability(conversation, "send") &&
    hasCapability(network, "send") &&
    !messages.error;
  return (
    <CarePanel
      title={conversation.title}
      actions={<CareStatus>{conversation.type}</CareStatus>}
    >
      <div className="ac-stack">
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
          <Button variant="outline" onClick={() => void messages.older()}>
            Load earlier messages
          </Button>
        )}
        {messages.history && (
          <CareNotice>
            Viewing an earlier message page.
            <Button variant="outline" onClick={messages.reload}>
              Return to latest messages
            </Button>
          </CareNotice>
        )}
        {messages.loading ? (
          <CareLoad rows={2} />
        ) : messages.error ? (
          <CareFailure message={messages.error} onRetry={messages.reload} />
        ) : (
          <div className="ac-message-list" aria-label="Conversation messages">
            {messages.items.length ? (
              messages.items.map((message) => (
                <article
                  className={`ac-message${message.senderUid === uid && message.senderAgencyKey === agencyKey ? " ac-message-mine" : ""}`}
                  key={message.id}
                >
                  <strong>
                    {message.senderName ||
                      (message.senderUid === uid ? "You" : "Care team member")}
                  </strong>
                  {message.inReplyToMessageId && (
                    <small>Response to a shared request</small>
                  )}
                  <p className="ac-preserve">{message.text}</p>
                  {message.attachments?.map((item) => (
                    <Button
                      key={item.versionId}
                      variant="outline"
                      onClick={() => setPreview(item)}
                    >
                      View {item.fileName}
                    </Button>
                  ))}
                  <small>{careDate(message.createdAt)}</small>
                  {canSend && (
                    <Button variant="ghost" onClick={() => setReplyTo(message)}>
                      Reply to this message
                    </Button>
                  )}
                </article>
              ))
            ) : (
              <CareEmpty title="No messages yet">
                Send the first message to this conversation’s permitted
                audience.
              </CareEmpty>
            )}
          </div>
        )}
        {canSend && (
          <form className="ac-stack" onSubmit={(event) => void send(event)}>
            {replyTo && (
              <CareNotice>
                Replying to {replyTo.senderName || "the selected care message"}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setReplyTo(null)}
                >
                  Cancel reply
                </Button>
              </CareNotice>
            )}
            <label className="ac-field">
              <span>Message</span>
              <Textarea
                required
                value={text}
                maxLength={4000}
                onChange={(event) => setText(event.target.value)}
                placeholder="Write a care message…"
              />
            </label>
            <div className="ac-actions">
              <Button
                type="button"
                variant="outline"
                disabled={mutation.saving || attachments.length >= 10}
                onClick={() => setAttachmentPicker(true)}
              >
                Attach an approved version
              </Button>
              {attachments.map((item) => (
                <div className="ac-actions" key={item.versionId}>
                  <span>
                    {item.title} · {item.fileName}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={mutation.saving}
                    onClick={() =>
                      setAttachments((rows) =>
                        rows.filter((row) => row.versionId !== item.versionId),
                      )
                    }
                  >
                    Remove {item.title}
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="submit"
              disabled={!text.trim() || mutation.saving || mutation.uncertain}
            >
              {mutation.saving ? "Sending…" : "Send message"}
            </Button>
          </form>
        )}
        {mutation.error && (
          <CareFailure
            message={mutation.error}
            onRetry={() => {
              messages.reload();
              mutation.reset();
            }}
          />
        )}
      </div>
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
    </CarePanel>
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
      open
      title="Attach an approved document version"
      description={`${network.client.name} · Choose a version available to every current conversation recipient. Access is checked again when you send.`}
      onClose={onClose}
    >
      <div className="ac-stack">
        {list.loading ? (
          <CareLoad rows={1} />
        ) : list.error ? (
          <CareFailure message={list.error} onRetry={list.reload} />
        ) : eligible.length ? (
          <fieldset className="ac-check-list">
            <legend>Approved documents</legend>
            {eligible.map((row) => (
              <label key={row.versionId}>
                <input
                  type="radio"
                  name="care-attachment"
                  checked={choice === row.versionId}
                  onChange={() => setChoice(row.versionId)}
                />
                <span>
                  {row.title} · Version {row.versionNumber} · {row.fileName}
                </span>
              </label>
            ))}
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
        <div className="ac-actions">
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
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
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
  const candidates = useScopedRequest(
    `${scope}|conversation-recipients`,
    (signal) => agencyCareApi.relationships(network.id, { agencyKey, signal }),
  );
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"direct" | "group">("direct");
  const [members, setMembers] = useState<string[]>([]);
  const [error, setError] = useState("");
  const mutation = useScopedMutation(`${scope}|create-conversation`);
  const currentMembers =
    candidates.data?.items
      .filter((item) => item.state === "active")
      .flatMap((item) =>
        (item.members || []).map((member) => ({
          ...member,
          agencyKey: item.agencyKey,
          agencyName: item.name,
        })),
      )
      .filter((item) => !(item.uid === uid && item.agencyKey === agencyKey)) ||
    [];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const selected = currentMembers.filter((item) =>
      members.includes(`${item.agencyKey}|${item.uid}`),
    );
    if (!selected.length || (type === "direct" && selected.length !== 1)) {
      setError(
        "Choose one recipient for a direct conversation or permitted recipients for a group.",
      );
      return;
    }
    const saved = await mutation.run((operationId, signal) =>
      agencyCareApi.createConversation(
        network.id,
        {
          title: title.trim(),
          type,
          members: selected.map((item) => ({
            uid: item.uid,
            agencyKey: item.agencyKey,
          })),
          operationId,
        },
        { agencyKey, signal },
      ),
    );
    if (saved) onCreated(saved);
  }
  return (
    <CareFormDialog
      open
      title="New client conversation"
      description={network.client.name}
      onClose={onClose}
      busy={mutation.saving}
    >
      <form className="ac-stack" onSubmit={(event) => void submit(event)}>
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
        <fieldset>
          <legend>Currently permitted recipients</legend>
          {candidates.loading ? (
            <CareLoad rows={1} />
          ) : candidates.error ? (
            <CareFailure
              message={candidates.error}
              onRetry={candidates.reload}
            />
          ) : currentMembers.length ? (
            <div className="ac-check-list">
              {currentMembers.map((item) => {
                const key = `${item.agencyKey}|${item.uid}`;
                return (
                  <label key={key}>
                    <input
                      type={type === "direct" ? "radio" : "checkbox"}
                      name="conversation-recipient"
                      checked={members.includes(key)}
                      onChange={(event) =>
                        setMembers((current) =>
                          type === "direct"
                            ? [key]
                            : event.target.checked
                              ? [...current, key]
                              : current.filter((value) => value !== key),
                        )
                      }
                    />
                    <span>
                      {item.name} · {item.agencyName}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <CareEmpty title="No permitted recipients">
              Your agency administrator must grant care users access before they
              can join this conversation.
            </CareEmpty>
          )}
        </fieldset>
        {(error || mutation.error) && (
          <CareNotice danger>{error || mutation.error}</CareNotice>
        )}
        <div className="ac-actions">
          <Button
            type="submit"
            disabled={
              mutation.saving || mutation.uncertain || !currentMembers.length
            }
          >
            Create conversation
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={mutation.saving}
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </form>
    </CareFormDialog>
  );
}
