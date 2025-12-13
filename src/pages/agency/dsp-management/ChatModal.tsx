import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { X, Check } from "lucide-react";

import { DSP } from "./types";

interface ChatModalProps {
  dsp: DSP;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ChatModal({ dsp, isOpen, onClose, onSuccess }: ChatModalProps) {
  const [chatMessage, setChatMessage] = useState("");

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleChatSubmit = () => {
    if (!chatMessage.trim()) return;
    setChatMessage("");
    onClose();
    onSuccess();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">New Message</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarImage src={dsp.profilePicture} alt={dsp.fullName} />
              <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                {getInitials(dsp.fullName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{dsp.fullName}</p>
              <p className="text-xs text-gray-500">{dsp.role}</p>
            </div>
          </div>

          <Input
            placeholder="Enter message"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            className="h-12 rounded-xl"
          />

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-blue-500 text-blue-500 rounded-full hover:bg-blue-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleChatSubmit}
              disabled={!chatMessage.trim()}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              Start Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MessageSentModalProps {
  dspName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function MessageSentModal({ dspName, isOpen, onClose }: MessageSentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 flex items-center gap-3 min-w-[300px]">
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
          <Check className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Message sent successfully!</p>
          <p className="text-sm text-gray-600">Your message has been sent to {dspName}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-auto text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
