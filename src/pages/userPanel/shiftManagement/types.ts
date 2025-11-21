export enum ShiftStatus {
  PENDING = "pending",
  AVAILABLE = "available",
  ONGOING = "ongoing",
  COMPLETED = "completed",
  EXPIRED = "expired",
}

export enum ShiftActionStatus {
  CLOCK_IN = "clock_in",
  SHIFT_STARTED = "shift_started",
  CLOCK_OUT = "clock_out",
}

export enum ShiftType {
  AUTOMATIC = "automatic",
  MANUAL = "manual",
}

export enum SubmissionStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
}

export interface Client {
  id: string;
  name: string;
  avatar?: string;
}

export interface Shift {
  id: string;
  client: Client;
  date: string;
  location: string;
  startTime: string;
  endTime?: string;
  availableAt?: string;
  clockedInAt?: string;
  clockedOutAt?: string;
  status: ShiftStatus;
  actionStatus?: ShiftActionStatus;
  type?: ShiftType; // Default: automatic
  submissionStatus?: SubmissionStatus; // Default: draft
  timeRemaining?: number; // minutes remaining
  sessionDuration?: string; // e.g., "2 hour session"
  additionalStatus?: string; // e.g., "Expiring Soon", "Starts tomorrow"
}

export interface ShiftSectionProps {
  title: string;
  subtitle: string;
  shifts: Shift[];
  isExpanded?: boolean;
  onExpandToggle?: () => void;
  backgroundColor: string;
  showExpandButton?: boolean;
}

