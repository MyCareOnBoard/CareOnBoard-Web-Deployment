/**
 * Message Input Component
 * Input field for sending messages with send button
 */

import React, { useState, KeyboardEvent } from "react";
import { Send, Paperclip } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const MAX_MESSAGE_LENGTH = 10000; // characters

interface MessageInputProps {
  onSend: (content: string) => void | Promise<void>;
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
  const { toast } = useToast();

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled || sending) return;

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
      await onSend(trimmedMessage);
      setMessage("");
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

  return (
    <div className="p-6 border-t border-[#e5e7eb] bg-white">
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
          className="p-2.5 text-[#808081] hover:text-[#2563eb] transition-colors"
          title="Attach file"
          disabled={disabled}
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <Button
          type="button"
          onClick={handleSend}
          disabled={!message.trim() || disabled || sending}
          className="p-2.5 bg-[#2563eb] text-white rounded-full hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Send message"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
      {message.length > MAX_MESSAGE_LENGTH * 0.9 && (
        <div className="mt-2 text-xs text-[#808081] text-right">
          {message.length.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()} characters
        </div>
      )}
    </div>
  );
});
