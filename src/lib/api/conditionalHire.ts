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
    const res = await axiosClient.get<ConditionalHireStatusResponse>(`/conditionalHire/status?applicantId=${encodeURIComponent(applicantId)}`);
    return res.data;
  },
};
