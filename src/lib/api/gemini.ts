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

/** Match backend gemini Cloud Function timeoutSeconds (300). */
export const EXTRACT_DOCUMENT_TIMEOUT_MS = 300_000;

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
      timeout: EXTRACT_DOCUMENT_TIMEOUT_MS,
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

/** Match backend gemini Cloud Function timeoutSeconds (300). */
const EXTRACT_SDR_TIMEOUT_MS = EXTRACT_DOCUMENT_TIMEOUT_MS;

/**
 * Service Delivery Report (SDR) extraction — optional Stage 2 authorizations JSON for matching.
 */
export async function extractSdrDocumentViaApi(
  file: File,
  options?: {
    availableServicesJson?: string;
    expectedClientIdentityJson?: string;
    signal?: AbortSignal;
  },
): Promise<ClientExtractionResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const ctx = options?.availableServicesJson?.trim();
  if (ctx) formData.append("availableServices", ctx);
  const expected = options?.expectedClientIdentityJson?.trim();
  if (expected) formData.append("expectedClientIdentity", expected);

  const response = await axiosClient.post<ClientExtractionResponse>(
    "/gemini/extract-client-sdr",
    formData,
    {
      timeout: EXTRACT_SDR_TIMEOUT_MS,
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
