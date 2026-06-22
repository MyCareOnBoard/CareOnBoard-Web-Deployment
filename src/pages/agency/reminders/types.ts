export type ReminderType = "normal" | "ai_prompt";
export type ReminderStatus = "pending" | "sent" | "failed";

export interface Reminder {
  id: string;
  uid: string;
  agencyId: string;
  type: ReminderType;
  message: string;
  scheduledDate: string;   // YYYY-MM-DD
  scheduledTime: string;   // HH:mm
  scheduledAt?: string;    // ISO string (from backend)
  status: ReminderStatus;
  result?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderDraft {
  type: ReminderType;
  message: string;
  scheduledDate: string;
  scheduledTime: string;
}

export function getReminderDateTime(reminder: Pick<Reminder, "scheduledDate" | "scheduledTime">) {
  return new Date(`${reminder.scheduledDate}T${reminder.scheduledTime}:00`);
}
