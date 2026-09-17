import type { ActivityLogNote } from '@/pages/userPanel/notes/apiTypes';

export default function LockedNoteEvidence({notes, displayedId, onEdit}: {notes: ActivityLogNote[]; displayedId: string; onEdit?: (note: ActivityLogNote) => void}) {
  return <>{notes.filter(note => note.id !== displayedId).map(note => <section key={note.id} className="mt-3 rounded-xl border border-[#e5e5e6] bg-white/50 p-4" aria-label="Additional note evidence">
    <p className="text-sm font-semibold">{note.status === 'active' ? 'Draft not submitted' : note.status === 'approved' ? 'Approved' : 'Submitted'}{note.status !== 'active' ? ' - Agency review required for changes' : ''}</p>
    <p className="text-xs text-[#808081]">{note.startDate?.slice(0, 10)}</p>
    <p className="mt-2 whitespace-pre-wrap text-sm">{[note.metadata?.activity, note.metadata?.description, note.metadata?.activities, ...(Array.isArray(note.metadata?.checkedActivities) ? note.metadata.checkedActivities : [])].filter(value => typeof value === 'string').join(' — ')}</p>
    {note.status === "active" && onEdit ? <button type="button" className="mt-2 text-sm text-[#008f93] underline" onClick={() => onEdit(note)}>Edit draft</button> : null}
  </section>)}</>;
}
