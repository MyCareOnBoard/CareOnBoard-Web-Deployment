import React, { useCallback, useEffect, useRef, useState } from "react";
import { useCreateConversationMutation, useLazyGetConversationQuery, useSendMessageMutation, type AIMessage, type DSPSuggestion } from "./api";
import { toast } from "sonner";
import AIAutomationHeader from "./components/AIAutomationHeader";
import { useAuth } from "@/utils/auth";
import ChatComposer from "./components/ChatComposer";
import { AddAttachmentModal } from "./components/AddAttachmentModal";
import ConversationsSidebar from "./components/ConversationsSidebar";

import { MessageBubble } from "./components/MessageBubble";
import EmptyState from "./components/EmptyState";
import type { LocalMessage } from "./types";

const MAX_CHARS = 500;

export default function AIAutomationPage() {
  const { user } = useAuth();
  const [selectedArea, setSelectedArea] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showConversations, setShowConversations] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);

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
            result.messages.map((message: AIMessage) => ({
              id: message.id,
              role: message.role,
              content: message.content,
              suggestions: message.suggestions,
              actions: message.actions,
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

      let conversationId = activeConversationId;
      if (!conversationId) {
        try {
          const result = await createConversation({}).unwrap();
          conversationId = result.id;
          setActiveConversationId(conversationId);
        } catch {
          toast.error("Failed to start conversation");
          return;
        }
      }

      const userMessage: LocalMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      };
      const loadingMessage: LocalMessage = {
        id: `loading-${Date.now()}`,
        role: "assistant",
        content: "",
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);

      try {
        const response = await sendMessage({ conversationId, message: content }).unwrap();
        setMessages((prev) =>
          prev
            .filter((msg) => !msg.isLoading)
            .concat({
              id: response.id,
              role: "assistant",
              content: response.content,
              suggestions: response.suggestions,
              actions: response.actions,
            })
        );
      } catch {
        setMessages((prev) =>
          prev
            .filter((msg) => !msg.isLoading)
            .concat({
              id: `error-${Date.now()}`,
              role: "assistant",
              content: "Sorry, something went wrong. Please try again.",
            })
        );
      }
    },
    [activeConversationId, createConversation, inputValue, isSending, sendMessage]
  );

  const handleAssignDSP = useCallback(
    (suggestion: DSPSuggestion) => {
      handleSend(`Assign ${suggestion.fullName} to this shift`);
    },
    [handleSend]
  );

    return (
      <div className="flex min-h-screen flex-col gap-4 px-4 sm:gap-6 sm:px-6 sm:py-6">
        <AIAutomationHeader
          onOpenConversations={() => setShowConversations(true)}
          onNewConversation={startNewConversation}
          userName={user?.fullName || user?.email || undefined}
          selectedArea={selectedArea}
          onSelectArea={setSelectedArea}
        />
        <div className="flex-1 flex min-h-0 flex-col overflow-hidden rounded-[28px] border-2 border-white shadow-sm sm:rounded-[32px]">
          <div className="flex-1 p-4 overflow-y-auto sm:p-6 md:p-8">
            {messages.length === 0 ? (
              <EmptyState onQuickAction={(text) => handleSend(text)} onOpenConversations={function (): void {
                throw new Error("Function not implemented.");
              } } onNewConversation={function (): void {
                throw new Error("Function not implemented.");
              } } onAction={function (text: string): void {
                throw new Error("Function not implemented.");
              } } />
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} onAssignDSP={handleAssignDSP} />
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <ChatComposer
            value={inputValue}
            maxLength={MAX_CHARS}
            disabled={!inputValue.trim() || isSending}
            onChange={setInputValue}
            onSend={() => handleSend()}
            onQuickAction={(text) => handleSend(text)}
            onAddAttachment={() => setShowAttachmentModal(true)}
          />
        </div>

        <ConversationsSidebar
          open={showConversations}
          activeId={activeConversationId}
          onClose={() => setShowConversations(false)}
          onSelect={loadConversation}
          onNew={startNewConversation}
        />

        <AddAttachmentModal
          isOpen={showAttachmentModal}
          onClose={() => setShowAttachmentModal(false)}
          onUpload={(files) => {
            // To handle uploaded files
            toast.success(`${files.length} file(s) uploaded!`);
          }}
        />
      </div>
    );
  }
