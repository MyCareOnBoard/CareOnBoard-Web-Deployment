import {configureStore} from '@reduxjs/toolkit';
import {afterEach,describe, expect, it, vi} from 'vitest';
vi.mock('@/lib/baseQuery',()=>({customBaseQuery:vi.fn()}));
vi.mock('@/lib/axios',()=>({default:{get:vi.fn()}}));
import {customBaseQuery} from '@/lib/baseQuery';
import axiosClient from '@/lib/axios';
import {complianceAlertsApi} from './api';
import {downloadManualAuditEvidence,manualAuditApi} from './manualAuditApi';

describe('manual audit transport',()=>{
  const stores:ReturnType<typeof configureStore>[]=[];
  const store=()=>{const value=configureStore({reducer:{[complianceAlertsApi.reducerPath]:complianceAlertsApi.reducer},middleware:g=>g().concat(complianceAlertsApi.middleware)});stores.push(value);return value;};
  afterEach(()=>{vi.clearAllMocks();stores.splice(0).forEach(value=>value.dispatch(complianceAlertsApi.util.resetApiState()));});
  it('unwraps envelopes and strips cache-only scope from list and detail requests',async()=>{
    const query=vi.mocked(customBaseQuery); query.mockReset();
    query.mockResolvedValue({data:{success:true,data:{items:[],nextCursor:null,checklist:{version:1,questions:[]}}}});
    const value=store();
    const list=await value.dispatch(manualAuditApi.endpoints.getManualAudits.initiate({scopeKey:'actor-db',agencyId:'a',program:'ddd',view:'drafts',cursor:'next'}));
    expect(list.data).toMatchObject({items:[]});
    expect(query.mock.calls[0][0]).toMatchObject({url:'/clients/compliance/manual-audits',params:{agencyId:'a',program:'ddd',view:'drafts',cursor:'next'}});
    expect((query.mock.calls[0][0] as any).params).not.toHaveProperty('scopeKey');
  });
  it('keeps actor/database scopes in separate cache entries while deduplicating one scope',async()=>{
    const query=vi.mocked(customBaseQuery);query.mockResolvedValue({data:{success:true,data:{items:[],nextCursor:null,evaluatedAt:'2026-09-17T12:00:00Z',checklist:{version:1,questions:[]}}}});
    const value=store(),args={agencyId:'a',program:'ddd' as const,view:'drafts' as const};
    const first=value.dispatch(manualAuditApi.endpoints.getManualAudits.initiate({...args,scopeKey:'staging:actor-a'}));
    const duplicate=value.dispatch(manualAuditApi.endpoints.getManualAudits.initiate({...args,scopeKey:'staging:actor-a'}));
    const other=value.dispatch(manualAuditApi.endpoints.getManualAudits.initiate({...args,scopeKey:'default:actor-b'}));
    await Promise.all([first,duplicate,other]);
    expect(query).toHaveBeenCalledTimes(2);
    first.unsubscribe();duplicate.unsubscribe();other.unsubscribe();
  });
  it('passes a real FormData body through without setting a content-type header',async()=>{
    const query=vi.mocked(customBaseQuery);query.mockResolvedValue({data:{success:true,data:{auditId:'r',revision:2,state:'draft'}}});
    const value=store(),formData=new FormData();formData.append('requestId','request-123456789');formData.append('file',new Blob(['%PDF-1.7']), 'proof.pdf');
    await value.dispatch(manualAuditApi.endpoints.uploadManualAuditEvidence.initiate({scopeKey:'staging:actor',agencyId:'a',program:'ddd',clientId:'c',auditId:'r',formData}));
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toMatchObject({url:'/clients/c/manual-audits/r/evidence',method:'POST',params:{agencyId:'a',program:'ddd'},data:formData,requiresAuth:true});
    expect(query.mock.calls[0][0]).not.toHaveProperty('headers');
  });
  it('downloads outside Redux with cancellation and decodes bounded JSON blob errors',async()=>{
    const signal=new AbortController().signal; const blob=new Blob(['pdf']);
    vi.mocked(axiosClient.get).mockResolvedValue({data:blob} as any);
    await expect(downloadManualAuditEvidence({agencyId:'a',program:'ddd',clientId:'c',auditId:'r',evidenceId:'e'},signal)).resolves.toBe(blob);
    expect(axiosClient.get).toHaveBeenCalledWith('/clients/c/manual-audits/r/evidence/e',{params:{agencyId:'a',program:'ddd'},responseType:'blob',signal});
    const errorJson=JSON.stringify({success:false,code:'MANUAL_AUDIT_EVIDENCE_UNAVAILABLE',error:'Evidence unavailable.'});
    const errorBlob=new Blob([errorJson],{type:'application/json'});Object.defineProperty(errorBlob,'text',{value:async()=>errorJson});
    vi.mocked(axiosClient.get).mockRejectedValueOnce({response:{status:404,data:errorBlob}});
    await expect(downloadManualAuditEvidence({agencyId:'a',program:'ddd',clientId:'c',auditId:'r',evidenceId:'e'},signal)).rejects.toEqual({status:404,data:{code:'MANUAL_AUDIT_EVIDENCE_UNAVAILABLE',error:'Evidence unavailable.'}});
    vi.mocked(axiosClient.get).mockRejectedValueOnce({response:{status:403,data:new Blob(['x'.repeat(64*1024+1)],{type:'application/json'})}});
    await expect(downloadManualAuditEvidence({agencyId:'a',program:'ddd',clientId:'c',auditId:'r',evidenceId:'e'},signal)).rejects.toEqual({status:403});
  });
});
