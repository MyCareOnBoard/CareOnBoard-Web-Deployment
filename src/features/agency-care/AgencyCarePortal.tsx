import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { BarChart3, ClipboardCheck, Download, FileText, Hourglass, LoaderCircle, Mail, MailCheck, Plus, RotateCcw, Undo2, Users } from "lucide-react";
import { AgencyPanel, AgencyProgressBar, AgencyStatCard } from "@/components/agency/AgencyShell";
import { AgencyListCard, AgencyPerson, AgencyPill, AgencySegmented, agencyOutlineButton, agencyPrimaryButton, agencyTd, agencyTh, agencyTheadRow, agencyTr } from "@/components/agency/AgencyListKit";
import { cn } from "@/lib/utils";
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
  type CarePublicationOperation,
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
  CarePill,
  CareStatus,
  careDate,
  careLabel,
} from "./ui";
import "./agency-care.css";

const submissionLink = (item: CareSubmission) =>
  `/agency-care/networks/${encodeURIComponent(item.networkId)}/${item.kind === "document" ? "documents" : "updates"}?submission=${encodeURIComponent(item.id)}`;
const rowLink = "inline-flex items-center gap-1 text-[14px] font-medium text-[#007679] hover:text-[#005c5e] dark:text-[#7fd3d3]";
const detailRow = "flex items-center justify-between gap-4 px-3.5 py-2.5 text-[14px]";
const destinationProblem = (operation: CarePublicationOperation) => /failed|withheld|rejected|unavailable/i.test(operation.status);

function useSubmissionPage(kind: "review" | "recovery") {
  const { scope, agencyKey } = useAgencyCare();
  const [cursor, setCursor] = useState("");
  const list = useScopedRequest(
    `${scope}|${kind}|${cursor}`,
    (signal) =>
      kind === "recovery"
        ? agencyCareApi.recovery({ agencyKey, cursor, signal })
        : agencyCareApi.reviewQueue({ agencyKey, cursor, signal }),
  );
  return { list, setCursor };
}

