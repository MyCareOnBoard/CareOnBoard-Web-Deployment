import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { getScFollowUp, updateScFollowUp, listScFollowUpEvents, type ScFollowUpDetail } from '@/lib/api/sc-monitoring';
import FollowUpEditor from '@/components/sc-monitoring/FollowUpEditor';
import FollowUpSummary from '@/components/sc-monitoring/FollowUpSummary';
import { MonitoringDetailSkeleton } from '@/pages/userPanel/clientMonitoring/MonitoringSkeleton';

const MonitoringCareBridge = lazy(() => import('@/features/agency-care/MonitoringCareBridge').then(module => ({ default: module.MonitoringCareBridge })));

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
    <button type="button" className="scm-back text-[15px] font-semibold text-[#008f93]" onClick={onBack}>← Back to monitoring overview</button>
    {error && <p role="alert">{error}</p>}{!detail && error && <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button>}
    {detail && <><div><h1 className="text-2xl font-semibold">{detail.description || 'Follow-up'}</h1><p className="mt-1 text-[15px]">Recorded by {detail.authorName} · {detail.status.replaceAll('_',' ')}</p></div>
      <FollowUpSummary detail={detail} />
      <Suspense fallback={<p role="status">Loading care evidence…</p>}><MonitoringCareBridge clientId={clientId} recordKind="follow_up" recordId={detail.followUpId} recordLabel={detail.description || 'Saved follow-up'} canManage /></Suspense>
      <FollowUpEditor key={`${clientId}:${followUpId}`} detail={detail} canEdit={true}
        loadLatest={signal => getScFollowUp(clientId, followUpId, signal)} saveUpdate={input => updateScFollowUp(clientId, followUpId, input)}
        loadEvents={(cursor, signal) => listScFollowUpEvents(clientId, followUpId, cursor, signal)} onUnavailable={onUnavailable} onSaved={value => { setDetail(current => current && ({...current,...value})); onSaved?.(); }} />
    </>}
  </section>;
}
