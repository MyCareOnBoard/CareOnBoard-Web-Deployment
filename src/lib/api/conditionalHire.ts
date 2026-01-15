import axiosClient from '../axios';

export type ConditionalHireStatusResponse = {
  success: boolean;
  status: {
    letterSigning: {
      hasSigned: boolean;
      isSubmitted: boolean;
      signatureType: string;
      signedAt?: string;
      submittedAt?: string;
    };
    complianceRequirements: {
      isCompleted: boolean;
      hasCompliance: boolean;
      finalizedAt?: string;
    };
    overall: {
      status: string; // e.g., 'not_started' | 'in_progress' | 'completed'
      readyForNextStep: boolean;
    };
  };
};

export const conditionalHireApi = {
  async status(applicantId: string) {
    try {
      // Try nested path first (matches new backend structure)
      const res = await axiosClient.get<ConditionalHireStatusResponse>(`/agencyApplicants/${encodeURIComponent(applicantId)}/conditional-hire`);
      return res.data;
    } catch (err: any) {
      // Fallback to query param style if nested path not found
      if (err?.response?.status === 404) {
        const res = await axiosClient.get<ConditionalHireStatusResponse>(`/conditionalHire/status?applicantId=${encodeURIComponent(applicantId)}`);
        return res.data;
      }
      throw err;
    }
  },
  
  async finalize(applicantId: string, payload: any) {
    const res = await axiosClient.post(`/conditionalHire/finalize?applicantId=${encodeURIComponent(applicantId)}`, payload);
    return res.data;
  },
  
  async submit(applicantId: string) {
    const res = await axiosClient.post(`/conditionalHire/submit?applicantId=${encodeURIComponent(applicantId)}`, {});
    return res.data;
  },
};
