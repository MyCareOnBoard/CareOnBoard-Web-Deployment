import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, cleanup, fireEvent, render as renderView, screen, waitFor} from '@testing-library/react';
import {useState, type ReactNode} from 'react';
import {ClientNeedsPanel, type ClientNeedsDraft} from './ClientNeedsPanel';
import {getClientNeeds, saveClientNeeds, reviewClientAenf, type NeedsDTO} from '@/lib/api/client-needs';
import {useClientDocumentRefresh} from '../hooks/useClientDocumentRefresh';
import type {Client} from '@/lib/api/clients';

vi.mock('@/lib/api/client-needs', () => ({getClientNeeds: vi.fn(), saveClientNeeds: vi.fn(), reviewClientAenf: vi.fn()}));
const auth = vi.hoisted(() => ({user: {uid: 'owner', userType: 'agency', agencyId: 'agency-a'}}));
vi.mock('@/utils/auth', () => ({useAuth: () => auth}));
const scope = {clientId: 'client-a', agencyId: 'agency-a', program: 'ddd' as const};
const empty: NeedsDTO = {state: 'ready', canEdit: true, revision: 0, updatedBy: null, updatedAt: null,
  answers: {medicationSupport: 'unknown', medicationSupportDescription: null, medicalAcuity: 'unknown', behavioralAcuity: 'unknown', aenfApplicability: 'unknown', aenfBasis: null},
  aenf: {state: 'applicability_not_recorded', count: 0, reviewRevision: 0}};
const select = (container: HTMLElement, index: number, value: string) => fireEvent.change(container.querySelectorAll('select')[index], {target: {value}});
const render = (children: ReactNode) => renderView(<form onSubmit={event => event.preventDefault()}>{children}</form>);

