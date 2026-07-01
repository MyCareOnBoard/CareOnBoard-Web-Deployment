import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useCreateConversationMutation, useLazyGetConversationQuery, useSendMessageMutation, type AIMessage, type DSPSuggestion } from "./api";
import type { Attachment } from "./types";
import { toast } from "sonner";
import AIAutomationHeader from "./components/AIAutomationHeader";
import { useAuth } from "@/utils/auth";
import ChatComposer from "./components/ChatComposer";
import { AddAttachmentModal } from "./components/AddAttachmentModal";
import ConversationsSidebar from "./components/ConversationsSidebar";
import {
  VoiceRecordingProvider,
  useVoiceRecording,
  useVoiceSessionActions,
} from "@/contexts/VoiceRecordingContext";
import VoiceInputButton from "@/components/VoiceInputButton";

import { MessageBubble } from "./components/MessageBubble";
import EmptyState from "./components/EmptyState";
import type { LocalMessage } from "./types";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";

const MAX_CHARS = 500;

function AIAutomationContent() {
  const { user } = useAuth();
  const { conversationId: urlConversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { startRecording, isRecording, registerActiveTarget, committedTranscripts } =
    useVoiceRecording();
  const { acceptSession, cancelSession, recordingUi } = useVoiceSessionActions();
  const mode = useEffectiveAgencyMode();
  const [selectedArea, setSelectedArea] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(urlConversationId ?? null);
  // Program view the OPEN conversation is pinned to (from its stored context);
  // seeded from the toggle for brand-new conversations.
  const [conversationMode, setConversationMode] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showConversations, setShowConversations] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);

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

  // Switching the DDD/HHA toggle while a conversation is open sends you back to
  // the automations home (a pinned conversation shouldn't be viewed under a
  // mismatched toggle). Skip the initial mount — only react to actual changes.
  const prevModeRef = useRef(mode);
  useEffect(() => {
    if (prevModeRef.current !== mode) {
      prevModeRef.current = mode;
      if (urlConversationId) {
        toast.info(
          `Switched to the ${mode ? mode.toUpperCase() : "agency-wide"} view — returned to AI Automation home`
        );
        navigate("/agency/automations", { replace: true });
      }
    }
  }, [mode, urlConversationId, navigate]);

  useEffect(() => {
    if (urlConversationId) {
      loadConversation(urlConversationId);
    } else {
      setActiveConversationId(null);
      setConversationMode(null);
      setMessages([]);
      setIsLoadingConversation(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlConversationId]);

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null);
    setConversationMode(null);
    setMessages([]);
    setInputValue("");
    navigate("/agency/automations", { replace: true });
    textareaRef.current?.focus();
  }, [navigate]);

  const loadConversation = useCallback(
    async (id: string) => {
      setActiveConversationId(id);
      setMessages([]);
      setIsLoadingConversation(true);
      navigate(`/agency/automations/${id}`, { replace: true });

      try {
        const result = await fetchConversation(id).unwrap();
        setConversationMode(result.context?.mode ?? null);
        if (result.messages) {
          setMessages(
            result.messages.map((message: AIMessage) => ({
              id: message.id,
              role: message.role,
              content: message.content,
              suggestions: message.suggestions,
              actions: message.actions,
              attachments: message.attachments,
              components: message.components,
            }))
          );
        }
      } catch {
        toast.error("Failed to load conversation");
      } finally {
        setIsLoadingConversation(false);
      }
    },
    [fetchConversation, navigate]
  );

  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text ?? inputValue).trim();
      if (!content || isSending) return;

      setInputValue("");

      let conversationId = activeConversationId;
      if (!conversationId) {
        try {
          // New conversations are pinned to the active DDD/HHA view at creation.
          const result = await createConversation(mode ? { context: { mode } } : {}).unwrap();
          conversationId = result.id;
          setActiveConversationId(conversationId);
          setConversationMode(mode ?? null);
          navigate(`/agency/automations/${conversationId}`, { replace: true });
        } catch {
          toast.error("Failed to start conversation");
          return;
        }
      }

      const attachmentsSnapshot = [...pendingAttachments];
      setPendingAttachments([]);

      const userMessage: LocalMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        attachments: attachmentsSnapshot.length ? attachmentsSnapshot : undefined,
      };
      const loadingMessage: LocalMessage = {
        id: `loading-${Date.now()}`,
        role: "assistant",
        content: "",
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMessage, loadingMessage]);

      // Merge area + mode; send undefined (never {}) so an empty context can't
      // clobber the conversation's stored context on the first message.
      const messageContext = {
        ...(selectedArea ? { area: selectedArea } : {}),
        ...(mode ? { mode } : {}),
      };

      try {
        const response = await sendMessage({
          conversationId,
          message: content,
          context: Object.keys(messageContext).length ? messageContext : undefined,
          attachments: attachmentsSnapshot.length ? attachmentsSnapshot : undefined,
        }).unwrap();
        setMessages((prev) =>
          prev
            .filter((msg) => !msg.isLoading)
            .concat({
              id: response.id,
              role: "assistant",
              content: response.content,
              suggestions: response.suggestions,
              actions: response.actions,
              components: response.components,
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
    [activeConversationId, createConversation, inputValue, isSending, mode, navigate, pendingAttachments, selectedArea, sendMessage]
  );

  const handleAssignDSP = useCallback(
    (suggestion: DSPSuggestion) => {
      handleSend(`Assign ${suggestion.fullName} to this shift`);
    },
    [handleSend]
  );

    return (
      <>
        <VoiceInputButton textareaRef={textareaRef} />
      <div className="flex flex-col min-h-screen gap-4 px-4 sm:gap-6 sm:px-6 sm:py-6">
        <AIAutomationHeader
          onOpenConversations={() => setShowConversations(true)}
          // onNewConversation={startNewConversation}
          userName={user?.fullName || user?.email || undefined}
          conversationMode={activeConversationId ? conversationMode : null}
          // selectedArea={selectedArea}
          // onSelectArea={setSelectedArea}
        />
        <div className="flex-1 flex min-h-0 flex-col overflow-hidden rounded-[28px] border-2 border-white shadow-sm sm:rounded-[32px]">
          <div className="flex-1 p-4 overflow-y-auto sm:p-6 md:p-8">
            {isLoadingConversation ? (
              <div className="flex flex-col gap-4 animate-pulse">
                {[80, 60, 90, 50].map((w, i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                    <div
                      className="h-10 rounded-2xl bg-[#e5e7eb]"
                      style={{ width: `${w}%` }}
                    />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <EmptyState
                onQuickAction={(text) => handleSend(text)}
                onOpenConversations={() => setShowConversations(true)}
                onNewConversation={startNewConversation}
                onAction={(text) => handleSend(text)}
              />
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} onAssignDSP={handleAssignDSP} onSendMessage={handleSend} />
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
            textareaRef={textareaRef}
            onMicClick={() => {
              if (isRecording) return;
              registerActiveTarget({
                fieldKey: "message",
                ref: textareaRef,
                baseline: inputValue,
                setValue: setInputValue,
              });
              startRecording("message", "AI Automation", undefined, (transcript) =>
                setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript))
              );
            }}
            isRecording={isRecording}
            recordingUi={recordingUi}
            canAcceptVoice={
              committedTranscripts.length > 0 || inputValue.trim().length > 0
            }
            onAcceptVoice={acceptSession}
            onCancelVoice={cancelSession}
            attachments={pendingAttachments}
            onRemoveAttachment={(index) =>
              setPendingAttachments((prev) => prev.filter((_, i) => i !== index))
            }
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
          onUpload={(attachments) => {
            setPendingAttachments((prev) => [...prev, ...attachments]);
            toast.success(`${attachments.length} file(s) attached`);
          }}
        />
      </div>
      </>
    );
}

export default function AIAutomationPage() {
  return (
    <VoiceRecordingProvider pageTitle="AI Automation">
      <AIAutomationContent />
    </VoiceRecordingProvider>
  );
}
