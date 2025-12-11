/**
 * Help Center API Service
 * Handles all API calls related to help center and support questions
 */

import axiosClient from '../axios';
import { ApiResponse } from '../api-types';

// API endpoint constants
const HELP_CENTER_BASE = '/helpCenter';

/**
 * Question category types
 */
export type QuestionCategory = 'application' | 'documents' | 'appointments' | 'general' | 'other';

/**
 * Question status types
 */
export type QuestionStatus = 'pending' | 'answered' | 'resolved';

/**
 * Submit question request structure
 */
export interface SubmitQuestionRequest {
    question: string;
    category: QuestionCategory;
}

/**
 * Question data structure
 */
export interface QuestionData {
    id: string;
    userId: string;
    userEmail: string;
    userName: string;
    question: string;
    category: string;
    status: QuestionStatus;
    response: string | null;
    respondedBy: string | null;
    respondedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * Submit question response structure
 */
export interface SubmitQuestionResponse {
    success: boolean;
    message?: string;
    questionId: string;
    data: QuestionData;
    error?: string;
}

/**
 * Submit a question to the help center
 * @param data - The question data to submit
 * @returns Promise with submission response
 */
export const submitQuestion = async (data: SubmitQuestionRequest): Promise<SubmitQuestionResponse> => {
    try {
        const response = await axiosClient.post<SubmitQuestionResponse>(
            `${HELP_CENTER_BASE}/question`,
            data
        );

        return response.data;
    } catch (error) {        throw error;
    }
};