/** Review queue: the waiting submissions on the left, the selected one's details and preview on the right. */
export function AgencyCareReviewQueue() {
  const { list, setCursor } = useSubmissionPage("review");
  const [tab, setTab] = useState<"document" | "care_update">("care_update");
  const [selectedId, setSelectedId] = useState("");
  const items = list.data?.items ?? [];
  const counts = { document: items.filter((item) => item.kind === "document").length, care_update: items.filter((item) => item.kind === "care_update").length };
  // Open on the tab that has work when the other one is empty.
  const activeTab = counts[tab] === 0 && counts[tab === "document" ? "care_update" : "document"] > 0 ? (tab === "document" ? "care_update" : "document") : tab;
  const shown = items.filter((item) => item.kind === activeTab);
  const selected = shown.find((item) => item.id === selectedId) ?? shown[0];
  const version = selected?.currentVersion;
  return (
    <div className="flex flex-col gap-6">
      <CareHeading
        icon={ClipboardCheck}
        title="Review queue"
        description="Documents and care updates waiting for a reviewer before they publish to the family portal."
      />
      {list.loading ? (
        <CareLoad />
      ) : list.error ? (
        <CareFailure message={list.error} onRetry={list.reload} />
      ) : items.length ? (
        <>
          <AgencySegmented label="Submission type" value={activeTab} onChange={(value) => { setTab(value); setSelectedId(""); }} className="self-start"
            options={[{ value: "document", label: "Documents", count: counts.document }, { value: "care_update", label: "Updates", count: counts.care_update }]} />
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
            <AgencyListCard label="Awaiting your review">
              <ul>
                {shown.map((item) => {
                  const on = item.id === selected?.id;
                  return (
                    <li key={item.id} className="border-b border-[#eceef0] last:border-b-0 dark:border-white/10">
                      <button type="button" aria-pressed={on} onClick={() => setSelectedId(item.id)}
                        className={cn("flex min-h-0 w-full cursor-pointer items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors",
                          on ? "border-[#12b5b0] bg-[#eef8f8] dark:bg-white/5" : "border-transparent hover:bg-[#f8f9fa] dark:hover:bg-white/5")}>
                        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e0f3f3] text-[#005c5e] dark:bg-[#0f7e7d]/20 dark:text-[#7fd3d3]">
                          {item.kind === "document" ? <FileText className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{item.title}</span>
                          <span className="block truncate text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">{careLabel(item.category || item.kind)}{item.createdAt ? ` · Submitted ${careDate(item.createdAt)}` : ""}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </AgencyListCard>
            {selected && (
              <section aria-label={`Selected: ${selected.title}`} className="flex min-w-0 flex-col gap-4 rounded-[16px] border border-[#e4e7ea] bg-white p-5 dark:border-white/10 dark:bg-[#1b232b]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-[20px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{selected.title}</h2>
                  <CarePill>{careLabel(selected.reviewStatus)}</CarePill>
                </div>
                <dl className="divide-y divide-[#eceef0] rounded-[12px] bg-[#f4f5f6] dark:divide-white/10 dark:bg-white/5">
                  <div className={detailRow}><dt className="text-[#5b636b] dark:text-[#9aa4a8]">Type</dt><dd className="text-[#10141a] dark:text-[#f4f6f7]">{selected.kind === "document" ? "Document" : "Care update"}</dd></div>
                  {version?.body?.serviceDate && <div className={detailRow}><dt className="text-[#5b636b] dark:text-[#9aa4a8]">Covers</dt><dd className="text-[#10141a] dark:text-[#f4f6f7]">{version.body.serviceDate}</dd></div>}
                  {version && <div className={detailRow}><dt className="text-[#5b636b] dark:text-[#9aa4a8]">Version</dt><dd className="text-[#10141a] dark:text-[#f4f6f7]">{version.number}</dd></div>}
                  <div className={detailRow}><dt className="text-[#5b636b] dark:text-[#9aa4a8]">Will publish to</dt><dd className="text-right text-[#10141a] dark:text-[#f4f6f7]">{selected.audience.length} {selected.audience.length === 1 ? "agency" : "agencies"}</dd></div>
                </dl>
                {(version?.body?.summary || version?.file) && (
                  <div className="flex flex-col gap-2">
                    <p className="rounded-[8px] bg-[#f4f5f6] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5b636b] dark:bg-white/5 dark:text-[#9aa4a8]">Submitted version</p>
                    <p className="whitespace-pre-wrap rounded-[12px] bg-[#f4f5f6] px-4 py-3 text-[14px] leading-6 text-[#10141a] dark:bg-white/5 dark:text-[#e6eaec]">
                      {version?.body?.summary ?? version?.file?.fileName}
                    </p>
                  </div>
                )}
                <Link to={submissionLink(selected)} className={cn(agencyPrimaryButton, "w-full")}>Open to review</Link>
              </section>
            )}
          </div>
          <CarePager cursor={list.data?.nextCursor} onNext={(next) => { setSelectedId(""); setCursor(next); }} />
        </>
      ) : (
        <AgencyListCard label="Awaiting your review" className="px-5 py-4">
          <CareEmpty title="No submissions awaiting your review">A new submission becomes reviewable immediately after it is submitted.</CareEmpty>
        </AgencyListCard>
      )}
    </div>
  );
}

/** Publication recovery: approved items whose delivery to a destination failed or was withheld. */
export function AgencyCareRecovery() {
  const { list, setCursor } = useSubmissionPage("recovery");
  const items = list.data?.items ?? [];
  return (
    <div className="flex flex-col gap-6">
      <CareHeading
        icon={RotateCcw}
        title="Publication recovery"
        description="Approved updates that could not reach a destination. Open one to fix it and publish again."
      />
      {list.loading ? (
        <CareLoad />
      ) : list.error ? (
        <CareFailure message={list.error} onRetry={list.reload} />
      ) : items.length ? (
        <>
          <AgencyListCard label="Destinations needing attention">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className={agencyTheadRow}>
                    <th scope="col" className={agencyTh}>Update</th>
                    <th scope="col" className={agencyTh}>Destination</th>
                    <th scope="col" className={agencyTh}>Reason</th>
                    <th scope="col" className={agencyTh}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const problems = (item.publicationOperations ?? []).filter(destinationProblem);
                    return (
                      <tr className={agencyTr} key={item.id}>
                        <td className={agencyTd}>
                          <span className="block font-medium">{item.title}</span>
                          <span className="block text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">{careLabel(item.reviewStatus)} · Publication: {careLabel(item.syncStatus || "not_required")}</span>
                        </td>
                        <td className={agencyTd}>
                          {problems.length ? problems.map((operation) => <span key={operation.id} className="block">{operation.destinationName || "Connected agency"}</span>) : "Not available"}
                        </td>
                        <td className={agencyTd}>
                          <div className="flex flex-wrap gap-1.5">
                            {problems.length ? problems.map((operation) => <AgencyPill key={operation.id} tone="red">{careLabel(operation.reason || operation.status)}</AgencyPill>) : <CarePill>{careLabel(item.syncStatus || "not_required")}</CarePill>}
                          </div>
                        </td>
                        <td className={`${agencyTd} text-right`}>
                          <Link to={submissionLink(item)} className={agencyOutlineButton}>Review destination status</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="border-t border-[#eceef0] px-4 py-3 text-[13px] text-[#4b535b] dark:border-white/10 dark:text-[#9aa4a8]">
              {items.length} {items.length === 1 ? "failed publication" : "failed publications"}{list.data?.nextCursor ? " on this page" : ""}
            </p>
          </AgencyListCard>
          <CarePager cursor={list.data?.nextCursor} onNext={setCursor} />
        </>
      ) : (
        <AgencyListCard label="Destinations needing attention" className="px-5 py-4">
          <CareEmpty title="No visible publication issues">Currently authorized publication exceptions appear here.</CareEmpty>
        </AgencyListCard>
      )}
    </div>
  );
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
  const rows = report.data?.items ?? [];
  const sum = (pick: (row: (typeof rows)[number]) => number | null | undefined) => rows.reduce((total, row) => total + (pick(row) ?? 0), 0);
  const samples = sum((row) => row.reviewTurnaround?.averageHours != null ? row.reviewTurnaround.sampleSize : 0);
  const averageHours = samples ? sum((row) => row.reviewTurnaround?.averageHours != null ? row.reviewTurnaround.averageHours * row.reviewTurnaround.sampleSize : 0) / samples : null;
  const issued = sum((row) => row.invitationAcceptance?.issued);
  const accepted = sum((row) => row.invitationAcceptance?.accepted);
  const scopeNote = report.data?.nextCursor ? "Totals cover the clients on this page." : "Totals cover the clients you can access.";
  return (
    <div className="flex flex-col gap-6">
      <CareHeading
        icon={BarChart3}
        title="Reports"
        description="How quickly reviews happen and how care is coordinated across your connected clients."
        actions={
          report.data && (
            <button type="button" className={agencyPrimaryButton} onClick={exportRows}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Export CSV
            </button>
          )
        }
      />
      {report.loading ? (
        <CareLoad />
      ) : report.error ? (
        <CareFailure message={report.error} onRetry={report.reload} />
      ) : (
        <>
          {rows.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <AgencyStatCard icon={Hourglass} label="Average review time" value={averageHours == null ? "—" : `${averageHours < 10 ? averageHours.toFixed(1) : Math.round(averageHours)} h`}
                  footnote={averageHours == null ? "No approved versions to measure yet." : `Submission to approval, ${samples} approved ${samples === 1 ? "version" : "versions"}.`} />
                <AgencyStatCard icon={ClipboardCheck} label="Awaiting review" value={sum((row) => row.pendingReviewCount)} footnote="Submissions waiting for a reviewer." />
                <AgencyStatCard icon={Undo2} label="Returned" value={sum((row) => row.revisionCount) + sum((row) => row.rejectionCount)} footnote="Revision requests and rejections." />
                <AgencyStatCard icon={MailCheck} label="Invitations accepted" value={issued ? `${Math.round((accepted / issued) * 100)}%` : "—"}
                  footnote={issued ? `${accepted} of ${issued} invitation records (includes resends).` : "No invitations sent yet."}>
                  {issued > 0 && <AgencyProgressBar value={(accepted / issued) * 100} label="Invitations accepted" />}
                </AgencyStatCard>
              </div>
              <p className="text-[12px] text-[#5b636b] dark:text-[#9aa4a8]">{scopeNote}</p>
            </div>
          )}
          <AgencyPanel icon={Users} title="Client care summary" bodyClassName="p-0">
            {rows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse">
                  <thead>
                    <tr className={agencyTheadRow}>
                      <th scope="col" className={agencyTh}>Client</th>
                      <th scope="col" className={agencyTh}>Active agencies</th>
                      <th scope="col" className={agencyTh}>Pending review</th>
                      <th scope="col" className={agencyTh}>Publication actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr className={agencyTr} key={item.networkId}>
                        <td className={agencyTd}>
                          <Link to={`/agency-care/networks/${encodeURIComponent(item.networkId)}/overview`} className="hover:underline">
                            <AgencyPerson name={item.clientName} />
                          </Link>
                        </td>
                        <td className={agencyTd}>{item.activeAgencies}</td>
                        <td className={agencyTd}>{item.pendingReviewCount > 0 ? <AgencyPill tone="amber">{item.pendingReviewCount} to review</AgencyPill> : <AgencyPill tone="green">Up to date</AgencyPill>}</td>
                        <td className={agencyTd}>
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
              <div className="px-5 py-4">
                <CareEmpty title="No report rows available">
                  This report includes only clients you may currently access.
                </CareEmpty>
              </div>
            )}
          </AgencyPanel>
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
  const invitationDetails = preview.data?.registrationDetails;
  const missingRegistrationDetails = preview.data?.requiresOrganizationRegistration &&
    (!invitationDetails?.fullName || !invitationDetails.agencyName || !invitationDetails.email);
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
              missingRegistrationDetails ? <CareNotice danger>
                This invitation is missing signup details. Ask the sender to create a new invitation.
              </CareNotice> :
              <AgencyCareRegistrationForm
                token={token}
                invitationDetails={invitationDetails}
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
