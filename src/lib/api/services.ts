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
  program?: "ddd" | "hha";
  type: string;
  name: string;
  code: string;
  unitType?: string | null;
  defaultRate?: string | null;
  modifier?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * List services query parameters
 */
export interface ListServicesParams {
  program?: "ddd" | "hha";
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
  program?: "ddd" | "hha";
  type: string;
  name: string;
  code: string;
  unitType?: string;
  defaultRate?: string;
  modifier?: string;
}

/**
 * Update service request
 */
export interface UpdateServiceRequest {
  program?: "ddd" | "hha";
  type?: string;
  name?: string;
  code?: string;
  unitType?: string;
  defaultRate?: string;
  modifier?: string;
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
        program: params?.program,
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


function buildListServicesQuery(params?: ListServicesParams): string {
  if (!params || Object.keys(params).length === 0) return "";
  const searchParams = new URLSearchParams();
  if (params.program) searchParams.set("program", params.program);
  if (params.type) searchParams.set("type", params.type);
  if (params.search) searchParams.set("search", params.search);
  if (params.limit != null) searchParams.set("limit", String(params.limit));
  if (params.offset != null) searchParams.set("offset", String(params.offset));
  const q = searchParams.toString();
  return q ? `?${q}` : "";
}

export const servicesApi = createApi({
  reducerPath: "servicesApi",
  baseQuery: customBaseQuery,
  tagTypes: ["Services"],
  keepUnusedDataFor: 300, // Keep services cached 5 min when navigating away
  endpoints: (builder) => ({
    listServices: builder.query<ListServicesResponse, ListServicesParams | void>({
      query: (params) => ({
        url: `/services${buildListServicesQuery(params ?? undefined)}`,
        method: "GET",
        requiresAuth: true,
      }),
      providesTags: (result) =>
        result?.services
          ? [
              ...result.services.map(({ id }) => ({ type: "Services" as const, id })),
              { type: "Services", id: "LIST" },
            ]
          : [{ type: "Services", id: "LIST" }],
    }),
    deleteService: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (serviceId) => ({
        url: `/services/${serviceId}`,
        method: "DELETE",
        requiresAuth: true,
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Services", id },
        { type: "Services", id: "LIST" },
      ],
    }),
    getService: builder.query<Service, string>({
      query: (serviceId) => ({
        url: `/services/${serviceId}`,
        method: "GET",
        requiresAuth: true,
      }),
      providesTags: (_result, _error, id) => [{ type: "Services", id }],
    }),
    updateService: builder.mutation<
      void,
      { serviceId: string; data: UpdateServiceRequest }
    >({
      query: ({ serviceId, data }) => ({
        url: `/services/${serviceId}`,
        method: "PUT",
        data,
        requiresAuth: true,
      }),
      invalidatesTags: (_result, _error, { serviceId }) => [
        { type: "Services", id: serviceId },
        { type: "Services", id: "LIST" },
      ],
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
    createService: builder.mutation<Service, CreateServiceRequest>({
      query: (data) => ({
        url: `/services`,
        method: "POST",
        data,
        requiresAuth: true,
      }),
      invalidatesTags: [{ type: "Services", id: "LIST" }],
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
