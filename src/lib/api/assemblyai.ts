/**
 * AssemblyAI API integration
 * Handles token generation for real-time transcription
 */

import axiosClient from '../axios';

interface AssemblyAITokenResponse {
    token: string;
}

/**
 * Get a temporary token for AssemblyAI real-time transcription
 * Token expires after a set time
 */
export async function getAssemblyAIToken(): Promise<string> {
    const response = await axiosClient.get<AssemblyAITokenResponse>('/assemblyai/token');
    return response.data.token;
}

