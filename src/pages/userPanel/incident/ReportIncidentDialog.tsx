import {useEffect, useId, useMemo, useState, type KeyboardEvent} from 'react';
import {CalendarDays, Timer, X} from 'lucide-react';
import {VoiceRecordingProvider} from '@/contexts/VoiceRecordingContext';
import VoiceInputButton from '@/components/VoiceInputButton';
import VoiceEnabledTextarea from '@/components/VoiceEnabledTextarea';
import {submitUserIncident} from '@/lib/api/incidents';
import {useToast} from '@/hooks/use-toast';
import {cn} from '@/lib/utils';
import {shortClientId} from '@/pages/userPanel/dashboard/components/UpcomingTasks';
import {CharCount, FIELD, LABEL, PANEL_BODY, PICKER, PRIMARY_BUTTON, SidePanel, TEXTAREA, openPicker} from '../records/RecordsKit';
import {joinWitnesses} from './incidentRecords';

const TEXT_MAX = 500;

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmitted: () => void;
    /** Clients from the caregiver's own shifts, by id. Shown as short ids only. */
    clientIds: string[];
}

const pad = (value: number) => String(value).padStart(2, '0');
const nowValues = () => {
    const now = new Date();
    return {date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`, time: `${pad(now.getHours())}:${pad(now.getMinutes())}`};
};

/** "Report an incident": what happened, what you did and who saw it. */
export default function ReportIncidentDialog({open, onOpenChange, onSubmitted, clientIds}: Props) {
    const {toast} = useToast();
    const id = useId();
    const [clientId, setClientId] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [whatHappened, setWhatHappened] = useState('');
    const [whatYouDid, setWhatYouDid] = useState('');
    const [witnessDraft, setWitnessDraft] = useState('');
    const [witnesses, setWitnesses] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Fresh form each time it opens; the time defaults to now.
    useEffect(() => {
        if (!open) return;
        const now = nowValues();
        setClientId(clientIds.length === 1 ? clientIds[0] : '');
        setDate(now.date);
        setTime(now.time);
        setWhatHappened('');
        setWhatYouDid('');
        setWitnessDraft('');
        setWitnesses([]);
    }, [open, clientIds]);

    const clientOptions = useMemo(() => clientIds.map(value => ({value, label: shortClientId(value) ?? value})), [clientIds]);

    const addWitness = () => {
        const name = witnessDraft.replace(/,/g, ' ').trim();
        if (name && !witnesses.some(item => item.toLowerCase() === name.toLowerCase())) setWitnesses(previous => [...previous, name]);
        setWitnessDraft('');
    };
    const onWitnessKey = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            addWitness();
        } else if (event.key === 'Backspace' && !witnessDraft && witnesses.length) {
            setWitnesses(previous => previous.slice(0, -1));
        }
    };

    const ready = clientId && date && time && whatHappened.trim() && whatYouDid.trim();

    const submit = async () => {
        if (!ready || submitting) return;
        setSubmitting(true);
        // A name typed but not yet added still counts as a witness.
        const names = witnessDraft.trim() ? [...witnesses, witnessDraft.replace(/,/g, ' ').trim()] : witnesses;
        try {
            await submitUserIncident({
                clientId,
                date,
                time,
                whatHappened: whatHappened.trim(),
                whatDidYouDo: whatYouDid.trim(),
                witness: {name: joinWitnesses(names), contactInfo: '', relationship: ''},
            });
            onSubmitted();
        } catch (error) {
            const message = (error as {response?: {data?: {message?: string}}})?.response?.data?.message
                ?? (error instanceof Error ? error.message : null) ?? 'Please try again.';
            toast({title: "Couldn't submit the report", variant: 'destructive', description: message});
        } finally {
            setSubmitting(false);
        }
    };

    return <SidePanel open={open} onOpenChange={onOpenChange} busy={submitting} title="Report an incident"
        description="Provide accurate details so your agency can review and take the necessary action."
        footer={<button type="submit" form={`${id}-form`} disabled={!ready || submitting} className={PRIMARY_BUTTON}>
            {submitting ? 'Submitting…' : 'Submit incident'}
        </button>}>
        <VoiceRecordingProvider pageTitle="Report an incident">
            <form id={`${id}-form`} className={PANEL_BODY} onSubmit={event => { event.preventDefault(); submit(); }}>
                <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-client`} className={LABEL}>Client</label>
                    <select id={`${id}-client`} value={clientId} onChange={event => setClientId(event.target.value)} className={cn(FIELD, !clientId && 'text-[#8a979d]')}>
                        <option value="">{clientOptions.length ? 'Choose a client' : 'No clients on your schedule'}</option>
                        {clientOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                        <label htmlFor={`${id}-date`} className={LABEL}>Date</label>
                        <div className="relative">
                            <input id={`${id}-date`} type="date" value={date} max={nowValues().date} onChange={event => setDate(event.target.value)}
                                onClick={event => openPicker(event.currentTarget)} className={cn(FIELD, PICKER)}/>
                            <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5d6b73]" aria-hidden="true"/>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label htmlFor={`${id}-time`} className={LABEL}>Time</label>
                        <div className="relative">
                            <input id={`${id}-time`} type="time" value={time} onChange={event => setTime(event.target.value)}
                                onClick={event => openPicker(event.currentTarget)} className={cn(FIELD, PICKER)}/>
                            <Timer className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5d6b73]" aria-hidden="true"/>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-happened`} className={LABEL}>What happened</label>
                    <div className="relative">
                        <VoiceEnabledTextarea id={`${id}-happened`} value={whatHappened} onChange={value => setWhatHappened(value.slice(0, TEXT_MAX))}
                            onVoiceAccepted={text => setWhatHappened(previous => (previous.trim() ? `${previous.trim()} ${text.trim()}` : text.trim()).slice(0, TEXT_MAX))}
                            placeholder="Briefly explain what happened" rows={4} fieldName="What happened" pageTitle="Report an incident"
                            disabled={submitting} className={cn(TEXTAREA, 'pb-7')}/>
                        <CharCount value={whatHappened} max={TEXT_MAX}/>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-did`} className={LABEL}>What did you do?</label>
                    <div className="relative">
                        <VoiceEnabledTextarea id={`${id}-did`} value={whatYouDid} onChange={value => setWhatYouDid(value.slice(0, TEXT_MAX))}
                            onVoiceAccepted={text => setWhatYouDid(previous => (previous.trim() ? `${previous.trim()} ${text.trim()}` : text.trim()).slice(0, TEXT_MAX))}
                            placeholder="What actions were taken to solve this, if any" rows={4} fieldName="What did you do" pageTitle="Report an incident"
                            disabled={submitting} className={cn(TEXTAREA, 'pb-7')}/>
                        <CharCount value={whatYouDid} max={TEXT_MAX}/>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-witness`} className={LABEL}>Any witness?</label>
                    <input id={`${id}-witness`} value={witnessDraft} onChange={event => setWitnessDraft(event.target.value)} onKeyDown={onWitnessKey} onBlur={addWitness}
                        maxLength={80} placeholder="Write witness name, then press Enter" autoComplete="off" className={FIELD}/>
                    {witnesses.length > 0 && <ul className="flex flex-wrap gap-2" aria-label="Witnesses">
                        {witnesses.map(name => <li key={name} className="flex items-center gap-1.5 rounded-[6px] bg-[#f3f5f6] py-1 pl-2.5 pr-1 text-[13px] text-[#10141a] dark:bg-white/10 dark:text-[#f4f6f7]">
                            {name}
                            <button type="button" onClick={() => setWitnesses(previous => previous.filter(item => item !== name))} aria-label={`Remove ${name}`}
                                className="grid h-5 w-5 cursor-pointer place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                                <X className="h-3.5 w-3.5"/>
                            </button>
                        </li>)}
                    </ul>}
                </div>
            </form>
            <VoiceInputButton className="z-[60]"/>
        </VoiceRecordingProvider>
    </SidePanel>;
}
