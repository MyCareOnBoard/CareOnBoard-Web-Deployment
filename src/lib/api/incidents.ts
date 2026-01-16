/**
 * Incident Management API Service
 * Handles all API calls related to incident reporting and management
 */

import axiosClient from '../axios';
import { ApiResponse } from '../api-types';
import { Employee } from './employees';
import { Client } from './clients';

// API endpoint constants
const INCIDENT_BASE = '/agencyIncidents';

// ==================== Type Definitions ====================

/**
 * Incident Status Enum
 */
export enum IncidentStatus {
    SUBMITTED = "submitted",
    UNDER_REVIEW = "under_review",
    RESOLVED = "resolved",
    NOT_RESOLVED = "not_resolved",
}

/**
 * Incident Report Interface
 */
export interface IncidentReport {
    _id: string;
    agencyId: string;
    employeeId: string;
    clientId: string;
    status: IncidentStatus;
    reportedDate: string;
    incidentDate: string;
    whatHappened: string;
    actionsTaken: string;
    staffAction: string;
    witness: string;
    reviewerId?: string;
    reviewerNotes?: string;
    reviewedAt?: string;
    reason?: string;
    createdAt: string;
    updatedAt: string;
    // Populated fields
    employee?: Employee;
    client?: Client;
    reviewer?: Employee;
}

/**
 * Incident Summary Statistics
 */
export interface IncidentSummary {
    total: number;
    submitted: number;
    under_review: number;
    resolved: number;
    not_resolved: number;
}

/**
 * Get All Incidents Response
 */
export interface GetIncidentsResponse {
    incidents: IncidentReport[];
    summary: IncidentSummary;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/**
 * Incident Filter Parameters
 */
export interface IncidentFilterParams {
    page?: number;
    limit?: number;
    status?: IncidentStatus | IncidentStatus[];
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    clientId?: string;
}

/**
 * Review Incident Payload
 */
export interface ReviewIncidentPayload {
    reviewerId: string;
}

/**
 * Resolve Incident Payload
 */
export interface ResolveIncidentPayload {
    reviewerId: string;
    reviewerNotes: string;
}

/**
 * Not Resolved Incident Payload
 */
export interface NotResolvedIncidentPayload {
    reviewerId: string;
    reason: string;
}

// ==================== API Functions ====================

/**
 * Get all incident reports for agency
 * @param agencyId - Agency ID
 * @param params - Filter parameters
 * @returns Promise with incidents response
 */
export const getAllIncidents = async (
    agencyId: string,
    params?: IncidentFilterParams
): Promise<ApiResponse<GetIncidentsResponse>> => {
    try {
        const response = await axiosClient.get(INCIDENT_BASE, {
            params: {
                agencyId,
                ...params,
            },
        });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching incidents:', error);
        throw error;
    }
};

/**
 * Get specific incident by ID
 * @param incidentId - Incident ID
 * @returns Promise with incident details
 */
export const getIncidentById = async (
    incidentId: string
): Promise<ApiResponse<IncidentReport>> => {
    try {
        const response = await axiosClient.get(`${INCIDENT_BASE}/${incidentId}`);
        return response.data;
    } catch (error: any) {
        console.error('Error fetching incident details:', error);
        throw error;
    }
};

/**
 * Get incidents by DSP/employee
 * @param dspId - DSP/Employee ID
 * @param params - Filter parameters
 * @returns Promise with incidents response
 */
export const getIncidentsByDsp = async (
    dspId: string,
    params?: IncidentFilterParams
): Promise<ApiResponse<GetIncidentsResponse>> => {
    try {
        const response = await axiosClient.get(`${INCIDENT_BASE}/dsp/${dspId}`, {
            params,
        });
        return response.data;
    } catch (error: any) {
        console.error('Error fetching DSP incidents:', error);
        throw error;
    }
};

/**
 * Mark incident as under review
 * @param incidentId - Incident ID
 * @param payload - Review payload with reviewer ID
 * @returns Promise with updated incident
 */
export const markIncidentUnderReview = async (
    incidentId: string,
    payload: ReviewIncidentPayload
): Promise<ApiResponse<IncidentReport>> => {
    try {
        const response = await axiosClient.post(
            `${INCIDENT_BASE}/${incidentId}/review`,
            payload
        );
        return response.data;
    } catch (error: any) {
        console.error('Error marking incident under review:', error);
        throw error;
    }
};

/**
 * Resolve incident
 * @param incidentId - Incident ID
 * @param payload - Resolve payload with reviewer ID and notes
 * @returns Promise with updated incident
 */
export const resolveIncident = async (
    incidentId: string,
    payload: ResolveIncidentPayload
): Promise<ApiResponse<IncidentReport>> => {
    try {
        const response = await axiosClient.post(
            `${INCIDENT_BASE}/${incidentId}/resolve`,
            payload
        );
        return response.data;
    } catch (error: any) {
        console.error('Error resolving incident:', error);
        throw error;
    }
};

/**
 * Mark incident as not resolved
 * @param incidentId - Incident ID
 * @param payload - Not resolved payload with reviewer ID and reason
 * @returns Promise with updated incident
 */
export const markIncidentNotResolved = async (
    incidentId: string,
    payload: NotResolvedIncidentPayload
): Promise<ApiResponse<IncidentReport>> => {
    try {
        const response = await axiosClient.post(
            `${INCIDENT_BASE}/${incidentId}/not-resolved`,
            payload
        );
        return response.data;
    } catch (error: any) {
        console.error('Error marking incident as not resolved:', error);
        throw error;
    }
};

/**
 * Helper function to get status badge color
 * @param status - Incident status
 * @returns Color classes for the status badge
 */
export const getIncidentStatusColor = (status: IncidentStatus): string => {
    switch (status) {
        case IncidentStatus.SUBMITTED:
            return 'border-[#6b7280] text-[#6b7280]';
        case IncidentStatus.UNDER_REVIEW:
            return 'border-[#3b82f6] text-[#3b82f6]';
        case IncidentStatus.RESOLVED:
            return 'border-[#22c55e] text-[#22c55e]';
        case IncidentStatus.NOT_RESOLVED:
            return 'border-[#ef4444] text-[#ef4444]';
        default:
            return 'border-[#6b7280] text-[#6b7280]';
    }
};

/**
 * Helper function to get status display text
 * @param status - Incident status
 * @returns Display text for the status
 */
export const getIncidentStatusText = (status: IncidentStatus): string => {
    switch (status) {
        case IncidentStatus.SUBMITTED:
            return 'Submitted';
        case IncidentStatus.UNDER_REVIEW:
            return 'Under Review';
        case IncidentStatus.RESOLVED:
            return 'Resolved';
        case IncidentStatus.NOT_RESOLVED:
            return 'Not Resolved';
        default:
            return status;
    }
};
