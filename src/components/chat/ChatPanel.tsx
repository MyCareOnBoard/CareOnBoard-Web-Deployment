import { memo } from "react";
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
    onSendMessage: (content: string) => void;
    onDelete: () => void;
    emptyStateMessage?: string;
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
}: ChatPanelProps) {
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

                    {/* Messages Area */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <MessageList
                            messages={messages}
                            currentUserId={currentUserId}
                            loading={loading}
                        />
                    </div>

                    {/* Message Input */}
                    <div className="flex-shrink-0">
                        <MessageInput
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

