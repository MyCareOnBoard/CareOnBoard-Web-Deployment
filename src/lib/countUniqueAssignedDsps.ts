import type { Client, ClientDsp, ClientService } from "@/lib/api/clients";

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

/** Distinct assigned DSPs for display (outcomes → flat services → HHA authorizations → legacy primary/secondary). */
export function collectUniqueAssignedDspsForClient(
  client: Pick<
    Client,
    "outcomes" | "services" | "primaryDsp" | "secondaryDsps" | "hhaAuthorizations"
  >,
): ClientDsp[] {
  const map = new Map<string, ClientDsp>();

  for (const auth of client.hhaAuthorizations ?? []) {
    for (const d of auth.assignedDsps ?? []) {
      addDspToMap(map, d);
    }
  }

  if (client.outcomes?.length) {
    for (const o of client.outcomes) {
      for (const s of o.services ?? []) {
        for (const d of s.assignedDsps ?? []) {
          addDspToMap(map, d);
        }
      }
    }
  } else {
    for (const s of client.services ?? []) {
      for (const d of s.assignedDsps ?? []) {
        addDspToMap(map, d);
      }
    }
  }

  if (client.primaryDsp) addDspToMap(map, client.primaryDsp);
  for (const d of client.secondaryDsps ?? []) {
    addDspToMap(map, d);
  }

  return sortDsps([...map.values()]);
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
  client: Pick<
    Client,
    "outcomes" | "services" | "primaryDsp" | "secondaryDsps" | "hhaAuthorizations"
  >,
): number {
  return collectUniqueAssignedDspsForClient(client).length;
}