import {ComplianceSkeleton} from './CompliancePresentation';
import {useEffect, useRef, useState} from 'react';
import {useBlocker} from 'react-router';
import {Button} from '@/components/ui/button';
import {useToast} from '@/hooks/use-toast';
import CustomDatePicker from '@/components/ui/datePicker';
import {SourcePage} from './SourceControls';
import {
  downloadManualAuditEvidence, useChangeManualAuditMutation, useCreateManualAuditMutation,
  useExcludeManualAuditEvidenceMutation, useGetManualAuditQuery, useGetManualAuditAssigneesQuery,
  useGetManualAuditHistoryQuery, useUploadManualAuditEvidenceMutation,
  type AuditAnswerValue, type AuditChecklist, type AuditQuestionKey, type ManualAudit,
  type ManualAuditAck, type ManualAuditWrite,
} from './manualAuditApi';

export type ManualAuditEditorProps = {
  scopeKey:string; agencyId:string; program:'ddd'|'hha'; clientId:string; auditId?:string;
  correctsAuditId?:string; checklist?:AuditChecklist; onClose:()=>void;
  onSaved:(auditId:string)=>void; onCorrect?:(auditId:string)=>void;
};
type Draft = Pick<ManualAudit,'observedOn'|'context'|'answers'|'followUps'>;
type Upload = {file:File; requestId:string; targetKind:'question'|'follow_up'; questionKey:AuditQuestionKey; basedOn:number};
type Reload = {minimum:number; success:string; preserve?:{draft:Draft; base:number; first:number}};
const blank = (checklist:AuditChecklist):Draft => ({observedOn:null, context:'',
  answers:Object.fromEntries(checklist.questions.map(q=>[q.key,{answer:null,basis:''}])) as Draft['answers'],
  followUps:Object.fromEntries(checklist.questions.map(q=>[q.key,null])),
});
const toDraft = (review:ManualAudit):Draft => ({observedOn:review.observedOn,context:review.context,answers:review.answers,followUps:review.followUps});
const toDate = (value:string|null|undefined) => value ? new Date(`${value}T12:00:00`) : null;
const dateKey = (value:Date|null) => value ? `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}` : null;
const errorStatus = (error:unknown) => (error as {status?:number|string})?.status;
const errorCode = (error:unknown) => (error as {data?:{code?:string}})?.data?.code;
const errorText = (error:unknown) => (error as {data?:{error?:string}})?.data?.error || 'We could not complete this action. Try again.';
const accessError = (error:unknown) => [401,403,404].includes(Number(errorStatus(error)));
const conflictText = 'The saved review has changed. Load the latest version before saving again.';
const unknownText = "We couldn't confirm whether your changes were saved. Load the latest review before trying again.";
const reloadText = 'Changes saved. The updated review could not be loaded.';
const answerLabels = {meets_check:'Meets check',needs_action:'Needs action',not_checked:'Not checked',not_applicable:'Not applicable'};
const answerHelp = {
  meets_check:'The item was checked and met the stated basis at the observation date.',
  needs_action:'The check found a concern, including confirmed missing information or instructions.',
  not_checked:'A result could not be established. This requires follow-up.',
  not_applicable:'Explain why the item is outside this review’s scope.',
};
const fieldClass = 'mt-1 block min-h-11 w-full rounded-xl border border-[#cccccd] bg-white p-3';
const savedDraft = (draft:Draft):Draft => ({...draft,
  answers:Object.fromEntries(Object.entries(draft.answers).map(([key,value])=>[key,{answer:value.answer||null,basis:value.basis}])) as Draft['answers'],
  followUps:Object.fromEntries(Object.entries(draft.followUps).map(([key,value])=>[key,value ? {actionText:value.actionText,ownerUid:value.ownerUid||null,dueOn:value.dueOn||null} : null])),
});

