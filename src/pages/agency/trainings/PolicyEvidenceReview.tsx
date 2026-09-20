import {useRef,useState,useEffect} from 'react';
import {ChevronDown, FileClock} from 'lucide-react';
import axiosClient from '@/lib/axios';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {ConfirmDialog,ConfirmDialogContent} from '@/components/ui/confirm-dialog';

import {usePolicyEvidenceMutation,type TrainingData} from './trainingApi';
type Evidence={id:string;trainingId?:string;fileName?:string;completedOnDate?:string;printedExpiryDate?:string|null;decision?:string;reason?:string;certificateId?:string};
export default function PolicyEvidenceReview({training,onChanged,readOnly=false}: {training:TrainingData;onChanged:()=>void;readOnly?:boolean}) {
 readOnly = readOnly || training.policyContextState !== 'current';
 const [mutate,{isLoading}]=usePolicyEvidenceMutation(), [reason,setReason]=useState(''), [success,setSuccess]=useState(''), [error,setError]=useState(''), [revoke,setRevoke]=useState(false);
 const [picker,setPicker]=useState<'certificates'|'reviews'|'applicability'|null>(null),[items,setItems]=useState<Evidence[]>([]),[cursor,setCursor]=useState<string|null>(null),[loading,setLoading]=useState(false);
 const request=useRef<AbortController|null>(null);
 useEffect(()=>()=>request.current?.abort(),[training.id]);
 const list=async(kind:NonNullable<typeof picker>,next?:string)=>{
   request.current?.abort();const controller=new AbortController();request.current=controller;setPicker(kind);setLoading(true);setError('');if(!next){setItems([]);}
   try{const {data}=await axiosClient.get<{items:Evidence[];nextCursor:string|null}>('/employees/trainings/'+training.id+'/history',{params:{kind,limit:25,...(next?{cursor:next}:{})},signal:controller.signal});if(controller.signal.aborted)return;setItems(old=>next?[...old,...data.items]:data.items);setCursor(data.nextCursor);}catch{if(!controller.signal.aborted)setError('Evidence could not be loaded. Try again.');}finally{if(!controller.signal.aborted)setLoading(false);}
 };
 const save=async(action:'review'|'revoke-evidence',data:Record<string,unknown>)=>{
   setError('');setSuccess('');try{await mutate({trainingId:training.id!,employeeId:training.assignedDsp,action,data:{...data,expectedReviewRevision:training.reviewRevision ?? 0}}).unwrap();setRevoke(false);setPicker(null);setSuccess('Review saved.');onChanged();}catch(cause){const e=cause as {status?:number;data?:{error?:string;message?:string}};if(e.status===409)onChanged();setError(e.status===409?'Training requirements or evidence changed. Review the refreshed requirement before continuing.':e.data?.message||e.data?.error||'Unable to save evidence. Check your permissions and try again.');}
 };
 return <div className="w-full space-y-4 text-xs text-[#162a2c]">
 <div>
   <p className="text-[11px] text-[#627476]">Automatically assigned{training.policySource ? ' · ' + training.policySource : ''}</p>
   {training.evidenceCriteria && <p className="mt-2 text-[13px] leading-relaxed"><span className="font-semibold">Evidence must cover</span><br/>{training.evidenceCriteria}</p>}
 </div>
 {!training.certificateId && <p className="flex items-center gap-2 text-[#627476]"><FileClock aria-hidden="true" className="size-4 shrink-0"/>Waiting for a completion certificate.</p>}
 {!training.certificateId && <p className="text-xs text-[#627476]">Staff must upload their completion certificate from Trainings on their dashboard.</p>}
 {training.latestCertificate && <div className="space-y-1 text-[#627476]"><p>Completion date: {training.latestCertificate.completedOnDate}</p>{training.latestCertificate.printedExpiryDate && <p>Printed expiry date: {training.latestCertificate.printedExpiryDate}</p>}</div>}
 {!readOnly && (training.latestCertificate || training.acceptedCertificate) && <>
 <div className="flex flex-wrap gap-2">
   {training.latestCertificate && <>
     <Button size="sm" className="rounded-full" disabled={isLoading || training.reviewState==='accepted'} onClick={()=>void save('review',{certificateId:training.latestCertificate!.id,decision:'accept'})}>Approve certificate</Button>
     <Button size="sm" variant="outline" className="border-[#e2eaea] text-xs shadow-none" disabled={isLoading || !reason.trim()} onClick={()=>void save('review',{certificateId:training.latestCertificate!.id,decision:'request_changes',reason:reason.trim()})}>Request changes</Button>
   </>}
   {training.acceptedCertificate && <Button size="sm" variant="outline" className="border-[#e2eaea] text-xs shadow-none" disabled={isLoading || !reason.trim()} onClick={()=>setRevoke(true)}>Revoke accepted evidence</Button>}
 </div>
 </>}
 <div className="flex flex-wrap gap-x-4 gap-y-1">
   <Button size="sm" variant="ghost" className="h-auto min-h-8 rounded-sm px-0 text-xs font-normal text-[#627476] underline decoration-[#e2eaea] underline-offset-4" onClick={()=>void list('certificates')}>Certificate history</Button>
   <Button size="sm" variant="ghost" className="h-auto min-h-8 rounded-sm px-0 text-xs font-normal text-[#627476] underline decoration-[#e2eaea] underline-offset-4" onClick={()=>void list('reviews')}>Review history</Button>
   {training.requirementId==='cpr-certification' && <Button size="sm" variant="ghost" className="h-auto min-h-8 rounded-sm px-0 text-xs font-normal text-[#627476] underline decoration-[#e2eaea] underline-offset-4" onClick={()=>void list('applicability')}>Why CPR is required</Button>}
 </div>
 {!readOnly && (training.latestCertificate || training.acceptedCertificate) && <details className="group/explanation border-t border-[#e2eaea] pt-3 text-[#627476]">
   <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#008c90] [&::-webkit-details-marker]:hidden">Review explanation<ChevronDown aria-hidden="true" className="size-4 shrink-0 group-open/explanation:rotate-180"/></summary>
   <label className="mt-3 block">Required when requesting changes or revoking evidence<Textarea value={reason} onChange={event=>setReason(event.target.value)} maxLength={1000} className="mt-2 rounded-xl border-[#e2eaea] text-[#162a2c] shadow-none" placeholder="Explain what needs to change…"/></label>
 </details>}
 {picker && <div className="space-y-2 rounded-xl border p-3"><p className="font-medium">{picker==='applicability'?(training.policyProgram==='hha'?'HHA employment requirement':'Current CPR assignments'):picker==='reviews'?'Review history':'Certificate history'}</p>{loading && <p>Loading evidence…</p>}{!loading && !items.length && <p>No evidence on this page.</p>}
 {items.map(item=><div key={item.id} className="space-y-1 break-words"><p>{item.fileName || item.decision || 'Certificate'}{item.reason ? ': '+item.reason : ''}</p>{item.completedOnDate && <p className="text-[#627476]">Completion date: {item.completedOnDate}</p>}</div>)}
 {cursor && <Button size="sm" variant="outline" disabled={loading} onClick={()=>void list(picker,cursor)}>Load more evidence</Button>}
 <Button size="sm" variant="ghost" onClick={()=>{request.current?.abort();setPicker(null);}}>Close evidence</Button></div>}
 {success && <p role="status">{success}</p>}
 {error && <div role="alert"><p>{error}</p><Button variant="link" size="sm" onClick={onChanged}>Reload training</Button></div>}
 <ConfirmDialog open={revoke} onOpenChange={setRevoke}><ConfirmDialogContent title="Revoke accepted evidence?" description="This certificate will remain in history but will no longer satisfy this training requirement." confirmText="Revoke evidence" onConfirm={()=>void save('revoke-evidence',{certificateId:training.acceptedCertificate!.id,reason})} onCancel={()=>setRevoke(false)} isLoading={isLoading}/></ConfirmDialog>
 </div>;
}
