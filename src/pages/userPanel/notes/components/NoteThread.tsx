import {useState, type FormEvent} from 'react';
import {AlertCircle, CheckCircle2, Clock3, Loader2, MessageSquare, PencilLine, Send} from 'lucide-react';
import {toast} from 'sonner';
import {Dialog, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog';
import {cn} from '@/lib/utils';
import {timeAndDay} from '@/lib/notes/notesList';
import {CloseButton} from '../../records/RecordsKit';
import {useAddNoteCommentMutation, useResolveNoteCommentMutation, type NoteComment, type NoteHistoryEvent, type NoteHistoryKind} from '../api';
import {NOTE_CARD, NOTE_PRIMARY, NOTE_SECONDARY, NoteBanner} from './NotesKit';
import {dayAtTime} from './NotePageKit';

/*
 * Coordinator conversation, change requests, the note's history and the
 * correction request for an approved note.
 */

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '?';
const firstName = (name: string) => name.split(/\s+/)[0] || name;
const when = (iso: string | null, timezone: string | null) => iso ? timeAndDay(iso, timezone).split(', ').reverse().join(', ') : '';

export const changeRequests = (comments: NoteComment[]) => comments.filter(comment => comment.kind === 'change_request');
export const sectionRequests = (comments: NoteComment[], section: string) => changeRequests(comments).filter(comment => comment.section === section && !comment.resolved);

/** A reviewer's request shown inside the section it is about. */
export function SectionRequests({comments, section, timezone}: {comments: NoteComment[]; section: string; timezone: string | null}) {
    const open = sectionRequests(comments, section);
    if (!open.length) return null;
    return <div className="mb-4 flex flex-col gap-2">
        {open.map(comment => <div key={comment.id} className="flex items-start gap-2.5 rounded-[10px] bg-[#eef1f5] px-3 py-2.5 dark:bg-[#8aa0c2]/10">
            <Avatar name={comment.authorName}/>
            <div className="min-w-0 text-[13px]">
                <p className="text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]"><span className="font-medium text-[#10141a] dark:text-[#f4f6f7]">{comment.authorName}</span> · {when(comment.createdAt, timezone)}</p>
                <p className="text-[#2c3e5c] dark:text-[#b9c8e0]">{comment.body}</p>
            </div>
        </div>)}
    </div>;
}

function Avatar({name, mine}: {name: string; mine?: boolean}) {
    return <span aria-hidden="true" className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold',
        mine ? 'bg-[#e5484d] text-white' : 'bg-[#3a4a63] text-white dark:bg-[#8aa0c2] dark:text-[#10141a]')}>{initials(name)}</span>;
}

