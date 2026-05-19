/**
 * Server-side Gemini translation (Cloud Function `gemini`).
 */

import axiosClient from "../axios";
import type { ClientExtractionResponse } from "@/pages/shared/client-management/types/clientExtraction";

interface TranslateToEnglishResponse {
  translatedText: string;
}

export async function translateToEnglishViaApi(
  text: string,
  sourceLanguage?: string | null,
): Promise<string> {
  const response = await axiosClient.post<TranslateToEnglishResponse>(
    "/gemini/translate-to-english",
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
 * ISP / POC document extraction (multipart file only).
 */
export async function extractClientIspViaApi(
  file: File,
  options?: { signal?: AbortSignal },
): Promise<ClientExtractionResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axiosClient.post<ClientExtractionResponse>(
    "/gemini/extract-client-isp",
    formData,
    {
      signal: options?.signal,
      transformRequest: [
        (data, headers) => {
          if (data instanceof FormData) {
            delete headers["Content-Type"];
          }
          return data;
        },
      ],
    },
  );

  return response.data;
}

/**
 * Service Delivery Report (SDR) extraction — requires Stage 2 authorizations JSON.
 */
export async function extractSdrDocumentViaApi(
  file: File,
  options: { availableServicesJson: string; signal?: AbortSignal },
): Promise<ClientExtractionResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("availableServices", options.availableServicesJson.trim());

  const response = await axiosClient.post<ClientExtractionResponse>(
    "/gemini/extract-client-sdr",
    formData,
    {
      signal: options.signal,
      transformRequest: [
        (data, headers) => {
          if (data instanceof FormData) {
            delete headers["Content-Type"];
          }
          return data;
        },
      ],
    },
  );

  return response.data;
}
