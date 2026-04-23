/**
 * Server-side Gemini translation (Cloud Function `gemini`).
 */

import axiosClient from '../axios';

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
