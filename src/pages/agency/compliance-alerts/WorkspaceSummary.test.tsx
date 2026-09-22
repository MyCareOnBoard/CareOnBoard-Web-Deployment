import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({staff:vi.fn(),summary:vi.fn()}));
vi.mock('./api',()=>({complianceAlertsApi:{injectEndpoints:()=>({useWorkspaceStaffQuery:mocks.staff,useWorkspaceSummaryQuery:mocks.summary})}}));
vi.mock('react-router',()=>({Link:({children,to}:any)=><a href={to}>{children}</a>}));
import {StaffWorkspace,WorkspaceSummary,WorkspaceReviewList} from './WorkspaceSummary';
const props={scopeKey:'scope',agencyId:'agency',viewerId:'owner',mode:'ddd',view:{source:'document_expiry' as const},onApply:vi.fn(),onSelect:vi.fn(),onPage:vi.fn(),onPrevious:vi.fn()};
beforeEach(()=>{vi.clearAllMocks();mocks.staff.mockReturnValue({currentData:{items:[{id:'one',name:'First',status:'active'},{id:'two',name:'Second',status:'active'}],nextCursor:'next-staff'},refetch:vi.fn()});mocks.summary.mockImplementation(({id}:any)=>({currentData:{alerts:{count:id==='one'?7:0,complete:id==='two'},name:id,evaluatedAt:'2026-09-22T00:00:00Z',sections:[{label:'Documents',state:'ready',items:[{id:'required',label:'Required documents',state:'missing'}]},{label:'Training',state:'restricted',items:[]}]},refetch:vi.fn()}));});
it('shows alert totals beside staff names and paginates staff records',()=>{
 render(<StaffWorkspace {...props}/>);
 expect(mocks.summary).toHaveBeenCalledWith(expect.objectContaining({id:'one'}),expect.anything());
 expect(screen.getByLabelText('At least 7 alerts; checks incomplete')).toBeInTheDocument();
 expect(screen.getByLabelText('0 alerts')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Review Second'}));
 expect(screen.getByRole('region',{name:'Second details'})).toBeInTheDocument();
 expect(screen.queryByRole('combobox',{name:'Expiry status'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Next page'}));expect(props.onPage).toHaveBeenCalledWith('next-staff');
});
it('renders restricted and loading checks explicitly',()=>{
 const {rerender}=render(<WorkspaceSummary kind="staff" id="one" {...props}/>);
 fireEvent.click(screen.getByText('Training'));
 expect(screen.getByText('You do not have access to these checks.')).toBeInTheDocument();
 expect(screen.getByText('Missing')).toBeInTheDocument();
 mocks.summary.mockReturnValue({isFetching:true,refetch:vi.fn()});
 rerender(<WorkspaceSummary kind="staff" id="two" {...props}/>);
 expect(screen.getByRole('status',{name:'Checking compliance requirements…'})).toBeInTheDocument();
 expect(screen.queryByText('Missing')).not.toBeInTheDocument();
});
it('honors direct staff selection without depending on a staff list page',()=>{
 render(<StaffWorkspace {...props} view={{source:'document_expiry',employeeId:'linked'}}/>);
 expect(mocks.staff).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({skip:true}));
 expect(mocks.summary).toHaveBeenCalledWith(expect.objectContaining({id:'linked'}),expect.anything());
});

it('limits background checks to two until results finish and renders errors without zero',async()=>{
 mocks.summary.mockImplementation((_args:any,options:any)=>({isFetching:!options?.skip,refetch:vi.fn()}));
 const items=['one','two','three'].map(id=>({id,title:id,detail:<span>Details</span>}));
 const {rerender}=render(<WorkspaceReviewList {...props} kind="staff" items={items} label="Staff"/>);
 expect(mocks.summary).toHaveBeenCalledWith(expect.objectContaining({id:'three'}),expect.objectContaining({skip:true}));
 mocks.summary.mockImplementation(({id}:any)=>id==='one'?{error:{status:503},refetch:vi.fn()}:{isFetching:true,refetch:vi.fn()});
 rerender(<WorkspaceReviewList {...props} kind="staff" items={items} label="Staff"/>);
 await waitFor(()=>expect(mocks.summary).toHaveBeenCalledWith(expect.objectContaining({id:'three'}),expect.objectContaining({skip:false})));
 expect(screen.getByLabelText('Alert count unavailable')).toBeInTheDocument();
 expect(screen.queryByText('0 alerts')).not.toBeInTheDocument();
});
