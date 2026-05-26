/**
 * Shift Management API Service
 * Handles all API calls related to shift management
 */

import axiosClient from '../axios';
import { ApiResponse } from '../api-types';
import { Employee } from './employees';
import { Client } from './clients';
import { Agency } from '@/lib/api/agencies';

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

export interface ShiftLocation {
    address?: string;
    countyState?: string;
    zipCode?: string;
    latlon?: { lat?: string; lon?: string };
}

export const formatShiftLocation = (location?: ShiftLocation | string | null): string => {
    if (!location) return "";
    if (typeof location === "string") return location;

    return location.address || "";
};

/**
 * Shift interface
 */
export interface Shift {
    id: string;
    employeeId?: string;
    client?: Client;
    date: string;
    location?: ShiftLocation;
    startTime: string;
    endTime?: string;
    availableAt?: string;
    clockedInAt?: string;
    clockedOutAt?: string;
    /** ISO timestamp: projected end when DSP clocked in after grace (server-set). */
    estimatedEndTime?: string | null;
    status: ShiftStatus;
    actionStatus?: ShiftActionStatus;
    type?: ShiftType; // Default: automatic
    submissionStatus?: SubmissionStatus; // Default: draft
    approved?: boolean; // Whether the shift is approved
    timeRemaining?: number; // minutes remaining
    sessionDuration?: string; // e.g., "2 hour session"
    serviceCode?: string;
    /** Nested client service row id — disambiguates duplicate serviceCode authorizations. */
    serviceAuthorizationId?: string;
    /** YYYY-MM-DD; sent with serviceCode when multiple authorizations share a code. */
    serviceAuthStartDate?: string;
    serviceAuthEndDate?: string;
    schedulingType?: string;
    ispOutcome?: string;
    assignedDsp?: string; // Name of assigned DSP
    week?: number; // Week number for manual shifts
    day?: string; // Day name for manual shifts
    signatureInfo?: string; // Signature information for manual shifts
    uid?: string;
    agencyId?: string;
    createdAt?: string;
    updatedAt?: string;
    notesType?: string;
    comment?: string;
    commentedBy?: string;
    completedBy?: string;
    goalsType?: string;
    goalsAndDocumentsId?: string;
    employee?: Employee;
    agency?: Agency;
}

// ==================== Request/Response Types ====================

/**
 * Create Shift Request Data
 */
export interface CreateShiftRequest {
    employeeId: string;
    agencyId: string;
    clientId?: string;
    date: string; // Format: YYYY-MM-DD
    location: ShiftLocation | string;
    startTime: string;
    endTime?: string;
    clockedInAt?: string;
    clockedOutAt?: string;
    status: ShiftStatus;
    availableAt?: string;
    notesType?: string;
    comment?: string;
    commentedBy?: string;
    goalsType?: string;
    goalsAndDocumentsId?: string;
    serviceCode?: string;
    schedulingType?: string;
    ispOutcome?: string;
    assignedDsp?: string; // Name of assigned DSP
    week?: number; // Week number for manual shifts
    day?: string; // Day name for manual shifts
    sessionDuration?: string; // Session duration for manual shifts
    signatureInfo?: string; // Signature information for manual shifts
    client?: Client;
    type?: ShiftType; // Default: automatic
    submissionStatus?: SubmissionStatus; // Default: draft
    serviceAuthorizationId?: string;
    serviceAuthStartDate?: string;
    serviceAuthEndDate?: string;
}

/**
 * Update Shift Request Data
 */
export interface UpdateShiftRequest {
    date?: string;
    location?: ShiftLocation | string;
    startTime?: string;
    endTime?: string;
    availableAt?: string;
    status?: ShiftStatus;
    actionStatus?: ShiftActionStatus | null;
    notesType?: string;
    comment?: string;
    commentedBy?: string;
    completedBy?: string;
    goalsType?: string;
    goalsAndDocumentsId?: string;
    serviceCode?: string;
    schedulingType?: string;
    ispOutcome?: string;
    assignedDsp?: string; // Name of assigned DSP
    week?: number; // Week number for manual shifts
    day?: string; // Day name for manual shifts
    signatureInfo?: string; // Signature information for manual shifts
    timeRemaining?: number;
    sessionDuration?: string;
    clockedInAt?: string;
    clockedOutAt?: string;
    estimatedEndTime?: string | null;
    type?: ShiftType;
    submissionStatus?: SubmissionStatus;
    employeeId?: string;
    clientId?: string;
    approved?: boolean;
    maintenanceReason?: string;
    serviceAuthorizationId?: string;
    serviceAuthStartDate?: string;
    serviceAuthEndDate?: string;
}

/**
 * Clock In/Out Request Data (server enforces geofence; timestamps are server-generated)
 */
export interface ClockInRequest {
    latitude: number;
    longitude: number;
}

export interface ShiftStartedRequest {
    [key: string]: any; // Optional data for shift started
}

