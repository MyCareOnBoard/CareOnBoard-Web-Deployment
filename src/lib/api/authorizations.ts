import axiosClient from '../axios';

export type AuthorizationStatus = {
  id: string;
  name: string;
  enabled: boolean;
  enabledAt?: string;
  enabledBy?: string;
};

export type AuthorizationsResponse = {
  success: boolean;
  authorizations: AuthorizationStatus[];
  allEnabled: boolean;
};

export type UpdateAuthorizationsRequest = {
  drugTest?: boolean;
  fingerprint?: boolean;
  centralRegistry?: boolean;
  cariCheck?: boolean;
  sexOffenderRegistry?: boolean;
  oigExclusion?: boolean;
  healthTbScreening?: boolean;
  referenceChecks?: boolean;
  [key: string]: boolean | undefined;
};

export type UpdateAuthorizationsResponse = {
  success: boolean;
  message?: string;
  authorizations?: AuthorizationStatus[];
  allEnabled: boolean;
};

export const authorizationsApi = {
  async get(applicantId: string) {
    const res = await axiosClient.get<AuthorizationsResponse>(
      `/agencyApplicants/${encodeURIComponent(applicantId)}/authorizations`
    );
    return res.data;
  },

  async update(applicantId: string, payload: UpdateAuthorizationsRequest) {
    const res = await axiosClient.post<UpdateAuthorizationsResponse>(
      `/agencyApplicants/${encodeURIComponent(applicantId)}/authorizations`,
      payload
    );
    return res.data;
  },
};
