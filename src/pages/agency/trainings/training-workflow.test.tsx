import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import AgencyTrainings from './index';
import ReviewTrainingsModal from './reviewTrainingsModal';

const state = vi.hoisted(() => ({
  search: '',
  staffLoading: false,
  setSearch: vi.fn(),
  staff: {items: [] as any[], nextCursor: null as string | null},
  courses: {items: [] as any[], nextCursor: null as string | null, summary: null, localDate: null},
  approval: vi.fn(),
  courseArgs: [] as any[],
  loadCourses: vi.fn(),
  evidenceGet: vi.fn(),
  policyMutation: vi.fn(),
}));

vi.mock('@/lib/axios', () => ({default:{get:state.evidenceGet}}));
vi.mock('react-router', () => ({useSearchParams: () => [new URLSearchParams(state.search), state.setSearch]}));
vi.mock('@/hooks/useAssignmentReview', () => ({useAssignmentReviewScope: () => 'scope'}));
vi.mock('@/utils/auth', () => ({useAuth: () => ({user: {agencyId: 'agency-1'}})}));
vi.mock('@/hooks/useStaffLabels', () => ({useStaffLabels: () => ({labels: {noun: 'Staff'}})}));
vi.mock('@/hooks/useEffectiveAgencyMode', () => ({useEffectiveAgencyMode: () => 'ddd'}));
vi.mock('framer-motion', () => ({AnimatePresence: ({children}: any) => children, motion: {div: 'div'}}));
vi.mock('sonner', () => ({toast: {success: vi.fn(), error: vi.fn()}}));
vi.mock('./assignTraining', () => ({default: () => null}));
vi.mock('./TrainingCertificate', () => ({default: () => null}));
vi.mock('./trainingApi', () => ({
  useGetTrainingsQuery: () => ({currentData: state.staff, isFetching: state.staffLoading, isError: false}),
  useLazyGetEmployeeTrainingsQuery: () => [state.loadCourses, {isFetching: false}],
  useSaveTrainingMutation: () => [vi.fn(), {isLoading: false}],
  useApproveTrainingMutation: () => [state.approval],
  usePolicyEvidenceMutation: () => [state.policyMutation, {isLoading: false}],
}));

