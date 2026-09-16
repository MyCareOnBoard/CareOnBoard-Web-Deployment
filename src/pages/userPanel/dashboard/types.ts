import type { SourceRevision } from '@/pages/agency/compliance-alerts/apiTypes';

export interface GetEmployeeDocumentsResponse {
  id: string;
  documentId: string;
  employeeId: string;
  documentType: string;
  fileUrl: string;
  status: string;
  uploadDate: string;
  expiryDate: string | null;
  expiryDateKey?: string | null;
  agencyId?: string;
}

export interface SaveEmployeeDocumentPayload {
  fileUrl: string;
  documentType: string;
  expiryDate: string | null;
  expiryDateKey?: string | null;
  agencyId?: string;
}

export interface GetEmployeeInfoResponse {
  id: string;
  fullName: string;
  dateOfBirth: string | null;
  workAvailability: boolean;
  hireDate: string | null;
  profilePicture: string | null;
  tagId: string;
  role: string;
}

export interface UpdateEmployeeInfoPayload {
  workAvailability: boolean;
}
export interface SaveEmployeeDocumentResponse {
  documentId?: string;
  sourceRevision?: SourceRevision | null;
}
