export type Tone = 'neutral' | 'amber' | 'green' | 'red' | 'blue';
import {getNoteTitle} from './noteTypes';

/** Where a shift's note stands, as the notes list endpoint reports it. */
export type NoteState = 'to_fill' | 'draft' | 'returned' | 'submitted' | 'approved' | 'needs_review';

/** One worked shift that needs a note (GET /employees/my-notes). Never carries client names. */
export interface MyNoteItem {
    shiftId: string;
    activityLogId: string | null;
    noteType: string;
    program: 'ddd' | 'hha';
    clientId: string | null;
    serviceCode: string | null;
    serviceDate: string;
    startTime: string | null;
    endTime: string | null;
    clockedInAt: string | null;
    clockedOutAt: string | null;
    endAt: string;
    dueAt: string;
    state: NoteState;
    draftSavedAt: string | null;
    returnedAt: string | null;
    submittedAt: string | null;
    approvedAt: string | null;
}

export interface MyNotesResponse {
    items: MyNoteItem[];
    startDate: string;
    endDate: string;
    timezone: string | null;
    truncated: boolean;
}

export type NoteStatus = 'due' | 'overdue' | 'draft' | 'returned' | 'submitted' | 'approved' | 'review';
export type NotesTab = 'all' | 'to_fill' | 'drafts' | 'returned' | 'submitted';

export const NOTES_TABS: {id: NotesTab; label: string}[] = [
    {id: 'all', label: 'All'},
    {id: 'to_fill', label: 'To fill in'},
    {id: 'drafts', label: 'Drafts'},
    {id: 'returned', label: 'Returned'},
    {id: 'submitted', label: 'Submitted'},
];

export const STATUS_LABEL: Record<NoteStatus, {label: string; tone: Tone}> = {
    due: {label: 'Due', tone: 'amber'},
    overdue: {label: 'Overdue', tone: 'red'},
    draft: {label: 'Draft', tone: 'neutral'},
    returned: {label: 'Returned', tone: 'blue'},
    submitted: {label: 'Submitted', tone: 'blue'},
    approved: {label: 'Approved', tone: 'green'},
    review: {label: 'Agency checking', tone: 'neutral'},
};

/** Friendlier names for the list; the full form title stays on the note page. */
const LIST_LABELS: Record<string, string> = {
    'hha-personal-care': 'Personal care service note',
    'hha-service-log': 'HHA service activity log',
    'community-based': 'Community based activities log',
    'community-inclusion': 'Community inclusion log',
    'day-habilitation': 'Day habilitation log',
    'prevocational-training': 'Prevocational training log',
    'supported-employment-intervention': 'Supported employment log',
    'supported-employment-pre': 'Pre-employment service log',
    'respite-log': 'Respite log',
    'career-planning': 'Career planning note',
};

export const noteListLabel = (noteType: string) => LIST_LABELS[noteType] ?? getNoteTitle(noteType);

/** "Client 4F2A9C": field staff only ever see the short client id. */
export const clientLabel = (clientId: string | null) => clientId ? clientId.slice(0, 6).toUpperCase() : 'Client';

const late = (item: MyNoteItem, now: Date) => Date.parse(item.dueAt) < now.getTime();

export function noteStatus(item: MyNoteItem, now: Date = new Date()): NoteStatus {
    switch (item.state) {
        case 'to_fill': return late(item, now) ? 'overdue' : 'due';
        case 'draft': return late(item, now) ? 'overdue' : 'draft';
        case 'returned': return 'returned';
        case 'submitted': return 'submitted';
        case 'approved': return 'approved';
        default: return 'review';
    }
}

export function noteTab(item: MyNoteItem): Exclude<NotesTab, 'all'> | null {
    if (item.state === 'to_fill') return 'to_fill';
    if (item.state === 'draft') return 'drafts';
    if (item.state === 'returned') return 'returned';
    if (item.state === 'submitted' || item.state === 'approved') return 'submitted';
    return null;
}

/** Whether the employee still has work to do on this note. */
export const needsWork = (item: MyNoteItem) => ['to_fill', 'draft', 'returned'].includes(item.state);

function parts(iso: string, timezone?: string | null) {
    const options: Intl.DateTimeFormatOptions = {hour: '2-digit', minute: '2-digit', hourCycle: 'h23', day: 'numeric', month: 'short'};
    try {
        return new Intl.DateTimeFormat('en-GB', {...options, timeZone: timezone || undefined}).formatToParts(new Date(iso));
    } catch {
        return new Intl.DateTimeFormat('en-GB', options).formatToParts(new Date(iso));
    }
}

/** "10:00, 10 Nov" in the agency's time zone. */
export function timeAndDay(iso: string | null, timezone?: string | null) {
    if (!iso || Number.isNaN(Date.parse(iso))) return '';
    const value = (type: string) => parts(iso, timezone).find(part => part.type === type)?.value ?? '';
    return `${value('hour')}:${value('minute')}, ${value('day')} ${value('month')}`;
}

/** The time only, "06:00", in the agency's time zone. */
export function clockTime(iso: string | null, timezone?: string | null) {
    return timeAndDay(iso, timezone).split(',')[0] ?? '';
}

