export type ReminderType = "normal" | "ai_prompt";
export type ReminderStatus = "pending" | "sent" | "failed";
export type ReminderRecurrence = "none" | "daily" | "weekly" | "biweekly" | "monthly";

export interface Reminder {
  id: string;
  uid: string;
  agencyId: string;
  type: ReminderType;
  message: string;
  scheduledDate: string;       // YYYY-MM-DD
  scheduledTime: string;       // HH:mm
  scheduledAt?: string;        // ISO string (from backend)
  recurrence: ReminderRecurrence;
  lastSentAt?: string | null;  // ISO string — last time this reminder fired
  status: ReminderStatus;
  result?: string | null;
  conversationId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderDraft {
  type: ReminderType;
  message: string;
  scheduledDate: string;
  scheduledTime: string;
  recurrence: ReminderRecurrence;
}

export const RECURRENCE_LABELS: Record<ReminderRecurrence, string> = {
  none: "One-time",
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
};

export function getReminderDateTime(reminder: Pick<Reminder, "scheduledDate" | "scheduledTime">) {
  return new Date(`${reminder.scheduledDate}T${reminder.scheduledTime}:00`);
}
