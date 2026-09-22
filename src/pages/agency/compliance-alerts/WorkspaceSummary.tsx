import {useEffect, useState} from 'react';
import {useToast} from '@/hooks/use-toast';
import {sendDocumentAlert} from '@/lib/api/employee-documents';
import {Link} from 'react-router';
import {Button} from '@/components/ui/button';
import {complianceAlertsApi} from './api';
import {ComplianceBadge, ComplianceReviewList, ComplianceSkeleton, complianceTone, type ComplianceReviewItem} from './CompliancePresentation';
import {SourceFilters, SourceNotice, SourcePage, visibleSourceData, type SourceProps} from './SourceControls';

type Check = {id:string;label:string;state:string;message?:string;href?:string;documentId?:string;employeeId?:string};
type Summary = {alerts:{count:number;complete:boolean};name:string;evaluatedAt:string;sections:Array<{alerts?:{count:number;complete:boolean};label:string;state:string;items:Check[]}>};
const summaryApi=complianceAlertsApi.injectEndpoints({endpoints:builder=>({
  workspaceStaff:builder.query<{items:Array<{id:string;name:string;status:string}>;nextCursor:string|null},{agencyId:string;mode:string;scopeKey:string;search?:string;employeeStatus?:string;cursor?:string}>({
    query:({scopeKey:_scope,...params})=>({url:'/notifications/compliance/workspace/staff',method:'GET',params,requiresAuth:true}),keepUnusedDataFor:0,
  }),
  workspaceSummary:builder.query<Summary,{kind:'staff'|'client';id:string;agencyId:string;mode:string;scopeKey:string}>({
    query:({kind,id,scopeKey:_scope,...params})=>({url:`/notifications/compliance/workspace/${kind}/${encodeURIComponent(id)}`,method:'GET',params,requiresAuth:true}),keepUnusedDataFor:0,
  }),
})});
export const {useWorkspaceStaffQuery,useWorkspaceSummaryQuery}=summaryApi;
const labels:Record<string,string>={pass:'Satisfied today',fail:'Needs attention',not_applicable:'Not applicable',not_required:'Not required',verified:'Verified',on_file:'On file',present:'On file',current:'Current',missing:'Missing',unavailable:'Could not check',restricted:'Access restricted',needs_review:'Needs review',not_verified:'Not verified',not_recorded:'Not recorded',needs_not_recorded:'Client needs not recorded',applicability_not_recorded:'Applicability not recorded',due_today:'Expires today',review:'Review staff'};
export function WorkspaceSummary({kind,id,agencyId,mode,scopeKey,showName=true}:{kind:'staff'|'client';id:string;agencyId:string;mode:string;scopeKey:string;showName?:boolean}) {
  const {toast}=useToast();
  const [sending,setSending]=useState<string|null>(null);
  async function sendAlert(item:Check) {
    setSending(item.documentId!);
    try {await sendDocumentAlert(item.employeeId!,item.documentId!);toast({title:'Alert sent'});}
    catch {toast({title:"Could not send alert",description:'Please try again.',variant:'destructive'});}
    finally {setSending(null);}
  }
  const query=useWorkspaceSummaryQuery({kind,id,agencyId,mode,scopeKey},{refetchOnMountOrArgChange:false});
  const data=visibleSourceData(query.currentData,query.error);
  return <div className="space-y-4">
    <SourceNotice error={query.error} hasData={!!data} checked={data?.evaluatedAt} retry={query.refetch} reset={query.refetch}/>
    {query.isFetching && !data && <ComplianceSkeleton label="Checking compliance requirements…" detail={false}/>}
    {data && <>{showName && <h3>{data.name}</h3>}<p className="text-xs text-[#5e7378]">Checked {new Date(data.evaluatedAt).toLocaleString()}. Current records only; assignment clearance is checked for the selected service and dates.</p>
    <Button variant="outline" disabled={query.isFetching} onClick={()=>void query.refetch()}>Refresh checks</Button>
    {data.sections.filter(group=>showName || group.label!=='Client documents').map((group,index)=><details key={group.label} open={index===0} className="border-t border-[#dce7e8] pt-4">
      <summary className="cursor-pointer py-2 font-bold">{group.label} <span className="ml-2 text-xs font-normal text-[#5e7378]">{group.state!=='ready' ? labels[group.state] || group.state : group.alerts ? `${group.alerts.count}${group.alerts.complete?'':'+'} alerts` : `${group.items.filter(item=>!['pass','verified','current','present','on_file','not_required','not_applicable'].includes(item.state)).length} to review`}</span></summary>
      {group.state!=='ready'?<p className="mt-2 text-sm">{group.state==='restricted'?'You do not have access to these checks.':'These checks could not finish. Refresh or open the source record to review.'}</p>:
      !group.items.length?<p className="mt-2 text-sm">No applicable records found.</p>:<div className="divide-y divide-[#dce7e8]">{group.items.map(item=><div key={item.id} className="space-y-2 py-3">
        <p className="text-sm font-semibold">{item.label}</p>
        <ComplianceBadge tone={item.state==='pass'||item.state==='verified'?'success':item.state==='fail'?'danger':['unavailable','restricted','not_verified','not_recorded','needs_not_recorded','applicability_not_recorded'].includes(item.state)?'warning':complianceTone(item.state)}>{labels[item.state] || item.state.replaceAll('_',' ')}</ComplianceBadge>
        {item.message && <p className="text-sm text-[#5e7378]">{item.message}</p>}
        {item.documentId && item.employeeId && <Button variant="outline" className="ml-2" disabled={sending!==null || !!query.error} onClick={()=>void sendAlert(item)}>{sending===item.documentId?'Sending…':'Send Alert'}</Button>}
        {item.href && <Link className="inline-block text-sm font-semibold text-[#007f84] underline" to={item.href}>Open record</Link>}
      </div>)}</div>}
    </details>)}</>}
  </div>;
}
type WorkspaceScope = {kind:'staff'|'client';agencyId:string;mode:string;scopeKey:string};
function AlertCount({id,enabled,onSettled,...scope}:WorkspaceScope & {id:string;enabled:boolean;onSettled:()=>void}) {
  const query=useWorkspaceSummaryQuery({...scope,id},{skip:!enabled,refetchOnMountOrArgChange:true});
  useEffect(()=>{if(enabled && !query.isFetching && (query.currentData || query.error))onSettled();},[enabled,query.isFetching,query.currentData,query.error,onSettled]);
  const alerts=query.error ? undefined : query.currentData?.alerts;
  if(!alerts)return <span className="compliance-badge compliance-badge-neutral" aria-label={query.error?'Alert count unavailable':'Checking alert count'}>{query.error?'Unavailable':'…'}</span>;
  const label=`${alerts.count}${alerts.complete?'':'+'} alert${alerts.count===1?'':'s'}`;
  return <span title={alerts.complete?'Compliance issues needing attention':'Known issues; some checks could not finish or are restricted'} aria-label={alerts.complete?label:`At least ${alerts.count} alerts; checks incomplete`}><ComplianceBadge tone={alerts.count?'danger':alerts.complete?'success':'warning'}>{label}</ComplianceBadge></span>;
}
export function WorkspaceReviewList({items,label,...scope}:WorkspaceScope & {items:ComplianceReviewItem[];label:string}) {
  // ponytail: check this bounded page two records at a time; reuse RTK results in the selected detail.
  const [finished,setFinished]=useState<Set<string>>(()=>new Set());
  return <ComplianceReviewList label={label} items={items.map((item,index)=>({...item,status:<AlertCount key={item.id} id={item.id} {...scope} enabled={index<finished.size+2} onSettled={()=>setFinished(previous=>previous.has(item.id)?previous:new Set([...previous,item.id]))}/>}))}/>;
}
export function StaffWorkspace(props:SourceProps) {
  const {view,agencyId,mode,scopeKey,onApply,onPage,onPrevious}=props;
  const query=useWorkspaceStaffQuery({agencyId,mode,scopeKey,search:view.search,employeeStatus:view.employeeStatus,cursor:view.cursor},{skip:!!view.employeeId,refetchOnMountOrArgChange:true});
  const data=visibleSourceData(query.currentData,query.error);
  return <section aria-label="Staff compliance" className="p-4 sm:p-6">
    <h2 className="text-xl font-bold">Staff compliance</h2>
    <p className="mt-2 text-sm text-[#5e7378]">Documents, training, CPR and client-specific requirements. Counts show issues needing attention. A + means some checks are incomplete.</p>
    {view.employeeId?<><Button variant="outline" className="my-4" onClick={()=>onApply({employeeId:undefined,cursor:undefined})}>All staff</Button><WorkspaceSummary key={view.employeeId} kind="staff" id={view.employeeId} {...{agencyId,mode,scopeKey}}/></>:<>
      <SourceFilters view={view} onApply={onApply} hideExpiry><Button type="button" variant="outline" disabled={query.isFetching} onClick={()=>void query.refetch()}>Refresh staff</Button></SourceFilters>
      <SourceNotice error={query.error} hasData={!!data} retry={query.refetch} reset={()=>onPage()}/>
      {query.isFetching && !data && <ComplianceSkeleton label="Loading staff compliance…"/>}
      {data && <><p className="text-sm text-[#5e7378]">{data.items.length} staff on this page. Select a person to view their checks together.</p>
      <WorkspaceReviewList key={`${scopeKey}:${mode}:${data.items.map(s=>s.id).join()}:${query.fulfilledTimeStamp}`} kind="staff" {...{agencyId,mode,scopeKey}} label="Staff compliance summaries" items={data.items.map(staff=>({id:staff.id,title:staff.name,subtitle:staff.status,meta:'Documents · Training · CPR · Client requirements',detail:<WorkspaceSummary key={staff.id} kind="staff" id={staff.id} {...{agencyId,mode,scopeKey}}/>}))}/>
      {!data.items.length && <p className="py-4">No matching staff on this page.</p>}
      <SourcePage cursor={view.cursor} next={data.nextCursor} loading={query.isFetching} onNext={()=>onPage(data.nextCursor!)} onPrevious={()=>onPrevious()}/></>}
    </>}
  </section>;
}
