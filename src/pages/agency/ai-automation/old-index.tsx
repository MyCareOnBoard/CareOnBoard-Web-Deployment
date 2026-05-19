import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
  ChevronUp,
  Paperclip,
  Mic,
  Clock,
  CheckCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useListConversationsQuery,
  useCreateConversationMutation,
  useLazyGetConversationQuery,
  useSendMessageMutation,
  useDeleteConversationMutation,
  type AIMessage,
  type DSPSuggestion,
} from "./api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Conversation } from "./api";

const MAX_CHARS = 500;

const QUICK_ACTIONS = [
  "Find available DSPs for today's shifts",
  "List all unassigned shifts this week",
  "Show agency overview",
  "List pending incidents",
  "List clients",
];

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: DSPSuggestion[];
  actions?: Array<{ type: string; outcome: string }>;
  isLoading?: boolean;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function reliabilityColor(r: string) {
  if (r === "High") return "text-emerald-600";
  if (r === "Medium") return "text-amber-500";
  return "text-red-500";
}

// ─── DSP Suggestion Cards ────────────────────────────────────────────────────

function DSPCard({
  suggestion,
  onAssign,
}: {
  suggestion: DSPSuggestion;
  onAssign?: (s: DSPSuggestion) => void;
}) {
  return (
    <div
      className="bg-white border border-[#e5e7eb] rounded-xl p-3 flex flex-col gap-1.5 cursor-pointer hover:border-[#00b4b8] hover:shadow-sm transition-all"
      onClick={() => onAssign?.(suggestion)}
    >
      <div className="flex items-center gap-2">
        <Avatar className="w-8 h-8 text-xs">
          <AvatarImage src="" />
          <AvatarFallback className="bg-[#e0f7f7] text-[#00b4b8] font-semibold text-[11px]">
            {getInitials(suggestion.fullName)}
          </AvatarFallback>
        </Avatar>
        <span className="font-semibold text-[13px] text-[#10141a]">{suggestion.fullName}</span>
      </div>
      <div className="text-[12px] text-[#6b7280]">
        <span className="text-[#10141a] font-medium">Reliability: </span>
        <span className={cn("font-semibold", reliabilityColor(suggestion.reliability))}>
          {suggestion.reliability}
        </span>
      </div>
      <div className="text-[12px] text-[#6b7280]">
        <span className="text-[#10141a] font-medium">Last shift: </span>
        {suggestion.lastShift}
      </div>
    </div>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  onAssignDSP,
}: {
  msg: LocalMessage;
  onAssignDSP?: (s: DSPSuggestion, msg: LocalMessage) => void;
}) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] px-4 py-3 bg-[#10141a] text-white rounded-tl-2xl rounded-tr-sm rounded-br-2xl rounded-bl-2xl text-[14px] leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-[#e0f7f7] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4 text-[#00b4b8]" />
      </div>
      <div className="flex-1 min-w-0">
        {msg.isLoading ? (
          <div className="px-4 py-3 bg-[#f3f4f6] rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl inline-block">
            <div className="flex items-center h-4 gap-1">
              <span className="w-1.5 h-1.5 bg-[#00b4b8] rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-[#00b4b8] rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-[#00b4b8] rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 bg-[#f3f4f6] rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl text-[14px] leading-relaxed text-[#10141a] whitespace-pre-wrap">
              {msg.content}
            </div>

            {msg.actions && msg.actions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {msg.actions.map((action, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    {action.outcome}
                  </div>
                ))}
              </div>
            )}

            {msg.suggestions && msg.suggestions.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {msg.suggestions.map((s) => (
                  <DSPCard
                    key={s.employeeId}
                    suggestion={s}
                    onAssign={(sug) => onAssignDSP?.(sug, msg)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Conversations Sidebar ────────────────────────────────────────────────────

function ConversationsSidebar({
  open,
  onClose,
  activeId,
  onSelect,
  onNew,
}: {
  open: boolean;
  onClose: () => void;
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const { data, isLoading } = useListConversationsQuery(undefined, { skip: !open });
  const [deleteConversation] = useDeleteConversationMutation();

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteConversation(id).unwrap();
      if (activeId === id) onNew();
      toast.success("Conversation deleted");
    } catch {
      toast.error("Failed to delete conversation");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conversations</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto -mx-2 px-2">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-14 rounded-xl" />
            ))}
          {!isLoading && (!data?.conversations || data.conversations.length === 0) && (
            <p className="text-[14px] text-[#6b7280] text-center py-8">No conversations yet</p>
          )}
          {data?.conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => { onSelect(conv.id); onClose(); }}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer group transition-colors",
                activeId === conv.id
                  ? "bg-[#e0f7f7] text-[#00b4b8]"
                  : "hover:bg-[#f3f4f6] text-[#10141a]"
              )}
            >
              <MessageSquare className="flex-shrink-0 w-4 h-4 opacity-60" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{conv.title || "New conversation"}</p>
                <p className="text-[11px] text-[#6b7280]">{conv.messageCount} messages</p>
              </div>
              <button
                onClick={(e) => handleDelete(e, conv.id)}
                className="p-1 transition-opacity rounded opacity-0 group-hover:opacity-100 hover:text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <Button onClick={() => { onNew(); onClose(); }} className="w-full mt-2">
          <Plus className="w-4 h-4" />
          New conversation
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onQuickAction }: { onQuickAction: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#e0f7f7] flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-[#00b4b8]" />
      </div>
      <div>
        <h2 className="text-[20px] font-bold text-[#10141a] mb-2">
          What can I help you with?
        </h2>
        <p className="text-[14px] text-[#6b7280]">
          Ask me anything about shifts, DSPs, clients, incidents, billing, and more.
        </p>
      </div>
      <div className="flex flex-wrap justify-center max-w-lg gap-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action}
            onClick={() => onQuickAction(action)}
            className="text-[13px] px-4 py-2 rounded-full border border-[#e5e7eb] bg-white hover:border-[#00b4b8] hover:text-[#00b4b8] transition-colors text-[#374151]"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AIAutomationPage() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showConversations, setShowConversations] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [createConversation] = useCreateConversationMutation();
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [fetchConversation] = useLazyGetConversationQuery();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setMessages([]);
    setInputValue("");
    textareaRef.current?.focus();
  }, []);

  const loadConversation = useCallback(
    async (id: string) => {
      setActiveConversationId(id);
      setMessages([]);
      try {
        const result = await fetchConversation(id).unwrap();
        if (result.messages) {
          setMessages(
            result.messages.map((m: AIMessage) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              suggestions: m.suggestions,
              actions: m.actions,
            }))
          );
        }
      } catch {
        toast.error("Failed to load conversation");
      }
    },
    [fetchConversation]
  );

  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text ?? inputValue).trim();
      if (!content || isSending) return;

      setInputValue("");
      setShowQuickActions(false);

      let conversationId = activeConversationId;

      // Create conversation on first message
      if (!conversationId) {
        try {
          const res = await createConversation({}).unwrap();
          conversationId = res.id;
          setActiveConversationId(conversationId);
        } catch {
          toast.error("Failed to start conversation");
          return;
        }
      }

      const userMsg: LocalMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      };
      const loadingMsg: LocalMessage = {
        id: `loading-${Date.now()}`,
        role: "assistant",
        content: "",
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);

      try {
        const res = await sendMessage({ conversationId, message: content }).unwrap();
        setMessages((prev) =>
          prev
            .filter((m) => !m.isLoading)
            .concat({
              id: res.id,
              role: "assistant",
              content: res.content,
              suggestions: res.suggestions,
              actions: res.actions,
            })
        );
      } catch {
        setMessages((prev) =>
          prev
            .filter((m) => !m.isLoading)
            .concat({
              id: `err-${Date.now()}`,
              role: "assistant",
              content: "Sorry, something went wrong. Please try again.",
            })
        );
      }
    },
    [inputValue, isSending, activeConversationId, createConversation, sendMessage]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAssignDSP = useCallback(
    (suggestion: DSPSuggestion) => {
      handleSend(`Assign ${suggestion.fullName} to this shift`);
    },
    [handleSend]
  );

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 mb-5">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">AI Automation</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 rounded-[60px] border-[#e5e7eb] text-[#374151] hover:border-[#00b4b8] hover:text-[#00b4b8]"
            onClick={() => setShowConversations(true)}
          >
            <Clock className="w-4 h-4" />
            Conversations
          </Button>
          <Button
            onClick={startNewConversation}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New conversation
          </Button>
        </div>
      </div>

      {/* Chat container */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden shadow-sm min-h-0">
        {/* Messages area */}
        <div className="flex-1 min-h-0 p-6 space-y-4 overflow-y-auto">
          {messages.length === 0 ? (
            <EmptyState onQuickAction={(text) => handleSend(text)} />
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} onAssignDSP={handleAssignDSP} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-[#e5e7eb] p-4 flex-shrink-0">
          {/* Quick actions dropdown */}
          {showQuickActions && (
            <div className="mb-3 bg-white border border-[#e5e7eb] rounded-xl shadow-lg overflow-hidden">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  onClick={() => handleSend(action)}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[#374151] hover:bg-[#f3f4f6] transition-colors flex items-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5 text-[#00b4b8]" />
                  {action}
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={handleKeyDown}
              placeholder="Talk to me, how can I help you today?"
              rows={2}
              className="w-full resize-none text-[14px] text-[#10141a] placeholder:text-[#9ca3af] focus:outline-none leading-relaxed pr-2"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1">
                <button className="flex items-center gap-1.5 text-[13px] text-[#6b7280] hover:text-[#374151] px-3 py-1.5 rounded-lg hover:bg-[#f3f4f6] transition-colors">
                  <Paperclip className="w-4 h-4" />
                  Add attachment
                </button>
                <button
                  onClick={() => setShowQuickActions((v) => !v)}
                  className={cn(
                    "flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg transition-colors",
                    showQuickActions
                      ? "text-[#00b4b8] bg-[#e0f7f7]"
                      : "text-[#6b7280] hover:text-[#374151] hover:bg-[#f3f4f6]"
                  )}
                >
                  <Zap className="w-4 h-4" />
                  Take action
                  <ChevronUp
                    className={cn("w-3 h-3 transition-transform", showQuickActions && "rotate-180")}
                  />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#9ca3af]">
                  {inputValue.length}/{MAX_CHARS}
                </span>
                <button className="text-[#9ca3af] hover:text-[#6b7280] transition-colors p-1">
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isSending}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    inputValue.trim() && !isSending
                      ? "bg-[#00b4b8] hover:bg-[#00a0a4] text-white shadow-sm"
                      : "bg-[#e5e7eb] text-[#9ca3af] cursor-not-allowed"
                  )}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conversations sidebar */}
      <ConversationsSidebar
        open={showConversations}
        onClose={() => setShowConversations(false)}
        activeId={activeConversationId}
        onSelect={loadConversation}
        onNew={startNewConversation}
      />
    </div>
  );
}
