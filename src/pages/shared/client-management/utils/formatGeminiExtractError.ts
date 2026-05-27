import axios from "axios";

type ApiErrorBody = {
  message?: string;
  error?: string;
  errorCode?: string;
};

/**
 * Maps Gemini document extraction failures to plain-language copy for import panels.
 */
export function formatGeminiExtractError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ERR_CANCELED" || error.message === "canceled") {
      return "";
    }

    const data = error.response?.data as ApiErrorBody | undefined;
    const errorCode =
      typeof data?.errorCode === "string" ? data.errorCode.trim() : "";

    if (errorCode === "OUTPUT_TOKEN_CAP") {
      return "This document has too many service rows for us to read at once. Try splitting the file or contact support.";
    }

    if (
      error.code === "ECONNABORTED" ||
      (typeof error.message === "string" && error.message.includes("timeout"))
    ) {
      return "This is taking longer than expected. Wait a moment and try again.";
    }

    if (!error.response) {
      return "Connection interrupted. Check your network and try again.";
    }

    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message.trim();
    }
    if (typeof data?.error === "string" && data.error.trim()) {
      return data.error.trim();
    }
  } else if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "We couldn't read that file. Try again or pick a different document.";
}
