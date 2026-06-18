import { useCallback, useRef, useState } from "react";
import { generateClientForm485ViaApi } from "@/lib/api/gemini";
import type { AddClientFormData } from "../types/formData";
import type { ClientForm485GenerationResponse } from "../types/clientForm485Generation";
import { buildPocFormContext } from "../utils/buildPocFormContext";
import { getDocByKey } from "../utils/pocGenerationEligibility";
import { buildForm485GenerationInputSignature } from "../utils/form485GenerationEligibility";
import { formatGeminiExtractError } from "../utils/formatGeminiExtractError";

export function useGenerateForm485(
  formData: AddClientFormData,
  clientId?: string,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClientForm485GenerationResponse | null>(null);
  const cacheRef = useRef<{ signature: string; result: ClientForm485GenerationResponse } | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);

  const buildInput = useCallback(() => {
    const poc = getDocByKey(formData.stage3.docs, "poc");
    const clinical = getDocByKey(formData.stage3.docs, "clinicalAssessment");
    return {
      pocFile: poc?.file ?? null,
      clinicalFile: clinical?.file ?? null,
      pocUrl: poc?.file ? null : poc?.url ?? null,
      clinicalUrl: clinical?.file ? null : clinical?.url ?? null,
      clientId: clientId ?? null,
      formContext: buildPocFormContext(formData),
    };
  }, [formData, clientId]);

  const generate = useCallback(
    async (force = false) => {
      const signature = buildForm485GenerationInputSignature(formData, clientId);
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
        const response = await generateClientForm485ViaApi(input, {
          signal: controller.signal,
        });
        cacheRef.current = { signature, result: response };
        setResult(response);
        return response;
      } catch (e: unknown) {
        const msg = formatGeminiExtractError(e);
        if (msg) setError(msg);
        else setError("We couldn't generate the Form 485. Try again or upload one instead.");
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
