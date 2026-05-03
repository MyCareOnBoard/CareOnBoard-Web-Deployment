/**
 * Community Inclusions API Service
 * Handles all API calls related to community inclusion records
 */

import axiosClient from '../axios';
import { ApiResponse } from '@/lib/api-types';

/**
 * Attendee interface
 * Represents an attendee in a community inclusion event
 */
export interface Attendee {
  id: string;
  name: string;
  signIn: string; // HH:mm format (24-hour)
  signOut: string; // HH:mm format (24-hour)
}

/**
 * Community Inclusion interface
 * Represents a community inclusion record
 */
export interface CommunityInclusion {
  id: string;
  uid: string;
  clientId: string;
  agencyId: string;
  attendees: Attendee[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Create community inclusion request payload
 */
export interface CreateCommunityInclusionRequest {
  clientId?: string;
  attendees: Attendee[];
}

/**
 * Update community inclusion request payload
 */
export interface UpdateCommunityInclusionRequest {
  clientId?: string;
  attendees?: Attendee[];
}

/**
 * Query parameters for listing community inclusions
 */
export interface QueryCommunityInclusionsParams {
  clientId?: string;
  date?: string; // ISO date string YYYY-MM-DD
  limit?: number;
  offset?: number;
}

/**
 * Create a new community inclusion record
 */
export async function createCommunityInclusion(
  data: CreateCommunityInclusionRequest
): Promise<ApiResponse<CommunityInclusion>> {
  const response = await axiosClient.post('/communityInclusions', data);
  return response.data;
}

/**
 * Get all community inclusions for the agency
 */
export async function getCommunityInclusions(
  params?: QueryCommunityInclusionsParams
): Promise<ApiResponse<CommunityInclusion[]>> {
  const response = await axiosClient.get('/communityInclusions', { params });
  return response.data;
}

/**
 * Get a specific community inclusion by ID
 */
export async function getCommunityInclusionById(
  id: string
): Promise<ApiResponse<CommunityInclusion>> {
  const response = await axiosClient.get(`/communityInclusions/${id}`);
  return response.data;
}

/**
 * Update a community inclusion record
 */
export async function updateCommunityInclusion(
  id: string,
  data: UpdateCommunityInclusionRequest
): Promise<ApiResponse<CommunityInclusion>> {
  const response = await axiosClient.put(`/communityInclusions/${id}`, data);
  return response.data;
}

/**
 * Delete a community inclusion record
 */
export async function deleteCommunityInclusion(
  id: string
): Promise<ApiResponse<void>> {
  const response = await axiosClient.delete(`/communityInclusions/${id}`);
  return response.data;
}
