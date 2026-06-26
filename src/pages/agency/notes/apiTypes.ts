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
  agencyId: string;
  page?: number;
  limit?: number;
  activityType?: string;
  clientType?: 'hha' | 'ddd';
  search?: string;
  timeInterval?: 'today' | 'this-month' | 'this-year' | 'all';
  status?: 'submitted' | 'approved';
}

export interface SubmittedNoteDetails {
  id: string;
  activityType: string;
  description: string;
  metadata: Record<string, any>;
  notes: SubmittedNoteDetail[];
  status: 'submitted' | 'approved';
  submissionId: string;
  submittedAt: string | null;
  submittedBy: string;
  approvedAt?: string | null;
  approvedBy?: string | null;
  employee: {
    id: string;
    fullName: string;
    email?: string;
  };
}
