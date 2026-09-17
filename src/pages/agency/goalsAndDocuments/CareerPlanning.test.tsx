import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import CareerPlanningPage, { CareerPlanEditor, CareerPlanReadOnly } from './CareerPlanning';
afterEach(cleanup);
it('does not publish unsaved changes', () => {
  const publish = vi.fn();
  render(
    <CareerPlanEditor
      draft={{ interests: 'Retail' }}
      version={1}
      hasPublished={false}
      onSave={vi.fn()}
      onPublish={publish}
    />,
  );
  fireEvent.change(screen.getByLabelText(/interests/i), { target: { value: 'Gardening' } });
  expect(screen.getByRole('button', { name: 'Publish plan' })).toBeDisabled();
  expect(publish).not.toHaveBeenCalled();
});

it('retains text on save conflict and exposes latest version', async () => {
  const save = vi.fn(async () => {
    throw { status: 409 };
  });
  render(
    <CareerPlanEditor
      draft={{ interests: 'Retail' }}
      version={1}
      hasPublished={false}
      onSave={save}
      onPublish={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText(/interests/i), { target: { value: 'Keep my changes' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await screen.findByText('This plan changed while you were editing. Your unsaved text is still here.');
  expect(screen.getByLabelText(/interests/i)).toHaveValue('Keep my changes');
  expect(screen.getByRole('button', { name: 'View latest version' })).toBeEnabled();
});
it('retries uncertain publication with exact operation identity', async () => {
  const publish = vi.fn().mockRejectedValueOnce({ status: 'FETCH_ERROR' }).mockResolvedValue({ version: 2 });
  render(
    <CareerPlanEditor
      draft={{ interests: 'Retail' }}
      version={1}
      hasPublished={false}
      onSave={vi.fn()}
      onPublish={publish}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Publish plan' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Check publication' }));
  await waitFor(() => expect(publish).toHaveBeenCalledTimes(2));
  expect(publish.mock.calls[1]).toEqual(publish.mock.calls[0]);
});
it('keeps goal identity through edits and saves only explicitly', async () => {
  const save = vi.fn(async () => ({ version: 2 }));
  render(
    <CareerPlanEditor
      draft={{ goals: [{ id: 'stable', statement: 'Retail' }] }}
      version={1}
      hasPublished={false}
      onSave={save}
      onPublish={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText('Goal'), { target: { value: 'Gardening' } });
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ goals: [expect.objectContaining({ id: 'stable', statement: 'Gardening' })] }),
      1,
    ),
  );
});
it('blocks duplicate publication while the first is pending', async () => {
  let resolve!: (value: unknown) => void;
  const publish = vi.fn(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  render(
    <CareerPlanEditor draft={{}} version={1} hasPublished={false} onSave={vi.fn()} onPublish={publish} />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Publish plan' }));
  fireEvent.click(screen.getByRole('button', { name: 'Publish plan' }));
  expect(publish).toHaveBeenCalledTimes(1);
  await act(async () => resolve({ version: 2 }));
});
it('opens the shared Calendar', async () => {
  render(
    <CareerPlanEditor
      draft={{ periodStart: '2026-09-01' }}
      version={1}
      hasPublished={false}
      onSave={vi.fn()}
      onPublish={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Plan period start' }));
  expect(await screen.findByRole('grid')).toBeInTheDocument();
});
it('preserves unavailable source reference for explicit correction', () => {
  render(
    <CareerPlanEditor
      draft={{ sourceReferences: [{ kind: 'isp', reference: 'old' }] }}
      version={1}
      hasPublished={false}
      onSave={vi.fn()}
      onPublish={vi.fn()}
    />,
  );
  expect(screen.getByText('Source document changed or unavailable')).toBeInTheDocument();
});

it('renders a historical revision read-only with publication separate from period', () => {
  render(
    <CareerPlanReadOnly
      revision={{
        id: 'history',
        revisionNumber: 2,
        publishedAt: '2026-03-01T12:00:00Z',
        content: {
          periodStart: '2026-01-01',
          periodEnd: '2026-12-31',
          interests: 'Saved interests',
          strengthsAndSupportNeeds: 'Support',
          individualInvolvement: 'Participated',
          goals: [],
          contributors: [],
          sourceReferences: [],
          outcomeId: null,
        },
      }}
    />,
  );
  expect(screen.getByText('Plan period: 2026-01-01 – 2026-12-31')).toBeInTheDocument();
  expect(screen.getByText('Published: 2026-03-01T12:00:00Z')).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

it('does not advance the save baseline on a background refetch', async () => {
  const save = vi.fn(async () => ({ version: 2 }));
  const { rerender } = render(
    <CareerPlanEditor
      draft={{ interests: 'Original' }}
      version={1}
      hasPublished={false}
      onSave={save}
      onPublish={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText(/interests/i), { target: { value: 'My local text' } });
  rerender(
    <CareerPlanEditor
      draft={{ interests: 'Someone else' }}
      version={2}
      hasPublished={false}
      onSave={save}
      onPublish={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ interests: 'My local text' }, 1));
});

const pageState = vi.hoisted(() => ({
  user: { userType: 'agency', agencyId: 'agency', profile: { accessList: [] as string[] } },
  list: {} as any,
  detail: {} as any,
}));
vi.mock('@/utils/auth', () => ({ useAuth: () => ({ user: pageState.user }) }));
vi.mock('@/hooks/useEffectiveAgencyMode', () => ({ useEffectiveAgencyMode: () => 'ddd' }));
vi.mock('react-router', () => ({
  Link: ({ children }: any) => <span>{children}</span>,
  useSearchParams: () => [new URLSearchParams('clientId=client&serviceAuthorizationId=auth')],
  useBlocker: () => ({ state: 'unblocked' }),
}));
vi.mock('./api', () => ({
  useGetCareerPlansQuery: () => pageState.list,
  useGetCareerPlanQuery: () => pageState.detail,
  useLazyGetCareerPlanQuery: () => [vi.fn(), {}],
  useSaveCareerPlanMutation: () => [vi.fn()],
  usePublishCareerPlanMutation: () => [vi.fn()],
  useGetCareerRevisionsQuery: () => ({}),
  useGetCareerRevisionQuery: () => ({}),
}));
it('does not expose draft content or management actions to read-only users', () => {
  pageState.user = {
    userType: 'super_admin',
    agencyId: 'agency',
    profile: { accessList: ['Clients Directory'] },
  };
  pageState.list = {
    currentData: {
      items: [{ id: 'plan', clientId: 'client', serviceAuthorizationId: 'auth' }],
      authorizationChoices: [{ id: 'auth', label: 'Career Planning' }],
    },
  };
  pageState.detail = {
    currentData: {
      id: 'plan',
      version: 1,
      hasDraft: true,
      canManage: false,
      draft: { interests: 'Draft secret' },
    },
  };
  render(<CareerPlanningPage />);
  expect(screen.queryByDisplayValue('Draft secret')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Publish plan' })).not.toBeInTheDocument();
});
it('does not mistake failed source access for an absent plan', () => {
  pageState.user = { userType: 'agency', agencyId: 'agency', profile: { accessList: [] } };
  pageState.list = { isError: true };
  pageState.detail = {};
  render(<CareerPlanningPage />);
  expect(screen.getByRole('alert')).toHaveTextContent('Check client access');
  expect(screen.queryByRole('button', { name: 'Create plan' })).not.toBeInTheDocument();
});
it('requires an explicit first draft save when editing a published revision', () => {
  render(
    <CareerPlanEditor
      draft={{ interests: 'Published' }}
      version={3}
      hasSavedDraft={false}
      hasPublished
      onSave={vi.fn()}
      onPublish={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText('Change reason'), { target: { value: 'Annual update' } });
  expect(screen.getByRole('button', { name: 'Publish plan' })).toBeDisabled();
});
