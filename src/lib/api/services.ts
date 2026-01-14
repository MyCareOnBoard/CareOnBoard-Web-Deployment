import axiosClient from "../axios";
import { ApiResponse } from "../api-types";
import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";
/**
 * Service interface
 * Represents a DDD service that can be assigned to clients/shifts
 */
export interface Service {
  id: string;
  type: string;
  name: string;
  code: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * List services query parameters
 */
export interface ListServicesParams {
  type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * List services response
 */
export interface ListServicesResponse {
  success: boolean;
  count: number;
  total: number;
  services: Service[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
}

/**
 * Create service request
 */
export interface CreateServiceRequest {
  id?: string;
  type: string;
  name: string;
  code: string;
}

/**
 * Update service request
 */
export interface UpdateServiceRequest {
  type?: string;
  name?: string;
  code?: string;
}

/**
 * ✅ List services from services catalog
 * Endpoint: GET /services
 */
export async function listServices(
  params?: ListServicesParams,
): Promise<Service[]> {
  const response = await axiosClient.get<ListServicesResponse>(
    "/services",
    {
      params: {
        type: params?.type,
        search: params?.search,
        limit: params?.limit,
        offset: params?.offset,
      },
    },
  );

  if (!response.data.success) {
    throw new Error("Failed to fetch services");
  }

  return response.data.services || [];
}

/**
 * ✅ Create a new service
 * Endpoint: POST /services
 */
export async function createService(
  data: CreateServiceRequest,
): Promise<Service> {
  const response = await axiosClient.post<ApiResponse<Service>>(
    "/services",
    data,
  );
  return response.data.data;
}

/**
 * ✅ Update an existing service
 * Endpoint: PUT /services/:id
 */
export async function updateService(
  id: string,
  data: UpdateServiceRequest,
): Promise<void> {
  await axiosClient.put(`/services/${id}`, data);
}

/**
 * ✅ Delete a service
 * Endpoint: DELETE /services/:id
 */
export async function deleteService(id: string): Promise<void> {
  await axiosClient.delete(`/services/${id}`);
}


export const servicesApi = createApi({
  reducerPath: "servicesApi",
  baseQuery: customBaseQuery,
  tagTypes: ['Services'],
  endpoints: (builder) => ({
    listServices: builder.query<ListServicesResponse, { limit?: number }>({
      query: ({ limit }) => ({
        url: `/services` + (limit ? `?limit=${limit}` : ""),
        method: "GET",
        requiresAuth: true
      }),
    }),
    deleteService: builder.mutation<
      { success: boolean, message: string },
      string
    >({
      query: (serviceId) => ({
        url: `/services/${serviceId}`,
        method: "DELETE",
        requiresAuth: true
      }),
    }),
    getService: builder.query<
      Service,
      string
    >({
      query: (serviceId) => ({
        url: `/services/${serviceId}`,
        method: "GET",
        requiresAuth: true
      }),
    }),
    updateService: builder.mutation<
      void,
      { serviceId: string, data: UpdateServiceRequest }
    >({
      query: ({ serviceId, data }) => ({
        url: `/services/${serviceId}`,
        method: "PATCH",
        data,
        requiresAuth: true
      }),
    }),
    getServices: builder.query<
      { services: { code: string; name: string }[] },
      string
    >({
      query: (query) => ({
        url: `/services` + (query ? `?${query}` : ""),
        method: "GET",
        requiresAuth: true
      })
    }),
    createService: builder.mutation<
      Service,
      CreateServiceRequest
    >({
      query: (data) => ({
        url: `/services`,
        method: "POST",
        data,
        requiresAuth: true
      }),
    }),
  }),
});

export const {
  useListServicesQuery,
  useDeleteServiceMutation,
  useGetServiceQuery,
  useUpdateServiceMutation,
  useGetServicesQuery,
  useCreateServiceMutation,
} = servicesApi;
