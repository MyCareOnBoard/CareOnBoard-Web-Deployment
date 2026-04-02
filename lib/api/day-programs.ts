/**
 * Day Programs API Service
 * Handles all API calls related to day program records
 */

import axiosClient from '../axios';
import { ApiResponse } from '@/lib/api-types';

/**
 * Attendee interface
 * Represents an attendee in a day program event
 */
export interface Attendee {
  id: string;
  name: string;
  signIn: string; // HH:mm format (24-hour)
  signOut: string; // HH:mm format (24-hour)
}

/**
 * Day Program interface
 * Represents a day program record
 */
export interface DayProgram {
  id: string;
  uid: string;
  clientId: string;
  agencyId: string;
  attendees: Attendee[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Create day program request payload
 */
export interface CreateDayProgramRequest {
  clientId?: string;
  attendees: Attendee[];
}

/**
 * Update day program request payload
 */
export interface UpdateDayProgramRequest {
  clientId?: string;
  attendees?: Attendee[];
}

/**
 * Query parameters for listing day programs
 */
export interface QueryDayProgramsParams {
  clientId?: string;
  date?: string; // ISO date string YYYY-MM-DD
  limit?: number;
  offset?: number;
}

/**
 * Create a new day program record
 */
export async function createDayProgram(
  data: CreateDayProgramRequest
): Promise<ApiResponse<DayProgram>> {
  const response = await axiosClient.post('/dayPrograms', data);
  return response.data;
}

/**
 * Get all day programs for the agency
 */
export async function getDayPrograms(
  params?: QueryDayProgramsParams
): Promise<ApiResponse<DayProgram[]>> {
  const response = await axiosClient.get('/dayPrograms', { params });
  return response.data;
}

/**
 * Get a specific day program by ID
 */
export async function getDayProgramById(
  id: string
): Promise<ApiResponse<DayProgram>> {
  const response = await axiosClient.get(`/dayPrograms/${id}`);
  return response.data;
}

/**
 * Update a day program record
 */
export async function updateDayProgram(
  id: string,
  data: UpdateDayProgramRequest
): Promise<ApiResponse<DayProgram>> {
  const response = await axiosClient.put(`/dayPrograms/${id}`, data);
  return response.data;
}

/**
 * Delete a day program record
 */
export async function deleteDayProgram(
  id: string
): Promise<ApiResponse<void>> {
  const response = await axiosClient.delete(`/dayPrograms/${id}`);
  return response.data;
}
