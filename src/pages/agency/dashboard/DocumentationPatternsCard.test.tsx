import {fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, expect, it, vi} from 'vitest';
const mocks = vi.hoisted(() => ({summary: vi.fn(), navigate: vi.fn()}));
vi.mock('@/pages/agency/compliance-alerts/api', () => ({complianceAlertsApi: {injectEndpoints: () => ({useFindingsSummaryQuery: mocks.summary})}}));
vi.mock('react-router', () => ({useNavigate: () => mocks.navigate}));
import DocumentationPatternsCard from './DocumentationPatternsCard';
const data = {active: 5, recurred: 1, resolved: 2, bySeverity: {high: 2, medium: 2, low: 1}, staffAffected: 4, truncated: false};
beforeEach(() => vi.clearAllMocks());
it('shows counts and opens the list', () => {
  mocks.summary.mockReturnValue({data, isLoading: false});
  render(<DocumentationPatternsCard agencyId="a1" mode="hha"/>);
  expect(mocks.summary).toHaveBeenCalledWith({agencyId: 'a1', mode: 'hha'}, {skip: false});
  expect(screen.getByText('high severity').parentElement?.firstChild).toHaveTextContent('2');
  expect(screen.getByText(/5 active · 4 staff · 1 came back/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: 'Open patterns'}));
  expect(mocks.navigate).toHaveBeenCalledWith(expect.stringContaining('source=documentation_patterns'));
});
it('marks totals as lower bounds when the backend was truncated', () => {
  mocks.summary.mockReturnValue({data: {...data, truncated: true}, isLoading: false});
  render(<DocumentationPatternsCard agencyId="a1"/>);
  expect(screen.getByText(/5\+ active · 4\+ staff/)).toBeInTheDocument();
});
it('says plainly when there are none, and renders nothing on error or for SC', () => {
  mocks.summary.mockReturnValue({data: {...data, active: 0}, isLoading: false});
  const {container, rerender} = render(<DocumentationPatternsCard agencyId="a1"/>);
  expect(screen.getByText('No active patterns.')).toBeInTheDocument();
  mocks.summary.mockReturnValue({data: undefined, isLoading: false, error: {status: 403}});
  rerender(<DocumentationPatternsCard agencyId="a1"/>);
  expect(container).toBeEmptyDOMElement();
  mocks.summary.mockReturnValue({data: undefined, isLoading: false});
  rerender(<DocumentationPatternsCard agencyId="a1" mode="sc"/>);
  expect(container).toBeEmptyDOMElement();
  expect(mocks.summary).toHaveBeenLastCalledWith(expect.anything(), {skip: true});
});
