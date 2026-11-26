import {useState} from 'react';
import {complianceAlertsApi} from './api';
import {ComplianceSkeleton} from './CompliancePresentation';

export type CatalogRule = {
  ruleId: string; label: string; checks: string; issueWhen: string; source: string; nextStep: string;
  flaggedWhen: string; needsAtLeast: string; lookbackDays: number;
};
export type Catalog = {rules: CatalogRule[]; severity: {high: string; medium: string; low: string; worsening: string}};
type Args = {agencyId: string; mode: string; scopeKey: string};

const api = complianceAlertsApi.injectEndpoints({endpoints: builder => ({
  findingRules: builder.query<Catalog, Args>({
    query: ({scopeKey: _scope, ...params}) => ({url: '/notifications/compliance/findings/rules', method: 'GET', params, requiresAuth: true}),
  }),
})});
export const {useFindingRulesQuery} = api;

const days = (n: number) => (n >= 365 ? `${Math.round(n / 365)} year${n >= 730 ? 's' : ''}` : `${n} days`);

function Rules(args: Args) {
  const query = useFindingRulesQuery(args);
  if (query.isFetching && !query.currentData) return <ComplianceSkeleton label="Loading what we check…"/>;
  if (!query.currentData) return <p role="alert" className="text-sm">The list could not be loaded. Close and open it to try again.</p>;
  const {rules, severity} = query.currentData;
  return <div className="space-y-4 text-sm">
    <p>A pattern is flagged for a staff member when the same requirement is missed again and again, not for a single slip. These are the patterns checked for the kinds of records you can see.</p>
    <ul className="divide-y divide-[#dce7e8]">{rules.map(rule => <li key={rule.ruleId} className="space-y-1 py-3">
      <p className="font-bold">{rule.label}</p>
      <p>{rule.checks}</p>
      <p><span className="font-semibold">Counts as an issue when:</span> {rule.issueWhen}</p>
      <p><span className="font-semibold">Flagged when:</span> {rule.flaggedWhen} Needs at least {rule.needsAtLeast} Looks back {days(rule.lookbackDays)}.</p>
      <p><span className="font-semibold">Data used:</span> {rule.source}</p>
      <p><span className="font-semibold">Suggested next step:</span> {rule.nextStep}</p>
    </li>)}</ul>
    <div>
      <p className="font-bold">How serious a pattern is</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        <li><span className="font-semibold">High:</span> {severity.high}</li>
        <li><span className="font-semibold">Medium:</span> {severity.medium}</li>
        <li><span className="font-semibold">Low:</span> {severity.low}</li>
        <li>{severity.worsening}</li>
      </ul>
    </div>
    <div>
      <p className="font-bold">What happens automatically</p>
      <p className="mt-1">When a pattern is high severity, or comes back after it was resolved, agency admins get a notification and an incident is opened for review. Nothing is sent to the staff member, and nothing changes for them until you act.</p>
    </div>
  </div>;
}

// Loaded only when opened, so the page does not fetch it for everyone.
export default function WhatWeCheck(args: Args) {
  const [open, setOpen] = useState(false);
  return <details className="mt-3 rounded-lg border border-[#dce7e8] px-3 py-2" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer text-sm font-semibold">What we check</summary>
    {open && <div className="mt-2"><Rules {...args}/></div>}
  </details>;
}
