import {WorkspaceSummary, WorkspaceReviewList} from './WorkspaceSummary';
import {ComplianceReviewList, ComplianceSkeleton, ComplianceBadge, complianceTone} from './CompliancePresentation';
import { useCallback, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Routes } from "@/routes/constants";
import { DOCUMENT_TYPE_OPTIONS } from "@/pages/shared/client-management/utils/documentTypeConstants";
import {
  useGetClientChecklistPageQuery,
  useGetUnsignedForm485PageQuery,
  useComplianceDateRefresh,
} from "./api";
import {
  SourceFilters,
  SourceNotice,
  SourcePage,
  visibleSourceData,
  type SourceProps,
} from "./SourceControls";
import type { ClientChecklistItem } from "./apiTypes";
const attentionStatuses = new Set([
  "not_uploaded",
  "expires_today",
  "expired",
  "multiple_files",
  "needs_review",
]);
export const checklistHasAttention = (
  checklist: ClientChecklistItem["documentChecklist"],
) =>
  checklist.state === "unavailable" ||
  checklist.groups.some((group) =>
    group.rows.some((row) => attentionStatuses.has(row.status)),
  );
const labels = {
  not_uploaded: "Not uploaded",
  on_file: "On file",
  on_file_no_expiry: "On file — expiry not recorded",
  expires_today: "Expires today",
  expired: "Expired",
  multiple_files: "Multiple files",
  needs_review: "Needs review",
};
const clientHref = (id: string, tab: string) =>
  Routes.agency.clientDetails.replace(":clientId", encodeURIComponent(id)) +
  "?tab=" +
  tab;
