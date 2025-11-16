/**
 * Clients and Services API Service
 * Handles all API calls related to clients assigned to the user
 */

import axiosClient from '../axios';

export interface Client {
  id: string;
  fullName: string;
  clientId: string;
  location: string;
  service: string;
  sessionsCompleted: number;
  profileImage?: string;
  isPending?: boolean;
  requestDate?: string;
}

export interface ClientsResponse {
  data: Client[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Get all clients assigned to the current user
 * @param page - Page number for pagination
 * @param pageSize - Number of items per page
 * @returns Promise with clients list
 */
export async function getClients(page: number = 1, pageSize: number = 10): Promise<ClientsResponse> {
  try {
    const response = await axiosClient.get<ClientsResponse>('/clients', {
      params: { page, pageSize }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    throw error;
  }
}

/**
 * Get a single client by ID
 * @param clientId - The client ID
 * @returns Promise with client details
 */
export async function getClientById(clientId: string): Promise<Client> {
  try {
    const response = await axiosClient.get<{ data: Client }>(`/clients/${clientId}`);
    return response.data.data;
  } catch (error) {
    console.error(`Failed to fetch client ${clientId}:`, error);
    throw error;
  }
}

/**
 * Search clients by name or other criteria
 * @param query - Search query string
 * @returns Promise with matching clients
 */
export async function searchClients(query: string): Promise<Client[]> {
  try {
    const response = await axiosClient.get<{ data: Client[] }>('/clients/search', {
      params: { q: query }
    });
    return response.data.data;
  } catch (error) {
    console.error('Failed to search clients:', error);
    throw error;
  }
}
