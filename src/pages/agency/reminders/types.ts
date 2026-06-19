export interface Reminder {
  id: string;
  message: string;
  date: string;
  time: string;
  createdAt: string;
  updatedAt: string;
}

export type ReminderDraft = Pick<Reminder, "message" | "date" | "time">;

export function getReminderDateTime(reminder: Pick<Reminder, "date" | "time">) {
  return new Date(`${reminder.date}T${reminder.time}:00`);
}
