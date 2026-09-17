import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  preview: vi.fn(),
  submit: vi.fn(),
  refresh: vi.fn(),
  context: {} as any,
  log: {} as any,
}));
vi.mock('react-router', () => ({
  useLocation: () => ({ search: '?id=log' }),
  useBlocker: () => ({ state: 'unblocked' }),
}));
vi.mock('@/pages/userPanel/notes/api', () => ({
  useGetSingleActivityLogQuery: () => ({ data: mocks.log, currentData: mocks.log, refetch: mocks.refresh }),
  useGetCareerContextQuery: () => ({ data: mocks.context, currentData: mocks.context, refetch: vi.fn() }),
  useSaveCareerRowMutation: () => [mocks.save],
  usePreviewCareerNotesMutation: () => [mocks.preview],
  useSubmitActivityLogNotesMutation: () => [mocks.submit],
  useSelectCareerRevisionMutation: () => [vi.fn()],
  useGetCareerSignaturesQuery: () => ({}),
  useGetCareerSignatureQuery: () => ({}),
}));
import CareerPlanningPage from './index';
import { careerTimeCandidates } from '@/pages/shared/notes/CareerPlanningNote';
afterEach(cleanup);
beforeEach(() => {
  const row = {
    id: 'row',
    contentVersion: 1,
    startDate: '2026-09-12T14:00:00.000Z',
    endDate: '2026-09-12T15:00:00.000Z',
    metadata: {
      serviceDate: '2026-09-12',
      goalIds: ['goal'],
      location: 'Store',
      supportProvided: 'Support',
      responseAndProgress: 'Progress',
      recordedUnits: 4,
    },
  };
  mocks.log = {
    id: 'log',
    activityType: 'career-planning',
    notes: [row],
    metadata: {},
    timezone: 'America/New_York',
    serviceDates: ['2026-09-12'],
  };
  mocks.context = {
    selection: { careerPlanId: 'plan', careerPlanRevisionId: 'revision', planSelectionVersion: 1 },
    canChangeRevision: true,
    timezone: 'America/New_York',
    serviceDates: ['2026-09-12'],
    revision: {
      id: 'revision',
      revisionNumber: 1,
      publishedAt: '2026-09-01',
      content: {
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
        goals: [{ id: 'goal', statement: 'Learn retail' }],
      },
    },
  };
  mocks.save.mockReset().mockImplementation(({ data }) => ({
    unwrap: async () => ({ ...data, contentVersion: data.expectedContentVersion + 1 }),
  }));
  mocks.preview.mockReset().mockImplementation(() => ({
    unwrap: async () => ({
      content: {
        context: {
          clientName: 'Signed client',
          employeeName: 'Signed employee',
          serviceCode: 'H2023-CAREER',
        },
        selection: mocks.context.selection,
        rows: [row],
      },
      revision: mocks.context.revision,
      previewHash: 'hash',
      rowVersions: [{ id: 'row', contentVersion: 1 }],
      planSelectionVersion: 1,
      attestationVersion: 1,
      attestation: 'I confirm that these entries accurately describe the support I provided.',
    }),
  }));
  mocks.submit.mockReset().mockImplementation(() => ({ unwrap: async () => undefined }));
  mocks.refresh.mockReset().mockImplementation(async () => ({ data: mocks.log }));
});
it('requires preview and unchecked consent before signing', async () => {
  render(<CareerPlanningPage />);
  await screen.findByDisplayValue('Support');
  expect(screen.queryByRole('button', { name: 'Sign and submit' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Review entries' }));
  await screen.findByText('Signed client');
  expect(screen.getByRole('button', { name: 'Sign and submit' })).toBeDisabled();
});
it('flushes saved edits before preview', async () => {
  let done!: (v: unknown) => void;
  mocks.save.mockImplementation(() => ({
    unwrap: () =>
      new Promise((resolve) => {
        done = resolve;
      }),
  }));
  render(<CareerPlanningPage />);
  fireEvent.change(await screen.findByLabelText('Support provided'), { target: { value: 'Edited support' } });
  fireEvent.click(screen.getByRole('button', { name: 'Review entries' }));
  await waitFor(() => expect(mocks.save).toHaveBeenCalled());
  expect(mocks.preview).not.toHaveBeenCalled();
  await act(async () => done({ ...mocks.log.notes[0], contentVersion: 2 }));
  await waitFor(() => expect(mocks.preview).toHaveBeenCalled());
});
it('keeps an uncertain signature frozen and retries identical intent', async () => {
  mocks.submit.mockImplementationOnce(() => ({
    unwrap: async () => {
      throw { status: 'FETCH_ERROR' };
    },
  }));
  render(<CareerPlanningPage />);
  await screen.findByDisplayValue('Support');
  fireEvent.click(screen.getByRole('button', { name: 'Review entries' }));
  fireEvent.click(
    await screen.findByLabelText('I confirm that these entries accurately describe the support I provided.'),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Sign and submit' }));
  await screen.findByRole('button', { name: 'Check submission' });
  expect(screen.getByRole('button', { name: 'Add entry' })).toBeDisabled();
  const sent = mocks.submit.mock.calls[0][0];
  fireEvent.click(screen.getByRole('button', { name: 'Check submission' }));
  await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(2));
  expect(mocks.submit.mock.calls[1][0]).toEqual(sent);
});
it('permits drafts without a published plan', async () => {
  mocks.context = { ...mocks.context, selection: null, revision: null };
  render(<CareerPlanningPage />);
  await screen.findByText(
    'Your agency needs to publish a Career Planning plan for this service. You can save a draft.',
  );
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Review entries' })).toBeDisabled();
});
it('does not infer device time and requires DST disambiguation', () => {
  expect(careerTimeCandidates('2026-09-12T10:00', 'America/New_York')).toEqual(['2026-09-12T14:00:00.000Z']);
  expect(careerTimeCandidates('2026-03-08T02:30', 'America/New_York')).toEqual([]);
  expect(careerTimeCandidates('2026-11-01T01:30', 'America/New_York')).toHaveLength(2);
});

it('keeps locked rows out of mutable display and provides signed history', async () => {
  mocks.log.submittedNotes = [
    {
      ...mocks.log.notes[0],
      id: 'signed',
      metadata: { supportProvided: 'Mutable text must not impersonate signed evidence' },
    },
  ];
  render(<CareerPlanningPage />);
  await screen.findByDisplayValue('Support');
  expect(
    screen.queryByDisplayValue('Mutable text must not impersonate signed evidence'),
  ).not.toBeInTheDocument();
  expect(screen.getByText(/Submitted and approved entries are locked/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Signature history' })).toBeEnabled();
});
it('retains draft content after conflict and offers explicit reload', async () => {
  mocks.save.mockImplementation(() => ({
    unwrap: async () => {
      throw { status: 409 };
    },
  }));
  render(<CareerPlanningPage />);
  fireEvent.change(await screen.findByLabelText('Support provided'), { target: { value: 'Keep my text' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await screen.findByRole('button', { name: 'Reload current entries' });
  expect(screen.getByLabelText('Support provided')).toHaveValue('Keep my text');
  expect(screen.getByRole('button', { name: 'Review entries' })).toBeDisabled();
});
it('focuses backend UUID row paths', async () => {
  mocks.preview.mockImplementation(() => ({
    unwrap: async () => {
      throw {
        status: 422,
        data: { fieldErrors: [{ path: 'rows.row.metadata.supportProvided', message: 'Enter support' }] },
      };
    },
  }));
  render(<CareerPlanningPage />);
  await screen.findByDisplayValue('Support');
  fireEvent.click(screen.getByRole('button', { name: 'Review entries' }));
  await waitFor(() => expect(screen.getByLabelText('Support provided')).toHaveFocus());
});
it('clears consent and refetches context after a definitive signing conflict', async () => {
  mocks.submit.mockImplementation(() => ({
    unwrap: async () => {
      throw { status: 409 };
    },
  }));
  render(<CareerPlanningPage />);
  await screen.findByDisplayValue('Support');
  fireEvent.click(screen.getByRole('button', { name: 'Review entries' }));
  fireEvent.click(
    await screen.findByLabelText('I confirm that these entries accurately describe the support I provided.'),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Sign and submit' }));
  await screen.findByRole('button', { name: 'Reload current entries' });
  expect(screen.queryByRole('button', { name: 'Sign and submit' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Support provided')).toHaveValue('Support');
});
it('partial submission selects only checked rows', async () => {
  mocks.log.notes.push({ ...mocks.log.notes[0], id: 'second' });
  render(<CareerPlanningPage />);
  await screen.findByLabelText('Select entry 2');
  fireEvent.click(screen.getByLabelText('Select entry 2'));
  fireEvent.click(screen.getByRole('button', { name: 'Review entries' }));
  await waitFor(() =>
    expect(mocks.preview).toHaveBeenCalledWith({ activityLogId: 'log', logNoteIds: ['row'] }),
  );
});

it('retries an uncertain row save with the same UUID, payload and expected version', async () => {
  mocks.save.mockImplementationOnce(() => ({
    unwrap: async () => {
      throw { status: 'FETCH_ERROR' };
    },
  }));
  render(<CareerPlanningPage />);
  fireEvent.change(await screen.findByLabelText('Support provided'), {
    target: { value: 'Exact retry text' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await screen.findByRole('button', { name: 'Check draft save' });
  expect(screen.getByLabelText('Support provided')).toBeDisabled();
  const payload = mocks.save.mock.calls[0][0];
  fireEvent.click(screen.getByRole('button', { name: 'Check draft save' }));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(2));
  expect(mocks.save.mock.calls[1][0]).toEqual(payload);
});

it('includes locked and editable rows in the clearly labelled log total', async () => {
  mocks.log.approvedNotes = [
    { ...mocks.log.notes[0], id: 'approved', metadata: { ...mocks.log.notes[0].metadata, recordedUnits: 8 } },
  ];
  render(<CareerPlanningPage />);
  expect(await screen.findByText('Recorded units (all entries): 12')).toBeInTheDocument();
});

it('explains that the suggested published revision still needs explicit selection', async () => {
  mocks.context = {
    ...mocks.context,
    selection: { careerPlanId: 'plan', careerPlanRevisionId: null, planSelectionVersion: 0 },
    suggestedRevisionId: 'revision',
    reasonCode: 'career_plan_selection_required',
  };
  render(<CareerPlanningPage />);
  expect(
    await screen.findByText('Select a published plan to link these entries to its goals.'),
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Review entries' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Select published plan' })).toBeEnabled();
});

it('adopts returned active rows after an unknown submission is replayed without changing unsent selections', async () => {
  const row = mocks.log.notes[0];
  mocks.log.notes.push({
    ...row,
    id: 'unsent',
    metadata: { ...row.metadata, supportProvided: 'Unsent support' },
  });
  mocks.submit.mockImplementationOnce(() => ({
    unwrap: async () => {
      throw { status: 'FETCH_ERROR' };
    },
  }));
  render(<CareerPlanningPage />);
  fireEvent.click(await screen.findByLabelText('Select entry 2'));
  fireEvent.click(screen.getByRole('button', { name: 'Review entries' }));
  fireEvent.click(
    await screen.findByLabelText('I confirm that these entries accurately describe the support I provided.'),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Sign and submit' }));
  await screen.findByRole('button', { name: 'Check submission' });
  const sent = mocks.submit.mock.calls[0][0];
  mocks.refresh.mockResolvedValue({
    data: {
      ...mocks.log,
      notes: mocks.log.notes.map((r: any) => ({ ...r, status: 'active', contentVersion: 2 })),
    },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Check submission' }));
  await waitFor(() => expect(screen.getByDisplayValue('Support')).toBeEnabled());
  expect(screen.getByLabelText('Select entry 1')).toBeChecked();
  expect(screen.getByLabelText('Select entry 2')).not.toBeChecked();
  expect(screen.getByRole('button', { name: 'Review entries' })).toBeEnabled();
  expect(mocks.submit.mock.calls[1][0]).toEqual(sent);
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
});
it('preserves saved content and retries only the status refresh after a confirmed submission', async () => {
  mocks.refresh.mockResolvedValueOnce({
    error: { status: 'FETCH_ERROR' },
    data: { ...mocks.log, notes: [] },
  });
  render(<CareerPlanningPage />);
  await screen.findByDisplayValue('Support');
  fireEvent.click(screen.getByRole('button', { name: 'Review entries' }));
  fireEvent.click(
    await screen.findByLabelText('I confirm that these entries accurately describe the support I provided.'),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Sign and submit' }));
  await screen.findByRole('button', { name: 'Refresh current status' });
  expect(screen.getByDisplayValue('Support')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  mocks.refresh.mockResolvedValueOnce({ data: { ...mocks.log, notes: [], submittedNotes: mocks.log.notes } });
  fireEvent.click(screen.getByRole('button', { name: 'Refresh current status' }));
  await screen.findByText(/Submitted and approved entries are locked/);
  expect(screen.queryByDisplayValue('Support')).not.toBeInTheDocument();
  expect(mocks.submit).toHaveBeenCalledTimes(1);
  expect(mocks.refresh).toHaveBeenCalledTimes(2);
});
