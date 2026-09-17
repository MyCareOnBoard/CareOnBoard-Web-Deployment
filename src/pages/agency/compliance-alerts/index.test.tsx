vi.mock('react-router', async () => await vi.importActual('react-router'));
import {act, fireEvent, render, screen, waitFor, cleanup} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {configureStore} from '@reduxjs/toolkit';
import {Provider} from 'react-redux';
import {MemoryRouter, Routes as RouterRoutes, Route, useNavigate, useLocation} from 'react-router';
const mocks = vi.hoisted(() => ({user: {uid: 'viewer', userType: 'agency_staff', agencyId: 'agency', profile: {accessList: ['Compliance Alerts', 'Trainings'], agencyModes: ['ddd','hha','sc']}, agency: {supportedClientTypes: ['ddd','hha','sc']}} as any, mode: 'ddd', realMode: false, database: 'staging', request: vi.fn(), documentRequest: vi.fn(), courseRequest: vi.fn(), alert: vi.fn()}));
vi.mock('@/utils/auth', () => ({useAuth: () => ({user: mocks.user})}));
vi.mock('@/hooks/useEffectiveAgencyMode', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useEffectiveAgencyMode')>('@/hooks/useEffectiveAgencyMode');
  return {...actual, useEffectiveAgencyMode: () => mocks.realMode ? actual.useEffectiveAgencyMode() : mocks.mode};
});
vi.mock('@/components/ProtectedRoute', () => ({ProtectedRoute: ({children}: any) => children}));
vi.mock('@/components/DashboardHeader', () => ({default: () => null}));
vi.mock('@/components/DashboardSidebar', () => ({default: () => null}));
vi.mock('@/components/AnnouncementBanner', () => ({default: () => null}));
vi.mock('@/hooks/useSidebarCollapsed', () => ({useSidebarCollapsed: () => [false]}));
vi.mock('@/hooks/useAssignmentReview', () => ({useAssignmentReviewScope: () => JSON.stringify([mocks.database,mocks.user])}));
vi.mock('@/lib/baseQuery', () => ({customBaseQuery: mocks.request}));
vi.mock('@/hooks/use-toast', () => ({useToast: () => ({toast: vi.fn()})}));
vi.mock('@/lib/api/employee-documents', () => ({sendDocumentAlert: mocks.alert}));
vi.mock('@/lib/api/career-reconciliation', () => ({canReviewCareer: () => false}));
import ComplianceAlertsPage from './index';
import AgencyLayout from '@/layouts/AgencyLayout';
import agencyModeReducer, {type AgencyMode} from '@/store/redux/agencyModeSlice';
import {complianceAlertsApi} from './api';
import {employeeTrainingsApi} from '../trainings/trainingApi';
const stores: ReturnType<typeof configureStore>[] = [];
function Controls() {const navigate = useNavigate(); const location = useLocation(); return <><button onClick={() => navigate(-1)}>Back</button><button onClick={() => navigate(1)}>Forward</button><output aria-label="url">{location.search}</output></>;}
function setup(url = '/agency/compliance-alerts?section=staff&source=training', {withLayout = false, initialMode}: {withLayout?: boolean; initialMode?: AgencyMode} = {}) {
  const modeByAgency: Record<string, AgencyMode> = initialMode ? {agency: initialMode} : {};
  const store = configureStore({preloadedState: {agencyMode: {modeByAgency}}, reducer: {agencyMode: agencyModeReducer, [complianceAlertsApi.reducerPath]: complianceAlertsApi.reducer, [employeeTrainingsApi.reducerPath]: employeeTrainingsApi.reducer}, middleware: getDefault => getDefault().concat(complianceAlertsApi.middleware, employeeTrainingsApi.middleware)});
  stores.push(store as any);
  const App = () => <Provider store={store}><MemoryRouter initialEntries={[url]}><Controls/>{withLayout ? <RouterRoutes><Route path="/agency/compliance-alerts" element={<AgencyLayout><ComplianceAlertsPage/></AgencyLayout>}/><Route path="/agency/dashboard" element={<p>Dashboard redirect</p>}/></RouterRoutes> : <ComplianceAlertsPage/>}</MemoryRouter></Provider>;
  return {...render(<App/>), store, App};
}
const emptyDocument = {pilotEnabled: true, items: [], nextCursor: null, syncStatus: 'ready', timezone: null, localDate: null, evaluatedAt: '2026-09-17T12:00:00Z'};
const document = {documentId:'doc', employeeId:'staff', employeeName:'Visible Staff', employeeStatus:'active', documentLabel:'CPR', condition:'expired', syncStatus:'ready', evaluatedAt:'2026-09-17T12:00:00Z'};
beforeEach(() => {
  vi.clearAllMocks(); mocks.realMode=false; mocks.mode='ddd'; mocks.database='staging'; mocks.user = {uid: 'viewer', userType: 'agency_staff', agencyId: 'agency', profile: {accessList:['Compliance Alerts','Trainings'], agencyModes:['ddd','hha','sc']}, agency:{supportedClientTypes:['ddd','hha','sc']}};
  mocks.request.mockImplementation(async (args: any) => {if(args.url==='/documents/compliance') {mocks.documentRequest(args); return {data: emptyDocument};} if(args.url==='/employees/trainings') {mocks.courseRequest(args); return {data:{items:[], nextCursor:null, summary:null,localDate:null}};} return {data:{items:[],nextCursor:null,coverage:'ready'}};});
});
afterEach(() => {cleanup(); stores.splice(0).forEach(store => {store.dispatch(complianceAlertsApi.util.resetApiState());store.dispatch(employeeTrainingsApi.util.resetApiState());});});
describe('scoped compliance workspace', () => {
  it('loads only staff selection for training-only access', async () => {
    setup(); expect(screen.getByRole('tab',{name:'Staff'})).toBeInTheDocument();
    expect(screen.getByText('Select a staff member to view training assignments.')).toBeInTheDocument();
    await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(1));
    expect(mocks.documentRequest).not.toHaveBeenCalled(); expect(mocks.courseRequest).not.toHaveBeenCalled();
    expect(mocks.request.mock.calls[0][0]).toMatchObject({url:'/agencies/trainings',params:{workspace:true,limit:8}});
  });
  it.each(['source=document_expiry','section=clients&source=training','source=training&startDate=2026-09-01'])('makes zero requests for forbidden or invalid %s', query => {
    setup('/agency/compliance-alerts?'+query); expect(screen.getByRole('alert')).toBeInTheDocument(); expect(mocks.request).not.toHaveBeenCalled();
  });
  it('typing requests nothing, Apply requests once, and back restores applied search', async () => {
    setup(); await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText('Search name'),{target:{value:'Ada'}}); expect(mocks.request).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button',{name:'Apply filters'})); await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(2)); expect(mocks.request.mock.calls[1][0]).toMatchObject({params:{search:'Ada'}});
    fireEvent.click(screen.getByText('Back')); await waitFor(() => expect(screen.getByLabelText('Search name')).toHaveValue(''));
  });
  it('SC remains SC and shows only supported staff checks', async () => {
    mocks.mode='sc'; setup('/agency/compliance-alerts'); await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(1));
    expect(mocks.request.mock.calls[0][0]).toMatchObject({params:{mode:'sc'}}); expect(screen.queryByRole('tab',{name:'Clients'})).not.toBeInTheDocument();
  });
  it('client-only access loads no staff or assignment detail requests', async () => {
    mocks.user.profile.accessList=['Compliance Alerts','Client Management']; setup('/agency/compliance-alerts');
    await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(1)); expect(mocks.request.mock.calls[0][0]).toMatchObject({url:'/clients/compliance/document-checklist',params:{status:'all',limit:25}});
  });
  it('disabled document pilot makes no legacy request and retains permitted action', async () => {
    mocks.user.userType='agency'; mocks.request.mockResolvedValue({data:{...emptyDocument,pilotEnabled:false}}); setup('/agency/compliance-alerts');
    expect(await screen.findByText('Expiry monitoring is not enabled. Open staff documents to review expiry.')).toBeInTheDocument(); expect(screen.getByRole('link',{name:'Open staff documents'})).toBeInTheDocument(); expect(mocks.request).toHaveBeenCalledTimes(1);
  });
  it('retains only same-scope stale rows after 503, then clears them after 403', async () => {
    mocks.user.userType='agency'; mocks.request.mockResolvedValueOnce({data:{...emptyDocument,items:[document]}}).mockResolvedValueOnce({error:{status:503}}).mockResolvedValue({error:{status:403}}); setup('/agency/compliance-alerts');
    await screen.findByText('Visible Staff'); fireEvent.click(screen.getByRole('button',{name:'Refresh'})); await screen.findByText(/Could not refresh. Showing results checked at/); expect(screen.getByText('Visible Staff')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Retry'})); await screen.findByText('You do not have access to these records. Ask your agency administrator.'); expect(screen.queryByText('Visible Staff')).not.toBeInTheDocument();
  });
  it('expired cursor hides its invalid page and offers reset', async () => {
    mocks.user.userType='agency'; mocks.request.mockResolvedValue({error:{status:409,data:{message:'COMPLIANCE_CURSOR_EXPIRED'}}}); setup('/agency/compliance-alerts?source=document_expiry&cursor=old');
    await screen.findByText(/These filters or this page are no longer valid/); expect(screen.getByRole('button',{name:'Reset view'})).toBeInTheDocument(); expect(mocks.request).toHaveBeenCalledTimes(1);
  });
  it.each(['actor','database','mode','permissions'])('suppresses an earlier pending response after %s changes', async boundary => {
    mocks.user.userType='agency'; let resolve!: (result:any)=>void; mocks.request.mockImplementationOnce(() => new Promise(done => {resolve=done;})).mockResolvedValue({data:emptyDocument});
    const {rerender,App}=setup('/agency/compliance-alerts'); await waitFor(()=>expect(mocks.request).toHaveBeenCalledTimes(1));
    if(boundary==='actor') mocks.user={...mocks.user,uid:'other'}; if(boundary==='database') mocks.database='default'; if(boundary==='mode') mocks.mode='hha'; if(boundary==='permissions') mocks.user={...mocks.user,userType:'agency_staff',profile:{...mocks.user.profile,accessList:['Compliance Alerts','Trainings']}};
    rerender(<App/>); await act(async()=>resolve({data:{...emptyDocument,items:[document]}})); expect(screen.queryByText('Visible Staff')).not.toBeInTheDocument();
  });
  it('preserves document reminder action', async()=>{
    mocks.user.userType='agency'; mocks.request.mockResolvedValue({data:{...emptyDocument,items:[document]}}); setup('/agency/compliance-alerts');
    fireEvent.click(await screen.findByRole('button',{name:'Send Alert'})); await waitFor(()=>expect(mocks.alert).toHaveBeenCalledWith('staff','doc'));
  });
});


