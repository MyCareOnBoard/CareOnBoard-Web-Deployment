import type { Outcome } from "../types/formData";

/** Sent with SDR import extraction so Gemini can anchor matches to wizard rows only. */
export type SdrImportAvailableServicePayload = {
  outcomeId: string;
  outcomeIndex: number;
  outcomeStatement: string;
  services: Array<{
    serviceId: string;
    serviceIndex: number;
    serviceCode?: string;
    serviceName?: string;
    provider?: string;
  }>;
};

const MAX_CTX_OUTCOMES = 40;
const MAX_CTX_SERVICES_PER_OUTCOME = 25;
const MAX_FIELD_LEN = 512;
const MAX_STATEMENT_LEN = 800;

/** Safe JSON stringifier for hashing on the backend (deterministic spacing). */
export function serializeSdrAvailableServicesContext(list: SdrImportAvailableServicePayload[]): string {
  return JSON.stringify(list);
}

/**
 * Compact wizard Stage 2 context for SDR extraction.
 * Includes every authorization row inside each outcome slice so serviceIndex stays aligned with the UI grid.
 */
export function buildCompactSdrAvailableServicesContext(outcomes: Outcome[]): SdrImportAvailableServicePayload[] {
  return outcomes.slice(0, MAX_CTX_OUTCOMES).map((o, outcomeIndex) => {
    const services = (o.services ?? []).slice(0, MAX_CTX_SERVICES_PER_OUTCOME).map((s, serviceIndex) => {
      const serviceCode =
        String(s.code ?? "").trim().slice(0, MAX_FIELD_LEN) || undefined;
      const serviceName =
        String(s.name ?? "").trim().slice(0, MAX_FIELD_LEN) || undefined;
      const provider =
        String(s.provider ?? "").trim().slice(0, MAX_FIELD_LEN) || undefined;

      return {
        serviceId: s.id,
        serviceIndex,
        ...(serviceCode ? { serviceCode } : {}),
        ...(serviceName ? { serviceName } : {}),
        ...(provider ? { provider } : {}),
      };
    });

    const outcomeStatement = String(o.statement ?? "").trim().slice(0, MAX_STATEMENT_LEN);

    return {
      outcomeId: o.id,
      outcomeIndex,
      outcomeStatement,
      services,
    };
  });
}
