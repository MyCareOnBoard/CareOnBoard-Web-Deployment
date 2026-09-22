import {StaffWorkspace} from './WorkspaceSummary';
import {ComplianceReviewList, ComplianceSkeleton, ComplianceBadge, complianceTone} from './CompliancePresentation';
import {BookOpen, CalendarDays} from 'lucide-react';
import { useCallback, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";
import { sendDocumentAlert } from "@/lib/api/employee-documents";
import { Routes } from "@/routes/constants";
import { useGetDocumentComplianceQuery, useComplianceDateRefresh } from "./api";
import { civilDateLabel, complianceLabel, type DocumentComplianceItem } from "./apiTypes";
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
import {trainingPolicyLabel, TrainingPolicyStatus} from '@/pages/agency/trainings/TrainingPolicyFields';
export function trainingStatus(row: TrainingData) {
  if (row.source === "policy") return trainingPolicyLabel(row);
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
    props.mode === "sc" ? <DocumentChecks {...props} /> : <StaffWorkspace {...props} />
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
  const staffDocuments = new Map<string, DocumentComplianceItem[]>();
  for (const item of data?.items || []) {
    const documents = staffDocuments.get(item.employeeId);
    if (documents) documents.push(item);
    else staffDocuments.set(item.employeeId, [item]);
  }
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
        <ComplianceSkeleton label="Checking document expiry…"/>
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
            <ComplianceReviewList label="Staff document findings" items={[...staffDocuments].map(([employeeId, documents]) => ({
              id: employeeId,
              title: documents[0].employeeName,
              subtitle: `${documents.length} document finding${documents.length === 1 ? '' : 's'} on this page`,
              meta: [...new Set(documents.map(item => complianceLabel(item)))].join(' · '),
              detail: <>
                <h3>{documents[0].employeeName}</h3>
                <p className="text-sm text-[#5e7378]">Document findings on this page</p>
                <div className="divide-y divide-[#dce7e8]">{documents.map(item => <section key={item.issueId || item.documentId} className="py-5">
                <h4 className="mb-2 font-bold">{item.documentLabel}</h4>
                <p className="text-sm text-[#5e7378]">{item.employeeName} · <span className="capitalize">{item.employeeStatus} · {item.program}</span></p>
                <ComplianceBadge tone={complianceTone(item.condition)}>{complianceLabel(item)}</ComplianceBadge>
                <p className="text-sm text-[#5e7378]">{item.expiryDateKey ? `Expiry date: ${civilDateLabel(item.expiryDateKey)}` : 'Expiry date: Not recorded'}</p>
                <p className="mt-2 text-xs text-[#5e7378]">{item.evaluatedAt ? `Checked ${new Date(item.evaluatedAt).toLocaleString()}` : 'Not yet checked'}</p>
                {item.syncStatus === 'pending' && <p className="mt-3 text-sm">Your change is saved. The list status is updating.</p>}
                <p className="mt-5 text-sm text-[#5e7378]">Open the staff document to review the file and recorded expiry date.</p>
                <div className="compliance-actions">
                  <Link className="compliance-primary" to={`${Routes.agency.dspManagement}/${encodeURIComponent(item.employeeId)}?documentId=${encodeURIComponent(item.documentId)}`}>Open staff documents</Link>
                  <Button variant="outline" disabled={sending !== null || !!query.error} className="rounded-full" onClick={() => void alert(item.employeeId, item.documentId)}>{sending === item.documentId ? 'Sending…' : 'Send Alert'}</Button>
                </div>
                </section>)}</div>
              </>,
            }))}/>
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
  const {view,scopeKey,agencyId,mode,onApply,onSelect,onPage,onPrevious}=props;
  const query=useGetTrainingsQuery({scopeKey,agencyId,mode,workspace:true,search:view.search,cursor:view.staffCursor,limit:8},{refetchOnMountOrArgChange:true});
  const data=visibleSourceData(query.currentData,query.error);
  const items=(data?.items || []).map(employee=>({
    id:employee.id,title:employee.fullName,subtitle:'Training assignments',
    status:<ComplianceBadge>{employee.assignedCount} assigned</ComplianceBadge>,
    meta:'Open assignments, certificate status and deadlines',
    detail:<EmployeeTrainings key={employee.id} {...props} staffName={employee.fullName}/>,
  }));
  // Keep a direct staff link usable when that person is outside the current page.
  if(view.employeeId && !items.some(item=>item.id===view.employeeId) && (!query.error || data))items.push({
    id:view.employeeId,title:'Selected staff',subtitle:'Opened from a direct link',status:<></>,meta:'Training assignments',
    detail:<EmployeeTrainings key={view.employeeId} {...props}/>,
  });
  return <section aria-label="Training assignments" className="p-4 sm:p-6">
    <h2 className="text-xl font-bold">Training assignments</h2>
    <p className="mt-2 text-sm text-[#5e7378]">Select a staff member to review courses, deadlines and submitted certificates.</p>
    <SourceFilters view={view} onApply={onApply} hideExpiry>
      <Button type="button" variant="outline" disabled={query.isFetching} onClick={()=>void query.refetch()}>Refresh staff</Button>
    </SourceFilters>
    <SourceNotice error={query.error} hasData={!!data} retry={query.refetch} reset={()=>onApply({staffCursor:undefined,employeeId:undefined})}/>
    {query.isFetching && !data && <ComplianceSkeleton label="Loading staff…"/>}
    {data && <p className="text-sm text-[#5e7378]">{data.items.length} staff on this page. Badges show assigned courses.</p>}
    <ComplianceReviewList label="Staff training assignments" items={items} selection={{id:view.employeeId || null,onChange:id=>onSelect({employeeId:id || undefined,cursor:undefined})}}/>
    {data && !data.items.length && <p className="py-4 text-sm text-[#5e7378]">{data.nextCursor?'No matches on this page. More records are available.':'No matching staff in this view.'}</p>}
    {data && data.items.length>0 && !view.employeeId && <p className="flex items-center gap-2 py-4 text-sm text-[#5e7378]"><BookOpen size={18} aria-hidden="true"/>Select a staff member to view training assignments.</p>}
    {data && <SourcePage cursor={view.staffCursor} next={data.nextCursor} loading={query.isFetching} onNext={()=>onPage(data.nextCursor!,true)} onPrevious={()=>onPrevious(true)}/>}
  </section>;
}
function trainingTone(row:TrainingData) {
  if(row.source==='policy') {
    if(row.policyContextState!=='current')return 'neutral';
    if(['overdue','expired'].includes(row.deadlineState || ''))return 'danger';
    if(['before_work','due_soon','due_today','renewal_due','details_needed'].includes(row.deadlineState || ''))return 'warning';
    return row.deadlineState==='satisfied'?'success':'neutral';
  }
  if(row.evidenceStatus==='accepted')return 'success';
  if(row.evidenceStatus==='needs_review' || ['Awaiting Review','Changes Requested'].includes(row.status))return 'warning';
  return 'neutral';
}
function EmployeeTrainings({
  staffName,
  view,
  scopeKey,
  agencyId,
  mode,
  onApply,
  onPage,
  onPrevious,
}: SourceProps & {staffName?:string}) {
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
    <div className="min-w-0">
      <h3 className="text-lg font-semibold">
        {staffName || "Selected staff training assignments"}
      </h3>
      <div className="compliance-actions mb-4">
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Refresh
        </Button>
        {data && (
          <Link
            className="compliance-primary"
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
        <ComplianceSkeleton label="Loading training assignments…" detail={false}/>
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
          <div className="mt-5 space-y-3">
            {data.items.map((row, index) => (
              <div key={row.id || index} className="rounded-xl border border-[#dce7e8] bg-white p-4">
                <p className="mb-2 text-xs text-[#5e7378]">{row.source==='policy'?'Automatically assigned':row.source==='manual'?'Manually assigned':'Assigned training'}</p>
                <h4 className="mb-3 font-bold text-[#16343a]">{row.name}</h4>
                <ComplianceBadge tone={trainingTone(row)}>{trainingStatus(row)}</ComplianceBadge>
                <div className="mt-3"><TrainingPolicyStatus training={row} showSummary={false}/></div>
                {row.source==='policy' && row.policyContextState==='current' && row.dueDateKey && !['satisfied','not_required','details_needed','expired','before_work'].includes(row.deadlineState || '') && <p className="mt-3 flex items-center gap-2 text-xs text-[#5e7378]"><CalendarDays size={15} aria-hidden="true"/>Due {civilDateLabel(row.dueDateKey)}</p>}
                {(row.source!=="policy" || row.timeFrame) && <p className="mt-3 flex items-start gap-2 text-xs text-[#5e7378]"><CalendarDays size={15} className="mt-0.5 shrink-0" aria-hidden="true"/><span>
                  Assigned timeframe: {row.timeFrame || "Not recorded"}</span>
                </p>}
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
