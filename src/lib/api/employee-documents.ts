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
  verifiedAt?: string;
  verifiedBy?: string;
  notes?: string;
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
  notes?: string;
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
    
    // Return mock documents for testing until backend is ready
    const mockDocuments: EmployeeDocument[] = [
      {
        id: '1',
        employeeId,
        documentType: 'id',
        documentName: "Photo ID (Driver's License, State ID, Passport)",
        status: 'available',
        uploadedAt: '2024-01-15T10:00:00Z',
      },
      {
        id: '2',
        employeeId,
        documentType: 'social-security',
        documentName: 'Social Security Card',
        status: 'available',
        uploadedAt: '2024-01-15T10:00:00Z',
      },
      {
        id: '3',
        employeeId,
        documentType: 'vaccination',
        documentName: 'Hepatitis B vaccination series documents or chest x ray',
        status: 'available',
        uploadedAt: '2024-02-01T10:00:00Z',
      },
      // {
      //   id: '4',
      //   employeeId,
      //   documentType: 'immunity',
      //   documentName: 'Hepatitis B immunity (titer result)',
      //   status: 'available',
      //   uploadedAt: '2024-02-01T10:00:00Z',
      // },
      {
        id: '5',
        employeeId,
        documentType: 'test',
        documentName: 'Tb test result',
        status: 'available',
        uploadedAt: '2024-02-10T10:00:00Z',
      },
      {
        id: '6',
        employeeId,
        documentType: 'form',
        documentName: 'I-9 Form',
        status: 'expired',
        uploadedAt: '2023-01-15T10:00:00Z',
        expiryDate: '2024-01-15T10:00:00Z',
      },
      {
        id: '7',
        employeeId,
        documentType: 'tax',
        documentName: 'W-4 Form',
        status: 'expiring-soon',
        uploadedAt: '2024-01-15T10:00:00Z',
        expiryDate: '2024-12-31T10:00:00Z',
      },
    ];
    
    return mockDocuments;
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
    if (data.expiryDate) formData.append('expiryDate', data.expiryDate);
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

/**
 * Request new document from employee
 * Endpoint: POST /employees/:employeeId/documents/request
 * 
 * ⚠️ NOTE: This endpoint is NOT yet implemented on the backend.
 * Backend team needs to add: POST /employees/:employeeId/documents/request
 * Expected payload: { documentType: string, message?: string }
 */
export async function requestEmployeeDocument(employeeId: string, documentType: string, message?: string): Promise<void> {
  try {
    await axiosClient.post(`/employees/${employeeId}/documents/request`, {
      documentType,
      message,
    });
  } catch (err: any) {
    console.error('requestEmployeeDocument error:', err);
    // Provide clear message if endpoint doesn't exist (404)
    if (err.response?.status === 404) {
      throw new Error('Document request feature is not yet available. The backend endpoint needs to be implemented.');
    }
    throw new Error(err.response?.data?.message || err.message || 'Failed to request employee document');
  }
}
