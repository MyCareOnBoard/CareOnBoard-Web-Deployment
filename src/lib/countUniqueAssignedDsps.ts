import type { Client, ClientService } from "@/lib/api/clients";
import { countUniqueAssignedDspsFromOutcomeGroups } from "@/pages/shared/client-management/utils/outcomeServices";

function dspDedupeKey(d: { id?: string; name?: string }): string | null {
  const id = d.id?.trim();
  if (id) return `id:${id}`;
  const name = d.name?.trim();
  if (name) return `name:${name}`;
  return null;
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
  client: Pick<Client, "outcomes" | "services">,
): number {
  if (client.outcomes?.length) {
    return countUniqueAssignedDspsFromOutcomeGroups(client.outcomes);
  }
  return countUniqueAssignedDspsAcrossServices(client.services);
}