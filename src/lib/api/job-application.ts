/**
 * Job Application API Service
 * Handles all API calls related to job applications
 */

import axiosClient from '../axios';
import { ApiResponse } from '../api-types';

export interface ResumeUploadResponse {
    fileUrl: string;
    fileName: string;
    fileSize: number;
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
            '/job-application/upload-resume',
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
            '/job-application/pre-screening',
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
    applicationId?: string;
    status: 'not_started' | 'in_progress' | 'submitted' | 'under_review' | 'approved' | 'rejected';
    currentStep?: number;
    completedSteps?: string[];
    lastUpdated?: string;
}

/**
 * Get current application status
 * @returns Promise with application status data
 */
export const getApplicationStatus = async (): Promise<ApiResponse<ApplicationStatus>> => {
    try {
        const response = await axiosClient.get<ApiResponse<ApplicationStatus>>(
            '/job-application/status'
        );

        return response.data;
    } catch (error) {
        console.error('Failed to fetch application status:', error);
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
            '/job-application/submit',
            applicationData
        );

        return response.data;
    } catch (error) {
        console.error('Failed to submit job application:', error);
        throw error;
    }
};