describe('client needs', () => {
  afterEach(cleanup);
  beforeEach(() => {vi.resetAllMocks(); auth.user = {uid: 'owner', userType: 'agency', agencyId: 'agency-a'}; vi.mocked(getClientNeeds).mockResolvedValue(structuredClone(empty));});
  it('requires a saved client without blocking onboarding', () => {
    render(<><button>Save client</button><ClientNeedsPanel {...scope} clientId={undefined} /></>);
    expect(screen.getByText('Save the client to record these needs.')).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Save client'})).not.toBeDisabled();
    expect(getClientNeeds).not.toHaveBeenCalled();
  });
  it('starts unknown and submits the loaded revision without a second read', async () => {
    const view = render(<ClientNeedsPanel {...scope} />);
    await screen.findByRole('button', {name: 'Save needs'});
    expect(view.container.querySelectorAll('select')[0].value).toBe('unknown');
    select(view.container, 0, 'yes');
    const save = screen.getByRole('button', {name: 'Save needs'});
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Medication support description'), {target: {value: 'Help with prescribed medication'}});
    vi.mocked(saveClientNeeds).mockResolvedValue({...empty, state: 'ready', revision: 1, answers: {...empty.answers, medicationSupport: 'yes', medicationSupportDescription: 'Help with prescribed medication'}});
    fireEvent.click(save);
    await screen.findByText('Needs saved.');
    expect(saveClientNeeds).toHaveBeenCalledWith(scope, expect.objectContaining({expectedRevision: 0, medicationSupport: 'yes'}));
    expect(getClientNeeds).toHaveBeenCalledTimes(1);
  });
  it('keeps draft text on conflict and requires an explicit reload before saving', async () => {
    const view = render(<ClientNeedsPanel {...scope} />);
    await screen.findByRole('button', {name: 'Save needs'});
    select(view.container, 0, 'yes');
    fireEvent.change(screen.getByLabelText('Medication support description'), {target: {value: 'Keep my edits'}});
    vi.mocked(saveClientNeeds).mockRejectedValue({response: {status: 409, data: {code: 'CLIENT_NEEDS_CHANGED'}}});
    fireEvent.click(screen.getByRole('button', {name: 'Save needs'}));
    await screen.findByRole('button', {name: 'Reload saved assessment'});
    expect(screen.getByLabelText('Medication support description')).toHaveValue('Keep my edits');
    expect(screen.getByRole('button', {name: 'Save needs'})).toBeDisabled();
    vi.mocked(getClientNeeds).mockResolvedValue({...empty, state: 'ready', revision: 2});
    fireEvent.click(screen.getByRole('button', {name: 'Reload saved assessment'}));
    await screen.findByText('Saved assessment');
    expect(screen.getByLabelText('Medication support description')).toHaveValue('Keep my edits');
    expect(screen.getByRole('button', {name: 'Save needs'})).not.toBeDisabled();
  });
  it('keeps staff read-only and treats failed reads as unavailable', async () => {
    vi.mocked(getClientNeeds).mockResolvedValue({...empty, canEdit: false});
    const view = render(<ClientNeedsPanel {...scope} />);
    await screen.findByText('Medication support needed');
    expect(screen.queryByRole('button', {name: 'Save needs'})).toBeNull();
    vi.mocked(getClientNeeds).mockRejectedValue({response: {status: 503}});
    view.rerender(<ClientNeedsPanel {...scope} clientId="client-b" />);
    await screen.findByText('Records unavailable. Try again.');
    expect(screen.queryByRole('button', {name: 'Save needs'})).toBeNull();
  });
  it('preserves wizard drafts across step navigation', async () => {
    function Wizard() {
      const [draft, setDraft] = useState<ClientNeedsDraft>();
      const [visible, setVisible] = useState(true);
      return <><button onClick={() => setVisible(!visible)}>Change step</button>{visible && <ClientNeedsPanel {...scope} draft={draft} onDraftChange={setDraft} />}</>;
    }
    const view = render(<Wizard />);
    await screen.findByRole('button', {name: 'Save needs'});
    select(view.container, 0, 'yes');
    fireEvent.change(screen.getByLabelText('Medication support description'), {target: {value: 'Unsaved assessment'}});
    fireEvent.click(screen.getByRole('button', {name: 'Change step'}));
    fireEvent.click(screen.getByRole('button', {name: 'Change step'}));
    await screen.findByRole('button', {name: 'Save needs'});
    expect(screen.getByLabelText('Medication support description')).toHaveValue('Unsaved assessment');
  });
  it('records review against the saved AENF and loaded revisions', async () => {
    const document = {key: 'aenf' as const, url: 'https://example.test/aenf', fileName: 'aenf.pdf', issuedOnDate: '2026-01-01'};
    vi.mocked(getClientNeeds).mockResolvedValue({...empty, state: 'ready', revision: 3, answers: {...empty.answers, aenfApplicability: 'required', aenfBasis: 'Client assessment'}, aenf: {state: 'on_file', count: 1, reviewRevision: 0}});
    vi.mocked(reviewClientAenf).mockResolvedValue({...empty, state: 'ready', revision: 3, aenf: {state: 'verified', count: 1, reviewRevision: 1}});
    render(<ClientNeedsPanel {...scope} documents={[document]} />);
    await screen.findByRole('button', {name: 'Record review'});
    fireEvent.change(screen.getByLabelText('Review basis'), {target: {value: 'Reviewed current AENF'}});
    fireEvent.click(screen.getByRole('button', {name: 'Record review'}));
    await waitFor(() => expect(reviewClientAenf).toHaveBeenCalledWith(scope, expect.objectContaining({expectedNeedsRevision: 3, expectedReviewRevision: 0, document: {url: document.url, issuedOnDate: document.issuedOnDate, expiryDate: null}})));
    expect(getClientNeeds).toHaveBeenCalledTimes(1);
  });
  it('ignores a save response after changing clients and leaves ordinary Save available', async () => {
    let finish!: (value: NeedsDTO) => void;
    vi.mocked(saveClientNeeds).mockImplementation(() => new Promise(resolve => {finish = resolve;}));
    const view = render(<><button type="button">Save client</button><ClientNeedsPanel {...scope} /></>);
    await screen.findByRole('button', {name: 'Save needs'});
    select(view.container, 1, 'yes');
    fireEvent.click(screen.getByRole('button', {name: 'Save needs'}));
    expect(screen.getByRole('button', {name: 'Save client'})).not.toBeDisabled();
    expect(screen.getByRole('button', {name: 'Save needs'})).toBeDisabled();
    view.rerender(<form><ClientNeedsPanel {...scope} clientId="client-b" /></form>);
    await waitFor(() => expect(getClientNeeds).toHaveBeenCalledTimes(2));
    finish({...empty, state: 'ready', revision: 99});
    await waitFor(() => expect(screen.getByRole('button', {name: 'Save needs'})).toBeDisabled());
    expect(screen.queryByText('Needs saved.')).toBeNull();
  });
  it('refreshes saved document selectors when explicitly reloading', async () => {
    const refreshDocuments = vi.fn().mockResolvedValue(undefined);
    render(<ClientNeedsPanel {...scope} onRefreshDocuments={refreshDocuments} />);
    await screen.findByRole('button', {name: 'Save needs'});
    fireEvent.click(screen.getByRole('button', {name: 'Refresh needs'}));
    await waitFor(() => expect(getClientNeeds).toHaveBeenCalledTimes(2));
    expect(refreshDocuments).toHaveBeenCalledOnce();
  });
  it('does not clear an evidence conflict when the real document refresh fails', async () => {
    const doc = {key: 'aenf' as const, url: 'https://example.test/old.pdf'};
    const source = vi.fn().mockResolvedValue({id: scope.clientId, documents: [doc]} as Client);
    const dto: NeedsDTO = {...empty, answers: {...empty.answers, aenfApplicability: 'required', aenfBasis: 'Assessment'}, aenf: {state: 'on_file', count: 1, reviewRevision: 0}};
    vi.mocked(getClientNeeds).mockResolvedValue(dto);
    vi.mocked(reviewClientAenf).mockRejectedValue({response: {status: 409, data: {code: 'AENF_EVIDENCE_CHANGED'}}});
    function Details() {
      const {client, refreshing, refresh} = useClientDocumentRefresh({requestKey: 'client-a', enabled: true, documentsActive: true, load: source});
      return client && <ClientNeedsPanel {...scope} documents={client.documents} documentsBusy={refreshing} onRefreshDocuments={() => refresh(true)} />;
    }
    render(<Details />);
    await screen.findByRole('button', {name: 'Record review'});
    fireEvent.change(screen.getByLabelText('Review basis'), {target: {value: 'Retain this review draft'}});
    fireEvent.click(screen.getByRole('button', {name: 'Record review'}));
    await screen.findByRole('button', {name: 'Reload saved assessment'});
    source.mockRejectedValueOnce({response: {status: 503}});
    fireEvent.click(screen.getByRole('button', {name: 'Reload saved assessment'}));
    await screen.findByText('Records unavailable. Try again.');
    expect(getClientNeeds).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', {name: 'Reload saved assessment'})).not.toBeDisabled();
    source.mockResolvedValueOnce({id: scope.clientId, documents: [{...doc, url: 'https://example.test/new.pdf'}]} as Client);
    fireEvent.click(screen.getByRole('button', {name: 'Reload saved assessment'}));
    await waitFor(() => expect(screen.getByRole('button', {name: 'Record review'})).not.toBeDisabled());
    expect(screen.getByLabelText('Review basis')).toHaveValue('Retain this review draft');
    fireEvent.click(screen.getByRole('button', {name: 'Record review'}));
    await waitFor(() => expect(reviewClientAenf).toHaveBeenLastCalledWith(scope, expect.objectContaining({document: {url: 'https://example.test/new.pdf', issuedOnDate: null, expiryDate: null}})));
  });
  it('retains edits after a failed save and clears private drafts on authority loss', async () => {
    const view = render(<ClientNeedsPanel {...scope} />);
    await screen.findByRole('button', {name: 'Save needs'});
    select(view.container, 0, 'yes');
    fireEvent.change(screen.getByLabelText('Medication support description'), {target: {value: 'Private draft'}});
    vi.mocked(saveClientNeeds).mockRejectedValueOnce({response: {status: 503}});
    fireEvent.click(screen.getByRole('button', {name: 'Save needs'}));
    await screen.findByText('Needs could not be saved. Your edits are retained.');
    expect(screen.getByLabelText('Medication support description')).toHaveValue('Private draft');
    vi.mocked(saveClientNeeds).mockRejectedValueOnce({response: {status: 403}});
    fireEvent.click(screen.getByRole('button', {name: 'Save needs'}));
    await screen.findByText("You don't have access to these records.");
    expect(screen.queryByDisplayValue('Private draft')).toBeNull();
  });
  it('ignores an owner save after switching to a scoped super-admin reader', async () => {
    let finish!: (value: NeedsDTO) => void;
    vi.mocked(saveClientNeeds).mockImplementation(() => new Promise(resolve => {finish = resolve;}));
    const view = render(<ClientNeedsPanel {...scope} />);
    await screen.findByRole('button', {name: 'Save needs'});
    select(view.container, 1, 'yes');
    fireEvent.click(screen.getByRole('button', {name: 'Save needs'}));
    auth.user = {uid: 'admin', userType: 'super-admin', agencyId: ''};
    vi.mocked(getClientNeeds).mockResolvedValue({...empty, canEdit: false});
    view.rerender(<ClientNeedsPanel {...scope} agencyId="selected-agency" program="hha" />);
    await waitFor(() => expect(getClientNeeds).toHaveBeenLastCalledWith({...scope, agencyId: 'selected-agency', program: 'hha'}, expect.any(AbortSignal)));
    await act(async () => finish({...empty, revision: 99}));
    expect(screen.queryByRole('button', {name: 'Save needs'})).toBeNull();
    expect(screen.queryByText('Needs saved.')).toBeNull();
  });
});
