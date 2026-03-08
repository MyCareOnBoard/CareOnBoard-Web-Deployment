import axiosClient from '../axios';

export type ApplicantDocumentItem = {
  id: string;
  type: string;
  label: string;
  required: boolean;
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
  url?: string;
  expiryDate?: string;
  uploadedAt?: string;
  verifiedAt?: string;
  note?: string;
};

export type ApplicantDocumentsResponse = {
  success: boolean;
  documents: ApplicantDocumentItem[];
};

export type ApplicantProgressResponse = {
  success: boolean;
  progress: {
    overallPercent: number;
    profileScreening: boolean;
    documentsUploaded: boolean;
    documentsVerified: boolean;
    conditionalHire: boolean;
    finalAgencyReview: boolean;
    totalDocs: number;
    uploadedDocs: number;
    verifiedDocs: number;
    missingRequired?: string[];
  };
};

export const agencyApplicantsExtraApi = {
  async documents(uid: string) {
    const res = await axiosClient.get<ApplicantDocumentsResponse>(`/agencyApplicants/${encodeURIComponent(uid)}/documents`);
    return res.data;
  },
  // Optional consolidated progress snapshot if backend provides it
  async progress(uid: string) {
    const res = await axiosClient.get<ApplicantProgressResponse>(`/agencyApplicants/${encodeURIComponent(uid)}/progress`);
    return res.data;
  },
  async verifyDocument(uid: string, docId: string, note?: string) {
    const res = await axiosClient.post(`/agencyApplicants/${encodeURIComponent(uid)}/documents/${encodeURIComponent(docId)}/verify`, { note });
    return res.data;
  },
  async rejectDocument(uid: string, docId: string, reason: string) {
    const res = await axiosClient.post(`/agencyApplicants/${encodeURIComponent(uid)}/documents/${encodeURIComponent(docId)}/reject`, { reason });
    return res.data;
  },
  async requestDocument(uid: string, documentType: string, expiryDate?: string) {
    const res = await axiosClient.post(
      `/agencyApplicants/${encodeURIComponent(uid)}/documents/request`,
      { documentType, expiryDate },
    );
    return res.data;
  },
  async advanceFromDocuments(uid: string) {
    const res = await axiosClient.post(
      `/agencyApplicants/${encodeURIComponent(uid)}/documents/advance`,
      {},
    );
    return res.data;
  },
  async updateDocument(uid: string, docId: string, payload: Partial<ApplicantDocumentItem>) {
    const res = await axiosClient.patch(`/agencyApplicants/${encodeURIComponent(uid)}/documents/${encodeURIComponent(docId)}`, payload);
    return res.data;
  },
  async markReadyForOfficialHire(uid: string) {
    const res = await axiosClient.post(`/agencyApplicants/${encodeURIComponent(uid)}/mark-ready-for-official-hire`, {});
    return res.data;
  },
  
  // References
  async getReferences(uid: string) {
    const res = await axiosClient.get(`/agencyApplicants/${encodeURIComponent(uid)}/references`);
    return res.data;
  },
  
  // Approval and Rejection
  async approveForHire(uid: string) {
    const res = await axiosClient.post(`/agencyApplicants/${encodeURIComponent(uid)}/approve-for-hire`, {});
    return res.data;
  },
  
  async reject(uid: string, reason: string) {
    const res = await axiosClient.post(`/agencyApplicants/${encodeURIComponent(uid)}/reject`, { reason });
    return res.data;
  },
  
  // Communication tracking
  async initiateCommunication(uid: string, payload: { type: 'call' | 'chat'; notes?: string; duration?: number }) {
    const res = await axiosClient.post(`/agencyApplicants/${encodeURIComponent(uid)}/initiate-communication`, payload);
    return res.data;
  },
  
  // Authorization alerts
  async createAuthorizationAlert(uid: string, payload: { authorizationType: string; severity: 'low' | 'medium' | 'high'; message: string; details?: any }) {
    const res = await axiosClient.post(`/agencyApplicants/${encodeURIComponent(uid)}/authorization-alert`, payload);
    return res.data;
  },
};
