import { useCallback, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";
import { sendDocumentAlert } from "@/lib/api/employee-documents";
import { Routes } from "@/routes/constants";
import { useGetDocumentComplianceQuery, useComplianceDateRefresh } from "./api";
import { civilDateLabel, complianceLabel } from "./apiTypes";
import {
  useGetTrainingsQuery,
  useGetEmployeeTrainingsQuery,
  type TrainingData,
} from "../trainings/trainingApi";
import {
  SourceFilters,
  SourceNotice,
  SourcePage,
  visibleSourceData,
  type SourceProps,
} from "./SourceControls";
export function trainingStatus(row: TrainingData) {
  if (row.source === "policy") return "Policy evaluation not enabled";
  if (row.evidenceStatus === "needs_review") return "Needs review";
  if (row.evidenceStatus === "accepted")
    return "Completion accepted — certificate on record";
  if (row.evidenceStatus === "legacy")
    return "Legacy completion recorded; certificate acceptance not checked";
  return (
    (
      {
        "Not Completed": "Not completed",
        "Awaiting Review": "Certificate awaiting review",
        "Changes Requested": "Changes requested",
      } as Record<string, string>
    )[row.status] || "Needs review"
  );
}
export default function StaffChecks(props: SourceProps) {
  return props.view.source === "training" ? (
    <TrainingChecks {...props} />
  ) : (
    <DocumentChecks {...props} />
  );
}
function DocumentChecks(props: SourceProps) {
  const {
    view,
    scopeKey,
    viewerId,
    agencyId,
    mode,
    onApply,
    onPage,
    onPrevious,
  } = props;
  const { user } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState<string | null>(null);
  const query = useGetDocumentComplianceQuery(
    {
      scopeKey,
      viewerId,
      agencyId,
      mode,
      employeeId: view.employeeId,
      search: view.search,
      condition: view.condition,
      employeeStatus: view.employeeStatus,
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
  async function alert(employeeId: string, documentId: string) {
    setSending(documentId);
    try {
      await sendDocumentAlert(employeeId, documentId);
      toast({ title: "Alert sent" });
    } catch {
      toast({
        title: "Couldn't send alert",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(null);
    }
  }
  return (
    <section aria-label="Document expiry" className="p-4 sm:p-6">
      <h2 className="text-xl font-bold">Document expiry</h2>
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
      <SourceNotice
        error={query.error}
        hasData={!!data}
        checked={data?.evaluatedAt}
        retry={refresh}
        reset={() => onApply({ employeeId: undefined, cursor: undefined })}
      />
      {query.isFetching && !data && (
        <p role="status">Checking document expiry…</p>
      )}
      {data?.pilotEnabled === false ? (
        <div className="space-y-3">
          <p>
            Expiry monitoring is not enabled. Open staff documents to review
            expiry.
          </p>
          <Link
            className="text-[#008b90] underline"
            to={Routes.agency.dspManagement}
          >
            Open staff documents
          </Link>
          {user?.userType === "agency" && (
            <p>
              <Link
                className="text-[#008b90] underline"
                to={`${Routes.agency.agencySettings}?tab=notification`}
              >
                Document monitoring settings
              </Link>
            </p>
          )}
        </div>
      ) : (
        data && (
          <>
            {(data.monitoringState === "baselining" ||
              ["pending", "baselining", "checking"].includes(
                data.syncStatus,
              )) && (
              <p>Checking records. Some results are not available yet.</p>
            )}
            {(data.monitoringState === "paused" ||
              data.syncStatus === "paused") && <p>Monitoring is paused.</p>}
            {data.monitoringState === "paused" &&
              user?.userType === "agency" && (
                <Link
                  className="text-[#008b90] underline"
                  to={Routes.agency.agencySettings + "?tab=notification"}
                >
                  Document monitoring settings
                </Link>
              )}
            {data.syncStatus === "error" && (
              <p role="alert">
                Could not load these records.{" "}
                <Button variant="outline" onClick={refresh}>
                  Retry
                </Button>
              </p>
            )}
            <p className="text-sm text-[#808081]">
              {data.items.length} document findings on this page. Expiry
              monitoring does not check every required document.
            </p>
            <div className="divide-y divide-[#e5e5e6]">
              {data.items.map((item) => (
                <div
                  key={item.issueId || item.documentId}
                  className="grid gap-3 py-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center"
                >
                  <div>
                    <Link
                      className="font-semibold text-[#008b90] underline"
                      to={`${Routes.agency.dspManagement}/${encodeURIComponent(item.employeeId)}?documentId=${encodeURIComponent(item.documentId)}`}
                    >
                      {item.employeeName}
                    </Link>
                    <p className="text-sm capitalize text-[#808081]">
                      {item.employeeStatus} · {item.program}
                    </p>
                  </div>
                  <p>{item.documentLabel}</p>
                  <div>
                    <p>{complianceLabel(item)}</p>
                    <p className="text-sm">
                      {item.expiryDateKey
                        ? `Expires ${civilDateLabel(item.expiryDateKey)}`
                        : item.condition === "not_applicable"
                          ? "No deadline set"
                          : "Not recorded"}
                    </p>
                    <p className="text-xs text-[#808081]">
                      {item.evaluatedAt
                        ? `Checked ${new Date(item.evaluatedAt).toLocaleString()}`
                        : "Not yet checked"}
                    </p>
                    {item.syncStatus === "pending" && (
                      <p className="text-sm">
                        Your change is saved. The list status is updating.
                      </p>
                    )}
                  </div>
                  <Button
                    disabled={sending !== null || !!query.error}
                    className="rounded-full bg-red-500 text-white hover:bg-red-600"
                    onClick={() => void alert(item.employeeId, item.documentId)}
                  >
                    {sending === item.documentId ? "Sending…" : "Send Alert"}
                  </Button>
                </div>
              ))}
            </div>
            {!data.items.length &&
              data.syncStatus === "ready" &&
              (!data.monitoringState || data.monitoringState === "active") && (
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
        )
      )}
    </section>
  );
}
function TrainingChecks(props: SourceProps) {
  const {
    view,
    scopeKey,
    agencyId,
    mode,
    onApply,
    onSelect,
    onPage,
    onPrevious,
  } = props;
  const query = useGetTrainingsQuery(
    {
      scopeKey,
      agencyId,
      mode,
      workspace: true,
      search: view.search,
      cursor: view.staffCursor,
      limit: 8,
    },
    { refetchOnMountOrArgChange: true },
  );
  const data = visibleSourceData(query.currentData, query.error);
  return (
    <section aria-label="Training assignments" className="p-4 sm:p-6">
      <h2 className="text-xl font-bold">Training assignments</h2>
      <SourceFilters view={view} onApply={onApply}>
        <Button
          type="button"
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Refresh staff
        </Button>
      </SourceFilters>
      <SourceNotice
        error={query.error}
        hasData={!!data}
        retry={() => void query.refetch()}
        reset={() => onApply({ staffCursor: undefined, employeeId: undefined })}
      />
      {query.isFetching && !data && <p role="status">Loading staff…</p>}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.items.map((employee) => (
              <button
                key={employee.id}
                type="button"
                aria-pressed={view.employeeId === employee.id}
                onClick={() =>
                  onSelect({ employeeId: employee.id, cursor: undefined })
                }
                className="rounded-xl border border-white bg-white/60 p-4 text-left hover:border-[#00b4b8] aria-pressed:border-[#00b4b8]"
              >
                <p className="font-semibold">{employee.fullName}</p>
                <p className="text-sm text-[#808081]">
                  {employee.assignedCount} assigned training
                  {employee.assignedCount === 1 ? "" : "s"}
                </p>
              </button>
            ))}
          </div>
          {!data.items.length && (
            <p>
              {data.nextCursor
                ? "No matches on this page. More records are available."
                : "No matching records in this view"}
            </p>
          )}
          <SourcePage
            cursor={view.staffCursor}
            next={data.nextCursor}
            loading={query.isFetching}
            onNext={() => onPage(data.nextCursor!, true)}
            onPrevious={() => onPrevious(true)}
          />
        </>
      )}
      {!view.employeeId ? (
        <p className="mt-6">
          Select a staff member to view training assignments.
        </p>
      ) : (
        (!query.error || data) && (
          <EmployeeTrainings key={view.employeeId} {...props} />
        )
      )}
    </section>
  );
}
function EmployeeTrainings({
  view,
  scopeKey,
  agencyId,
  mode,
  onApply,
  onSelect,
  onPage,
  onPrevious,
}: SourceProps) {
  const query = useGetEmployeeTrainingsQuery(
    {
      scopeKey,
      agencyId,
      mode,
      workspace: true,
      employeeId: view.employeeId,
      cursor: view.cursor,
      limit: 25,
    },
    { refetchOnMountOrArgChange: true },
  );
  const data = visibleSourceData(query.currentData, query.error);
  return (
    <div className="mt-6 border-t border-[#e5e5e6] pt-4">
      <h3 className="text-lg font-semibold">
        Selected staff training assignments
      </h3>
      <div className="my-3 flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => onSelect({ employeeId: undefined, cursor: undefined })}
        >
          Clear staff selection
        </Button>
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Refresh
        </Button>
        {data && (
          <Link
            className="self-center text-[#008b90] underline"
            to={`${Routes.agency.trainings}?employeeId=${encodeURIComponent(view.employeeId!)}`}
          >
            Open training review
          </Link>
        )}
      </div>
      <SourceNotice
        error={query.error}
        hasData={!!data}
        checked={data?.evaluatedAt}
        retry={() => void query.refetch()}
        reset={() => onApply({ employeeId: undefined, cursor: undefined })}
      />
      {query.isFetching && !data && (
        <p role="status">Loading training assignments…</p>
      )}
      {data && (
        <>
          <p className="text-sm text-[#808081]">
            {data.items.length} training assignments for the selected employee
            on this page.{" "}
            {data.evaluatedAt
              ? `Checked ${new Date(data.evaluatedAt).toLocaleString()}.`
              : ""}
          </p>
          <p className="mt-1 text-sm text-[#808081]">
            Recorded certificate acceptance does not confirm authenticity,
            current file availability, or clearance for every service.
          </p>
          <div className="divide-y divide-[#e5e5e6]">
            {data.items.map((row, index) => (
              <div key={row.id || index} className="py-4">
                <p className="font-semibold">{row.name}</p>
                <p>{trainingStatus(row)}</p>
                <p className="text-sm text-[#808081]">
                  Assigned timeframe: {row.timeFrame || "Not recorded"}
                </p>
              </div>
            ))}
          </div>
          {!data.items.length && (
            <p className="py-4">
              {data.nextCursor
                ? "No matches on this page. More records are available."
                : "No training assignments found"}
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
    </div>
  );
}
