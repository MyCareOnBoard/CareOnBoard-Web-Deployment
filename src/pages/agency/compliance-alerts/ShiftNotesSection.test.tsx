import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({query: vi.fn(), detail: vi.fn()}));
vi.mock('react-router', () => ({useSearchParams: () => [new URLSearchParams()]}));
vi.mock('./api', () => ({useGetShiftNoteComplianceQuery: mocks.query}));
vi.mock('@/pages/shared/notes/ShiftNoteStatus', () => ({default: (props: any) => {mocks.detail(props); return <p>Detail</p>;}}));
import ShiftNotesSection from './ShiftNotesSection';
afterEach(cleanup);
beforeEach(() => {vi.clearAllMocks(); mocks.query.mockReturnValue({currentData: {items: [], nextCursor: 'next', coverage: 'ready'}, refetch: vi.fn()});});
it('continues an empty page, resets cursor on filter and clears scope state', () => {
  const {rerender} = render(<ShiftNotesSection agencyId="agency" viewerId="viewer" mode="ddd" />);
  expect(mocks.query).toHaveBeenLastCalledWith(expect.objectContaining({limit: 25, cursor: undefined}), expect.anything());
  expect(mocks.detail).not.toHaveBeenCalled();
  expect(screen.getByText('No matching notes on this page.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: 'Next page'}));
  expect(mocks.query).toHaveBeenLastCalledWith(expect.objectContaining({cursor: 'next'}), expect.anything());
  fireEvent.change(screen.getByLabelText('Shift note status filter'), {target: {value: 'approved'}});
  expect(mocks.query).toHaveBeenLastCalledWith(expect.objectContaining({cursor: undefined, stateGroup: 'approved'}), expect.anything());
  rerender(<ShiftNotesSection agencyId="other" viewerId="viewer" mode="hha" />);
  expect(mocks.query).toHaveBeenLastCalledWith(expect.objectContaining({agencyId: 'other', mode: 'hha', cursor: undefined, stateGroup: 'unresolved'}), expect.anything());
});
it.each(['disabled', 'checking', 'unavailable'])('never says all clear for %s coverage', coverage => {
  mocks.query.mockReturnValue({currentData: {items: [], nextCursor: null, coverage}, refetch: vi.fn()});
  render(<ShiftNotesSection agencyId="agency" viewerId="viewer" />);
  expect(screen.queryByText('No unresolved shift notes in this view.')).not.toBeInTheDocument();
});
