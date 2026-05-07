/**
 * Server-side Gemini translation (Cloud Function `gemini`).
 */

import axiosClient from '../axios';
import type { ClientExtractionResponse } from '@/pages/shared/client-management/types/clientExtraction';

interface TranslateToEnglishResponse {
  translatedText: string;
}

export async function translateToEnglishViaApi(
  text: string,
  sourceLanguage?: string | null,
): Promise<string> {
  const response = await axiosClient.post<TranslateToEnglishResponse>(
    '/gemini/translate-to-english',
    {
      text,
      ...(sourceLanguage?.trim()
        ? { sourceLanguage: sourceLanguage.trim() }
        : {}),
    },
  );
  return response.data.translatedText;
}

/**
 * Multipart upload: extracts structured client draft from ISP/POC/PDF/image.
 */
export async function extractClientOnboardingViaApi(
  file: File,
): Promise<ClientExtractionResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axiosClient.post<ClientExtractionResponse>(
    '/gemini/extract-client-onboarding',
    formData,
    {
      transformRequest: [
        (data, headers) => {
          if (data instanceof FormData) {
            delete headers['Content-Type'];
          }
          return data;
        },
      ],
    },
  );

  return response.data;
}
