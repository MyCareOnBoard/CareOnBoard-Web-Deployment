import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
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

const QUICK_ACTIONS = [
  { label: "Find shift coverage" },
  { label: "Fix today's issues" },
  { label: "Check compliance risks" },
  { label: "Review billing issues" },
  { label: "Generate smart report" },
];

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
    <div className="border-t border-[#e5e7eb] bg-[#FFFFFF42] px-4 py-5 sm:px-6 sm:py-6 flex-shrink-0">
      <div className="rounded-[28px] bg-white p-4 sm:p-5">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          placeholder="Talk to me, how can I help you today?"
          rows={4}
          className="
            w-full resize-none rounded-[20px]
            border border-[#E7E7E7]
            bg-[#F4F7F8]
            px-4 py-4
            text-[15px] text-[#111827]
            outline-none
            placeholder:text-[#8B8B8B]
            focus:border-[#00B4B8]
            transition
          "
        />

        {attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <div key={idx} className="relative group">
                {att.type === "image" ? (
                  <img
                    src={att.url}
                    alt={att.name}
                    className="h-14 w-14 rounded-xl object-cover border border-[#E7E7E7]"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 rounded-xl border border-[#E7E7E7] bg-[#F4F7F8] px-3 py-2 text-[13px] text-[#111827]">
                    <FileText className="h-4 w-4 text-[#6B7280]" />
                    <span className="max-w-[100px] truncate">{att.name}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveAttachment?.(idx)}
                  className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-[#6B7280] text-white"
                  aria-label="Remove attachment"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onAddAttachment ? onAddAttachment : undefined}
              className="
                inline-flex items-center gap-2
                rounded-xl border border-[#E7E7E7]
                bg-white px-4 py-3
                text-[15px] font-medium text-[#111827]
                transition hover:bg-[#F8F8F8] cursor-pointer
              "
            >
              <Paperclip className="h-5 w-5" />
              Add attachment
            </button>

            <div className="relative" ref={actionRef}>
              <button
                type="button"
                onClick={() => setShowActions((v) => !v)}
                className="
                  inline-flex items-center gap-2
                  rounded-xl border border-[#E7E7E7]
                  bg-white px-4 py-3
                  text-[15px] font-medium text-[#111827]
                  transition hover:bg-[#F8F8F8] cursor-pointer
                "
              >
                <File className="h-5 w-5" />

                <span>Take action</span>

                <ChevronUp
                  className={`h-4 w-4 transition-transform ${
                    showActions ? "" : "rotate-180"
                  }`}
                />
              </button>

              {showActions && (
                <div
                  className="
                    absolute bottom-[calc(100%+12px)] left-0 z-50
                    w-[248px]
                    rounded-[20px]
                    border border-[#E7E7E7]
                    bg-white p-3
                    shadow-[0_10px_40px_rgba(0,0,0,0.08)]
                  "
                >
                  <div className="space-y-1">
                    {QUICK_ACTIONS.map((action, index) => (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() => {
                          onQuickAction(action.label);
                          setShowActions(false);
                        }}
                        className={`
                          flex w-full items-center justify-between
                          rounded-[14px]
                          px-4 py-3
                          text-left text-[15px]
                          text-[#111827]
                          transition hover:bg-[#F7F7F7]
                          ${
                            index === 0
                              ? "border border-[#E5E7EB] bg-[#F8F8F8] font-semibold"
                              : ""
                          }
                        `}
                      >
                        <span>{action.label}</span>

                        <ChevronRight className="h-4 w-4 text-[#6B7280]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-[#6B7280]">
              {value.length}/{maxLength}
            </span>

            <button
              type="button"
              onClick={onMicClick}
              className={`
                inline-flex h-11 w-11 items-center justify-center
                rounded-xl border border-[#E7E7E7]
                bg-white transition hover:bg-[#F8F8F8] cursor-pointer
                ${isRecording ? "text-[#00B4B8]" : "text-[#111827]"}
              `}
            >
              <Mic className="h-5 w-5" />
            </button>

            <Button
              onClick={onSend}
              disabled={disabled}
              className="
                h-11 w-11 rounded-xl
                bg-[#00B4B8]
                hover:bg-[#009CA0]
                disabled:bg-[#E5E7EB]
              "
            >
              <Send className="h-8 w-8" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}