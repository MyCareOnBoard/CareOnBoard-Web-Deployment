import React from "react";

interface Conversation {
  id: string;
  title: string;
  subtitle?: string;
}

export default function ConversationsFilledState({
  conversations,
  onSelect,
  onStartNew,
}: {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onStartNew: () => void;
}) {
  return (
    <div className="p-6 w-full max-w-md">
      <h2 className="text-lg font-semibold mb-4">Recent conversations</h2>
      <button
        className="w-full border-2 border-dashed border-primary rounded-xl flex items-center justify-between px-4 py-3 mb-4 hover:bg-primary/5 transition"
        onClick={onStartNew}
      >
        <span className="font-semibold">Start a new conversation</span>
        <span className="text-primary text-xl font-bold">+</span>
      </button>
      <div className="flex flex-col gap-2">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            className="w-full text-left rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-primary transition"
            onClick={() => onSelect(conv.id)}
          >
            <div className="font-semibold text-[15px] text-[#10141a] truncate">{conv.title}</div>
            {conv.subtitle && (
              <div className="text-[13px] text-gray-500 truncate">{conv.subtitle}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
