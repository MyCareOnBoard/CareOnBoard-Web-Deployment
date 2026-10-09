import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useAuth } from "@/utils/auth/context/AuthContext";
import { agencyCareApi } from "@/lib/api/agencyCare";
import { useAgencyCare } from "./AgencyCareLayout";
import { useScopedMutation, useScopedRequest } from "./hooks";
import {
  CareButton as Button,
  CareAvatar,
  CareEmpty,
  CareFailure,
  CareHeading,
  CareLoad,
  CarePager,
  CarePanel,
  CareStatus,
} from "./ui";

export function AgencyCareHome() {
  const { scope, agencyKey } = useAgencyCare();
  const [cursor, setCursor] = useState("");
  const list = useScopedRequest(`${scope}|networks|${cursor}`, (signal) =>
    agencyCareApi.networks({ agencyKey, cursor, signal }),
  );
  return (
    <div className="ac-stack">
      <CareHeading
        title="Clients"
        description="Open a client’s care workspace to coordinate with their care team."
      />
      {list.loading ? (
        <CareLoad />
      ) : list.error ? (
        <CareFailure message={list.error} onRetry={list.reload} />
      ) : (
        <>
          <CarePanel title="Your connected clients">
            {list.data?.items.length ? (
              <ul className="ac-list">
                {list.data.items.map((network) => (
                  <li className="ac-person-row" key={network.id}>
                    <div className="ac-row-main">
                      <CareAvatar name={network.client.name} />
                      <div className="ac-row-copy">
                        <strong>{network.client.name}</strong>
                        <small>Client care workspace</small>
                      </div>
                    </div>
                    <CareStatus>{network.lifecycle}</CareStatus>
                    <Button asChild variant="outline">
                      <Link
                        to={`/agency-care/networks/${encodeURIComponent(network.id)}/overview`}
                        aria-label={`Open care workspace for ${network.client.name}`}
                      >
                        Open workspace <ArrowRight aria-hidden="true" size={16} />
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <CareEmpty title="No connected clients yet">
                Your agency administrator must grant access to a connected
                client. Organization membership alone does not open a workspace.
              </CareEmpty>
            )}
          </CarePanel>
          <CarePager cursor={list.data?.nextCursor} onNext={setCursor} />
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
