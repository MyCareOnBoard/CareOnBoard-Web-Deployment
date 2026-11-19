import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {useToast} from '@/hooks/use-toast';
import {complianceAlertsApi} from './api';

const actionsApi = complianceAlertsApi.injectEndpoints({endpoints: builder => ({
  recordFindingAction: builder.mutation<{ok: boolean}, {findingId: string; action: 'review' | 'dismiss'; note?: string}>({
    query: ({findingId, action, note}) => ({url: `/notifications/compliance/findings/${encodeURIComponent(findingId)}/${action}`, method: 'POST', data: note ? {note} : {}, requiresAuth: true}),
  }),
})});
export const {useRecordFindingActionMutation} = actionsApi;

const copy = {
  review: {open: 'Mark reviewed', title: 'Mark documentation reviewed', hint: 'Optional note. This records that you reviewed these notes; it does not contact the staff member.', submit: 'Save review', done: 'Review recorded'},
  dismiss: {open: 'Dismiss', title: 'Dismiss this pattern', hint: 'Required. Say why this is not a real documentation gap. The pattern will not come back.', submit: 'Dismiss pattern', done: 'Pattern dismissed'},
} as const;

export function FindingActions({findingId, status, name, onDone}: {findingId: string; status: string; name?: string; onDone: () => void}) {
  const {toast} = useToast();
  const [run, {isLoading}] = useRecordFindingActionMutation();
  const [mode, setMode] = useState<'review' | 'dismiss' | null>(null);
  const [note, setNote] = useState('');
  if (status !== 'open' && status !== 'recurred') return null;
  const who = name ? ` for ${name}` : '';
  const close = () => {setMode(null); setNote('');};
  async function submit() {
    if (!mode) return;
    try {
      await run({findingId, action: mode, note: note.trim() || undefined}).unwrap();
      toast({title: copy[mode].done});
      close();
      onDone();
    } catch (error) {
      const message = (error as {data?: {error?: string}})?.data?.error;
      toast({title: 'Could not save', description: message || 'Please try again.', variant: 'destructive'});
    }
  }
  if (!mode) return <div className="flex flex-wrap gap-2 pt-1">
    <Button type="button" variant="outline" size="sm" aria-label={`Mark reviewed${who}`} onClick={() => setMode('review')}>{copy.review.open}</Button>
    <Button type="button" variant="ghost" size="sm" aria-label={`Dismiss pattern${who}`} onClick={() => setMode('dismiss')}>{copy.dismiss.open}</Button>
  </div>;
  const reason = mode === 'dismiss';
  return <form className="space-y-2 pt-1" onSubmit={event => {event.preventDefault(); void submit();}}>
    <label className="block text-sm font-semibold" htmlFor={`note-${findingId}`}>{copy[mode].title}</label>
    <p className="text-xs text-[#5e7378]" id={`hint-${findingId}`}>{copy[mode].hint}</p>
    <Textarea id={`note-${findingId}`} aria-describedby={`hint-${findingId}`} value={note} maxLength={1000} rows={3} onChange={event => setNote(event.target.value)}/>
    <div className="flex gap-2">
      <Button type="submit" size="sm" disabled={isLoading || (reason && note.trim().length < 3)}>{isLoading ? 'Saving…' : copy[mode].submit}</Button>
      <Button type="button" variant="ghost" size="sm" disabled={isLoading} onClick={close}>Cancel</Button>
    </div>
  </form>;
}
