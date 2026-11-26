import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronRight, LoaderCircle, Users } from "lucide-react";
import { useAuth } from "@/utils/auth/context/AuthContext";
import { agencyCareApi } from "@/lib/api/agencyCare";
import { AgencyListCard, AgencyPerson, AgencySearchField, agencyTd, agencyTh, agencyTheadRow, agencyTr } from "@/components/agency/AgencyListKit";
import { useAgencyCare } from "./AgencyCareLayout";
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

export function AgencyCareHome() {
  const { scope, agencyKey } = useAgencyCare();
  const [cursor, setCursor] = useState("");
  const [query, setQuery] = useState("");
  const list = useScopedRequest(`${scope}|networks|${cursor}`, (signal) =>
    agencyCareApi.networks({ agencyKey, cursor, signal }),
  );
  const items = list.data?.items ?? [];
  const needle = query.trim().toLowerCase();
  const shown = needle ? items.filter((network) => network.client.name.toLowerCase().includes(needle)) : items;
  return (
    <div className="flex flex-col gap-6">
      <CareHeading
        icon={Users}
        title="Clients"
        description="Client workspaces shared with families. You only see clients you have access to."
      />
      {list.loading ? (
        <CareLoad />
      ) : list.error ? (
        <CareFailure message={list.error} onRetry={list.reload} />
      ) : items.length ? (
        <>
          <AgencyListCard label="Your connected clients">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <h2 className="text-base font-semibold text-[#10141a] dark:text-[#f4f6f7]">Your connected clients</h2>
              <AgencySearchField label="Search clients" placeholder="Search clients" value={query} onChange={setQuery} className="w-full sm:w-[260px]" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr className={agencyTheadRow}>
                    <th scope="col" className={agencyTh}>Client workspace</th>
                    <th scope="col" className={agencyTh}>Status</th>
                    <th scope="col" className={agencyTh}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((network) => (
                    <tr className={agencyTr} key={network.id}>
                      <td className={agencyTd}><AgencyPerson name={network.client.name} detail="Client care workspace" /></td>
                      <td className={agencyTd}><CarePill>{careLabel(network.lifecycle)}</CarePill></td>
                      <td className={`${agencyTd} text-right`}>
                        <Link
                          to={`/agency-care/networks/${encodeURIComponent(network.id)}/overview`}
                          aria-label={`Open care workspace for ${network.client.name}`}
                          className="inline-flex items-center gap-1 text-[14px] font-medium text-[#007679] hover:text-[#005c5e] dark:text-[#7fd3d3]"
                        >
                          Open workspace<ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!shown.length && (
                    <tr><td colSpan={3} className={`${agencyTd} text-center text-[#5b636b]`}>No clients on this page match “{query.trim()}”.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </AgencyListCard>
          <CarePager cursor={list.data?.nextCursor} onNext={(next) => { setQuery(""); setCursor(next); }} />
        </>
      ) : (
        <AgencyListCard label="Your connected clients" className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <span aria-hidden="true" className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-[#f4f5f6] text-[#4b535b] dark:bg-white/10 dark:text-[#c9d1d4]"><Users className="h-5 w-5" /></span>
          <h2 className="text-base font-semibold text-[#10141a] dark:text-[#f4f6f7]">No connected clients yet</h2>
          <p className="max-w-[520px] text-sm text-[#5b636b] dark:text-[#9aa4a8]">
            Your agency administrator must grant access to a connected
            client. Organization membership alone does not open a workspace.
          </p>
        </AgencyListCard>
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
