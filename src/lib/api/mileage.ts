import axiosClient from '../axios';

export type RideStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface MileageRide {
  id: string;
  agencyId: string;
  caregiverId: string;
  clientId: string;
  clientName: string;
  location: string;
  scheduledStartTime: string;
  estimatedDistance: number | null;
  actualDistance: number | null;
  status: RideStatus;
  startLocation: Coordinates | null;
  endLocation: Coordinates | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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

export interface MileageRideResponse {
  success: boolean;
  data: MileageRide;
}

export interface StartRidePayload {
  startLocation: Coordinates;
}

export interface StopRidePayload {
  actualDistance: number;
  endLocation: Coordinates;
}

export interface CancelRidePayload {
  cancelReason: string;
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

const buildQuery = (params?: Record<string, string | number | undefined>) => {
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
};
