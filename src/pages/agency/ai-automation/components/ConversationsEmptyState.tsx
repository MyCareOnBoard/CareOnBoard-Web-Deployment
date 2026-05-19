import React from "react";

export default function ConversationsEmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <h2 className="text-lg font-semibold mb-4">Recent conversations</h2>
      <div className="flex flex-col items-center justify-center flex-1">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">💬</div>
          <div className="text-gray-700 font-medium mb-2">We haven't communicated yet!</div>
          <div className="text-gray-400 text-sm mb-4">Tell me how I can help you today</div>
        </div>
        <button
          className="w-full rounded-full bg-primary text-white py-3 px-4 font-semibold text-base hover:bg-primary/90 transition"
          onClick={onStart}
        >
          Start a conversation
        </button>
      </div>
    </div>
  );
}