export default function ClientChecks(props: SourceProps) {
  return props.view.source === "unsigned_form485" ? (
    <UnsignedChecks {...props} />
  ) : (
    <ChecklistChecks {...props} />
  );
}
function ChecklistChecks({
  view,
  scopeKey,
  agencyId,
  mode,
  onApply,
  onPage,
  onPrevious,
}: SourceProps) {
  const [attention, setAttention] = useState(false);
  const query = useGetClientChecklistPageQuery(
    {
      scopeKey,
      agencyId,
      mode,
      ...(view.clientId
        ? { clientId: view.clientId }
        : {
            search: view.search,
            status: view.status || "all",
            cursor: view.cursor,
          }),
      limit: 25,
    },
    { refetchOnMountOrArgChange: true },
  );
  const data = visibleSourceData(query.currentData, query.error);
  const refresh = useCallback(() => {
    if (view.cursor) onPage();
    else void query.refetch();
  }, [view.cursor, onPage, query.refetch]);
  useComplianceDateRefresh(data?.timezone, refresh, data?.localDate);
  const rows =
    data?.items.filter(
      (item) => !attention || checklistHasAttention(item.documentChecklist),
    ) || [];
  return (
    <section aria-label="Document checklist" className="p-4 sm:p-6">
      <h2 className="text-xl font-bold">Document checklist</h2>
      <SourceFilters view={view} onApply={onApply}>
        <Button
          type="button"
          variant="outline"
          disabled={query.isFetching}
          onClick={refresh}
        >
          Refresh
        </Button>
      </SourceFilters>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={attention}
          onChange={(event) => setAttention(event.target.checked)}
        />
        Document issues on this page
      </label>
      <SourceNotice
        error={query.error}
        hasData={!!data}
        checked={data?.evaluatedAt}
        retry={refresh}
        reset={() => onApply({ clientId: undefined, cursor: undefined })}
      />
      {query.isFetching && !data && (
        <ComplianceSkeleton label="Checking client documents…"/>
      )}
      {data && (
        <>
          <p className="mt-3 text-sm text-[#808081]">
            {data.items.length} clients checked on this page.{" "}
            {data.evaluatedAt
              ? `Checked ${new Date(data.evaluatedAt).toLocaleString()}.`
              : ""}
          </p>
          <p className="text-sm text-[#808081]">
            Alert counts cover client documents, AENF and client policy checks. A + means some checks are incomplete. Files and dates on record do not confirm approval or readiness for
            assignment.
          </p>
          {data.partialPage && (
            <p className="text-sm">
              Checking records. Some results are not available yet.
            </p>
          )}
          <WorkspaceReviewList key={`${scopeKey}:${mode}:${rows.map(c=>c.id).join()}:${query.fulfilledTimeStamp}`} kind="client" {...{agencyId,mode,scopeKey}} label="Client document checklists" items={rows.map(client => ({
            id: client.id, title: client.name,
            subtitle: <span className="capitalize">{client.status}</span>,
            meta: client.documentChecklist.state === 'unavailable' ? 'Checklist unavailable' : `${client.documentChecklist.groups.reduce((count, group) => count + group.rows.filter(row => attentionStatuses.has(row.status)).length, 0)} document slots need attention`,
            detail: <><h3>{client.name}</h3>
                {client.documentChecklist.state === "unavailable" ? (
                  <p className="mt-3">
                    Checklist unavailable. Saved document details need checking.
                  </p>
                ) : (
                  client.documentChecklist.groups.map((group) => (
                    <div key={group.program} className="mt-3">
                      <h3 className="font-semibold uppercase">
                        {group.program}
                      </h3>
                      {group.rows.map((row) => (
                        <div
                          key={row.key}
                          className="flex flex-wrap items-center justify-between gap-3 py-2"
                        >
                          <div>
                            <p>
                              {DOCUMENT_TYPE_OPTIONS.find(
                                (option) => option.value === row.key,
                              )?.label || row.key}
                            </p>
                            <p className="text-sm text-[#808081]">
                              {row.expiryDate
                                ? `Expires ${row.expiryDate}`
                                : "Expiry: Not recorded"}
                            </p>
                            {(row.warningCode === "invalid_timezone" ||
                              row.reasonCode === "invalid_timezone") && (
                              <p className="text-sm">
                                Your agency timezone needs updating before
                                expiry dates can be checked.
                              </p>
                            )}
                          </div>
                          <ComplianceBadge tone={complianceTone(row.status)}>{labels[row.status]}</ComplianceBadge>
                        </div>
                      ))}
                    </div>
                  ))
                )}
                <div className="mt-5"><WorkspaceSummary showName={false} kind="client" id={client.id} {...{agencyId,mode,scopeKey}}/></div>
                <div className="mt-3 flex flex-wrap gap-4">
                  <Link
                    className="text-[#008b90] underline"
                    to={clientHref(client.id, "documents")}
                  >
                    Open client documents
                  </Link>
                  <Link
                    className="text-[#008b90] underline"
                    to={clientHref(client.id, "services")}
                  >
                    Open client assignment review
                  </Link>
                </div>
                <p className="mt-2 text-sm text-[#808081]">
                  Assignment review: Not checked here
                </p>
            </>,
          }))}/>
          {!rows.length && (
            <p className="py-4">
              {attention && data.items.length ? (
                <>
                  No document findings on this page.{" "}
                  <button
                    type="button"
                    className="text-[#008b90] underline"
                    onClick={() => setAttention(false)}
                  >
                    Show all on this page
                  </button>
                </>
              ) : data.nextCursor ? (
                "No matches on this page. More records are available."
              ) : (
                "No matching records in this view"
              )}
            </p>
          )}
          <SourcePage
            cursor={view.cursor}
            next={data.nextCursor}
            loading={query.isFetching}
            onNext={() => onPage(data.nextCursor!)}
            onPrevious={() => onPrevious()}
          />
        </>
      )}
    </section>
  );
}
function UnsignedChecks({
  view,
  scopeKey,
  agencyId,
  mode,
  onApply,
  onPage,
  onPrevious,
}: SourceProps) {
  const query = useGetUnsignedForm485PageQuery(
    {
      scopeKey,
      agencyId,
      mode,
      clientId: view.clientId,
      cursor: view.cursor,
      limit: 25,
    },
    { refetchOnMountOrArgChange: true },
  );
  const data = visibleSourceData(query.currentData, query.error);
  const refresh = useCallback(() => {
    if (view.cursor) onPage();
    else void query.refetch();
  }, [view.cursor, onPage, query.refetch]);
  useComplianceDateRefresh(data?.timezone, refresh, data?.localDate);
  return (
    <section aria-label="Unsigned Form 485" className="p-4 sm:p-6">
      <h2 className="text-xl font-bold">Unsigned Form 485</h2>
      <div className="my-4">
        <Button variant="outline" disabled={query.isFetching} onClick={refresh}>
          Refresh
        </Button>
      </div>
      <p className="text-sm text-[#808081]">
        Signature and grace deadlines are separate from document file presence.
      </p>
      <SourceNotice
        error={query.error}
        hasData={!!data}
        checked={data?.evaluatedAt}
        retry={refresh}
        reset={() => onApply({ clientId: undefined, cursor: undefined })}
      />
      {query.isFetching && !data && (
        <ComplianceSkeleton label="Checking unsigned forms…"/>
      )}
      {data && (
        <>
          <p className="mt-3 text-sm text-[#808081]">
            {data.items.length} unsigned clients on this page. Checked{" "}
            {new Date(data.evaluatedAt).toLocaleString()}.
          </p>
          {data.partialPage && (
            <p>Checking records. Some results are not available yet.</p>
          )}
          <ComplianceReviewList label="Unsigned forms" items={data.items.map(client => ({
            id: client.id, title: client.name, subtitle: 'Form 485',
            status: <ComplianceBadge tone={client.deactivated || (client.daysLeft != null && client.daysLeft <= 0) ? 'danger' : 'warning'}>Unsigned</ComplianceBadge>,
            meta: client.deadline ? `Due ${new Date(client.deadline).toLocaleDateString()}` : 'No deadline set',
            detail: <><h3>Unsigned Form 485</h3><p>{client.name}</p><p className="mt-3 text-sm capitalize">{client.status}</p>
              <p className="mt-4 font-semibold">{client.deactivated ? 'Deactivated — signed 485 overdue' : client.daysLeft == null ? 'Unsigned' : client.daysLeft <= 0 ? 'Unsigned — overdue' : `Unsigned — ${client.daysLeft} day${client.daysLeft === 1 ? '' : 's'} left`}</p>
              <p className="mt-3 text-sm text-[#5e7378]">Review the signature and grace deadline on the client record.</p>
              <div className="compliance-actions"><Link className="compliance-primary" to={clientHref(client.id, 'documents')}>Open client documents</Link></div>
            </>,
          }))}/>
          {!data.items.length && (
            <p className="py-4">
              {data.nextCursor
                ? "No matches on this page. More records are available."
                : "No matching records in this view"}
            </p>
          )}
          <SourcePage
            cursor={view.cursor}
            next={data.nextCursor}
            loading={query.isFetching}
            onNext={() => onPage(data.nextCursor!)}
            onPrevious={() => onPrevious()}
          />
        </>
      )}
    </section>
  );
}
