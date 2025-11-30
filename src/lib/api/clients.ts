/**
 * Clients and Services API Service
 * Handles all API calls related to clients assigned to the user
 */

import axiosClient from '../axios';

/**
 * Client interface
 * Represents a client/consumer in the care system
 */
export interface Client {
  // Core identifiers
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  profileImage?: string;

  // Address information
  location: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;

  // Service information
  service: string;
  serviceCode?: string;
  billingRate?: string;

  // Plan of care
  planOfCare?: {
    id: string;
    name: string;
    url?: string;
    uploadedAt?: string;
  };
  ispOutcome?: string;

  // Agency relationship
  agencyId?: string;

  // Status and dates
  status?: 'active' | 'inactive' | 'pending' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

/**
 * List Clients Response (new format)
 */
export interface ListClientsResponse {
  success: boolean;
  data: Client[];
  total: number;
  count: number;
}

/**
 * Clients Response (legacy format for backward compatibility)
 */
export interface ClientsResponse {
  data: Client[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * List Clients Query Parameters
 */
export interface ListClientsParams {
  agencyId?: string; // Required for employees
  status?: 'active' | 'inactive' | 'pending' | 'archived';
  service?: string;
  search?: string;
  limit?: number;
}

/**
 * Create Client Request
 */
export interface CreateClientRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  location: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  service: string;
  serviceCode?: string;
  billingRate?: string;
  agencyId?: string; // Required for employees, defaults to own agencyId for agencies
}

/**
 * Update Client Request
 */
export interface UpdateClientRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  service?: string;
  serviceCode?: string;
  billingRate?: string;
  status?: 'active' | 'inactive' | 'pending' | 'archived';
}

/**
 * Seed Clients Request
 */
export interface SeedClientsRequest {
  activeCount?: number;
  inactiveCount?: number;
  pendingCount?: number;
  archivedCount?: number;
  overwrite?: boolean;
}

/**
 * ✅ Create a new client
 * Endpoint: POST /clients/create
 * Agencies default to their own agencyId
 * Employees must supply agencyId
 */
export async function createClient(data: CreateClientRequest): Promise<Client> {
  try {
    const response = await axiosClient.post<{ success: boolean; data: Client }>('/clients', data);

    if (!response.data.success) {
      throw new Error('Failed to create client');
    }

    return response.data.data;
  } catch (err: any) {
    console.error('createClient error:', err);
    throw new Error(err.message || 'Failed to create client');
  }
}

/**
 * ✅ List clients
 * Endpoint: GET /clients
 * Query params: agencyId (required for employees), status, service, search, limit
 */
export async function listClients(params?: ListClientsParams): Promise<Client[]> {
  try {
    const response = await axiosClient.get<ListClientsResponse>('/clients', {
      params: {
        agencyId: params?.agencyId,
        status: params?.status,
        service: params?.service,
        search: params?.search,
        limit: params?.limit,
      }
    });

    if (!response.data.success) {
      throw new Error('Failed to fetch clients');
    }

    return response.data.data;
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    throw error;
  }
}

/**
 * @deprecated Use listClients instead
 * Get all clients assigned to the current user
 * @param page - Page number for pagination (deprecated, use limit instead)
 * @param pageSize - Number of items per page (deprecated, use limit instead)
 * @returns Promise with clients list
 */
export async function getClients(page: number = 1, pageSize: number = 10): Promise<ClientsResponse> {
  try {
    const response = await axiosClient.get<ClientsResponse>('/clients', {
      params: { limit: pageSize }
    });

    // Transform response to match old format for backward compatibility
    return {
      data: response.data.data,
      total: response.data.total,
      page: page,
      pageSize: pageSize,
    };
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    throw error;
  }
}

/**
 * ✅ Get a single client by ID
 * Endpoint: GET /clients/:clientId
 * Employees must supply agencyId via query parameter
 */
export async function getClientById(clientId: string, agencyId?: string): Promise<Client> {
  try {
    const response = await axiosClient.get<{ success: boolean; data: Client }>(`/clients/${clientId}`, {
      params: agencyId ? { agencyId } : undefined
    });

    if (!response.data.success) {
      throw new Error('Client not found');
    }

    return response.data.data;
  } catch (error) {
    console.error(`Failed to fetch client ${clientId}:`, error);
    throw error;
  }
}

/**
 * ✅ Update client information
 * Endpoint: PUT /clients/:clientId
 * agencyId cannot be changed
 * Employees must supply agencyId via query parameter
 */
export async function updateClient(clientId: string, data: UpdateClientRequest, agencyId?: string): Promise<Client> {
  try {
    const response = await axiosClient.put<{ success: boolean; data: Client }>(`/clients/${clientId}`, data, {
      params: agencyId ? { agencyId } : undefined
    });

    if (!response.data.success) {
      throw new Error('Failed to update client');
    }

    return response.data.data;
  } catch (err: any) {
    console.error('updateClient error:', err);
    throw new Error(err.message || 'Failed to update client');
  }
}

/**
 * ✅ Delete client
 * Endpoint: DELETE /clients/:clientId
 * Employees must supply agencyId via query parameter
 */
export async function deleteClient(clientId: string, agencyId?: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await axiosClient.delete<{ success: boolean; message: string }>(`/clients/${clientId}`, {
      params: agencyId ? { agencyId } : undefined
    });

    if (!response.data.success) {
      throw new Error('Failed to delete client');
    }

    return response.data;
  } catch (err: any) {
    console.error('deleteClient error:', err);
    throw new Error(err.message || 'Failed to delete client');
  }
}

/**
 * ✅ Search clients by name or other criteria
 * Endpoint: GET /clients/search
 * @param query - Search query string
 * @param agencyId - Optional agency ID filter
 * @returns Promise with matching clients
 */
export async function searchClients(query: string, agencyId?: string): Promise<Client[]> {
  try {
    const response = await axiosClient.get<{ success: boolean; clients: Client[] }>('/clients', {
      params: { search: query, agencyId }
    });

    if (!response.data.success) {
      throw new Error('Failed to search clients');
    }

    return response.data.clients || [];
  } catch (error) {
    console.error('Failed to search clients:', error);
    throw error;
  }
}

/**
 * ✅ Seed clients with dummy data
 * Endpoint: POST /clients/seed
 * Automatically uses all existing agencies from database
 * Distributes clients randomly across agencies
 */
export async function seedClients(data: SeedClientsRequest): Promise<{ success: boolean; message: string; count: number }> {
  try {
    const response = await axiosClient.post<{ success: boolean; message: string; count: number }>('/clients/seed', data);

    if (!response.data.success) {
      throw new Error('Failed to seed clients');
    }

    return response.data;
  } catch (err: any) {
    console.error('seedClients error:', err);
    throw new Error(err.message || 'Failed to seed clients');
  }
}
