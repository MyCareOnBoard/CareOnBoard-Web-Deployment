import axiosClient from '../axios';

export interface Applicant {
  id: string;
  name: string;
  role: string;
  profileScreening: boolean;
  documents: boolean;
  conditionalHire: boolean;
  finalAgencyReview: boolean;
  avatar: string;
}

export interface ApplicantListResponse {
  success?: boolean;
  data: Applicant[];
  pagination?: {
    limit: number;
    offset: number;
    count: number;
  };
}

export interface ApplicantActionResponse {
  success?: boolean;
  message?: string;
}

const buildQuery = (params?: Record<string, string | number | undefined>) => {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
};

// Map backend applicant to UI model
const mapBackendToApplicant = (item: any): Applicant => {
  const id = item?.uid || item?.id || String(Math.random());
  const fullName = item?.fullName || [item?.firstName, item?.lastName].filter(Boolean).join(' ') || 'Unknown';
  const role = item?.userType === 'applicant' ? 'Applicant' : (item?.role || 'Applicant');
  const stages = item?.stages || {};

  // Prefer provided avatar fields, fallback to dicebear
  const avatar = item?.avatar || item?.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(id)}`;

  return {
    id,
    name: fullName,
    role,
    profileScreening: Boolean(stages.preScreening),
    documents: Boolean(stages.documents),
    conditionalHire: Boolean(stages.conditionalHire),
    finalAgencyReview: Boolean(stages.officialHire),
    avatar,
  };
};

export const applicantsApi = {
  // Optimized directory view with completion percentages and stage status
  directory: async (params?: { tab?: 'all' | 'clearance'; period?: 'today' | 'week' | 'month'; search?: string; limit?: number; offset?: number; status?: string }) => {
    try {
      const queryString = buildQuery(params);
      const response = await axiosClient.get<any>(`/agencyApplicants/directory${queryString}`);
      const body = response?.data;
      return {
        success: body?.success ?? true,
        data: Array.isArray(body?.applicants) ? body.applicants.map(mapBackendToApplicant) : [],
        pagination: body?.pagination,
      };
    } catch (err: any) {
      console.error('Error fetching directory:', err);
      return {
        success: false,
        data: [],
        pagination: { limit: 10, offset: 0, count: 0 },
      };
    }
  },

  list: async (params?: { period?: string; search?: string; limit?: number; offset?: number }) => {
    try {
      const queryString = buildQuery(params);
      let response: any;
      try {
        response = await axiosClient.get<any>(`/agencyApplicants${queryString}`);
      } catch (err: any) {
        // If endpoint not found, try alternate path used by backend
        if (err?.response?.status === 404) {
          try {
            response = await axiosClient.get<any>(`/applicants${queryString}`);
          } catch (err2: any) {
            // As a final fallback, query users filtered by applicant type
            if (err2?.response?.status === 404) {
              const qsUsers = buildQuery({
                userType: 'applicant',
                limit: params?.limit,
                offset: params?.offset,
                search: params?.search,
              });
              response = await axiosClient.get<any>(`/users${qsUsers}`);
            } else {
              throw err2;
            }
          }
        } else {
          throw err;
        }
      }

      // Back end sample: { success, count, agencyId, applicants: [...], pagination }
      const body = response?.data;
      let raw: any[] = [];
      let pagination = body?.pagination;
      let success = body?.success ?? true;

      if (Array.isArray(body)) {
        raw = body;
        pagination = {
          limit: params?.limit ?? 6,
          offset: params?.offset ?? 0,
          count: body.length,
        };
      } else if (body && typeof body === 'object') {
        if (Array.isArray(body.data)) {
          raw = body.data;
        } else if (Array.isArray(body.applicants)) {
          raw = body.applicants;
        } else if (Array.isArray(body.results)) {
          raw = body.results;
        } else if (Array.isArray(body.users)) {
          raw = body.users;
        }
      }

      const data: Applicant[] = raw.map(mapBackendToApplicant);

      return {
        success,
        data,
        pagination: pagination ?? {
          limit: params?.limit ?? 6,
          offset: params?.offset ?? 0,
          count: body?.count ?? data.length,
        },
      } satisfies ApplicantListResponse;
    } catch (error) {
      console.error('[applicantsApi.list] Error:', error);
      throw error;
    }
  },

  getById: async (id: string) => {
    try {
      let response: any;
      try {
        response = await axiosClient.get<any>(`/agencyApplicants/${encodeURIComponent(id)}`);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          try {
            response = await axiosClient.get<any>(`/applicants/${encodeURIComponent(id)}`);
          } catch (err2: any) {
            if (err2?.response?.status === 404) {
              response = await axiosClient.get<any>(`/users/${encodeURIComponent(id)}`);
            } else {
              throw err2;
            }
          }
        } else {
          throw err;
        }
      }
      const body = response?.data;
      let raw: any = body?.data || body?.applicant || body;
      const mapped: Applicant = mapBackendToApplicant(raw);
      return { success: body?.success ?? true, data: mapped } as { success?: boolean; data: Applicant };
    } catch (error) {
      console.error('[applicantsApi.getById] Error:', error);
      throw error;
    }
  },

  approve: async (id: string) => {
    const response = await axiosClient.post<ApplicantActionResponse>(`/agencyApplicants/${id}/approve`);
    return response.data;
  },

  cancel: async (id: string) => {
    const response = await axiosClient.post<ApplicantActionResponse>(`/agencyApplicants/${id}/cancel`);
    return response.data;
  },
};
