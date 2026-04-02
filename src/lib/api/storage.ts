import axiosClient from '../axios';

export type SignedUrlRequest = {
  fileName: string;
  contentType: string;
  context?: 'applicantDoc' | 'clientDoc';
  applicantId?: string;
  clientId?: string;
  docType?: string;
};

export type SignedUrlResponse = {
  signedUrl: string;
  method?: 'PUT' | 'POST';
  fields?: Record<string, string>; // For POST multipart to S3-like storage
  publicUrl?: string; // Optional immediate public URL
};

export const storageApi = {
  async getSignedUrl(payload: SignedUrlRequest) {
    const res = await axiosClient.post<SignedUrlResponse>('/storage/signed-url', payload);
    return res.data;
  },
  async completeUpload(payload: { fileName: string; context?: string; applicantId?: string; clientId?: string; docType?: string; publicUrl?: string }) {
    const res = await axiosClient.post('/files/complete', payload);
    return res.data;
  },
};
