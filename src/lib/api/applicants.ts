import axiosClient from '../axios';

// ===== Type Definitions =====

export interface Applicant {
  id: string;
  name: string;
  role: string;
  profileScreening: boolean;
  documents: boolean;
  conditionalHire: boolean;
  finalAgencyReview: boolean;
  profilePictureUrl: string;
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


interface Stage {
  completed?: boolean;
  completedAt?: FirebaseTimestamp;
}

interface BackendApplicant {
  uid?: string;
  id?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  userType?: string;
  role?: string;
  stages?: {
    preScreening?: Stage;
    documents?: Stage;
    conditionalHire?: Stage;
    officialHire?: Stage;
    finalAgencyReview?: Stage;
  };
  profilePictureUrl?: string;
}

interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  applicants?: T;
  applicant?: T;
  results?: T;
  users?: T;
  pagination?: {
    limit: number;
    offset: number;
    count: number;
  };
  count?: number;
}

interface ListParams {
  tab?: 'all' | 'clearance';
  period?: 'today' | 'week' | 'month' | string;
  search?: string;
  limit?: number;
  offset?: number;
  status?: string;
  userType?: string;
  [key: string]: string | number | undefined;
}

// Comprehensive applicant detail response types
interface FirebaseTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

interface AddressData {
  address?: string;
  city?: string;
  zipCode?: string;
  latlon?: {
    lat: string;
    lon: string;
  };
}

interface DocumentFile {
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  expiryDate?: string;
}

interface ReferenceData {
  name: string;
  relationship: string;
  phoneNumber: string;
  email: string;
}

export interface PreScreeningData {
  userId?: string;
  fullName?: string;
  email?: string;
  dateOfBirth?: string;
  address?: AddressData;
  gender?: string;
  isAtLeast18?: boolean;
  hasHighSchoolDiploma?: boolean;
  isLegallyEligible?: boolean;
  hasBeenConvicted?: boolean;
  hasReliableTransportation?: boolean;
  declarationAgreed?: boolean;
  createdAt?: FirebaseTimestamp;
  resumeUrl?: string;
  currentStep?: string;
  status?: string;
  updatedAt?: FirebaseTimestamp;
}

export interface EligibilityData {
  userId?: string;
  references?: ReferenceData[];
  declarationAgreed?: boolean;
  status?: string;
  createdAt?: FirebaseTimestamp;
  diplomaUrl?: DocumentFile;
  i9FormUrl?: DocumentFile;
  hepatitisBVaccinationUrl?: DocumentFile;
  photoIdUrl?: DocumentFile;
  socialSecurityCardUrl?: DocumentFile;
  hepatitisBImmunityUrl?: DocumentFile;
  w4FormUrl?: DocumentFile;
  certificationsUrl?: DocumentFile;
  tbTestResultUrl?: DocumentFile;
  updatedAt?: FirebaseTimestamp;
}

export interface ComplianceData {
  userId?: string;
  authorizations?: {
    drugTest?: boolean;
    fingerprint?: boolean;
    centralRegistry?: boolean;
    cariCheck?: boolean;
    sexOffenderRegistry?: boolean;
    oigExclusion?: boolean;
    healthTbScreening?: boolean;
    referenceChecks?: boolean;
  };
  termsAcceptance?: {
    abuseNeglectExploitation?: boolean;
    hipaaConfidentiality?: boolean;
    developmentalDisabilities?: boolean;
  };
  informationCorrect?: boolean;
  finalizedAt?: FirebaseTimestamp;
}

export interface ConditionalHireData {
  userId?: string;
  signatureReference?: {
    context?: string;
    signaturePath?: string;
    signatureType?: string;
  };
  completedAt?: FirebaseTimestamp;
  finalizedAt?: FirebaseTimestamp;
  status?: string;
}

export interface ReviewStepData {
  stepKey: string;
  confirmed?: boolean;
  timestamp?: FirebaseTimestamp;
  confirmedBy?: string;
  updatedAt?: FirebaseTimestamp;
}