/** Short zone name for the times we show, e.g. "GMT" or "EST". */
export function zoneName(timezone?: string | null, at: Date = new Date()) {
    try {
        return new Intl.DateTimeFormat('en-US', {timeZone: timezone || undefined, timeZoneName: 'short'}).formatToParts(at)
            .find(part => part.type === 'timeZoneName')?.value ?? '';
    } catch {
        return '';
    }
}

/** "Mon 9 Nov" for a YYYY-MM-DD service date. */
export function serviceDay(date: string) {
    const parsed = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString('en-GB', {weekday: 'short', day: 'numeric', month: 'short'}).replace(',', '');
}

/** "06:00–10:00": the clocked times when we have them, else the scheduled ones. */
export function shiftTimes(item: MyNoteItem, timezone?: string | null) {
    const start = item.clockedInAt ? clockTime(item.clockedInAt, timezone) : item.startTime ?? '';
    const end = item.clockedOutAt ? clockTime(item.clockedOutAt, timezone) : item.endTime ?? '';
    return start && end ? `${start}–${end}` : start || end;
}

/** The Due column: "By 10:00, 10 Nov", "Was due 18:00, 8 Nov", "Fix by …", "Approved …". */
export function dueText(item: MyNoteItem, now: Date = new Date(), timezone?: string | null): {text: string; urgent: boolean} {
    const due = timeAndDay(item.dueAt, timezone);
    switch (item.state) {
        case 'to_fill':
        case 'draft':
            return late(item, now) ? {text: `Was due ${due}`, urgent: true} : {text: `By ${due}`, urgent: false};
        case 'returned':
            return late(item, now) ? {text: `Fix was due ${due}`, urgent: true} : {text: `Fix by ${due}`, urgent: false};
        case 'submitted':
            return {text: item.submittedAt ? `Sent ${timeAndDay(item.submittedAt, timezone)}` : 'Sent', urgent: false};
        case 'approved':
            return {text: item.approvedAt ? `Approved ${timeAndDay(item.approvedAt, timezone)}` : 'Approved', urgent: false};
        default:
            return {text: 'Your agency is checking it', urgent: false};
    }
}

export const ACTION_LABEL: Record<NoteStatus, string> = {
    due: 'Fill now', overdue: 'Fill now', draft: 'Continue', returned: 'Review', submitted: 'View', approved: 'View', review: 'View',
};

const sameDay = (a: Date, b: Date, timezone?: string | null) => {
    const key = (date: Date) => {
        try { return date.toLocaleDateString('en-CA', {timeZone: timezone || undefined}); } catch { return date.toLocaleDateString('en-CA'); }
    };
    return key(a) === key(b);
};

/** The four overview cards. "This week" starts on Monday. */
export function notesOverview(items: MyNoteItem[], now: Date = new Date(), timezone?: string | null) {
    const toFill = items.filter(item => item.state === 'to_fill' || (item.state === 'draft' && late(item, now)));
    const overdue = toFill.filter(item => late(item, now)).length;
    const dueToday = toFill.filter(item => !late(item, now) && sameDay(new Date(item.dueAt), now, timezone)).length;
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const sentThisWeek = items.filter(item => ['submitted', 'approved'].includes(item.state) && item.submittedAt && Date.parse(item.submittedAt) >= weekStart.getTime());
    const onTime = sentThisWeek.filter(item => Date.parse(item.submittedAt!) <= Date.parse(item.dueAt)).length;
    return {
        toFill: items.filter(item => item.state === 'to_fill').length,
        overdue,
        dueToday,
        drafts: items.filter(item => item.state === 'draft').length,
        returned: items.filter(item => item.state === 'returned').length,
        submittedThisWeek: sentThisWeek.length,
        onTime,
    };
}

/** Matches the search box against the client id, note type and service code. */
export function matchesSearch(item: MyNoteItem, search: string) {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [clientLabel(item.clientId), noteListLabel(item.noteType), item.serviceCode ?? '', serviceDay(item.serviceDate)]
        .some(value => value.toLowerCase().includes(query));
}

export type NotesSort = 'shift' | 'due' | 'status';
const STATUS_ORDER: NoteStatus[] = ['overdue', 'returned', 'due', 'draft', 'review', 'submitted', 'approved'];

export function sortNotes(items: MyNoteItem[], sort: NotesSort, now: Date = new Date()) {
    const copy = [...items];
    if (sort === 'due') return copy.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    if (sort === 'status') return copy.sort((a, b) => STATUS_ORDER.indexOf(noteStatus(a, now)) - STATUS_ORDER.indexOf(noteStatus(b, now)) || b.endAt.localeCompare(a.endAt));
    return copy.sort((a, b) => b.endAt.localeCompare(a.endAt));
}

const csvCell = (value: string) => {
    // Neutralise spreadsheet formulas and quote every cell.
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
};

/** CSV of the notes list as shown (short client ids only). */
export function notesCsv(items: MyNoteItem[], now: Date = new Date(), timezone?: string | null) {
    const header = ['Client', 'Note type', 'Service', 'Shift date', 'Shift time', 'Due', 'Status'];
    const rows = items.map(item => [
        clientLabel(item.clientId), noteListLabel(item.noteType), item.serviceCode ?? '', item.serviceDate,
        shiftTimes(item, timezone), dueText(item, now, timezone).text, STATUS_LABEL[noteStatus(item, now)].label,
    ]);
    return [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
}
