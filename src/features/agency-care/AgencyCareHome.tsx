import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronRight, LoaderCircle, Plus, Users } from "lucide-react";
import { useAuth } from "@/utils/auth/context/AuthContext";
import { agencyCareApi, type CareUnconnectedClient } from "@/lib/api/agencyCare";
import { AgencyListCard, AgencyPerson, AgencyPill, AgencySearchField, AgencySegmented, agencyPrimaryButton, agencyTd, agencyTh, agencyTheadRow, agencyTr } from "@/components/agency/AgencyListKit";
import { useAgencyCare } from "./AgencyCareLayout";
import { loadCareDashboard } from "./dashboardData";
import { useScopedMutation, useScopedRequest } from "./hooks";
import {
  CareButton as Button,
  CareFailure,
  CareHeading,
  CareLoad,
  CarePager,
  CarePill,
  careLabel,
} from "./ui";

type ClientsTab = "connected" | "invited" | "unconnected";
const rowLink = "inline-flex items-center gap-1 text-[14px] font-medium text-[#007679] hover:text-[#005c5e] dark:text-[#7fd3d3]";
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function ClientsEmpty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span aria-hidden="true" className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-[#f4f5f6] text-[#4b535b] dark:bg-white/10 dark:text-[#c9d1d4]"><Users className="h-5 w-5" /></span>
      <h2 className="text-base font-semibold text-[#10141a] dark:text-[#f4f6f7]">{title}</h2>
      <p className="max-w-[520px] text-sm text-[#5b636b] dark:text-[#9aa4a8]">{children}</p>
    </div>
  );
}

