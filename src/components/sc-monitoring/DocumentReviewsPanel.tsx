import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentPreviewModal } from '@/components/documents/DocumentPreviewModal';
import { useAssignmentReviewScope } from '@/hooks/useAssignmentReview';
import { useScMonitoringRefresh } from '@/hooks/useScMonitoringRefresh';
import { getDocumentReviews, markDocumentReviewed, getDocumentReviewEvents,
  type DocumentReviewOverview, type DocumentReviewItem, type DocumentReviewEventPage } from '@/lib/api/sc-document-reviews';

const statusLabels: Record<DocumentReviewItem['status'], string> = {
  disabled: 'Review schedule off', needs_first_review: 'First review needed', upcoming: 'Upcoming',
  due_today: 'Due today', overdue: 'Overdue', unavailable: 'Unavailable',
};
const civilDate = (value: string | null) => value ? new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' }) : '—';
const reviewedDate = (value: string, timezone: string | null) => new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone || 'UTC' });
const lostAccess = (error: unknown) => axios.isAxiosError(error) && [401, 403, 404].includes(error.response?.status || 0);
type Props = { clientId: string; agencyView?: boolean; refreshKey?: number; onReviewed?: () => void };

function DocumentReviewsWorkspace({ clientId, agencyView = false, refreshKey = 0, onReviewed }: Props) {
  const [searchParams] = useSearchParams();
  const linkedReference = searchParams.get('documentReview');
  const [overview, setOverview] = useState<DocumentReviewOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [historyReference, setHistoryReference] = useState<string | null>(null);
  const [previewReference, setPreviewReference] = useState<string | null>(null);
  const loadController = useRef<AbortController | null>(null);
  const submitController = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const rows = useRef(new Map<string, HTMLElement>());
  const focusedLink = useRef<string | null>(null);

  const refresh = useCallback(async (externalSignal?: AbortSignal) => {
    loadController.current?.abort();
    const controller = new AbortController(); loadController.current = controller;
    const abort = () => controller.abort();
    externalSignal?.addEventListener('abort', abort, { once: true });
    if (externalSignal?.aborted) controller.abort();
    setLoading(true); setError('');
    try {
      const data = await getDocumentReviews(clientId, agencyView, controller.signal);
      if (!controller.signal.aborted && mounted.current) setOverview(data);
    } catch (caught) {
      if (controller.signal.aborted || !mounted.current) return;
      if (lostAccess(caught)) { setOverview(null); setNotice(''); setError('Document reviews are unavailable. Your access may have changed.'); }
      else setError('Could not load document reviews. Try again.');
    } finally {
      externalSignal?.removeEventListener('abort', abort);
      if (!controller.signal.aborted && mounted.current) setLoading(false);
    }
  }, [clientId, agencyView]);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; loadController.current?.abort(); submitController.current?.abort(); }; }, []);
  useEffect(() => { void refresh(); return () => loadController.current?.abort(); }, [refresh, refreshKey]);
  useScMonitoringRefresh({ scopeKey: `${clientId}:${agencyView}`, timezone: overview?.timezone, refresh, enabled: true });
  useEffect(() => {
    if (!linkedReference || focusedLink.current === linkedReference || !overview?.items.some(item => item.reference === linkedReference)) return;
    const row = rows.current.get(linkedReference);
    if (row) { row.scrollIntoView?.({ block: 'nearest' }); row.focus(); focusedLink.current = linkedReference; }
  }, [linkedReference, overview]);

  const markReviewed = async (item: DocumentReviewItem) => {
    if (agencyView || submitController.current || loading) return;
    const controller = new AbortController(); submitController.current = controller;
    setSaving(item.reference); setError(''); setNotice('');
    try {
      const updated = await markDocumentReviewed(clientId, item.reference, item.revision, controller.signal);
      if (controller.signal.aborted || !mounted.current) return;
      setOverview(current => current && ({ ...current, items: current.items.map(row => row.reference === updated.reference ? updated : row) }));
      setNotice(`${updated.title}: review recorded.`);
      void refresh(); onReviewed?.();
    } catch (caught) {
      if (controller.signal.aborted || !mounted.current) return;
      const code = axios.isAxiosError(caught) ? caught.response?.status : undefined;
      if (code === 409 || code === 404) { setNotice('This document changed. Review the current file and mark it reviewed again.'); void refresh(); }
      else if (lostAccess(caught)) { setOverview(null); setError('Document reviews are unavailable. Your access may have changed.'); }
      else setError('Could not record this review. Try again.');
    } finally {
      if (submitController.current === controller) { submitController.current = null; if (mounted.current) setSaving(null); }
    }
  };
  const preview = overview?.items.find(item => item.reference === previewReference);

  return <section aria-label="Document reviews" className="mb-5 overflow-hidden rounded-xl border border-[#dce6e7] bg-white text-[15px] text-[#16383b] shadow-[0_2px_10px_rgba(21,58,61,0.03)]">
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#e6eded] p-4 sm:p-5">
      <div><h2 className="text-[19px] font-semibold">Document reviews</h2><p className="mt-1 text-[13px] text-[#617579]">Recurring review of the current uploaded files.</p></div>
      {agencyView && <span className="rounded-full bg-[#eaf6f6] px-2.5 py-1 text-[13px] font-semibold text-[#087b80]">Read-only</span>}
    </div>
    {notice && <p role="status" className="m-4 rounded-lg border border-[#b5e5d8] bg-[#eaf9f4] px-4 py-2 text-[#176853]">{notice}</p>}
    {error && <div role="alert" className="p-4 text-[#b42332]"><p>{error}</p><Button variant="outline" className="mt-2" disabled={loading} onClick={() => void refresh()}>Retry document reviews</Button></div>}
    {loading && !overview ? <div role="status" aria-label="Loading document reviews" className="space-y-3 p-5"><Skeleton className="h-5 w-40" /><Skeleton className="h-16 w-full" /></div>
      : overview && !overview.enabled ? <p className="p-4 text-[#617579]">Document review schedules are off. {agencyView ? 'Use Monitoring Settings to configure them.' : 'Ask the agency owner to configure them.'}</p>
        : overview && !overview.items.length ? <p className="p-4 text-[#617579]">No uploaded documents are available for review.</p>
          : overview && <>
            <div className="divide-y divide-[#ebf0f0]">{overview.items.map(item => {
              const needsReview = ['needs_first_review', 'due_today', 'overdue'].includes(item.status);
              const canReview = !agencyView && item.status !== 'disabled' && item.status !== 'unavailable' && item.intervalDays !== null && Boolean(item.url);
              return <article key={item.reference} ref={element => { if (element) rows.current.set(item.reference, element); else rows.current.delete(item.reference); }} tabIndex={-1} aria-label={`${item.title} review`} className={`p-4 outline-[#008f93] sm:p-5 ${linkedReference === item.reference ? 'bg-[#f0fafa] ring-2 ring-inset ring-[#008f93]' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 flex-1"><h3 className="break-words font-semibold">{item.title}</h3><p className="mt-1 break-words text-[13px] text-[#617579]">{item.category}{item.fileName ? ` · ${item.fileName}` : ''}{item.intervalDays ? ` · Every ${item.intervalDays} days` : ''}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold ${needsReview ? 'bg-[#fff4dc] text-[#795510]' : 'bg-[#eaf6f6] text-[#087b80]'}`}>{statusLabels[item.status]}</span></div>
                <dl className="mt-3 grid gap-2 break-words text-[13px] sm:grid-cols-2"><div className="min-w-0"><dt className="text-[#617579]">Last reviewed</dt><dd className="mt-0.5">{item.lastReviewedAt ? <>{reviewedDate(item.lastReviewedAt, overview.timezone)}{item.reviewedByName && ` · ${item.reviewedByName}`}</> : 'Not yet reviewed'}</dd></div><div className="min-w-0"><dt className="text-[#617579]">Next review</dt><dd className="mt-0.5">{item.status === 'needs_first_review' ? 'Review now' : civilDate(item.nextReviewDueDate)}</dd></div></dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.url && <Button size="sm" variant="outline" onClick={() => setPreviewReference(item.reference)} aria-label={`Preview ${item.title}`}>Preview</Button>}
                  <Button size="sm" variant="outline" aria-expanded={historyReference === item.reference} aria-label={`Review history for ${item.title}`} onClick={() => setHistoryReference(current => current === item.reference ? null : item.reference)}>Review history</Button>
                  {canReview && <Button size="sm" className="bg-[#008f93] text-white hover:bg-[#087b80]" disabled={Boolean(saving) || loading} onClick={() => void markReviewed(item)} aria-label={`Mark ${item.title} reviewed`}>{saving === item.reference ? 'Saving…' : 'Mark reviewed'}</Button>}
                </div>
                {historyReference === item.reference && <ReviewHistory key={`${item.reference}:${item.revision}`} clientId={clientId} item={item} agencyView={agencyView} timezone={overview.timezone} onChanged={refresh} />}
              </article>;
            })}</div>
            <p className="border-t border-[#e6eded] px-4 py-3 text-[13px] text-[#617579]">A replacement file needs its own first review. Review dates do not change document expiration dates.{overview.timezone && ` Dates shown in ${overview.timezone}.`}</p>
          </>}
    <DocumentPreviewModal open={Boolean(preview)} onOpenChange={open => { if (!open) setPreviewReference(null); }} title={preview?.title || 'Document'} fileName={preview?.fileName || undefined} url={preview?.url} />
  </section>;
}