export interface ClockOutRequest {
    latitude: number;
    longitude: number;
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
    type?: ShiftType;
    submissionStatus?: SubmissionStatus;
    date?: string; // Format: YYYY-MM-DD (exact day; not used with startDate/endDate)
    startDate?: string; // YYYY-MM-DD inclusive range (requires endDate; use with clientId or employeeId)
    endDate?: string; // YYYY-MM-DD inclusive range (requires startDate)
    limit?: number; // 1–100 default 50; up to 200 when startDate+endDate are set
    agencyId?: string; // Filter by agency ID
    employeeId?: string; // Filter by employee ID
    clientId?: string; // Filter by client ID
    location?: string; // Filter by location
    startTime?: string; // Filter by start time
    endTime?: string; // Filter by end time
    client?: boolean; // Populate client data
    employee?: boolean; // Populate employee data
    agency?: boolean; // Populate agency data
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
 * Shift statistics bucket for a single day
 */
export interface ShiftStatsBucket {
    date: string;      // YYYY-MM-DD
    scheduled: number; // pending | available | ongoing
    completed: number; // completed
    ongoing: number;   // ongoing
    total: number;     // scheduled + completed
    expired: number;   // expired
}

/**
 * Allowed ranges for shift statistics
 */
export type ShiftStatsRange = "lastWeek" | "thisMonth" | "thisYear" | "day";

/**
 * Shift statistics API response
 */
export interface ShiftStatsResponse {
    success: boolean;
    range: ShiftStatsRange;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    buckets: ShiftStatsBucket[];
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

export interface CategorizedShifts {
    current: Shift | null;
    upcoming: Shift[];
    previous: Shift[];
}

const parseShiftDateTime = (timeStr?: string, dateStr?: string): Date | null => {
    if (!timeStr || !dateStr) return null;
    try {
        const timeMatch = timeStr.match(/(\d+):(\d+):?\s*(AM|PM)/i);
        if (!timeMatch) return null;

        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const period = timeMatch[3].toUpperCase();

        if (period === 'PM' && hours !== 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            hours = 0;
        }

        const date = new Date(dateStr);
        date.setHours(hours, minutes, 0, 0);
        return date;
    } catch {
        return null;
    }
};

const timeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 0;
    const match = timeStr.match(/(\d+):(\d+):?\s*(AM|PM)/i);
    if (!match) return 0;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours !== 12) {
        hours += 12;
    } else if (period === 'AM' && hours === 12) {
        hours = 0;
    }

    return hours * 60 + minutes;
};

export const categorizeShifts = (shifts: Shift[]): CategorizedShifts => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const current: Shift[] = [];
    const upcoming: Shift[] = [];
    const previous: Shift[] = [];

    for (const shift of shifts) {
        const isToday = shift.date === today;
        const endDateTime = parseShiftDateTime(shift.endTime, shift.date);
        const startDateTime = parseShiftDateTime(shift.startTime, shift.date);
        const isPast = endDateTime ? endDateTime < now : shift.date < today;

        if (shift.status === ShiftStatus.COMPLETED || shift.status === ShiftStatus.EXPIRED || isPast) {
            previous.push(shift);
        } else if (isToday && (shift.status === ShiftStatus.ONGOING || shift.status === ShiftStatus.AVAILABLE)) {
            current.push(shift);
        } else if (shift.date > today || (isToday && startDateTime && startDateTime > now)) {
            upcoming.push(shift);
        } else if (shift.status === ShiftStatus.PENDING && shift.date >= today) {
            upcoming.push(shift);
        }
    }

    current.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    upcoming.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });

    previous.sort((a, b) => b.date.localeCompare(a.date));

    return {
        current: current[0] || null,
        upcoming,
        previous
    };
};

// ==================== API Functions ====================

/**
 * Create a new shift
 * @param data - The shift data to create
 * @returns Promise with shift response
 */
