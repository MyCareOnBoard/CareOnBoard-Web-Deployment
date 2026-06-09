import axiosClient from '../axios';

const BASE = '/manualOnboarding';

export interface DocumentEntry {
  url: string | null;
  expiryDate: string;
}

export interface CompleteOnboardingPayload {
  profile: {
    fullName: string;
    email: string;
    password: string;
    dateOfBirth: string;
    address: string;
    gender: string;
    preScreeningAnswers: Record<string, string>;
  };
  documents: Record<string, DocumentEntry | null>;
  references: Array<{
    name: string;
    relationship: string;
    phoneNumber: string;
    email: string;
  }>;
  compliance: {
    authorizations: Record<string, boolean>;
    agreements: Record<string, boolean>;
  };
}

export const uploadTempDocument = async (
  sessionKey: string,
  documentType: string,
  file: File,
): Promise<{ url: string; fileName: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axiosClient.post<{ success: boolean; url: string; fileName: string }>(
    `${BASE}/upload-document?documentType=${encodeURIComponent(documentType)}&sessionKey=${encodeURIComponent(sessionKey)}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 },
  );
  return response.data;
};

export const completeManualOnboarding = async (
  data: CompleteOnboardingPayload,
): Promise<{ uid: string }> => {
  const response = await axiosClient.post<{ success: boolean; uid: string; message: string }>(
    `${BASE}/complete`,
    data,
  );
  return response.data;
};
