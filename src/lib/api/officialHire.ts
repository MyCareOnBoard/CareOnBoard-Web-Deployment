import axiosClient from '../axios';

export type OfficialHireStatusResponse = {
  success: boolean;
  status: {
    letterSigning: {
      hasSigned: boolean;
      isSubmitted: boolean;
      signatureType: string;
      signedAt?: string;
      submittedAt?: string;
    };
    overall: {
      status: string; // e.g., 'not_started' | 'in_progress' | 'completed'
      readyForNextStep: boolean;
    };
  };
};

export type OfferLetterRequest = {
  applicantId: string;
  templateId: string;
  variables?: Record<string, string | number | boolean>;
};

export type SignatureRequest = {
  applicantId: string;
  docId: string;
};

export const officialHireApi = {
  async status(applicantId: string) {
    // Try nested path first, fall back to query param path
    try {
      const res = await axiosClient.get<OfficialHireStatusResponse>(`/agencyApplicants/${encodeURIComponent(applicantId)}/official-hire`);
      return res.data;
    } catch (err: any) {
      // Fallback to query param style if nested path not found
      if (err?.response?.status === 404) {
        const res = await axiosClient.get<OfficialHireStatusResponse>(`/officialHire/status?applicantId=${encodeURIComponent(applicantId)}`);
        return res.data;
      }
      throw err;
    }
  },
  async sendOfferLetter(payload: OfferLetterRequest) {
    const res = await axiosClient.post('/officialHire/offer-letter', payload);
    return res.data;
  },
  async requestSignature(payload: SignatureRequest) {
    const res = await axiosClient.post('/officialHire/signature/request', payload);
    return res.data;
  },
  async confirm(applicantId: string) {
    const res = await axiosClient.post('/officialHire/confirm', { applicantId });
    return res.data;
  },
};
