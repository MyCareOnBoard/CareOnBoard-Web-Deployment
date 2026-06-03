import { format, isValid, parseISO } from "date-fns";
import type { Client, ClientService } from "@/lib/api/clients";
import { flattenOutcomeServices } from "@/pages/shared/client-management/utils/outcomeServices";

const TRANSPORTATION_CODES = new Set(["T2003", "A0120"]);
const TRANSPORT_NAME_RE = /\btransport(ation)?\b|\bmileage\b|\bnemt\b/i;

export function clientServicesForMileage(client: Client | null): ClientService[] {
  if (!client) return [];
  if (client.outcomes?.length) return flattenOutcomeServices(client.outcomes);
  return client.services ?? [];
}

function tryParseServiceAuthDate(raw?: string): Date | null {
  if (!raw?.trim()) return null;
  const d = parseISO(raw.trim());
  return isValid(d) ? d : null;
}

export function isServiceAuthorizationEndDatePast(service: ClientService): boolean {
  const raw = service.endAuthDate?.trim();
  if (!raw) return false;
  const dayPrefix = raw.slice(0, 10);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  if (/^\d{4}-\d{2}-\d{2}$/.test(dayPrefix)) {
    return dayPrefix < todayStr;
  }
  const end = tryParseServiceAuthDate(raw);
  if (!end) return false;
  return format(end, "yyyy-MM-dd") < todayStr;
}

export function isTransportationClientService(service: ClientService): boolean {
  if (service.clientPayType === "mile") return true;
  const code = (service.code ?? "").trim().toUpperCase();
  if (TRANSPORTATION_CODES.has(code)) return true;
  const blob = `${service.name ?? ""} ${service.code ?? ""}`;
  return TRANSPORT_NAME_RE.test(blob);
}

export function findActiveTransportationService(
  services: ClientService[],
): ClientService | null {
  return (
    services.find((s) => isTransportationClientService(s) && !isServiceAuthorizationEndDatePast(s)) ??
    null
  );
}

export function formatServiceAuthorizationDatesSummary(service: ClientService): string {
  const start = tryParseServiceAuthDate(service.startAuthDate);
  const end = tryParseServiceAuthDate(service.endAuthDate);
  const fmt = (d: Date) => format(d, "MMM d, yyyy");
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  if (end) return `Through ${fmt(end)}`;
  return "Not on file";
}

export function formatServiceDisplay(service: ClientService): string {
  const label = service.name ? `${service.name} — ${service.code}` : service.code;
  return label || "Transportation service";
}

export function formatRideServiceLabel(ride: {
  serviceCode?: string | null;
  isManual?: boolean;
  clientId?: string | null;
}): string {
  const code = ride.serviceCode?.trim();
  if (code) return code;
  if (!ride.clientId || ride.isManual) return "—";
  return "—";
}

function authDateToYmd(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed.slice(0, 10))) {
    return trimmed.slice(0, 10);
  }
  const d = parseISO(trimmed);
  return isValid(d) ? d.toISOString().slice(0, 10) : undefined;
}

export type MileageServiceApiFields = {
  serviceCode: string;
  serviceAuthorizationId?: string;
  serviceAuthStartDate?: string;
  serviceAuthEndDate?: string;
  assignedDsp?: string;
};

export function mileageServiceFieldsForApi(
  service: ClientService,
  assignedDspName: string,
): MileageServiceApiFields {
  const id = service.id?.trim();
  const start = authDateToYmd(service.startAuthDate);
  const end = authDateToYmd(service.endAuthDate);
  return {
    serviceCode: service.code,
    ...(id ? { serviceAuthorizationId: id } : {}),
    ...(start ? { serviceAuthStartDate: start } : {}),
    ...(end ? { serviceAuthEndDate: end } : {}),
    ...(assignedDspName.trim() ? { assignedDsp: assignedDspName.trim() } : {}),
  };
}
