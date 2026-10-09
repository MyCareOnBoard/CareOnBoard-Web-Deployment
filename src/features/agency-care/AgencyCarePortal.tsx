import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { ClipboardCheck, Download, FileText, LoaderCircle, Mail, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/utils/auth/context/AuthContext";
import { AgencyCareRegistrationForm } from "@/utils/auth/components/AgencyCareRegistrationForm";
import { AgencyCareEmailVerification } from "@/utils/auth/components/AgencyCareEmailVerification";
import {
  agencyCareApi,
  type CareExternalProfile,
  type CareMember,
  type CareSubmission,
  type CarePage,
  type CareInvitation,
} from "@/lib/api/agencyCare";
import { useAgencyCare } from "./AgencyCareLayout";
import { hasCapability, useScopedMutation, useScopedRequest } from "./hooks";
import {
  CareButton as Button,
  CareAvatar,
  CarePerson,
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
import "./agency-care.css";

function SubmissionQueue({ recovery = false }: { recovery?: boolean }) {
  const { scope, agencyKey } = useAgencyCare();
  const [cursor, setCursor] = useState("");
  const list = useScopedRequest(
    `${scope}|${recovery ? "recovery" : "review"}|${cursor}`,
    (signal) =>
      recovery
        ? agencyCareApi.recovery({ agencyKey, cursor, signal })
        : agencyCareApi.reviewQueue({ agencyKey, cursor, signal }),
  );
  const destination = (item: CareSubmission) =>
    `/agency-care/networks/${encodeURIComponent(item.networkId)}/${item.kind === "document" ? "documents" : "updates"}?submission=${encodeURIComponent(item.id)}`;
  return (
    <div className="ac-stack">
      <CareHeading
        title={recovery ? "Publication recovery" : "Review queue"}
        description={
          recovery
            ? "Resolve failed or withheld destinations while retaining successful publication receipts."
            : "Review the exact current submitted version for clients within your current authority."
        }
      />
      {list.loading ? (
        <CareLoad />
      ) : list.error ? (
        <CareFailure message={list.error} onRetry={list.reload} />
      ) : (
        <>
          <CarePanel
            title={
              recovery
                ? "Destinations needing attention"
                : "Awaiting your review"
            }
          >
            {list.data?.items.length ? (
              <ul className="ac-list">
                {list.data.items.map((item) => (
                  <li key={item.id}>
                    <div className="ac-row-main">
                      <span className="ac-row-icon" aria-hidden="true">{item.kind === "document" ? <FileText size={18} /> : <ClipboardCheck size={18} />}</span>
                      <div className="ac-row-copy">
                      <strong>{item.title}</strong>
                      <div className="ac-actions ac-row-meta">
                        <CareStatus>{careLabel(item.reviewStatus)}</CareStatus>
                        <small>Publication: {careLabel(item.syncStatus || "not_required")}</small>
                      </div>
                      </div>
                    </div>
                    <Button asChild variant="outline">
                      <Link to={destination(item)}>
                        {recovery
                          ? "Review destination status"
                          : "Review submission"}
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <CareEmpty
                title={
                  recovery
                    ? "No visible publication issues"
                    : "No submissions awaiting your review"
                }
              >
                {recovery
                  ? "Currently authorized publication exceptions appear here."
                  : "A new submission becomes reviewable immediately after it is submitted."}
              </CareEmpty>
            )}
          </CarePanel>
          <CarePager cursor={list.data?.nextCursor} onNext={setCursor} />
        </>
      )}
    </div>
  );
}
export function AgencyCareReviewQueue() {
  return <SubmissionQueue />;
}
export function AgencyCareRecovery() {
  return <SubmissionQueue recovery />;
}

export function AgencyCareReports() {
  const { scope, agencyKey } = useAgencyCare();
  const [cursor, setCursor] = useState("");
  const report = useScopedRequest(`${scope}|reports|${cursor}`, (signal) =>
    agencyCareApi.reports({ agencyKey, cursor, signal }),
  );
  function exportRows() {
    if (!report.data) return;
    const cell = (value: unknown) => {
      const text = String(value ?? "");
      return `"${(/^[=+\-@]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
    };
    const rows = [
      [
        "Client",
        "Active agencies",
        "Pending review",
        "Publication actions",
        "Revision requests",
        "Rejections",
        "Invitations accepted",
        "Invitations issued",
        "Average review hours",
        "Review sample size",
        "Unresolved monitoring actions",
      ],
      ...report.data.items.map((item) => [
        item.clientName,
        item.activeAgencies,
        item.pendingReviewCount,
        item.publicationActionCount,
        item.revisionCount,
        item.rejectionCount,
        item.invitationAcceptance?.accepted,
        item.invitationAcceptance?.issued,
        item.reviewTurnaround?.averageHours,
        item.reviewTurnaround?.sampleSize,
        item.unresolvedMonitoringActions,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.map((row) => row.map(cell).join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "agency-care-displayed-rows.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="ac-stack">
      <CareHeading
        title="Care reports"
        description="Review coordination and publication across your connected clients."
        actions={
          report.data && (
            <Button variant="outline" onClick={exportRows}>
              <Download size={16} aria-hidden="true" />
              Export displayed rows
            </Button>
          )
        }
      />
      {report.loading ? (
        <CareLoad />
      ) : report.error ? (
        <CareFailure message={report.error} onRetry={report.reload} />
      ) : (
        <>
          <CarePanel title="Client care summary">
            {report.data?.items.length ? (
              <div className="ac-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Active agencies</th>
                      <th>Pending review</th>
                      <th>Publication actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.data.items.map((item) => (
                      <tr key={item.networkId}>
                        <td>
                          <div className="ac-row-main">
                            <CareAvatar size="sm" name={item.clientName} />
                            <Link to={`/agency-care/networks/${encodeURIComponent(item.networkId)}/overview`}>
                              {item.clientName}
                            </Link>
                          </div>
                        </td>
                        <td>{item.activeAgencies}</td>
                        <td>{item.pendingReviewCount}</td>
                        <td>
                          {item.publicationActionCount ?? "Not available"}
                          <details className="ac-report-details">
                            <summary>More coordination metrics</summary>
                            <dl className="ac-details">
                              <dt>Revision requests</dt>
                              <dd>{item.revisionCount ?? "Not available"}</dd>
                              <dt>Rejections</dt>
                              <dd>{item.rejectionCount ?? "Not available"}</dd>
                              <dt>Invitation acceptance</dt>
                              <dd>
                                {item.invitationAcceptance
                                  ? `${item.invitationAcceptance.accepted} accepted of ${item.invitationAcceptance.issued} invitation records (includes resends)`
                                  : "Not available"}
                              </dd>
                              <dt>Review turnaround</dt>
                              <dd>
                                {item.reviewTurnaround?.averageHours != null
                                  ? `${item.reviewTurnaround.averageHours.toFixed(1)} hours average · ${item.reviewTurnaround.sampleSize} latest approved versions (up to 50)`
                                  : "No available review sample"}
                              </dd>
                              <dt>Unresolved monitoring actions</dt>
                              <dd>
                                {item.unresolvedMonitoringActions ??
                                  "Not available"}
                              </dd>
                            </dl>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <CareEmpty title="No report rows available">
                This report includes only clients you may currently access.
              </CareEmpty>
            )}
          </CarePanel>
          <CarePager cursor={report.data?.nextCursor} onNext={setCursor} />
        </>
      )}
    </div>
  );
}

export function AgencyCareSettings() {
  const { organization, scope, agencyKey } = useAgencyCare();
  const [tab, setTab] = useState("profile");
  const profile = useScopedRequest(
    `${scope}|profile`,
    (signal) =>
      agencyCareApi.externalProfile(organization.id, { agencyKey, signal }),
    organization.kind === "external",
  );
  if (organization.kind !== "external")
    return (
      <div className="ac-stack">
      <CareHeading title="Agency settings" description={organization.name} />
      <CareNotice>
        Manage your existing agency profile through its current agency panel.
      </CareNotice>
      </div>
    );
  return (
    <div className="ac-stack">
      <CareHeading
        title="Agency settings"
        description={`${organization.name} · Limited care organization`}
      />
      <nav className="ac-subtabs" aria-label="Agency settings views">
        <Button
          aria-current={tab === "profile" ? "page" : undefined}
          variant={tab === "profile" ? "default" : "outline"}
          onClick={() => setTab("profile")}
        >
          Agency profile
        </Button>
        <Button
          aria-current={tab === "members" ? "page" : undefined}
          variant={tab === "members" ? "default" : "outline"}
          onClick={() => setTab("members")}
        >
          Members
        </Button>
        <Button
          aria-current={tab === "invitations" ? "page" : undefined}
          variant={tab === "invitations" ? "default" : "outline"}
          onClick={() => setTab("invitations")}
        >
          Member invitations
        </Button>
      </nav>
      {profile.loading ? (
        <CareLoad />
      ) : profile.error ? (
        <CareFailure message={profile.error} onRetry={profile.reload} />
      ) : (
        profile.data &&
        (tab === "profile" ? (
          <ExternalProfileForm
            profile={profile.data}
            onSaved={profile.reload}
          />
        ) : (
          <ExternalMembers
            key={tab}
            profile={profile.data}
            invitations={tab === "invitations"}
          />
        ))
      )}
    </div>
  );
}
function ExternalProfileForm({
  profile,
  onSaved,
}: {
  profile: CareExternalProfile;
  onSaved: () => void;
}) {
  const { scope, organization, agencyKey } = useAgencyCare();
  const [values, setValues] = useState({
    name: profile.name,
    email: profile.email || "",
    phone: profile.phone || "",
    contactName: profile.contactName || "",
    services: (profile.serviceTypes || []).join("\n"),
  });
  const [formError, setFormError] = useState("");
  const mutation = useScopedMutation(`${scope}|profile|${profile.revision}`);
  const canEdit = hasCapability(profile, "manage");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const serviceTypes = [
      ...new Set(
        values.services
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];
    if (
      serviceTypes.length > 20 ||
      serviceTypes.some((value) => value.length > 80)
    ) {
      setFormError(
        "Enter up to 20 services, with at most 80 characters per service.",
      );
      return;
    }
    const result = await mutation.run((operationId, signal) =>
      agencyCareApi.updateExternalProfile(
        organization.id,
        {
          name: values.name.trim(),
          contactName: values.contactName.trim(),
          ...(values.email.trim() ? { email: values.email.trim() } : {}),
          phone: values.phone.trim(),
          serviceTypes,
          expectedRevision: profile.revision,
          operationId,
        },
        { agencyKey, signal },
      ),
      { title: "Organization profile updated" },
    );
    if (result) onSaved();
  }
  return (
    <form className="ac-stack" onSubmit={(event) => void save(event)}>
      <CarePanel title="Organization profile">
        <div className="ac-form-grid">
          {Object.entries({
            name: "Agency name",
            contactName: "Primary contact",
            email: "Office email",
            phone: "Office phone",
          }).map(([key, label]) => (
            <label className="ac-field" key={key}>
              <span>{label}</span>
              <Input
                required={key === "name"}
                disabled={!canEdit}
                type={
                  key === "email" ? "email" : key === "phone" ? "tel" : "text"
                }
                value={values[key as keyof typeof values]}
                maxLength={key === "phone" ? 40 : key === "email" ? 254 : 200}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
              />
            </label>
          ))}
        </div>
        <label className="ac-field">
          <span>Services provided</span>
          <Textarea
            disabled={!canEdit}
            value={values.services}
            maxLength={2000}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                services: event.target.value,
              }))
            }
          />
          <small>
            One service per line · Up to 20 services, 80 characters each
          </small>
        </label>
      </CarePanel>
      {formError && <CareNotice danger>{formError}</CareNotice>}
      <CarePanel title="Profile status">
        <dl className="ac-details">
          <dt>Organization verification</dt>
          <dd>
            <CareStatus>{careLabel(profile.verificationStatus)}</CareStatus>
          </dd>
          <dt>Account access</dt>
          <dd>Agency Care only</dd>
        </dl>
        <p className="ac-muted">
          Invitation acceptance and organization verification are separate.
          Verification status is managed by authorized reviewers.
        </p>
      </CarePanel>
      {mutation.error && (
        <CareFailure
          message={mutation.error}
          onRetry={() => {
            onSaved();
            mutation.reset();
          }}
        />
      )}
      {canEdit && (
        <div className="ac-form-actions">
        <Button type="submit" disabled={mutation.saving || mutation.uncertain}>
          {mutation.saving && <LoaderCircle size={16} aria-hidden="true" className="motion-safe:animate-spin" />}
          {mutation.saving ? "Saving profile…" : "Save profile changes"}
        </Button>
        </div>
      )}
    </form>
  );
}
function ExternalMembers({
  profile,
  invitations,
}: {
  profile: CareExternalProfile;
  invitations: boolean;
}) {
  const { scope, organization, agencyKey } = useAgencyCare();
  const [cursor, setCursor] = useState("");
  const [invite, setInvite] = useState(false);
  const [remove, setRemove] = useState<CareMember | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "administrator">("member");
  const [reason, setReason] = useState("");
  const list = useScopedRequest<CarePage<CareInvitation | CareMember>>(
    `${scope}|members|${invitations}|${cursor}`,
    (signal) =>
      invitations
        ? agencyCareApi.memberInvitations(organization.id, {
            agencyKey,
            cursor,
            signal,
          })
        : agencyCareApi.members(organization.id, { agencyKey, cursor, signal }),
  );
  const mutation = useScopedMutation(`${scope}|members`);
  const canManage = hasCapability(profile, "manage");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (remove && !reason.trim()) return;
    const result = await mutation.run((operationId, signal) =>
      remove
        ? agencyCareApi.removeMember(
            organization.id,
            remove.uid,
            {
              operationId,
              reason: reason.trim(),
              expectedRevision: remove.revision ?? 0,
            },
            { agencyKey, signal },
          )
        : agencyCareApi.inviteMember(
            organization.id,
            { name: name.trim(), email: email.trim(), role, operationId },
            { agencyKey, signal },
          ),
      remove
        ? { title: "Member removed" }
        : {
            title: "Member invitation created",
            description: "Delivery is queued. Membership begins after the invitation is accepted.",
          },
    );
    if (result) {
      setInvite(false);
      setRemove(null);
      list.reload();
    }
  }
  return (
    <div className="ac-stack">
      <CareNotice>
        Membership alone grants no client access. Newly joined or rejoining
        members require fresh client assignments.
      </CareNotice>
      <CarePanel
        title={invitations ? "Member invitations" : "Agency members"}
        actions={
          canManage && (
            <Button onClick={() => setInvite(true)}><Plus size={16} aria-hidden="true" />Invite member</Button>
          )
        }
      >
        {list.loading ? (
          <CareLoad rows={2} />
        ) : list.error ? (
          <CareFailure message={list.error} onRetry={list.reload} />
        ) : (
          <>
            <ul className="ac-list">
              {list.data?.items.map((item) => {
                if (invitations) {
                  const entry = item as CareInvitation;
                  return (
                    <li key={entry.id}>
                      <div className="ac-row-main">
                        <span className="ac-row-icon" aria-hidden="true"><Mail size={18} /></span>
                        <div className="ac-row-copy">
                        <strong>
                          {entry.recipientEmail || "Invited member"}
                        </strong>
                        <p>
                          {careLabel(entry.status)} · Expires{" "}
                          {careDate(entry.expiresAt)}
                        </p>
                        <CareInvitationDelivery
                          delivery={entry.delivery}
                          showResendHint={
                            canManage && entry.status === "pending"
                          }
                        />
                        </div>
                      </div>
                      {canManage && entry.status === "pending" && (
                        <div className="ac-actions">
                          {(["resend", "revoke"] as const).map((action) => (
                            <Button
                              key={action}
                              variant="outline"
                              disabled={mutation.saving || mutation.uncertain}
                              onClick={async () => {
                                if (
                                  await mutation.run((operationId, signal) =>
                                    agencyCareApi.invitationAction(
                                      entry.id,
                                      action,
                                      {
                                        operationId,
                                        expectedRevision: entry.revision,
                                      },
                                      { agencyKey, signal },
                                    ),
                                    action === "resend"
                                      ? {
                                          title: "Replacement invitation created",
                                          description: "Delivery is queued. The previous invitation is no longer valid.",
                                        }
                                      : { title: "Invitation revoked" },
                                  )
                                )
                                  list.reload();
                              }}
                            >
                              {careLabel(action)}
                            </Button>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                }
                const entry = item as CareMember;
                return (
                  <li key={entry.uid}>
                    <CarePerson name={entry.name} detail={entry.email} />
                    <CareStatus tone="neutral">{careLabel(entry.role || "member")}</CareStatus>
                    <CareStatus>{entry.status || "active"}</CareStatus>
                    {entry.lastAdministrator ? (
                      <small>Last active administrator</small>
                    ) : (
                      canManage &&
                      (entry.status === "active" || !entry.status) && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setRemove(entry);
                            setReason("");
                          }}
                        >
                          Remove membership
                        </Button>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
            {!list.data?.items.length && (
              <CareEmpty title="No entries in this view">
                Current members or pending member invitations appear here.
              </CareEmpty>
            )}
            <CarePager cursor={list.data?.nextCursor} onNext={setCursor} />
          </>
        )}
      </CarePanel>
      <CareFormDialog
      className="ac-form-dialog"
        open={invite || Boolean(remove)}
        title={
          remove
            ? "Remove organization membership"
            : "Invite an organization member"
        }
        description={organization.name}
        onClose={() => {
          setInvite(false);
          setRemove(null);
        }}
        busy={mutation.saving}
      >
        <form className="ac-dialog-form" onSubmit={(event) => void save(event)}>
        <fieldset className="ac-dialog-body ac-stack" disabled={mutation.saving}>
          {remove ? (
            <>
              <CareNotice>
                Removing {remove.name} deactivates their effective client
                grants. Rejoining will require fresh grants.
              </CareNotice>
              <label className="ac-field">
                <span>Reason</span>
                <Textarea
                  required
                  value={reason}
                  maxLength={2000}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <label className="ac-field">
                <span>Full name</span>
                <Input
                  required
                  value={name}
                  maxLength={120}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="ac-field">
                <span>Work email</span>
                <Input
                  required
                  type="email"
                  value={email}
                  maxLength={254}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="ac-field">
                <span>Organization role</span>
                <select
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value as typeof role)
                  }
                >
                  <option value="member">Care team member</option>
                  <option value="administrator">Administrator</option>
                </select>
              </label>
              <CareNotice>
                This invitation includes no client access.
              </CareNotice>
            </>
          )}
          {mutation.error && <CareNotice danger>{mutation.error}</CareNotice>}
        </fieldset>
        <div className="ac-dialog-footer">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setInvite(false);
                setRemove(null);
              }}
              disabled={mutation.saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.saving || mutation.uncertain}
            >
              {mutation.saving && <LoaderCircle size={16} aria-hidden="true" className="motion-safe:animate-spin" />}
              {mutation.saving ? "Saving…" : remove ? "Remove membership" : "Send member invitation"}
            </Button>
          </div>
        </form>
      </CareFormDialog>
    </div>
  );
}

export function AgencyCareInvitationPage() {
  const { token = "" } = useParams();
  const [search] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agencyKey, setAgencyKey] = useState(search.get("agencyKey") || "");
  const [confirmed, setConfirmed] = useState(false);
  const [registration, setRegistration] = useState(
    search.get("intent") === "register",
  );
  const [declined, setDeclined] = useState(false);
  const me = useScopedRequest(
    `${user?.uid}|invite-membership`,
    (signal) => agencyCareApi.me({ signal }),
    Boolean(user?.uid && user.emailVerified),
  );
  const selected = agencyKey || me.data?.organizations[0]?.agencyKey || "";
  const scope = `${user?.uid ?? "public"}|${token}|${selected}`;
  const preview = useScopedRequest(
    scope,
    (signal) =>
      agencyCareApi.invitationPreview(
        token,
        { agencyKey: selected, signal },
        !user?.uid,
      ),
    Boolean(token) && (!user || user.emailVerified),
  );
  const mutation = useScopedMutation(scope);
  const memberInvitation = preview.data?.purpose === "organization_member";
  const internalInvitation = preview.data?.recipientMode === "agency_administrators";
  useEffect(() => {
    const target = preview.data?.agencyKey;
    if (internalInvitation && target && !agencyKey &&
        me.data?.organizations.some((item) => item.agencyKey === target)) {
      setAgencyKey(target);
      setConfirmed(false);
    }
  }, [internalInvitation, preview.data?.agencyKey, agencyKey, me.data]);
  useEffect(() => {
    setAgencyKey(search.get("agencyKey") || "");
    setConfirmed(false);
    setRegistration(search.get("intent") === "register");
    setDeclined(false);
  }, [user?.uid, token, search]);
  useEffect(() => {
    const previous = document.querySelector<HTMLMetaElement>(
      'meta[name="referrer"]',
    );
    const meta = previous || document.createElement("meta");
    const old = meta.content;
    meta.name = "referrer";
    meta.content = "no-referrer";
    if (!previous) document.head.appendChild(meta);
    return () => {
      if (previous) meta.content = old;
      else meta.remove();
    };
  }, []);
  async function accept() {
    if (!confirmed || (!memberInvitation && !selected)) return;
    const result = await mutation.run((operationId, signal) =>
      agencyCareApi.invitationAccept(token, operationId, {
        agencyKey: memberInvitation ? undefined : selected,
        signal,
      }),
      { title: "Invitation accepted" },
    );
    if (result) {
      const acceptedOrganization =
        result.agencyKey ||
        (result.externalAgencyId
          ? `external:${result.externalAgencyId}`
          : selected);
      const destination = result.networkId
        ? `/agency-care/networks/${encodeURIComponent(result.networkId)}/overview`
        : "/agency-care";
      navigate(
        `${destination}${acceptedOrganization ? `?agencyKey=${encodeURIComponent(acceptedOrganization)}` : ""}`,
        { replace: true },
      );
    }
  }
  async function decline() {
    const result = await mutation.run((operationId, signal) =>
      agencyCareApi.invitationDecline(token, operationId, {
        agencyKey: memberInvitation ? undefined : selected,
        signal,
      }),
      { title: "Invitation declined" },
    );
    if (result) {
      setDeclined(true);
      navigate("/agency-care", { replace: true });
    }
  }
  const returnTo = `/agency-care/invitations/${encodeURIComponent(token)}${selected ? `?agencyKey=${encodeURIComponent(selected)}` : ""}`;
  return (
    <main className="agency-care ac-invitation">
      <CareHeading
        title="Agency Care invitation"
        description="Verify your identity before reviewing the intended client connection."
      />
      {user && !user.emailVerified ? (
        <AgencyCareEmailVerification
          key={user.uid}
          onVerified={() => {
            me.reload();
            preview.reload();
          }}
        />
      ) : preview.loading ? (
        <CareLoad rows={2} />
      ) : preview.error ? (
        <CareFailure
          message="This invitation is unavailable. Request a fresh invitation from the sender."
          onRetry={preview.reload}
        />
      ) : (
        preview.data && (
          <>
            {declined ? (
              <CareNotice>
                You declined the invitation. No client access was added.
              </CareNotice>
            ) : preview.data.status !== "pending" ? (
              <CareNotice>
                This invitation is{" "}
                {careLabel(preview.data.status).toLowerCase()}. Use your current
                workspace or request a fresh invitation.
              </CareNotice>
            ) : registration && !internalInvitation ? (
              <AgencyCareRegistrationForm
                token={token}
                needsOrganization={
                  preview.data.purpose === "client_connection" &&
                  (preview.data.requiresOrganizationRegistration === true ||
                    !user)
                }
                onRegistered={() => {
                  setRegistration(false);
                  me.reload();
                  preview.reload();
                }}
              />
            ) : !user ? (
              <CarePanel title="Continue securely">
                <p>
                  {internalInvitation
                    ? "Sign in with the invited agency's administrator account to review this connection."
                    : "Sign in with the intended recipient’s account to see the invitation details."}
                </p>
                <div className="ac-actions">
                  <Button asChild>
                    <Link
                      to={`/auth/login?returnTo=${encodeURIComponent(returnTo)}`}
                    >
                      Sign in
                    </Link>
                  </Button>
                  {!internalInvitation && <Button
                    variant="outline"
                    onClick={() => setRegistration(true)}
                  >
                    Create an Agency Care account
                  </Button>}
                </div>
              </CarePanel>
            ) : (
              <CarePanel
                title={
                  preview.data.purpose === "organization_member"
                    ? "Join the care organization"
                    : "Confirm client participation"
                }
              >
                {preview.data.client && (
                  <p>
                    <strong>Client:</strong> {preview.data.client.name}
                  </p>
                )}
                {preview.data.organization && (
                  <p>
                    <strong>Organization:</strong>{" "}
                    {preview.data.organization.name}
                  </p>
                )}
                {me.loading ? (
                  <CareLoad rows={1} />
                ) : memberInvitation && preview.data.canAccept ? (
                  <CareNotice>
                    Accept this organization membership as your existing
                    verified user. No client access is included.
                  </CareNotice>
                ) : memberInvitation ? (
                  <CareNotice>
                    Review the membership terms using your existing verified
                    account before accepting this organization invitation.
                    <Button onClick={() => setRegistration(true)}>
                      Review membership terms
                    </Button>
                  </CareNotice>
                ) : me.data?.organizations.length ? (
                  <label className="ac-field">
                    <span>Organization you represent</span>
                    <select
                      value={selected}
                      onChange={(event) => {
                        setAgencyKey(event.target.value);
                        setConfirmed(false);
                      }}
                    >
                      {me.data.organizations.map((item) => (
                        <option key={item.agencyKey} value={item.agencyKey}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : internalInvitation ? (
                  <CareNotice>
                    This invitation is for an existing CareOnBoard agency. Sign
                    in with its administrator account to review the connection.
                  </CareNotice>
                ) : (
                  <CareNotice>
                    Complete invitation-bound account registration before
                    accepting.
                    <Button onClick={() => setRegistration(true)}>
                      Complete care registration
                    </Button>
                  </CareNotice>
                )}
                <label className="ac-check">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                  />
                  <span>
                    {memberInvitation
                      ? "I verified the invitation and agree to join the named care organization."
                      : "I verified this invitation and am authorized to represent the selected organization."}
                  </span>
                </label>
                <CareNotice>
                  {preview.data.purpose === "organization_member"
                    ? "Joining gives no automatic client grant."
                    : "Joining the care workspace does not create or merge an operational client record. A source-record link requires separate confirmation."}
                </CareNotice>
                <div className="ac-form-actions">
                  <Button
                    variant="outline"
                    disabled={
                      mutation.saving ||
                      mutation.uncertain ||
                      (internalInvitation && preview.data.canAccept !== true) ||
                      (!memberInvitation && !selected)
                    }
                    onClick={() => void decline()}
                  >
                    Decline invitation
                  </Button>
                  <Button
                    disabled={
                      !confirmed ||
                      (!memberInvitation && !selected) ||
                      preview.data.canAccept !== true ||
                      mutation.saving ||
                      mutation.uncertain
                    }
                    onClick={() => void accept()}
                  >
                    Accept invitation
                  </Button>
                </div>
                {mutation.error && (
                  <CareNotice danger>{mutation.error}</CareNotice>
                )}
              </CarePanel>
            )}
          </>
        )
      )}
    </main>
  );
}
