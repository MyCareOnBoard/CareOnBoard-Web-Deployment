interface ActivityLog {
  id: string;
  activityType: string;
  description: string;
}

export interface GetActivityLogsResponse {
  data: ActivityLog[];
  success: boolean;
  message: string;
}

export interface ActivityLogNote {
  id: string;
  startDate: string;
  endDate: string;
  metadata?: Record<string, any>;
}

export interface GetActivityLogResponse {
  id: string;
  employeeId: string;
  activityType: string;
  description: string;
  metadata: Record<string, any>;
  status: string;
  notes: ActivityLogNote[];
  createdBy: string;
  createdAt: string;
}

export interface CreateActivityLogPayload {
  id?: string;
  startDate: string;
  endDate: string;
  metadata?: Record<string, any>;
  index?: number;
}

export interface UpdateActivityLogPayload {
  strategies?: string[];
  jobType?: string;
  ISPOutcome?: string;
  totalHours?: string;
  reportingStartDate?: string;
  reportingEndDate?: string;
}