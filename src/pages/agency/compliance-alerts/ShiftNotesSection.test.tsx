import {fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, expect, it, vi} from 'vitest';
import {useState} from 'react';
const mocks = vi.hoisted(() => ({query: vi.fn(), detail: vi.fn()}));
vi.mock('@/utils/auth', () => ({useAuth: () => ({user:{userType:'agency'}})}));
vi.mock('@/lib/api/career-reconciliation', () => ({canReviewCareer: () => true}));
vi.mock('./api', () => ({useGetShiftNoteComplianceQuery: mocks.query}));
vi.mock('@/pages/shared/notes/ShiftNoteStatus', () => ({default: (props: any) => {mocks.detail(props); return <p>Detail</p>;}}));
vi.mock('react-router', () => ({Link: ({children,to}: any) => <a href={to}>{children}</a>}));
import ShiftNotesSection from './ShiftNotesSection';
import type {ComplianceView} from './workspaceScope';
function Harness({initial = {source:'shift_notes'}, scopeKey = 'scope'}: {initial?: ComplianceView; scopeKey?: string}) {const [view,setView]=useState(initial);return <ShiftNotesSection scopeKey={scopeKey} agencyId="agency" viewerId="viewer" mode="ddd" view={view} onApply={next=>setView({...next,cursor:undefined})} onSelect={next=>setView({...view,...next})} onPage={cursor=>setView({...view,cursor})} onPrevious={()=>setView({...view,cursor:undefined})}/>;}
beforeEach(()=>{vi.clearAllMocks();mocks.query.mockReturnValue({currentData:{items:[],nextCursor:'next',coverage:'ready'},refetch:vi.fn()});});
it('retains empty-page continuation and applies draft filters only on submit',()=>{
  render(<Harness/>); expect(mocks.detail).not.toHaveBeenCalled(); expect(screen.getByText('No matches on this page. More records are available.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Next page'})); expect(mocks.query).toHaveBeenLastCalledWith(expect.objectContaining({cursor:'next',limit:25,scopeKey:'scope'}),expect.anything());
  fireEvent.change(screen.getByLabelText('Shift note status filter'),{target:{value:'approved'}});expect(mocks.query).toHaveBeenLastCalledWith(expect.objectContaining({cursor:'next',stateGroup:'unresolved'}),expect.anything());
  fireEvent.click(screen.getByRole('button',{name:'Apply filters'}));expect(mocks.query).toHaveBeenLastCalledWith(expect.objectContaining({cursor:undefined,stateGroup:'approved'}),expect.anything());
});
it.each(['disabled','checking','unavailable','paused'])('does not show a complete empty state for %s',coverage=>{mocks.query.mockReturnValue({currentData:{items:[],nextCursor:null,coverage},refetch:vi.fn()});render(<Harness/>);expect(screen.queryByText('No matching records in this view')).not.toBeInTheDocument();});
it('opens details only on explicit selection and preserves contextual action',async()=>{
  mocks.query.mockReturnValue({currentData:{items:[{shiftId:'shift',employeeName:'Ada',clientName:'Client',clientId:'client',noteType:'career-planning',state:'needs_correction',syncStatus:'ready',checkedAt:null}],nextCursor:null,coverage:'ready'},refetch:vi.fn()});render(<Harness/>);
  expect(screen.getByText('Needs correction')).toBeInTheDocument();expect(mocks.detail).not.toHaveBeenCalled(); expect(screen.getByRole('link',{name:'Usage & reconciliation'})).toHaveAttribute('href',expect.stringContaining('clientId=client'));
  fireEvent.click(screen.getByRole('button',{name:'Open shift note'}));await screen.findByText('Detail');expect(mocks.detail).toHaveBeenLastCalledWith(expect.objectContaining({shiftId:'shift',scopeKey:'scope'}));
});

it('explains pending inventory once and hides empty pagination',()=>{
 mocks.query.mockReturnValue({currentData:{items:[],nextCursor:null,coverage:'checking'},refetch:vi.fn()});render(<Harness/>);
 expect(screen.getByRole('status')).toHaveTextContent('Monitoring is enabled.');
 expect(screen.queryByText('Shift-note checking is not complete.')).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Next page'})).not.toBeInTheDocument();
 expect(screen.queryByText('No matching shift notes')).not.toBeInTheDocument();
});
it('shows a skeleton while loading and a clear empty state only when ready',()=>{
 mocks.query.mockReturnValue({isFetching:true,refetch:vi.fn()});const {rerender}=render(<Harness/>);
 expect(screen.getByRole('status',{name:'Checking shift notes…'})).toBeInTheDocument();
 mocks.query.mockReturnValue({currentData:{items:[],nextCursor:null,coverage:'ready'},refetch:vi.fn()});rerender(<Harness/>);
 expect(screen.getByText('No matching shift notes')).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Next page'})).not.toBeInTheDocument();
});

it('opens a linked shift inside its selected panel and closes it without losing the list',async()=>{
 mocks.query.mockReturnValue({currentData:{items:['first','linked'].map(shiftId=>({shiftId,employeeName:shiftId,clientName:'Client',state:'missing'})),nextCursor:null,coverage:'ready'},refetch:vi.fn()});
 render(<Harness initial={{source:'shift_notes',shiftId:'linked'}}/>);
 await screen.findByText('Detail');expect(screen.getByRole('button',{name:'Review linked'})).toHaveAttribute('aria-pressed','true');
 fireEvent.click(screen.getByRole('button',{name:'Close selected record'}));
 expect(screen.queryByText('Detail')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Review first'})).toBeInTheDocument();
});