function ClientsTable({ columns, empty, children }: { columns: string[]; empty?: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse">
        <thead>
          <tr className={agencyTheadRow}>
            {columns.map((column) => <th scope="col" className={agencyTh} key={column}>{column}</th>)}
            <th scope="col" className={agencyTh}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {children}
          {empty && <tr><td colSpan={columns.length + 1} className={`${agencyTd} text-center text-[#5b636b]`}>{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

/** One "Ready to connect" row: creates the client's care workspace and opens it. */
function ConnectClientRow({ client, onStale }: { client: CareUnconnectedClient; onStale: () => void }) {
  const { scope, agencyKey } = useAgencyCare();
  const navigate = useNavigate();
  const mutation = useScopedMutation(`${scope}|connect|${client.clientId}`);
  async function connect() {
    const data = await mutation.run((operationId, signal) =>
      agencyCareApi.createNetwork(client.clientId, operationId, { agencyKey, signal }),
      { title: "Care workspace created", description: `${client.clientName} is now connected.` },
    );
    if (data) navigate(`/agency-care/networks/${encodeURIComponent(data.networkId)}/overview`);
  }
  return (
    <tr className={agencyTr}>
      <td className={agencyTd}>
        <AgencyPerson name={client.clientName} detail={client.familyContactCount ? `${plural(client.familyContactCount, "family contact", "family contacts")} on file` : "No family contacts on file"} />
        {mutation.error && <div className="mt-3"><CareFailure message={mutation.error} onRetry={() => { mutation.reset(); onStale(); }} /></div>}
      </td>
      <td className={agencyTd}><AgencyPill tone="grey">Not connected</AgencyPill></td>
      <td className={`${agencyTd} text-right`}>
        <button type="button" className={`${agencyPrimaryButton} h-9`} aria-label={`Connect ${client.clientName}`} disabled={mutation.saving || mutation.uncertain} onClick={() => void connect()}>
          {mutation.saving && <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
          {mutation.saving ? "Connecting…" : "Connect"}
        </button>
      </td>
    </tr>
  );
}

export function AgencyCareHome() {
  const { scope, agencyKey } = useAgencyCare();
  // Invitations and new workspaces belong to the agency that owns the client, so partner organizations keep the plain list.
  const internal = agencyKey.startsWith("internal:");
  const [tab, setTab] = useState<ClientsTab>("connected");
  const [cursor, setCursor] = useState("");
  const [waitingCursor, setWaitingCursor] = useState("");
  const [query, setQuery] = useState("");
  const list = useScopedRequest(`${scope}|networks|${cursor}`, (signal) =>
    agencyCareApi.networks({ agencyKey, cursor, signal }),
  );
  const summary = useScopedRequest(`${scope}|clients-summary`, (signal) => loadCareDashboard(agencyKey, signal), internal);
  const waiting = useScopedRequest(`${scope}|unconnected|${waitingCursor}`, (signal) =>
    agencyCareApi.unconnectedClients({ agencyKey, cursor: waitingCursor, signal }), internal);
  const needle = query.trim().toLowerCase();
  const matches = (name: string) => !needle || name.toLowerCase().includes(needle);
  const noMatch = `No clients on this page match “${query.trim()}”.`;
  const connected = list.data?.items ?? [];
  const invited = (summary.data ?? []).filter((client) => (client.pendingInvitations ?? 0) > 0);
  const unconnected = waiting.data?.items ?? [];
  const active = tab === "connected" ? list : tab === "invited" ? summary : waiting;
  const shownConnected = connected.filter((network) => matches(network.client.name));
  const shownInvited = invited.filter((client) => matches(client.clientName));
  const shownUnconnected = unconnected.filter((client) => matches(client.clientName));
  // A count is shown only when it is the whole list, never one page of it.
  const whole = (page: { data?: { nextCursor: string | null } }, at: string, count: number) => page.data && !at && !page.data.nextCursor ? count : undefined;
  const title = tab === "connected" ? "Your connected clients" : tab === "invited" ? "Invitations waiting" : "Ready to connect";
  const select = (next: ClientsTab) => { setQuery(""); setTab(next); };
  return (
    <div className="flex flex-col gap-6">
      <CareHeading
        icon={Users}
        title="Clients"
        description="Client workspaces shared with families. You only see clients you have access to."
        actions={internal && (unconnected.length > 0 || waitingCursor) ? (
          <button type="button" className={agencyPrimaryButton} onClick={() => select("unconnected")}><Plus className="h-4 w-4" aria-hidden="true" />Connect a client</button>
        ) : undefined}
      />
      {internal && (
        <AgencySegmented label="Client connection" value={tab} onChange={select} className="self-start" options={[
          { value: "connected", label: "Connected", count: summary.data?.length ?? whole(list, cursor, connected.length) },
          { value: "invited", label: "Invited", count: summary.data ? invited.length : undefined },
          { value: "unconnected", label: "Not connected", count: whole(waiting, waitingCursor, unconnected.length) },
        ]} />
      )}
      {active.loading ? (
        <CareLoad />
      ) : active.error ? (
        <CareFailure message={active.error} onRetry={active.reload} />
      ) : (
        <>
          <AgencyListCard label={title}>
            {(tab === "connected" ? connected : tab === "invited" ? invited : unconnected).length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-[#10141a] dark:text-[#f4f6f7]">{title}</h2>
                  {tab === "invited" && <p className="text-[13px] text-[#5b636b] dark:text-[#9aa4a8]">Connected clients with care team invitations that have not been accepted yet.</p>}
                  {tab === "unconnected" && <p className="text-[13px] text-[#5b636b] dark:text-[#9aa4a8]">Active support coordination clients without a care workspace. Connecting creates the workspace.</p>}
                </div>
                <AgencySearchField label="Search clients" placeholder="Search clients" value={query} onChange={setQuery} className="w-full sm:w-[260px]" />
              </div>
            )}
            {tab === "connected" ? (connected.length ? (
              <ClientsTable columns={["Client workspace", "Status"]} empty={shownConnected.length ? undefined : noMatch}>
                {shownConnected.map((network) => (
                  <tr className={agencyTr} key={network.id}>
                    <td className={agencyTd}><AgencyPerson name={network.client.name} detail="Client care workspace" /></td>
                    <td className={agencyTd}><CarePill>{careLabel(network.lifecycle)}</CarePill></td>
                    <td className={`${agencyTd} text-right`}>
                      <Link to={`/agency-care/networks/${encodeURIComponent(network.id)}/overview`} aria-label={`Open care workspace for ${network.client.name}`} className={rowLink}>
                        Open workspace<ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </ClientsTable>
            ) : (
              <ClientsEmpty title="No connected clients yet">
                {internal && unconnected.length > 0
                  ? "Connect a client to create their care workspace and start sharing with their family."
                  : "Your agency administrator must grant access to a connected client. Organization membership alone does not open a workspace."}
              </ClientsEmpty>
            )) : tab === "invited" ? (invited.length ? (
              <ClientsTable columns={["Client workspace", "Invitations"]} empty={shownInvited.length ? undefined : noMatch}>
                {shownInvited.map((client) => (
                  <tr className={agencyTr} key={client.networkId}>
                    <td className={agencyTd}><AgencyPerson name={client.clientName} detail="Client care workspace" /></td>
                    <td className={agencyTd}><AgencyPill tone="amber">{plural(client.pendingInvitations ?? 0, "invitation", "invitations")} pending</AgencyPill></td>
                    <td className={`${agencyTd} text-right`}>
                      <Link to={`/agency-care/networks/${encodeURIComponent(client.networkId)}/team`} aria-label={`Open care team for ${client.clientName}`} className={rowLink}>
                        Open care team<ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </ClientsTable>
            ) : (
              <ClientsEmpty title="No invitations waiting">Every care team invitation you can manage has been answered.</ClientsEmpty>
            )) : unconnected.length ? (
              <ClientsTable columns={["Client", "Status"]} empty={shownUnconnected.length ? undefined : noMatch}>
                {shownUnconnected.map((client) => <ConnectClientRow key={client.clientId} client={client} onStale={waiting.reload} />)}
              </ClientsTable>
            ) : (
              <ClientsEmpty title={waiting.data?.nextCursor ? "No clients to connect on this page" : "No clients to connect"}>
                {waiting.data?.nextCursor ? "Go to the next page to keep looking."
                  : "Clients you can connect are active support coordination clients that do not have a care workspace yet. Only the agency owner or the client’s assigned support coordinator can connect one."}
              </ClientsEmpty>
            )}
          </AgencyListCard>
          {tab === "connected" && <CarePager cursor={list.data?.nextCursor} onNext={(next) => { setQuery(""); setCursor(next); }} />}
          {tab === "unconnected" && <CarePager cursor={waiting.data?.nextCursor} onNext={(next) => { setQuery(""); setWaitingCursor(next); }} />}
        </>
      )}
    </div>
  );
}

type ClientEntryProps = {
  clientId: string;
  program?: string;
  allowCreate?: boolean;
  agencyKey?: string;
};
export function AgencyCareClientEntry({
  clientId,
  program = "sc",
  allowCreate = false,
  agencyKey,
}: ClientEntryProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const scope = `${user?.uid}|${agencyKey ?? ""}|${clientId}|${program}`;
  const lookup = useScopedRequest(
    scope,
    (signal) =>
      agencyCareApi.networkForClient(clientId, program, { agencyKey, signal }),
    Boolean(user?.uid && clientId),
  );
  const mutation = useScopedMutation(scope);
  async function create() {
    const data = await mutation.run((operationId, signal) =>
      agencyCareApi.createNetwork(clientId, operationId, { agencyKey, signal }),
      { title: "Care workspace created" },
    );
    if (data)
      navigate(
        `/agency-care/networks/${encodeURIComponent(data.networkId)}/overview`,
      );
  }
  return (
    <div className="agency-care ac-entry">
      {lookup.loading ? (
        <span role="status">Loading care connection…</span>
      ) : lookup.error ? (
        <CareFailure message={lookup.error} onRetry={lookup.reload} />
      ) : lookup.data?.networkId ? (
        <Button asChild variant="outline">
          <Link
            to={`/agency-care/networks/${encodeURIComponent(lookup.data.networkId)}/overview`}
          >
            Open Agency Care
          </Link>
        </Button>
      ) : allowCreate && program === "sc" ? (
        <Button
          onClick={() => void create()}
          disabled={mutation.saving || mutation.uncertain}
        >
          {mutation.saving && <LoaderCircle size={16} aria-hidden="true" className="motion-safe:animate-spin" />}
          {mutation.saving ? "Creating workspace…" : "Create care workspace"}
        </Button>
      ) : (
        <p className="ac-muted">
          No confirmed care workspace is linked to this client yet.
        </p>
      )}
      {mutation.error && (
        <CareFailure
          message={mutation.error}
          onRetry={() => {
            lookup.reload();
            mutation.reset();
          }}
        />
      )}
    </div>
  );
}
