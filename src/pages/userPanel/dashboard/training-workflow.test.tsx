import {fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import Dashboard from './index';

const state = vi.hoisted(() => ({trainingArgs: [] as any[], dispatch: vi.fn()}));
let trainingPage = {items: [{id: 'one', name: 'First', timeFrame: '30 days', assignedDsp: 'employee-1', trainingType: 'manual', completedAt: null, status: 'Assigned', approved: false}], nextCursor: 'cursor-2', summary: null, localDate: '2026-09-16'};
beforeEach(() => { state.trainingArgs.length = 0; state.dispatch.mockClear(); trainingPage = {...trainingPage, items: [{id: 'one', name: 'First', timeFrame: '30 days', assignedDsp: 'employee-1', trainingType: 'manual', completedAt: null, status: 'Assigned', approved: false}]}; });
vi.mock('@/utils/auth', () => ({useAuth: () => ({user: {uid: 'employee-1', profile: {}}}), setUser: vi.fn()}));
vi.mock('@/lib/firebase', () => ({auth: {currentUser: null}}));
vi.mock('@/lib/api/users', () => ({getUser: vi.fn()}));
vi.mock('react-redux', () => ({useDispatch: () => state.dispatch}));
vi.mock('react-router', () => ({useNavigate: () => vi.fn(), useSearchParams: () => [new URLSearchParams()]}));
vi.mock('framer-motion', () => ({AnimatePresence: ({children}: any) => children, motion: {div: 'div'}}));
vi.mock('sonner', () => ({toast: {success: vi.fn(), error: vi.fn()}}));
vi.mock('@/pages/agency/compliance-alerts/api', () => ({useGetDocumentComplianceQuery: () => ({data: {items: [], pilotEnabled: false}, refetch: vi.fn()}), useComplianceDateRefresh: vi.fn()}));
vi.mock('./components/uploadDocumentModal', () => ({default: () => null}));
vi.mock('@/pages/agency/trainings/TrainingCertificate', () => ({default: ({onUploaded}: any) => <><span>Upload completion certificate</span><button onClick={() => onUploaded({certificateId: 'cert-1', certificateName: 'completion.pdf', status: 'Completed', approved: true, completedAt: '2026-09-16'})}>Save certificate</button></>}));
vi.mock('./api', () => ({
  userPanelDashboardApi: {util: {invalidateTags: (tags: unknown) => ({type: 'invalidate', payload: tags})}},
  useGetEmployeeDocumentsQuery: () => ({data: []}),
  useUpdateEmployeeInfoMutation: () => [vi.fn()],
  useCompleteTrainingMutation: () => [vi.fn()],
  useGetEmployeeTrainingsQuery: (args: any) => {
    state.trainingArgs.push(args);
    return {currentData: trainingPage, isFetching: false, isError: false};
  },
}));

describe('employee training pagination', () => {
  it('requests and advances cursor pages', () => {
    render(<Dashboard />);
    expect(state.trainingArgs[0]).toEqual({limit: 25});
    expect(screen.getByText('First')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Load more trainings'}));
    expect(state.trainingArgs.at(-1)).toEqual({limit: 25, cursor: 'cursor-2'});
  });

  it('requires a certificate instead of a completion toggle for new assignments', () => {
    Object.assign(trainingPage.items[0], {requiresCertificate: true, status: 'Awaiting Review'});
    render(<Dashboard />);
    expect(screen.getByText('Upload completion certificate')).toBeInTheDocument();
    expect(screen.getByText('Awaiting Review')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Mark complete First'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Save certificate'}));
    expect(state.dispatch).toHaveBeenCalledWith({type: 'invalidate', payload: [{type: 'EmployeeTrainings', id: 'SELF'}]});
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('updates existing rows when a continuation page is refreshed', () => {
    const {rerender} = render(<Dashboard />);
    fireEvent.click(screen.getByRole('button', {name: 'Load more trainings'}));
    trainingPage = {...trainingPage, items: [{...trainingPage.items[0], name: 'Updated training'}]};
    rerender(<Dashboard />);
    expect(screen.getByText('Updated training')).toBeInTheDocument();
    expect(screen.queryByText('First')).not.toBeInTheDocument();
  });
});
