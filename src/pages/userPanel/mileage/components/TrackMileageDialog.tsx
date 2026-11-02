import {useEffect, useId, useMemo, useState} from 'react';
import {CalendarDays, Timer} from 'lucide-react';
import {Dialog, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog';
import {Switch} from '@/components/ui/switch';
import {VoiceRecordingProvider} from '@/contexts/VoiceRecordingContext';
import VoiceInputButton from '@/components/VoiceInputButton';
import VoiceEnabledTextarea from '@/components/VoiceEnabledTextarea';
import {mileageApi} from '@/lib/api/mileage';
import {useToast} from '@/hooks/use-toast';
import {cn} from '@/lib/utils';
import {shortClientId} from '@/pages/userPanel/dashboard/components/UpcomingTasks';
import {inputValues, nextQuarterHour} from '../rides';
import {CloseButton, GpsNote, PRIMARY_BUTTON} from './RideDialogs';

const NOTES_MAX = 1000;
type TripType = 'agency' | 'client';

/** What to fill the form with, e.g. when logging a past ride again. */
export interface TripDraft {
    type: TripType;
    purpose?: string;
    clientId?: string | null;
    notes?: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: () => void;
    /** Clients from the caregiver's own shifts, by id. Shown as short ids only. */
    clientIds: string[];
    draft?: TripDraft | null;
}

const FIELD = 'h-11 w-full rounded-[8px] border border-[#e3e8ea] bg-white px-3 text-[14px] text-[#10141a] outline-none placeholder:text-[#8a979d] focus-visible:border-[#007679] focus-visible:ring-2 focus-visible:ring-[#007679]/20 disabled:cursor-not-allowed disabled:bg-[#f3f5f6] disabled:text-[#8a979d] dark:border-white/10 dark:bg-[#141b21] dark:text-[#f4f6f7] dark:disabled:bg-white/5';
const LABEL = 'text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]';
// Hide the browser's own date/time icon; ours opens the picker instead.
const PICKER = '[&::-webkit-calendar-picker-indicator]:hidden pr-10';

function openPicker(input: HTMLInputElement | null) {
    try { input?.showPicker?.(); } catch { /* not supported, typing still works */ }
}

/** "Track New Mileage": set up a trip to start later from the ride card. */
export default function TrackMileageDialog({open, onOpenChange, onCreated, clientIds, draft}: Props) {
    const {toast} = useToast();
    const id = useId();
    const [type, setType] = useState<TripType>('agency');
    const [purpose, setPurpose] = useState('');
    const [clientId, setClientId] = useState('');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [useNow, setUseNow] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Fresh form each time it opens, filled from the draft when there is one.
    useEffect(() => {
        if (!open) return;
        const start = inputValues(nextQuarterHour(new Date()));
        setType(draft?.type ?? 'agency');
        setPurpose(draft?.purpose ?? '');
        setClientId(draft?.clientId && clientIds.includes(draft.clientId) ? draft.clientId : '');
        setNotes(draft?.notes ?? '');
        setDate(start.date);
        setTime(start.time);
        setUseNow(false);
    }, [open, draft, clientIds]);

    const clientOptions = useMemo(() => clientIds.map(value => ({value, label: `Client ${shortClientId(value)}`})), [clientIds]);
    const when = useNow ? null : date && time ? new Date(`${date}T${time}`) : null;
    const missing = type === 'agency' ? !purpose.trim() : !clientId;
    const badTime = !useNow && (!when || Number.isNaN(when.getTime()));

    const submit = async () => {
        if (missing || badTime || submitting) return;
        setSubmitting(true);
        try {
            await mileageApi.createManual({
                ...(type === 'client' ? {clientId} : {}),
                ...(purpose.trim() ? {purpose: purpose.trim()} : {}),
                ...(notes.trim() ? {notes: notes.trim()} : {}),
                scheduledStartTime: (when ?? new Date()).toISOString(),
            });
            toast({title: 'Trip set up', description: 'Tap Start on the ride when you set off.'});
            onCreated();
            onOpenChange(false);
        } catch (error) {
            toast({title: "Couldn't set up the trip", variant: 'destructive', description: error instanceof Error ? error.message : 'Please try again.'});
        } finally {
            setSubmitting(false);
        }
    };

    return <Dialog open={open} onOpenChange={value => { if (!submitting) onOpenChange(value); }}>
        <DialogContent showCloseButton={false} overlayClassName="bg-[#10141a]/30"
            className="flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[420px] flex-col gap-0 overflow-hidden rounded-[16px] border-0 p-0 sm:left-auto sm:right-6 sm:top-6 sm:translate-x-0 sm:translate-y-0 dark:bg-[#1b232b]">
            <VoiceRecordingProvider pageTitle="Track new mileage">
                <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-5">
                    <div>
                        <DialogTitle className="text-[18px] font-bold text-[#10141a] dark:text-[#f4f6f7]">Track New Mileage</DialogTitle>
                        <DialogDescription className="mt-0.5 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">Log a trip you need to make</DialogDescription>
                    </div>
                    <CloseButton/>
                </div>

                <form className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5" onSubmit={event => { event.preventDefault(); submit(); }}>
                    <div role="radiogroup" aria-label="Trip for" className="grid grid-cols-2 gap-1 rounded-[8px] bg-[#f3f5f6] p-1 dark:bg-white/5">
                        {(['agency', 'client'] as TripType[]).map(option => <button key={option} type="button" role="radio" aria-checked={type === option}
                            onClick={() => setType(option)}
                            className={cn('h-9 cursor-pointer rounded-[6px] text-[14px] font-medium transition-colors',
                                type === option ? 'bg-white text-[#10141a] shadow-[0_1px_2px_rgba(16,40,44,0.08)] dark:bg-[#2a343c] dark:text-[#f4f6f7]' : 'text-[#5d6b73] hover:text-[#10141a] dark:text-[#9aa4a8] dark:hover:text-[#f4f6f7]')}>
                            {option === 'agency' ? 'Agency' : 'Client'}
                        </button>)}
                    </div>

                    {type === 'client' && <div className="flex flex-col gap-2">
                        <label htmlFor={`${id}-client`} className={LABEL}>Client</label>
                        <select id={`${id}-client`} value={clientId} onChange={event => setClientId(event.target.value)} className={cn(FIELD, !clientId && 'text-[#8a979d]')}>
                            <option value="">{clientOptions.length ? 'Choose a client' : 'No clients on your schedule'}</option>
                            {clientOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </div>}

                    <div className="flex flex-col gap-2">
                        <label htmlFor={`${id}-purpose`} className={LABEL}>Purpose{type === 'client' && <span className="font-normal text-[#8a979d]"> (optional)</span>}</label>
                        <input id={`${id}-purpose`} value={purpose} onChange={event => setPurpose(event.target.value)} maxLength={200}
                            placeholder={type === 'agency' ? 'eg. Pick up supplies from the store' : 'eg. Drive client to appointment'} autoComplete="off" className={FIELD}/>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor={`${id}-notes`} className={LABEL}>Additional notes</label>
                        <VoiceEnabledTextarea id={`${id}-notes`} value={notes} onChange={value => setNotes(value.slice(0, NOTES_MAX))}
                            onVoiceAccepted={text => setNotes(previous => (previous.trim() ? `${previous.trim()} ${text.trim()}` : text.trim()).slice(0, NOTES_MAX))}
                            placeholder="Add additional details" rows={4} fieldName="Mileage notes" pageTitle="Track new mileage" disabled={submitting}
                            className="min-h-[96px] resize-none rounded-[8px] border border-[#e3e8ea] bg-white px-3 py-2.5 text-[14px] text-[#10141a] shadow-none placeholder:text-[#8a979d] focus-visible:border-[#007679] dark:border-white/10 dark:bg-[#141b21] dark:text-[#f4f6f7]"/>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-2">
                            <label htmlFor={`${id}-date`} className={LABEL}>Log date</label>
                            <div className="relative">
                                <input id={`${id}-date`} type="date" value={date} onChange={event => setDate(event.target.value)} disabled={useNow}
                                    onClick={event => openPicker(event.currentTarget)} className={cn(FIELD, PICKER)}/>
                                <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5d6b73]" aria-hidden="true"/>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label htmlFor={`${id}-time`} className={LABEL}>Log time</label>
                            <div className="relative">
                                <input id={`${id}-time`} type="time" value={time} onChange={event => setTime(event.target.value)} disabled={useNow}
                                    onClick={event => openPicker(event.currentTarget)} className={cn(FIELD, PICKER)}/>
                                <Timer className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5d6b73]" aria-hidden="true"/>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <label htmlFor={`${id}-now`} className={LABEL}>Use current date and time</label>
                        <Switch id={`${id}-now`} checked={useNow} onCheckedChange={setUseNow}/>
                    </div>

                    <GpsNote>GPS tracking starts when you tap Start on the created entry.</GpsNote>

                    <button type="submit" disabled={missing || badTime || submitting} className={PRIMARY_BUTTON}>
                        {submitting ? 'Setting up…' : 'Set up trip'}
                    </button>
                </form>
                <VoiceInputButton className="z-[60]"/>
            </VoiceRecordingProvider>
        </DialogContent>
    </Dialog>;
}
