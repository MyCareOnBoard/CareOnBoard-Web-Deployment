import {useEffect, useId, useRef, useState, type DragEvent} from 'react';
import {CalendarDays, FileText, UploadCloud, X} from 'lucide-react';
import {VoiceRecordingProvider} from '@/contexts/VoiceRecordingContext';
import VoiceInputButton from '@/components/VoiceInputButton';
import VoiceEnabledTextarea from '@/components/VoiceEnabledTextarea';
import {submitExpense, uploadExpenseReceipt} from '@/lib/api/expenses';
import {useToast} from '@/hooks/use-toast';
import {cn} from '@/lib/utils';
import {CharCount, FIELD, Hint, LABEL, PANEL_BODY, PICKER, PRIMARY_BUTTON, SidePanel, TEXTAREA, openPicker} from '../records/RecordsKit';
import {EXPENSE_CATEGORIES, OTHER_CATEGORY, dateKey} from './expenseRecords';

const DESCRIPTION_MAX = 500;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmitted: () => void;
}

/** "Add expense": record a work expense with its receipt for the agency to review. */
export default function AddExpenseDialog({open, onOpenChange, onSubmitted}: Props) {
    const {toast} = useToast();
    const id = useId();
    const fileInput = useRef<HTMLInputElement>(null);
    const [category, setCategory] = useState('');
    const [otherCategory, setOtherCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Fresh form each time it opens.
    useEffect(() => {
        if (!open) return;
        setCategory('');
        setOtherCategory('');
        setAmount('');
        setDate(dateKey(new Date()));
        setDescription('');
        setFile(null);
        setFileError(null);
    }, [open]);

    const pickFile = (picked: File | undefined) => {
        if (!picked) return;
        if (!RECEIPT_TYPES.includes(picked.type)) {
            setFileError('Upload a photo (JPG, PNG, GIF, WebP) or a PDF.');
            return;
        }
        if (picked.size > MAX_FILE_BYTES) {
            setFileError('That file is over 10 MB. Try a smaller photo or PDF.');
            return;
        }
        setFileError(null);
        setFile(picked);
    };

    const onDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragging(false);
        pickFile(event.dataTransfer.files?.[0]);
    };

    const chosenCategory = category === OTHER_CATEGORY ? otherCategory.trim() : category;
    const amountValue = Number(amount);
    const ready = chosenCategory && amount && Number.isFinite(amountValue) && amountValue > 0 && date && description.trim() && file;

    const submit = async () => {
        if (!ready || !file || submitting) return;
        setSubmitting(true);
        try {
            const receiptUrl = await uploadExpenseReceipt(file);
            await submitExpense({
                receiptUrl,
                message: description.trim(),
                amount: Math.round(amountValue * 100) / 100,
                category: chosenCategory,
                date,
            });
            toast({title: 'Expense submitted', description: 'Your agency will review it.'});
            onSubmitted();
            onOpenChange(false);
        } catch (error) {
            const message = (error as {response?: {data?: {message?: string}}})?.response?.data?.message
                ?? (error instanceof Error ? error.message : null) ?? 'Please try again.';
            toast({title: "Couldn't submit the expense", variant: 'destructive', description: message});
        } finally {
            setSubmitting(false);
        }
    };

    return <SidePanel open={open} onOpenChange={onOpenChange} busy={submitting} title="Add expense"
        description="Record a work-related expense and submit it to your agency for review and reimbursement"
        footer={<button type="submit" form={`${id}-form`} disabled={!ready || submitting} className={PRIMARY_BUTTON}>
            {submitting ? 'Submitting…' : 'Submit expense'}
        </button>}>
        <VoiceRecordingProvider pageTitle="Add expense">
            <form id={`${id}-form`} className={PANEL_BODY} onSubmit={event => { event.preventDefault(); submit(); }}>
                <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-category`} className={LABEL}>Category</label>
                    <select id={`${id}-category`} value={category} onChange={event => setCategory(event.target.value)} className={cn(FIELD, !category && 'text-[#8a979d]')}>
                        <option value="">-- Select category --</option>
                        {EXPENSE_CATEGORIES.map(option => <option key={option} value={option}>{option}</option>)}
                        <option value={OTHER_CATEGORY}>Other</option>
                    </select>
                    {category === OTHER_CATEGORY && <input aria-label="Other category" value={otherCategory} onChange={event => setOtherCategory(event.target.value)}
                        maxLength={60} placeholder="Type the category" autoComplete="off" className={FIELD}/>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                        <label htmlFor={`${id}-amount`} className={LABEL}>Amount</label>
                        <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#5d6b73]" aria-hidden="true">$</span>
                            <input id={`${id}-amount`} type="number" inputMode="decimal" min="0.01" step="0.01" value={amount}
                                onChange={event => setAmount(event.target.value)} placeholder="0.00" className={cn(FIELD, 'pl-7')}/>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label htmlFor={`${id}-date`} className={LABEL}>Date</label>
                        <div className="relative">
                            <input id={`${id}-date`} type="date" value={date} max={dateKey(new Date())} onChange={event => setDate(event.target.value)}
                                onClick={event => openPicker(event.currentTarget)} className={cn(FIELD, PICKER)}/>
                            <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5d6b73]" aria-hidden="true"/>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label htmlFor={`${id}-description`} className={LABEL}>Description</label>
                    <div className="relative">
                        <VoiceEnabledTextarea id={`${id}-description`} value={description} onChange={value => setDescription(value.slice(0, DESCRIPTION_MAX))}
                            onVoiceAccepted={text => setDescription(previous => (previous.trim() ? `${previous.trim()} ${text.trim()}` : text.trim()).slice(0, DESCRIPTION_MAX))}
                            placeholder="Briefly explain what the expense was for" rows={4} fieldName="Expense description" pageTitle="Add expense"
                            disabled={submitting} className={cn(TEXTAREA, 'pb-7')}/>
                        <CharCount value={description} max={DESCRIPTION_MAX}/>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <span className={LABEL} id={`${id}-receipt-label`}>Attach receipt</span>
                    {file ? <div className="flex items-center gap-3 rounded-[8px] border border-[#e3e8ea] px-3 py-3 dark:border-white/10">
                        <FileText className="h-5 w-5 shrink-0 text-[#007679] dark:text-[#7fe0e2]" aria-hidden="true"/>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{file.name}</p>
                            <p className="text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button type="button" onClick={() => { setFile(null); if (fileInput.current) fileInput.current.value = ''; }} aria-label="Remove receipt"
                            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-[#5d6b73] transition-colors hover:bg-[#f3f5f6] dark:hover:bg-white/5">
                            <X className="h-4 w-4"/>
                        </button>
                    </div> : <div onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
                        className={cn('flex flex-col items-center rounded-[8px] border border-dashed px-4 py-6 text-center transition-colors',
                            dragging ? 'border-[#007679] bg-[#007679]/5' : 'border-[#d5dcdf] dark:border-white/15')}>
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f3f5f6] text-[#3d4a50] dark:bg-white/10 dark:text-[#c9d3d6]">
                            <UploadCloud className="h-4 w-4" aria-hidden="true"/>
                        </span>
                        <p className="mt-2 text-[13px] text-[#3d4a50] dark:text-[#c9d3d6]">
                            <button type="button" onClick={() => fileInput.current?.click()} aria-describedby={`${id}-receipt-label`}
                                className="cursor-pointer font-semibold text-[#007679] underline-offset-2 hover:underline dark:text-[#7fe0e2]">Click to upload</button> or drag and drop
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#8a979d]">Photo or PDF (max 10 MB)</p>
                    </div>}
                    <input ref={fileInput} type="file" accept={RECEIPT_TYPES.join(',')} className="hidden" onChange={event => pickFile(event.target.files?.[0])}/>
                    {fileError && <p role="alert" className="text-[12px] text-[#b3371c] dark:text-[#f3a08c]">{fileError}</p>}
                </div>

                <Hint>Upload a clear photo or PDF of your receipt. This helps your agency verify the expense.</Hint>
            </form>
            <VoiceInputButton className="z-[60]"/>
        </VoiceRecordingProvider>
    </SidePanel>;
}
