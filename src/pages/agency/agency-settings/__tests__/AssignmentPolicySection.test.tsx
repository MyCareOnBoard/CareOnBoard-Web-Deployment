import {render, screen, waitFor, fireEvent, cleanup} from '@testing-library/react';
import {beforeAll, beforeEach, expect, it, vi} from 'vitest';
import AssignmentPolicySection from '../components/AssignmentPolicySection';
import {getAssignmentPolicy, saveAssignmentPolicy} from '@/lib/api/assignment-policy';
const toast = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({useToast: () => ({toast})}));
beforeEach(() => toast.mockClear());
vi.mock('@/hooks/useAssignmentReview', () => ({useAssignmentReviewScope: () => 'actor'}));
vi.mock('@/hooks/useEffectiveAgencyMode', () => ({useEffectiveAgencyMode: () => 'ddd'}));
vi.mock('@/lib/api/assignment-policy', () => ({getAssignmentPolicy: vi.fn(), saveAssignmentPolicy: vi.fn()}));
beforeAll(() => {
  Object.defineProperty(Element.prototype, 'scrollIntoView', {value: () => undefined});
});
const approvedRules = [
  ['ddd_isp_record', 'ISP record check', 'ddd'],
  ['ddd_pcpt_record', 'PCPT record check', 'ddd'],
  ['ddd_sdr_record', 'SDR record check', 'ddd'],
  ['hha_form485_record', 'Form 485 record check', 'hha'],
  ['hha_poc_record', 'Plan-of-care record check', 'hha'],
  ['hha_physician_orders_record', 'Physician orders record check', 'hha'],
  ['hha_clinical_assessment_record', 'Clinical assessment record check', 'hha'],
].map(([ruleId, label, program]) => ({ruleId, ruleVersion: 1, label, programs: [program as 'ddd' | 'hha'], allowedSeverities: ['warning' as const], dateCoverage: 'evaluation_day', acknowledgeable: true}));
it('shows the approved empty state without an enable control', async () => {
  vi.mocked(getAssignmentPolicy).mockResolvedValue({policy: {version: 1, revision: 0, enabled: false, entries: [], serviceDateCutoff: null}, approvedRules: [], canEdit: false, timezone: 'America/New_York'});
  render(<AssignmentPolicySection agencyId="agency" />);
  await waitFor(() => expect(screen.getByText('No assignment requirements are available to enable yet.')).toBeInTheDocument());
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.getByText('Only the agency owner can change assignment checks.')).toBeInTheDocument();
});
it('configures the seven warning-only document checks and saves only the remaining selection', async () => {
  cleanup();
  vi.mocked(getAssignmentPolicy).mockResolvedValue({policy: {version: 1, revision: 0, enabled: false, entries: [], serviceDateCutoff: null}, approvedRules, canEdit: true, timezone: 'America/New_York'});
  vi.mocked(saveAssignmentPolicy).mockImplementation(async (_agencyId, input) => ({policy: {version: 1, revision: 1, enabled: input.enabled, entries: input.entries, serviceDateCutoff: input.serviceDateCutoff}, approvedRules, canEdit: true, timezone: 'America/New_York'}));
  const submitProfile = vi.fn();
  render(<form onSubmit={submitProfile}><AssignmentPolicySection agencyId="agency" /></form>);

  expect(await screen.findByText(/Choose Required to block assignments/)).toBeInTheDocument();
  expect(screen.getByText(/Includes assignments that overlap this date/)).toBeInTheDocument();
  for (const rule of approvedRules) expect(screen.getByRole('combobox', {name: rule.label})).toHaveTextContent('Not selected');

  fireEvent.click(screen.getByRole('checkbox', {name: 'Enable assignment checks'}));
  expect(screen.getByRole('button', {name: 'Save assignment checks'})).toBeDisabled();
  fireEvent.keyDown(screen.getByRole('combobox', {name: 'ISP record check'}), {key: 'Enter'});
  expect(await screen.findByRole('option', {name: 'Warning'})).toBeInTheDocument();
  expect(screen.queryByRole('option', {name: 'Required'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('option', {name: 'Warning'}));
  fireEvent.keyDown(screen.getByRole('combobox', {name: 'Form 485 record check'}), {key: 'Enter'});
  fireEvent.click(await screen.findByRole('option', {name: 'Warning'}));
  fireEvent.keyDown(screen.getByRole('combobox', {name: 'ISP record check'}), {key: 'Enter'});
  fireEvent.click(await screen.findByRole('option', {name: 'Not selected'}));

  fireEvent.click(screen.getByRole('button', {name: 'Select date'}));
  fireEvent.click(await screen.findByRole('button', {name: /September 16/}));
  fireEvent.click(screen.getByRole('checkbox', {name: /I confirm these requirements/}));
  fireEvent.click(screen.getByRole('button', {name: 'Save assignment checks'}));
  await waitFor(() => expect(saveAssignmentPolicy).toHaveBeenCalledWith('agency', expect.objectContaining({enabled: true, serviceDateCutoff: '2026-09-16', entries: [{ruleId: 'hha_form485_record', ruleVersion: 1, severity: 'warning'}], adoption: true})));
  expect(toast).toHaveBeenCalledWith({title: 'Assignment checks updated', description: 'Your assignment requirements have been saved.'});
  expect(submitProfile).not.toHaveBeenCalled();
});
it('saves independently, retains the draft on revision conflict and requires explicit reload', async () => {
  cleanup();
  const data = {policy: {version: 1 as const, revision: 1, enabled: false, entries: [{ruleId: 'synthetic', ruleVersion: 1, severity: 'warning' as const}], serviceDateCutoff: '2026-09-16'}, approvedRules: [{ruleId: 'synthetic', ruleVersion: 1, label: 'Synthetic test requirement', programs: ['ddd' as const], allowedSeverities: ['warning' as const], dateCoverage: 'period', acknowledgeable: true}], canEdit: true, timezone: 'America/New_York'};
  vi.mocked(getAssignmentPolicy).mockResolvedValue(data);
  vi.mocked(saveAssignmentPolicy).mockRejectedValue({response: {data: {code: 'ASSIGNMENT_POLICY_CHANGED'}}});
  const submitProfile = vi.fn();
  render(<form onSubmit={submitProfile}><AssignmentPolicySection agencyId="agency" /></form>);
  fireEvent.click(await screen.findByRole('checkbox', {name: 'Enable assignment checks'}));
  fireEvent.click(screen.getByRole('checkbox', {name: /I confirm these requirements/}));
  fireEvent.click(screen.getByRole('button', {name: 'Save assignment checks'}));
  await waitFor(() => expect(screen.getByRole('button', {name: 'Save assignment checks'})).toBeDisabled());
  expect(submitProfile).not.toHaveBeenCalled();
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({title: 'Assignment checks could not be updated', variant: 'destructive', description: expect.stringContaining('Requirements changed.')}));
  expect(screen.getByRole('checkbox', {name: 'Enable assignment checks'})).toBeChecked();
  fireEvent.click(await screen.findByRole('button', {name: 'Reload current policy'}));
  await waitFor(() => expect(screen.getByRole('checkbox', {name: 'Enable assignment checks'})).not.toBeChecked());
});
