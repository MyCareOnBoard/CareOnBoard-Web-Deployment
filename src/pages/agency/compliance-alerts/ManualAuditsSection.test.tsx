import {configureStore} from '@reduxjs/toolkit';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {Provider} from 'react-redux';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

const mocks=vi.hoisted(()=>({request:vi.fn(),editorProps:null as any}));
vi.mock('@/lib/baseQuery',()=>({customBaseQuery:mocks.request}));
vi.mock('./ManualAuditEditor',()=>({default:(props:any)=>{
  mocks.editorProps=props;
  return <section aria-label="Audit editor"><span>{props.auditId?`Existing ${props.auditId}`:'New review'}</span><span>{props.correctsAuditId?`Corrects ${props.correctsAuditId}`:''}</span><span>{props.checklist?`Checklist ${props.checklist.version}`:''}</span>{props.auditId?<button onClick={()=>props.onCorrect(props.auditId)}>Start correction</button>:null}</section>;
}}));
import {complianceAlertsApi} from './api';
import ManualAuditsSection from './ManualAuditsSection';

const checklist={version:1,questions:[
  {key:'medication_storage',text:'Medication?',help:'Check it'},
  {key:'care_instructions',text:'Instructions?',help:'Check it'},
  {key:'emergency_information',text:'Emergency?',help:'Check it'},
]};
const emptyList={success:true,data:{items:[],nextCursor:null,evaluatedAt:'2026-09-17T12:00:00Z',checklist}};
const client=(id:string,name:string)=>({id,name,status:'active',documentChecklist:{state:'ready',reasonCode:null,warningCode:null,evaluatedAt:'2026-09-17T12:00:00Z',timezone:'UTC',localDate:'2026-09-17',groups:[]}});
const clientPage=(items:any[],nextCursor:string|null)=>({items,nextCursor,partialPage:false,evaluatedAt:'2026-09-17T12:00:00Z',timezone:'UTC',localDate:'2026-09-17'});
const baseView={section:'clients' as const,source:'manual_audits' as const,auditView:'follow_up_needed' as const};
const stores:any[]=[];
function setup(view:any=baseView){
  const store=configureStore({reducer:{[complianceAlertsApi.reducerPath]:complianceAlertsApi.reducer},middleware:g=>g().concat(complianceAlertsApi.middleware)});
  stores.push(store);
  const callbacks={onApply:vi.fn(),onSelect:vi.fn(),onPage:vi.fn(),onPrevious:vi.fn()};
  const result=render(<Provider store={store}><ManualAuditsSection view={view} scopeKey="db:viewer" agencyId="agency" viewerId="viewer" mode="ddd" {...callbacks}/></Provider>);
  return {...result,...callbacks,store};
}
beforeEach(()=>{vi.clearAllMocks();mocks.editorProps=null;});
afterEach(()=>{cleanup();for(const store of stores.splice(0))store.dispatch(complianceAlertsApi.util.resetApiState());});

describe('ManualAuditsSection',()=>{
  it('an empty first-ever audit list still lets a client start an unsaved review without writing',async()=>{
    mocks.request.mockImplementation(async(args:any)=>args.url==='/clients/compliance/manual-audits'?{data:emptyList}:{data:clientPage([client('c1','Ada Client')],null)});
    setup();
    expect(await screen.findByText('No open follow-ups found in this view.')).toBeInTheDocument();
    expect(mocks.request).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Choose a client to start or filter reviews'));
    await screen.findByRole('option',{name:'Ada Client'});
    fireEvent.change(screen.getByLabelText('Client'),{target:{value:'c1'}});
    fireEvent.click(screen.getByRole('button',{name:'Start review'}));
    expect(await screen.findByText('New review')).toBeInTheDocument();
    expect(screen.getByText('Checklist 1')).toBeInTheDocument();
    expect(mocks.request.mock.calls.every(([args])=>args.method==='GET')).toBe(true);
  });

  it('pages the bounded client picker independently of audit pagination',async()=>{
    mocks.request.mockImplementation(async(args:any)=>{
      if(args.url==='/clients/compliance/manual-audits')return {data:emptyList};
      return {data:args.params.cursor==='clients-next'?clientPage([client('c2','Second Client')],null):clientPage([client('c1','First Client')],'clients-next')};
    });
    setup();fireEvent.click(await screen.findByText('Choose a client to start or filter reviews'));
    await screen.findByRole('option',{name:'First Client'});
    fireEvent.click(screen.getAllByRole('button',{name:'Next page'})[0]);
    await screen.findByRole('option',{name:'Second Client'});
    expect(mocks.request.mock.calls.find(([args])=>args.url==='/clients/compliance/document-checklist'&&args.params.cursor)?.[0].params.cursor).toBe('clients-next');
  });

  it('detail mode delegates the selected audit to the editor without loading an audit list or client picker',async()=>{
    setup({...baseView,clientId:'c1',auditId:'r1'});
    expect(await screen.findByText('Existing r1')).toBeInTheDocument();
    expect(mocks.editorProps).toMatchObject({clientId:'c1',auditId:'r1'});
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it('a correction clears detail, fetches the current definition, and starts blank',async()=>{
    mocks.request.mockImplementation(async(args:any)=>args.url==='/clients/c1/manual-audits/r1'
      ?{data:{success:true,data:{review:{id:'r1',version:1,clientId:'c1',program:'ddd',state:'recorded',revision:1,observedOn:'2026-09-01',context:'Old',answers:{},followUps:{}},evidence:[],ownerAvailability:{},evaluatedAt:'2026-09-17T12:00:00Z',localDate:'2026-09-17',checklist}}}
      :{data:emptyList});
    const {onSelect}=setup({...baseView,clientId:'c1',auditId:'r1'});
    fireEvent.click(await screen.findByRole('button',{name:'Start correction'}));
    await waitFor(()=>expect(mocks.request.mock.calls.some(([args])=>args.url==='/clients/compliance/manual-audits')).toBe(true));
    expect(await screen.findByText('New review')).toBeInTheDocument();
    expect(screen.getByText('Corrects r1')).toBeInTheDocument();
    expect(mocks.editorProps.auditId).toBeUndefined();
    expect(onSelect).toHaveBeenCalledWith({clientId:'c1',auditId:undefined,cursor:undefined});
  });

  it('confirmed access loss clears previously visible audit rows',async()=>{
    const row={auditId:'r1',client:{id:'c1',displayName:'Visible Client'},program:'ddd',state:'recorded',observedOn:'2026-09-01',recordedBy:{uid:'u',displayName:'Reviewer'},answerCounts:{},openFollowUpCount:0,earliestDueOn:null,localDate:'2026-09-17'};
    mocks.request.mockResolvedValueOnce({data:{success:true,data:{...emptyList.data,items:[row]}}}).mockResolvedValue({error:{status:403}});
    setup();expect(await screen.findByRole('button',{name:'Review Visible Client'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Refresh'}));
    expect(await screen.findByText('You do not have access to these records. Ask your agency administrator.')).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Review Visible Client'})).not.toBeInTheDocument();
  });
});
