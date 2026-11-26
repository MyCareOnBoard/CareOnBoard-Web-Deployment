import {render, screen} from '@testing-library/react';
import {beforeEach, expect, it, vi} from 'vitest';
const mocks = vi.hoisted(() => ({rules: vi.fn()}));
vi.mock('./api', () => ({complianceAlertsApi: {injectEndpoints: () => ({useFindingRulesQuery: mocks.rules})}}));
import WhatWeCheck from './WhatWeCheck';
const catalog = {
  rules: [{ruleId: 'shift.missed_visit', label: 'Missed visits', checks: 'Whether staff turn up.', issueWhen: 'A visit passed with no clock-in.', source: 'Assigned shifts.', nextStep: 'Check availability.',
    flaggedWhen: '2 or more of the last 10 scheduled visits are affected.', needsAtLeast: '5 scheduled visits to judge.', lookbackDays: 90}],
  severity: {high: 'At least 6 in 10.', medium: 'Between 4 and 6 in 10.', low: 'Fewer than 4 in 10.', worsening: 'Getting worse raises it one level.'},
};
beforeEach(() => vi.clearAllMocks());
it('does not load the list until it is opened', () => {
  render(<WhatWeCheck agencyId="a1" mode="ddd" scopeKey="s"/>);
  expect(mocks.rules).not.toHaveBeenCalled();
});
it('shows each pattern, when it is flagged, how severity works and what happens automatically', () => {
  mocks.rules.mockReturnValue({currentData: catalog});
  const {container} = render(<WhatWeCheck agencyId="a1" mode="ddd" scopeKey="s"/>);
  const details = container.querySelector('details')!;
  details.open = true;
  details.dispatchEvent(new Event('toggle'));
  return screen.findByText('Missed visits').then(() => {
    expect(screen.getByText(/2 or more of the last 10 scheduled visits are affected/)).toBeInTheDocument();
    expect(screen.getByText(/Looks back 90 days/)).toBeInTheDocument();
    expect(screen.getByText('How serious a pattern is')).toBeInTheDocument();
    expect(screen.getByText(/an incident is opened for review/)).toBeInTheDocument();
  });
});
