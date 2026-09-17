vi.mock('react-router',async()=>await vi.importActual('react-router'));
import {createContext,useContext} from 'react';
import {createMemoryRouter,RouterProvider} from 'react-router';
import {configureStore} from '@reduxjs/toolkit';
import {act,cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {Provider} from 'react-redux';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const transport=vi.hoisted(()=>({request:vi.fn()}));
vi.mock('@/lib/baseQuery',()=>({customBaseQuery:transport.request}));
vi.mock('@/lib/axios',()=>({default:{get:vi.fn()}}));
import {complianceAlertsApi} from './api';
import {manualAuditApi} from './manualAuditApi';
import ManualAuditEditor,{type ManualAuditEditorProps} from './ManualAuditEditor';

type Request={url:string;method:string;data?:Record<string,unknown>|FormData};
const keys=['medication_storage','care_instructions','emergency_information'] as const;
const checklist={version:1,questions:keys.map((key,index)=>({key,text:['Medication storage','Care instructions','Emergency information'][index],help:'Describe what was checked.'}))};
const stamp={uid:'reviewer',displayName:'Current reviewer'};
const time='2026-09-17T12:00:00.000Z';
function detail(revision=1,context='Saved observation',state:'draft'|'recorded'='draft') {
  return {review:{id:'review',version:1,checklistVersion:1,agencyId:'agency',clientId:'client',program:'ddd',revision,state,timezone:'UTC',observedOn:'2026-09-17',context,
    answers:Object.fromEntries(keys.map(key=>[key,{answer:key==='medication_storage'?'not_checked':'meets_check',basis:'Observed basis'}])),
    followUps:{medication_storage:{actionText:'Inspect storage',ownerUid:'reviewer',dueOn:'2026-09-18',...(state==='recorded'?{state:'open',owner:stamp,resolvedAt:null,resolvedBy:null,resolution:null}:{})},care_instructions:null,emergency_information:null},
    correctsAuditId:null,createdBy:stamp,createdAt:time,updatedBy:stamp,updatedAt:time,recordedBy:state==='recorded'?stamp:null,recordedAt:state==='recorded'?time:null,
    checklist,evidenceSlots:Object.fromEntries(['question','follow_up'].map(kind=>[kind,Object.fromEntries(keys.map(key=>[key,[]]))])),hasOpenFollowUp:state==='recorded'},
    evidence:[],ownerAvailability:{reviewer:true},evaluatedAt:time,localDate:'2026-09-17',checklist};
}
const ok=(data:unknown)=>({data:{success:true,data}});
const stores:ReturnType<typeof makeStore>[]=[];
const routers:ReturnType<typeof createMemoryRouter>[]=[];
const EditorPropsContext=createContext<ManualAuditEditorProps|null>(null);
function EditorRoute(){return <ManualAuditEditor {...useContext(EditorPropsContext)!}/>;}
const makeStore=()=>configureStore({reducer:{[complianceAlertsApi.reducerPath]:complianceAlertsApi.reducer},middleware:getDefault=>getDefault().concat(complianceAlertsApi.middleware)});
function setup(overrides:Partial<ManualAuditEditorProps>={}) {
  const store=makeStore();stores.push(store);
  const props:ManualAuditEditorProps={scopeKey:'actor:staging:agency:ddd',agencyId:'agency',program:'ddd',clientId:'client',auditId:'review',onClose:vi.fn(),onSaved:vi.fn(),...overrides};
  const router=createMemoryRouter([{path:'/editor',element:<EditorRoute/>},{path:'/elsewhere',element:<p>Other page</p>}],{initialEntries:['/editor?mode=ddd']});
  routers.push(router);
  const app=(current:ManualAuditEditorProps)=><Provider store={store}><EditorPropsContext.Provider value={current}><RouterProvider router={router}/></EditorPropsContext.Provider></Provider>;
  const view=render(app(props));
  return {...view,store,router,props,renderProps:(next:ManualAuditEditorProps)=>view.rerender(app(next))};
}
const writes=()=>transport.request.mock.calls.map(call=>call[0] as Request).filter(request=>request.method!=='GET');
beforeEach(()=>transport.request.mockReset());
afterEach(()=>{cleanup();for(const router of routers.splice(0))router.dispose();for(const store of stores.splice(0))store.dispatch(complianceAlertsApi.util.resetApiState());vi.restoreAllMocks();});

describe('manual audit editor recovery with real API hooks',()=>{
  it('preserves dirty text as a blocked comparison when another reviewer saves after an upload',async()=>{
    let reads=0;
    transport.request.mockImplementation(async(request:Request)=>{
      if(request.method==='GET')return ok(detail(++reads===1?1:3,reads===1?'Saved observation':'Other reviewer changed this'));
      if(request.url.endsWith('/evidence'))return ok({auditId:'review',revision:2,state:'draft',attachedAtRevision:2,evidence:{id:'evidence',targetKind:'question',questionKey:'medication_storage',fileName:'proof.pdf',mimeType:'application/pdf',sizeBytes:10,sha256:'a'.repeat(64),uploadedBy:stamp,uploadedAt:time,attachedAtRevision:2,excludedAt:null,excludedBy:null,exclusionReason:null}});
      throw new Error('Unexpected write');
    });
    setup();
    const context=await screen.findByLabelText('Location or context');
    await waitFor(()=>expect(context).toHaveValue('Saved observation'));
    fireEvent.change(context,{target:{value:'My unsaved observation'}});
    fireEvent.change(screen.getByLabelText('Add evidence'),{target:{files:[new File(['%PDF-proof'],'proof.pdf',{type:'application/pdf'})]}});
    await waitFor(()=>expect(reads).toBe(2));
    await waitFor(()=>expect(screen.getByRole('button',{name:'Save draft'})).toBeDisabled());
    expect(screen.getByDisplayValue('My unsaved observation')).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Load latest review'})).toBeInTheDocument();
    expect(writes()).toHaveLength(1);
    const form=writes()[0].data as FormData;
    expect(form.get('expectedRevision')).toBe('1');
    expect(form.get('targetKind')).toBe('question');
  });

  it('recovers an unknown create outcome by replaying the exact payload and request ID',async()=>{
    let creates=0;
    transport.request.mockImplementation(async(request:Request)=>{
      if(request.method==='POST')return ++creates===1?{error:{status:'FETCH_ERROR',error:'connection lost'}}:ok({auditId:'saved-review',revision:1,state:'draft'});
      throw new Error('A new unsaved review must not fetch detail');
    });
    const {props}=setup({auditId:undefined,checklist});
    fireEvent.change(screen.getByLabelText('Location or context'),{target:{value:'Locally entered observation'}});
    fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
    const recover=await screen.findByRole('button',{name:'Check saved review'});
    expect(screen.getByRole('button',{name:'Save draft'})).toBeDisabled();
    expect(screen.getByLabelText('Location or context')).toHaveValue('Locally entered observation');
    const initial=structuredClone(writes()[0].data);
    fireEvent.click(recover);
    await waitFor(()=>expect(props.onSaved).toHaveBeenCalledWith('saved-review'));
    expect(writes()).toHaveLength(2);
    expect(writes()[1].data).toEqual(initial);
    expect((initial as Record<string,unknown>).requestId).toEqual(expect.any(String));
  });

  it('drops dirty values immediately on scope change and ignores the old pending response',async()=>{
    let finish!:(value:unknown)=>void;
    let finishNew!:(value:unknown)=>void;
    let oldReads=0;
    transport.request.mockImplementation((request:Request)=>{
      if(request.url.includes('/other-client/'))return new Promise(resolve=>{finishNew=resolve;});
      if(request.method==='GET')return Promise.resolve(ok(detail()));
      oldReads+=1;return new Promise(resolve=>{finish=resolve;});
    });
    const view=setup();
    await waitFor(()=>expect(screen.getByLabelText('Location or context')).toHaveValue('Saved observation'));
    fireEvent.change(screen.getByLabelText('Location or context'),{target:{value:'Private old-scope text'}});
    fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
    await waitFor(()=>expect(oldReads).toBe(1));
    view.renderProps({...view.props,scopeKey:'different-actor-scope',clientId:'other-client',auditId:'other-review'});
    expect(screen.queryByDisplayValue('Private old-scope text')).not.toBeInTheDocument();
    const fresh=detail(1,'New scope observation');fresh.review.id='other-review';fresh.review.clientId='other-client';
    await act(async()=>finishNew(ok(fresh)));
    await waitFor(()=>expect(screen.getByLabelText('Location or context')).toHaveValue('New scope observation'));
    await act(async()=>finish(ok({auditId:'review',revision:2,state:'draft'})));
    expect(screen.queryByDisplayValue('Private old-scope text')).not.toBeInTheDocument();
    expect(view.props.onSaved).not.toHaveBeenCalled();
    expect(transport.request.mock.calls.filter(call=>(call[0] as Request).url==='/clients/client/manual-audits/review'&&(call[0] as Request).method==='GET')).toHaveLength(1);
  });
});

it('clears saved and dirty answers when a fresh detail request loses access',async()=>{
  let reads=0;
  transport.request.mockImplementation(async()=>++reads===1?ok(detail()):{error:{status:403,data:{success:false,code:'MANUAL_AUDIT_ERROR',error:'Access denied.'}}});
  const view=setup();
  await waitFor(()=>expect(screen.getByLabelText('Location or context')).toHaveValue('Saved observation'));
  fireEvent.change(screen.getByLabelText('Location or context'),{target:{value:'Confidential unsaved text'}});
  await act(async()=>{await view.store.dispatch(manualAuditApi.endpoints.getManualAudit.initiate({scopeKey:view.props.scopeKey,agencyId:'agency',program:'ddd',clientId:'client',auditId:'review'},{forceRefetch:true,subscribe:false}));});
  await waitFor(()=>expect(screen.queryByDisplayValue('Confidential unsaved text')).not.toBeInTheDocument());
  expect(screen.queryByDisplayValue('Saved observation')).not.toBeInTheDocument();
});


it('records a shared draft then resolves its finding with revision-bound requests',async()=>{
  let version=1;
  transport.request.mockImplementation(async(request:Request)=>{
    if(request.method==='GET') {
      const response=detail(version,'Saved observation',version===1?'draft':'recorded');
      if(version===3)Object.assign(response.review.followUps.medication_storage,{state:'resolved',resolution:'Instructions inspected and confirmed.',resolvedBy:stamp,resolvedAt:time});
      return ok(response);
    }
    const body=request.data as Record<string,unknown>;
    if(body.action==='record') {expect(body.expectedRevision).toBe(1);version=2;}
    else if(body.action==='resolve_follow_up') {expect(body).toEqual({action:'resolve_follow_up',questionKey:'medication_storage',resolution:'Instructions inspected and confirmed.',expectedRevision:2});version=3;}
    else throw new Error('Unexpected mutation');
    return ok({auditId:'review',revision:version,state:'recorded'});
  });
  setup();
  await waitFor(()=>expect(screen.getByLabelText('Location or context')).toHaveValue('Saved observation'));
  fireEvent.click(screen.getByRole('button',{name:'Observed on'}));
  fireEvent.click(await screen.findByRole('button',{name:/September 16th, 2026/}));
  fireEvent.change(screen.getByLabelText('Medication storage observation and basis'),{target:{value:'Storage access was unavailable during this review.'}});
  fireEvent.click(screen.getByRole('button',{name:'Record review'}));
  const resolve=await screen.findByRole('button',{name:'Resolve follow-up'});
  expect(screen.getByLabelText('Medication storage answer')).toBeDisabled();
  expect(screen.getByLabelText('Medication storage observation and basis')).toBeDisabled();
  const recordBody=writes()[0].data as Record<string,unknown>;
  expect(recordBody).toMatchObject({action:'record',observedOn:'2026-09-16',answers:{medication_storage:{answer:'not_checked',basis:'Storage access was unavailable during this review.'}},followUps:{medication_storage:{actionText:'Inspect storage',ownerUid:'reviewer',dueOn:'2026-09-18'}}});
  vi.spyOn(window,'prompt').mockReturnValue('Instructions inspected and confirmed.');
  fireEvent.click(resolve);
  await screen.findByRole('button',{name:'Reopen follow-up'});
  expect(writes()).toHaveLength(2);
  expect(transport.request.mock.calls.filter(call=>(call[0] as Request).method==='GET')).toHaveLength(3);
});


it('allows correcting a definitely rejected new draft instead of trapping it in replay',async()=>{
  transport.request.mockResolvedValue({error:{status:400,data:{success:false,code:'MANUAL_AUDIT_INVALID_INPUT',error:'Check the review fields, dates and required explanations.'}}});
  setup({auditId:undefined,checklist});
  fireEvent.change(screen.getByLabelText('Location or context'),{target:{value:'Needs correction'}});
  fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
  await screen.findByText('Check the review fields, dates and required explanations.');
  expect(screen.getByLabelText('Location or context')).not.toBeDisabled();
  expect(screen.getByRole('button',{name:'Save draft'})).toBeEnabled();
  expect(screen.queryByRole('button',{name:'Check saved review'})).not.toBeInTheDocument();
});

it('ignores a successful create response after the editor is unmounted',async()=>{
  let complete!:(value:unknown)=>void;
  transport.request.mockImplementation(()=>new Promise(resolve=>{complete=resolve;}));
  const view=setup({auditId:undefined,checklist});
  fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
  await waitFor(()=>expect(writes()).toHaveLength(1));
  view.unmount();
  await act(async()=>complete(ok({auditId:'old-scope-review',revision:1,state:'draft'})));
  expect(view.props.onSaved).not.toHaveBeenCalled();
});


it('locks after a saved mutation until detail reload succeeds and retries only the read',async()=>{
  let reads=0;
  let failReload!:(value:unknown)=>void;
  transport.request.mockImplementation(async(request:Request)=>{
    if(request.method==='GET') {
      reads+=1;
      if(reads===2)return new Promise(resolve=>{failReload=resolve;});
      return ok(detail(reads===1?1:2,reads===1?'Saved observation':'Confirmed saved edit'));
    }
    return ok({auditId:'review',revision:2,state:'draft'});
  });
  setup();
  await waitFor(()=>expect(screen.getByLabelText('Location or context')).toHaveValue('Saved observation'));
  fireEvent.change(screen.getByLabelText('Location or context'),{target:{value:'Confirmed saved edit'}});
  fireEvent.click(screen.getByRole('button',{name:'Save draft'}));
  await waitFor(()=>expect(reads).toBe(2));
  expect(screen.getByLabelText('Location or context')).toBeDisabled();
  await act(async()=>failReload({error:{status:503,data:{success:false,code:'MANUAL_AUDITS_UNAVAILABLE',error:'Manual audits are temporarily unavailable.'}}}));
  const retry=await screen.findByRole('button',{name:/Retry loading/i});
  expect(screen.getByRole('button',{name:'Save draft'})).toBeDisabled();
  expect(screen.getByLabelText('Location or context')).toBeDisabled();
  fireEvent.click(retry);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Save draft'})).toBeEnabled());
  expect(screen.getByLabelText('Location or context')).toHaveValue('Confirmed saved edit');
  expect(writes()).toHaveLength(1);
  expect(reads).toBe(3);
});


it.each(['update','reopen'] as const)('allows choosing new follow-up owner and due date when performing %s',async operation=>{
  let version=5;
  const initial=detail(5,'Immutable recorded context','recorded');
  Object.assign(initial.review.followUps.medication_storage,{state:operation==='reopen'?'resolved':'open',dueOn:'2026-09-18',resolution:operation==='reopen'?'Earlier resolution':null,resolvedAt:operation==='reopen'?time:null,resolvedBy:operation==='reopen'?stamp:null});
  transport.request.mockImplementation(async(request:Request)=>{
    if(request.url.endsWith('/assignees'))return ok({items:[stamp,{uid:'new-owner',displayName:'New owner'}],nextCursor:null});
    if(request.method==='GET')return ok(structuredClone({...initial,review:{...initial.review,revision:version}}));
    const body=request.data as Record<string,unknown>;
    expect(body).toMatchObject({action:operation==='reopen'?'reopen_follow_up':'update_follow_up',questionKey:'medication_storage',expectedRevision:5,ownerUid:'new-owner',dueOn:'2026-09-19',reason:'Transfer corrective responsibility'});
    if(operation==='update')expect(body.actionText).toBe('Updated corrective work');
    version=6;
    Object.assign(initial.review.followUps.medication_storage,{ownerUid:'new-owner',owner:{uid:'new-owner',displayName:'New owner'},dueOn:'2026-09-19',state:'open',resolvedAt:null,resolvedBy:null,resolution:null,...(operation==='update'?{actionText:'Updated corrective work'}:{})});
    return ok({auditId:'review',revision:6,state:'recorded'});
  });
  setup();
  await waitFor(()=>expect(screen.getByLabelText('Location or context')).toHaveValue('Immutable recorded context'));
  expect(screen.getByLabelText('Medication storage answer')).toBeDisabled();
  const owner=screen.getByLabelText('Medication storage owner');
  expect(owner).toBeEnabled();
  fireEvent.focus(owner);
  await screen.findByRole('option',{name:'New owner'});
  fireEvent.change(owner,{target:{value:'new-owner'}});
  fireEvent.click(screen.getByRole('button',{name:'Medication storage due date'}));
  fireEvent.click(await screen.findByRole('button',{name:/September 19th, 2026/}));
  if(operation==='update'){
    expect(screen.getByLabelText('Medication storage corrective action')).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Medication storage corrective action'),{target:{value:'Updated corrective work'}});
  }
  vi.spyOn(window,'prompt').mockReturnValue('Transfer corrective responsibility');
  fireEvent.click(screen.getByRole('button',{name:operation==='reopen'?'Reopen follow-up':'Update follow-up'}));
  await screen.findByText(/Revision 6/);
  expect(writes()).toHaveLength(1);
});





it('blocks voluntary navigation until the user confirms discarding unsaved edits',async()=>{
  transport.request.mockResolvedValue(ok(detail()));
  const {router}=setup();
  await waitFor(()=>expect(screen.getByLabelText('Location or context')).toHaveValue('Saved observation'));
  fireEvent.change(screen.getByLabelText('Location or context'),{target:{value:'Keep this unsaved observation'}});
  const confirm=vi.spyOn(window,'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  await act(async()=>{await router.navigate('/elsewhere?mode=ddd');});
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(router.state.location.pathname).toBe('/editor');
  expect(screen.getByLabelText('Location or context')).toHaveValue('Keep this unsaved observation');
  await act(async()=>{await router.navigate('/elsewhere?mode=ddd');});
  await screen.findByText('Other page');
  expect(confirm).toHaveBeenCalledTimes(2);
  expect(router.state.location.pathname).toBe('/elsewhere');
  expect(screen.queryByDisplayValue('Keep this unsaved observation')).not.toBeInTheDocument();
  expect(writes()).toHaveLength(0);
});
