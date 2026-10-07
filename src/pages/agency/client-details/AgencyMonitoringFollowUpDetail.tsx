import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { getAgencyMonitoringFollowUp, updateAgencyMonitoringFollowUp, listAgencyFollowUpEvents, type AgencyFollowUpDetail } from '@/lib/api/sc-agency-monitoring';
import FollowUpEditor from '@/components/sc-monitoring/FollowUpEditor';
import FollowUpSummary from '@/components/sc-monitoring/FollowUpSummary';
import { MonitoringDetailSkeleton } from '@/pages/userPanel/clientMonitoring/MonitoringSkeleton';

const MonitoringCareBridge = lazy(() => import('@/features/agency-care/MonitoringCareBridge').then(module => ({ default: module.MonitoringCareBridge })));

export default function AgencyMonitoringFollowUpDetail({ clientId, followUpId, onBack, onUnavailable, onSaved, canUpdateFollowUps, onContact }: {
  clientId: string; followUpId: string; onBack: () => void; onUnavailable: () => void; onSaved: () => void; canUpdateFollowUps: boolean; onContact: (id: string) => void;
}) {
  const [detail, setDetail] = useState<AgencyFollowUpDetail | null>(null); const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  const unavailable = useRef(onUnavailable); unavailable.current = onUnavailable;
  useEffect(() => { const controller = new AbortController(); setDetail(null); setError('');
    getAgencyMonitoringFollowUp(clientId, followUpId, controller.signal).then(value => { if (!controller.signal.aborted) setDetail(value); }).catch(caught => {
      if (controller.signal.aborted) return;
      if (axios.isAxiosError(caught) && [401,403,404].includes(caught.response?.status || 0)) unavailable.current(); else setError('Could not load this follow-up.');
    }); return () => controller.abort();
  }, [clientId, followUpId, retry]);
  if (!detail && !error) return <MonitoringDetailSkeleton kind="follow-up" />;
  return <section className="space-y-5 text-[#17383b]">
    <button type="button" className="scm-back text-[15px] font-semibold text-[#008f93]" onClick={onBack}>← Back to monitoring</button>
    {error && <p role="alert">{error}</p>}{!detail && error && <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button>}
    {detail && <><div><h1 className="text-2xl font-semibold">{detail.description || 'Follow-up'}</h1><p className="mt-1 text-[15px]">Recorded by {detail.authorName} · {detail.status.replaceAll('_',' ')}</p><button type="button" className="mt-2 text-[15px] font-semibold text-[#008f93]" onClick={() => onContact(detail.contactId)}>View contact</button></div>
      <FollowUpSummary detail={detail} />
      <Suspense fallback={<p role="status">Loading care evidence…</p>}><MonitoringCareBridge clientId={clientId} recordKind="follow_up" recordId={detail.followUpId} recordLabel={detail.description || 'Saved follow-up'} /></Suspense>
      <FollowUpEditor key={`${clientId}:${followUpId}`} detail={detail} canEdit={canUpdateFollowUps && detail.canUpdateFollowUps} agency
        loadLatest={signal => getAgencyMonitoringFollowUp(clientId, followUpId, signal)} saveUpdate={input => updateAgencyMonitoringFollowUp(clientId, followUpId, input)}
        loadEvents={(cursor, signal) => listAgencyFollowUpEvents(clientId, followUpId, cursor, signal)} onUnavailable={onUnavailable} onSaved={value => { setDetail(current => current && ({...current,...value})); onSaved?.(); }} />
    </>}
  </section>;
}
