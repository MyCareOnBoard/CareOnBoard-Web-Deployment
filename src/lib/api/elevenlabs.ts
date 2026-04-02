/**
 * ElevenLabs API integration
 * Handles token generation for Scribe v2 realtime transcription
 */

import axiosClient from '../axios';

interface ScribeTokenResponse {
    token: string;
}

/**
 * Get a single-use token for ElevenLabs Scribe realtime transcription
 * Token expires after 15 minutes
 */
export async function getScribeToken(): Promise<string> {
    const response = await axiosClient.get<ScribeTokenResponse>('/elevenLabs/scribe-token');
    return response.data.token;
}

