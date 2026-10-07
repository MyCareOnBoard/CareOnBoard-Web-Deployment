import { NavLink, useParams } from "react-router";
import { agencyCareApi, type CareNetwork } from "@/lib/api/agencyCare";
import { useAgencyCare } from "./AgencyCareLayout";
import { hasCapability, useScopedRequest } from "./hooks";
import { CareFailure, CareLoad, CareStatus } from "./ui";
import { CareOverviewPage, CareActivityPage } from "./CareOverview";
import { CareTeamPage } from "./CareTeam";
import { CareConversationsPage } from "./CareConversations";
import { CareSubmissionsPage } from "./CareSubmissions";

export type CareWorkspaceProps = {
  network: CareNetwork;
  scope: string;
  agencyKey: string;
  refreshNetwork: () => void;
};
export function AgencyCareClientWorkspace() {
  const { networkId = "", tab = "overview" } = useParams();
  const context = useAgencyCare();
  const resourceScope = `${context.scope}|${networkId}`;
  const network = useScopedRequest(
    resourceScope,
    (signal) =>
      agencyCareApi.network(networkId, {
        agencyKey: context.agencyKey,
        signal,
      }),
    Boolean(networkId),
  );
  if (network.loading) return <CareLoad />;
  if (network.error || !network.data)
    return (
      <CareFailure
        message={network.error || "This workspace is unavailable."}
        onRetry={network.reload}
      />
    );
  if (!hasCapability(network.data, "view"))
    return (
      <CareFailure
        message="Your current grant does not allow this workspace."
        onRetry={network.reload}
      />
    );
  const scope = `${resourceScope}|${network.data.permissionRevision}`;
  const props = {
    network: network.data,
    scope,
    agencyKey: context.agencyKey,
    refreshNetwork: network.reload,
  };
  const tabs = [
    ["overview", "Overview"],
    ["team", "Care team"],
    ["conversations", "Conversations"],
    ["documents", "Documents"],
    ["updates", "Updates"],
    ["activity", "Activity"],
  ];
  return (
    <div className="ac-stack">
      <header className="ac-client-header">
        <span className="ac-avatar" aria-hidden="true">
          {network.data.client.name.slice(0, 1)}
        </span>
        <div>
          <h1>{network.data.client.name}</h1>
          <p>Client care workspace</p>
        </div>
        <CareStatus>{network.data.lifecycle}</CareStatus>
      </header>
      <nav className="ac-client-nav" aria-label="Client care workspace">
        {tabs.map(([value, label]) => (
          <NavLink
            key={value}
            to={`/agency-care/networks/${encodeURIComponent(networkId)}/${value}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <div key={`${scope}|${tab}`}>
        {tab === "overview" ? (
          <CareOverviewPage {...props} />
        ) : tab === "team" ? (
          <CareTeamPage {...props} />
        ) : tab === "conversations" ? (
          <CareConversationsPage {...props} />
        ) : tab === "documents" || tab === "updates" ? (
          <CareSubmissionsPage
            {...props}
            kind={tab === "documents" ? "document" : "care_update"}
          />
        ) : tab === "activity" ? (
          <CareActivityPage {...props} />
        ) : (
          <CareFailure
            message="This care page is unavailable."
            onRetry={network.reload}
          />
        )}
      </div>
    </div>
  );
}
