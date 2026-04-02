/**
 * Online Status Indicator Component
 * Shows user's online/offline status with last seen timestamp
 */

import React from "react";
import { formatDistanceToNow } from "date-fns";
import { useUserPresence, UserPresence } from "@/lib/hooks/usePresence";

interface OnlineStatusIndicatorProps {
  userId: string;
  showText?: boolean;
  className?: string;
}

export function OnlineStatusIndicator({
  userId,
  showText = false,
  className = "",
}: OnlineStatusIndicatorProps) {
  const { presence, loading } = useUserPresence(userId);

  if (loading || !presence) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
        {showText && <span className="text-xs text-gray-500">Loading...</span>}
      </div>
    );
  }

  const isOnline = presence.status === "online";

  return (
    <div className={`flex items-center gap-2 border-2 border-white rounded-full ${className}`}>
      <div
        className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-400"
          }`}
        title={isOnline ? "Online" : "Offline"}
      />
      {showText && (
        <span className="text-xs text-gray-600">
          {isOnline ? (
            "Online"
          ) : presence.lastSeen ? (
            `Last seen ${formatDistanceToNow(presence.lastSeen, { addSuffix: true })}`
          ) : (
            "Offline"
          )}
        </span>
      )}
    </div>
  );
}

interface PresenceBadgeProps {
  presence: UserPresence | null;
  showText?: boolean;
}

export function PresenceBadge({ presence, showText = false }: PresenceBadgeProps) {
  if (!presence) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-gray-300" />
        {showText && <span className="text-xs text-gray-500">Unknown</span>}
      </div>
    );
  }

  const isOnline = presence.status === "online";

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-400"
          }`}
      />
      {showText && (
        <span className="text-xs text-gray-600">
          {isOnline ? (
            "Online"
          ) : presence.lastSeen ? (
            `Last seen ${formatDistanceToNow(presence.lastSeen, { addSuffix: true })}`
          ) : (
            "Offline"
          )}
        </span>
      )}
    </div>
  );
}
