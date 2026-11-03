import axiosClient from "../axios";

export type AssignableClientMode = "ddd" | "hha";
export type AssignableClient = { id: string; name: string; mode: AssignableClientMode; status?: string };

type ClientRow = { id: string; firstName?: string; lastName?: string; preferredName?: string; fullName?: string; status?: string };
type ClientListResponse = { success: boolean; clients: ClientRow[]; pagination?: { fetchedCount?: number } };

const PAGE = 100;
const MAX_PAGES = 50;

function clientName(client: ClientRow): string {
  return client.fullName || [client.firstName, client.lastName].filter(Boolean).join(" ").trim() || "Unnamed client";
}

/**
 * DDD/HHA clients a staff member can be given. The agency owner pages through
 * their own agency; a platform administrator names the agency and gets the
 * newest 100 per program (the shared list has no paging).
 */
export async function listAssignableClients({ modes, agencyId, asPlatformAdmin, signal }: {
  modes: AssignableClientMode[];
  agencyId: string;
  asPlatformAdmin: boolean;
  signal?: AbortSignal;
}): Promise<AssignableClient[]> {
  const found = new Map<string, AssignableClient>();
  for (const mode of modes) {
    if (asPlatformAdmin) {
      const response = await axiosClient.get<ClientListResponse>("/clients", { params: { agencyId, mode, limit: PAGE }, signal });
      response.data.clients.forEach((client) => found.set(client.id, { id: client.id, name: clientName(client), mode, status: client.status }));
      continue;
    }
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const response = await axiosClient.get<ClientListResponse>("/clientManagement", {
        params: { type: mode, brief: true, limit: PAGE, offset: page * PAGE }, signal,
      });
      const rows = response.data.clients || [];
      rows.forEach((client) => found.set(client.id, { id: client.id, name: clientName(client), mode, status: client.status }));
      // The server filters by program after paging, so a short page is not the end; the fetched count is.
      if ((response.data.pagination?.fetchedCount ?? rows.length) < PAGE) break;
    }
  }
  return [...found.values()].sort((left, right) => left.name.localeCompare(right.name));
}
