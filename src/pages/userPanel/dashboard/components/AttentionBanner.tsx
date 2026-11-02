import {CircleAlert, FileUp} from 'lucide-react';

const styles = {
    // Something has already lapsed: expired documents or overdue trainings.
    urgent: {
        box: 'border-[#f6c9b9] bg-[#fff1ec] dark:border-[#d53411]/40 dark:bg-[#d53411]/10',
        icon: 'bg-[#ffdcd1] text-[#d53411] dark:bg-[#d53411]/20 dark:text-[#f3a08c]',
        title: 'text-[#8f2a12] dark:text-[#f8b9a8]',
    },
    // Reminders only: things expiring or due soon.
    warning: {
        box: 'border-[#f3d9a0] bg-[#fff6e0] dark:border-[#f29d0c]/40 dark:bg-[#f29d0c]/10',
        icon: 'bg-[#ffe7b0] text-[#b26b00] dark:bg-[#f29d0c]/20 dark:text-[#f7c46b]',
        title: 'text-[#6b4100] dark:text-[#f7d48f]',
    },
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
const listNames = (names: string[]) => names.length <= 2 ? names.join(' and ') : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;

/**
 * The banner sentence. `documents` and `trainings` count everything needing attention;
 * `expiredDocuments` and `lapsedTrainings` are the subsets whose deadline has passed.
 */
export function attentionMessage({expiredDocuments, documents, lapsedTrainings, trainings}: {
    expiredDocuments: string[]; documents: number; lapsedTrainings: number; trainings: number;
}) {
    const parts: string[] = [];
    const otherDocuments = documents - expiredDocuments.length;
    if (expiredDocuments.length) {
        parts.push(`${listNames(expiredDocuments)} ${expiredDocuments.length === 1 ? 'has' : 'have'} expired`
            + (otherDocuments > 0 ? ` and ${otherDocuments} more ${otherDocuments === 1 ? 'document needs' : 'need'} attention.` : '.'));
    } else if (documents) parts.push(`${plural(documents, 'document')} need${documents === 1 ? 's' : ''} attention.`);
    const dueSoon = trainings - lapsedTrainings;
    if (lapsedTrainings) {
        parts.push(`${plural(lapsedTrainings, 'training')} ${lapsedTrainings === 1 ? 'is' : 'are'} overdue`
            + (dueSoon > 0 ? ` and ${dueSoon} ${dueSoon === 1 ? 'is' : 'are'} due soon.` : '.'));
    } else if (trainings) parts.push(`${plural(trainings, 'training')} ${trainings === 1 ? 'is' : 'are'} due soon.`);
    return `${parts.join(' ')} Update them to stay eligible for shifts.`;
}

interface Props {
    severity: keyof typeof styles;
    message: string;
    showDocuments: boolean;
    showTrainings: boolean;
    onDocuments: () => void;
    onTrainings: () => void;
}

export default function AttentionBanner({severity, message, showDocuments, showTrainings, onDocuments, onTrainings}: Props) {
    const style = styles[severity];
    const Icon = severity === 'urgent' ? CircleAlert : FileUp;
    // Polite, not an alert: it shows on every visit and shouldn't interrupt a screen reader.
    return <section role="status" aria-label="Action needed"
        className={`flex flex-wrap items-center justify-between gap-4 rounded-[12px] border px-4 py-4 sm:px-6 sm:py-5 ${style.box}`}>
        <div className="flex min-w-0 flex-1 basis-72 items-start gap-4 sm:items-center">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[8px] ${style.icon}`}><Icon className="h-5 w-5" aria-hidden="true"/></span>
            <div className="min-w-0">
                <p className={`text-[16px] font-semibold ${style.title}`}>Keep your record current</p>
                <p className="mt-1 text-sm text-[#34434c] dark:text-[#c9d3d6]">{message}</p>
            </div>
        </div>
        <div className="flex w-full flex-wrap gap-2.5 sm:w-auto">
            {showTrainings && <button type="button" onClick={onTrainings}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-[6px] border border-[#003839] bg-white px-5 text-sm font-semibold text-[#003839] transition-colors hover:bg-[#f2fafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] sm:flex-none dark:border-[#7fe0e2] dark:bg-transparent dark:text-[#7fe0e2] dark:hover:bg-white/5">
                View trainings
            </button>}
            {showDocuments && <button type="button" onClick={onDocuments}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-[6px] px-5 text-sm font-semibold transition-colors bg-[#003839] text-white hover:bg-[#00494a] dark:bg-[#00a3a7] dark:text-[#06292a] dark:hover:bg-[#33b5b8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] sm:flex-none">
                Update documents
            </button>}
        </div>
    </section>;
}
