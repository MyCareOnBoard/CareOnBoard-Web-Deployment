import axiosClient from "../axios";
import { EXTRACT_DOCUMENT_TIMEOUT_MS } from "./gemini";
import type { ExtractionWarning } from "@/pages/shared/client-management/types/clientExtraction";
import type { ScClientExtractionResponse } from "@/pages/shared/client-management/types/scClientExtraction";

export async function extractScClientOnboardingViaApi(
  file: File,
  options?: { signal?: AbortSignal },
): Promise<ScClientExtractionResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axiosClient.post<ScClientExtractionResponse>(
    "/gemini/extract-client-sc-onboarding",
    formData,
    {
      timeout: EXTRACT_DOCUMENT_TIMEOUT_MS,
      signal: options?.signal,
      transformRequest: [(data, headers) => {
        if (data instanceof FormData) delete headers["Content-Type"];
        return data;
      }],
    },
  );
  const raw: unknown = response.data.warnings;
  const warnings: ExtractionWarning[] = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    const candidate = typeof item === "string" ? { message: item } : item;
    if (!candidate || typeof candidate.message !== "string" || !candidate.message.trim()) continue;
    warnings.push({
      message: candidate.message.trim(),
      ...(typeof candidate.path === "string" ? { path: candidate.path } : {}),
      ...(typeof candidate.code === "string" ? { code: candidate.code } : {}),
    });
  }
  return { ...response.data, warnings };
}
