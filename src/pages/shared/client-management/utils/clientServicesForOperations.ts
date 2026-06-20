import type { Client, ClientHhaAuthorization, ClientService } from "@/lib/api/clients";
import { flattenOutcomeServices } from "./outcomeServices";

function resolveHhaUnitPayType(
  auth: ClientHhaAuthorization,
): ClientService["clientPayType"] | undefined {
  if (auth.unitType === "15-min") return "15-min";
  if (auth.unitType === "daily") return "daily";
  if (auth.unitType === "hourly") return "hourly";
  if (auth.unitType === "mile") return "mile";
  return undefined;
}

function resolveHhaClientPayType(
  auth: ClientHhaAuthorization,
): ClientService["clientPayType"] | undefined {
  if (auth.clientPayType) return auth.clientPayType;
  return resolveHhaUnitPayType(auth);
}

/** Legacy rows saved before staffRate/payType validation may lack an explicit payType. */
function resolveHhaStaffPayType(
  auth: ClientHhaAuthorization,
): ClientService["payType"] | undefined {
  if (auth.payType) return auth.payType;
  return resolveHhaUnitPayType(auth);
}

/** Mirror BE normalize for wizard/draft fallback when API has not computed services yet. */
export function hhaAuthorizationToClientService(
  auth: ClientHhaAuthorization,
): ClientService | null {
  const name = String(auth.serviceName ?? "").trim();
  const code = String(auth.serviceCode ?? "").trim();
  if (!name && !code) return null;

  const paNumber = String(auth.authorizationNumber ?? "").trim();
  const assignedDsps = auth.assignedDsps
    ?.filter((d) => d.id?.trim())
    .map((d) => ({ id: d.id.trim(), name: (d.name ?? "").trim() }));

  return {
    id: auth.id || auth.serviceId || code || name,
    name,
    code,
    hours: auth.approvedHours?.trim() || undefined,
    totalHours: auth.approvedHours?.trim() || undefined,
    clientRate: auth.rate?.trim() || undefined,
    clientPayType: resolveHhaClientPayType(auth),
    staffRate: auth.staffRate?.trim() || undefined,
    payType: resolveHhaStaffPayType(auth),
    modifier: auth.modifier?.trim() || undefined,
    serviceType: auth.serviceType?.trim() || undefined,
    serviceGoal: auth.goal?.trim() || undefined,
    unitType: auth.unitType?.trim() || undefined,
    startAuthDate: auth.startDate,
    endAuthDate: auth.endDate,
    claimsSource: auth.payerSource?.trim() || undefined,
    assignedDsps: assignedDsps && assignedDsps.length > 0 ? assignedDsps : undefined,
    ...(paNumber ? { sdrPriorAuthorization: { paNumber } } : {}),
  };
}

/**
 * Trust API `client.services` first; compute locally only as fallback.
 */
export function getClientServicesForOperations(client?: Client | null): ClientService[] {
  if (!client) return [];
  if (client.services?.length) return client.services;
  if (client.type === "hha" && client.hhaAuthorizations?.length) {
    return client.hhaAuthorizations
      .map(hhaAuthorizationToClientService)
      .filter((s): s is ClientService => s !== null);
  }
  if (client.outcomes?.length) return flattenOutcomeServices(client.outcomes);
  return [];
}
