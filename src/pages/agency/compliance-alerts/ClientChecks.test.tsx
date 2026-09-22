vi.mock('./WorkspaceSummary',async()=>({WorkspaceReviewList:(await import('./CompliancePresentation')).ComplianceReviewList,StaffWorkspace:()=> <div>Staff workspace</div>,WorkspaceSummary:()=> <div>Additional compliance summary</div>}));
import {render, screen, fireEvent} from '@testing-library/react';
import {beforeEach, expect, it, vi} from 'vitest';
const mocks=vi.hoisted(()=>({query:vi.fn(),unsigned:vi.fn()}));
vi.mock('./api',()=>({useGetClientChecklistPageQuery:mocks.query,useGetUnsignedForm485PageQuery:mocks.unsigned,useComplianceDateRefresh:vi.fn()}));
vi.mock('react-router',()=>({Link:({children,to}:any)=><a href={to}>{children}</a>}));
import ClientChecks from './ClientChecks';
const props={scopeKey:'scope',agencyId:'agency',viewerId:'viewer',mode:'ddd',view:{source:'client_documents' as const,cursor:'page2'},onApply:vi.fn(),onSelect:vi.fn(),onPage:vi.fn(),onPrevious:vi.fn()};
const row=(key:string,status:string)=>({key,status,expiryDate:null});
const client=(id:string,rows:any[],program='ddd')=>({id,name:id,status:'active',documentChecklist:{state:'ready',groups:[{program,rows}]}});
beforeEach(()=>{vi.clearAllMocks();mocks.query.mockReturnValue({currentData:{items:[],nextCursor:'next',evaluatedAt:'2026-09-17T12:00:00Z'},refetch:vi.fn()});mocks.unsigned.mockReturnValue({currentData:{items:[],nextCursor:'next',evaluatedAt:'2026-09-17T12:00:00Z'},refetch:vi.fn()});});
it('keeps no-expiry informational and filters only displayed client rows without changing the page',()=>{
  mocks.query.mockReturnValue({currentData:{items:[client('Info',[row('isp','on_file_no_expiry')]),client('Review',[row('pcpt','multiple_files')]),{id:'Unavailable',name:'Unavailable',status:'active',documentChecklist:{state:'unavailable',groups:[]}}],nextCursor:'next'},refetch:vi.fn()});render(<ClientChecks {...props}/>);
  expect(screen.getByText('On file — expiry not recorded')).toBeInTheDocument();fireEvent.click(screen.getByRole('checkbox',{name:'Document issues on this page'}));expect(screen.queryByText('Info')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Review Review'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Review Unavailable'}));expect(screen.getByText(/Checklist unavailable. Saved/)).toBeInTheDocument();expect(props.onPage).not.toHaveBeenCalled();expect(props.onApply).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Next page'})).toBeEnabled();
});
it.each([['ddd',['isp','pcpt','sdr']],['hha',['form485','poc','physicianOrders','clinicalAssessment']]])('renders %s checklist source slots and existing action links',(program,keys)=>{
  mocks.query.mockReturnValue({currentData:{items:[client('Client',(keys as string[]).map(key=>row(key,'not_uploaded')),program as string)],nextCursor:null},refetch:vi.fn()});render(<ClientChecks {...props}/>);expect(screen.getAllByText('Not uploaded')).toHaveLength(keys.length);expect(screen.getByRole('link',{name:'Open client assignment review',hidden:true})).toHaveAttribute('href',expect.stringContaining('tab=services'));expect(screen.getByText('Assignment review: Not checked here')).toBeInTheDocument();
});
it('retains continuation on an empty scan page',()=>{render(<ClientChecks {...props}/>);expect(screen.getByText('No matches on this page. More records are available.')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Next page'}));expect(props.onPage).toHaveBeenCalledWith('next');});
it('uses only the bounded unsigned endpoint and preserves deadline/deactivation meaning',()=>{
  mocks.unsigned.mockReturnValue({currentData:{items:[{id:'client',name:'Client',status:'inactive',deadline:null,daysLeft:-1,deactivated:true}],nextCursor:null,evaluatedAt:'2026-09-17T12:00:00Z'},refetch:vi.fn()});render(<ClientChecks {...props} mode="hha" view={{source:'unsigned_form485'}}/>);expect(mocks.query).not.toHaveBeenCalled();expect(screen.getByText('Deactivated — signed 485 overdue')).toBeInTheDocument();expect(screen.getByText('No deadline set')).toBeInTheDocument();
});