export interface ApplicantDetailResponse {
  uid?: string;
  email?: string;
  fullName?: string;
  emailVerified?: boolean;
  userType?: string;
  agencyId?: string;
  createdAt?: FirebaseTimestamp;
  onboardingCompleted?: boolean;
  otpVerifiedAt?: FirebaseTimestamp;
  otpVerified?: boolean;
  applicationStartedAt?: FirebaseTimestamp;
  address?: AddressData;
  gender?: string;
  dateOfBirth?: string;
  applicationCompletedAt?: FirebaseTimestamp;
  conditionalHireSignedAt?: FirebaseTimestamp;
  conditionalHireStatus?: string;
  conditionalHireCompletedAt?: FirebaseTimestamp;
  applicationLastUpdatedAt?: FirebaseTimestamp;
  applicationStatus?: string;
  currentApplicationStep?: string;
  officialHireStatus?: string;
  officialHireSignedAt?: FirebaseTimestamp;
  updatedAt?: FirebaseTimestamp;
  profilePictureUrl?: string;
  preScreening?: PreScreeningData;
  eligibility?: EligibilityData;
  compliance?: ComplianceData;
  conditionalHire?: ConditionalHireData;
  reviews?: Record<string, ReviewStepData>;
  signatures?: {
    conditionalHire?: {
      signatureType: string;
      signatureData: string;
      context?: string;
      userId?: string;
      status?: string;
      createdAt?: FirebaseTimestamp;
      updatedAt?: FirebaseTimestamp;
    } | null;
    officialHire?: {
      signatureType: string;
      signatureData: string;
      context?: string;
      userId?: string;
      status?: string;
      createdAt?: FirebaseTimestamp;
      updatedAt?: FirebaseTimestamp;
    } | null;
  };
}

// ===== Helper Functions =====

