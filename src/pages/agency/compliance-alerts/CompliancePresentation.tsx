import {useId, useRef, useState, type ReactNode, type CSSProperties} from 'react';
import {FileSearch, ChevronRight, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Skeleton} from '@/components/ui/skeleton';
import './compliance.css';

export function ComplianceSkeleton({label, detail = true}: {label: string; detail?: boolean}) {
  return <div role="status" aria-label={label} className={detail ? 'compliance-loading' : ''}>
    <span className="sr-only">{label}</span>
    <div aria-hidden="true" className="divide-y divide-[#dce7e8]">{[0,1,2,3].map(row => <div key={row} className="flex min-h-24 items-center justify-between gap-4 p-4">
      <div className="flex-1 space-y-3"><Skeleton className="h-4 w-2/3 motion-reduce:animate-none"/><Skeleton className="h-3 w-1/2 motion-reduce:animate-none"/></div><Skeleton className="h-6 w-20 motion-reduce:animate-none"/>
    </div>)}</div>
    {detail && <div aria-hidden="true" className="space-y-6 rounded-xl bg-[#f5f9f9] p-6"><Skeleton className="h-3 w-24 motion-reduce:animate-none"/><Skeleton className="h-7 w-3/4 motion-reduce:animate-none"/><Skeleton className="h-4 w-1/2 motion-reduce:animate-none"/><Skeleton className="h-20 w-full motion-reduce:animate-none"/><Skeleton className="h-11 w-full rounded-full motion-reduce:animate-none"/></div>}
  </div>;
}
export function ComplianceBadge({children, tone = 'neutral'}: {children: ReactNode; tone?: 'danger' | 'warning' | 'success' | 'neutral'}) {
  return <span className={`compliance-badge compliance-badge-${tone}`}>{children}</span>;
}
export function complianceTone(status: string) {
  if (['expired','not_uploaded','missing','overdue'].includes(status)) return 'danger';
  if (['expiring','due_today','expires_today','needs_review','multiple_files','unfinished','changes_requested','needs_correction','draft'].includes(status)) return 'warning';
  if (['current','on_file','approved'].includes(status)) return 'success';
  return 'neutral';
}
export interface ComplianceReviewItem {
  id: string; title: string; subtitle?: ReactNode; status?: ReactNode; meta?: ReactNode; detail: ReactNode;
}
export function ComplianceReviewList({items, label, selection}: {items: ComplianceReviewItem[]; label: string; selection?: {id:string | null; onChange:(id:string | null)=>void}}) {
  const [selectedId, setSelectedId] = useState<string | null>();
  const selectedButton = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const select = selection?.onChange || setSelectedId;
  const selected = selection ? items.find(item => item.id === selection.id) : selectedId === null ? undefined : items.find(item => item.id === selectedId) || items[0];
  if (!items.length) return null;
  return <div className="compliance-review" aria-label={label} style={{'--review-row-count': items.length} as CSSProperties}>
    <div className={`compliance-records${selected ? ' has-selection' : ''}`}>{items.map((item) => <div key={item.id} className="compliance-record">
      <button ref={selected?.id === item.id ? selectedButton : undefined} type="button" aria-label={`Review ${item.title}`} aria-describedby={item.status ? `${panelId}-${item.id}-status` : undefined} aria-pressed={selected?.id === item.id} aria-controls={selected?.id === item.id ? `${panelId}-${item.id}` : undefined} className="compliance-record-button" onClick={() => select(item.id)}>
        <span className="min-w-0"><span className="flex items-start gap-3 font-bold text-[#16343a]"><span className="min-w-0 break-words">{item.title}</span></span>{item.subtitle && <span className="mt-1 block text-sm text-[#5e7378]">{item.subtitle}</span>}{item.meta && <span className="mt-1 block text-xs text-[#5e7378]">{item.meta}</span>}</span>
        <span id={`${panelId}-${item.id}-status`} className="flex shrink-0 items-center gap-2">{item.status}<ChevronRight size={15} aria-hidden="true" className="text-[#007f84]"/></span>
      </button>
      {selected?.id === item.id && <div id={`${panelId}-${item.id}`} className="compliance-record-detail" role="region" aria-label={`${item.title} details`}>
        <div className="compliance-detail-header">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#5e7378]"><FileSearch size={15} aria-hidden="true"/>Selected record</p>
          <Button type="button" variant="ghost" size="icon" aria-label="Close selected record" onClick={() => { selectedButton.current?.focus(); select(null); }}><X size={18} aria-hidden="true"/></Button>
        </div>
        {item.detail}
      </div>}
    </div>)}</div>
  </div>;
}