export default function ManualAuditEditor(p:ManualAuditEditorProps) {
  const {toast}=useToast();
  const scope=JSON.stringify([p.scopeKey,p.agencyId,p.program,p.clientId,p.auditId]);
  const currentScope=useRef(scope); currentScope.current=scope;
  const [stateScope,setStateScope]=useState(scope);
  const [accessLost,setAccessLost]=useState(false);
  const args={scopeKey:p.scopeKey,agencyId:p.agencyId,program:p.program,clientId:p.clientId,auditId:p.auditId||''};
  const detail=useGetManualAuditQuery(args,{skip:!p.auditId||accessLost,refetchOnFocus:true});
  const original=detail.currentData;
  const checklist=p.auditId ? original?.checklist : p.checklist;
  const [draft,setDraft]=useState<Draft|null>(()=>p.checklist?blank(p.checklist):null);
  const [baseRevision,setBaseRevision]=useState<number|null>(null);
  const [dirty,setDirty]=useState(false);
  const [comparison,setComparison]=useState<Draft|null>(null);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [conflict,setConflict]=useState(false);
  const [working,setWorking]=useState(false);
  const [reloadPending,setReloadPending]=useState<Reload|null>(null);
  const [createRecovery,setCreateRecovery]=useState<ManualAuditWrite|null>(null);
  const [uploadRecovery,setUploadRecovery]=useState<Upload|null>(null);
  const [target,setTarget]=useState('question:medication_storage');
  const [ownersOpen,setOwnersOpen]=useState(false);
  const [ownerCursors,setOwnerCursors]=useState<(string|undefined)[]>([undefined]);
  const [historyOpen,setHistoryOpen]=useState(false);
  const [historyCursors,setHistoryCursors]=useState<(string|undefined)[]>([undefined]);
  const assignees=useGetManualAuditAssigneesQuery({...args,cursor:ownerCursors.at(-1)},{skip:!ownersOpen||accessLost});
  const history=useGetManualAuditHistoryQuery({...args,cursor:historyCursors.at(-1)},{skip:!p.auditId||!historyOpen||accessLost});
  const [create,createState]=useCreateManualAuditMutation();
  const [change,changeState]=useChangeManualAuditMutation();
  const [upload,uploadState]=useUploadManualAuditEvidenceMutation();
  const [exclude,excludeState]=useExcludeManualAuditEvidenceMutation();
  const downloads=useRef<AbortController|null>(null);
  const alertRef=useRef<HTMLDivElement|null>(null);
  const busy=working||!!reloadPending||conflict||!!createRecovery||!!uploadRecovery;
  const recorded=original?.state==='recorded';
  const discarded=original?.state==='discarded';
  const allowNavigation=useRef(false);
  const leave=(action:()=>void)=>{allowNavigation.current=true;action();};
  const blocker=useBlocker(({nextLocation})=>{
    const nextMode=new URLSearchParams(nextLocation.search).get('mode');
    return !allowNavigation.current&&!accessLost&&stateScope===scope&&
      !(nextMode&&nextMode!==p.program)&&!!(dirty||createRecovery||uploadRecovery);
  });
  useEffect(()=>{
    if(blocker.state==='blocked'){
      if(confirm('Discard unsaved changes and leave this review?'))blocker.proceed();
      else blocker.reset();
    }
  },[blocker]);

  useEffect(()=>{
    currentScope.current=scope;allowNavigation.current=false;
    setStateScope(scope); setAccessLost(false); setDraft(p.auditId?null:(p.checklist?blank(p.checklist):null));
    setBaseRevision(null); setDirty(false); setComparison(null); setError(''); setNotice('');
    setConflict(false); setWorking(false); setReloadPending(null); setCreateRecovery(null); setUploadRecovery(null);
    setOwnersOpen(false); setOwnerCursors([undefined]); setHistoryOpen(false); setHistoryCursors([undefined]);
    return ()=>{currentScope.current=''; downloads.current?.abort(); createState.reset(); changeState.reset(); uploadState.reset(); excludeState.reset();};
  },[scope]);
  useEffect(()=>{if(error)alertRef.current?.focus();},[error]);
  useEffect(()=>{
    if(!dirty&&!createRecovery&&!uploadRecovery)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);
    return ()=>window.removeEventListener('beforeunload',warn);
  },[dirty,createRecovery,uploadRecovery]);
  useEffect(()=>{
    if(accessLost||!original||working||reloadPending||conflict)return;
    if(dirty){
      if(baseRevision!==null&&original.revision!==baseRevision){setComparison(draft);setConflict(true);setError(conflictText);}
      return;
    }
    setDraft(toDraft(original)); setBaseRevision(original.revision);
  },[original,dirty,working,reloadPending,conflict,accessLost]);
  useEffect(()=>{if(!p.auditId&&checklist&&!draft&&!accessLost)setDraft(blank(checklist));},[p.auditId,checklist,draft,accessLost]);
  const loseAccess=()=>{
    setAccessLost(true);setDraft(null);setComparison(null);setCreateRecovery(null);setUploadRecovery(null);
    setReloadPending(null);setConflict(false);setOwnersOpen(false);setHistoryOpen(false);downloads.current?.abort();leave(p.onClose);
  };
  useEffect(()=>{if(accessError(detail.error)||accessError(history.error)||accessError(assignees.error))loseAccess();},[detail.error,history.error,assignees.error]);
  const update=(next:Draft)=>{setDraft(next);setDirty(true);setNotice('');};
  const adopt=(value:ManualAudit)=>{setDraft(toDraft(value));setBaseRevision(value.revision);setDirty(false);setConflict(false);};
  const fail=(e:unknown)=>{
    if(accessError(e)){loseAccess();return;}
    if(errorStatus(e)===409){setComparison(draft);setConflict(true);setError(conflictText);return;}
    const status=errorStatus(e);
    if(typeof status!=='number'||status>=500){setComparison(draft);setConflict(true);setError(unknownText);return;}
    setError(errorText(e));
  };
  const reconcile=async(plan:Reload,started=scope)=>{
    setWorking(true);
    try {
      const latest=await detail.refetch().unwrap();
      if(started!==currentScope.current)return;
      if(latest.revision<plan.minimum)throw new Error('Review reload is older than the acknowledged write.');
      setReloadPending(null);
      if(plan.preserve){
        const saved=plan.preserve;
        if(saved.first===saved.base+1&&latest.revision===saved.first){
          setDraft(saved.draft);setBaseRevision(latest.revision);setDirty(true);setError('');setNotice(plan.success);
        }else{setDraft(saved.draft);setComparison(saved.draft);setDirty(true);setConflict(true);setError(conflictText);}
      }else{adopt(latest);setError('');setNotice(plan.success);}
    }catch(e){if(started!==currentScope.current)return;if(accessError(e))loseAccess();else{setReloadPending(plan);setError(reloadText);}}
    finally{if(started===currentScope.current)setWorking(false);}
  };
  const loadLatest=async()=>{
    const started=scope;setWorking(true);
    try{const latest=await detail.refetch().unwrap();if(started!==currentScope.current)return;adopt(latest);setReloadPending(null);setUploadRecovery(null);setError('');}
    catch(e){if(started!==currentScope.current)return;if(accessError(e))loseAccess();else setError('The latest review could not be loaded. Try again.');}
    finally{if(started===currentScope.current)setWorking(false);}
  };
  const commit=async(write:()=>Promise<ManualAuditAck>,success:string,preserve=false)=>{
    const started=scope;setWorking(true);setError('');setNotice('');
    try{
      const ack=await write();if(started!==currentScope.current)return;
      const plan:Reload={minimum:ack.revision,success,...(preserve&&dirty&&draft&&baseRevision!==null?{preserve:{draft,base:baseRevision,first:ack.revision}}:{})};
      setReloadPending(plan);await reconcile(plan,started);
    }catch(e){if(started===currentScope.current)fail(e);}
    finally{if(started===currentScope.current)setWorking(false);}
  };
  const save=async(action:'save_draft'|'record',replay=false)=>{
    if(!draft)return;
    if(p.auditId){await commit(()=>change({...args,body:{action,...savedDraft(draft),expectedRevision:baseRevision!}}).unwrap(),action==='record'?'Review recorded. Answers are now locked.':'Draft saved.');return;}
    const started=scope;
    const body=replay&&createRecovery?createRecovery:{action,...savedDraft(draft),requestId:crypto.randomUUID(),correctsAuditId:p.correctsAuditId||null};
    setWorking(true);setError('');setCreateRecovery(body);
    try{const ack=await create({...args,body}).unwrap();if(started!==currentScope.current)return;setCreateRecovery(null);toast({title:replay?'Saved review found.':action==='record'?'Review recorded. Answers are now locked.':'Draft saved.',variant:'success'});leave(()=>p.onSaved(ack.auditId));}
    catch(e){if(started!==currentScope.current)return;if(accessError(e)){loseAccess();return;}const status=errorStatus(e);if(typeof status==='number'&&status<500){setCreateRecovery(null);setError(errorText(e));}else setError(unknownText);}
    finally{if(started===currentScope.current)setWorking(false);}
  };
  const transition=(body:ManualAuditWrite)=>{
    const discardsEdits=dirty&&draft&&Object.entries(draft.followUps).some(([key,value])=>
      (body.action==='resolve_follow_up'||key!==body.questionKey)&&JSON.stringify(value)!==JSON.stringify(original?.followUps[key as AuditQuestionKey]));
    if(recorded&&discardsEdits&&!confirm('This action will discard other unsaved follow-up edits. Continue?'))return;
    return commit(()=>change({...args,body:{...body,expectedRevision:baseRevision!}}).unwrap(),body.action==='resolve_follow_up'?'Follow-up resolved.':body.action==='discard'?'Draft discarded.':'Follow-up saved.');
  };
  const setAnswer=(key:AuditQuestionKey,answer:AuditAnswerValue|null)=>{
    if(!draft)return;const finding=answer==='needs_action'||answer==='not_checked';
    if(draft.followUps[key]?.actionText&&!finding&&!confirm('Changing this answer clears the corrective action. Continue?'))return;
    update({...draft,answers:{...draft.answers,[key]:{...draft.answers[key],answer}},followUps:{...draft.followUps,[key]:finding?(draft.followUps[key]||{actionText:'',ownerUid:null,dueOn:null}):null}});
  };
  const setFollow=(key:AuditQuestionKey,field:'actionText'|'ownerUid'|'dueOn',value:string|null)=>{
    if(draft)update({...draft,followUps:{...draft.followUps,[key]:{actionText:'',ownerUid:null,dueOn:null,...draft.followUps[key],[field]:value,...(field==='ownerUid'?{owner:assignees.currentData?.items.find(owner=>owner.uid===value)}:{})}}});
  };
  const runUpload=async(file:File,retry?:Upload)=>{
    if(baseRevision===null||!p.auditId)return;
    const started=scope;const [targetKind,questionKey]=target.split(':') as ['question'|'follow_up',AuditQuestionKey];
    const request=retry||{file,requestId:crypto.randomUUID(),targetKind,questionKey,basedOn:baseRevision};
    const formData=new FormData();
    for(const [key,value] of Object.entries({requestId:request.requestId,expectedRevision:String(request.basedOn),targetKind:request.targetKind,questionKey:request.questionKey}))formData.append(key,value);
    formData.append('file',request.file);setWorking(true);setError('');
    try{
      const ack=await upload({...args,formData}).unwrap();if(started!==currentScope.current)return;setUploadRecovery(null);
      const plan:Reload={minimum:ack.revision,success:'Evidence added.',...(dirty&&draft?{preserve:{draft,base:request.basedOn,first:ack.evidence!.attachedAtRevision}}:{})};
      setReloadPending(plan);await reconcile(plan,started);
    }catch(e){if(started!==currentScope.current)return;if(accessError(e)){loseAccess();return;}const status=errorStatus(e);if(typeof status==='number'&&status<500){setUploadRecovery(null);fail(e);}else{setUploadRecovery(request);setError('Upload could not be confirmed. Retry upload with the same file and request.');}}
    finally{if(started===currentScope.current)setWorking(false);}
  };
  const download=async(file:ManualAudit['evidence'][number])=>{
    downloads.current?.abort();const controller=new AbortController();downloads.current=controller;const started=scope;
    try{const blob=await downloadManualAuditEvidence({...args,evidenceId:file.evidenceId},controller.signal);if(controller.signal.aborted||started!==currentScope.current)return;const url=URL.createObjectURL(blob);try{const a=document.createElement('a');a.href=url;a.download=file.displayName;a.click();}finally{URL.revokeObjectURL(url);}}
    catch(e){if(controller.signal.aborted||started!==currentScope.current)return;if(errorCode(e)==='MANUAL_AUDIT_EVIDENCE_UNAVAILABLE')setError('Evidence unavailable');else if(accessError(e))loseAccess();else setError(errorText(e));}
  };
  const files=original?.evidence||[];
  const writableTargets=checklist?.questions.flatMap(q=>!p.auditId||original?.state==='draft'?[`question:${q.key}`]:original?.followUps[q.key]?.state==='open'?[`follow_up:${q.key}`]:[])||[];
  const targetKey=writableTargets.join(',');
  useEffect(()=>{if(!writableTargets.includes(target))setTarget(writableTargets[0]||'');},[targetKey,target]);
  const targetCount=files.filter(file=>`${file.targetKind}:${file.questionKey}`===target).length;
  const targets=checklist?.questions.map(q=>({key:q.key,text:q.text}))||[];
  const historyText=(value:unknown):string=>{
    if(value==null)return 'Not set';
    if(typeof value==='string')return files.find(f=>f.evidenceId===value)?.displayName||value.replace(/^(meets_check|needs_action|not_checked|not_applicable)$/,(key)=>answerLabels[key as AuditAnswerValue]);
    if(typeof value!=='object')return String(value);
    if(Array.isArray(value))return value.map(historyText).join(', ')||'None';
    const record=value as Record<string,unknown>;
    if(typeof record.displayName==='string')return record.displayName;
    const labels:Record<string,string>={observedOn:'Observed on',context:'Context',state:'State',answers:'Answers',followUps:'Follow-ups',answer:'Answer',basis:'Observation and basis',actionText:'Action',owner:'Owner',dueOn:'Due date',resolution:'Resolution',resolvedBy:'Resolved by',resolvedAt:'Resolved at',recordedBy:'Recorded by',recordedAt:'Recorded at',discardReason:'Discard reason',evidenceSlots:'Evidence',question:'Questions',follow_up:'Follow-ups'};
    return Object.entries(record).flatMap(([key,item])=>{const label=targets.find(q=>q.key===key)?.text||labels[key];return label?[`${label}: ${historyText(item)}`]:[];}).join('\n')||'No additional details';
  };
  if(stateScope!==scope)return <section className="p-4 sm:p-6"><ComplianceSkeleton label="Loading review…" detail={false}/></section>;
  if(accessLost)return <section className="p-4 sm:p-6"><p role="alert">You do not have access to these records. Ask your agency administrator.</p></section>;
  if(!checklist||!draft)return <section className="p-4 sm:p-6">{detail.error?<><p role="alert">{errorText(detail.error)}</p><Button variant="outline" onClick={()=>void detail.refetch()}>Retry loading</Button></>:<ComplianceSkeleton label="Loading review…" detail={false}/>}<Button variant="outline" onClick={p.onClose}>Close</Button></section>;
  return <section className="p-4 sm:p-6" aria-label="Manual audit editor">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold">{p.auditId?'Manual review':'Start review'}</h2>
      {original?<p className="text-sm capitalize">{original.state} · Revision {original.revision}</p>:null}
      {original?.evaluatedAt?<p className="text-sm text-[#62686f]">As of {new Date(original.evaluatedAt).toLocaleString()}</p>:null}
      {original?.recordedBy?<p className="text-sm">Recorded by {original.recordedBy.displayName} · Recorded at {original.recordedAt?new Date(original.recordedAt).toLocaleString():'Not available'}</p>:null}
      {p.correctsAuditId||original?.correctsAuditId?<p className="text-sm">Corrects an earlier recorded review. Its follow-ups remain unchanged.</p>:null}
    </div><div className="flex gap-2">{recorded&&p.auditId&&p.onCorrect?<Button variant="outline" disabled={busy} onClick={()=>{if(!dirty||confirm('Discard unsaved follow-up edits and start a correction?'))leave(()=>p.onCorrect!(p.auditId!));}}>Correct review</Button>:null}<Button variant="outline" onClick={()=>{if(!(dirty||createRecovery||uploadRecovery)||confirm('Discard unsaved changes and close?'))leave(p.onClose);}}>Close</Button></div></div>
    {error?<div ref={alertRef} tabIndex={-1} role="alert" className="my-3 text-sm text-[#b54708]">{error}
      {conflict?<Button variant="outline" disabled={working} onClick={()=>void loadLatest()}>Load latest review</Button>:null}
      {reloadPending?<Button variant="outline" disabled={working} onClick={()=>void reconcile(reloadPending)}>Retry loading</Button>:null}
      {createRecovery?<Button variant="outline" disabled={working} onClick={()=>void save(createRecovery.action as 'save_draft'|'record',true)}>Check saved review</Button>:null}
      {uploadRecovery?<Button variant="outline" disabled={working} onClick={()=>void runUpload(uploadRecovery.file,uploadRecovery)}>Retry upload</Button>:null}
    </div>:null}
    {notice?<p role="status" className="my-3 text-sm">{notice}</p>:null}
    {comparison?<details className="my-3 rounded-xl border p-3"><summary>Your unsaved changes for comparison</summary><p className="whitespace-pre-wrap text-sm">{historyText(comparison)}</p></details>:null}
    <div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="text-sm">Observed on{recorded||discarded?<p>{draft.observedOn||'Not set'}</p>:<CustomDatePicker ariaLabel="Observed on" disabled={busy} date={toDate(draft.observedOn)} setDate={value=>update({...draft,observedOn:dateKey(value)})} endMonth={new Date()}/>}</div><label className="text-sm">Location or context<textarea aria-label="Location or context" maxLength={500} disabled={recorded||discarded||busy} className={`${fieldClass} min-h-24`} value={draft.context} onChange={e=>update({...draft,context:e.target.value})}/></label></div>
    <div className="mt-5 space-y-4">{checklist.questions.map(q=>{
      const answer=draft.answers[q.key],follow=draft.followUps[q.key],saved=original?.followUps[q.key];
      const availability=saved?.ownerUid?original?.ownerAvailability?.[saved.ownerUid]:undefined;
      const choices=assignees.currentData?.items||[];
      return <fieldset key={q.key} disabled={discarded||busy} className="rounded-2xl border border-[#e5e5e6] bg-white p-4"><legend className="px-2 font-semibold">{q.text}</legend><p className="text-sm text-[#62686f]">{q.help}</p>
        <label className="mt-3 block text-sm">Answer<select aria-label={`${q.text} answer`} disabled={recorded} className={fieldClass} value={answer.answer||''} onChange={e=>setAnswer(q.key,(e.target.value||null) as AuditAnswerValue|null)}><option value="">Select answer</option>{Object.entries(answerLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        {answer.answer?<p className="mt-1 text-sm">{answerHelp[answer.answer]}</p>:null}
        <label className="mt-3 block text-sm">Observation and basis<textarea aria-label={`${q.text} observation and basis`} disabled={recorded} maxLength={2000} className={`${fieldClass} min-h-24`} value={answer.basis} onChange={e=>update({...draft,answers:{...draft.answers,[q.key]:{...answer,basis:e.target.value}}})}/></label>
        {follow?<div className="mt-3 grid gap-3 sm:grid-cols-3">
          {saved?.state?<div className="text-sm sm:col-span-3"><p>{saved.state==='resolved'?'Resolved':'Open'}{saved.state==='open'&&saved.dueOn&&original?.localDate?` · ${saved.dueOn<original.localDate?'Overdue':saved.dueOn===original.localDate?'Due today':`Due ${saved.dueOn}`}`:''}</p>
            {saved.state==='open'&&availability!==true?<p role="status" className="text-[#b54708]">{availability===false?'Owner needs reassignment':'Owner availability could not be checked'}</p>:null}
            {saved.state==='resolved'?<><p className="whitespace-pre-wrap">Resolution: {saved.resolution}</p><p>Resolved by {saved.resolvedBy?.displayName||'Agency reviewer'}{saved.resolvedAt?` at ${new Date(saved.resolvedAt).toLocaleString()}`:''}</p><p>Choose an owner and due date below to reopen this follow-up.</p></>:null}
          </div>:null}
          <label className="text-sm sm:col-span-3">Corrective action<textarea aria-label={`${q.text} corrective action`} readOnly={recorded&&saved?.state==='resolved'} maxLength={2000} className={`${fieldClass} min-h-20`} value={follow.actionText} onChange={e=>setFollow(q.key,'actionText',e.target.value)}/></label>
          <label className="text-sm">Owner<select aria-label={`${q.text} owner`} className={fieldClass} value={follow.ownerUid||''} onFocus={()=>setOwnersOpen(true)} onChange={e=>setFollow(q.key,'ownerUid',e.target.value||null)}><option value="">Select owner</option>{follow.ownerUid&&!choices.some(owner=>owner.uid===follow.ownerUid)?<option value={follow.ownerUid}>{follow.owner?.displayName||saved?.owner?.displayName||'Current owner'}</option>:null}{choices.map(owner=><option key={owner.uid} value={owner.uid}>{owner.displayName}</option>)}</select></label>
          <div className="text-sm sm:col-span-2">Due date<CustomDatePicker ariaLabel={`${q.text} due date`} disabled={busy} date={toDate(follow.dueOn)} setDate={value=>setFollow(q.key,'dueOn',dateKey(value))} endMonth={new Date(new Date().getFullYear()+5,11,31)}/></div>
          {recorded&&saved?.state==='open'?<div className="sm:col-span-3 flex flex-wrap gap-2"><Button variant="outline" onClick={()=>{const resolution=prompt('Resolution note');if(resolution)void transition({action:'resolve_follow_up',questionKey:q.key,resolution});}}>Resolve follow-up</Button><Button variant="outline" disabled={!follow.ownerUid||!follow.dueOn} onClick={()=>{const reason=prompt('Reason for changing this follow-up');if(reason&&follow.ownerUid&&follow.dueOn)void transition({action:'update_follow_up',questionKey:q.key,actionText:follow.actionText,ownerUid:follow.ownerUid,dueOn:follow.dueOn,reason});}}>Update follow-up</Button></div>:null}
          {recorded&&saved?.state==='resolved'?<Button variant="outline" disabled={!follow.ownerUid||!follow.dueOn} onClick={()=>{const reason=prompt('Reason for reopening this follow-up');if(reason&&follow.ownerUid&&follow.dueOn)void transition({action:'reopen_follow_up',questionKey:q.key,ownerUid:follow.ownerUid,dueOn:follow.dueOn,reason});}}>Reopen follow-up</Button>:null}
        </div>:null}
      </fieldset>;
    })}</div>
    {ownersOpen?<div className="mt-3"><p className="text-sm">Follow-up owners</p>{assignees.error?<p role="alert">Owners could not be loaded. <Button variant="outline" onClick={()=>void assignees.refetch()}>Retry owners</Button></p>:null}<SourcePage cursor={ownerCursors.at(-1)} next={assignees.currentData?.nextCursor} loading={assignees.isFetching||busy} onNext={()=>{if(assignees.currentData?.nextCursor)setOwnerCursors([...ownerCursors,assignees.currentData.nextCursor]);}} onPrevious={()=>setOwnerCursors(ownerCursors.slice(0,-1))}/></div>:null}
    {!recorded&&!discarded?<><p className="mt-4 text-sm">Recording locks these answers. Follow-up actions can still be updated.</p><div className="mt-3 flex flex-wrap gap-2"><Button disabled={busy} variant="outline" onClick={()=>void save('save_draft')}>Save draft</Button><Button disabled={busy} onClick={()=>void save('record')}>Record review</Button>{p.auditId?<Button disabled={busy} variant="outline" onClick={()=>{const reason=prompt('Why are you discarding this draft?');if(reason)void transition({action:'discard',reason});}}>Discard draft</Button>:null}</div></>:null}
    {p.auditId?<div className="mt-6 border-t pt-5"><h3 className="font-semibold">Evidence</h3><p className="text-sm text-[#62686f]">Up to 5 files, 10 MiB each. Excluded files still count.</p>
      {writableTargets.length?<div className="my-2 flex flex-wrap gap-3"><select aria-label="Evidence target" disabled={busy} value={target} onChange={e=>setTarget(e.target.value)} className={fieldClass}>{writableTargets.map(value=>{const [kind,key]=value.split(':');return <option key={value} value={value}>{checklist.questions.find(q=>q.key===key)?.text}{kind==='follow_up'?' — follow-up':''}</option>;})}</select><input aria-label="Add evidence" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy||targetCount>=5} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void runUpload(file);}}/><p className="text-sm">{targetCount} of 5 lifetime file slots used for this item.</p></div>:<p className="text-sm">Evidence is read-only for recorded questions and resolved follow-ups.</p>}
      <ul className="space-y-3">{files.map(file=>{
        const editable=!file.excludedAt&&(file.targetKind==='question'?original?.state==='draft':original?.state==='recorded'&&original.followUps[file.questionKey]?.state==='open');
        return <li key={file.evidenceId} className="rounded-xl border p-3"><p>{file.excludedAt?'Excluded: ':''}{file.displayName}</p><p className="text-sm">{checklist.questions.find(q=>q.key===file.questionKey)?.text}{file.targetKind==='follow_up'?' — follow-up':''}</p><p className="text-sm text-[#62686f]">Added by {file.uploadedBy?.displayName||'Agency reviewer'} at {new Date(file.uploadedAt).toLocaleString()}</p>{file.excludedReason?<p className="text-sm">Exclusion reason: {file.excludedReason}</p>:null}<div className="mt-2 flex flex-wrap gap-2"><Button variant="outline" onClick={()=>void download(file)}>Download</Button>{editable?<Button variant="outline" disabled={busy} onClick={()=>{const reason=prompt('Why should this evidence be excluded?');if(reason&&baseRevision)void commit(()=>exclude({...args,evidenceId:file.evidenceId,expectedRevision:baseRevision,reason}).unwrap(),'Evidence excluded.',true);}}>Exclude</Button>:null}</div></li>;
      })}</ul>
    </div>:<p className="mt-5 text-sm">Save a draft before adding files.</p>}
    {p.auditId?<div className="mt-6 border-t pt-5"><Button variant="outline" onClick={()=>setHistoryOpen(!historyOpen)}>{historyOpen?'Hide history':'Show history'}</Button>
      {historyOpen?<>{history.error?<p role="alert">History could not be loaded. <Button variant="outline" onClick={()=>void history.refetch()}>Retry history</Button></p>:null}{history.isFetching&&!history.currentData?<ComplianceSkeleton label="Loading history…" detail={false}/>:null}<ul className="mt-3 space-y-2">{history.currentData?.items.map(event=><li key={event.revision}><details className="rounded-xl border p-3"><summary className="cursor-pointer">Revision {event.revision}: {event.action.replaceAll('_',' ')} · {event.actor?.displayName||'Agency reviewer'} · {new Date(event.at).toLocaleString()}</summary>{event.reason?<p className="mt-2 text-sm">Reason: {event.reason}</p>:null}{event.evidenceId?<p className="text-sm">Evidence: {files.find(file=>file.evidenceId===event.evidenceId)?.displayName||'Evidence attachment'}</p>:null}{event.evidenceIds?.length?<p className="text-sm">Evidence captured: {event.evidenceIds.map(id=>files.find(file=>file.evidenceId===id)?.displayName||'Evidence attachment').join(', ')}</p>:null}{Object.entries(event.changes||{}).map(([key,raw])=>{const value=raw as {before:unknown;after:unknown};return <div key={key} className="mt-3 text-sm"><p className="font-semibold">{key==='review'?'Review':key.replace(/([A-Z])/g,' $1')}</p><p className="whitespace-pre-wrap">Before: {historyText(value.before)}</p><p className="whitespace-pre-wrap">After: {historyText(value.after)}</p></div>;})}</details></li>)}</ul><SourcePage cursor={historyCursors.at(-1)} next={history.currentData?.nextCursor} loading={history.isFetching} onNext={()=>{if(history.currentData?.nextCursor)setHistoryCursors([...historyCursors,history.currentData.nextCursor]);}} onPrevious={()=>setHistoryCursors(historyCursors.slice(0,-1))}/></>:null}
    </div>:null}
  </section>;
}
