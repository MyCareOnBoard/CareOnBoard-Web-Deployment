import axiosClient from '../axios';

export type ApplicantDocumentItem = {
  id: string;
  type: string;
  label: string;
  required: boolean;
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
  url?: string;
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
  async updateDocument(uid: string, docId: string, payload: Partial<ApplicantDocumentItem>) {
    const res = await axiosClient.patch(`/agencyApplicants/${encodeURIComponent(uid)}/documents/${encodeURIComponent(docId)}`, payload);
    return res.data;
  },
  async markReadyForOfficialHire(uid: string) {
    const res = await axiosClient.post(`/agencyApplicants/${encodeURIComponent(uid)}/mark-ready-for-official-hire`, {});
    return res.data;
  },
};
