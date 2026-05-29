import type { NotificationSettings } from "@/lib/api/settings";

export type NotificationToggleRow = {
  key: keyof NotificationSettings;
  title: string;
  description: string;
};

export const NOTIFICATION_TOGGLE_ROWS: NotificationToggleRow[] = [
  {
    key: "emailNotifications",
    title: "Email notifications",
    description: "Stay informed via email about important activities and updates.",
  },
  {
    key: "inAppNotifications",
    title: "In-app notifications",
    description: "Instant alerts within the app to help you stay on top of things.",
  },
  {
    key: "appointmentChanges",
    title: "Appointment changes",
    description: "Be alerted if an appointment is updated or canceled.",
  },
  {
    key: "systemWarnings",
    title: "System warnings",
    description: "Important system-related alerts that may need your attention.",
  },
];