/** Blue banner on a returned note, with how many requested changes are done. */
export function ReturnedBanner({comments, returnedAt, timezone, onMessage}: {comments: NoteComment[]; returnedAt: string | null; timezone: string | null; onMessage: () => void}) {
    const requests = changeRequests(comments);
    const done = requests.filter(comment => comment.resolved).length;
    const reviewer = [...comments].reverse().find(comment => comment.authorKind === 'reviewer');
    const message = [...comments].reverse().find(comment => comment.authorKind === 'reviewer' && comment.kind === 'message');
    return <NoteBanner tone="blue" role="status" icon={<MessageSquare className="h-4 w-4"/>}
        action={<button type="button" className={cn(NOTE_SECONDARY, 'h-9 text-[13px]')} onClick={onMessage}>Message coordinator</button>}>
        <p className="font-semibold">{reviewer ? `${reviewer.authorName} returned this note` : 'Your coordinator returned this note'}{returnedAt ? ` on ${dayAtTime(returnedAt, timezone)}` : ''}</p>
        {message ? <p className="text-[13px]">&ldquo;{message.body}&rdquo;</p> : null}
        {requests.length ? <div className="mt-2 flex items-center gap-3 text-[12px]">
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-[#cfd9e8] dark:bg-white/10"><div className="h-full rounded-full bg-[#3a4a63] dark:bg-[#b9c8e0]" style={{width: `${done / requests.length * 100}%`}}/></div>
            {done} of {requests.length} changes done
        </div> : null}
    </NoteBanner>;
}

/** "Changes requested": each request, with a box to mark it done. */
export function ChangesRequestedCard({activityLogId, comments, editable}: {activityLogId: string; comments: NoteComment[]; editable: boolean}) {
    const requests = changeRequests(comments);
    const [resolve, {isLoading}] = useResolveNoteCommentMutation();
    if (!requests.length) return null;
    const toggle = async (comment: NoteComment) => {
        try { await resolve({activityLogId, commentId: comment.id, resolved: !comment.resolved}).unwrap(); }
        catch { toast.error("Couldn't update that change. Try again."); }
    };
    return <section aria-labelledby="changes-card" className={cn(NOTE_CARD, 'p-4')}>
        <h2 id="changes-card" className="text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">Changes requested</h2>
        <ul className="mt-2.5 flex flex-col gap-2.5">
            {requests.map(comment => <li key={comment.id}>
                <label className={cn('flex items-start gap-2.5 text-[13px]', editable && !isLoading ? 'cursor-pointer' : 'cursor-default')}>
                    <input type="checkbox" className="sr-only" checked={comment.resolved} disabled={!editable || isLoading} onChange={() => void toggle(comment)}/>
                    {comment.resolved ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1d6b42] dark:text-[#7fd6a3]" aria-hidden="true"/>
                        : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#b3261e] dark:text-[#f3a08c]" aria-hidden="true"/>}
                    <span className="min-w-0">
                        <span className={cn('block', comment.resolved ? 'text-[#5d6b73] line-through dark:text-[#9aa4a8]' : 'text-[#10141a] dark:text-[#f4f6f7]')}>{comment.body}</span>
                        <span className="block text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{comment.resolved ? 'Done' : 'Open'}{comment.section ? ` · ${comment.section.replace(/[-_:]/g, ' ')}` : ''}{editable ? ` · ${comment.resolved ? 'Mark as open' : 'Mark as done'}` : ''}</span>
                    </span>
                </label>
            </li>)}
        </ul>
        <p className="mt-3 text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">Your coordinator sees what you mark done when you send the note back.</p>
    </section>;
}

/** Messages with the coordinator about this note, and a reply box. */
export function ConversationCard({activityLogId, comments, timezone, canPost, myName}: {activityLogId: string; comments: NoteComment[]; timezone: string | null; canPost: boolean; myName: string}) {
    const [body, setBody] = useState('');
    const [add, {isLoading}] = useAddNoteCommentMutation();
    const messages = comments.filter(comment => comment.kind !== 'change_request');
    const reviewer = [...comments].reverse().find(comment => comment.authorKind === 'reviewer');
    const send = async (event: FormEvent) => {
        event.preventDefault();
        const text = body.trim();
        if (!text) return;
        try {
            await add({activityLogId, body: text}).unwrap();
            setBody('');
        } catch {
            toast.error("Couldn't send your message. Try again.");
        }
    };
    if (!messages.length && !canPost) return null;
    return <section id="conversation" aria-labelledby="conversation-card" className={cn(NOTE_CARD, 'scroll-mt-24 p-4')}>
        <h2 id="conversation-card" className="text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">Conversation</h2>
        {messages.length ? <ol className="mt-2.5 flex flex-col gap-3">
            {messages.map(comment => {
                const mine = comment.authorKind === 'employee';
                return <li key={comment.id} className="flex items-start gap-2.5">
                    <Avatar name={mine ? myName || comment.authorName : comment.authorName} mine={mine}/>
                    <div className="min-w-0 text-[13px]">
                        <p className="text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]"><span className="font-medium text-[#10141a] dark:text-[#f4f6f7]">{mine ? 'You' : comment.authorName}</span> · {when(comment.createdAt, timezone)}</p>
                        <p className="whitespace-pre-wrap break-words text-[#34434c] dark:text-[#c9d3d6]">{comment.kind === 'correction_request' ? <span className="font-medium">Correction requested: </span> : null}{comment.body}</p>
                    </div>
                </li>;
            })}
        </ol> : <p className="mt-1 text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">Ask your coordinator a question about this note.</p>}
        {canPost && <form onSubmit={send} className="mt-3 flex items-center gap-2">
            <label htmlFor="conversation-reply" className="sr-only">Message your coordinator</label>
            <input id="conversation-reply" value={body} onChange={event => setBody(event.target.value)} maxLength={2000} disabled={isLoading}
                placeholder={reviewer ? `Reply to ${firstName(reviewer.authorName)}…` : 'Message your coordinator…'}
                className="h-9 min-w-0 flex-1 rounded-[8px] border border-[#e3e8ea] bg-white px-3 text-[13px] text-[#10141a] outline-none focus-visible:border-[#007679] focus-visible:ring-2 focus-visible:ring-[#007679]/20 dark:border-white/10 dark:bg-[#141b21] dark:text-[#f4f6f7]"/>
            <button type="submit" aria-label="Send message" disabled={isLoading || !body.trim()}
                className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-[8px] bg-[#003839] text-white hover:bg-[#00494a] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#00a3a7] dark:text-[#06292a]">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true"/> : <Send className="h-4 w-4" aria-hidden="true"/>}
            </button>
        </form>}
    </section>;
}

const HISTORY_LABEL: Record<NoteHistoryKind, string> = {
    clocked_out: 'Clocked out', started: 'Note started', submitted: 'Submitted', returned: 'Returned for changes',
    approved: 'Approved', correction_requested: 'Correction requested', sent_for_billing: 'Sent for billing',
};

/** Timeline of what happened to the note. */
export function HistoryCard({events, timezone, loading}: {events: NoteHistoryEvent[]; timezone: string | null; loading?: boolean}) {
    return <section aria-labelledby="history-card" className={cn(NOTE_CARD, 'p-4')}>
        <h2 id="history-card" className="flex items-center gap-2 text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]"><Clock3 className="h-4 w-4 text-[#007679] dark:text-[#5fd0cd]" aria-hidden="true"/>History</h2>
        {loading ? <p className="mt-2 text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">Loading…</p>
            : !events.length ? <p className="mt-2 text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">Nothing recorded yet.</p>
            : <ol className="relative mt-3 flex flex-col gap-3 before:absolute before:bottom-2 before:left-[4px] before:top-2 before:w-px before:bg-[#e3e8ea] dark:before:bg-white/10">
                {events.map((event, index) => <li key={`${event.kind}-${event.at}-${index}`} className="relative flex items-start gap-3 pl-0">
                    <span aria-hidden="true" className={cn('relative mt-1.5 h-[9px] w-[9px] shrink-0 rounded-full',
                        event.kind === 'approved' ? 'bg-[#00494a] dark:bg-[#5fd0cd]' : event.kind === 'submitted' ? 'bg-[#00a3a7]' : event.kind === 'returned' || event.kind === 'correction_requested' ? 'bg-[#5b6f8f]' : 'bg-[#c4cdd1] dark:bg-white/30')}/>
                    <span className="min-w-0">
                        <span className="block text-[13px] text-[#10141a] dark:text-[#f4f6f7]">{HISTORY_LABEL[event.kind] ?? event.kind}</span>
                        <span className="block text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{[event.actorName, when(event.at, timezone)].filter(Boolean).join(' · ')}</span>
                    </span>
                </li>)}
            </ol>}
    </section>;
}

/** "Need to change something?" with the button that opens the correction request. */
export function NeedChangeCard({onRequest, requested}: {onRequest: () => void; requested: boolean}) {
    return <section aria-labelledby="need-change" className="rounded-[14px] bg-[#f4f6f6] p-4 dark:bg-white/5">
        <h2 id="need-change" className="text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">Need to change something?</h2>
        <p className="mt-1 text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">Request a correction and say what&apos;s wrong. Your coordinator can reopen the note; both versions stay in the record for audits.</p>
        {requested ? <p className="mt-2 text-[12px] font-medium text-[#00494a] dark:text-[#7fe0e2]">Correction requested. Your coordinator will get back to you.</p>
            : <button type="button" className={cn(NOTE_SECONDARY, 'mt-3 h-9 text-[13px]')} onClick={onRequest}><PencilLine className="h-4 w-4" aria-hidden="true"/>Request a correction</button>}
    </section>;
}

/** Asks the coordinator to reopen an approved note. */
export function CorrectionDialog({open, onOpenChange, activityLogId}: {open: boolean; onOpenChange: (open: boolean) => void; activityLogId: string}) {
    const [body, setBody] = useState('');
    const [add, {isLoading}] = useAddNoteCommentMutation();
    const send = async (event: FormEvent) => {
        event.preventDefault();
        const text = body.trim();
        if (!text) return;
        try {
            await add({activityLogId, body: text, kind: 'correction_request'}).unwrap();
            toast.success('Correction requested', {description: 'Your coordinator will review it.'});
            setBody('');
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error?.data?.message || "Couldn't send the request. Try again.");
        }
    };
    return <Dialog open={open} onOpenChange={value => { if (!isLoading) onOpenChange(value); }}>
        <DialogContent showCloseButton={false} className="w-[calc(100%-32px)] max-w-[480px] rounded-[16px] p-0">
            <form onSubmit={send}>
                <div className="flex items-start justify-between gap-3 px-6 pb-3 pt-6">
                    <div>
                        <DialogTitle className="text-[18px] font-normal text-[#10141a] dark:text-[#f4f6f7]">Request a correction</DialogTitle>
                        <DialogDescription className="mt-1 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">Say what&apos;s wrong and what it should say. The approved note stays in the record.</DialogDescription>
                    </div>
                    <CloseButton/>
                </div>
                <div className="px-6 pb-5">
                    <label htmlFor="correction-body" className="text-[13px] font-medium text-[#10141a] dark:text-[#f4f6f7]">What needs to change?</label>
                    <textarea id="correction-body" value={body} onChange={event => setBody(event.target.value)} rows={4} maxLength={2000} required
                        className="mt-1.5 block w-full rounded-[10px] border border-[#d8e0e2] bg-white px-3 py-2.5 text-[14px] text-[#10141a] outline-none focus-visible:border-[#007679] focus-visible:ring-2 focus-visible:ring-[#007679]/20 dark:border-white/10 dark:bg-[#141b21] dark:text-[#f4f6f7]"/>
                </div>
                <div className="flex justify-end gap-2 border-t border-[#edf1f2] px-6 py-4 dark:border-white/10">
                    <button type="button" className={NOTE_SECONDARY} disabled={isLoading} onClick={() => onOpenChange(false)}>Cancel</button>
                    <button type="submit" className={NOTE_PRIMARY} disabled={isLoading || !body.trim()}>{isLoading ? 'Sending…' : 'Send request'}</button>
                </div>
            </form>
        </DialogContent>
    </Dialog>;
}
