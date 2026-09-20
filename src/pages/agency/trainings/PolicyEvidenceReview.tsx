import {useRef,useState,useEffect} from 'react';
import axiosClient from '@/lib/axios';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {ConfirmDialog,ConfirmDialogContent} from '@/components/ui/confirm-dialog';
import {TrainingDateField} from './TrainingPolicyFields';
import {usePolicyEvidenceMutation,type TrainingData} from './trainingApi';
type Evidence={id:string;trainingId?:string;fileName?:string;completedOnDate?:string;printedExpiryDate?:string|null;decision?:string;reason?:string;certificateId?:string};
export default function PolicyEvidenceReview({training,onChanged,readOnly=false}: {training:TrainingData;onChanged:()=>void;readOnly?:boolean}) {
 readOnly = readOnly || training.policyContextState !== 'current';
 const [mutate,{isLoading}]=usePolicyEvidenceMutation(), [reason,setReason]=useState(''), [success,setSuccess]=useState(''), [error,setError]=useState(''), [revoke,setRevoke]=useState(false);
 const [picker,setPicker]=useState<'training_certificate'|'employee_document'|'certificates'|'reviews'|'applicability'|null>(null),[items,setItems]=useState<Evidence[]>([]),[cursor,setCursor]=useState<string|null>(null),[loading,setLoading]=useState(false);
 const [chosen,setChosen]=useState<Evidence|null>(null),[completed,setCompleted]=useState(''),[expiry,setExpiry]=useState('');
 const request=useRef<AbortController|null>(null), linkRequest=useRef(crypto.randomUUID());
 useEffect(()=>()=>request.current?.abort(),[training.id]);
 const list=async(kind:NonNullable<typeof picker>,next?:string)=>{
   request.current?.abort();const controller=new AbortController();request.current=controller;setPicker(kind);setLoading(true);setError('');if(!next){setItems([]);setChosen(null);}
   try{const history=kind==='certificates'||kind==='reviews'||kind==='applicability';const {data}=await axiosClient.get<{items:Evidence[];nextCursor:string|null}>('/'+(history?'employees':'agencies')+'/trainings/'+training.id+'/'+(history?'history':'evidence-options'),{params:{kind,limit:25,...(next?{cursor:next}:{})},signal:controller.signal});if(controller.signal.aborted)return;setItems(old=>next?[...old,...data.items]:data.items);setCursor(data.nextCursor);}catch{if(!controller.signal.aborted)setError('Evidence could not be loaded. Try again.');}finally{if(!controller.signal.aborted)setLoading(false);}
 };
 const save=async(action:'review'|'link-evidence'|'revoke-evidence',data:Record<string,unknown>)=>{
   setError('');setSuccess('');try{await mutate({trainingId:training.id!,employeeId:training.assignedDsp,action,data:{...data,expectedReviewRevision:training.reviewRevision ?? 0}}).unwrap();setRevoke(false);setChosen(null);setPicker(null);setSuccess(action==='link-evidence'?'Certificate linked. Another authorized reviewer must accept it.':'Evidence updated.');onChanged();}catch(cause){const e=cause as {status?:number;data?:{error?:string;message?:string}};if(e.status===409)onChanged();setError(e.status===409?'Training requirements or evidence changed. Review the refreshed requirement before continuing.':e.data?.message||e.data?.error||'Unable to save evidence. Check your permissions and try again.');}
 };
 return <div className="w-full space-y-2 text-xs">
 {training.policySource && <p>{training.policySource}</p>}
 {training.evidenceCriteria && <p>Evidence must cover: {training.evidenceCriteria}</p>}
 {!readOnly && <><label className="block">Review explanation<Textarea value={reason} onChange={event=>setReason(event.target.value)} maxLength={1000} className="mt-1 rounded-xl" placeholder="Required when requesting changes or revoking evidence"/></label>
 <div className="flex flex-wrap gap-2">{training.latestCertificate && <><Button size="sm" className="rounded-full bg-[#00b4b8] text-white hover:bg-[#009da1]" disabled={isLoading || training.reviewState==='accepted'} onClick={()=>void save('review',{certificateId:training.latestCertificate!.id,decision:'accept'})}>Accept evidence</Button><Button size="sm" variant="outline" disabled={isLoading || !reason.trim()} onClick={()=>void save('review',{certificateId:training.latestCertificate!.id,decision:'request_changes',reason:reason.trim()})}>Request changes</Button></>}
 {training.acceptedCertificate && <Button size="sm" variant="outline" disabled={isLoading || !reason.trim()} onClick={()=>setRevoke(true)}>Revoke accepted evidence</Button>}
 <Button size="sm" variant="outline" onClick={()=>void list('training_certificate')}>Use existing certificate</Button><Button size="sm" variant="outline" onClick={()=>void list('employee_document')}>Link staff document</Button>
 {training.latestCertificate && <Button size="sm" variant="outline" onClick={()=>{setPicker('training_certificate');setChosen({...training.latestCertificate!,trainingId:training.id});setCompleted(training.latestCertificate!.completedOnDate);setExpiry(training.latestCertificate!.printedExpiryDate || '');linkRequest.current=crypto.randomUUID();}}>Correct dates</Button>}</div></>}
 <div className="flex flex-wrap gap-2"><Button size="sm" variant="ghost" onClick={()=>void list('certificates')}>Certificate history</Button><Button size="sm" variant="ghost" onClick={()=>void list('reviews')}>Review history</Button>{training.requirementId==='cpr-certification' && <Button size="sm" variant="ghost" onClick={()=>void list('applicability')}>Why CPR is required</Button>}</div>
 {!readOnly && <p>Using an existing certificate does not accept it. Another authorized reviewer must confirm this requirement.</p>}
 {picker && <div className="space-y-2 rounded-xl border p-3"><p className="font-medium">{picker==='applicability'?(training.policyProgram==='hha'?'HHA employment requirement':'Current CPR assignments'):picker==='reviews'?'Review history':picker==='certificates'?'Certificate history':'Select existing evidence'}</p>{loading && <p>Loading evidence…</p>}{!loading && !items.length && !chosen && <p>No evidence on this page.</p>}
 {items.map(item=><div key={item.id} className="flex flex-wrap items-center gap-2"><span>{item.fileName || item.decision || 'Certificate'}{item.reason ? ': '+item.reason : ''}</span>{!readOnly && picker!=='reviews' && picker!=='applicability' && <Button size="sm" variant="outline" onClick={()=>{setChosen({...item,...(picker==='certificates'?{trainingId:training.id}:{})});setCompleted(item.completedOnDate || '');setExpiry(item.printedExpiryDate || '');linkRequest.current=crypto.randomUUID();}}>Use this certificate</Button>}</div>)}
 {cursor && <Button size="sm" variant="outline" disabled={loading} onClick={()=>void list(picker,cursor)}>Load more evidence</Button>}
 {chosen && !readOnly && <div className="space-y-2"><TrainingDateField label="Completion date" value={completed} onChange={value=>{setCompleted(value);linkRequest.current=crypto.randomUUID();}}/>{training.requirementId==='cpr-certification' && <TrainingDateField label="Printed expiry date (optional)" value={expiry} onChange={value=>{setExpiry(value);linkRequest.current=crypto.randomUUID();}}/>}<p>Another authorized reviewer must accept the linked certificate and dates.</p><Button size="sm" disabled={isLoading || !completed} onClick={()=>void save('link-evidence',{sourceEvidence:picker==='employee_document'?{kind:'employee_document',documentId:chosen.id}:{kind:'training_certificate',trainingId:chosen.trainingId,certificateId:chosen.id},completedOnDate:completed,printedExpiryDate:expiry || null,requestId:linkRequest.current})}>Link certificate for review</Button></div>}
 <Button size="sm" variant="ghost" onClick={()=>{request.current?.abort();setPicker(null);setChosen(null);}}>Close evidence</Button></div>}
 {success && <p role="status">{success}</p>}
 {error && <div role="alert"><p>{error}</p><Button variant="link" size="sm" onClick={onChanged}>Reload training</Button></div>}
 <ConfirmDialog open={revoke} onOpenChange={setRevoke}><ConfirmDialogContent title="Revoke accepted evidence?" description="This certificate will remain in history but will no longer satisfy this training requirement." confirmText="Revoke evidence" onConfirm={()=>void save('revoke-evidence',{certificateId:training.acceptedCertificate!.id,reason})} onCancel={()=>setRevoke(false)} isLoading={isLoading}/></ConfirmDialog>
 </div>;
}
