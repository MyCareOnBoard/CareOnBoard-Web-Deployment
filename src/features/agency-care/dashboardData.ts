import { agencyCareApi, type CareDashboardClient } from "@/lib/api/agencyCare";

/** Every client summary the caller can see, walking all pages. Rejects rather than return a partial list. */
export async function loadCareDashboard(agencyKey: string, signal: AbortSignal) {
  // ponytail: live totals scan authorized clients; add scoped rollups if refresh latency grows.
  const clients = new Map<string, CareDashboardClient>();
  const cursors = new Set<string>();
  let cursor: string | undefined;
  do {
    signal.throwIfAborted();
    const page = await agencyCareApi.dashboard({ agencyKey, cursor, signal });
    for (const client of page.items) clients.set(client.networkId, client);
    cursor = page.nextCursor ?? undefined;
    if (cursor && cursors.has(cursor)) throw new Error("The care summary could not finish loading.");
    if (cursor) cursors.add(cursor);
  } while (cursor);
  return [...clients.values()];
}
