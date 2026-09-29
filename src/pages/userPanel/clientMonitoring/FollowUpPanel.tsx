import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { type ScFollowUp, type ScFollowUpDetail, getScFollowUp, updateScFollowUp } from '@/lib/api/sc-monitoring';
import { MonitoringDetailSkeleton } from './MonitoringSkeleton';

const date = (value: string | null) => value ? new Date(value.includes('T') ? value : `${value}T12:00:00Z`).toLocaleString('en-US',
  value.includes('T') ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium', timeZone: 'UTC' }) : '—';

export default function FollowUpPanel({ clientId, followUpId, onBack, onUnavailable }: {
  clientId: string; followUpId: string; onBack: () => void; onUnavailable: () => void;
}) {
  const [detail, setDetail] = useState<ScFollowUpDetail | null>(null);
  const [status, setStatus] = useState<ScFollowUp['status']>('open');
  const [outcome, setOutcome] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await getScFollowUp(clientId, followUpId, signal);
      if (signal?.aborted) return false;
      setDetail(result); setStatus(result.status); setOutcome(result.outcome || ''); setError('');
      return true;
    } catch (caught) {
      if (signal?.aborted) return false;
      if (axios.isAxiosError(caught) && [403, 404].includes(caught.response?.status || 0)) { setDetail(null); onUnavailable(); }
      else setError('Could not load this follow-up.');
      return false;
    }
  }, [clientId, followUpId, onUnavailable]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);

  const save = async () => {
    if (!detail) return;
    if (status === 'completed' && !outcome.trim()) { setError('Add an outcome before completing this follow-up'); return; }
    setSaving(true); setError('');
    try { await updateScFollowUp(clientId, followUpId, { status, outcome: outcome.trim(), revisionToken: detail.revisionToken }); await load(); }
    catch (caught) {
      if (axios.isAxiosError(caught) && caught.response?.status === 409) {
        if (await load()) setError('This follow-up changed while you were viewing it. Review the latest details and try again.');
      } else if (axios.isAxiosError(caught) && [403, 404].includes(caught.response?.status || 0)) { setDetail(null); onUnavailable(); }
      else setError('Could not save this update. Your changes are still here.');
    } finally { setSaving(false); }
  };

  if (!detail && !error) return <MonitoringDetailSkeleton kind="follow-up" />;
  return <div>
    <button type="button" className="scm-back" onClick={onBack}>← Back to monitoring overview</button>
    <div className="scm-heading"><div><div className="scm-eyebrow">Follow-up</div><h1 className="scm-title">{detail?.description || 'Follow-up'}</h1><p className="scm-sub">Linked monitoring contact · ID {followUpId}</p></div>
      {detail && <span className={`scm-tag scm-tag-${detail.priority === 'urgent' ? 'amber' : 'gray'}`}>{detail.priority} · {detail.status.replace('_', ' ')}</span>}</div>
    {error && <p role="alert" className="scm-error">{error}</p>}
    {detail && <div className="scm-layout"><div className="scm-stack">
      <section className="scm-panel scm-detail"><h2>Issue and action</h2><dl>
        <div className="scm-keyval"><dt>Category</dt><dd>{detail.category.replace('_', ' ')}</dd></div>
        <div className="scm-keyval"><dt>Issue</dt><dd>{detail.description}</dd></div>
        <div className="scm-keyval"><dt>Next action</dt><dd>{detail.action}</dd></div>
        <div className="scm-keyval"><dt>Responsible person</dt><dd>{detail.responsiblePerson || 'Current Support Coordinator'} <small className="text-[#71858b]">· informational</small></dd></div>
        <div className="scm-keyval"><dt>Due date</dt><dd>{date(detail.dueDate)}{detail.overdue ? ' · Overdue' : ''}</dd></div>
      </dl></section>
      <section className="scm-panel scm-detail"><h2>Update follow-up</h2>
        {detail.status === 'completed' ? <p className="scm-note">Completed {date(detail.completedAt)}. Outcome: {detail.outcome}</p> : <>
          <div className="scm-field"><span>Status</span><div className="scm-choices" role="group" aria-label="Follow-up status">
            {(['open', 'in_progress', 'completed'] as const).map(item => <button key={item} type="button" className="scm-choice" aria-pressed={status === item} onClick={() => setStatus(item)}>{item === 'in_progress' ? 'In progress' : item[0].toUpperCase() + item.slice(1)}</button>)}</div></div>
          <label className="scm-field" style={{ marginTop: 17 }}>Outcome note<textarea aria-label="Outcome note" value={outcome} onChange={event => setOutcome(event.target.value)} placeholder="What happened? Required when completed." /></label>
          <div className="scm-form-actions"><button type="button" className="scm-button scm-button-primary" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save update'}</button></div>
        </>}
      </section>
    </div><aside className="scm-stack"><section className="scm-panel"><div className="scm-panel-head"><h2>Activity</h2></div><div className="scm-timeline">
      {detail.events.length ? detail.events.map(event => <div className="scm-event" key={event.eventId}><strong>{event.previousStatus.replace('_', ' ')} → {event.status.replace('_', ' ')}</strong><p>{event.previousOutcome ? `Previous: ${event.previousOutcome}. ` : ''}{event.outcome || 'No outcome note'} · {event.authorName} · {date(event.createdAt)}</p></div>) : <div className="scm-event"><strong>Follow-up created</strong><p>{detail.authorName} · {date(detail.createdAt)}</p></div>}
    </div></section><div className="scm-plan-note scm-panel">A responsible person's name is informational. This does not assign a task to their inbox.</div></aside></div>}
  </div>;
}
