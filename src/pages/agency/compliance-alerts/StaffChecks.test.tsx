vi.mock('./WorkspaceSummary',()=>({StaffWorkspace:()=> <div>Staff workspace</div>,WorkspaceSummary:()=> <div>Additional compliance summary</div>}));
import {fireEvent, render, screen, within} from '@testing-library/react';
import {beforeEach, expect, it, vi} from 'vitest';
const mocks=vi.hoisted(()=>({documents:vi.fn(),staff:vi.fn(),courses:vi.fn()}));
vi.mock('./api',()=>({useGetDocumentComplianceQuery:mocks.documents,useComplianceDateRefresh:vi.fn()}));
vi.mock('../trainings/trainingApi',()=>({useGetTrainingsQuery:mocks.staff,useGetEmployeeTrainingsQuery:mocks.courses}));
vi.mock('@/utils/auth',()=>({useAuth:()=>({user:{userType:'agency'}})}));
vi.mock('@/hooks/use-toast',()=>({useToast:()=>({toast:vi.fn()})}));
vi.mock('@/lib/api/employee-documents',()=>({sendDocumentAlert:vi.fn()}));
vi.mock('react-router',()=>({Link:({children,to}:any)=><a href={to}>{children}</a>}));
import StaffChecks from './StaffChecks';
const props={scopeKey:'scope',agencyId:'agency',viewerId:'viewer',mode:'ddd',view:{source:'training' as const,employeeId:'employee'},onApply:vi.fn(),onSelect:vi.fn(),onPage:vi.fn(),onPrevious:vi.fn()};
beforeEach(()=>{vi.clearAllMocks();mocks.staff.mockReturnValue({currentData:{items:[],nextCursor:null},refetch:vi.fn()});mocks.courses.mockReturnValue({currentData:{items:[],nextCursor:null},refetch:vi.fn()});});
it.each([
  [{status:'Not Completed',evidenceStatus:'not_applicable'},'Not completed'],
  [{status:'Awaiting Review',evidenceStatus:'not_applicable'},'Certificate awaiting review'],
  [{status:'Changes Requested',evidenceStatus:'not_applicable'},'Changes requested'],
  [{status:'Completed',evidenceStatus:'accepted'},'Completion accepted — certificate on record'],
  [{status:'Completed',evidenceStatus:'legacy'},'Legacy completion recorded; certificate acceptance not checked'],
  [{status:'Completed',evidenceStatus:'needs_review'},'Needs review'],
  [{status:'Completed',source:'policy',evidenceStatus:'not_applicable'},'Not assessed'],
])('renders precise training evidence %j',(row,label)=>{mocks.courses.mockReturnValue({currentData:{items:[{id:'course',name:'CPR',timeFrame:'Within a month',...row}],nextCursor:null},refetch:vi.fn()});render(<StaffChecks {...props}/>);expect(screen.getByText(label)).toBeInTheDocument();expect(screen.getByText('Assigned timeframe: Within a month')).toBeInTheDocument();expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument();});
it('zero training assignments is not clearance',()=>{render(<StaffChecks {...props}/>);expect(screen.getByText('No training assignments found')).toBeInTheDocument();});
it.each([['baselining','Checking records. Some results are not available yet.'],['paused','Monitoring is paused.']])('renders document %s coverage',(monitoringState,message)=>{mocks.documents.mockReturnValue({currentData:{pilotEnabled:true,monitoringState,syncStatus:'ready',items:[],nextCursor:null},refetch:vi.fn()});render(<StaffChecks {...props} mode="sc" view={{source:'document_expiry'}}/>);expect(screen.getByText(message)).toBeInTheDocument();});

it('groups findings by staff identity and keeps each document action',()=>{
  const item={employeeId:'one',employeeName:'Sam',employeeStatus:'active',program:'ddd',condition:'expired',syncStatus:'ready'};
  mocks.documents.mockReturnValue({currentData:{pilotEnabled:true,syncStatus:'ready',items:[
    {...item,issueId:'a',documentId:'a',documentLabel:'CPR'},
    {...item,issueId:'b',documentId:'b',documentLabel:'TB test'},
    {...item,employeeId:'two',issueId:'c',documentId:'c',documentLabel:'Photo ID'},
  ],nextCursor:null},refetch:vi.fn()});
  render(<StaffChecks {...props} mode="sc" view={{source:'document_expiry'}}/>);
  const staff=screen.getAllByRole('button',{name:'Review Sam'});
  expect(staff).toHaveLength(2);
  expect(screen.getByText('2 document findings on this page')).toBeInTheDocument();
  const detail=screen.getByRole('region',{name:'Sam details'});
  expect(within(detail).getAllByRole('link',{name:'Open staff documents'}).map(link=>link.getAttribute('href'))).toEqual([
    '/agency/dsp-management/one?documentId=a','/agency/dsp-management/one?documentId=b',
  ]);
  fireEvent.click(staff[1]);
  expect(screen.getByText('Photo ID')).toBeInTheDocument();
  expect(screen.queryByText('TB test')).not.toBeInTheDocument();
});

it('keeps staff selection, closing, and staff pagination in the shared compliance layout',()=>{
 mocks.staff.mockReturnValue({currentData:{items:[{id:'employee',fullName:'Sam',assignedCount:14},{id:'other',fullName:'Other staff',assignedCount:3}],nextCursor:'next-staff'},refetch:vi.fn()});
 const {rerender}=render(<StaffChecks {...props}/>);
 expect(screen.getByRole('region',{name:'Sam details'})).toBeInTheDocument();
 expect(screen.getByText('14 assigned')).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Open training review'})).toHaveAttribute('href','/agency/trainings?employeeId=employee');
 fireEvent.click(screen.getByRole('button',{name:'Review Other staff'}));
 expect(props.onSelect).toHaveBeenCalledWith({employeeId:'other',cursor:undefined});
 fireEvent.click(screen.getByRole('button',{name:'Close selected record'}));
 expect(props.onSelect).toHaveBeenCalledWith({employeeId:undefined,cursor:undefined});
 rerender(<StaffChecks {...props} view={{source:'training'}}/>);
 expect(screen.queryByRole('region',{name:'Sam details'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Next page'}));
 expect(props.onPage).toHaveBeenCalledWith('next-staff',true);
});
it('shows training skeletons and preserves unassessed policy status',()=>{
 mocks.courses.mockReturnValue({isFetching:true,refetch:vi.fn()});
 const {rerender}=render(<StaffChecks {...props}/>);
 expect(screen.getByRole('status',{name:'Loading training assignments…'})).toBeInTheDocument();
 mocks.courses.mockReturnValue({currentData:{items:[{id:'policy',name:'Policy course',source:'policy',policyContextState:'updating',deadlineState:'overdue'}],nextCursor:null},refetch:vi.fn()});
 rerender(<StaffChecks {...props}/>);
 expect(screen.getByText('Updating requirements')).toHaveClass('compliance-badge-neutral');
 expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
 expect(screen.queryByText('Assigned timeframe: Not recorded')).not.toBeInTheDocument();
});
