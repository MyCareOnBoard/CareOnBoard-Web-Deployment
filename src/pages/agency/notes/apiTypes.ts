export interface SubmittedNoteDetail {
  id: string;
  startDate: string | null;
  endDate: string | null;
  metadata: Record<string, any>;
  status: string;
}

export interface SubmittedNote {
  id: string;
  employeeId: string;
  employeeName: string;
  activityLogId: string;
  activityType: string;
  activityDescription: string;
  submittedAt: string | null;
  submittedBy: string;
  approvedAt?: string | null;
  approvedBy?: string | null;
  noteCount: number;
  notes: SubmittedNoteDetail[];
  status: "submitted" | "approved" | "rejected";
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface SubmittedNotesResponse {
  data: SubmittedNote[];
  pagination: PaginationInfo;
}

export interface SubmittedNotesQueryParams {
  page?: number;
  limit?: number;
  activityType?: string;
  search?: string;
  timeInterval?: 'today' | 'this-month' | 'this-year' | 'all';
  status?: 'submitted' | 'approved';
}
