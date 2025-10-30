/**
 * Job Application API Service
 * Handles all API calls related to job applications
 */

import axiosClient from '../axios';
import { ApiResponse } from '../api-types';

// API endpoint constants
const JOB_APPLICATION_BASE = '/jobApplication';
const JOB_APPLICATION_UPLOADS_BASE = '/uploads';

export interface ResumeUploadResponse {
    url: string;
    fileName: string;
    uploadedAt: string;
}

/**
 * Upload resume file to the backend
 * @param file - The resume file to upload (PDF, DOC, or DOCX)
 * @returns Promise with upload response data
 */
export const uploadResume = async (file: File): Promise<ApiResponse<ResumeUploadResponse>> => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axiosClient.post<ApiResponse<ResumeUploadResponse>>(
            `${JOB_APPLICATION_UPLOADS_BASE}/resume`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error('Failed to upload resume:', error);
        throw error;
    }
};

/**
 * Pre-screening form data structure
 */
export interface PreScreeningData {
    fullName: string;
    email: string;
    dateOfBirth: string; // Format: YYYY-MM-DD
    address: string;
    gender: 'Male' | 'Female';
    isAtLeast18: boolean;
    hasHighSchoolDiploma: boolean;
    isLegallyEligible: boolean;
    hasBeenConvicted: boolean;
    hasReliableTransportation: boolean;
    resumeUrl?: string;
    declarationAgreed: boolean;
}

/**
 * Submit pre-screening form data
 * @param data - The pre-screening form data
 * @returns Promise with submission response
 */
export const submitPreScreening = async (data: PreScreeningData): Promise<ApiResponse<any>> => {
    try {
        const response = await axiosClient.post<ApiResponse<any>>(
            `${JOB_APPLICATION_BASE}/pre-screening`,
            data
        );

        return response.data;
    } catch (error) {
        console.error('Failed to submit pre-screening:', error);
        throw error;
    }
};

/**
 * Application status response structure
 */
export interface ApplicationStatus {
    hasStarted: boolean;
    currentStep: string | null;
    status: 'not_started' | 'in_progress' | 'submitted' | 'under_review' | 'approved' | 'rejected' | null;
}

/**
 * Application status API response (uses 'status' field instead of 'data')
 */
export interface ApplicationStatusResponse {
    success: boolean;
    status: ApplicationStatus;
    message?: string;
    error?: string;
}

/**
 * Get current application status
 * @returns Promise with application status data
 */
export const getApplicationStatus = async (): Promise<ApplicationStatusResponse> => {
    try {
        const response = await axiosClient.get<ApplicationStatusResponse>(
            `${JOB_APPLICATION_BASE}/status`
        );

        return response.data;
    } catch (error) {
        console.error('Failed to fetch application status:', error);
        throw error;
    }
};

export interface UpdateApplicationStatusRequest {
    status?: 'incomplete' | 'pre-screening_complete' | 'eligibility_pending' | 'eligibility_complete' | 'submitted' | 'under_review' | 'approved' | 'rejected';
    currentStep?: string;
}

export interface UpdateApplicationStatusResponse {
    status: string;
    currentStep: string;
}

export const updateApplicationStatus = async (
    data: UpdateApplicationStatusRequest
): Promise<UpdateApplicationStatusResponse> => {
    try {
        const response = await axiosClient.put<UpdateApplicationStatusResponse>(
            `${JOB_APPLICATION_BASE}/status`,
            data
        );

        return response.data;
    } catch (error) {
        console.error('Failed to update application status:', error);
        throw error;
    }
};

/**
 * Submit job application with all required data
 * @param applicationData - The application form data
 * @returns Promise with submission response
 */
export const submitJobApplication = async (applicationData: any): Promise<ApiResponse<any>> => {
    try {
        const response = await axiosClient.post<ApiResponse<any>>(
            `${JOB_APPLICATION_BASE}/submit`,
            applicationData
        );

        return response.data;
    } catch (error) {
        console.error('Failed to submit job application:', error);
        throw error;
    }
};

