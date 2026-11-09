import { memo } from "react";
import { ChevronLeft, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationHeader } from "./ConversationHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { Conversation, Message } from "@/lib/hooks/useMessaging";

export interface ChatPanelProps {
    conversation: Conversation | null;
    messages: Message[];
    currentUserId?: string;
    loading: boolean;
    showChatView: boolean;
    onBackToList: () => void;
    onSendMessage: (content: string, attachments?: Array<{ type: "image" | "file"; url: string; name?: string }>) => void;
    onDelete: () => void;
    emptyStateMessage?: string;
    variant?: "classic" | "panel";
}

function ChatPanelComponent({
    conversation,
    messages,
    currentUserId,
    loading,
    showChatView,
    onBackToList,
    onSendMessage,
    onDelete,
    emptyStateMessage = "Select a conversation to start messaging",
    variant = "classic",
}: ChatPanelProps) {
    if (variant === "panel") {
        return (
            <section aria-label="Conversation" className={`${showChatView ? "flex" : "hidden"} min-w-0 flex-1 flex-col overflow-hidden rounded-[16px] border border-[#e8edef] bg-white lg:flex dark:border-white/10 dark:bg-[#1b232b]`}>
                {conversation ? <>
                    <div className="flex shrink-0 items-center gap-1 border-b border-[#edf1f2] pl-2 lg:pl-0 dark:border-white/10">
                        <button type="button" onClick={onBackToList} aria-label="Back to conversations"
                            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-[#10141a] hover:bg-[#f3f5f6] lg:hidden dark:text-[#f4f6f7] dark:hover:bg-white/5">
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <div className="min-w-0 flex-1">
                            <ConversationHeader conversation={conversation} currentUserId={currentUserId} onDelete={onDelete} variant="panel" />
                        </div>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <MessageList messages={messages} currentUserId={currentUserId} loading={loading} variant="panel" />
                    </div>
                    <div className="shrink-0">
                        <MessageInput conversationId={conversation.id} onSend={onSendMessage} disabled={loading} placeholder="Write a message here" variant="panel" />
                    </div>
                </> : <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                    <MessagesSquare className="h-10 w-10 text-[#8a979d]" strokeWidth={1.5} aria-hidden="true" />
                    <p className="text-[14px] text-[#5d6b73] dark:text-[#9aa4a8]">{emptyStateMessage}</p>
                </div>}
            </section>
        );
    }

    return (
        <div className={`${showChatView ? 'flex' : 'hidden'} lg:flex flex-1 flex-col bg-[#f9fafb] min-w-0`}>
            {conversation ? (
                <>
                    {/* Chat Header with Back Button on Mobile */}
                    <div className="flex-shrink-0">
                        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-[#e5e7eb] bg-white">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onBackToList}
                                className="p-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </Button>
                            <span className="text-sm font-medium text-[#10141a]">Back to Conversations</span>
                        </div>
                        <ConversationHeader
                            conversation={conversation}
                            currentUserId={currentUserId}
                            onDelete={onDelete}
                        />
                    </div>

                    {/* Messages Area - independent scroll, does not affect conversation list */}
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                        <MessageList
                            messages={messages}
                            currentUserId={currentUserId}
                            loading={loading}
                        />
                    </div>

                    {/* Message Input */}
                    <div className="flex-shrink-0">
                        <MessageInput
                            conversationId={conversation.id}
                            onSend={onSendMessage}
                            disabled={loading}
                            placeholder="Type a message..."
                        />
                    </div>
                </>
            ) : (
                <div className="flex items-center justify-center flex-1">
                    <p className="text-[14px] sm:text-[16px] text-[#808081] px-4 text-center">
                        {emptyStateMessage}
                    </p>
                </div>
            )}
        </div>
    );
}

export const ChatPanel = memo(ChatPanelComponent);

