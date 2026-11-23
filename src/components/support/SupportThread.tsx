import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { BookOpen, Bot, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupportMessage, SupportStatus } from "@/lib/api/support";

export function formatTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" }) + ", " + date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function relativeDue(value: string | null | undefined) {
  if (!value) return null;
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60000);
  const span = (m: number) => (m >= 120 ? `${Math.round(m / 60)} h` : m >= 60 ? "1 h" : `${m} min`);
  return minutes < 0 ? `${span(-minutes)} overdue` : `due in ${span(minutes)}`;
}

const STATUS_STYLES: Record<SupportStatus, string> = {
  ai: "bg-[#e3f6f6] text-[#00686b] dark:bg-[#00686b]/25 dark:text-[#7fd3d3]",
  waiting: "bg-[#fff4e0] text-[#8a5300] dark:bg-[#8a5300]/25 dark:text-[#f5c779]",
  pending_user: "bg-[#eef1ff] text-[#3446a8] dark:bg-[#3446a8]/25 dark:text-[#aab6ff]",
  resolved: "bg-[#edf1f2] text-[#5d6b73] dark:bg-white/10 dark:text-[#9aa4a8]",
};

export function StatusChip({ status, label, className }: { status: SupportStatus; label: string; className?: string }) {
  return <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-medium", STATUS_STYLES[status], className)}>{label}</span>;
}

export function PriorityChip({ priority }: { priority: string }) {
  if (priority === "normal") return null;
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold", priority === "urgent" ? "bg-[#fde8e8] text-[#b42318] dark:bg-[#b42318]/25 dark:text-[#ffb4ab]" : "bg-[#fff4e0] text-[#8a5300] dark:bg-[#8a5300]/25 dark:text-[#f5c779]")}>
      {priority === "urgent" ? "Urgent" : "High"}
    </span>
  );
}

/**
 * The messages of a support case. `viewer` decides which side a message sits on:
 * the requester sees their own messages on the right; agents see the team's there.
 */
export function SupportThread({ messages, viewer, renderAfter, className }: {
  messages: SupportMessage[];
  viewer: "requester" | "agent";
  /** Extra content under a message, such as the "Did this answer it?" buttons. */
  renderAfter?: (message: SupportMessage, index: number) => ReactNode;
  className?: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages.length]);

  return (
    <ol className={cn("flex flex-col gap-3", className)} aria-label="Conversation">
      {messages.map((message, index) => {
        if (message.senderType === "system") {
          return (
            <li key={message.id} className="mx-auto max-w-[520px] rounded-[10px] bg-[#f4f6f7] px-3 py-2 text-center text-[12.5px] leading-relaxed text-[#5d6b73] dark:bg-white/5 dark:text-[#9aa4a8]">
              {message.content}
            </li>
          );
        }
        const mine = viewer === "requester" ? message.senderType === "user" : message.senderType === "agent";
        const ai = message.senderType === "ai";
        return (
          <li key={message.id} className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
            <span className="flex items-center gap-1.5 px-1 text-[11.5px] text-[#5d6b73] dark:text-[#9aa4a8]">
              {ai && <Bot aria-hidden="true" className="h-3.5 w-3.5 text-[#007679] dark:text-[#7fd3d3]" />}
              {mine && viewer === "requester" ? "You" : message.senderName}
              <span aria-hidden="true">·</span>
              <time dateTime={message.createdAt ?? undefined}>{formatTime(message.createdAt)}</time>
            </span>
            <div className={cn(
              "max-w-[min(560px,88%)] whitespace-pre-wrap break-words rounded-[14px] px-3.5 py-2.5 text-[14px] leading-relaxed",
              mine ? "rounded-br-[4px] bg-[#007679] text-white" : ai ? "rounded-bl-[4px] border border-[#cfeaea] bg-[#f2fbfb] text-[#10141a] dark:border-[#00686b]/50 dark:bg-[#00686b]/15 dark:text-[#f4f6f7]" : "rounded-bl-[4px] bg-[#f1f3f4] text-[#10141a] dark:bg-white/10 dark:text-[#f4f6f7]",
            )}>
              {message.content}
              {ai && !!message.aiMeta?.sources?.length && (
                <div className="mt-2 border-t border-[#cfeaea] pt-2 dark:border-[#00686b]/50">
                  <p className="text-[11.5px] font-medium text-[#5d6b73] dark:text-[#9aa4a8]">From the help articles</p>
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {message.aiMeta.sources.map((source) => (
                      <li key={source.id} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[12px] text-[#00686b] dark:bg-white/10 dark:text-[#7fd3d3]">
                        <BookOpen aria-hidden="true" className="h-3 w-3" />{source.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {renderAfter?.(message, index)}
          </li>
        );
      })}
      <div ref={endRef} />
    </ol>
  );
}

/** A message box: Enter sends, Shift+Enter adds a line. */
export function SupportComposer({ onSend, placeholder, disabled, busy, label = "Message", initialValue, accessory, tone = "default" }: {
  onSend: (text: string) => Promise<boolean | void> | boolean | void;
  placeholder?: string;
  disabled?: boolean;
  busy?: boolean;
  label?: string;
  initialValue?: string;
  accessory?: ReactNode;
  tone?: "default" | "note";
}) {
  const [text, setText] = useState(initialValue ?? "");
  const inputId = useId();
  useEffect(() => {
    if (initialValue !== undefined) setText(initialValue);
  }, [initialValue]);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const value = text.trim();
    if (!value || disabled || busy) return;
    const result = await onSend(value);
    if (result !== false) setText("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <form onSubmit={submit} className={cn("rounded-[14px] border p-2", tone === "note" ? "border-[#f1d58a] bg-[#fffaeb] dark:border-[#8a5300]/60 dark:bg-[#8a5300]/10" : "border-[#e3e8ea] bg-white dark:border-white/15 dark:bg-[#1b232b]")}>
      <label className="sr-only" htmlFor={inputId}>{label}</label>
      <textarea
        id={inputId}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={onKeyDown}
        rows={2}
        maxLength={4000}
        disabled={disabled}
        placeholder={placeholder}
        className="block max-h-40 min-h-[44px] w-full resize-y bg-transparent px-1.5 py-1 text-[14px] text-[#10141a] outline-none placeholder:text-[#8a969c] disabled:cursor-not-allowed dark:text-[#f4f6f7]"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-2">{accessory}</div>
        <button
          type="submit"
          disabled={disabled || busy || !text.trim()}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-[#007679] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#00686b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Send aria-hidden="true" className="h-4 w-4" />}
          {tone === "note" ? "Add note" : "Send"}
        </button>
      </div>
    </form>
  );
}
