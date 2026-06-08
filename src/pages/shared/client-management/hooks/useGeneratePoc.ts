import { useCallback, useRef, useState } from "react";
import { generateClientPocViaApi } from "@/lib/api/gemini";
import type { AddClientFormData } from "../types/formData";
import type { ClientPocGenerationResponse } from "../types/clientPocGeneration";
import { buildPocFormContext } from "../utils/buildPocFormContext";
import {
  buildPocGenerationInputSignature,
  getDocByKey,
} from "../utils/pocGenerationEligibility";
import { formatGeminiExtractError } from "../utils/formatGeminiExtractError";

export function useGeneratePoc(
  formData: AddClientFormData,
  clientId?: string,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClientPocGenerationResponse | null>(null);
  const cacheRef = useRef<{ signature: string; result: ClientPocGenerationResponse } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const buildInput = useCallback(() => {
    const isp = getDocByKey(formData.stage3.docs, "isp");
    const pcpt = getDocByKey(formData.stage3.docs, "pcpt");
    return {
      ispFile: isp?.file ?? null,
      pcptFile: pcpt?.file ?? null,
      ispUrl: isp?.file ? null : isp?.url ?? null,
      pcptUrl: pcpt?.file ? null : pcpt?.url ?? null,
      clientId: clientId ?? null,
      formContext: buildPocFormContext(formData),
    };
  }, [formData, clientId]);

  const generate = useCallback(
    async (force = false) => {
      const signature = buildPocGenerationInputSignature(formData, clientId);
      if (!force && cacheRef.current?.signature === signature) {
        setResult(cacheRef.current.result);
        setError(null);
        return cacheRef.current.result;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setBusy(true);
      setError(null);
      try {
        const input = buildInput();
        const response = await generateClientPocViaApi(input, {
          signal: controller.signal,
        });
        cacheRef.current = { signature, result: response };
        setResult(response);
        return response;
      } catch (e: unknown) {
        const msg = formatGeminiExtractError(e);
        if (msg) setError(msg);
        else setError("We couldn't generate the plan of care. Try again or upload a POC instead.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [buildInput, clientId, formData],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
  }, []);

  const reset = useCallback(() => {
    cancel();
    setError(null);
    setResult(null);
  }, [cancel]);

  return {
    busy,
    error,
    result,
    generate,
    cancel,
    reset,
  };
}
