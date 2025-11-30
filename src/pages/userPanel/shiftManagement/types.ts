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

// Note: Shift and related types are now imported from @/lib/api/shift-management
// ShiftSectionProps is defined locally in index.tsx with additional properties

