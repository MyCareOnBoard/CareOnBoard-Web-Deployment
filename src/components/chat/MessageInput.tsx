/**
 * Message Input Component
 * Input field for sending messages with send button
 */

import React, { useRef, useState, KeyboardEvent, ChangeEvent } from "react";
import { Send, Paperclip } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUploadAttachmentMutation } from "@/lib/api/userMessaging";

const MAX_MESSAGE_LENGTH = 10000; // characters
const MAX_ATTACHMENTS_PER_MESSAGE = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

interface MessageInputProps {
  onSend: (
    content: string,
    attachments?: Array<{ type: "image" | "file"; url: string; name?: string }>
  ) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export const MessageInput = React.memo(function MessageInput({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
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
    if (e.key === "Enter" && !e.shiftKey) {
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
        const result = await uploadAttachment({ file }).unwrap();
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
