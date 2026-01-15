/**
 * Application Completion API Service
 * Handles application status and completion verification
 */

import axiosClient from '../axios';

export interface ApplicationSectionStatus {
  isComplete: boolean;
  completedAt?: string;
  missingFields?: string[];
}

export interface ApplicationOverallStatus {
  success: boolean;
  status: {
    preScreening: ApplicationSectionStatus;
    eligibilityVerification: ApplicationSectionStatus;
    documents: ApplicationSectionStatus;
    conditionalHire: ApplicationSectionStatus;
    officialHire: ApplicationSectionStatus;
    canCompleteApplication: boolean;
    overallStatus: 'incomplete' | 'in_progress' | 'ready_for_completion' | 'completed';
  };
}

export interface VerifyAndCompleteResponse {
  success: boolean;
  message: string;
  data: {
    employeeId: string;
    completedAt: string;
    transitionedFrom: string;
    newUserType: string;
  };
}

export const applicationCompletionApi = {
  /**
   * Get overall application status
   * Get comprehensive status of all application sections
   */
  async getOverallStatus(): Promise<ApplicationOverallStatus> {
    try {
      const res = await axiosClient.get<ApplicationOverallStatus>('/applicationCompletion/overall-status');
      return res.data;
    } catch (err: any) {
      console.error('getOverallStatus error:', err);
      throw new Error(err.response?.data?.message || 'Failed to fetch application status');
    }
  },

  /**
   * Complete application and create employee record
   * Verifies official hire letter signature and creates employee record
   */
  async verifyAndComplete(): Promise<VerifyAndCompleteResponse> {
    try {
      const res = await axiosClient.post<VerifyAndCompleteResponse>('/applicationCompletion/verify-and-complete');
      return res.data;
    } catch (err: any) {
      console.error('verifyAndComplete error:', err);
      throw new Error(err.response?.data?.message || 'Failed to complete application');
    }
  },
};
