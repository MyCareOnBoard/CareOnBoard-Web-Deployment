/**
 * Message List Component
 * Displays messages in a conversation with real-time updates
 */

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Send, Check } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Message } from "@/lib/hooks/useMessaging";
import { getInitials, sanitizeText, validateImageUrl } from "@/lib/utils/string-utils";

interface MessageListProps {
  messages: Message[];
  currentUserId?: string;
  loading?: boolean;
  variant?: "classic" | "panel";
}

/** "Today", "Yesterday" or "Monday, Nov 3" above each day's messages. */
export function dayLabel(date: Date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMM d");
}

type Attachment = NonNullable<Message["attachments"]>[number];

function PanelAttachments({ attachments, own }: { attachments: Attachment[]; own: boolean }) {
  return <div className={cn("flex flex-col gap-2", own && "items-end")}>
    {attachments.map((att, index) => <a key={`${att.url}-${index}`} href={att.url} target="_blank" rel="noopener noreferrer" className="block max-w-full">
      {att.type === "image"
        ? <img src={att.url} alt={att.name || "Image attachment"} className="max-h-40 rounded-[10px] object-cover" />
        : <span className={cn("inline-flex max-w-[220px] items-center rounded-[8px] px-3 py-1.5 text-[12px] underline-offset-2 hover:underline", own ? "bg-white/15 text-white" : "bg-white text-[#10141a] dark:bg-white/10 dark:text-[#f4f6f7]")}>
          <span className="truncate">{att.name || "File attachment"}</span>
        </span>}
    </a>)}
  </div>;
}

