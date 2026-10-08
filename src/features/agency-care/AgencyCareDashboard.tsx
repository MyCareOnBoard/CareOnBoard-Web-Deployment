import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { agencyCareApi, type CareDashboardClient } from "@/lib/api/agencyCare";
import { useAgencyCare } from "./AgencyCareLayout";
import { useScopedRequest } from "./hooks";
import { CareEmpty, CareFailure, CareHeading, CareLoad, CarePanel, CareStatus } from "./ui";

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
  const reviewablePending = reviewClients.reduce((sum, client) => sum + client.pendingDocuments + client.pendingUpdates, 0);
  const publicationActions = reviewClients.reduce((sum, client) => sum + (client.publicationActionCount ?? 0), 0);
  const metrics = [
    { label: "Connected clients", value: clients.length, to: "/agency-care/clients", action: "View clients" },
    { label: "Documents awaiting review", value: pendingDocuments, to: "/agency-care/clients", action: "View submissions" },
    { label: "Updates awaiting review", value: pendingUpdates, to: "/agency-care/clients", action: "View submissions" },
    ...(reviewClients.length ? [{ label: "Publication issues", value: publicationActions, to: "/agency-care/recovery", action: "View publication recovery" }] : []),
  ];
  return (
    <div className="ac-stack">
      <CareHeading title="Dashboard" description={`${organization.name} · Your connected care at a glance.`} actions={<Button variant="outline" onClick={dashboard.reload}>Refresh</Button>} />
      {dashboard.loading ? <CareLoad /> : dashboard.error ? <CareFailure message={dashboard.error} onRetry={dashboard.reload} /> : (
        <>
          <div className="ac-metrics">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <Link to={metric.to}>{metric.action} →</Link>
              </div>
            ))}
          </div>
          <small>Counts include the clients and submissions available to your current access. Publication issues cover clients you can review.</small>
          {reviewClients.length > 0 && (reviewablePending + publicationActions > 0) && (
            <CarePanel title="Needs attention">
              <div className="ac-actions">
                {reviewablePending > 0 && <Button asChild variant="outline"><Link to="/agency-care/review-queue">Review pending items</Link></Button>}
                {publicationActions > 0 && <Button asChild variant="outline"><Link to="/agency-care/recovery">Resolve publication issues</Link></Button>}
              </div>
            </CarePanel>
          )}
          <CarePanel title="Client workspaces" actions={<Button asChild variant="outline"><Link to="/agency-care/clients">View all clients</Link></Button>}>
            {clients.length ? (
              <div className="ac-list">
                {clients.slice(0, 5).map((client) => (
                  <div className="ac-list-row" key={client.networkId}>
                    <Link to={`/agency-care/networks/${encodeURIComponent(client.networkId)}/overview`}>{client.clientName}</Link>
                    <CareStatus>{client.lifecycle}</CareStatus>
                  </div>
                ))}
              </div>
            ) : <CareEmpty title="No connected clients yet">Your dashboard will show care activity when you have access to a connected client.</CareEmpty>}
          </CarePanel>
        </>
      )}
    </div>
  );
}