it('preserves each source cursor and unsubscribes inactive lists', async()=>{
  mocks.user.userType='agency';
  mocks.request.mockImplementation(async(args:any)=>({data:args.url==='/documents/compliance'?{...emptyDocument,nextCursor:args.params.cursor?null:'next'}:{items:[],nextCursor:null,evaluatedAt:'2026-09-17T12:00:00Z'}}));
  const {store}=setup('/agency/compliance-alerts'); await screen.findByText('More results available');
  fireEvent.click(screen.getByRole('button',{name:'Next page'}));await waitFor(()=>expect(mocks.request).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole('tab',{name:'Clients'}));await waitFor(()=>expect(mocks.request).toHaveBeenCalledTimes(3));
  await act(async()=>{store.dispatch(complianceAlertsApi.util.invalidateTags(['DocumentCompliance']));});expect(mocks.request).toHaveBeenCalledTimes(3);
  fireEvent.click(screen.getByRole('tab',{name:'Staff'}));await waitFor(()=>expect(mocks.request).toHaveBeenCalledTimes(4));expect(mocks.request.mock.calls[3][0]).toMatchObject({url:'/documents/compliance',params:{cursor:'next'}});
});
it('uses a permitted URL mode without dropping the requested employee',async()=>{
  const {rerender,App}=setup('/agency/compliance-alerts?section=staff&source=training&mode=hha&employeeId=direct');expect(mocks.request).not.toHaveBeenCalled();
  mocks.mode='hha';rerender(<App/>);await waitFor(()=>expect(mocks.courseRequest).toHaveBeenCalledTimes(1));expect(mocks.courseRequest.mock.calls[0][0]).toMatchObject({params:{mode:'hha',employeeId:'direct'}});
});
it('does not change program or request data for an unauthorized URL mode',()=>{
  mocks.user.profile.agencyModes=['ddd'];setup('/agency/compliance-alerts?source=training&mode=hha');expect(screen.getByRole('alert')).toHaveTextContent('You do not have access');expect(mocks.request).not.toHaveBeenCalled();expect(mocks.mode).toBe('ddd');
});
it('preserves a legacy shiftId-only notification link without loading staff or client sources',async()=>{
  mocks.user.profile.accessList=['Compliance Alerts','Notes','Scheduling'];
  mocks.request.mockImplementation(async(args:any)=>({data:args.url==='/shifts/note-compliance'?{items:[],nextCursor:null,coverage:'ready'}:{shiftId:'shift-legacy',state:'missing',noteType:'hha-service-log',syncStatus:'ready',coverage:'ready',actions:[],reasonCodes:[]}}));
  setup('/agency/compliance-alerts?shiftId=shift-legacy');await screen.findByText('This shift ended without a submitted note.', {}, {timeout: 10000});
  expect(mocks.request.mock.calls.map(call=>(call[0] as any).url).sort()).toEqual(['/shifts/note-compliance','/shifts/shift-legacy/note-compliance']);
  expect(mocks.documentRequest).not.toHaveBeenCalled();expect(mocks.courseRequest).not.toHaveBeenCalled();
}, 20000);

