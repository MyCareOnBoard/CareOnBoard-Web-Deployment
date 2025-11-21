/**
 * Shift Management API Service
 * Handles all API calls related to shift management
 */

import axiosClient from '../axios';
import { ApiResponse } from '../api-types';

// API endpoint constants
const SHIFT_BASE = '/shifts';

// ==================== Type Definitions ====================

/**
 * Shift Status Enum
 */
export enum ShiftStatus {
    PENDING = "pending",
    AVAILABLE = "available",
    ONGOING = "ongoing",
    COMPLETED = "completed",
    EXPIRED = "expired",
}

/**
 * Shift Action Status Enum
 */
export enum ShiftActionStatus {
    CLOCK_IN = "clock_in",
    SHIFT_STARTED = "shift_started",
    CLOCK_OUT = "clock_out",
}

/**
 * Shift Type Enum
 */
export enum ShiftType {
    AUTOMATIC = "automatic",
    MANUAL = "manual",
}

/**
 * Submission Status Enum
 */
export enum SubmissionStatus {
    DRAFT = "draft",
    SUBMITTED = "submitted",
}

/**
 * Client interface
 */
export interface Client {
    id: string;
    name: string;
    avatar?: string;
}

/**
 * Shift interface
 */
export interface Shift {
    id: string;
    client: Client;
    date: string;
    location: string;
    startTime: string;
    endTime?: string;
    availableAt?: string;
    clockedInAt?: string;
    clockedOutAt?: string;
    status: ShiftStatus;
    actionStatus?: ShiftActionStatus;
    type?: ShiftType; // Default: automatic
    submissionStatus?: SubmissionStatus; // Default: draft
    timeRemaining?: number; // minutes remaining
    sessionDuration?: string; // e.g., "2 hour session"
    additionalStatus?: string; // e.g., "Expiring Soon", "Starts tomorrow"
    uid?: string;
    agencyId?: string;
    createdAt?: string;
    updatedAt?: string;
}

// ==================== Request/Response Types ====================

/**
 * Create Shift Request Data
 */
export interface CreateShiftRequest {
    uid: string;
    agencyId: string;
    date: string; // Format: YYYY-MM-DD
    location: string;
    startTime: string;
    endTime?: string;
    status: ShiftStatus;
    availableAt?: string;
    additionalStatus?: string;
    client?: Client;
    type?: ShiftType; // Default: automatic
    submissionStatus?: SubmissionStatus; // Default: draft
}

/**
 * Update Shift Request Data
 */
export interface UpdateShiftRequest {
    date?: string;
    location?: string;
    startTime?: string;
    endTime?: string;
    availableAt?: string;
    status?: ShiftStatus;
    actionStatus?: ShiftActionStatus | null;
    additionalStatus?: string;
    timeRemaining?: number;
    sessionDuration?: string;
    clockedInAt?: string;
    clockedOutAt?: string;
    type?: ShiftType;
    submissionStatus?: SubmissionStatus;
}

/**
 * Clock In/Out Request Data
 */
export interface ClockInRequest {
    clockedInAt?: string; // Optional, uses current time if not provided
}

export interface ShiftStartedRequest {
    [key: string]: any; // Optional data for shift started
}

export interface ClockOutRequest {
    clockedOutAt?: string; // Optional, uses current time if not provided
    sessionDuration?: string; // Optional, auto-calculated if not provided
}

/**
 * Update Status Request Data
 */
export interface UpdateShiftStatusRequest {
    status?: ShiftStatus;
    actionStatus?: ShiftActionStatus | null;
}

/**
 * List Shifts Query Parameters
 */
export interface ListShiftsParams {
    status?: ShiftStatus;
    date?: string; // Format: YYYY-MM-DD
    limit?: number; // 1-100, default: 50
    agencyId?: string; // Filter by agency ID
}

/**
 * Shift API Response
 */
export interface ShiftResponse {
    success: boolean;
    message?: string;
    shift: Shift;
}

/**
 * List Shifts API Response
 */
export interface ListShiftsResponse {
    success: boolean;
    count: number;
    shifts: Shift[];
}

/**
 * Delete Shift Response
 */
export interface DeleteShiftResponse {
    success: boolean;
    message: string;
}

/**
 * Seed Shifts Request Data
 */
export interface SeedShiftsRequest {
    agencyId?: string;
    completedCount?: number;
    expiredCount?: number;
    ongoingCount?: number;
    availableCount?: number;
    pendingCount?: number;
}

/**
 * Seed Shifts Response
 */
export interface SeedShiftsResponse {
    success: boolean;
    message: string;
    summary: {
        totalCount: number;
        breakdown: {
            completed: number;
            expired: number;
            ongoing: number;
            available: number;
            pending: number;
        };
        shiftIds: string[];
    };
}

/**
 * Clear Shifts Response
 */
