import {StrictMode} from 'react';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {act, render, screen} from '@testing-library/react';
import {expect, it, vi} from 'vitest';
import {employeeTrainingsApi, type TrainingPage} from './trainingApi';
import ReviewTrainingsModal from './reviewTrainingsModal';

const {request} = vi.hoisted(() => ({request: vi.fn()}));
vi.mock('@/lib/axios', () => ({default: request}));
vi.mock('@/utils/auth', () => ({useAuth: () => ({user: {agencyId: 'agency-1'}})}));
vi.mock('sonner', () => ({toast: {success: vi.fn(), error: vi.fn()}}));
vi.mock('./TrainingCertificate', () => ({default: () => null}));
vi.mock('./PolicyEvidenceReview', () => ({default: () => null}));

it('loads a shared training request during StrictMode effect replay', async () => {
  let finish!: (response: {data: TrainingPage}) => void;
  request.mockImplementation(({signal}: {signal: AbortSignal}) => new Promise((resolve, reject) => {
    finish = resolve;
    signal.addEventListener('abort', () => reject(new Error('canceled')), {once: true});
  }));
  const store = configureStore({
    reducer: {[employeeTrainingsApi.reducerPath]: employeeTrainingsApi.reducer},
    middleware: getDefault => getDefault().concat(employeeTrainingsApi.middleware),
  });
  const view = render(<StrictMode><Provider store={store}>
    <ReviewTrainingsModal open onOpenChange={vi.fn()} employee={{id: 'employee-1', fullName: 'Test Staff', role: 'HHA'}} />
  </Provider></StrictMode>);
  try {
    const loading = await screen.findByRole('status', {name: 'Loading trainings'});
    expect(loading.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
    expect(screen.queryByText('No trainings available')).not.toBeInTheDocument();
    await act(async () => finish({data: {
      items: [{id: 'course-1', name: 'CPR certification', assignedDsp: 'employee-1', trainingType: 'manual', timeFrame: '', completedAt: null, status: 'Not Completed', approved: false}],
      nextCursor: null, summary: null, localDate: null,
    }}));
    expect(await screen.findByText('CPR certification')).toBeInTheDocument();
    expect(screen.queryByRole('status', {name: 'Loading trainings'})).not.toBeInTheDocument();
    expect(screen.queryByText('Unable to load trainings')).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(1);
  } finally {
    view.unmount();
    store.dispatch(employeeTrainingsApi.util.resetApiState());
  }
});

it('explains which trainings can back a client review and what to do when none can', async () => {
  const page = (items: TrainingPage['items']) => ({data: {items, nextCursor: null, summary: null, localDate: null}});
  const base = {assignedDsp: 'employee-1', trainingType: 'manual', timeFrame: '', completedAt: null, source: 'manual' as const};
  request.mockResolvedValueOnce(page([
    {...base, id: 'legacy', name: 'New test', status: 'Completed', approved: true, requiresCertificate: false},
    {...base, id: 'pending', name: 'Medication administration', status: 'Awaiting Review', approved: false, requiresCertificate: true, certificateId: 'a'.repeat(64)},
  ]));
  const store = configureStore({
    reducer: {[employeeTrainingsApi.reducerPath]: employeeTrainingsApi.reducer},
    middleware: getDefault => getDefault().concat(employeeTrainingsApi.middleware),
  });
  const onSelectCertificate = vi.fn();
  render(<Provider store={store}><ReviewTrainingsModal open readOnly onOpenChange={vi.fn()} onSelectCertificate={onSelectCertificate} employee={{id: 'employee-1', fullName: 'New Demo', role: 'DSP'}} /></Provider>);
  expect(await screen.findByText('No certificate can be selected yet.')).toBeInTheDocument();
  expect(screen.getByText(/Assign New Demo a training such as "Medication administration"/)).toBeInTheDocument();
  expect(screen.getByText("This training has no certificate step, so it can't be used.")).toBeInTheDocument();
  expect(screen.getByText('Not selectable yet: approve this certificate in Review trainings first.')).toBeInTheDocument();
  expect(screen.queryByRole('button', {name: /Select certificate/})).not.toBeInTheDocument();
});
