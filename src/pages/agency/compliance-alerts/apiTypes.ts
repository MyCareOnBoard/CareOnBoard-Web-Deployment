export interface Employee {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role: string;
  status: string;
}

export interface ExpiredDocument {
  id: string;
  employeeId: string;
  documentType: string;
  fileUrl: string;
  uploadDate: string;
  expiryDate: string;
  status: string;
  daysExpired: number;
  employee: Employee;
  agencyId?: string;
}

export interface ExpiredDocumentsResponse {
  success: boolean;
  data: ExpiredDocument[];
  count: number;
}

/** A client currently on an unsigned Form 485 (in the grace window or deactivated). */
export interface UnsignedForm485Client {
  id: string;
  name: string;
  type: string; // "hha"
  status: string; // "active" | "pending" | ...
  deadline: string | null; // ISO — when the 14-day grace ends
  daysLeft: number | null; // <= 0 means overdue
  deactivated: boolean; // grace lapsed → not active
}

export interface UnsignedForm485Response {
  success: boolean;
  data: UnsignedForm485Client[];
  count: number;
}

export interface SourceRevision { seconds: number; nanoseconds: number; }
export interface DocumentComplianceItem {
  issueId: string; documentId: string; employeeId: string; employeeName: string;
  employeeStatus: string; documentLabel: string; program: string;
  expiryDateKey: string | null; timezone: string;
  condition: 'current' | 'not_applicable' | 'expiring' | 'due_today' | 'expired' | 'needs_review';
  milestone: string | null; reasonCode: string | null; evidenceStatus: string;
  evaluatedAt: string | null; syncStatus: 'pending' | 'error' | 'ready';
  observedSourceRevision: SourceRevision | null;
  resolvedAt: string | null; resolutionReason: string | null;
}
export interface DocumentComplianceResponse {
  pilotEnabled: boolean; items: DocumentComplianceItem[]; nextCursor: string | null;
  evaluatedAt: string | null; syncStatus: string;
  timezone: string | null; localDate: string | null;
}
export interface DocumentComplianceArgs {
  viewerId?: string; agencyId?: string; employeeId?: string; mode?: string; condition?: string;
  search?: string; employeeStatus?: string; cursor?: string; limit?: number;
}
export function complianceLabel(item?: DocumentComplianceItem): string {
  if (!item) return 'Updating expiry status…';
  if (item.syncStatus === 'error') return 'Expiry status unavailable';
  return ({current: 'Current', not_applicable: 'Not applicable', expiring: 'Expiring',
    due_today: 'Expires today', expired: 'Expired', needs_review: 'Needs review'})[item.condition];
}
export function civilDateLabel(key?: string | null): string {
  if (!key) return '';
  return new Date(key + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
}

export interface DocumentComplianceSettings {
  state: 'disabled' | 'baselining' | 'active' | 'paused';
  timezone: string | null;
  canEnable: boolean;
  message?: string;
}