const buildQuery = (params?: Record<string, string | number | undefined>): string => {
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

/**
 * Try multiple endpoints in sequence until one succeeds
 * Reduces deeply nested try-catch blocks
 */
const tryEndpoints = async <T = unknown>(endpoints: string[]): Promise<T> => {
  const errors: Error[] = [];

  for (let i = 0; i < endpoints.length; i++) {
    try {
      const response = await axiosClient.get<T>(endpoints[i]);
      return response.data;
    } catch (err: any) {
      errors.push(err);
      // If it's a 404 and we have more endpoints to try, continue
      if (err?.response?.status === 404 && i < endpoints.length - 1) {
        continue;
      }
      // Otherwise, throw the last error
      throw err;
    }
  }

  // If we get here, all endpoints failed
  throw errors[errors.length - 1];
};

/**
 * Map backend applicant data to UI model
 */
const mapBackendToApplicant = (item: BackendApplicant): Applicant => {
  const id = item?.uid || item?.id || String(Math.random());
  const fullName = item?.fullName ||
    [item?.firstName, item?.lastName].filter(Boolean).join(' ') ||
    'Unknown';
  const role = item?.userType === 'applicant' ? 'Applicant' : (item?.role || 'Applicant');
  const stages = item?.stages || {};

  return {
    id,
    name: fullName,
    role,
    profileScreening: Boolean(stages.preScreening?.completed),
    documents: Boolean(stages.documents?.completed),
    conditionalHire: Boolean(stages.conditionalHire?.completed),
    finalAgencyReview: Boolean(stages.finalAgencyReview?.completed),
    profilePictureUrl: item?.profilePictureUrl || '',
  };
};

/**
 * Parse list response from various backend formats
 */
const parseListResponse = (
  body: ApiResponse<BackendApplicant[]> | BackendApplicant[],
  params?: ListParams
): { data: BackendApplicant[]; pagination: any; success: boolean } => {
  let raw: BackendApplicant[] = [];
  let pagination: any;
  let success = true;

  // Handle array response
  if (Array.isArray(body)) {
    raw = body;
    pagination = {
      limit: params?.limit ?? 6,
      offset: params?.offset ?? 0,
      count: body.length,
    };
  }
  // Handle object response with various formats
  else if (body && typeof body === 'object') {
    success = body.success ?? true;
    pagination = body.pagination;

    // Try different possible array properties
    raw = (body.data || body.applicants || body.results || body.users || []) as BackendApplicant[];
  }

  return {
    data: raw,
    pagination: pagination ?? {
      limit: params?.limit ?? 6,
      offset: params?.offset ?? 0,
      count: (body as ApiResponse)?.count ?? raw.length,
    },
    success,
  };
};

// ===== API Methods =====

export const applicantsApi = {
  /**
   * Optimized directory view with completion percentages and stage status
   */
  directory: async (params?: ListParams): Promise<ApplicantListResponse> => {
    try {
      const queryString = buildQuery(params);
      const response = await axiosClient.get<ApiResponse<BackendApplicant[]>>(
        `/agencyApplicants/directory${queryString}`
      );

      const body = response.data;

      return {
        success: body?.success ?? true,
        data: Array.isArray(body?.applicants)
          ? body.applicants.map(mapBackendToApplicant)
          : [],
        pagination: body?.pagination,
      };
    } catch (err: any) {
      console.error('[applicantsApi.directory] Error:', err);
      return {
        success: false,
        data: [],
        pagination: { limit: 10, offset: 0, count: 0 },
      };
    }
  },

  /**
   * List applicants with fallback endpoints
   */
  list: async (params?: ListParams): Promise<ApplicantListResponse> => {
    try {
      const queryString = buildQuery(params);
      const fallbackQueryString = buildQuery({
        userType: 'applicant',
        limit: params?.limit,
        offset: params?.offset,
        search: params?.search,
      });

      // Try multiple endpoints in order
      const endpoints = [
        `/agencyApplicants${queryString}`,
        `/applicants${queryString}`,
        `/users${fallbackQueryString}`,
      ];

      const body = await tryEndpoints<ApiResponse<BackendApplicant[]> | BackendApplicant[]>(endpoints);
      const { data: raw, pagination, success } = parseListResponse(body, params);
      const data = raw.map(mapBackendToApplicant);

      return { success, data, pagination };
    } catch (error) {
      console.error('[applicantsApi.list] Error:', error);
      throw error;
    }
  },

  /**
   * Get applicant by ID with fallback endpoints
   */
  getById: async (id: string): Promise<{ success?: boolean; data: Applicant }> => {
    try {
      const encodedId = encodeURIComponent(id);
      const endpoints = [
        `/agencyApplicants/${encodedId}`,
        `/applicants/${encodedId}`,
        `/users/${encodedId}`,
      ];

      const body = await tryEndpoints<ApiResponse<BackendApplicant>>(endpoints);
      const raw = body?.data || body?.applicant || (body as BackendApplicant);
      const mapped = mapBackendToApplicant(raw);

      return {
        success: body?.success ?? true,
        data: mapped
      };
    } catch (error) {
      console.error('[applicantsApi.getById] Error:', error);
      throw error;
    }
  },

  /**
   * Get detailed applicant by ID with all nested data (preScreening, eligibility, compliance, conditionalHire)
   * Returns the comprehensive backend response structure
   */
  getByIdDetailed: async (id: string): Promise<{ success?: boolean; data: ApplicantDetailResponse }> => {
    try {
      const encodedId = encodeURIComponent(id);
      const response = await axiosClient.get<ApiResponse<ApplicantDetailResponse>>(
        `/agencyApplicants/${encodedId}`
      );

      const body = response.data;
      const raw = body?.data || body?.applicant || (body as ApplicantDetailResponse);

      return {
        success: body?.success ?? true,
        data: raw
      };
    } catch (error) {
      console.error('[applicantsApi.getByIdDetailed] Error:', error);
      throw error;
    }
  },

  /**
   * Approve an applicant
   */
  approve: async (id: string): Promise<ApplicantActionResponse> => {
    const response = await axiosClient.post<ApplicantActionResponse>(
      `/agencyApplicants/${id}/approve`
    );
    return response.data;
  },

  /**
   * Cancel an applicant
   */
  cancel: async (id: string): Promise<ApplicantActionResponse> => {
    const response = await axiosClient.post<ApplicantActionResponse>(
      `/agencyApplicants/${id}/cancel`
    );
    return response.data;
  },

  /**
   * Confirm a review step for an applicant
   */
  confirmReviewStep: async (
    id: string,
    stepKey: string,
    confirmed: boolean
  ): Promise<{ success: boolean; message: string; reviewStep: any }> => {
    const response = await axiosClient.post(
      `/agencyApplicants/${id}/review`,
      { stepKey, confirmed }
    );
    return response.data;
  },
};
