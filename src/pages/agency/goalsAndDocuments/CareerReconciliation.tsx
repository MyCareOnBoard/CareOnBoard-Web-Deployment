import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/utils/auth";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import { useAssignmentReviewScope } from "@/hooks/useAssignmentReview";
import { getAgencyClientById, getClientById } from "@/lib/api/clients";
import {
  agencyBillingRoutes,
  superAdminBillingRoutes,
  agencyShiftRoutes,
  superAdminShiftRoutes,
} from "@/lib/operational-agency/routes";
import { Routes } from "@/routes/constants";
import {
  canReviewCareer,
  defaultReviewFilters,
  validReviewFilters,
  validCareerReviewId,
  careerFindingCopy,
  type ReviewOverview,
  type Finding,
  type Units,
  type ShiftReview,
} from "@/lib/api/career-reconciliation";
import SubmittedNoteModal from "@/pages/shared/notes/SubmittedNoteModal";
import { CareerPlanDate } from "./CareerPlanDate";
import {
  useGetCareerReconciliationQuery,
  useGetCareerClaimReconciliationQuery,
} from "./api";

type Filters = ReviewOverview["filters"];
const permissionMessage =
  "You do not have access to these records. Ask your agency administrator to review them.";
const errorStatus = (error: unknown) => (error as { status?: number })?.status;
const accessDenied = (error: unknown) =>
  [401, 403, 404].includes(errorStatus(error) ?? 0);
