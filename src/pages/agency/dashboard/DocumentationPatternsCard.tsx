import {ArrowUpRight} from 'lucide-react';
import {useNavigate} from 'react-router';
import {Routes} from '@/routes/constants';
import {complianceAlertsApi} from '@/pages/agency/compliance-alerts/api';

export type FindingsSummary = {active: number; recurred: number; resolved: number; bySeverity: {high: number; medium: number; low: number}; staffAffected: number; truncated: boolean};
type Args = {agencyId: string; mode?: string};

const summaryApi = complianceAlertsApi.injectEndpoints({endpoints: builder => ({
  findingsSummary: builder.query<FindingsSummary, Args>({
    query: params => ({url: '/notifications/compliance/findings/summary', method: 'GET', params, requiresAuth: true}),
    keepUnusedDataFor: 60,
  }),
})});
export const {useFindingsSummaryQuery} = summaryApi;

/**
 * Home-page card for recurring compliance patterns. It renders nothing when the
 * viewer cannot see findings (no Notes permission, SC program) or the load fails,
 * so it never shows a misleading zero.
 */
export default function DocumentationPatternsCard({agencyId, mode}: {agencyId: string; mode?: string | null}) {
  const navigate = useNavigate();
  const unsupported = mode === 'sc';
  const {data, isLoading} = useFindingsSummaryQuery({agencyId, ...(mode ? {mode} : {})}, {skip: !agencyId || unsupported});
  if (unsupported || (!isLoading && !data)) return null;
  const open = () => navigate(`${Routes.agency.complianceAlerts}?source=documentation_patterns`);
  const plus = data?.truncated ? '+' : '';
  return <section aria-label="Patterns" className="print:hidden rounded-2xl border border-[#E6EAEC] bg-white/80 px-5 py-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[16px] font-semibold text-[#10141a]">Patterns</h2>
        <p className="mt-1 text-[12px] font-medium text-[#808081]">Staff who keep missing the same requirement: notes, attendance, documents or training</p>
      </div>
      <button type="button" aria-label="Open patterns" onClick={open} className="cursor-pointer rounded-full bg-white p-2"><ArrowUpRight className="h-5 w-5"/></button>
    </div>
    {isLoading || !data ? <div role="status" className="mt-4 h-10 animate-pulse rounded bg-gray-100"><span className="sr-only">Loading patterns</span></div> :
      data.active === 0 ? <p className="mt-4 text-sm text-[#808081]">No active patterns.</p> :
      <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <p><span className="text-2xl font-bold text-[#E5484D]">{data.bySeverity.high}{plus}</span> <span className="text-sm">high severity</span></p>
        <p className="text-sm">{data.active}{plus} active · {data.staffAffected}{plus} staff · {data.recurred}{plus} came back</p>
      </div>}
  </section>;
}