export const MessageList = React.memo(function MessageList({
  messages,
  currentUserId,
  loading,
  variant = "classic",
}: MessageListProps) {
  const panel = variant === "panel";
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Check if user is near bottom before auto-scrolling
  const checkIfNearBottom = () => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const threshold = 100; // pixels from bottom
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  // Auto-scroll to bottom when messages update (only if near bottom)
  // Use scrollTop on container to avoid scrollIntoView scrolling ancestors (e.g. page under header)
  useEffect(() => {
    if (messages.length === 0) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    if (shouldAutoScroll || checkIfNearBottom()) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      setShouldAutoScroll(true);
    }
  }, [messages, shouldAutoScroll]);

  // Track scroll position
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShouldAutoScroll(checkIfNearBottom());
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Memoize formatted messages with sanitized content
  const formattedMessages = useMemo(() => {
    return messages.map(msg => ({
      ...msg,
      sanitizedContent: sanitizeText(msg.content),
      formattedTime: format(new Date(msg.createdAt), "hh.mm a"), // Format: "09.40 AM" with dots
      validatedAvatar: validateImageUrl(msg.senderAvatar),
    }));
  }, [messages]);

  if (loading && panel) {
    return <div role="status" className="flex h-full items-center justify-center text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">Loading messages...</div>;
  }

  if (messages.length === 0 && panel) {
    return <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
      <p className="text-[14px] font-medium text-[#5d6b73] dark:text-[#c9d3d6]">No messages yet</p>
      <p className="text-[13px] text-[#8a979d] dark:text-[#9aa4a8]">Say hello to start the conversation.</p>
    </div>;
  }

  if (panel) {
    return (
      <div ref={messagesContainerRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <ol className="space-y-3">
          {formattedMessages.map((msg, index) => {
            const own = msg.senderId === currentUserId;
            const date = new Date(msg.createdAt);
            const previous = formattedMessages[index - 1];
            const newDay = !previous || new Date(previous.createdAt).toDateString() !== date.toDateString();
            return <li key={msg.id}>
              {newDay && <p className="my-3 flex justify-center"><span className="rounded-[6px] bg-[#f3f5f6] px-3 py-1 text-[12px] font-medium text-[#34434c] dark:bg-white/10 dark:text-[#c9d3d6]">{dayLabel(date)}</span></p>}
              <div className={cn("flex flex-col", own ? "items-end" : "items-start")}>
                <div className={cn("max-w-[78%] space-y-2 rounded-[18px] px-4 py-2.5 sm:max-w-[70%]", own ? "rounded-br-[6px] bg-[#003839] text-white dark:bg-[#00a3a7] dark:text-[#06292a]" : "rounded-bl-[6px] bg-[#e3f6f6] text-[#10141a] dark:bg-white/10 dark:text-[#f4f6f7]")}>
                  {msg.sanitizedContent && <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.sanitizedContent }} />}
                  {msg.attachments && msg.attachments.length > 0 && <PanelAttachments attachments={msg.attachments} own={own} />}
                </div>
                <p className="mt-1 text-[11px] text-[#5d6b73] dark:text-[#9aa4a8]">
                  {own ? `Sent ${format(date, "h:mm a")}` : `${msg.senderName ? `${msg.senderName} · ` : ""}${format(date, "h:mm a")}`}
                </p>
              </div>
            </li>;
          })}
        </ol>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#e5e7eb] border-t-[#2563eb] animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-[#808081]">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Send className="w-12 h-12 text-[#d1d5db] mx-auto mb-3" />
          <p className="text-[14px] text-[#808081]">No messages yet</p>
          <p className="text-[12px] text-[#9ca3af] mt-1">Start the conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 min-h-0 overflow-y-auto px-6 py-4 bg-[#f7f7f7]"
    >
      <div className="space-y-4">
        {formattedMessages.map((msg) => {
          const isOwn = msg.senderId === currentUserId;

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isOwn ? "justify-end" : "justify-start"}`}
            >
              {/* Incoming Message Layout */}
              {!isOwn && (
                <>
                  {/* Avatar on left */}
                  <Avatar className="w-10 h-12 flex-shrink-0 rounded-[8px]">
                    <AvatarImage
                      src={msg.validatedAvatar || undefined}
                      alt={msg.senderName || "User"}
                      className="rounded-[8px]"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-[#e5e7eb] to-[#d1d5db] text-[#10141a] text-sm font-semibold rounded-[8px]">
                      {getInitials(msg.senderName || "U")}
                    </AvatarFallback>
                  </Avatar>

                  {/* Message bubble and sender info */}
                  <div className="flex flex-col max-w-[70%]">
                    {/* Message bubble - light gray with rounded corners (except bottom-left) */}
                    <div className="px-4 py-2.5 bg-[#F2F2F2] rounded-tl-[12px] rounded-tr-[8px] rounded-br-[8px] rounded-bl-[4px] mb-1 space-y-2">
                      {msg.sanitizedContent && (
                        <p
                          className="text-[14px] leading-relaxed whitespace-pre-wrap break-words text-[#333333]"
                          dangerouslySetInnerHTML={{ __html: msg.sanitizedContent }}
                        />
                      )}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-col gap-2">
                          {msg.attachments.map((att, index) => {
                            const isImage = att.type === "image";
                            return (
                              <div key={`${att.url}-${index}`} className="max-w-full">
                                {isImage ? (
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                  >
                                    <img
                                      src={att.url}
                                      alt={att.name || "Image attachment"}
                                      className="max-h-40 rounded-md object-cover border border-[#e5e7eb]"
                                    />
                                  </a>
                                ) : (
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-[#e5e7eb] text-xs text-[#111827] hover:bg-[#f3f4f6]"
                                  >
                                    <span className="truncate max-w-[180px]">
                                      {att.name || "File attachment"}
                                    </span>
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Sender name and timestamp below bubble */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-semibold text-[#10141a]">
                        {msg.senderName || "User"}
                      </span>
                      <span className="text-[12px] text-[#808081]">·</span>
                      <span className="text-[12px] text-[#808081]">
                        {msg.formattedTime}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Outgoing Message Layout */}
              {isOwn && (
                <>
                  {/* Message bubble and sender info */}
                  <div className="flex flex-col max-w-[70%] items-end">
                    {/* Message bubble - light blue with rounded corners (except top-right) */}
                    <div className="px-4 py-2.5 bg-[#E0EDFE] rounded-tl-[8px] rounded-tr-[12px] rounded-br-[4px] rounded-bl-[8px] mb-1 space-y-2">
                      {msg.sanitizedContent && (
                        <p
                          className="text-[14px] leading-relaxed whitespace-pre-wrap break-words text-[#10141a]"
                          dangerouslySetInnerHTML={{ __html: msg.sanitizedContent }}
                        />
                      )}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-col gap-2 items-end">
                          {msg.attachments.map((att, index) => {
                            const isImage = att.type === "image";
                            return (
                              <div key={`${att.url}-${index}`} className="max-w-full">
                                {isImage ? (
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                  >
                                    <img
                                      src={att.url}
                                      alt={att.name || "Image attachment"}
                                      className="max-h-40 rounded-md object-cover border border-[#bfdbfe]"
                                    />
                                  </a>
                                ) : (
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-[#bfdbfe] text-xs text-[#111827] hover:bg-[#dbeafe]"
                                  >
                                    <span className="truncate max-w-[180px]">
                                      {att.name || "File attachment"}
                                    </span>
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* "You", timestamp, and read receipt below bubble */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] text-[#808081]">You</span>
                      <span className="text-[12px] text-[#808081]">·</span>
                      <span className="text-[12px] text-[#808081]">
                        {msg.formattedTime}
                      </span>
                      {/* Read receipt - single blue checkmark (always show for sent messages) */}
                      <Check className="w-3.5 h-3.5 text-[#2563eb] flex-shrink-0" />
                    </div>
                  </div>

                  {/* Avatar on right */}
                  <Avatar className="w-10 h-12 flex-shrink-0 rounded-[8px]">
                    <AvatarImage
                      src={msg.validatedAvatar || undefined}
                      alt="You"
                      className="rounded-[8px]"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-[#e5e7eb] to-[#d1d5db] text-[#10141a] text-sm font-semibold rounded-[8px]">
                      {getInitials(msg.senderName || "You")}
                    </AvatarFallback>
                  </Avatar>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
