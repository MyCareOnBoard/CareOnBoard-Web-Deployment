import { lazy, Suspense } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/utils/auth";
import { canReviewCareer } from "@/lib/api/career-reconciliation";
import { Routes } from "@/routes/constants";
import { useGetShiftNoteComplianceQuery } from "./api";
import { shiftNoteLabels, civilDateLabel } from "./apiTypes";
import {
  SourceFilters,
  SourceNotice,
  SourcePage,
  visibleSourceData,
  type SourceProps,
} from "./SourceControls";
const ShiftNoteStatus = lazy(
  () => import("@/pages/shared/notes/ShiftNoteStatus"),
);
export default function ShiftNotesSection({
  view,
  scopeKey,
  agencyId,
  mode,
  viewerId,
  onApply,
  onSelect,
  onPage,
  onPrevious,
}: SourceProps) {
  const { user } = useAuth();
  const query = useGetShiftNoteComplianceQuery(
    {
      scopeKey,
      viewerId,
      agencyId,
      mode,
      employeeId: view.employeeId,
      stateGroup: view.stateGroup || "unresolved",
      startDate: view.startDate,
      endDate: view.endDate,
      cursor: view.cursor,
      limit: 25,
    },
    { skip: !agencyId || !viewerId, refetchOnMountOrArgChange: true },
  );
  const data = visibleSourceData(query.currentData, query.error);
  const checked = data?.items
    .map((item) => item.checkedAt)
    .filter((value): value is string => !!value)
    .sort()[0];
  return (
    <section aria-label="Shift notes" className="p-4 sm:p-6">
      <h2 className="text-xl font-bold">Shift notes</h2>
      <SourceFilters view={view} onApply={onApply}>
        <Button
          type="button"
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Refresh
        </Button>
      </SourceFilters>
      <SourceNotice
        error={query.error}
        hasData={!!data}
        checked={checked}
        retry={() => void query.refetch()}
        reset={() => onApply({ shiftId: undefined, cursor: undefined })}
      />
      {query.isFetching && !data && <p role="status">Checking shift notes…</p>}
      {data?.coverage === "unavailable" && (
        <p role="alert">
          Could not load these records.{" "}
          <Button variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </p>
      )}
      {data?.coverage === "disabled" && <p>Monitoring is not enabled</p>}
      {data?.coverage === "checking" && (
        <p>Checking records. Some results are not available yet.</p>
      )}
      {data?.coverage === "paused" && <p>Monitoring is paused.</p>}
      {data && data.coverage !== "disabled" && (
        <>
          <p className="text-sm text-[#808081]">
            {data.items.length} shift notes on this page.
          </p>
          <div className="divide-y divide-[#e5e5e6]">
            {data.items.map((item) => (
              <div
                key={item.shiftId}
                className="grid gap-3 py-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center"
              >
                <div>
                  <p className="font-semibold">{item.employeeName}</p>
                  <p className="text-sm text-[#808081]">{item.clientName}</p>
                </div>
                <p>{civilDateLabel(item.serviceDate) || "Not recorded"}</p>
                <div>
                  <p>{shiftNoteLabels[item.state]}</p>
                  <p className="text-xs text-[#808081]">
                    {item.checkedAt
                      ? `Checked ${new Date(item.checkedAt).toLocaleString()}`
                      : "Not yet checked"}
                  </p>
                  {item.syncStatus === "pending" && (
                    <p className="text-sm">
                      Your change is saved. The list status is updating.
                    </p>
                  )}
                  {item.syncStatus === "unavailable" && (
                    <p>Note status unavailable</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => onSelect({ shiftId: item.shiftId })}
                  >
                    Open shift note
                  </Button>
                  {mode === "ddd" &&
                    item.noteType === "career-planning" &&
                    canReviewCareer(user) && (
                      <Link
                        className="text-sm text-[#008b90] underline"
                        to={
                          Routes.agency.careerReconciliation +
                          "?" +
                          new URLSearchParams({
                            clientId: item.clientId,
                            agencyId,
                          })
                        }
                      >
                        Usage &amp; reconciliation
                      </Link>
                    )}
                </div>
              </div>
            ))}
          </div>
          {!data.items.length && !query.error && (
            <p className="py-4">
              {data.nextCursor
                ? "No matches on this page. More records are available."
                : data.coverage === "ready"
                  ? "No matching records in this view"
                  : "Shift-note checking is not complete."}
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
      {view.shiftId && (!query.error || data) && (
        <>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => onSelect({ shiftId: undefined })}
          >
            Close shift note
          </Button>
          <Suspense fallback={<p role="status">Loading shift note…</p>}>
            <ShiftNoteStatus
              key={view.shiftId}
              shiftId={view.shiftId}
              agencyId={agencyId}
              mode={mode}
              viewerId={viewerId}
              scopeKey={scopeKey}
            />
          </Suspense>
        </>
      )}
    </section>
  );
}
