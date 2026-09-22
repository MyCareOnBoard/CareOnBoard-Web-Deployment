import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {ComplianceSkeleton} from './CompliancePresentation';
import { useGetInitialFindingsQuery } from './api';
import { SourceNotice, SourcePage } from './SourceControls';
export default function InitialFindings({ runId, scopeKey, mode, onBack }: {
    runId: string;
    scopeKey: string;
    mode: string;
    onBack: () => void;
}) {
    const [pages, setPages] = useState<Array<string | undefined>>([undefined]);
    const cursor = pages[pages.length - 1];
    const { currentData: data, isFetching, error, refetch } = useGetInitialFindingsQuery({ runId, scopeKey, mode, cursor }, { refetchOnMountOrArgChange: true, refetchOnFocus: true });
    return <section className="space-y-4 rounded-2xl border border-[#dce7e8] bg-white p-5" aria-label="Initial compliance findings">
  <Button variant="outline" onClick={onBack}>Back to compliance checks</Button>
  <h2 className="text-xl font-semibold">Initial compliance findings</h2>
  <p className="text-sm text-muted-foreground">Findings from the initial check, with their current status. Resolved records remain here for reference.</p>
  <SourceNotice error={error} hasData={false} retry={refetch} reset={() => setPages([undefined])}/>
  {isFetching ? <ComplianceSkeleton label="Loading initial findings" detail={false}/> : !error && data && <>
   {data.coverage === 'partial' && <p role="status">Some records have not yet been verified. Review the available findings and retry.</p>}
   {!data.items.length && <p role="status">{data.nextCursor ? 'No visible findings on this page. Continue to the next page.' : data.coverage === 'partial' ? 'No confirmed findings on this page yet.' : 'No findings on this page currently need your attention.'}</p>}
   <ul className="space-y-3">{data.items.map(item => <li key={item.id} className="rounded-xl border border-border bg-background p-4">
    <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold">{item.title}</h3><span className="text-sm">{item.program.toUpperCase()} · {item.currentState === 'open' ? 'Needs attention' : item.currentState === 'resolved' ? 'Resolved' : 'Could not verify'}</span></div>
    <p className="my-2 text-sm text-muted-foreground">Initial reason: {item.initialReason.replaceAll('_', ' ')}{item.checkedAt ? ' · ' + new Date(item.checkedAt).toLocaleString() : ''}</p>
    {item.actionUrl?.startsWith('/agency/') && <a className="font-medium text-primary underline underline-offset-4" href={item.actionUrl}>Open record</a>}
   </li>)}</ul>
   <SourcePage cursor={cursor} next={data.nextCursor} loading={isFetching} onNext={() => data.nextCursor && setPages([...pages, data.nextCursor])} onPrevious={() => setPages(pages.slice(0, -1))}/>
  </>}
 </section>;
}
