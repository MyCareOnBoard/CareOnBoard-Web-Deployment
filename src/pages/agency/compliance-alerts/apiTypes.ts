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