describe('agency training pagination', () => {
  beforeEach(() => {
    state.search = '';
    state.staffLoading = false;
    state.staff = {items: [], nextCursor: null};
    state.courses = {items: [], nextCursor: null, summary: null, localDate: null};
    state.approval.mockReset();
    state.evidenceGet.mockReset();
    state.policyMutation.mockReset();
    state.policyMutation.mockReturnValue({unwrap: async () => undefined});
    state.evidenceGet.mockResolvedValue({data:{items:[],nextCursor:null}});
    state.loadCourses.mockImplementation((args: any) => { state.courseArgs.push(args); const response = state.courses; return {unwrap: async () => response}; });
    state.courseArgs.length = 0;
  });

  it('shows skeleton rows while fetching and replaces them with staff when ready', () => {
    state.staffLoading = true;
    state.staff = {items: [{id: 'employee-1', fullName: 'Ada Lovelace', status: 'Assigned', assignedCount: 2}], nextCursor: null};
    const {rerender} = render(<AgencyTrainings />);
    const loading = screen.getByRole('status', {name: 'Loading trainings'});
    expect(loading.querySelectorAll('[aria-hidden="true"]')).toHaveLength(8);
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
    expect(screen.queryByText('No data available')).not.toBeInTheDocument();

    state.staffLoading = false;
    rerender(<AgencyTrainings />);
    expect(screen.queryByRole('status', {name: 'Loading trainings'})).not.toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('opens a validated employee deep link without scanning staff pages', async () => {
    state.search = 'employeeId=direct-employee';
    render(<AgencyTrainings />);
    await waitFor(() => expect(state.courseArgs[0]).toMatchObject({employeeId: 'direct-employee', agencyId: 'agency-1', limit: 25}));
    expect(state.courseArgs[0].mode).toBeUndefined();
    expect(screen.getByText('Selected staff member')).toBeInTheDocument();
  });
  it('rejects unsafe employee deep links', () => {
    state.search = 'employeeId=a%2Fb'; render(<AgencyTrainings />);
    expect(state.courseArgs).toHaveLength(0);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid staff selection');
  });
  it('offers continuation for an empty filtered page when the server returns a cursor', () => {
    state.search = '';
    state.staff = {items: [], nextCursor: 'next-page'};
    render(<AgencyTrainings />);
    expect(screen.queryByText('No data available')).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Load more results'})).toBeInTheDocument();
  });

  it('distinguishes required courses from saved assignments and explains pending setup', async () => {
    state.staff = {items: [{id:'employee-1',fullName:'Ada',status:'active',assignedCount:0,requiredCount:14}],nextCursor:null};
    state.courses = {...state.courses,summary:{policyPendingAssignmentCount:14}} as any;
    render(<AgencyTrainings />);
    expect(screen.getByText('0 assigned')).toBeInTheDocument();
    expect(screen.getByText('14 automatic requirements')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Review Trainings'}));
    expect(await screen.findByText('14 automatic training assignments are pending.')).toBeInTheDocument();
    expect(screen.queryByText('No trainings available')).not.toBeInTheDocument();
  });
  it('loads employee courses only when review opens', async () => {
    state.search = '';
    state.staff = {items: [{id: 'employee-1', fullName: 'Ada Lovelace', profilePictureUrl: '', status: 'Assigned', assignedCount: 2}], nextCursor: null};
    render(<AgencyTrainings />);
    expect(state.courseArgs).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', {name: 'Review Trainings'}));
    await waitFor(() => expect(state.courseArgs[0]).toMatchObject({employeeId: 'employee-1', agencyId: 'agency-1', limit: 25, mode: 'ddd'}));
  });

  it('keeps approval unchanged when the review mutation fails', async () => {
    state.courses = {items: [{id: 'training-1', name: 'CPR', timeFrame: '30 days', assignedDsp: 'employee-1', trainingType: 'manual', completedAt: '2026-09-01', status: 'Completed', approved: false}], nextCursor: null, summary: null, localDate: null};
    state.approval.mockReturnValue({unwrap: async () => { throw new Error('failed'); }});
    render(<ReviewTrainingsModal open onOpenChange={vi.fn()} employee={{id: 'employee-1', fullName: 'Ada', role: 'Staff'}} />);
    const toggle = await screen.findByRole('button', {name: 'Approve CPR'});
    fireEvent.click(toggle);
    await waitFor(() => expect(state.approval).toHaveBeenCalled());
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('binds certificate approval to the exact uploaded certificate', async () => {
    state.courses.items = [{id: 'training-1', name: 'CPR', assignedDsp: 'employee-1', status: 'Awaiting Review', approved: false, requiresCertificate: true, certificateId: 'cert-1'}];
    state.approval.mockReturnValue({unwrap: async () => undefined});
    render(<ReviewTrainingsModal open onOpenChange={vi.fn()} employee={{id: 'employee-1', fullName: 'Ada', role: 'Staff'}} />);
    fireEvent.click(await screen.findByRole('button', {name: 'Approve CPR'}));
    await waitFor(() => expect(state.approval).toHaveBeenCalledWith({agencyId: 'agency-1', employeeId: 'employee-1', trainingId: 'training-1', approved: true, certificateId: 'cert-1'}));
    expect(await screen.findByText('Completed')).toBeInTheDocument();
  });

  it('does not offer approval before a certificate is submitted', async () => {
    state.courses.items = [{id: 'training-1', name: 'CPR', assignedDsp: 'employee-1', status: 'Not Completed', approved: false, requiresCertificate: true}];
    render(<ReviewTrainingsModal open onOpenChange={vi.fn()} employee={{id: 'employee-1', fullName: 'Ada', role: 'Staff'}} />);
    await screen.findByText('Waiting for a completion certificate.');
    expect(screen.queryByRole('button', {name: 'Approve CPR'})).not.toBeInTheDocument();
  });
  it('opens assignment evidence in the selected agency without approval actions', async () => {
    state.courses.items = [{id: 'training-1', name: 'CPR', requiresCertificate: true, certificateId: 'cert-1', status: 'Awaiting Review'}];
    render(<ReviewTrainingsModal open onOpenChange={vi.fn()} employee={{id: 'employee-1', fullName: 'Ada', role: 'Staff'}} agencyId="selected-agency" mode="hha" readOnly />);
    await screen.findByText('CPR');
    expect(state.courseArgs[0]).toEqual({employeeId: 'employee-1', agencyId: 'selected-agency', mode: 'hha', limit: 25});
    expect(screen.queryByRole('button', {name: 'Approve CPR'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Request changes for CPR'})).not.toBeInTheDocument();
    expect(state.approval).not.toHaveBeenCalled();
  });
  it('collapses training details without losing a draft review explanation', async () => {
    state.courses.items = [0, 1].map(index => ({id:'policy-'+index,name:'Safety course '+index,assignedDsp:'employee-1',source:'policy',policyContextState:'current',policyProgram:'hha',requiresCertificate:true,deadlineState:'before_work',latestCertificate:{id:'cert-1',completedOnDate:'2026-09-01'}}));
    render(<ReviewTrainingsModal open onOpenChange={vi.fn()} employee={{id:'employee-1',fullName:'Ada',role:'HHA'}} mode="hha"/>);
    const first = (await screen.findByText('Safety course 0')).closest('details');
    const second = screen.getByText('Safety course 1').closest('details');
    expect(first).toHaveAttribute('open');
    expect(second).not.toHaveAttribute('open');
    const explanation = first!.querySelector('details')!;
    fireEvent.click(explanation.querySelector('summary')!);
    const input = first!.querySelector('textarea')!;
    fireEvent.change(input, {target:{value:'Please provide a legible certificate.'}});
    fireEvent.click(first!.querySelector('summary')!);
    expect(first).not.toHaveAttribute('open');
    fireEvent.click(first!.querySelector('summary')!);
    expect(first).toHaveAttribute('open');
    expect(first!.querySelector('textarea')).toHaveValue('Please provide a legible certificate.');
    expect(state.evidenceGet).not.toHaveBeenCalled();
    expect(state.approval).not.toHaveBeenCalled();
  });
  it('waits for staff uploads and keeps certificate history read-only', async () => {
    state.courses.items = [{id:'policy-1',name:'Safety',assignedDsp:'employee-1',source:'policy',policyContextState:'current',requiresCertificate:true,deadlineState:'overdue'}];
    state.evidenceGet.mockResolvedValue({data:{items:[{id:'cert-old',fileName:'old-certificate.pdf'}],nextCursor:null}});
    render(<ReviewTrainingsModal open onOpenChange={vi.fn()} employee={{id:'employee-1',fullName:'Ada',role:'Staff'}}/>);
    await screen.findByText('Staff must upload their completion certificate from Trainings on their dashboard.');
    expect(screen.queryByRole('button',{name:/Use existing certificate|Link staff document|Correct dates|Approve certificate|Request changes/})).not.toBeInTheDocument();
    expect(screen.queryByText('Review explanation')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Certificate history'}));
    await screen.findByText('old-certificate.pdf');
    expect(screen.queryByRole('button',{name:/Use this certificate|Link certificate for review/})).not.toBeInTheDocument();
    expect(state.policyMutation).not.toHaveBeenCalled();
  });
  it('lets administrators review the staff submission and require a reason for changes', async () => {
    state.courses.items = [{id:'policy-1',name:'Safety',assignedDsp:'employee-1',source:'policy',policyContextState:'current',requiresCertificate:true,certificateId:'cert-1',latestCertificate:{id:'cert-1',completedOnDate:'2026-09-01'},reviewRevision:2,reviewState:'awaiting_review'}];
    render(<ReviewTrainingsModal open onOpenChange={vi.fn()} employee={{id:'employee-1',fullName:'Ada',role:'Staff'}}/>);
    fireEvent.click(await screen.findByRole('button',{name:'Approve certificate'}));
    await waitFor(()=>expect(state.policyMutation).toHaveBeenCalledWith({trainingId:'policy-1',employeeId:'employee-1',action:'review',data:{certificateId:'cert-1',decision:'accept',expectedReviewRevision:2}}));
    expect(screen.getByRole('button',{name:'Request changes'})).toBeDisabled();
    fireEvent.click(screen.getByText('Review explanation'));
    fireEvent.change(screen.getByLabelText('Required when requesting changes or revoking evidence'),{target:{value:'Upload a legible certificate.'}});
    fireEvent.click(screen.getByRole('button',{name:'Request changes'}));
    await waitFor(()=>expect(state.policyMutation).toHaveBeenLastCalledWith({trainingId:'policy-1',employeeId:'employee-1',action:'review',data:{certificateId:'cert-1',decision:'request_changes',reason:'Upload a legible certificate.',expectedReviewRevision:2}}));
  });
  it('renders fourteen HHA rows without fetching history until one is opened', async () => {
    state.courses.items = Array.from({length:14},(_,index)=>({id:'hha-'+index,name:'HHA course '+index,assignedDsp:'employee-1',source:'policy',policyContextState:'current',policyProgram:'hha',requiresCertificate:true,deadlineState:'before_work',latestCertificate:{id:'cert-1',completedOnDate:'2026-09-01'}}));
    render(<ReviewTrainingsModal open onOpenChange={vi.fn()} employee={{id:'employee-1',fullName:'Ada',role:'HHA'}} mode="hha"/>);
    await screen.findByText('HHA course 13');
    expect(state.evidenceGet).not.toHaveBeenCalled();
    expect(screen.queryByRole('button',{name:/Use existing certificate|Link staff document|Correct dates/})).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button',{name:'Certificate history'})[0]);
    await waitFor(()=>expect(state.evidenceGet).toHaveBeenCalledTimes(1));
    expect(state.evidenceGet.mock.calls[0][1].params).toEqual({kind:'certificates',limit:25});
  });
  it('selects only accepted current certificates without approving trainings', async () => {
    const accepted = {id: 'accepted', name: 'Accepted CPR', requiresCertificate: true, certificateId: 'a'.repeat(64), status: 'Completed', approved: true};
    state.courses.items = [accepted, {...accepted, id: 'policy', name: 'Policy', source: 'policy'}, {...accepted, id: 'pending', name: 'Pending', approved: false}, {...accepted, id: 'legacy', name: 'Legacy', requiresCertificate: false}];
    const selected = vi.fn();
    render(<ReviewTrainingsModal open onOpenChange={vi.fn()} employee={{id: 'employee-1', fullName: 'Ada', role: 'Staff'}} readOnly onSelectCertificate={selected} />);
    fireEvent.click(await screen.findByRole('button', {name: 'Select certificate for Accepted CPR'}));
    expect(selected).toHaveBeenCalledWith({trainingId: 'accepted', certificateId: 'a'.repeat(64)});
    expect(screen.getAllByRole('button', {name: /Select certificate for/})).toHaveLength(1);
    expect(state.approval).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', {name: /Approve|Request changes/})).toBeNull();
  });
});