function Findings({ items }: { items: Finding[] }) {
  return items.length ? (
    <ul className="space-y-1 text-sm">
      {items.map((item, index) => (
        <li key={item.code + index}>{careerFindingCopy[item.code]}</li>
      ))}
    </ul>
  ) : null;
}
function units(value: Units) {
  return value.value === null
    ? "Unavailable"
    : value.value.toLocaleString() +
        (value.complete ? "" : " (known units; incomplete)");
}
function time(value: string | null, timezone: string) {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        timeZone: timezone,
        dateStyle: "medium",
        timeStyle: "medium",
      }).format(new Date(value))
    : "Unavailable";
}
export function duration(seconds: number | null) {
  return seconds === null
    ? "Unavailable"
    : seconds > 0 && seconds < 60
      ? "less than one minute"
      : (seconds / 60).toLocaleString(undefined, { maximumFractionDigits: 3 }) +
        " minutes";
}
function reviewError(error: unknown, claim = false) {
  if (accessDenied(error)) return permissionMessage;
  if (
    (error as { data?: { code?: string } })?.data?.code ===
    "CAREER_REVIEW_TIMEZONE_UNAVAILABLE"
  )
    return "Agency timezone unavailable. Ask your agency administrator to configure it, then retry.";
  if (errorStatus(error) === 409)
    return claim
      ? "This claim is too large for this view. Open its billing report."
      : "Too many records. Choose a shorter date range or one authorization.";
  return "Could not load these records. Retry.";
}
export default function CareerReconciliationPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const baseScope = useAssignmentReviewScope();
  const mode = useEffectiveAgencyMode();
  const superAdmin = user?.userType === "super_admin";
  const agencyId = superAdmin
    ? params.get("agencyId") || ""
    : user?.agencyId || user?.agency?.id || "";
  const clientId = params.get("clientId") || "";
  const allowed =
    canReviewCareer(user) &&
    (superAdmin || mode === "ddd") &&
    (!superAdmin ||
      user?.profile?.agencyScope === "all" ||
      Boolean(user?.profile?.agencyIds?.includes(agencyId)));
  const scopeKey = JSON.stringify([
    baseScope,
    agencyId,
    clientId,
    superAdmin ? "ddd" : mode,
  ]);
  if (!allowed) return <p role="alert">{permissionMessage}</p>;
  if (!validCareerReviewId(agencyId) || !validCareerReviewId(clientId))
    return (
      <p role="alert">
        Select an agency and client from the client Services tab.
      </p>
    );
  return (
    <ReviewContext
      key={scopeKey}
      scopeKey={scopeKey}
      agencyId={agencyId}
      clientId={clientId}
      superAdmin={superAdmin}
      params={params}
    />
  );
}
function ReviewContext({
  params,
  ...props
}: {
  params: URLSearchParams;
  scopeKey: string;
  agencyId: string;
  clientId: string;
  superAdmin: boolean;
}) {
  const [context, setContext] = useState<{
    timezone: string;
    name: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setContext(null);
    setError("");
    const load = props.superAdmin
      ? getClientById(props.clientId, props.agencyId, {
          signal: controller.signal,
          mode: "ddd",
        })
      : getAgencyClientById(props.clientId, {
          signal: controller.signal,
          mode: "ddd",
        });
    void load
      .then((client) => {
        if (controller.signal.aborted) return;
        if (
          client.id !== props.clientId ||
          client.agencyId !== props.agencyId ||
          client.type !== "ddd"
        )
          throw new Error("scope");
        const timezone = client.documentChecklist?.timezone;
        if (!timezone) {
          setError(
            "Agency timezone unavailable. Ask your agency administrator to configure it, then retry.",
          );
          return;
        }
        try {
          defaultReviewFilters(timezone);
        } catch {
          setError(
            "Agency timezone unavailable. Ask your agency administrator to configure it, then retry.",
          );
          return;
        }
        setContext({
          timezone,
          name: [client.firstName, client.lastName].filter(Boolean).join(" "),
        });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Client context unavailable. Check access and retry.");
      });
    return () => controller.abort();
  }, [props.agencyId, props.clientId, props.superAdmin, retry]);
  if (error)
    return (
      <div role="alert">
        <p>{error}</p>
        <Button onClick={() => setRetry((n) => n + 1)}>Retry</Button>
      </div>
    );
  if (!context)
    return (
      <Skeleton className="h-32 w-full" aria-label="Loading client context" />
    );
  const defaults = defaultReviewFilters(context.timezone);
  const selection: Filters = {
    startDate: params.get("startDate") || defaults.startDate,
    endDate: params.get("endDate") || defaults.endDate,
    authorization: (params.get("authorization") ||
      "all") as Filters["authorization"],
    ...(params.get("serviceAuthorizationId")
      ? { serviceAuthorizationId: params.get("serviceAuthorizationId")! }
      : {}),
  };
  const validSelection = validReviewFilters(selection);
  return (
    <>
      {!validSelection && (
        <p role="alert">
          Invalid review filters. Showing the default 30-day period; edit the
          filters to choose another range.
        </p>
      )}
      <ReviewBody
        {...props}
        timezone={context.timezone}
        clientName={context.name}
        initialFilters={validSelection ? selection : defaults}
      />
    </>
  );
}
export function ReviewBody({
  scopeKey,
  agencyId,
  clientId,
  timezone,
  superAdmin,
  initialFilters,
  clientName,
}: {
  scopeKey: string;
  agencyId: string;
  clientId: string;
  timezone: string;
  superAdmin: boolean;
  initialFilters: Filters;
  clientName?: string;
}) {
  const [draft, setDraft] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [page, setPage] = useState(0);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [validation, setValidation] = useState("");
  const query = useGetCareerReconciliationQuery(
    { scopeKey, agencyId, clientId, ...applied },
    { refetchOnMountOrArgChange: true },
  );
  const denied = useRef(false);
  if (accessDenied(query.error)) denied.current = true;
  else if (!query.isFetching && !query.isError && query.currentData)
    denied.current = false;
  const overview = denied.current ? undefined : query.currentData;
  const visiblePage = Math.min(
    page,
    Math.max(0, Math.ceil((overview?.shifts.length ?? 0) / 25) - 1),
  );
  useEffect(() => {
    if (accessDenied(query.error)) {
      setClaimId(null);
      setSubmissionId(null);
    }
  }, [query.error]);
  function refresh() {
    setClaimId(null);
    setSubmissionId(null);
    void query.refetch();
  }
  function apply() {
    if (!validReviewFilters(draft)) {
      setValidation(
        "Choose valid dates spanning 1–90 calendar days and an exact authorization when selected.",
      );
      return;
    }
    setValidation("");
    setClaimId(null);
    setSubmissionId(null);
    setPage(0);
    if (JSON.stringify(draft) === JSON.stringify(applied)) void query.refetch();
    else setApplied({ ...draft });
  }
  const reportUrl = (id: string) =>
    (superAdmin ? superAdminBillingRoutes : agencyBillingRoutes).claims(
      new URLSearchParams({ agencyId, clientId, claimId: id }).toString(),
    );
  const scopeSearch = new URLSearchParams({ agencyId }).toString();
  function sources(shift: ShiftReview) {
    return (
      <div className="flex flex-wrap gap-2">
        {shift.sources.submissionIds?.map((id, i) => (
          <Button
            key={id}
            size="sm"
            variant="outline"
            onClick={() => setSubmissionId(id)}
          >
            View signed note {i + 1}
          </Button>
        ))}
        {shift.sources.activityLogId &&
          !shift.sources.submissionIds?.length && (
            <Link
              className="underline"
              to={
                (superAdmin ? Routes.superAdmin.notes : Routes.agency.notes) +
                "?" +
                scopeSearch
              }
            >
              Open notes workspace
            </Link>
          )}
        {shift.sources.shiftId && (
          <Link
            className="underline"
            to={(superAdmin
              ? superAdminShiftRoutes
              : agencyShiftRoutes
            ).details(shift.sources.shiftId, scopeSearch)}
          >
            Open shift
          </Link>
        )}
        {shift.sources.planId && (
          <Link
            className="underline"
            to={
              (superAdmin
                ? Routes.superAdmin.careerPlanning
                : Routes.agency.goalsAndDocuments.careerPlanning) +
              "?" +
              new URLSearchParams({
                agencyId,
                clientId,
                ...(shift.authorizationId
                  ? { serviceAuthorizationId: shift.authorizationId }
                  : {}),
              })
            }
          >
            Open Career Planning plan
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Usage &amp; reconciliation</h1>
        {clientName && <p>{clientName}</p>}
        <p>Career Planning · Review period · {timezone}</p>
      </header>
      <section
        aria-label="Review filters"
        className="flex flex-wrap items-end gap-4 rounded-2xl border bg-background/60 p-5"
      >
        <CareerPlanDate
          label="Start date"
          value={draft.startDate}
          onChange={(startDate) => setDraft({ ...draft, startDate })}
        />
        <CareerPlanDate
          label="End date"
          value={draft.endDate}
          onChange={(endDate) => setDraft({ ...draft, endDate })}
        />
        <label className="space-y-1 text-sm">
          Authorization
          <select
            className="block max-w-full rounded-md border bg-background p-2"
            value={
              draft.authorization === "exact"
                ? "exact:" + draft.serviceAuthorizationId
                : draft.authorization
            }
            onChange={(event) => {
              const value = event.target.value;
              setDraft({
                startDate: draft.startDate,
                endDate: draft.endDate,
                authorization: value.startsWith("exact:")
                  ? "exact"
                  : (value as Filters["authorization"]),
                ...(value.startsWith("exact:")
                  ? { serviceAuthorizationId: value.slice(6) }
                  : {}),
              });
            }}
          >
            <option value="all">All authorizations</option>
            <option value="needs_review">Authorization needs review</option>
            {overview?.authorizationChoices.map((choice) => (
              <option key={choice.id} value={"exact:" + choice.id}>
                {choice.label}
              </option>
            ))}
          </select>
        </label>
        <Button disabled={query.isFetching} onClick={apply}>
          Apply filters
        </Button>
        <Button variant="outline" disabled={query.isFetching} onClick={refresh}>
          Refresh
        </Button>
      </section>
      {validation && <p role="alert">{validation}</p>}
      {query.isFetching && <p role="status">Checking records…</p>}
      {query.isError && (
        <p role="alert">
          {denied.current
            ? permissionMessage
            : overview
              ? "Could not refresh. Showing results checked at " +
                time(overview.evaluatedAt, timezone) +
                ". Retry."
              : reviewError(query.error)}
        </p>
      )}
      {denied.current && !query.isError && (
        <p role="status">Checking access…</p>
      )}
      {overview && (
        <>
          <p role="status">
            Checked at {time(overview.evaluatedAt, overview.timezone)} ·{" "}
            {overview.filters.startDate} – {overview.filters.endDate} ·{" "}
            {overview.timezone}
          </p>
          <section
            aria-label="Recorded units for selected shifts"
            className="space-y-3"
          >
            <h2 className="text-xl font-semibold">
              Recorded units for selected shifts
            </h2>
            <p className="text-sm">
              Recorded 15-minute units; these are not billable-unit
              calculations.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  ["Approved", overview.totals.approved],
                  ["Awaiting review", overview.totals.submitted],
                  ["Draft / returned", overview.totals.draft],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border bg-background/60 p-5"
                >
                  <h3>{label}</h3>
                  <p className="text-xl font-semibold">{units(value)}</p>
                </div>
              ))}
            </div>
            <Findings items={overview.totals.findings} />
          </section>
          <p className="text-sm text-muted-foreground">
            Selected by shift start date. Undated or invalid-date shifts are
            excluded. Unlinked claims are not checked.
          </p>
          {!overview.shifts.length ? (
            <p>
              No Career Planning shifts found for these dates. Change the dates.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Career Planning shifts</caption>
                  <thead className="bg-muted/50">
                    <tr>
                      {[
                        "Shift",
                        "Authorization",
                        "Recorded note units",
                        "Actual attendance",
                        "Sources",
                      ].map((label) => (
                        <th key={label} className="p-3">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {overview.shifts
                      .slice(visiblePage * 25, (visiblePage + 1) * 25)
                      .map((shift) => (
                        <tr key={shift.shiftId} className="border-t align-top">
                          <td className="p-3">
                            <p>{shift.date}</p>
                            <p>{shift.employeeName ?? "Unavailable"}</p>
                            <Badge variant="secondary">{shift.status}</Badge>
                            {shift.claimId &&
                              overview.billing.access === "allowed" && (
                                <p>
                                  Claim:{" "}
                                  {overview.billing.claims.find(
                                    (c) => c.id === shift.claimId,
                                  )?.status ?? "Unavailable"}
                                </p>
                              )}
                          </td>
                          <td className="p-3">
                            {shift.authorizationLabel ??
                              "Authorization needs review"}
                            {shift.authorizationId && (
                              <p className="break-all text-xs">
                                {shift.authorizationId}
                              </p>
                            )}
                          </td>
                          <td className="min-w-56 p-3">
                            <p>
                              Approved: {units(shift.notes.approved)} (
                              {shift.notes.approvedRowCount} rows)
                            </p>
                            <p>
                              Awaiting review: {units(shift.notes.submitted)} (
                              {shift.notes.submittedRowCount} rows)
                            </p>
                            <p>
                              Draft / returned: {units(shift.notes.draft)} (
                              {shift.notes.draftRowCount} rows)
                            </p>
                            <Findings items={shift.notes.findings} />
                          </td>
                          <td className="min-w-64 space-y-1 p-3">
                            <Badge
                              variant={
                                shift.attendance.status === "match"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {shift.attendance.status === "match"
                                ? "Attendance matches"
                                : shift.attendance.status === "review"
                                  ? "Attendance needs review"
                                  : "Attendance unavailable"}
                            </Badge>
                            <p>
                              Clock-in:{" "}
                              {time(
                                shift.attendance.clockStart,
                                overview.timezone,
                              )}
                            </p>
                            <p>
                              Clock-out:{" "}
                              {time(
                                shift.attendance.clockEnd,
                                overview.timezone,
                              )}
                            </p>
                            <p>
                              Clock duration:{" "}
                              {duration(shift.attendance.clockSeconds)}
                            </p>
                            <p>
                              Documented duration:{" "}
                              {duration(shift.attendance.documentedSeconds)}
                            </p>
                            <p>
                              Recorded-unit duration:{" "}
                              {duration(shift.attendance.recordedSeconds)}
                            </p>
                            {shift.attendance.findings.some(
                              (f) => f.code === "time_difference",
                            ) &&
                              shift.attendance.clockSeconds !== null &&
                              shift.attendance.documentedSeconds !== null &&
                              Math.abs(
                                shift.attendance.clockSeconds -
                                  shift.attendance.documentedSeconds,
                              ) > 0 && (
                                <p>
                                  Duration difference:{" "}
                                  {duration(
                                    Math.abs(
                                      shift.attendance.clockSeconds -
                                        shift.attendance.documentedSeconds,
                                    ),
                                  )}
                                </p>
                              )}
                            <Findings items={shift.attendance.findings} />
                            {shift.attendance.intervals.map((interval, i) => (
                              <p key={i}>
                                Note service date:{" "}
                                {interval.serviceDate ?? "Unavailable"} ·{" "}
                                {time(interval.start, overview.timezone)} –{" "}
                                {time(interval.end, overview.timezone)}
                              </p>
                            ))}
                          </td>
                          <td className="min-w-40 p-3">{sources(shift)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <nav aria-label="Shift pages" className="flex items-center gap-3">
                <Button
                  variant="outline"
                  disabled={!visiblePage}
                  onClick={() => setPage(visiblePage - 1)}
                >
                  Previous
                </Button>
                <span>
                  Page {visiblePage + 1} of{" "}
                  {Math.ceil(overview.shifts.length / 25)}
                </span>
                <Button
                  variant="outline"
                  disabled={(visiblePage + 1) * 25 >= overview.shifts.length}
                  onClick={() => setPage(visiblePage + 1)}
                >
                  Next
                </Button>
              </nav>
            </>
          )}
          <section aria-label="Linked claims" className="space-y-3">
            <h2 className="text-xl font-semibold">Linked claims</h2>
            {overview.billing.access === "denied" ? (
              <p>Claims View access is required to review billing.</p>
            ) : (
              <>
                <Findings items={overview.billing.findings} />
                {overview.billing.claims.map((claim) => (
                  <div
                    key={claim.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border bg-background/60 p-4"
                  >
                    <span>
                      {claim.claimNumber} · {claim.status}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setClaimId(claim.id)}
                    >
                      Review claim
                    </Button>
                    <Button asChild variant="outline">
                      <Link to={reportUrl(claim.id)}>Open billing report</Link>
                    </Button>
                  </div>
                ))}
                {!overview.billing.claims.length && (
                  <p>No linked claims in these selected shifts.</p>
                )}
              </>
            )}
          </section>
          {claimId && overview.billing.access === "allowed" && (
            <ClaimEvidence
              key={claimId}
              scopeKey={scopeKey}
              agencyId={agencyId}
              clientId={clientId}
              claimId={claimId}
              timezone={overview.timezone}
              reportUrl={reportUrl(claimId)}
              reviewRange={overview.filters}
              renderSources={sources}
              onClose={() => setClaimId(null)}
            />
          )}
          {submissionId && (
            <SubmittedNoteModal
              isOpen
              submissionId={submissionId}
              readOnly
              scopeKey={scopeKey}
              onClose={() => setSubmissionId(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
function ClaimEvidence({
  scopeKey,
  agencyId,
  clientId,
  claimId,
  timezone,
  reportUrl,
  reviewRange,
  renderSources,
  onClose,
}: {
  scopeKey: string;
  agencyId: string;
  clientId: string;
  claimId: string;
  timezone: string;
  reportUrl: string;
  reviewRange: Pick<Filters, "startDate" | "endDate">;
  renderSources: (shift: ShiftReview) => ReactNode;
  onClose: () => void;
}) {
  const query = useGetCareerClaimReconciliationQuery(
    { scopeKey, agencyId, clientId, claimId },
    { refetchOnMountOrArgChange: true },
  );
  const data =
    query.isError || query.isFetching ? undefined : query.currentData;
  return (
    <section
      className="space-y-3 rounded-2xl border bg-background/60 p-5"
      aria-label="Claim evidence"
    >
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="text-xl font-semibold">Whole claim evidence</h2>
        <Button variant="outline" onClick={onClose}>
          Close claim
        </Button>
      </div>
      <p>
        Saved claim units have no recorded unit basis. Open the billing report
        for manual review.
      </p>
      <p>Automatic unit comparison is unavailable.</p>
      {query.isFetching && <p role="status">Loading claim evidence…</p>}
      {query.isError && (
        <div>
          <p role="alert">{reviewError(query.error, true)}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>
            Retry claim
          </Button>
        </div>
      )}
      {data && (
        <>
          {data.shifts.some(
            (shift) =>
              shift.date < reviewRange.startDate ||
              shift.date > reviewRange.endDate,
          ) && <p>Full claim — includes shifts outside this range.</p>}
          <p>
            {data.claim.claimNumber} · {data.claim.status}
          </p>
          <p>
            Claim checked at {time(data.evaluatedAt, timezone)} ·{" "}
            {data.startDate ?? "Unavailable"} – {data.endDate ?? "Unavailable"}
          </p>
          <p>
            Approved note units:{" "}
            {data.approvedUnits === null ? "Unavailable" : data.approvedUnits}
            {!data.complete ? " (known units; incomplete)" : ""}
          </p>
          <p>Saved claim units: {data.savedUnits ?? "Unavailable"}</p>
          {data.mixedAuthorizations && (
            <p>
              This is a mixed-authorization bundle; its units are not allocated
              to the selected authorization.
            </p>
          )}
          <Findings items={data.findings} />
          <ul className="space-y-3">
            {data.shifts.map((shift) => (
              <li key={shift.shiftId}>
                <p>
                  {shift.date} · {shift.employeeName ?? "Unavailable"} ·{" "}
                  {shift.authorizationLabel ?? "Authorization needs review"} ·
                  Approved: {units(shift.notes.approved)}
                </p>
                <Findings items={shift.notes.findings} />
                <Findings items={shift.attendance.findings} />
                {renderSources(shift)}
              </li>
            ))}
          </ul>
        </>
      )}
      <Button asChild variant="outline">
        <Link to={reportUrl}>Open billing report</Link>
      </Button>
    </section>
  );
}
