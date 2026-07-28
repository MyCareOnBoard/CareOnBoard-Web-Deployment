import axiosClient from "@/lib/axios";
import type {
  OperationalAgencySummary,
  OperationalClientOption,
  OperationalFeature,
  OperationalOptionPage,
  OperationalServiceOption,
  OperationalStaffOption,
} from "@/lib/operational-agency/types";
import type { AgencyMode } from "@/store/redux/agencyModeSlice";

export type { OperationalFeature } from "@/lib/operational-agency/types";

export interface OperationalAgencyListInput {
  ids?: string[];
  search?: string;
  cursor?: string;
  limit?: number;
  signal?: AbortSignal;
}

export interface OperationalAgencyPage {
  data: OperationalAgencySummary[];
  nextCursor: string | null;
}

export interface OperationalOptionInput {
  agencyId: string;
  search?: string;
  mode?: AgencyMode;
  limit?: number;
  signal?: AbortSignal;
}

interface SuccessEnvelope<T> {
  success: true;
  data: T;
  nextCursor?: string;
  truncated?: boolean;
  scanLimit?: number;
}

function uniqueIds(ids: string[] = []): string[] {
  const seen = new Set<string>();
  return ids.filter((id) => {
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function responseData<T>(value: unknown): T {
  const envelope = value as Partial<SuccessEnvelope<T>> | null;
  if (!envelope || envelope.success !== true || !("data" in envelope)) {
    throw new Error("Invalid operational agency response.");
  }
  return envelope.data as T;
}

function requiredAgencyId(agencyId: string): string {
  if (!agencyId) throw new Error("agencyId is required.");
  return encodeURIComponent(agencyId);
}

export async function listOperationalAgencies(
  feature: OperationalFeature,
  input: OperationalAgencyListInput = {},
): Promise<OperationalAgencyPage> {
  const ids = uniqueIds(input.ids);
  const response = await axiosClient.get<SuccessEnvelope<OperationalAgencySummary[]>>(
    "/superAdminOperations/agencies",
    {
      params: {
        feature,
        ...(ids.length ? { ids } : {}),
        ...(input.search ? { search: input.search } : {}),
        ...(input.cursor ? { cursor: input.cursor } : {}),
        ...(input.limit ? { limit: input.limit } : {}),
      },
      paramsSerializer: { indexes: null },
      signal: input.signal,
    },
  );
  const data = responseData<OperationalAgencySummary[]>(response.data);
  if (!Array.isArray(data)) throw new Error("Invalid operational agency response.");
  return {
    data,
    nextCursor: typeof response.data.nextCursor === "string" ? response.data.nextCursor : null,
  };
}

export async function getOperationalAgencyContext(
  feature: OperationalFeature,
  agencyId: string,
  signal?: AbortSignal,
): Promise<OperationalAgencySummary> {
  const response = await axiosClient.get<SuccessEnvelope<OperationalAgencySummary>>(
    `/superAdminOperations/agencies/${requiredAgencyId(agencyId)}/context`,
    { params: { feature }, signal },
  );
  const data = responseData<OperationalAgencySummary>(response.data);
  if (!data || Array.isArray(data) || typeof data.id !== "string") {
    throw new Error("Invalid operational agency response.");
  }
  return data;
}

async function listOptions<T>(
  feature: OperationalFeature,
  kind: "clients" | "staff" | "services",
  input: OperationalOptionInput,
): Promise<OperationalOptionPage<T>> {
  const response = await axiosClient.get<SuccessEnvelope<T[]>>(
    `/superAdminOperations/agencies/${requiredAgencyId(input.agencyId)}/${kind}`,
    {
      params: {
        feature,
        ...(input.search ? { q: input.search } : {}),
        ...(input.mode ? { mode: input.mode } : {}),
        ...(input.limit ? { limit: input.limit } : {}),
      },
      signal: input.signal,
    },
  );
  const data = responseData<T[]>(response.data);
  if (!Array.isArray(data)) throw new Error("Invalid operational agency response.");
  return {
    items: data,
    truncated: response.data.truncated === true,
    scanLimit: typeof response.data.scanLimit === "number" ? response.data.scanLimit : null,
  };
}

export function searchOperationalClients(
  feature: OperationalFeature,
  input: OperationalOptionInput,
): Promise<OperationalOptionPage<OperationalClientOption>> {
  return listOptions(feature, "clients", input);
}

export function searchOperationalStaff(
  feature: OperationalFeature,
  input: OperationalOptionInput,
): Promise<OperationalOptionPage<OperationalStaffOption>> {
  return listOptions(feature, "staff", input);
}

export function listOperationalServices(
  feature: OperationalFeature,
  input: OperationalOptionInput,
): Promise<OperationalOptionPage<OperationalServiceOption>> {
  return listOptions(feature, "services", input);
}
