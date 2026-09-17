import axiosClient from '@/lib/axios';
import {complianceAlertsApi} from './api';

export type AuditQuestionKey='medication_storage'|'care_instructions'|'emergency_information';
export type AuditAnswerValue='meets_check'|'needs_action'|'not_checked'|'not_applicable';
export type ManualAuditState='draft'|'recorded'|'discarded';
export type ManualAuditView='follow_up_needed'|'recorded'|'drafts'|'discarded';
export type AuditChecklist={version:number;questions:{key:AuditQuestionKey;text:string;help:string}[]};
export type AuditAnswer={answer:AuditAnswerValue|null;basis:string};
export type AuditActor={uid:string;displayName:string};
export type AuditFollowUp={actionText:string;ownerUid:string|null;owner?:AuditActor|null;dueOn:string|null;state?:'open'|'resolved';resolution?:string|null;resolvedAt?:string|null;resolvedBy?:AuditActor|null};
export type AuditEvidence={evidenceId:string;targetKind:'question'|'follow_up';questionKey:AuditQuestionKey;displayName:string;contentType:string;size:number;sha256:string;uploadedAt:string;uploadedBy:AuditActor;excludedAt:string|null;excludedBy:AuditActor|null;excludedReason:string|null;attachedAtRevision:number};
export type ManualAudit={auditId:string;clientId:string;clientName?:string;program:'ddd'|'hha';state:ManualAuditState;revision:number;observedOn:string|null;context:string;checklist:AuditChecklist;answers:Record<AuditQuestionKey,AuditAnswer>;followUps:Partial<Record<AuditQuestionKey,AuditFollowUp|null>>;evidence:AuditEvidence[];correctsAuditId?:string|null;recordedBy?:AuditActor|null;recordedAt?:string|null;createdAt?:string;asOf?:string;evaluatedAt?:string;localDate?:string|null;ownerAvailability?:Record<string,boolean|null>};
export type ManualAuditSummary=Pick<ManualAudit,'auditId'|'clientId'|'clientName'|'program'|'state'|'observedOn'|'recordedBy'> & {revision:number;answerCounts:Record<AuditAnswerValue,number>;openFollowUpCount:number;earliestOpenDueOn:string|null;localDate:string|null};
export type ManualAuditScope={scopeKey:string;agencyId:string;program:'ddd'|'hha'};
export type ManualAuditListArgs=ManualAuditScope & {clientId?:string;view:ManualAuditView;cursor?:string};
export type ManualAuditDetailArgs=ManualAuditScope & {clientId:string;auditId:string};
export type ManualAuditPage={items:ManualAuditSummary[];nextCursor:string|null;checklist:AuditChecklist;evaluatedAt:string};
export type ManualAuditWrite={requestId?:string;expectedRevision?:number;action:'save_draft'|'record'|'discard'|'update_follow_up'|'resolve_follow_up'|'reopen_follow_up';observedOn?:string|null;context?:string;answers?:Record<AuditQuestionKey,AuditAnswer>;followUps?:Partial<Record<AuditQuestionKey,AuditFollowUp|null>>;correctsAuditId?:string|null;reason?:string;questionKey?:AuditQuestionKey;actionText?:string;ownerUid?:string;dueOn?:string;resolution?:string};
export type ManualAuditAck={auditId:string;revision:number;state:ManualAuditState;evidence?:AuditEvidence};
export type HistoryPage={items:{revision:number;action:string;actor?:AuditActor;at:string;reason?:string;questionKey?:AuditQuestionKey;evidenceId?:string;evidenceIds?:string[];changes?:Record<string,unknown>}[];nextCursor:string|null};
export type AssigneePage={items:{uid:string;displayName:string}[];nextCursor:string|null};
type Envelope<T>={success:true;data:T};
const unwrap=<T>(value:Envelope<T>|T):T=>(value as Envelope<T>)?.success?(value as Envelope<T>).data:value as T;
type RawPage=Omit<ManualAuditPage,'items'> & {items:(Omit<ManualAuditSummary,'clientId'|'clientName'|'earliestOpenDueOn'> & {client:{id:string;displayName:string};earliestDueOn:string|null})[]};
type RawEvidence={id:string;targetKind:'question'|'follow_up';questionKey:AuditQuestionKey;fileName:string;mimeType:string;sizeBytes:number;sha256:string;uploadedAt:string;uploadedBy:AuditActor;attachedAtRevision:number;excludedAt:string|null;excludedBy:AuditActor|null;exclusionReason:string|null};
type RawDetail={review:Omit<ManualAudit,'auditId'|'checklist'|'evidence'|'recordedBy'|'ownerAvailability'|'evaluatedAt'|'localDate'> & {id:string;version:number;recordedBy?:AuditActor|null};evidence:RawEvidence[];ownerAvailability:Record<string,boolean|null>;evaluatedAt:string;localDate:string|null;checklist:AuditChecklist};
const normalizePage=(value:unknown):ManualAuditPage=>{const data=unwrap(value as Envelope<RawPage>);return {...data,items:data.items.map(({client,earliestDueOn,...item})=>({...item,clientId:client.id,clientName:client.displayName,earliestOpenDueOn:earliestDueOn}))};};
const normalizeEvidence=(file:RawEvidence):AuditEvidence=>({evidenceId:file.id,targetKind:file.targetKind,questionKey:file.questionKey,displayName:file.fileName,contentType:file.mimeType,size:file.sizeBytes,sha256:file.sha256,uploadedAt:file.uploadedAt,uploadedBy:file.uploadedBy,attachedAtRevision:file.attachedAtRevision,excludedAt:file.excludedAt,excludedBy:file.excludedBy,excludedReason:file.exclusionReason});
const normalizeDetail=(value:unknown):ManualAudit=>{const data=unwrap(value as Envelope<RawDetail>);return {...data.review,auditId:data.review.id,checklist:data.checklist,recordedBy:data.review.recordedBy,evidence:data.evidence.map(normalizeEvidence),ownerAvailability:data.ownerAvailability,evaluatedAt:data.evaluatedAt,localDate:data.localDate,asOf:data.evaluatedAt};};
const normalizeAck=(value:unknown):ManualAuditAck=>{const data=unwrap(value as Envelope<Omit<ManualAuditAck,'evidence'> & {evidence?:RawEvidence}>);const {evidence,...ack}=data;return {...ack,...(evidence?{evidence:normalizeEvidence(evidence)}:{})};};
const unwrapResponse=<T>(value:unknown)=>unwrap(value as Envelope<T>);
const listTag=(scopeKey:string)=>({type:'ManualAudit' as const,id:`list:${scopeKey}`});
const reviewTag=(auditId:string)=>({type:'ManualAudit' as const,id:`review:${auditId}`});
const historyTag=(auditId:string)=>({type:'ManualAudit' as const,id:`history:${auditId}`});
const detailPath=({clientId,auditId}:Pick<ManualAuditDetailArgs,'clientId'|'auditId'>)=>`/clients/${encodeURIComponent(clientId)}/manual-audits/${encodeURIComponent(auditId)}`;
const params=({scopeKey:_scopeKey,...rest}:ManualAuditScope & Record<string,unknown>)=>rest;