export interface ClearShiftsResponse {
    success: boolean;
    message: string;
    count: number;
}

/**
 * Reset Shifts Response
 */
export interface ResetShiftsResponse {
    success: boolean;
    message: string;
    cleared: number;
    seeded: number;
}

// ==================== API Functions ====================

/**
 * Create a new shift
 * @param data - The shift data to create
 * @returns Promise with shift response
 */
export const createShift = async (data: CreateShiftRequest): Promise<ShiftResponse> => {
    try {
        const response = await axiosClient.post<ShiftResponse>(
            `${SHIFT_BASE}/create`,
            data
        );

        return response.data;
    } catch (error) {
        console.error('Failed to create shift:', error);
        throw error;
    }
};

/**
 * Get a shift by ID
 * @param shiftId - The ID of the shift to retrieve
 * @returns Promise with shift response
 */
export const getShiftById = async (shiftId: string): Promise<ShiftResponse> => {
    try {
        const response = await axiosClient.get<ShiftResponse>(
            `${SHIFT_BASE}/${shiftId}`
        );

        return response.data;
    } catch (error) {
        console.error('Failed to fetch shift:', error);
        throw error;
    }
};

/**
 * List all shifts for the authenticated user with optional filters
 * @param params - Optional query parameters for filtering
 * @returns Promise with list of shifts
 */
export const listShifts = async (params?: ListShiftsParams): Promise<ListShiftsResponse> => {
    try {
        const response = await axiosClient.get<ListShiftsResponse>(
            SHIFT_BASE,
            { params }
        );

        return response.data;
    } catch (error) {
        console.error('Failed to fetch shifts:', error);
        throw error;
    }
};

/**
 * Update shift information
 * @param shiftId - The ID of the shift to update
 * @param data - The fields to update
 * @returns Promise with updated shift response
 */
export const updateShift = async (
    shiftId: string,
    data: UpdateShiftRequest
): Promise<ShiftResponse> => {
    try {
        const response = await axiosClient.put<ShiftResponse>(
            `${SHIFT_BASE}/${shiftId}`,
            data
        );

        return response.data;
    } catch (error) {
        console.error('Failed to update shift:', error);
        throw error;
    }
};

/**
 * Delete a shift permanently
 * @param shiftId - The ID of the shift to delete
 * @returns Promise with deletion confirmation
 */
export const deleteShift = async (shiftId: string): Promise<DeleteShiftResponse> => {
    try {
        const response = await axiosClient.delete<DeleteShiftResponse>(
            `${SHIFT_BASE}/${shiftId}`
        );

        return response.data;
    } catch (error) {
        console.error('Failed to delete shift:', error);
        throw error;
    }
};

/**
 * Clock in to a shift
 * Changes status from 'available' to 'ongoing'
 * @param shiftId - The ID of the shift to clock in
 * @param data - Optional clock-in data
 * @returns Promise with updated shift response
 */
export const clockIn = async (
    shiftId: string,
    data: ClockInRequest = {}
): Promise<ShiftResponse> => {
    try {
        const response = await axiosClient.post<ShiftResponse>(
            `${SHIFT_BASE}/${shiftId}/clock-in`,
            data
        );

        return response.data;
    } catch (error) {
        console.error('Failed to clock in:', error);
        throw error;
    }
};

/**
 * Mark shift as started
 * Updates shift status to indicate work has begun
 * @param shiftId - The ID of the shift to start
 * @param agencyId - Optional agency ID to pass as query parameter
 * @param data - Optional shift started data
 * @returns Promise with updated shift response
 */
export const shiftStarted = async (
    shiftId: string,
    agencyId?: string,
    data: ShiftStartedRequest = {}
): Promise<ShiftResponse> => {
    try {
        const url = agencyId
            ? `${SHIFT_BASE}/${shiftId}/shift-started?agencyId=${agencyId}`
            : `${SHIFT_BASE}/${shiftId}/shift-started`;

        const response = await axiosClient.post<ShiftResponse>(url, data);

        return response.data;
    } catch (error) {
        console.error('Failed to mark shift as started:', error);
        throw error;
    }
};

/**
 * Clock out from a shift
 * Changes status from 'ongoing' to 'completed'
 * Automatically calculates session duration
 * @param shiftId - The ID of the shift to clock out
 * @param data - Optional clock-out data
 * @returns Promise with updated shift response
 */
export const clockOut = async (
    shiftId: string,
    data: ClockOutRequest = {}
): Promise<ShiftResponse> => {
    try {
        const response = await axiosClient.post<ShiftResponse>(
            `${SHIFT_BASE}/${shiftId}/clock-out`,
            data
        );

        return response.data;
    } catch (error) {
        console.error('Failed to clock out:', error);
        throw error;
    }
};

/**
 * Update the status and action status of a shift
 * @param shiftId - The ID of the shift
 * @param data - Status update data
 * @returns Promise with updated shift response
 */
