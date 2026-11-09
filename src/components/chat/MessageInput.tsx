/**
 * Message Input Component
 * Input field for sending messages with send button
 */

import React, { useRef, useState, KeyboardEvent, ChangeEvent } from "react";
import { Send, Paperclip, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUploadAttachmentMutation } from "@/lib/api/userMessaging";

const MAX_MESSAGE_LENGTH = 10000; // characters
const MAX_ATTACHMENTS_PER_MESSAGE = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

interface MessageInputProps {
  conversationId: string;
  onSend: (
    content: string,
    attachments?: Array<{ type: "image" | "file"; url: string; name?: string }>
  ) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  variant?: "classic" | "panel";
}

export const MessageInput = React.memo(function MessageInput({
  conversationId,
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  variant = "classic",
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<
    Array<{
      id: string;
      name: string;
      url: string;
      type: "image" | "file";
      fileType: string;
      size: number;
      uploading: boolean;
      error?: string;
    }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const [uploadAttachment] = useUploadAttachmentMutation();

  const hasUploadingAttachments = attachments.some((a) => a.uploading);
  const hasReadyAttachments = attachments.some((a) => !a.uploading && !a.error);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    const hasText = trimmedMessage.length > 0;

    // Require either text or at least one successfully uploaded attachment
    if ((!hasText && !hasReadyAttachments) || disabled || sending || hasUploadingAttachments) {
      return;
    }

    // Validate message length
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      toast({
        title: "Error",
        description: `Message too long. Maximum ${MAX_MESSAGE_LENGTH.toLocaleString()} characters allowed.`,
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const payloadAttachments = attachments
        .filter((a) => !a.uploading && !a.error)
        .map((a) => ({
          type: a.type,
          url: a.url,
          name: a.name,
        }));

      await onSend(trimmedMessage, payloadAttachments.length ? payloadAttachments : undefined);
      setMessage("");
      setAttachments([]);
    } catch (error) {
      console.error("Error sending message:", error);
      // Keep message in input on error so user can retry
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    // Enter while an IME is composing (e.g. accented or Asian input) confirms the text, not the message.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const validateAndUploadFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const remainingSlots = MAX_ATTACHMENTS_PER_MESSAGE - attachments.length;
    if (remainingSlots <= 0) {
      toast({
        title: "Attachment limit reached",
        description: `You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`,
        variant: "destructive",
      });
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);

    for (const file of filesToProcess) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          title: "File too large",
          description: `\"${file.name}\" exceeds the 10MB limit.`,
          variant: "destructive",
        });
        continue;
      }

      const mime = file.type;
      const isImage = mime.startsWith("image/");
      const isAllowed =
        isImage ||
        mime === "application/pdf" ||
        mime === "application/x-pdf" ||
        mime === "application/msword" ||
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mime === "text/plain" ||
        mime === "text/csv" ||
        mime === "application/csv" ||
        mime === "text/tab-separated-values" ||
        mime === "text/tsv";

      if (!isAllowed) {
        toast({
          title: "Unsupported file type",
          description: `\"${file.name}\" is not a supported file type.`,
          variant: "destructive",
        });
        continue;
      }

      const tempId = `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2)}`;

      setAttachments((prev) => [
        ...prev,
        {
          id: tempId,
          name: file.name,
          url: "",
          type: isImage ? "image" : "file",
          fileType: mime || "application/octet-stream",
          size: file.size,
          uploading: true,
        },
      ]);

      try {
        const result = await uploadAttachment({ conversationId, file }).unwrap();
        setAttachments((prev) =>
          prev.map((att) =>
            att.id === tempId
              ? {
                  ...att,
                  url: result.data.url,
                  fileType: result.data.fileType,
                  size: result.data.fileSize,
                  uploading: false,
                  error: undefined,
                }
              : att,
          ),
        );
      } catch (error: any) {
        console.error("Error uploading attachment:", error);
        setAttachments((prev) =>
          prev.map((att) =>
            att.id === tempId
              ? {
                  ...att,
                  uploading: false,
                  error: "Upload failed",
                }
              : att,
          ),
        );
        toast({
          title: "Upload failed",
          description:
            error?.data?.error ||
            error?.message ||
            "Failed to upload attachment. Please try again.",
          variant: "destructive",
        });
      }
    }

    // Reset input so same file can be selected again if needed
    event.target.value = "";
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  };

  const handleOpenFilePicker = () => {
    if (disabled || sending || attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE) {
      return;
    }
    fileInputRef.current?.click();
  };

  const canSend = (message.trim().length > 0 || hasReadyAttachments) && !disabled && !sending && !hasUploadingAttachments;
  const fileInput = <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*,.pdf,.doc,.docx,.txt,.csv,.tsv" onChange={validateAndUploadFiles} />;

  if (variant === "panel") {
    return (
      <div className="px-3 pb-3 pt-1 sm:px-4 sm:pb-4">
        {attachments.length > 0 && <ul className="mb-2 flex flex-wrap gap-2" aria-label="Attachments">
          {attachments.map((att) => <li key={att.id} className="flex items-center gap-2 rounded-full bg-[#e3f6f6] py-1 pl-3 pr-1 text-[12px] text-[#10141a] dark:bg-white/10 dark:text-[#f4f6f7]">
            <span className="max-w-[160px] truncate">{att.name}{att.uploading && " (uploading...)"}{att.error && " (failed)"}</span>
            <button type="button" onClick={() => handleRemoveAttachment(att.id)} disabled={att.uploading} aria-label={`Remove ${att.name}`}
              className="grid h-5 w-5 cursor-pointer place-items-center rounded-full text-[#5d6b73] hover:bg-black/5 disabled:cursor-not-allowed dark:text-[#9aa4a8]">
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </li>)}
        </ul>}
        <div className="flex items-center gap-2 rounded-full bg-[#f3f5f6] py-1.5 pl-4 pr-1.5 focus-within:ring-2 focus-within:ring-[#007679]/30 dark:bg-white/5">
          <label className="sr-only" htmlFor={`message-${conversationId}`}>Message</label>
          <input id={`message-${conversationId}`} type="text" placeholder={placeholder} value={message} maxLength={MAX_MESSAGE_LENGTH}
            onChange={(e) => { if (e.target.value.length <= MAX_MESSAGE_LENGTH) setMessage(e.target.value); }}
            onKeyDown={handleKeyPress} disabled={disabled || sending}
            className="h-9 min-w-0 flex-1 bg-transparent text-[14px] text-[#10141a] outline-none placeholder:text-[#8a979d] disabled:cursor-not-allowed dark:text-[#f4f6f7]" />
          <button type="button" onClick={handleOpenFilePicker} aria-label="Attach file" disabled={disabled || sending || attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE}
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-[#5d6b73] transition-colors hover:bg-black/5 hover:text-[#10141a] disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#9aa4a8] dark:hover:bg-white/10">
            <Paperclip className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => void handleSend()} disabled={!canSend} aria-label="Send message"
            className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-[#003839] text-white transition-colors hover:bg-[#00494a] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#00a3a7] dark:text-[#06292a]">
            <Send className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
          {fileInput}
        </div>
        {message.length > MAX_MESSAGE_LENGTH * 0.9 && <p className="mt-1 text-right text-[12px] text-[#5d6b73]">{message.length.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()} characters</p>}
      </div>
    );
  }

  return (
    <div className="p-6 border-t border-[#e5e7eb] bg-white">
      <div className="flex flex-col gap-3">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#eef2ff] border border-[#d4d4ff] text-xs text-[#111827]"
              >
                <span className="truncate max-w-[140px]">
                  {att.name}
                  {att.uploading && " (uploading...)"}
                  {att.error && " (failed)"}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(att.id)}
                  className="text-[#6b7280] hover:text-[#111827]"
                  aria-label="Remove attachment"
                  disabled={att.uploading}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
        <Input
          type="text"
          placeholder={placeholder}
          value={message}
          onChange={(e) => {
            const newValue = e.target.value;
            // Prevent typing beyond max length
            if (newValue.length <= MAX_MESSAGE_LENGTH) {
              setMessage(newValue);
            }
          }}
          onKeyPress={handleKeyPress}
          className="flex-1"
          disabled={disabled || sending}
          maxLength={MAX_MESSAGE_LENGTH}
        />
        <button
          type="button"
          className="p-2.5 text-[#808081] hover:text-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Attach file"
          disabled={disabled || sending || attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE}
          onClick={handleOpenFilePicker}
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <Button
          type="button"
          onClick={handleSend}
          disabled={
            (message.trim().length === 0 && !hasReadyAttachments) ||
            disabled ||
            sending ||
            hasUploadingAttachments
          }
          className="p-2.5 bg-[#2563eb] text-white rounded-full hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Send message"
        >
          <Send className="w-5 h-5" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt,.csv,.tsv"
          onChange={validateAndUploadFiles}
        />
        </div>
      </div>
      {message.length > MAX_MESSAGE_LENGTH * 0.9 && (
        <div className="mt-2 text-xs text-[#808081] text-right">
          {message.length.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()} characters
        </div>
      )}
    </div>
  );
});
