/**
 * Server-side Gemini translation (Cloud Function `gemini`).
 */

import axiosClient from "../axios";
import type {
  ClientExtractionResponse,
  ExtractionWarning,
} from "@/pages/shared/client-management/types/clientExtraction";
import type {
  ClientPocGenerationResponse,
  GenerateClientPocInput,
} from "@/pages/shared/client-management/types/clientPocGeneration";
import type {
  ClientForm485GenerationResponse,
  GenerateClientForm485Input,
} from "@/pages/shared/client-management/types/clientForm485Generation";

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
 * Coerce an extraction response's `warnings` into the ExtractionWarning object form.
 * The Gemini extraction schema returns warnings as plain strings, but the app's type
 * and every consumer expect `{ message, code?, path? }` — without this, the review
 * step's "Notes from the document" renders blank bullets (a string has no `.message`).
 * Idempotent for endpoints that already return objects; blank warnings are dropped.
 */
function normalizeExtractionResponse(data: ClientExtractionResponse): ClientExtractionResponse {
  const raw = (data?.warnings ?? []) as unknown[];
  const warnings = raw.reduce<ExtractionWarning[]>((acc, w) => {
    if (typeof w === "string") {
      if (w.trim()) acc.push({ message: w });
    } else if (
      w &&
      typeof w === "object" &&
      typeof (w as ExtractionWarning).message === "string" &&
      (w as ExtractionWarning).message.trim()
    ) {
      acc.push(w as ExtractionWarning);
    }
    return acc;
  }, []);
  return { ...data, warnings };
}

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

  return normalizeExtractionResponse(response.data);
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

  return normalizeExtractionResponse(response.data);
}

/**
 * HHA Plan of Care and/or Clinical Assessment extraction. Provide at least one file.
 */
export async function extractClientHhaPocClinicalViaApi(
  files: { poc?: File; clinicalAssessment?: File },
  options?: { signal?: AbortSignal },
): Promise<ClientExtractionResponse> {
  const formData = new FormData();
  if (files.poc) formData.append("poc", files.poc);
  if (files.clinicalAssessment) formData.append("clinicalAssessment", files.clinicalAssessment);

  const response = await axiosClient.post<ClientExtractionResponse>(
    "/gemini/extract-client-hha-poc-clinical",
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

  return normalizeExtractionResponse(response.data);
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

/**
 * Generate a CMS-485 (Home Health Certification and Plan of Care) from a Plan of
 * Care and a Clinical Assessment (both required, as uploads or existing URLs).
 */
export async function generateClientForm485ViaApi(
  input: GenerateClientForm485Input,
  options?: { signal?: AbortSignal },
): Promise<ClientForm485GenerationResponse> {
  const formData = new FormData();
  if (input.pocFile) formData.append("pocFile", input.pocFile);
  if (input.clinicalFile) formData.append("clinicalFile", input.clinicalFile);
  if (input.pocUrl?.trim()) formData.append("pocUrl", input.pocUrl.trim());
  if (input.clinicalUrl?.trim()) formData.append("clinicalUrl", input.clinicalUrl.trim());
  if (input.clientId?.trim()) formData.append("clientId", input.clientId.trim());
  formData.append("formContext", JSON.stringify(input.formContext ?? {}));

  const response = await axiosClient.post<ClientForm485GenerationResponse>(
    "/gemini/generate-client-form485",
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
