import { Skeleton } from '@/components/ui/skeleton';

function ListPlaceholder({ rows }: { rows: number }) {
  return <div className="scm-panel">{Array.from({ length: rows }, (_, index) =>
    <div className="scm-row" key={index}><Skeleton className="h-[34px] w-[34px] shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-48 max-w-full" /><Skeleton className="h-3 w-64 max-w-full" /><Skeleton className="h-3 w-24" /></div>
      <Skeleton className="h-8 w-16 shrink-0 rounded-lg" /></div>)}</div>;
}

export function MonitoringOverviewSkeleton() {
  return <div className="scm" role="status" aria-label="Loading client monitoring"><span className="sr-only">Loading client monitoring…</span>
    <div aria-hidden="true"><Skeleton className="mb-5 h-4 w-32" />
      <div className="scm-panel scm-banner"><Skeleton className="h-12 w-12 rounded-full" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-5 w-44 max-w-full" /><Skeleton className="h-3 w-64 max-w-full" /></div><Skeleton className="h-10 w-40 max-w-full" /></div>
      <div className="scm-heading"><div className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-72 max-w-full" /></div><Skeleton className="h-10 w-36 rounded-xl" /></div>
      <div className="scm-layout"><div className="scm-stack"><section><Skeleton className="mb-3 h-5 w-36" /><ListPlaceholder rows={2} /></section><section><Skeleton className="mb-3 h-5 w-44" /><ListPlaceholder rows={2} /></section></div>
        <aside className="scm-panel"><div className="scm-panel-head"><Skeleton className="h-5 w-28" /><Skeleton className="h-6 w-16 rounded-lg" /></div>{[0, 1, 2].map(index => <div className="scm-plan-row space-y-2" key={index}><Skeleton className="h-3 w-24" /><Skeleton className="h-4 w-44 max-w-full" /><Skeleton className="h-3 w-32" /></div>)}</aside></div>
    </div></div>;
}

export function MonitoringDetailSkeleton({ kind }: { kind: 'contact' | 'follow-up' }) {
  const label = kind === 'contact' ? 'Loading contact record' : 'Loading follow-up';
  return <div role="status" aria-label={label}><span className="sr-only">{label}…</span><div aria-hidden="true">
    <Skeleton className="mb-5 h-4 w-44" /><div className="scm-heading"><div className="space-y-2"><Skeleton className="h-3 w-36" /><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-72 max-w-full" /></div><Skeleton className="h-7 w-28 rounded-lg" /></div>
    <div className="scm-layout"><div className="scm-stack">{[0, 1].map(section => <section className="scm-panel scm-detail" key={section}><Skeleton className="mb-5 h-5 w-40" />
      {[0, 1, 2, 3].map(row => <div className="scm-keyval" key={row}><Skeleton className="h-3 w-24" /><Skeleton className="h-4 w-48 max-w-full" /></div>)}</section>)}</div>
      <aside className="scm-stack"><section className="scm-panel"><div className="scm-panel-head"><Skeleton className="h-5 w-40" /></div><div className="space-y-3 p-5"><Skeleton className="h-4 w-48 max-w-full" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" /></div></section><section className="scm-panel"><div className="scm-panel-head"><Skeleton className="h-5 w-32" /></div><div className="space-y-3 p-5"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-52 max-w-full" /></div></section></aside></div>
  </div></div>;
}
