import type {
  UserConversation,
  UserMessage,
} from "@/lib/api/userMessaging";
import type {
  Conversation,
  Message,
} from "@/lib/hooks/useMessaging";

type TimestampLike = {
  seconds?: number;
  nanoseconds?: number;
  _seconds?: number;
  _nanoseconds?: number;
  toDate?: () => Date;
};

export function normalizeRestTimestamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number") {
    const numericValue =
      typeof value === "number" && Math.abs(value) < 1_000_000_000_000
        ? value * 1000
        : value;
    const date = new Date(numericValue);
    return Number.isNaN(date.getTime())
      ? new Date().toISOString()
      : date.toISOString();
  }
  if (value && typeof value === "object") {
    const timestamp = value as TimestampLike;
    if (typeof timestamp.toDate === "function") {
      return timestamp.toDate().toISOString();
    }
    const seconds = timestamp.seconds ?? timestamp._seconds;
    const nanoseconds = timestamp.nanoseconds ?? timestamp._nanoseconds ?? 0;
    if (typeof seconds === "number" && typeof nanoseconds === "number") {
      return new Date(seconds * 1000 + nanoseconds / 1_000_000)
        .toISOString();
    }
  }
  return new Date().toISOString();
}

export function mapRestConversation(
  conversation: UserConversation,
): Conversation {
  const participants = (conversation.participants || []).map((participant) => ({
    uid: participant.uid,
    name: participant.name,
    role: participant.role,
    avatar: participant.avatar,
    userType: participant.userType || participant.role || "user",
    agencyName: participant.agencyName,
  }));
  const lastMessage = typeof conversation.lastMessage === "string"
    ? conversation.lastMessage
    : conversation.lastMessage?.text || null;

  return {
    ...conversation,
    type: conversation.type || "direct",
    participants,
    participantDetails: participants,
    lastMessage,
    lastMessageAt: conversation.lastMessageAt
      ? normalizeRestTimestamp(conversation.lastMessageAt)
      : null,
    createdAt: normalizeRestTimestamp(conversation.createdAt),
    updatedAt: normalizeRestTimestamp(conversation.updatedAt),
    createdBy: conversation.createdBy || "",
  };
}

export function mapRestMessage(
  message: UserMessage,
  currentUserId?: string,
): Message {
  const readBy = Array.isArray(message.readBy)
    ? message.readBy
    : Object.keys(message.readBy || {});
  const status = ["sent", "delivered", "read"].includes(message.status || "")
    ? message.status as Message["status"]
    : "sent";

  return {
    ...message,
    content: message.content || message.text || "",
    readBy,
    isRead: currentUserId ? readBy.includes(currentUserId) : false,
    status,
    createdAt: normalizeRestTimestamp(message.createdAt),
    updatedAt: normalizeRestTimestamp(
      message.updatedAt || message.createdAt,
    ),
  };
}