export const updateShiftStatus = async (
    shiftId: string,
    data: UpdateShiftStatusRequest
): Promise<ShiftResponse> => {
    try {
        const response = await axiosClient.patch<ShiftResponse>(
            `${SHIFT_BASE}/${shiftId}/status`,
            data
        );

        return response.data;
    } catch (error) {
        console.error('Failed to update shift status:', error);
        throw error;
    }
};

// ==================== Helper Functions ====================

/**
 * Helper function to get today's nearest shift
 * @param agencyId - Optional agency ID to filter by
 * @returns Promise with today's shifts (converted to array format)
 */
export const getTodayShifts = async (agencyId?: string): Promise<ShiftResponse> => {
    try {
        const response = await axiosClient.get<ShiftResponse>(
            `${SHIFT_BASE}/today`,
            { params: { agencyId } }
        );

        return response.data
    } catch (error) {
        console.error('Failed to fetch today\'s shifts:', error);
        throw error;
    }
};

/**
 * Helper function to get all upcoming available shifts
 * @param limit - Optional limit on number of results (default: 20)
 * @param agencyId - Optional agency ID to filter by
 * @returns Promise with available shifts
 */
export const getAvailableShifts = async (limit: number = 20, agencyId?: string): Promise<ListShiftsResponse> => {
    try {
        const response = await axiosClient.get<ListShiftsResponse>(
            `${SHIFT_BASE}/upcoming`,
            { params: { agencyId, limit } }
        );
        return response.data;
    } catch (error) {
        console.error('Failed to fetch upcoming shifts:', error);
        throw error;
    }
};

/**
 * Helper function to get ongoing shifts
 * @param agencyId - Optional agency ID to filter by
 * @returns Promise with ongoing shifts
 */
export const getOngoingShifts = async (agencyId?: string): Promise<ListShiftsResponse> => {
    return listShifts({ status: ShiftStatus.ONGOING, agencyId });
};

/**
 * Helper function to get completed shifts
 * @param limit - Optional limit on number of results
 * @param agencyId - Optional agency ID to filter by
 * @returns Promise with completed shifts
 */
export const getCompletedShifts = async (limit?: number, agencyId?: string): Promise<ListShiftsResponse> => {
    return listShifts({ status: ShiftStatus.COMPLETED, limit, agencyId });
};

/**
 * Helper function to get previous shifts (completed/expired)
 * @param limit - Optional limit on number of results (default: 30)
 * @param agencyId - Optional agency ID to filter by
 * @returns Promise with previous shifts
 */
export const getPreviousShifts = async (limit: number = 30, agencyId?: string): Promise<ListShiftsResponse> => {
    try {
        const response = await axiosClient.get<ListShiftsResponse>(
            `${SHIFT_BASE}/previous`,
            { params: { agencyId, limit } }
        );
        return response.data;
    } catch (error) {
        console.error('Failed to fetch previous shifts:', error);
        throw error;
    }
};

/**
 * Helper function to get pending shifts
 * @param limit - Optional limit on number of results
 * @param agencyId - Optional agency ID to filter by
 * @returns Promise with pending shifts
 */
export const getPendingShifts = async (limit?: number, agencyId?: string): Promise<ListShiftsResponse> => {
    return listShifts({ status: ShiftStatus.PENDING, limit, agencyId });
};

// ==================== Seed/Test Data Functions ====================

/**
 * Seed the database with dummy shift data for testing
 * @param data - Optional configuration for shift counts
 * @returns Promise with seed summary
 */
export const seedShifts = async (data: SeedShiftsRequest = {}): Promise<SeedShiftsResponse> => {
    try {
        const response = await axiosClient.post<SeedShiftsResponse>(
            `${SHIFT_BASE}/seed`,
            data
        );

        return response.data;
    } catch (error) {
        console.error('Failed to seed shifts:', error);
        throw error;
    }
};

/**
 * Clear all shifts for the authenticated user
 * @returns Promise with cleared count
 */
export const clearShifts = async (): Promise<ClearShiftsResponse> => {
    try {
        const response = await axiosClient.delete<ClearShiftsResponse>(
            `${SHIFT_BASE}/clear`
        );

        return response.data;
    } catch (error) {
        console.error('Failed to clear shifts:', error);
        throw error;
    }
};

/**
 * Reset shifts - clear all existing and create fresh dummy data
 * @param data - Optional configuration for shift counts
 * @returns Promise with reset summary
 */
export const resetShifts = async (data: SeedShiftsRequest = {}): Promise<ResetShiftsResponse> => {
    try {
        const response = await axiosClient.post<ResetShiftsResponse>(
            `${SHIFT_BASE}/reset`,
            data
        );

        return response.data;
    } catch (error) {
        console.error('Failed to reset shifts:', error);
        throw error;
    }
};

