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

/** A document the staff member's agency asked them to upload (GET /documents/requests). */
export interface EmployeeDocumentRequest {
  id: string;
  documentType: string;
  documentLabel: string;
  requestedAt: string | null;
  requestedExpiryDate: string | null;
  message: string;
  /** True until a document of this type is uploaded after the request. */
  outstanding: boolean;
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
