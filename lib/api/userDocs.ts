import axiosClient from '../axios';

export type UserDocSummary = {
  uploaded: number;
  total: number;
  complete: boolean;
};

export type UserDocItem = {
  label: string;
  url?: string;
  uploaded: boolean;
  uploadedAt?: string;
};

export type UserDocsAllResponse = {
  success: boolean;
  documents: Record<string, UserDocItem>;
  summary: UserDocSummary;
};

export type UserDocResponse = {
  success: boolean;
  type: string;
  url?: string;
  uploadedAt?: string;
};

export const userDocsApi = {
  async all() {
    const res = await axiosClient.get<UserDocsAllResponse>('/userDocs/all');
    return res.data;
  },
  async getByType(type: string) {
    const res = await axiosClient.get<UserDocResponse>(`/userDocs/document/${encodeURIComponent(type)}`);
    return res.data;
  },
};
