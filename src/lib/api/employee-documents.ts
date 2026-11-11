/**
 * Employee Documents API Service
 * Handles all API calls related to employee documents
 */

import axiosClient from '../axios';

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  documentType: string;
  documentName: string;
  fileName?: string;
  fileUrl?: string;
  status: 'available' | 'expired' | 'expiring-soon' | 'pending' | 'unavailable';
  uploadedAt?: string;
  expiryDate?: string;
  expiryDateKey?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  notes?: string;
  agencyId?: string;
  /** Whether this document type carries an expiry date. */
  requiresExpiry?: boolean;
  /** Agency review of the file. Staff uploads start pending; older records are accepted. */
  review?: EmployeeDocumentReview;
}

export interface EmployeeDocumentReview {
  status: 'pending' | 'accepted' | 'rejected';
  reason: string | null;
  reviewedAt: string | null;
  submittedAt: string | null;
}

export interface ListEmployeeDocumentsResponse {
  success: boolean;
  documents: EmployeeDocument[];
}

export interface UploadEmployeeDocumentRequest {
  employeeId: string;
  documentType: string;
  documentName: string;
  file: File;
  expiryDate?: string;
  expiryDateKey?: string;
  notes?: string;
  agencyId?: string;
}

export interface UploadEmployeeDocumentResponse {
  success: boolean;
  document: EmployeeDocument;
}

/**
 * List employee documents
 * Endpoint: GET /employees/:employeeId/documents
 */
export async function listEmployeeDocuments(employeeId: string): Promise<EmployeeDocument[]> {
  try {
    const response = await axiosClient.get<ListEmployeeDocumentsResponse>(`/employees/${employeeId}/documents`);
    
    if (!response.data.success) {
      throw new Error('Failed to list employee documents');
    }
    
    return response.data.documents;
  } catch (err: any) {
    console.error('listEmployeeDocuments error:', err);
    throw new Error(err.message || 'Failed to list employee documents');
  }
}

/**
 * Upload employee document
 * Endpoint: POST /employees/:employeeId/documents
 */
export async function uploadEmployeeDocument(data: UploadEmployeeDocumentRequest): Promise<EmployeeDocument> {
  try {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('documentType', data.documentType);
    formData.append('documentName', data.documentName);
    if (data.expiryDateKey) formData.append('expiryDateKey', data.expiryDateKey);
    else if (data.expiryDate) formData.append('expiryDate', data.expiryDate);
    if (data.notes) formData.append('notes', data.notes);

    const response = await axiosClient.post<UploadEmployeeDocumentResponse>(
      `/employees/${data.employeeId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (!response.data.success) {
      throw new Error('Failed to upload employee document');
    }

    return response.data.document;
  } catch (err: any) {
    console.error('uploadEmployeeDocument error:', err);
    throw new Error(err.response?.data?.message || err.message || 'Failed to upload employee document');
  }
}

/**
 * Delete employee document
 * Endpoint: DELETE /employees/:employeeId/documents/:documentId
 */
export async function deleteEmployeeDocument(employeeId: string, documentId: string): Promise<void> {
  try {
    await axiosClient.delete(`/employees/${employeeId}/documents/${documentId}`);
  } catch (err: any) {
    console.error('deleteEmployeeDocument error:', err);
    throw new Error(err.response?.data?.message || err.message || 'Failed to delete employee document');
  }
}

function apiMessage(err: any, fallback: string): string {
  return err?.response?.data?.message || err?.message || fallback;
}

/**
 * Accept or reject a staff member's uploaded document. Accepting can also set the
 * expiry date (YYYY-MM-DD); rejecting needs a reason the staff member will see.
 * Endpoint: POST /employees/:employeeId/documents/:documentId/review
 */
export async function reviewEmployeeDocument(
  employeeId: string,
  documentId: string,
  review: ({ decision: 'accept'; expiryDateKey?: string } | { decision: 'reject'; reason: string }) & { expectedUploadedAt?: string },
): Promise<void> {
  try {
    await axiosClient.post(`/employees/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(documentId)}/review`, review);
  } catch (err: any) {
    console.error('reviewEmployeeDocument error:', err);
    throw new Error(apiMessage(err, 'Failed to save the review'));
  }
}

/**
 * Set or correct a staff document's expiry date (YYYY-MM-DD).
 * Endpoint: PATCH /employees/:employeeId/documents/:documentId/expiry
 */
export async function setEmployeeDocumentExpiry(employeeId: string, documentId: string, expiryDateKey: string): Promise<void> {
  try {
    await axiosClient.patch(`/employees/${encodeURIComponent(employeeId)}/documents/${encodeURIComponent(documentId)}/expiry`, { expiryDateKey });
  } catch (err: any) {
    console.error('setEmployeeDocumentExpiry error:', err);
    throw new Error(apiMessage(err, 'Failed to save the expiry date'));
  }
}

/**
 * Check whether a document expiry date is "expiring soon" (within 2 months of today).
 */
export function isExpiringSoon(expiryDate?: string | null): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const twoMonthsFromNow = new Date();
  twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
  return expiry <= twoMonthsFromNow && expiry >= new Date();
}

/**
 * Request new document from employee
 * Endpoint: POST /employees/:employeeId/documents/request
 * Payload: { documentType: string, expiryDate?: string }
 */
export async function requestEmployeeDocument(
  employeeId: string,
  documentType: string,
  expiryDate?: string,
): Promise<void> {
  try {
    await axiosClient.post(`/employees/${employeeId}/documents/request`, {
      documentType,
      ...(expiryDate ? { expiryDate } : {}),
    });
  } catch (err: any) {
    console.error('requestEmployeeDocument error:', err);
    throw new Error(err.response?.data?.message || err.message || 'Failed to request employee document');
  }
}

/**
 * Send document alert (expired or expiring) to employee
 * Endpoint: POST /employees/:employeeId/documents/:documentId/alerts
 * Creates an in-app notification for the employee about the specific document.
 */
export async function sendDocumentAlert(
  employeeId: string,
  documentId: string,
): Promise<void> {
  try {
    const response = await axiosClient.post<{ success: boolean; message: string }>(
      `/employees/${employeeId}/documents/${documentId}/alerts`,
    );
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to send document alert');
    }
  } catch (err: any) {
    console.error('sendDocumentAlert error:', err);
    throw new Error(err.response?.data?.message || err.message || 'Failed to send document alert');
  }
}
