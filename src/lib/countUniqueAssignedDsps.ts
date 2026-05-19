import type { Client, ClientDsp, ClientService } from "@/lib/api/clients";
import { countUniqueAssignedDspsFromOutcomeGroups } from "@/pages/shared/client-management/utils/outcomeServices";

function dspDedupeKey(d: { id?: string; name?: string }): string | null {
  const id = d.id?.trim();
  if (id) return `id:${id}`;
  const name = d.name?.trim();
  if (name) return `name:${name}`;
  return null;
}

function dspDisplayName(d: { id?: string; name?: string }): string {
  const name = d.name?.trim();
  if (name) return name;
  return d.id?.trim() ?? "";
}

function addDspToMap(map: Map<string, ClientDsp>, d: { id?: string; name?: string }) {
  const k = dspDedupeKey(d);
  const label = dspDisplayName(d);
  if (!k || !label) return;
  if (!map.has(k)) {
    map.set(k, { id: d.id?.trim() || k, name: label });
  }
}

function sortDsps(dsps: ClientDsp[]): ClientDsp[] {
  return [...dsps].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" }));
}

function collectUniqueAssignedDspsFromServices(
  services: ClientService[] | undefined,
): ClientDsp[] {
  const map = new Map<string, ClientDsp>();
  for (const s of services ?? []) {
    for (const d of s.assignedDsps ?? []) {
      addDspToMap(map, d);
    }
  }
  return sortDsps([...map.values()]);
}

function collectLegacyClientDsps(
  client: Pick<Client, "primaryDsp" | "secondaryDsps">,
): ClientDsp[] {
  const map = new Map<string, ClientDsp>();
  if (client.primaryDsp) addDspToMap(map, client.primaryDsp);
  for (const d of client.secondaryDsps ?? []) {
    addDspToMap(map, d);
  }
  return sortDsps([...map.values()]);
}

/** Distinct assigned DSPs for display (outcomes → flat services → legacy primary/secondary). */
export function collectUniqueAssignedDspsForClient(
  client: Pick<Client, "outcomes" | "services" | "primaryDsp" | "secondaryDsps">,
): ClientDsp[] {
  if (client.outcomes?.length) {
    const fromOutcomes = client.outcomes.flatMap((o) => o.services ?? []);
    const fromOutcomeServices = collectUniqueAssignedDspsFromServices(fromOutcomes);
    if (fromOutcomeServices.length > 0) return fromOutcomeServices;
  }

  const fromFlatServices = collectUniqueAssignedDspsFromServices(client.services);
  if (fromFlatServices.length > 0) return fromFlatServices;

  return collectLegacyClientDsps(client);
}

/**
 * Count distinct DSPs across a flat `services` list.
 * @deprecated Prefer `countUniqueAssignedDspsFromOutcomeGroups` when `outcomes` is canonical; kept for legacy/unmigrated API rows.
 */
export function countUniqueAssignedDspsAcrossServices(
  services: ClientService[] | undefined,
): number {
  if (!services?.length) return 0;
  const keys = new Set<string>();
  for (const s of services) {
    for (const d of s.assignedDsps || []) {
      const k = dspDedupeKey(d);
      if (k) keys.add(k);
    }
  }
  return keys.size;
}

export function countUniqueAssignedDspsForClient(
  client: Pick<Client, "outcomes" | "services" | "primaryDsp" | "secondaryDsps">,
): number {
  if (client.outcomes?.length) {
    const count = countUniqueAssignedDspsFromOutcomeGroups(client.outcomes);
    if (count > 0) return count;
  }
  const fromServices = countUniqueAssignedDspsAcrossServices(client.services);
  if (fromServices > 0) return fromServices;
  return collectLegacyClientDsps(client).length;
}