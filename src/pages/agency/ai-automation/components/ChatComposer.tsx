import React, { useState, useRef, useEffect } from "react";
import {
  ChevronUp,
  Mic,
  Paperclip,
  File,
  FileText,
  Send,
  ChevronRight,
  X,
} from "lucide-react";
import type { Attachment } from "../types";
import VoiceMicControl from "@/components/VoiceMicControl";
import type { VoiceRecordingUiState } from "@/contexts/VoiceRecordingContext";

const QUICK_ACTIONS = [
  { label: "Find shift coverage" },
  { label: "Fix today's issues" },
  { label: "Check compliance risks" },
  { label: "Review billing issues" },
  { label: "Generate smart report" },
];

const composerButton =
  "inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-[#dcdfe2] bg-white px-3.5 text-[14px] font-medium text-[#10141a] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5";

interface ChatComposerProps {
  value: string;
  maxLength: number;
  disabled: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onQuickAction: (text: string) => void;
  onAddAttachment?: () => void;
  onMicClick?: () => void;
  isRecording?: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  recordingUi?: VoiceRecordingUiState;
  canAcceptVoice?: boolean;
  onAcceptVoice?: () => void;
  onCancelVoice?: () => void;
  attachments?: Attachment[];
  onRemoveAttachment?: (index: number) => void;
}

export default function ChatComposer({
  value,
  maxLength,
  disabled,
  onChange,
  onSend,
  onQuickAction,
  onAddAttachment,
  onMicClick,
  isRecording = false,
  textareaRef,
  recordingUi,
  canAcceptVoice = false,
  onAcceptVoice,
  onCancelVoice,
  attachments = [],
  onRemoveAttachment,
}: ChatComposerProps) {
  const [showActions, setShowActions] = useState(false);

  const actionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionRef.current &&
        !actionRef.current.contains(event.target as Node)
      ) {
        setShowActions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex-shrink-0 px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="rounded-[14px] border border-[#12b5b0] bg-white p-3 transition-shadow focus-within:ring-2 focus-within:ring-[#12b5b0]/20 sm:p-4 dark:border-[#12b5b0]/60 dark:bg-[#151c22]">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          placeholder="Talk to me, how can I help you today?"
          aria-label="Message"
          rows={3}
          className="w-full resize-none bg-transparent px-1 text-[14px] leading-6 text-[#10141a] outline-none placeholder:text-[#6b737a] dark:text-[#f4f6f7] dark:placeholder:text-[#9aa4a8]"
        />

        {attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="group relative">
                {att.type === "image" ? (
                  <img
                    src={att.url}
                    alt={att.name}
                    className="h-14 w-14 rounded-[10px] border border-[#e4e7ea] object-cover dark:border-white/10"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 rounded-[10px] border border-[#e4e7ea] bg-[#f4f5f6] px-3 py-2 text-[13px] text-[#10141a] dark:border-white/10 dark:bg-white/5 dark:text-[#f4f6f7]">
                    <FileText aria-hidden="true" className="h-4 w-4 text-[#4b535b]" />
                    <span className="max-w-[140px] truncate">{att.name}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveAttachment?.(idx)}
                  className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-[#4b535b] text-white group-hover:flex group-focus-within:flex focus-visible:flex"
                  aria-label="Remove attachment"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAddAttachment ? onAddAttachment : undefined}
              className={composerButton}
            >
              <Paperclip aria-hidden="true" className="h-4 w-4" />
              Add attachment
            </button>

            <div className="relative" ref={actionRef}>
              <button
                type="button"
                aria-expanded={showActions}
                onClick={() => setShowActions((v) => !v)}
                className={composerButton}
              >
                <File aria-hidden="true" className="h-4 w-4" />
                <span>Take action</span>
                <ChevronUp
                  aria-hidden="true"
                  className={`h-4 w-4 transition-transform ${showActions ? "" : "rotate-180"}`}
                />
              </button>

              {showActions && (
                <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[240px] rounded-[12px] border border-[#e4e7ea] bg-white p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-[#1b232b]">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => {
                        onQuickAction(action.label);
                        setShowActions(false);
                      }}
                      className="flex w-full cursor-pointer items-center justify-between rounded-[8px] px-2.5 py-2 text-left text-[14px] text-[#10141a] transition-colors hover:bg-[#f2f7f7] dark:text-[#f4f6f7] dark:hover:bg-white/5"
                    >
                      <span>{action.label}</span>
                      <ChevronRight aria-hidden="true" className="h-4 w-4 text-[#4b535b] dark:text-[#9aa4a8]" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[13px] text-[#4b535b] tabular-nums dark:text-[#9aa4a8]">
              {value.length}/{maxLength}
            </span>

            {isRecording && recordingUi && onAcceptVoice && onCancelVoice ? (
              <VoiceMicControl
                isConnecting={recordingUi.isConnecting}
                isSpeaking={recordingUi.isSpeaking}
                isTranslating={recordingUi.isTranslating}
                canAccept={canAcceptVoice}
                onAccept={onAcceptVoice}
                onCancel={onCancelVoice}
              />
            ) : (
              <button
                type="button"
                onClick={onMicClick}
                aria-label="Dictate a message"
                className="grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-[#dcdfe2] bg-white text-[#10141a] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5"
              >
                <Mic className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onSend}
              disabled={disabled}
              aria-label="Send message"
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-[#003839] text-white transition-colors hover:bg-[#0b4c4d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:bg-[#e2e5e8] disabled:text-[#8a949b] dark:bg-[#0f7e7d] dark:disabled:bg-white/10"
            >
              <Send aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