export const manualAuditApi=complianceAlertsApi.injectEndpoints({endpoints:builder=>({
  getManualAudits:builder.query<ManualAuditPage,ManualAuditListArgs>({query:args=>({url:'/clients/compliance/manual-audits',method:'GET',params:params(args),requiresAuth:true}),transformResponse:normalizePage,providesTags:(_r,_e,a)=>[listTag(a.scopeKey)],keepUnusedDataFor:0}),
  getManualAudit:builder.query<ManualAudit,ManualAuditDetailArgs>({query:args=>({url:detailPath(args),method:'GET',params:{agencyId:args.agencyId,program:args.program},requiresAuth:true}),transformResponse:normalizeDetail,providesTags:(_r,_e,a)=>[reviewTag(a.auditId)],keepUnusedDataFor:0}),
  getManualAuditHistory:builder.query<HistoryPage,ManualAuditDetailArgs & {cursor?:string}>({query:args=>({url:`${detailPath(args)}/history`,method:'GET',params:{agencyId:args.agencyId,program:args.program,...(args.cursor?{cursor:args.cursor}:{})},requiresAuth:true}),transformResponse:unwrapResponse<HistoryPage>,providesTags:(_r,_e,a)=>[historyTag(a.auditId)],keepUnusedDataFor:0}),
  getManualAuditAssignees:builder.query<AssigneePage,ManualAuditScope & {clientId:string;cursor?:string}>({query:args=>({url:`/clients/${encodeURIComponent(args.clientId)}/manual-audits/assignees`,method:'GET',params:{agencyId:args.agencyId,program:args.program,...(args.cursor?{cursor:args.cursor}:{})},requiresAuth:true}),transformResponse:unwrapResponse<AssigneePage>,keepUnusedDataFor:0}),
  createManualAudit:builder.mutation<ManualAuditAck,ManualAuditScope & {clientId:string;body:ManualAuditWrite}>({query:a=>({url:`/clients/${encodeURIComponent(a.clientId)}/manual-audits`,method:'POST',params:{agencyId:a.agencyId,program:a.program},data:a.body,requiresAuth:true}),transformResponse:unwrapResponse<ManualAuditAck>,invalidatesTags:(_r,e,a)=>e?[]:[listTag(a.scopeKey)]}),
  changeManualAudit:builder.mutation<ManualAuditAck,ManualAuditDetailArgs & {body:ManualAuditWrite}>({query:a=>({url:detailPath(a),method:'PATCH',params:{agencyId:a.agencyId,program:a.program},data:a.body,requiresAuth:true}),transformResponse:unwrapResponse<ManualAuditAck>,invalidatesTags:(_r,e,a)=>e?[]:[listTag(a.scopeKey),historyTag(a.auditId)]}),
  uploadManualAuditEvidence:builder.mutation<ManualAuditAck,ManualAuditDetailArgs & {formData:FormData}>({query:a=>({url:`${detailPath(a)}/evidence`,method:'POST',params:{agencyId:a.agencyId,program:a.program},data:a.formData,requiresAuth:true}),transformResponse:normalizeAck,invalidatesTags:(_r,e,a)=>e?[]:[listTag(a.scopeKey),historyTag(a.auditId)]}),
  excludeManualAuditEvidence:builder.mutation<ManualAuditAck,ManualAuditDetailArgs & {evidenceId:string;expectedRevision:number;reason:string}>({query:a=>({url:`${detailPath(a)}/evidence/${encodeURIComponent(a.evidenceId)}`,method:'PATCH',params:{agencyId:a.agencyId,program:a.program},data:{expectedRevision:a.expectedRevision,reason:a.reason},requiresAuth:true}),transformResponse:unwrapResponse<ManualAuditAck>,invalidatesTags:(_r,e,a)=>e?[]:[listTag(a.scopeKey),historyTag(a.auditId)]}),
})});

