import {render, screen} from '@testing-library/react';
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
it.each([['baselining','Checking records. Some results are not available yet.'],['paused','Monitoring is paused.']])('renders document %s coverage',(monitoringState,message)=>{mocks.documents.mockReturnValue({currentData:{pilotEnabled:true,monitoringState,syncStatus:'ready',items:[],nextCursor:null},refetch:vi.fn()});render(<StaffChecks {...props} view={{source:'document_expiry'}}/>);expect(screen.getByText(message)).toBeInTheDocument();});