function ReviewHistory({ clientId, item, agencyView, timezone, onChanged }: { clientId: string; item: DocumentReviewItem; agencyView: boolean; timezone: string | null; onChanged: () => Promise<void> }) {
  const [page, setPage] = useState<DocumentReviewEventPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(async (cursor?: string) => {
    if (controller.current && !controller.current.signal.aborted) return;
    const pending = new AbortController(); controller.current = pending; setLoading(true); setError('');
    try {
      const result = await getDocumentReviewEvents(clientId, item.reference, agencyView, cursor, pending.signal);
      if (!pending.signal.aborted) setPage(current => cursor && current ? { items: [...current.items, ...result.items.filter(event => !current.items.some(prior => prior.eventId === event.eventId))], nextCursor: result.nextCursor } : result);
    } catch (caught) {
      if (!pending.signal.aborted) {
        setError('Could not load review history. Try again.');
        if (lostAccess(caught)) { setPage(null); void onChanged(); }
      }
    }
    finally { if (controller.current === pending && !pending.signal.aborted) { controller.current = null; setLoading(false); } }
  }, [clientId, item.reference, agencyView, onChanged]);
  useEffect(() => { void load(); return () => { controller.current?.abort(); controller.current = null; }; }, [load]);
  return <div className="mt-4 rounded-lg border border-[#dce6e7] bg-[#f7fbfb] p-3" aria-label={`Review history for ${item.title}`}>
    <h4 className="font-semibold">Review history</h4>
    {loading && !page && <p role="status" className="mt-2 text-[13px] text-[#617579]">Loading review history…</p>}
    {page?.items.length ? <ol className="mt-2 space-y-2 break-words text-[13px]">{page.items.map(event => <li key={event.eventId}><span className="font-semibold">{event.reviewerName}</span> · {reviewedDate(event.reviewedAt, timezone)}</li>)}</ol> : page && <p className="mt-2 text-[13px] text-[#617579]">No reviews recorded for this file.</p>}
    {error && <p role="alert" className="mt-2 text-[13px] text-[#b42332]">{error}</p>}
    {(page?.nextCursor || error) && <Button size="sm" variant="outline" className="mt-3" disabled={loading} onClick={() => void load(page?.nextCursor || undefined)}>{loading ? 'Loading…' : error ? 'Retry review history' : 'Load older reviews'}</Button>}
  </div>;
}

export default function DocumentReviewsPanel(props: Props) {
  const scope = useAssignmentReviewScope();
  return <DocumentReviewsWorkspace key={`${scope}:${props.clientId}:${props.agencyView}`} {...props} />;
}