export async function downloadManualAuditEvidence(args:Omit<ManualAuditDetailArgs,'scopeKey'> & {evidenceId:string},signal:AbortSignal):Promise<Blob>{
  try {
    const response=await axiosClient.get<Blob>(`${detailPath(args)}/evidence/${encodeURIComponent(args.evidenceId)}`,{params:{agencyId:args.agencyId,program:args.program},responseType:'blob',signal});
    return response.data;
  } catch(error) {
    const response=(error as {response?:{status?:number;data?:unknown}})?.response;
    if(!response?.status)throw error;
    let data:{code?:string;error?:string}|undefined;
    if(response.data instanceof Blob&&response.data.size<=64*1024){
      try { const parsed=JSON.parse(await response.data.text());if(parsed&&typeof parsed==='object')data={code:typeof parsed.code==='string'?parsed.code:undefined,error:typeof parsed.error==='string'?parsed.error:undefined}; }
      catch { /* A non-JSON error body still retains its HTTP status. */ }
    }
    throw {status:response.status,...(data?{data}: {})};
  }
}
export const {useGetManualAuditsQuery,useGetManualAuditQuery,useGetManualAuditHistoryQuery,useLazyGetManualAuditHistoryQuery,useGetManualAuditAssigneesQuery,useLazyGetManualAuditAssigneesQuery,useCreateManualAuditMutation,useChangeManualAuditMutation,useUploadManualAuditEvidenceMutation,useExcludeManualAuditEvidenceMutation}=manualAuditApi;