describe('review regressions: layout mode and browser pagination', () => {
  it.each([undefined, 'ddd'] as const)('lets a permitted HHA URL reach the real mode store from %s', async initialMode => {
    mocks.realMode=true; mocks.user.profile.agencyModes=['hha']; mocks.user.agency.supportedClientTypes=['ddd','hha'];
    const {store}=setup('/agency/compliance-alerts?source=training&mode=hha&employeeId=direct', {withLayout:true,initialMode});
    await waitFor(()=>expect(store.getState().agencyMode.modeByAgency.agency).toBe('hha'));
    await waitFor(()=>expect(mocks.courseRequest).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Dashboard redirect')).not.toBeInTheDocument();
    expect(mocks.request.mock.calls.every(call=>(call[0] as any).params.mode==='hha')).toBe(true);
    expect(mocks.courseRequest.mock.calls[0][0]).toMatchObject({params:{employeeId:'direct',mode:'hha'}});
    expect(mocks.documentRequest).not.toHaveBeenCalled();
  });
  it('keeps the program selection screen when no mode or URL program is selected',()=>{
    mocks.realMode=true; mocks.user.agency.supportedClientTypes=['ddd','hha'];
    setup('/agency/compliance-alerts',{withLayout:true});
    expect(screen.queryByText('Dashboard redirect')).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:/HHA Program/})).toBeInTheDocument();
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('does not let an inaccessible URL program bypass the layout',()=>{
    mocks.realMode=true; mocks.user.profile.agencyModes=['ddd']; mocks.user.agency.supportedClientTypes=['ddd','hha'];
    const {store}=setup('/agency/compliance-alerts?source=training&mode=hha',{withLayout:true,initialMode:'ddd'});
    expect(screen.getByRole('alert')).toHaveTextContent('You do not have access');
    expect(store.getState().agencyMode.modeByAgency.agency).toBe('ddd'); expect(mocks.request).not.toHaveBeenCalled();
  });
  it.each([
    ['document_expiry','cursor','/documents/compliance',0],
    ['client_documents','cursor','/clients/compliance/document-checklist',0],
    ['shift_notes','cursor','/shifts/note-compliance',0],
    ['training','staffCursor','/agencies/trainings',0],
    ['training','cursor','/employees/trainings',1],
  ])('Previous follows browser Back/Forward for %s %s',async(source,field,endpoint,buttonIndex)=>{
    mocks.user.userType='agency';
    mocks.request.mockImplementation(async(args:any)=>({data:{...emptyDocument,coverage:'ready',summary:null,items:[],nextCursor:args.url!==endpoint?null:!args.params.cursor?'A':args.params.cursor==='A'?'B':null}}));
    setup('/agency/compliance-alerts?source='+source+(endpoint==='/employees/trainings'?'&employeeId=staff':''));
    const cursor=()=>new URLSearchParams(screen.getByLabelText('url').textContent || '').get(field);
    const next=()=>screen.getAllByRole('button',{name:'Next page'})[Number(buttonIndex)];
    const previous=()=>screen.getAllByRole('button',{name:'Previous page'})[Number(buttonIndex)];
    await waitFor(()=>expect(next()).toBeEnabled());await waitFor(()=>expect(next()).toBeEnabled());fireEvent.click(next());await waitFor(()=>expect(cursor()).toBe('A'));
    await waitFor(()=>expect(next()).toBeEnabled());await waitFor(()=>expect(next()).toBeEnabled());fireEvent.click(next());await waitFor(()=>expect(cursor()).toBe('B'));
    fireEvent.click(screen.getByText('Back'));await waitFor(()=>expect(cursor()).toBe('A'));
    await waitFor(()=>expect(previous()).toBeEnabled());fireEvent.click(previous());await waitFor(()=>expect(cursor()).toBeNull());
    fireEvent.click(screen.getByText('Back'));await waitFor(()=>expect(cursor()).toBe('A'));
    fireEvent.click(screen.getByText('Forward'));await waitFor(()=>expect(cursor()).toBeNull());
    await waitFor(()=>expect(next()).toBeEnabled());fireEvent.click(next());await waitFor(()=>expect(cursor()).toBe('A'));
    await waitFor(()=>expect(next()).toBeEnabled());fireEvent.click(next());await waitFor(()=>expect(cursor()).toBe('B'));
    fireEvent.click(screen.getByText('Back'));await waitFor(()=>expect(cursor()).toBe('A'));
    fireEvent.click(screen.getByText('Forward'));await waitFor(()=>expect(cursor()).toBe('B'));
    await waitFor(()=>expect(previous()).toBeEnabled());fireEvent.click(previous());await waitFor(()=>expect(cursor()).toBe('A'));
    await waitFor(()=>expect(previous()).toBeEnabled());fireEvent.click(previous());await waitFor(()=>expect(cursor()).toBeNull());
  });
});
