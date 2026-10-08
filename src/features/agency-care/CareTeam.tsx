import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/useDebounce";
import { listClients } from "@/lib/api/clients";
import {
  agencyCareApi,
  type CareRelationship,
  type CareGrant,
  type CareSourceLink,
  type CarePage,
  type CareInvitation,
  type CareMember,
} from "@/lib/api/agencyCare";
import { useAgencyCare } from "./AgencyCareLayout";
import type { CareWorkspaceProps } from "./AgencyCareClientWorkspace";
import { hasCapability, useScopedMutation, useScopedRequest } from "./hooks";
import {
  CareEmpty,
  CareFailure,
  CareFormDialog,
  CareHeading,
  CareInvitationDelivery,
  CareLoad,
  CareNotice,
  CarePager,
  CarePanel,
  CareStatus,
  careDate,
  careLabel,
} from "./ui";

type TeamModal =
  | { kind: "invite" }
  | { kind: "relationship"; target: CareRelationship }
  | { kind: "grant"; target?: CareGrant }
  | { kind: "source"; target?: CareSourceLink };
export function CareTeamPage(props: CareWorkspaceProps) {
  const { network, scope, agencyKey } = props;
  const [section, setSection] = useState("relationships");
  const [cursor, setCursor] = useState("");
  const [modal, setModal] = useState<TeamModal | null>(null);
  const data = useScopedRequest<
    CarePage<CareRelationship | CareGrant | CareSourceLink | CareInvitation>
  >(`${scope}|${section}|${cursor}`, (signal) =>
    section === "relationships"
      ? agencyCareApi.relationships(network.id, { agencyKey, cursor, signal })
      : section === "invitations"
        ? agencyCareApi.invitations(network.id, { agencyKey, cursor, signal })
        : section === "grants"
          ? agencyCareApi.grants(network.id, { agencyKey, cursor, signal })
          : agencyCareApi.sourceLinks(network.id, {
              agencyKey,
              cursor,
              signal,
            }),
  );
  const mutation = useScopedMutation(`${scope}|${section}`);
  const manage = hasCapability(network, "manage");
  function refresh() {
    data.reload();
    props.refreshNetwork();
  }
  return (
    <div className="ac-stack">
      <CareHeading
        title="Care team"
        description="Manage this client’s connected agencies and permitted people."
        actions={
          hasCapability(network, "invite") && (
            <Button onClick={() => setModal({ kind: "invite" })}>
              Add an agency
            </Button>
          )
        }
      />
      <div className="ac-actions" role="group" aria-label="Care team views">
        {[
          ["relationships", "Connected agencies"],
          ["invitations", "Invitations"],
          ["grants", "Client access"],
          ["source", "Client record connections"],
        ].map(([value, label]) => (
          <Button
            key={value}
            variant={section === value ? "default" : "outline"}
            onClick={() => {
              setSection(value);
              setCursor("");
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      {data.loading ? (
        <CareLoad />
      ) : data.error ? (
        <CareFailure message={data.error} onRetry={data.reload} />
      ) : (
        <CarePanel
          title={careLabel(section)}
          actions={
            section === "grants" && manage ? (
              <Button
                variant="outline"
                onClick={() => setModal({ kind: "grant" })}
              >
                Assign permitted user
              </Button>
            ) : section === "source" && manage ? (
              <Button
                variant="outline"
                onClick={() => setModal({ kind: "source" })}
              >
                Connect existing client record
              </Button>
            ) : undefined
          }
        >
          {!data.data?.items.length ? (
            <CareEmpty title="No records in this view">
              Connections and access are explicit. New members receive client
              access only after a fresh assignment.
            </CareEmpty>
          ) : (
            <ul className="ac-list">
              {data.data.items.map((item) => {
                if (section === "relationships") {
                  const target = item as CareRelationship;
                  return (
                    <li key={target.agencyKey}>
                      <div>
                        <strong>{target.name}</strong>
                        <p>
                          {target.kind} ·{" "}
                          {target.expiresAt
                            ? `Expires ${careDate(target.expiresAt)}`
                            : "Client connection"}
                        </p>
                      </div>
                      <CareStatus>{careLabel(target.state)}</CareStatus>
                      {manage && Boolean(target.allowedActions?.length) && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            setModal({ kind: "relationship", target })
                          }
                        >
                          Manage connection
                        </Button>
                      )}
                    </li>
                  );
                }
                if (section === "grants") {
                  const target = item as CareGrant;
                  return (
                    <li key={target.uid}>
                      <div>
                        <strong>{target.name || target.uid}</strong>
                        <p>
                          {target.capabilities.join(", ") ||
                            "No current client capabilities"}{" "}
                          · {target.state || "Current grant"}
                        </p>
                      </div>
                      {manage && (
                        <Button
                          variant="outline"
                          onClick={() => setModal({ kind: "grant", target })}
                        >
                          Edit access
                        </Button>
                      )}
                    </li>
                  );
                }
                if (section === "source") {
                  const target = item as CareSourceLink;
                  return (
                    <li key={target.clientId}>
                      <div>
                        <strong>
                          {target.clientName || "Existing client record"}
                        </strong>
                        <p>
                          {target.programs.join(", ")} · {target.agencyKey}
                        </p>
                      </div>
                      <CareStatus>{careLabel(target.state)}</CareStatus>
                      {manage &&
                        target.clientId !== network.sourceClient.clientId && (
                          <Button
                            variant="outline"
                            onClick={() => setModal({ kind: "source", target })}
                          >
                            Review connection
                          </Button>
                        )}
                    </li>
                  );
                }
                const target = item as CareInvitation;
                return (
                  <li key={target.id}>
                    <div>
                      <strong>
                        {target.agencyName ||
                          target.recipientEmail ||
                          "Agency invitation"}
                      </strong>
                      <p>Expires {careDate(target.expiresAt)}</p>
                      <CareInvitationDelivery
                        delivery={target.delivery}
                        recipientMode={target.recipientMode}
                        showResendHint={
                          hasCapability(network, "invite") &&
                          target.status === "pending"
                        }
                      />
                    </div>
                    <CareStatus>{careLabel(target.status)}</CareStatus>
                    {hasCapability(network, "invite") &&
                      target.status === "pending" && (
                        <div className="ac-actions">
                          <Button
                            variant="outline"
                            disabled={mutation.saving || mutation.uncertain}
                            onClick={async () => {
                              if (
                                await mutation.run((operationId, signal) =>
                                  agencyCareApi.invitationAction(
                                    target.id,
                                    "resend",
                                    {
                                      operationId,
                                      expectedRevision: target.revision,
                                    },
                                    { agencyKey, signal },
                                  ),
                                  { title: "Replacement invitation created", description: "Delivery is queued. The previous invitation is no longer valid." },
                                )
                              )
                                data.reload();
                            }}
                          >
                            Resend
                          </Button>
                          <Button
                            variant="outline"
                            disabled={mutation.saving || mutation.uncertain}
                            onClick={async () => {
                              if (
                                await mutation.run((operationId, signal) =>
                                  agencyCareApi.invitationAction(
                                    target.id,
                                    "revoke",
                                    {
                                      operationId,
                                      expectedRevision: target.revision,
                                    },
                                    { agencyKey, signal },
                                  ),
                                  { title: "Invitation revoked" },
                                )
                              )
                                data.reload();
                            }}
                          >
                            Revoke invitation
                          </Button>
                        </div>
                      )}
                  </li>
                );
              })}
            </ul>
          )}
          <CarePager cursor={data.data?.nextCursor} onNext={setCursor} />
        </CarePanel>
      )}
      {mutation.error && (
        <CareFailure
          message={mutation.error}
          onRetry={() => {
            data.reload();
            mutation.reset();
          }}
        />
      )}
      {modal && (
        <TeamForm
          {...props}
          modal={modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

export function TeamForm({
  network,
  scope,
  agencyKey,
  modal,
  onClose,
  onSaved,
}: CareWorkspaceProps & {
  modal: TeamModal;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { organization } = useAgencyCare();
  const mutation = useScopedMutation(`${scope}|${modal.kind}`);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [selectedAgency, setSelectedAgency] = useState("");
  const internalInvitation = selectedAgency.startsWith("internal:");
  const [recipientName, setRecipientName] = useState("");
  const [email, setEmail] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<
    "suspend" | "resume" | "revoke" | "expire"
  >(
    modal.kind === "relationship"
      ? modal.target.allowedActions?.[0] || "revoke"
      : "revoke",
  );
  const [uid, setUid] = useState(
    modal.kind === "grant" ? modal.target?.uid || "" : "",
  );
  const [memberCursor, setMemberCursor] = useState("");
  const [selectedMember, setSelectedMember] = useState<CareMember | null>(null);
  const [capabilities, setCapabilities] = useState<string[]>(
    modal.kind === "grant" ? modal.target?.capabilities || ["view"] : [],
  );
  const [clientId, setClientId] = useState(
    modal.kind === "source" ? modal.target?.clientId || "" : "",
  );
  const [programs, setPrograms] = useState<string[]>(
    modal.kind === "source" ? modal.target?.programs || [] : [],
  );
  const [confirmed, setConfirmed] = useState(false);
  const [formError, setFormError] = useState("");
  const directoryQuery = useDebounce(queryInput.trim());
  const waitingForSearch = directoryQuery !== queryInput.trim();
  const directory = useScopedRequest(
    `${scope}|directory|${directoryQuery}`,
    (signal) =>
      agencyCareApi.directory({ agencyKey, query: directoryQuery, signal, limit: 25 }),
    modal.kind === "invite" && directoryQuery.length >= 2 && !waitingForSearch,
  );
  const localClients = useScopedRequest(
    `${scope}|local-clients|${query}`,
    (signal) =>
      listClients({
        agencyId: organization.id,
        search: query,
        limit: 25,
        signal,
      }),
    modal.kind === "source" &&
      !modal.target &&
      organization.kind === "internal" &&
      query.length >= 2,
  );
  const members = useScopedRequest(
    `${scope}|grant-candidates|${memberCursor}`,
    (signal) =>
      agencyCareApi.networkMembers(network.id, {
        agencyKey,
        cursor: memberCursor,
        signal,
      }),
    modal.kind === "grant",
  );
  const title =
    modal.kind === "invite"
      ? "Invite an agency"
      : modal.kind === "grant"
        ? "Client access"
        : modal.kind === "source"
          ? "Confirm client record connection"
          : "Manage agency connection";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (
      modal.kind === "invite" &&
      ((!internalInvitation && !email.trim()) ||
        (!selectedAgency && (!agencyName.trim() || !recipientName.trim())))
    ) {
      setFormError(
        "Select an existing agency or enter the external agency and recipient details.",
      );
      return;
    }
    if (
      (modal.kind === "relationship" ||
        (modal.kind === "source" && modal.target?.state === "confirmed")) &&
      !reason.trim()
    ) {
      setFormError("A reason is required.");
      return;
    }
    if (modal.kind === "source" && !confirmed) {
      setFormError("Confirm the intended client identity before continuing.");
      return;
    }
    const result = await mutation.run<
      CareRelationship | CareInvitation | CareGrant | CareSourceLink
    >((operationId, signal) => {
      const options = { agencyKey, signal };
      if (modal.kind === "invite")
        return agencyCareApi.invite(
          network.id,
          selectedAgency
            ? {
                agencyKey: selectedAgency,
                ...(!internalInvitation ? { recipientEmail: email.trim() } : {}),
                operationId,
              }
            : {
                recipientName: recipientName.trim(),
                recipientEmail: email.trim(),
                agencyName: agencyName.trim(),
                operationId,
              },
          options,
        );
      if (modal.kind === "relationship")
        return agencyCareApi.relationship(
          network.id,
          modal.target.agencyKey,
          {
            action,
            expectedRevision: modal.target.revision,
            reason: reason.trim(),
            operationId,
          },
          options,
        );
      if (modal.kind === "grant")
        return agencyCareApi.grant(
          network.id,
          uid.trim(),
          {
            agencyKey,
            capabilities,
            expectedRevision: modal.target?.revision ?? 0,
            operationId,
          },
          options,
        );
      if (modal.target?.state === "confirmed")
        return agencyCareApi.withdrawSourceLink(
          network.id,
          modal.target.clientId,
          {
            expectedRevision: modal.target.revision,
            reason: reason.trim(),
            operationId,
          },
          options,
        );
      return agencyCareApi.sourceLink(
        network.id,
        {
          clientId,
          programs,
          action: modal.target ? "confirm" : "propose",
          expectedRevision: modal.target?.revision ?? 0,
          operationId,
        },
        options,
      );
    }, {
      title: modal.kind === "invite"
        ? "Invitation created"
        : modal.kind === "relationship"
          ? { suspend: "Agency connection suspended", resume: "Agency connection resumed", revoke: "Agency connection revoked", expire: "Agency connection expired" }[action]
          : modal.kind === "grant"
            ? "Client access updated"
            : modal.target?.state === "confirmed"
              ? "Client record connection withdrawn"
              : modal.target ? "Client record connection confirmed" : "Client record connection proposed",
      description: modal.kind === "invite" ? "Delivery is queued. The agency must accept the connection before access is added." : undefined,
    });
    if (result) onSaved();
  }
  return (
    <CareFormDialog
      open
      title={title}
      description={`${network.client.name} · ${organization.name}`}
      onClose={onClose}
      busy={mutation.saving}
      className="ac-form-dialog"
    >
      <form onSubmit={(event) => void submit(event)} className="ac-dialog-form">
        <div className="ac-dialog-body">
          <fieldset disabled={mutation.saving} className="ac-stack">
            {modal.kind === "invite" && (
              <>
                <div className="ac-field">
                  <label htmlFor="care-agency-search">Find an existing agency</label>
                  <Input
                    id="care-agency-search"
                    type="search"
                    value={queryInput}
                    onChange={(event) => {
                      setQueryInput(event.target.value);
                      setSelectedAgency("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.preventDefault();
                    }}
                    maxLength={80}
                    placeholder="Search by agency name"
                    aria-describedby="agency-search-help"
                  />
                  <small id="agency-search-help">Type at least 2 characters. Results appear as you type.</small>
                </div>
                {queryInput.trim().length >= 2 && (waitingForSearch || directory.loading) ? (
                  <CareLoad rows={1} />
                ) : directory.error ? (
                  <CareFailure
                    message={directory.error}
                    onRetry={directory.reload}
                  />
                ) : (
                  directory.data && (directory.data.items.length ? (
                    <fieldset className="ac-agency-results">
                      <legend>Matching agencies</legend>
                      <div className="ac-agency-result-list">
                        {directory.data.items.map((item) => (
                          <label key={item.agencyKey} className="ac-agency-result">
                            <input
                              type="radio"
                              name="agency-result"
                              value={item.agencyKey}
                              checked={selectedAgency === item.agencyKey}
                              onChange={() => setSelectedAgency(item.agencyKey)}
                              aria-label={`Select ${item.name}`}
                            />
                            <span className="ac-agency-result-details">
                              <strong>{item.name}</strong>
                              <small>{[item.city, item.state].filter(Boolean).join(", ") || "Location not provided"}</small>
                              <small>{item.kind === "internal" ? "CareOnBoard agency" : "External agency"} · {item.id}</small>
                              {Boolean(item.serviceTypes?.length) && <small>{item.serviceTypes?.map(careLabel).join(" · ")}</small>}
                            </span>
                            {item.verificationStatus && <CareStatus>{careLabel(item.verificationStatus)}</CareStatus>}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ) : (
                    <p className="ac-muted" role="status">No matching agencies. Try another name or invite an external agency below.</p>
                  ))
                )}
                {selectedAgency && (
                  <div className="ac-dialog-section ac-stack">
                    <div className="ac-actions">
                      <strong>{internalInvitation ? "Invitation delivery" : "Invitation recipient"}</strong>
                      <Button type="button" variant="ghost" onClick={() => setSelectedAgency("")}>Clear selection</Button>
                    </div>
                    {internalInvitation ? (
                      <CareNotice>
                        The agency's administrators and owner, along with platform
                        administrators, will receive in-app notifications and email.
                        An authorized agency administrator or owner must review and
                        accept the connection.
                      </CareNotice>
                    ) : <div className="ac-field">
                      <label htmlFor="care-invitation-email">Intended recipient work email</label>
                      <Input
                        id="care-invitation-email"
                        aria-describedby="care-invitation-email-help"
                        required
                        type="email"
                        value={email}
                        maxLength={254}
                        placeholder="name@agency.com"
                        onChange={(event) => setEmail(event.target.value)}
                      />
                      <small id="care-invitation-email-help">
                        The intended recipient must verify this email before accepting
                        for the selected organization.
                      </small>
                    </div>}
                  </div>
                )}
                {!selectedAgency && (
                  <div className="ac-dialog-section">
                    <h3>Or invite an external agency</h3>
                    <p className="ac-muted">Enter the agency and contact details to send a client connection invitation.</p>
                    <div className="ac-form-grid">
                      <label className="ac-field">
                        <span>External agency name</span>
                        <Input
                          required
                          value={agencyName}
                          onChange={(event) => setAgencyName(event.target.value)}
                          maxLength={160}
                          placeholder="Agency name"
                        />
                      </label>
                      <label className="ac-field">
                        <span>Recipient name</span>
                        <Input
                          required
                          value={recipientName}
                          onChange={(event) => setRecipientName(event.target.value)}
                          maxLength={120}
                          placeholder="Full name"
                        />
                      </label>
                      <label className="ac-field ac-field-full">
                        <span>Recipient work email</span>
                        <Input
                          required
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          maxLength={254}
                          placeholder="name@agency.com"
                        />
                      </label>
                    </div>
                  </div>
                )}
                <CareNotice>
                  The recipient verifies their identity and accepts this client
                  connection. An invitation alone does not grant access.
                </CareNotice>
              </>
            )}
            {modal.kind === "relationship" && (
              <>
                <p>
                  <strong>{modal.target.name}</strong> ·{" "}
                  {careLabel(modal.target.state)}
                </p>
                <label className="ac-field">
                  <span>Action</span>
                  <select
                    value={action}
                    onChange={(event) =>
                      setAction(event.target.value as typeof action)
                    }
                  >
                    {modal.target.allowedActions?.map((value) => (
                      <option value={value} key={value}>
                        {value === "expire"
                          ? "Expire connection now"
                          : `${careLabel(value)} connection`}
                      </option>
                    ))}
                  </select>
                </label>
                <CareNotice>
                  Revoked or expired connections require a fresh invitation and new
                  client grants. Previous history does not restore access
                  automatically.
                </CareNotice>
              </>
            )}
            {modal.kind === "grant" && (
              <>
                {members.loading ? (
                  <CareLoad rows={1} />
                ) : members.error ? (
                  <CareFailure message={members.error} onRetry={members.reload} />
                ) : (
                  <>
                    <label className="ac-field">
                      <span>Current organization member</span>
                      <select
                        required
                        disabled={Boolean(modal.target)}
                        value={uid}
                        onChange={(event) => {
                          const member = members.data?.items.find(
                            (item) => item.uid === event.target.value,
                          );
                          setUid(event.target.value);
                          setSelectedMember(member || null);
                          setCapabilities((current) =>
                            current.filter((value) =>
                              (
                                member?.allowedCapabilities || [
                                  "view",
                                  "send",
                                  "submit",
                                ]
                              ).includes(value),
                            ),
                          );
                        }}
                      >
                        <option value="">Choose a permitted member</option>
                        {uid &&
                          !members.data?.items.some((member) => member.uid === uid) && (
                            <option value={uid}>
                              {selectedMember?.name || modal.target?.name || uid}
                              {selectedMember
                                ? ` · ${selectedMember.email || selectedMember.role || uid}`
                                : modal.target?.name
                                  ? ` · ${uid}`
                                  : ""}
                            </option>
                          )}
                        {members.data?.items.map((member) => (
                          <option key={member.uid} value={member.uid}>
                            {member.name} · {member.email || member.role}
                          </option>
                        ))}
                      </select>
                      <small>
                        Current membership and the permitted client capabilities are
                        verified before assignment.
                      </small>
                    </label>
                    <CarePager
                      cursor={members.data?.nextCursor}
                      disabled={mutation.saving}
                      onNext={(value) => {
                        const member = members.data?.items.find(
                          (item) => item.uid === uid,
                        );
                        if (member) setSelectedMember(member);
                        setMemberCursor(value);
                      }}
                    />
                  </>
                )}
                <fieldset>
                  <legend>Client capabilities</legend>
                  <div className="ac-check-list">
                    {(
                      members.data?.items.find((member) => member.uid === uid)
                        ?.allowedCapabilities ||
                      selectedMember?.allowedCapabilities || ["view", "send", "submit"]
                    ).map((value) => (
                      <label key={value}>
                        <input
                          type="checkbox"
                          checked={capabilities.includes(value)}
                          onChange={(event) =>
                            setCapabilities((current) =>
                              event.target.checked
                                ? [...current, value]
                                : current.filter((item) => item !== value),
                            )
                          }
                        />
                        {careLabel(value)}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <CareNotice>
                  Only capabilities within your own management authority can be
                  assigned. Rejoining members require fresh grants.
                </CareNotice>
              </>
            )}
            {modal.kind === "source" && (
              <>
                {modal.target ? (
                  <dl className="ac-details">
                    <dt>Care client</dt>
                    <dd>{network.client.name}</dd>
                    <dt>Existing destination client</dt>
                    <dd>{modal.target.clientName || modal.target.clientId}</dd>
                    <dt>Programs</dt>
                    <dd>{modal.target.programs.join(", ")}</dd>
                    <dt>Connection state</dt>
                    <dd>{careLabel(modal.target.state)}</dd>
                  </dl>
                ) : organization.kind === "internal" ? (
                  <>
                    <div className="ac-actions">
                      <label className="ac-field">
                        <span>Find your existing client record</span>
                        <Input
                          value={queryInput}
                          onChange={(event) => setQueryInput(event.target.value)}
                          maxLength={80}
                        />
                      </label>
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setQuery(queryInput.trim())}
                        disabled={queryInput.trim().length < 2}
                      >
                        Search
                      </Button>
                    </div>
                    {localClients.loading ? (
                      <CareLoad rows={1} />
                    ) : localClients.error ? (
                      <CareFailure
                        message={localClients.error}
                        onRetry={localClients.reload}
                      />
                    ) : (
                      <label className="ac-field">
                        <span>Existing client record</span>
                        <select
                          required
                          value={clientId}
                          onChange={(event) => setClientId(event.target.value)}
                        >
                          <option value="">Select a record</option>
                          {localClients.data?.map((client) => (
                            <option key={client.id} value={client.id}>
                              {[client.firstName, client.lastName]
                                .filter(Boolean)
                                .join(" ")}{" "}
                              · {(client.servicePrograms || []).join(", ")}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <fieldset>
                      <legend>Programs to confirm</legend>
                      <div className="ac-check-list">
                        {["ddd", "hha"].map((value) => (
                          <label key={value}>
                            <input
                              type="checkbox"
                              checked={programs.includes(value)}
                              onChange={(event) =>
                                setPrograms((current) =>
                                  event.target.checked
                                    ? [...current, value]
                                    : current.filter((item) => item !== value),
                                )
                              }
                            />
                            {value.toUpperCase()}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </>
                ) : (
                  <CareNotice>
                    An external care organization can participate without an
                    operational client record.
                  </CareNotice>
                )}
                <label className="ac-check">
                  <input
                    type="checkbox"
                    required
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                  />
                  <span>
                    {modal.target?.state === "confirmed"
                      ? "I confirm withdrawal of this destination connection. Existing publication receipts remain in history."
                      : "I verified that these records refer to the same individual. The other agency must confirm before publication."}
                  </span>
                </label>
              </>
            )}
            {(modal.kind === "relationship" ||
              modal.kind === "grant" ||
              (modal.kind === "source" && modal.target?.state === "confirmed")) && (
                <label className="ac-field">
                  <span>Reason{modal.kind === "grant" ? " (optional)" : ""}</span>
                  <Textarea
                    required={modal.kind !== "grant"}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={2000}
                  />
                </label>
              )}
            {(formError || mutation.error) && (
              <CareNotice danger>{formError || mutation.error}</CareNotice>
            )}
          </fieldset>
        </div>
        <div className="ac-dialog-footer">
          <Button
            type="button"
            variant="outline"
            disabled={mutation.saving}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            aria-busy={mutation.saving}
            disabled={
              mutation.saving ||
              mutation.uncertain ||
              (modal.kind === "grant" &&
                (members.loading || Boolean(members.error) || !uid)) ||
              (modal.kind === "source" &&
                !modal.target &&
                organization.kind === "external")
            }
          >
            {mutation.saving && <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />}
            {mutation.saving
              ? modal.kind === "invite" ? "Sending invitation…" : "Saving…"
              : modal.kind === "invite"
                ? "Send invitation"
                : modal.kind === "source" && modal.target?.state === "confirmed"
                  ? "Withdraw connection"
                  : "Confirm"}
          </Button>
        </div>
      </form>
    </CareFormDialog>
  );
}
