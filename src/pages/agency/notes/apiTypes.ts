export interface SubmittedNoteDetail {
  id: string;
  startDate: string | null;
  endDate: string | null;
  metadata: Record<string, any>;
  status: string;
}

export interface SubmittedNoteSummary {
  id: string;
  agencyId: string;
  agencyName: string;
  employeeId: string;
  employeeName: string;
  activityLogId: string;
  activityType: string;
  activityDescription: string;
  submittedAt: string | null;
  approvedAt?: string | null;
  noteCount: number;
  status: "submitted" | "approved";
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface SubmittedNotesResponse {
  data: SubmittedNoteSummary[];
  pagination: PaginationInfo;
}

export interface SubmittedNotesQueryParams {
  agencyId?: string;
  page?: number;
  limit?: number;
  activityType?: string;
  clientType?: 'hha' | 'ddd';
  search?: string;
  timeInterval?: 'today' | 'this-month' | 'this-year' | 'all';
  status?: 'submitted' | 'approved';
  startDate?: string;
  endDate?: string;
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
