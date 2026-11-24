import {ArrowUpRight, Check} from 'lucide-react';
import {useNavigate} from 'react-router';
import {Routes} from '@/routes/constants';
import {complianceAlertsApi} from '@/pages/agency/compliance-alerts/api';
import {AgencyPanel} from '@/components/agency/AgencyShell';
import {PatternsIcon} from '@/components/agency/AgencyIcons';

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
export default function DocumentationPatternsCard({agencyId, mode, staffNoun = 'staff member'}: {agencyId: string; mode?: string | null; staffNoun?: string}) {
  const navigate = useNavigate();
  const unsupported = mode === 'sc';
  const {data, isLoading} = useFindingsSummaryQuery({agencyId, ...(mode ? {mode} : {})}, {skip: !agencyId || unsupported});
  if (unsupported || (!isLoading && !data)) return null;
  const open = () => navigate(`${Routes.agency.complianceAlerts}?source=documentation_patterns`);
  const plus = data?.truncated ? '+' : '';
  return <AgencyPanel
    icon={PatternsIcon}
    title="Compliance patterns"
    busy={isLoading}
    className="print:hidden"
    action={<button type="button" aria-label="Open compliance patterns" onClick={open}
      className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-[#e4e7ea] text-[#10141a] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:border-white/10 dark:text-[#f4f6f7] dark:hover:bg-white/5">
      <ArrowUpRight aria-hidden="true" className="h-4 w-4"/>
    </button>}
  >
    {isLoading || !data ? <div role="status" className="h-24 animate-pulse rounded-[12px] bg-[#f4f5f6] dark:bg-white/5"><span className="sr-only">Loading compliance patterns</span></div> :
      data.active === 0 ? <div className="flex flex-col items-center px-4 py-6 text-center">
        <span aria-hidden="true" className="grid h-16 w-16 place-items-center rounded-full bg-[#eef0f2] dark:bg-white/10">
          <span className="grid h-8 w-8 place-items-center rounded-full border-[1.5px] border-[#4b535b] text-[#4b535b] dark:border-[#9aa4a8] dark:text-[#9aa4a8]"><Check className="h-4 w-4"/></span>
        </span>
        <p className="mt-5 text-[16px] font-medium text-[#10141a] dark:text-[#f4f6f7]">No recurring patterns</p>
        <p className="mt-1.5 max-w-[300px] text-[13px] leading-5 text-[#4b535b] dark:text-[#9aa4a8]">No {staffNoun} has repeated gaps in service notes or attendance this period.</p>
      </div> :
      <div className="py-2">
        <p className="flex items-baseline gap-2"><span className="text-[32px] font-medium leading-none text-[#c4262e] dark:text-[#ff9d94]">{data.bySeverity.high}{plus}</span> <span className="text-sm text-[#2a3138] dark:text-[#c9d1d4]">high severity</span></p>
        <p className="mt-3 text-sm text-[#4b535b] dark:text-[#9aa4a8]">{data.active}{plus} active · {data.staffAffected}{plus} staff · {data.recurred}{plus} came back</p>
        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          {([['High', data.bySeverity.high], ['Medium', data.bySeverity.medium], ['Low', data.bySeverity.low]] as const).map(([label, value]) =>
            <div key={label} className="rounded-[10px] bg-[#f4f5f6] px-2 py-2.5 dark:bg-white/5">
              <dt className="text-[11px] font-medium text-[#4b535b] dark:text-[#9aa4a8]">{label}</dt>
              <dd className="mt-1 text-[18px] font-medium leading-none text-[#10141a] dark:text-[#f4f6f7]">{value}{plus}</dd>
            </div>)}
        </dl>
      </div>}
  </AgencyPanel>;
}
