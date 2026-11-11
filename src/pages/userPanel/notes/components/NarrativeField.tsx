import {useEffect, useId, useRef, useState} from 'react';
import {AlertTriangle, Mic, Sparkles} from 'lucide-react';
import {cn} from '@/lib/utils';
import {useVoiceRecording, useVoiceSessionActions} from '@/contexts/VoiceRecordingContext';

const CHIP = 'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#e3e8ea] bg-white px-3 text-[13px] font-medium text-[#10141a] transition-colors hover:bg-[#f3f5f6] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5';

/**
 * Free-text narrative with a character count, dictation and a suggested draft.
 * Dictation and drafts only ever fill the field for the caregiver to check;
 * nothing is saved without them seeing it.
 */
export default function NarrativeField({id, label, hint, value, onChange, placeholder, max = 2000, disabled, error, draftLabel, onDraft, voiceName, pageTitle, rows = 5}: {
    id: string;
    label: string;
    hint?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    max?: number;
    disabled?: boolean;
    error?: string | null;
    draftLabel?: string;
    /** Builds a suggested draft from what's already filled in; null when there's nothing to go on. */
    onDraft?: () => string | null;
    voiceName: string;
    pageTitle: string;
    rows?: number;
}) {
    const hintId = useId();
    const countId = useId();
    const textarea = useRef<HTMLTextAreaElement>(null);
    const [suggestion, setSuggestion] = useState<string | null>(null);
    const {startRecording, registerActiveTarget, isRecording, isActiveField} = useVoiceRecording();
    const {acceptSession, cancelSession, recordingUi} = useVoiceSessionActions();
    const listening = isActiveField(voiceName) && isRecording;
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        if (!listening) { setSeconds(0); return; }
        const started = Date.now();
        const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
        return () => clearInterval(timer);
    }, [listening]);

    const dictate = () => {
        if (isRecording) return;
        registerActiveTarget({fieldKey: voiceName, ref: textarea, baseline: value, setValue: onChange});
        startRecording(voiceName, pageTitle, undefined, transcript => onChange(transcript.slice(0, max)));
    };

    const draft = () => setSuggestion(onDraft?.() ?? null);
    const insert = () => {
        if (!suggestion) return;
        onChange((value.trim() ? `${value.trim()}\n\n${suggestion}` : suggestion).slice(0, max));
        setSuggestion(null);
        textarea.current?.focus();
    };

    const length = value.length;
    const near = length > max * 0.9;
    return <div id={id} className="scroll-mt-24">
        <label htmlFor={`${id}-input`} className="block text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{label}</label>
        {hint ? <p id={hintId} className="mt-0.5 text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{hint}</p> : null}
        <div className={cn('mt-2 rounded-[10px] border bg-white transition-colors focus-within:ring-2 dark:bg-[#141b21]',
            listening ? 'border-[#e5484d] ring-2 ring-[#e5484d]/20' : error ? 'border-[#e5484d] focus-within:ring-[#e5484d]/20' : 'border-[#d8e0e2] focus-within:border-[#007679] focus-within:ring-[#007679]/20 dark:border-white/10')}>
            {listening && <div role="status" className="flex items-center justify-between gap-3 border-b border-[#f3c4c2] px-3 py-2 text-[13px] text-[#b3261e] dark:border-[#e5484d]/30 dark:text-[#f3a08c]">
                <span className="inline-flex items-center gap-2 font-medium">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#e5484d] motion-reduce:animate-none" aria-hidden="true"/>
                    {recordingUi.isConnecting ? 'Connecting…' : recordingUi.isTranslating ? 'Finishing…' : `Listening · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`}
                </span>
                <span className="flex gap-1.5">
                    <button type="button" className="cursor-pointer rounded-[6px] px-2 py-0.5 text-[#34434c] hover:bg-black/5 dark:text-[#c9d3d6]" onClick={cancelSession}>Cancel</button>
                    <button type="button" className="cursor-pointer rounded-[6px] bg-[#e5484d] px-2.5 py-0.5 font-medium text-white hover:bg-[#cf3b40]" onClick={acceptSession}>Stop</button>
                </span>
            </div>}
            <textarea ref={textarea} id={`${id}-input`} value={value} rows={rows} disabled={disabled} placeholder={placeholder} maxLength={max}
                aria-describedby={[hint ? hintId : '', countId, error ? `${id}-error` : ''].filter(Boolean).join(' ')} aria-invalid={error ? true : undefined}
                onChange={event => onChange(event.target.value)}
                className="block w-full resize-y rounded-[10px] bg-transparent px-3 py-2.5 text-[14px] leading-relaxed text-[#10141a] outline-none placeholder:text-[#8a979d] disabled:cursor-not-allowed disabled:opacity-70 dark:text-[#f4f6f7]"/>
        </div>
        {suggestion !== null && <div role="region" aria-label="Suggested draft" className="mt-2 rounded-[10px] border border-dashed border-[#5fb8b9] bg-[#f0f8f8] p-3 dark:border-[#5fd0cd]/50 dark:bg-[#00a3a7]/10">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-[#00494a] dark:text-[#7fe0e2]"><Sparkles className="h-3.5 w-3.5" aria-hidden="true"/>Suggested draft. Check every detail before you use it.</p>
            <p className="mt-1.5 whitespace-pre-wrap text-[13px] text-[#10141a] dark:text-[#f4f6f7]">{suggestion || 'Fill in more of the note first, then try again.'}</p>
            <div className="mt-2 flex gap-2">
                {suggestion ? <button type="button" className="h-8 cursor-pointer rounded-[8px] bg-[#003839] px-3 text-[13px] font-semibold text-white hover:bg-[#00494a] dark:bg-[#00a3a7] dark:text-[#06292a]" onClick={insert}>Insert</button> : null}
                <button type="button" className={CHIP} onClick={() => setSuggestion(null)}>Discard</button>
            </div>
        </div>}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
                <button type="button" className={CHIP} onClick={dictate} disabled={disabled || isRecording}><Mic className="h-3.5 w-3.5" aria-hidden="true"/>Dictate</button>
                {onDraft ? <button type="button" className={cn(CHIP, 'text-[#00494a] dark:text-[#5fd0cd]')} onClick={draft} disabled={disabled}>
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true"/>{draftLabel ?? 'Suggest a draft'}
                </button> : null}
            </div>
            <span id={countId} className={cn('text-[12px] tabular-nums', near ? 'text-[#7a5200] dark:text-[#f7c46b]' : 'text-[#5d6b73] dark:text-[#9aa4a8]')}>
                {length.toLocaleString('en-US')} / {max.toLocaleString('en-US')} characters
            </span>
        </div>
        {error ? <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#b3261e] dark:text-[#f3a08c]"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true"/>{error}</p> : null}
    </div>;
}