export const createShift = async (data: CreateShiftRequest): Promise<ShiftResponse> => {
    try {
        const response = await axiosClient.post<ShiftResponse>(
            `${SHIFT_BASE}`,
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
 * @param populate - Optionally populate related documents (client, employee, agency)
 * @returns Promise with shift response
 */
export const getShiftById = async (
    shiftId: string,
    options?: { agencyId?: string; client?: boolean; employee?: boolean; agency?: boolean },
): Promise<ShiftResponse> => {
    try {
        const response = await axiosClient.get<ShiftResponse>(
            `${SHIFT_BASE}/${shiftId}`,
            { params: options },
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
 * @param options - Optional AbortSignal to cancel in-flight requests
 * @returns Promise with list of shifts
 */
export const listShifts = async (
    params?: ListShiftsParams,
    options?: { signal?: AbortSignal },
): Promise<ListShiftsResponse> => {
    try {
        const response = await axiosClient.get<ListShiftsResponse>(SHIFT_BASE, {
            params,
            signal: options?.signal,
        });

        return response.data;
    } catch (error) {
        console.error('Failed to fetch shifts:', error);
        throw error;
    }
};

/**
 * Get shift statistics for charting (scheduled vs completed per day)
 * Endpoint: GET /shifts/stats
 * @param range - Time range ("lastWeek" | "thisMonth" | "thisYear" | "day"), defaults to "lastWeek"
 * @param date - Specific date (YYYY-MM-DD) required when range is "day"
 * @param agencyId - Optional agency ID (ignored for agency users, required for others)
 */
export const getShiftStats = async (
    range: ShiftStatsRange = "lastWeek",
    agencyId?: string,
    date?: string
): Promise<ShiftStatsResponse> => {
    try {
        const response = await axiosClient.get<ShiftStatsResponse>(
            `${SHIFT_BASE}/stats`,
            {
                params: {
                    range,
                    agencyId,
                    date,
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('Failed to fetch shift stats:', error);
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
    data: ClockInRequest,
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
    data: ClockOutRequest,
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
export const getTodayShifts = async (agencyId?: string, employeeId?: string): Promise<ShiftResponse> => {
    try {
        const response = await axiosClient.get<ShiftResponse>(
            `${SHIFT_BASE}/today`,
            { params: { agencyId, employeeId } }
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
export const getAvailableShifts = async (limit: number = 20, agencyId?: string, employeeId?: string): Promise<ListShiftsResponse> => {
    try {
        const response = await axiosClient.get<ListShiftsResponse>(
            `${SHIFT_BASE}/upcoming`,
            { params: { agencyId, limit, employeeId } }
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
export const getOngoingShifts = async (agencyId?: string, employeeId?: string): Promise<ListShiftsResponse> => {
    return listShifts({ status: ShiftStatus.ONGOING, agencyId });
};

/**
 * Helper function to get completed shifts
 * @param limit - Optional limit on number of results
 * @param agencyId - Optional agency ID to filter by
 * @returns Promise with completed shifts
 */
export const getCompletedShifts = async (limit?: number, agencyId?: string, employeeId?: string): Promise<ListShiftsResponse> => {
    return listShifts({ status: ShiftStatus.COMPLETED, limit, agencyId, employeeId });
};

/**
 * Helper function to get previous shifts (completed/expired)
 * @param limit - Optional limit on number of results (default: 30)
 * @param agencyId - Optional agency ID to filter by
 * @returns Promise with previous shifts
 */
export const getPreviousShifts = async (limit: number = 30, agencyId?: string, employeeId?: string): Promise<ListShiftsResponse> => {
    try {
        const response = await axiosClient.get<ListShiftsResponse>(
            `${SHIFT_BASE}/previous`,
            { params: { agencyId, limit, employeeId } }
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
export const getPendingShifts = async (limit?: number, agencyId?: string, employeeId?: string): Promise<ListShiftsResponse> => {
    return listShifts({ status: ShiftStatus.PENDING, limit, agencyId, employeeId });
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
// ==================== Maintenance API ====================

export type AnomalyCode = "missed" | "incomplete_clock" | "late_clock_in" | "unassigned" | "invalid_time";

export interface ShiftAnomaly {
    id: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    status: ShiftStatus;
    employeeId: string | null;
    clientId: string | null;
    assignedDsp: string | null;
    /** Resolved from clients collection (backend); optional on older APIs */
    clientName?: string | null;
    /** Resolved from employees / assignedDsp (backend); optional on older APIs */
    dspName?: string | null;
    anomalyCodes: AnomalyCode[];
}

export interface FetchAnomaliesParams {
    agencyId?: string;
    from: string;
    to: string;
    limit?: number;
    startAfter?: string;
}

export interface FetchAnomaliesResponse {
    success: boolean;
    anomalies: ShiftAnomaly[];
    hasNextPage: boolean;
    nextCursor: string | null;
}

export interface ShiftAuditRecord {
    id: string;
    shiftId: string;
    agencyId: string;
    actorUid: string;
    actorUserType: string;
    actorName: string | null;
    action: "create" | "clock_in" | "shift_started" | "clock_out" | "status_change" | "update" | "delete";
    changes: Record<string, { before: unknown; after: unknown }> | Record<string, unknown>;
    reason: string | null;
    ip: string | null;
    environment: string;
    timestamp: unknown;
}

export interface FetchAuditParams {
    agencyId?: string;
    shiftId?: string;
    limit?: number;
    startAfter?: string;
}

export interface FetchAuditResponse {
    success: boolean;
    audits: ShiftAuditRecord[];
    hasNextPage: boolean;
    nextCursor: string | null;
}

export const fetchShiftAnomalies = async (params: FetchAnomaliesParams): Promise<FetchAnomaliesResponse> => {
    try {
        const response = await axiosClient.get<FetchAnomaliesResponse>(
            `${SHIFT_BASE}/maintenance/anomalies`,
            { params }
        );
        return response.data;
    } catch (error) {
        console.error('Failed to fetch shift anomalies:', error);
        throw error;
    }
};

export const fetchShiftMaintenanceAudit = async (params: FetchAuditParams): Promise<FetchAuditResponse> => {
    try {
        const response = await axiosClient.get<FetchAuditResponse>(
            `${SHIFT_BASE}/maintenance/audit`,
            { params }
        );
        return response.data;
    } catch (error) {
        console.error('Failed to fetch shift maintenance audit:', error);
        throw error;
    }
};

// ==================== Dev / Seed Helpers ====================

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

