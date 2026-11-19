import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, expect, it, vi} from 'vitest';
const mocks = vi.hoisted(() => ({run: vi.fn(), toast: vi.fn()}));
vi.mock('./api', () => ({complianceAlertsApi: {injectEndpoints: () => ({useRecordFindingActionMutation: () => [mocks.run, {isLoading: false}]})}}));
vi.mock('@/hooks/use-toast', () => ({useToast: () => ({toast: mocks.toast})}));
import {FindingActions} from './FindingActions';
beforeEach(() => {vi.clearAllMocks(); mocks.run.mockReturnValue({unwrap: () => Promise.resolve({ok: true})});});
it('records a review with an optional note and refreshes', async () => {
  const done = vi.fn();
  render(<FindingActions findingId="f1" status="open" name="Ada" onDone={done}/>);
  fireEvent.click(screen.getByRole('button', {name: 'Mark reviewed for Ada'}));
  fireEvent.change(screen.getByLabelText('Mark documentation reviewed'), {target: {value: '  talked it through '}});
  fireEvent.click(screen.getByRole('button', {name: 'Save review'}));
  await waitFor(() => expect(done).toHaveBeenCalled());
  expect(mocks.run).toHaveBeenCalledWith({findingId: 'f1', action: 'review', note: 'talked it through'});
  expect(mocks.toast).toHaveBeenCalledWith({title: 'Review recorded'});
});
it('requires a reason to dismiss and surfaces the server message on failure', async () => {
  const done = vi.fn();
  mocks.run.mockReturnValue({unwrap: () => Promise.reject({data: {error: 'This finding is already closed.'}})});
  render(<FindingActions findingId="f1" status="recurred" onDone={done}/>);
  fireEvent.click(screen.getByRole('button', {name: 'Dismiss pattern'}));
  const submit = screen.getByRole('button', {name: 'Dismiss pattern', hidden: false});
  expect(screen.getByRole('button', {name: 'Dismiss pattern'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Dismiss this pattern'), {target: {value: 'Template changed'}});
  expect(submit).not.toBeDisabled();
  fireEvent.click(submit);
  await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({description: 'This finding is already closed.', variant: 'destructive'})));
  expect(done).not.toHaveBeenCalled();
});
it('offers nothing on closed findings', () => {
  const {container} = render(<FindingActions findingId="f1" status="dismissed" onDone={vi.fn()}/>);
  expect(container).toBeEmptyDOMElement();
});
