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
    address: {
        address: string;
        city: string;
        zipCode: string;
        latlon?: {
            lat: string;
            lon: string;
        };
    };
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
 * Get pre-screening form data
 * @returns Promise with submission response
 */
export const getPreScreening = async (): Promise<ApiResponse<any>> => {
    try {
        const response = await axiosClient.get<ApiResponse<any>>(
            `${JOB_APPLICATION_BASE}/pre-screening`
        );

        return response.data;
    } catch (error) {
        console.error('Failed to get pre-screening:', error);
        throw error;
    }
};

/**
 * Update pre-screening form data
 * @param data - The pre-screening form data to update
 * @returns Promise with update response
 */
export const updatePreScreening = async (data: PreScreeningData): Promise<ApiResponse<any>> => {
    try {
        const response = await axiosClient.put<ApiResponse<any>>(
            `${JOB_APPLICATION_BASE}/pre-screening`,
            data
        );

        return response.data;
    } catch (error) {
        console.error('Failed to update pre-screening:', error);
        throw error;
    }
};

/**
 * Get eligibility verification data
 * @returns Promise with eligibility verification data
 */
export const getEligibilityVerification = async (): Promise<ApiResponse<any>> => {
    try {
        const response = await axiosClient.get<ApiResponse<any>>(
            `${JOB_APPLICATION_BASE}/eligibility-verification`
        );

        return response.data;
    } catch (error) {
        console.error('Failed to fetch eligibility verification:', error);
        throw error;
    }
};



export const APPLICATION_STEP_TITLES = [
    "Profile & Pre-Screening",
    "Document Upload & Eligibility Verification",
    "Conditional Hire & Compliance",
    "Final Agency Review",
    "Official Hire & Orientation",
];

export const APPLICATION_STEP_NAMES = ["pre-screening", "eligibility", "compliance", "review", "orientation"];

/** Maps API step values to APPLICATION_STEP_NAMES for backend/frontend alignment */
export const APPLICATION_STEP_ALIASES: Record<string, string> = {
  "eligibility-verification": "eligibility",
  "profile": "pre-screening",
};

/**
 * Returns the clamped step index (0 to APPLICATION_STEP_NAMES.length - 1) for a given currentStep.
 * Normalizes backend step names (e.g. "eligibility-verification") before lookup.
 */
export const getApplicationStepIndex = (currentStep: string | null | undefined): number => {
  const normalized = APPLICATION_STEP_ALIASES[currentStep ?? ""] ?? currentStep ?? "pre-screening";
  const index = APPLICATION_STEP_NAMES.indexOf(normalized);
  return Math.max(0, Math.min(index, APPLICATION_STEP_NAMES.length - 1));
};

export type ApplicationStepName = typeof APPLICATION_STEP_NAMES[number] | null;

export const ApplicationStatusNames = ["incomplete", "pre-screening_complete", "eligibility_pending", "eligibility_complete", "submitted", "under_review", "approved", "rejected"];

export type ApplicationStatusType = typeof ApplicationStatusNames[number];

/**
 * Application status response structure
 */
export interface ApplicationStatus {
    hasStarted: boolean;
    currentStep: ApplicationStepName;
    status: ApplicationStatusType;
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
    status?: ApplicationStatusType;
    currentStep?: ApplicationStepName;
}

export interface UpdateApplicationStatusResponse {
    status: ApplicationStatusType;
    currentStep: ApplicationStepName;
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

/**
 * Final Review Checklist Item
 */
export interface FinalReviewChecklistItem {
    id: string;
    title: string;
    status: 'confirmed' | 'pending';
    confirmedAt: string | null;
    confirmedBy: string | null;
    order: number;
}

/**
 * Final Review Summary
 */
export interface FinalReviewSummary {
    total: number;
    confirmed: number;
    pending: number;
    allConfirmed: boolean;
}

/**
 * Final Review Response
 */
export interface FinalReviewResponse {
    success: boolean;
    checklist: FinalReviewChecklistItem[];
    summary: FinalReviewSummary;
}

/**
 * Get final review checklist
 * @returns Promise with final review checklist data
 */
export const getFinalReviewChecklist = async (): Promise<FinalReviewResponse> => {
    try {
        const response = await axiosClient.get<FinalReviewResponse>(
            '/finalReview/checklist'
        );

        return response.data;
    } catch (error) {
        console.error('Failed to fetch final review checklist:', error);
        throw error;
    }
};

/**
 * Cancel Application Response
 */
export interface CancelApplicationResponse {
    success: boolean;
    message: string;
    data: {
        cancelledAt: string;
        archiveId: string;
        deletedSections: {
            preScreening: boolean;
            eligibilityVerification: boolean;
            conditionalHire: boolean;
            officialHire: boolean;
        };
    };
}

/**
 * Cancel the current job application
 * @returns Promise with cancellation response
 */
export const cancelApplication = async (): Promise<CancelApplicationResponse> => {
    try {
        const response = await axiosClient.post<CancelApplicationResponse>(
            `${JOB_APPLICATION_BASE}/cancel`
        );

        return response.data;
    } catch (error) {
        console.error('Failed to cancel application:', error);
        throw error;
    }
};

