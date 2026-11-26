import { Link } from "react-router";
import { ChevronRight, ClipboardCheck, FileText, Heart, RefreshCw, TriangleAlert, Users } from "lucide-react";
import { agencyCareApi, type CareDashboardClient } from "@/lib/api/agencyCare";
import { AgencyPanel, AgencyStatCard } from "@/components/agency/AgencyShell";
import { AgencyPerson, AgencyPill, agencyOutlineButton, agencyTd, agencyTh, agencyTheadRow, agencyTr } from "@/components/agency/AgencyListKit";
import { useAgencyCare } from "./AgencyCareLayout";
import { useScopedRequest } from "./hooks";
import { CareEmpty, CareFailure, CareHeading, CareLoad, CarePill, careLabel } from "./ui";

const openLink = "inline-flex items-center gap-1 text-[14px] font-medium text-[#007679] hover:text-[#005c5e] dark:text-[#7fd3d3]";

export function AgencyCareDashboard() {
  const { scope, agencyKey, organization } = useAgencyCare();
  const dashboard = useScopedRequest(`${scope}|dashboard`, async (signal) => {
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
  });
  const clients = dashboard.data ?? [];
  const pendingDocuments = clients.reduce((sum, client) => sum + client.pendingDocuments, 0);
  const pendingUpdates = clients.reduce((sum, client) => sum + client.pendingUpdates, 0);
  const reviewClients = clients.filter((client) => client.publicationActionCount !== null);
  const publicationActions = reviewClients.reduce((sum, client) => sum + (client.publicationActionCount ?? 0), 0);
  return (
    <div className="flex flex-col gap-6">
      <CareHeading
        icon={Heart}
        title="Agency Care"
        description={<>{organization.name} <span aria-hidden="true">·</span> your connected care at a glance.</>}
        actions={<button type="button" className={agencyOutlineButton} onClick={dashboard.reload}><RefreshCw className="h-4 w-4" aria-hidden="true" />Refresh</button>}
      />
      {dashboard.loading ? <CareLoad /> : dashboard.error ? <CareFailure message={dashboard.error} onRetry={dashboard.reload} /> : (
        <>
          <div className="flex flex-col gap-3">
            <div className={`grid gap-4 sm:grid-cols-2 ${reviewClients.length > 0 ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
              <AgencyStatCard icon={Users} label="Connected clients" value={clients.length} footnote="Client workspaces you can open." />
              <AgencyStatCard icon={FileText} label="Documents awaiting review" value={pendingDocuments} footnote="Submitted documents not yet reviewed." />
              <AgencyStatCard icon={ClipboardCheck} label="Updates awaiting review" value={pendingUpdates} footnote="Care updates for families." />
              {reviewClients.length > 0 && (
                <AgencyStatCard icon={TriangleAlert} label="Publication issues" value={publicationActions}
                  extra={publicationActions > 0 && <Link to="/agency-care/recovery" aria-label="Fix publication issues"><AgencyPill tone="amber">Fix</AgencyPill></Link>}
                  footnote="Approved items that could not reach a family." />
              )}
            </div>
            <p className="text-[12px] text-[#5b636b] dark:text-[#9aa4a8]">Counts include the clients and submissions available to your current access. Publication issues cover clients you can review.</p>
          </div>
          <AgencyPanel title="Client workspaces" bodyClassName="p-0"
            action={<Link to="/agency-care/clients" className={openLink}>View all clients<ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>}>
            {clients.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse">
                  <thead>
                    <tr className={agencyTheadRow}>
                      <th scope="col" className={agencyTh}>Client workspace</th>
                      <th scope="col" className={agencyTh}>Waiting</th>
                      <th scope="col" className={agencyTh}>Status</th>
                      <th scope="col" className={agencyTh}><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.slice(0, 5).map((client) => {
                      const waiting = client.pendingDocuments + client.pendingUpdates;
                      return (
                        <tr className={agencyTr} key={client.networkId}>
                          <td className={agencyTd}>
                            <AgencyPerson name={client.clientName} detail={`${client.pendingDocuments} ${client.pendingDocuments === 1 ? "document" : "documents"} · ${client.pendingUpdates} ${client.pendingUpdates === 1 ? "update" : "updates"}`} />
                          </td>
                          <td className={agencyTd}>
                            <div className="flex flex-wrap gap-1.5">
                              {waiting > 0 ? <AgencyPill tone="amber">{waiting} to review</AgencyPill> : <AgencyPill tone="green">Up to date</AgencyPill>}
                              {(client.publicationActionCount ?? 0) > 0 && <AgencyPill tone="red">{client.publicationActionCount} not delivered</AgencyPill>}
                            </div>
                          </td>
                          <td className={agencyTd}><CarePill>{careLabel(client.lifecycle)}</CarePill></td>
                          <td className={`${agencyTd} text-right`}>
                            <Link to={`/agency-care/networks/${encodeURIComponent(client.networkId)}/overview`} aria-label={`Open workspace for ${client.clientName}`} className={openLink}>
                              Open<ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <div className="px-5 py-4"><CareEmpty title="No connected clients yet">Your dashboard will show care activity when you have access to a connected client.</CareEmpty></div>}
          </AgencyPanel>
        </>
      )}
    </div>
  );
}
