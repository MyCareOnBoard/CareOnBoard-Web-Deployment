/**
 * Server-side Gemini translation (Cloud Function `gemini`).
 */

import axiosClient from "../axios";
import type { ClientExtractionResponse } from "@/pages/shared/client-management/types/clientExtraction";
import type {
  ClientPocGenerationResponse,
  GenerateClientPocInput,
} from "@/pages/shared/client-management/types/clientPocGeneration";

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
  options?: { signal?: AbortSignal; type?: "ddd" | "hha" },
): Promise<ClientExtractionResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("type", options?.type === "hha" ? "hha" : "ddd");

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

const GENERATE_POC_TIMEOUT_MS = EXTRACT_DOCUMENT_TIMEOUT_MS;

/**
 * Generate a structured Plan of Care from ISP and/or PCPT sources.
 */
export async function generateClientPocViaApi(
  input: GenerateClientPocInput,
  options?: { signal?: AbortSignal },
): Promise<ClientPocGenerationResponse> {
  const formData = new FormData();
  if (input.ispFile) formData.append("ispFile", input.ispFile);
  if (input.pcptFile) formData.append("pcptFile", input.pcptFile);
  if (input.ispUrl?.trim()) formData.append("ispUrl", input.ispUrl.trim());
  if (input.pcptUrl?.trim()) formData.append("pcptUrl", input.pcptUrl.trim());
  if (input.clientId?.trim()) formData.append("clientId", input.clientId.trim());
  formData.append("formContext", JSON.stringify(input.formContext ?? {}));

  const response = await axiosClient.post<ClientPocGenerationResponse>(
    "/gemini/generate-client-poc",
    formData,
    {
      timeout: GENERATE_POC_TIMEOUT_MS,
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
