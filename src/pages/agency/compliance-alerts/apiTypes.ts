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
