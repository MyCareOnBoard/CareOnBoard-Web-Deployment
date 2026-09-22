import {ComplianceReviewList, ComplianceSkeleton, ComplianceBadge} from './CompliancePresentation';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {useGetClientChecklistPageQuery} from './api';
import {SourceNotice,SourcePage,visibleSourceData,type SourceProps} from './SourceControls';
import {useGetManualAuditsQuery,type AuditChecklist,type ManualAuditView} from './manualAuditApi';
import ManualAuditEditor from './ManualAuditEditor';

const views:{value:ManualAuditView;label:string}[]=[
  {value:'follow_up_needed',label:'Follow-up needed'}, {value:'recorded',label:'All recorded reviews'},
  {value:'drafts',label:'Drafts'}, {value:'discarded',label:'Discarded'},
];
const empty:Record<ManualAuditView,string>={follow_up_needed:'No open follow-ups found in this view.',recorded:'No recorded reviews found in this view.',drafts:'No drafts found in this view.',discarded:'No discarded drafts found in this view.'};

export default function ManualAuditsSection({view,scopeKey,agencyId,mode,onApply,onSelect,onPage,onPrevious}:SourceProps){
  const auditView=view.auditView||'follow_up_needed';
  const program=mode as 'ddd'|'hha';
  const [selection,setSelection]=useState('');
  const [pickerOpen,setPickerOpen]=useState(false);
  const [search,setSearch]=useState('');
  const [searchInput,setSearchInput]=useState('');
  const [clientCursors,setClientCursors]=useState<(string|undefined)[]>([undefined]);
  const [starting,setStarting]=useState<{clientId:string;correctsAuditId?:string;checklist?:AuditChecklist}|null>(null);
  const detailMode=!!view.auditId&&!starting;
  const query=useGetManualAuditsQuery({scopeKey,agencyId,program,view:auditView,clientId:view.clientId,cursor:view.cursor},
    {skip:detailMode||!!starting?.checklist,refetchOnFocus:true,refetchOnMountOrArgChange:true});
  const data=visibleSourceData(query.currentData,query.error);
  const clientQuery=useGetClientChecklistPageQuery({scopeKey,agencyId,mode:program,status:'active',limit:25,search:search||undefined,cursor:clientCursors.at(-1)},
    {skip:detailMode||!!starting||!pickerOpen,refetchOnMountOrArgChange:true});
  const clients=visibleSourceData(clientQuery.currentData,clientQuery.error);
  useEffect(()=>{if(starting&&!starting.checklist&&data&&!query.isFetching&&!query.error)setStarting({...starting,checklist:data.checklist});},[starting,data,query.isFetching,query.error]);
  const close=()=>{setStarting(null);onSelect({auditId:undefined,cursor:undefined});};
  if(detailMode||starting){
    const checklist=starting?.checklist;
    if(starting&&!checklist)return <section className="p-4 sm:p-6"><SourceNotice error={query.error} hasData={false} retry={()=>void query.refetch()} reset={close}/><ComplianceSkeleton label="Loading review questions…" detail={false}/><Button variant="outline" onClick={close}>Back to reviews</Button></section>;
    const clientId=starting?.clientId||view.clientId!;
    return <ManualAuditEditor key={JSON.stringify([scopeKey,clientId,starting?.correctsAuditId,starting?'new':view.auditId])}
      scopeKey={scopeKey} agencyId={agencyId} program={program} clientId={clientId}
      auditId={starting?undefined:view.auditId} correctsAuditId={starting?.correctsAuditId} checklist={starting?checklist:undefined}
      onClose={close} onSaved={auditId=>{setStarting(null);onSelect({clientId,auditId,cursor:undefined});}}
      onCorrect={auditId=>{setStarting({clientId,correctsAuditId:auditId});onSelect({clientId,auditId:undefined,cursor:undefined});}}/>;
  }
  return <section aria-label="Manual audits" className="p-4 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Manual audits</h2><p className="text-sm text-[#62686f]">Record client reviews and corrective follow-up.</p></div><Button variant="outline" disabled={query.isFetching} onClick={()=>void query.refetch()}>Refresh</Button></div>
    <div className="my-4 flex flex-wrap items-end gap-3">
      <label className="text-sm">View<select aria-label="Review view" className="mt-1 block min-h-11 rounded-xl border border-[#cccccd] bg-white px-3" value={auditView} onChange={e=>onApply({auditView:e.target.value as ManualAuditView,auditId:undefined})}>{views.map(v=><option key={v.value} value={v.value}>{v.label}</option>)}</select></label>
      {view.clientId?<Button variant="outline" onClick={()=>onApply({clientId:undefined,auditId:undefined})}>Show all clients</Button>:null}
    </div>
    <details onToggle={e=>setPickerOpen(e.currentTarget.open)} className="mb-5 rounded-xl border border-[#e5e5e6] p-4"><summary className="cursor-pointer font-semibold">Choose a client to start or filter reviews</summary>
      <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();setSearch(searchInput.trim());setClientCursors([undefined]);setSelection('');}}>
        <label className="text-sm">Client name<input aria-label="Client name" maxLength={100} className="mt-1 block min-h-11 rounded-xl border border-[#cccccd] px-3" value={searchInput} onChange={e=>setSearchInput(e.target.value)}/></label><Button variant="outline" type="submit">Find clients</Button>
      </form>
      <SourceNotice error={clientQuery.error} hasData={!!clients} retry={()=>void clientQuery.refetch()} reset={()=>{setSearch('');setSearchInput('');setClientCursors([undefined]);setSelection('');}}/>
      {clientQuery.isFetching && !clients && <ComplianceSkeleton label="Loading clients…" detail={false}/>}
      <label className="mt-3 block text-sm">Client<select aria-label="Client" disabled={!clients||clientQuery.isFetching} className="mt-1 block min-h-11 w-full rounded-xl border border-[#cccccd] bg-white px-3" value={selection} onChange={e=>setSelection(e.target.value)}><option value="">Select client</option>{clients?.items.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      {clients&&!clients.items.length?<p role="status" className="mt-2 text-sm">{clients.nextCursor?'No accessible clients on this page. Continue to the next page.':'No active clients found.'}</p>:null}
      <div className="mt-3 flex flex-wrap gap-2"><Button disabled={!selection||!data?.checklist||clientQuery.isFetching} onClick={()=>setStarting({clientId:selection,checklist:data!.checklist})}>Start review</Button><Button variant="outline" disabled={!selection||!clients||clientQuery.isFetching} onClick={()=>onApply({clientId:selection,auditId:undefined})}>Filter reviews</Button></div>
      <SourcePage cursor={clientCursors.at(-1)} next={clients?.nextCursor} loading={clientQuery.isFetching} onNext={()=>{if(clients?.nextCursor){setClientCursors([...clientCursors,clients.nextCursor]);setSelection('');}}} onPrevious={()=>{setClientCursors(clientCursors.slice(0,-1));setSelection('');}}/>
    </details>
    <SourceNotice error={query.error} hasData={!!data} retry={()=>void query.refetch()} reset={()=>onApply({auditView:'follow_up_needed',clientId:undefined,auditId:undefined})}/>
    {!data&&query.isFetching?<ComplianceSkeleton label="Loading manual audits…"/>:null}
    {data?<><p className="text-sm text-[#62686f]">As of {new Date(data.evaluatedAt).toLocaleString()}</p><ComplianceReviewList label="Manual audit findings" items={data.items.map(item => ({
      id:item.auditId, title:item.clientName||item.clientId, subtitle:<span className="capitalize">{item.state}</span>,
      status:<ComplianceBadge tone={item.openFollowUpCount?'warning':'neutral'}>{item.openFollowUpCount?`${item.openFollowUpCount} open`:'No open follow-ups'}</ComplianceBadge>,
      meta:item.observedOn?`Observed on ${item.observedOn}`:'Observation date not set',
      detail:<><h3>{item.clientName||item.clientId}</h3>{item.recordedBy?<p className="text-sm text-[#5e7378]">Recorded by {item.recordedBy.displayName}</p>:null}
      <p className="mt-5 font-semibold">{item.openFollowUpCount?`Follow-up needed · ${item.openFollowUpCount} open`:'No open follow-ups'}</p>{item.earliestOpenDueOn?<p className="text-sm">{item.localDate&&item.earliestOpenDueOn<item.localDate?'Overdue':item.earliestOpenDueOn===item.localDate?'Due today':'Due'} · {item.earliestOpenDueOn}</p>:null}
      <div className="compliance-actions"><Button className="compliance-primary" onClick={()=>onSelect({clientId:item.clientId,auditId:item.auditId,cursor:undefined})}>Open review</Button></div></>,
    }))}/>{!data.items.length?<p className="py-6">{data.nextCursor?'No accessible reviews on this page. Continue to the next page.':empty[auditView]}</p>:null}
    {auditView==='follow_up_needed'&&!data.items.length&&!data.nextCursor?<Button variant="outline" onClick={()=>onApply({auditView:'recorded'})}>View all recorded reviews</Button>:null}
    <SourcePage cursor={view.cursor} next={data.nextCursor} loading={query.isFetching} onNext={()=>onPage(data.nextCursor!)} onPrevious={()=>onPrevious()}/></>:null}
  </section>;
}
