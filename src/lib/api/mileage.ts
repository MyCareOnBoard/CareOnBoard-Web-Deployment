import axiosClient from '../axios';
import type { Coverage, SplitMode } from '@/lib/coverage';

export type RideStatus = "scheduled" | "in_progress" | "paused" | "completed" | "cancelled";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MileageRide {
  id: string;
  agencyId: string;
  caregiverId: string;
  caregiverName?: string;
  clientId: string | null;
  clientName: string | null;
  clientAvatarUrl?: string | null;
  caregiverAvatarUrl?: string | null;
  purpose?: string | null;
  isManual?: boolean;
  scheduledStartTime: string;
  actualDistance: number | null;
  segmentCount?: number;
  isRecurring?: boolean;
  status: RideStatus;
  serviceCode?: string | null;
  serviceAuthorizationId?: string | null;
  serviceAuthStartDate?: string | null;
  serviceAuthEndDate?: string | null;
  assignedDsp?: string | null;
  claimId?: string | null;
  payrollInvoiceId?: string | null;
  outOfPocketInvoiceId?: string | null;
  approved?: boolean;
  /** Client rides bill both legs (payroll + out-of-pocket); agency rides pay staff only. */
  rideBillingType?: "client" | "agency";
  /** Per-mile rates imputed at approval. staffRate → payroll; clientAgreedRate → out-of-pocket invoice. */
  staffRate?: number | null;
  clientAgreedRate?: number | null;
  /** Per-line billing coverage; a per-line value overrides the client default. */
  coverage?: Coverage;
  splitMode?: SplitMode | null;
  splitValue?: number | null;
  startLocation?: Coordinates | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  notes?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MileageSegment {
  id: string;
  rideId: string;
  agencyId: string;
  caregiverId: string;
  startLocation: Coordinates;
  endLocation: Coordinates | null;
  startedAt: string;
  stoppedAt: string | null;
  distance: number | null;
  segmentIndex: number;
}

export interface MileageListResponse {
  success: boolean;
  data: MileageRide[];
  totalMileage: number;
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
}

export interface AgencyMileageListResponse {
  success: boolean;
  data: MileageRide[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
}

export interface MileageRideResponse {
  success: boolean;
  data: MileageRide;
}

export interface StartRidePayload {
  startLocation: Coordinates;
}

export interface StopRidePayload {
  endLocation: Coordinates;
}

export interface CancelRidePayload {
  cancelReason: string;
}

export type RecurringFrequency = "daily" | "weekly" | "monthly";

export interface MileageServiceFields {
  serviceCode: string;
  serviceAuthorizationId?: string;
  serviceAuthStartDate?: string;
  serviceAuthEndDate?: string;
  assignedDsp?: string;
  /** Coverage chosen at ride creation (defaults from the client). */
  coverage?: Coverage;
  splitMode?: SplitMode | null;
  splitValue?: number | null;
}

export interface CreateMileageRideBase {
  clientId: string;
  caregiverId: string;
  notes?: string;
}

export interface UpdateAgencyRideRequest {
  caregiverId?: string;
  scheduledStartTime?: string;
  notes?: string;
  approved?: boolean;
  staffRate?: number | null;
  clientAgreedRate?: number | null;
  /** Coverage can be confirmed/changed at approval. */
  coverage?: Coverage;
  splitMode?: SplitMode | null;
  splitValue?: number | null;
}

export interface CreateOneTimeMileageRideRequest
  extends CreateMileageRideBase,
    MileageServiceFields {
  scheduledStartTime: string;
}

export interface CreateRecurringMileageRideRequest
  extends CreateMileageRideBase,
    MileageServiceFields {
  frequency: RecurringFrequency;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  time: string;
  startDate: string;
  endDate?: string | null;
}

export type CreateMileageRideRequest =
  | CreateOneTimeMileageRideRequest
  | CreateRecurringMileageRideRequest;

export interface CreateManualMileageRequest {
  purpose?: string;
  clientId?: string;
  clientName?: string;
  notes?: string;
}

export interface RideActionResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    status: RideStatus;
    actualDistance?: number;
  };
}

const buildQuery = (params?: Record<string, string | number | boolean | undefined>) => {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null);
  if (!entries.length) return "";
  const search = new URLSearchParams();
  entries.forEach(([key, value]) => search.append(key, String(value)));
  return `?${search.toString()}`;
};

export const mileageApi = {
  list: async (params?: { limit?: number; offset?: number }) => {
    const response = await axiosClient.get<MileageListResponse>(`/mileage${buildQuery(params)}`);
    return response.data;
  },

  listAgency: async (
    params?: {
      limit?: number;
      offset?: number;
      status?: RideStatus;
      caregiverId?: string;
      clientId?: string;
      startDate?: string;
      endDate?: string;
      isManual?: boolean;
      approved?: boolean;
      unclaimed?: boolean;
      skipEnrichment?: boolean;
      clientType?: 'hha' | 'ddd';
    },
    options?: { signal?: AbortSignal },
  ) => {
    const response = await axiosClient.get<AgencyMileageListResponse>(`/agencyMileage${buildQuery(params)}`, {
      signal: options?.signal,
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await axiosClient.get<MileageRideResponse>(`/mileage/${id}`);
    return response.data;
  },

  start: async (id: string, payload: StartRidePayload) => {
    const response = await axiosClient.post<RideActionResponse>(`/mileage/${id}/start`, payload);
    return response.data;
  },

  stop: async (id: string, payload: StopRidePayload) => {
    const response = await axiosClient.post<RideActionResponse>(`/mileage/${id}/stop`, payload);
    return response.data;
  },

  cancel: async (id: string, payload: CancelRidePayload) => {
    const response = await axiosClient.post<RideActionResponse>(`/mileage/${id}/cancel`, payload);
    return response.data;
  },

  complete: async (id: string) => {
    const response = await axiosClient.post<RideActionResponse>(`/mileage/${id}/complete`);
    return response.data;
  },

  createManual: async (payload: CreateManualMileageRequest) => {
    const response = await axiosClient.post(`/mileage`, payload);
    return response.data;
  },

  getSegments: async (id: string) => {
    const response = await axiosClient.get<{ success: boolean; data: MileageSegment[] }>(`/mileage/${id}/segments`);
    return response.data;
  },

  create: async (payload: CreateMileageRideRequest) => {
    const response = await axiosClient.post(`/agencyMileage`, payload);
    return response.data;
  },

  updateAgency: async (id: string, payload: UpdateAgencyRideRequest) => {
    const response = await axiosClient.put(`/agencyMileage/${id}`, payload);
    return response.data;
  },

  deleteAgency: async (id: string) => {
    const response = await axiosClient.delete(`/agencyMileage/${id}`);
    return response.data;
  },

  cancelAgency: async (id: string, reason?: string) => {
    const response = await axiosClient.put(`/agencyMileage/${id}/cancel`, reason ? { reason } : {});
    return response.data;
  },

  getAgencySegments: async (id: string) => {
    const response = await axiosClient.get<{ success: boolean; data: MileageSegment[] }>(`/agencyMileage/${id}/segments`);
    return response.data;
  },
};
