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
import type { Client } from "@/lib/api/clients";
import type { CreateActivityLogRequest, Employee } from "@/lib/api/employees";

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
  truncated: boolean;
  scanLimit: number | null;
}

export interface OperationalOptionInput {
  agencyId: string;
  search?: string;
  mode?: AgencyMode;
  limit?: number;
  signal?: AbortSignal;
}

export type OperationalStaffSchedulingContext = Pick<Employee, "id" | "workAvailability">;

export interface OperationalActivityResult {
  id: string;
  status: string;
}

interface SuccessEnvelope<T> {
  success: true;
  data: T;
  nextCursor?: string | null;
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

function operationalAgency(value: unknown): OperationalAgencySummary | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const agency = value as Record<string, unknown>;
  const supported = agency.supportedClientTypes;
  if (
    typeof agency.id !== "string" || !agency.id ||
    typeof agency.name !== "string" ||
    agency.status !== "active" ||
    !Array.isArray(supported) ||
    !supported.every((mode) => mode === "ddd" || mode === "hha") ||
    new Set(supported).size !== supported.length ||
    typeof agency.timezone !== "string"
  ) {
    return null;
  }
  return {
    id: agency.id,
    name: agency.name,
    status: "active",
    supportedClientTypes: supported,
    timezone: agency.timezone,
  };
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
  const rawData = responseData<unknown>(response.data);
  if (!Array.isArray(rawData)) throw new Error("Invalid operational agency response.");
  const data = rawData.map(operationalAgency);
  const nextCursor = response.data.nextCursor;
  const truncated = response.data.truncated;
  const scanLimit = response.data.scanLimit;
  if (
    data.some((agency) => agency === null) ||
    !(nextCursor == null || (typeof nextCursor === "string" && Boolean(nextCursor))) ||
    !(truncated === undefined || typeof truncated === "boolean") ||
    (truncated === true && !(Number.isInteger(scanLimit) && Number(scanLimit) > 0)) ||
    (truncated !== true && scanLimit !== undefined)
  ) {
    throw new Error("Invalid operational agency response.");
  }
  return {
    data: data as OperationalAgencySummary[],
    nextCursor: nextCursor ?? null,
    truncated: truncated === true,
    scanLimit: truncated === true ? Number(scanLimit) : null,
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

export async function getOperationalClientSchedulingContext(
  feature: OperationalFeature,
  agencyId: string,
  clientId: string,
  signal?: AbortSignal,
): Promise<Client> {
  const response = await axiosClient.get<SuccessEnvelope<Client>>(
    `/superAdminOperations/agencies/${requiredAgencyId(agencyId)}/clients/${encodeURIComponent(clientId)}/scheduling-context`,
    { params: { feature }, signal },
  );
  const data = responseData<Client>(response.data);
  if (!data || Array.isArray(data) || typeof data.id !== "string") {
    throw new Error("Invalid operational client response.");
  }
  return data;
}

export async function getOperationalStaffSchedulingContext(
  feature: OperationalFeature,
  agencyId: string,
  staffId: string,
  signal?: AbortSignal,
): Promise<OperationalStaffSchedulingContext> {
  const response = await axiosClient.get<SuccessEnvelope<OperationalStaffSchedulingContext>>(
    `/superAdminOperations/agencies/${requiredAgencyId(agencyId)}/staff/${encodeURIComponent(staffId)}/scheduling-context`,
    { params: { feature }, signal },
  );
  const data = responseData<OperationalStaffSchedulingContext>(response.data);
  if (
    !data ||
    Array.isArray(data) ||
    typeof data.id !== "string" ||
    typeof data.workAvailability !== "boolean"
  ) {
    throw new Error("Invalid operational staff response.");
  }
  return data;
}

export async function createOperationalStaffActivity(
  feature: OperationalFeature,
  agencyId: string,
  staffId: string,
  payload: CreateActivityLogRequest,
  signal?: AbortSignal,
): Promise<OperationalActivityResult> {
  const response = await axiosClient.post<SuccessEnvelope<OperationalActivityResult>>(
    `/superAdminOperations/agencies/${requiredAgencyId(agencyId)}/staff/${encodeURIComponent(staffId)}/activities`,
    payload,
    { params: { feature }, signal },
  );
  const data = responseData<OperationalActivityResult>(response.data);
  if (
    !data ||
    Array.isArray(data) ||
    typeof data.id !== "string" ||
    typeof data.status !== "string"
  ) {
    throw new Error("Invalid operational activity response.");
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
