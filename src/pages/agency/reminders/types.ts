export type ReminderType = "normal" | "ai_prompt";
export type ReminderStatus = "pending" | "sent" | "failed";
export type ReminderRecurrence = "none" | "daily" | "weekly" | "biweekly" | "monthly";
export type ReminderMode = "ddd" | "hha";

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
  /** Program view the reminder was created in; absent = shows in both views. */
  mode?: ReminderMode | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderDraft {
  type: ReminderType;
  message: string;
  scheduledDate: string;
  scheduledTime: string;
  recurrence: ReminderRecurrence;
  mode?: ReminderMode | null;
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
