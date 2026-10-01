import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { getScFollowUp, updateScFollowUp, listScFollowUpEvents, type ScFollowUpDetail } from '@/lib/api/sc-monitoring';
import FollowUpEditor from '@/components/sc-monitoring/FollowUpEditor';
import { MonitoringDetailSkeleton } from '@/pages/userPanel/clientMonitoring/MonitoringSkeleton';

export default function FollowUpPanel({ clientId, followUpId, onBack, onUnavailable, onSaved }: {
  clientId: string; followUpId: string; onBack: () => void; onUnavailable: () => void; onSaved?: () => void;
}) {
  const [detail, setDetail] = useState<ScFollowUpDetail | null>(null); const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  const unavailable = useRef(onUnavailable); unavailable.current = onUnavailable;
  useEffect(() => { const controller = new AbortController(); setDetail(null); setError('');
    getScFollowUp(clientId, followUpId, controller.signal).then(value => { if (!controller.signal.aborted) setDetail(value); }).catch(caught => {
      if (controller.signal.aborted) return;
      if (axios.isAxiosError(caught) && [401,403,404].includes(caught.response?.status || 0)) unavailable.current(); else setError('Could not load this follow-up.');
    }); return () => controller.abort();
  }, [clientId, followUpId, retry]);
  if (!detail && !error) return <MonitoringDetailSkeleton kind="follow-up" />;
  return <section className="space-y-5 text-[#17383b]">
    <button type="button" className="scm-back text-sm font-semibold text-[#008f93]" onClick={onBack}>← Back to monitoring overview</button>
    {error && <p role="alert">{error}</p>}{!detail && error && <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button>}
    {detail && <><div><h1 className="text-2xl font-semibold">{detail.description || 'Follow-up'}</h1><p className="mt-1 text-sm">Recorded by {detail.authorName} · {detail.status.replaceAll('_',' ')}</p></div>
      <section className="rounded-xl border border-[#dce6e7] bg-white p-5"><h2 className="mb-3 text-lg font-semibold">Issue and action</h2><dl className="space-y-2 text-sm"><div><dt>Category</dt><dd>{detail.category}</dd></div><div><dt>Issue</dt><dd>{detail.description}</dd></div><div><dt>Next action</dt><dd>{detail.action}</dd></div><div><dt>Responsible person</dt><dd>{detail.responsiblePerson || 'Current Support Coordinator'} (informational)</dd></div><div><dt>Due date</dt><dd>{detail.dueDate}{detail.overdue ? ' · Overdue' : ''}</dd></div></dl></section>
      <FollowUpEditor key={`${clientId}:${followUpId}`} detail={detail} canEdit={true}
        loadLatest={signal => getScFollowUp(clientId, followUpId, signal)} saveUpdate={input => updateScFollowUp(clientId, followUpId, input)}
        loadEvents={(cursor, signal) => listScFollowUpEvents(clientId, followUpId, cursor, signal)} onUnavailable={onUnavailable} onSaved={value => { setDetail(current => current && ({...current,...value})); onSaved?.(); }} />
    </>}
  </section>;
}
