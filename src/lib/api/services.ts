import axiosClient from "../axios";
import { ApiResponse } from "../api-types";

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

/**
 * ✅ Seed NJ DDD services catalog
 * Endpoint: POST /services/seed
 */
export async function seedServices(): Promise<{
  success: boolean;
  message: string;
  data?: { total: number; created: number; updated: number };
}> {
  const response = await axiosClient.post<{
    success: boolean;
    message: string;
    data?: { total: number; created: number; updated: number };
  }>("/services/seed");

  return response.data;
}


