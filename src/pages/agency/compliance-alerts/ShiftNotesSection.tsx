import {ComplianceReviewList, ComplianceSkeleton, ComplianceBadge, complianceTone} from './CompliancePresentation';
import { ClipboardCheck, Clock3, PauseCircle, ShieldOff, RefreshCw } from 'lucide-react';
import { lazy, Suspense, useState } from "react";
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
  const [selectedId, setSelectedId] = useState<string | null>();
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
  const coverage = data?.coverage;
  const notice = coverage === 'checking'
    ? {title: 'Initial shift scan pending', body: 'Monitoring is enabled. The background scan has not finished yet, so these results may be incomplete. Refresh to check for updates.', Icon: Clock3}
    : coverage === 'paused'
      ? {title: 'Monitoring paused', body: 'Saved findings remain available. The agency owner can resume compliance monitoring in Settings → Notifications.', Icon: PauseCircle}
      : coverage === 'disabled'
        ? {title: 'Enable compliance monitoring', body: 'The agency owner can enable monitoring in Settings → Notifications to start checking shift notes.', Icon: ShieldOff}
        : coverage === 'unavailable'
          ? {title: 'Shift records unavailable', body: 'We could not check these records. Refresh to try again.', Icon: RefreshCw}
          : null;
  const renderDetail = (shiftId: string) => <Suspense fallback={<ComplianceSkeleton label="Loading shift note…" detail={false}/>}>
    <ShiftNoteStatus key={shiftId} shiftId={shiftId} agencyId={agencyId} mode={mode} viewerId={viewerId} scopeKey={scopeKey}/>
  </Suspense>;
  return (
    <section aria-label="Shift notes" className="p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-xl font-bold text-[#16343a]">Shift notes</h2>
          <p className="mt-1 text-sm text-[#5e7378]">Review missing notes, unfinished records and submissions that need attention.</p></div>
        {data && <ComplianceBadge tone={coverage === 'ready' ? 'success' : 'neutral'}>{coverage === 'ready' ? 'Monitoring active' : coverage === 'checking' ? 'Initial scan pending' : coverage === 'paused' ? 'Paused' : coverage === 'disabled' ? 'Not enabled' : 'Unavailable'}</ComplianceBadge>}
      </div>
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
      {query.isFetching && !data && <ComplianceSkeleton label="Checking shift notes…"/>}
      {notice && <div role={coverage === 'unavailable' ? 'alert' : 'status'} className="my-4 flex items-start gap-3 rounded-xl border border-[#cfe5e6] bg-[#f0f8f8] p-5 text-[#16343a]">
        <notice.Icon size={21} aria-hidden="true" className="mt-0.5 shrink-0 text-[#008b90]"/>
        <div><h3 className="font-semibold">{notice.title}</h3><p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#5e7378]">{notice.body}</p></div>
      </div>}
      {data && data.coverage !== "disabled" && (
        <>
          {data.items.length > 0 && <p className="text-sm text-[#808081]">
            {`${data.items.length} shift notes on this page${coverage === 'checking' ? ' · Partial results' : ''}`}
          </p>}
          <ComplianceReviewList label="Shift note findings" selection={{id: view.shiftId || (selectedId === null ? null : data.items.find(item => item.shiftId === selectedId)?.shiftId || data.items[0]?.shiftId || null), onChange: id => {setSelectedId(id); onSelect({shiftId: undefined});}}} items={data.items.map(item => ({
            id: item.shiftId, title: item.employeeName, subtitle: item.clientName,
            status: <ComplianceBadge tone={complianceTone(item.state)}>{shiftNoteLabels[item.state]}</ComplianceBadge>,
            meta: civilDateLabel(item.serviceDate) || 'Date not recorded',
            detail: <><h3>{item.clientName}</h3><p className="text-sm text-[#5e7378]">Staff: {item.employeeName}</p>

              <p className="text-sm">Service date: {civilDateLabel(item.serviceDate) || 'Not recorded'}</p>
              <p className="mt-2 text-xs text-[#5e7378]">{item.checkedAt ? `Checked ${new Date(item.checkedAt).toLocaleString()}` : 'Not yet checked'}</p>
              {item.syncStatus === 'pending' && <p className="mt-3 text-sm">Your change is saved. The list status is updating.</p>}
              {item.syncStatus === 'unavailable' && <p className="mt-3 text-sm">Note status unavailable</p>}
              {view.shiftId === item.shiftId && renderDetail(item.shiftId)}
              <div className="compliance-actions"><Button className="compliance-primary" onClick={() => onSelect({shiftId: view.shiftId === item.shiftId ? undefined : item.shiftId})}>{view.shiftId === item.shiftId ? "Close shift note" : "Open shift note"}</Button>
              {mode === 'ddd' && item.noteType === 'career-planning' && canReviewCareer(user) && <Link className="text-sm text-[#008b90] underline" to={Routes.agency.careerReconciliation + '?' + new URLSearchParams({clientId: item.clientId, agencyId})}>Usage &amp; reconciliation</Link>}</div>
            </>,
          }))}/>
          {!data.items.length && !query.error && (data.nextCursor || coverage === 'ready') && (
            <div className="my-5 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-[#cfe0e2] bg-[#f8fbfb] px-5 py-8 text-center">
              <ClipboardCheck size={28} aria-hidden="true" className="mb-3 text-[#008b90]"/>
              <h3 className="font-semibold text-[#16343a]">{data.nextCursor ? 'No matches on this page. More records are available.' : 'No matching shift notes'}</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-[#5e7378]">{data.nextCursor ? 'Continue to the next page to review more records.' : 'There are no records for the selected status and dates. Try another filter to see other shift notes.'}</p>
            </div>
          )}
          {(view.cursor || data.nextCursor) && <SourcePage
            cursor={view.cursor}
            next={data.nextCursor}
            loading={query.isFetching}
            onNext={() => onPage(data.nextCursor!)}
            onPrevious={() => onPrevious()}
          />}
        </>
      )}
      {view.shiftId && !data?.items.some(item => item.shiftId === view.shiftId) && (!query.error || data) && (
        <>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => onSelect({ shiftId: undefined })}
          >
            Close shift note
          </Button>
          {renderDetail(view.shiftId)}
        </>
      )}
    </section>
  );
}
