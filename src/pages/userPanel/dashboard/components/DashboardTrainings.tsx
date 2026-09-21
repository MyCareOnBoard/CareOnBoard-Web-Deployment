import {useState, type ReactNode} from 'react';
import {format, parseISO} from 'date-fns';
import {ChevronDown} from 'lucide-react';
import {Accordion, AccordionItem, AccordionTrigger, AccordionContent} from '@/components/ui/accordion';
import {Skeleton} from '@/components/ui/skeleton';
import {Button} from '@/components/ui/button';
import type {TrainingData} from '@/pages/agency/trainings/trainingApi';
import {trainingPolicyLabel} from '@/pages/agency/trainings/TrainingPolicyFields';

const groupOrder = ['Expired', 'Overdue', 'Required before work', 'Required before HHA services', 'Not approved',
    'Due today', 'Due soon', 'Renewal due', 'In review', 'Upcoming', 'Assigned', 'Details needed',
    'Updating requirements', 'Not assessed', 'Approved', 'Not currently required'];

export function trainingGroup(training: TrainingData): string {
    if (training.source === 'policy') {
        if (training.policyContextState !== 'current') return trainingPolicyLabel(training);
        // Keep urgent deadlines visible even when replacement evidence is awaiting review.
        if (['expired', 'overdue', 'before_work'].includes(training.deadlineState ?? '')) return trainingPolicyLabel(training);
        if (training.reviewState === 'changes_requested') return 'Not approved';
        if (training.reviewState === 'awaiting_review') return 'In review';
        return training.deadlineState === 'satisfied' ? 'Approved' : trainingPolicyLabel(training);
    }
    if (training.approved) return 'Approved';
    if (['Changes Requested', 'Not Approved', 'Rejected'].includes(training.status)) return 'Not approved';
    return training.status === 'Awaiting Review' ? 'In review' : 'Assigned';
}

function priority(training: TrainingData) {
    const index = groupOrder.indexOf(trainingGroup(training));
    return index < 0 ? groupOrder.length : index;
}
function dateLabel(value: string) {
    const date = parseISO(value);
    return Number.isNaN(date.getTime()) ? value : format(date, 'MMM d, yyyy');
}

function TrainingSkeleton({compact = false}: {compact?: boolean}) {
    return <div role="status" aria-label="Loading trainings" className="space-y-4">
        <span className="sr-only">Loading trainings</span>
        <div aria-hidden="true" className="space-y-4">

            {[0, 1, 2].slice(0, compact ? 1 : 3).map(item => <div key={item} className="space-y-3"><Skeleton className="h-4 w-32 motion-reduce:animate-none"/><div className="rounded-xl border border-[#dce7e9] bg-white/70 p-5">
                <div className="flex justify-between gap-4"><Skeleton className="h-5 w-2/3 motion-reduce:animate-none"/><Skeleton className="h-6 w-20 rounded-full motion-reduce:animate-none"/></div>
                <Skeleton className="mt-3 h-4 w-1/2 motion-reduce:animate-none"/>
                {!compact && item === 0 && <div className="mt-6 space-y-4">
                    <Skeleton className="h-4 w-28 motion-reduce:animate-none"/>
                    <Skeleton className="h-11 w-full motion-reduce:animate-none"/>
                    <Skeleton className="h-28 w-full motion-reduce:animate-none"/>
                    <Skeleton className="h-11 w-full motion-reduce:animate-none"/>
                </div>}
            </div></div>)}
        </div>
    </div>;
}

interface Props {
    trainings: TrainingData[];
    loading: boolean;
    error: boolean;
    hasMore: boolean;
    assessmentIncomplete: boolean;
    onLoadMore: () => void;
    onRetry: () => void;
    renderTraining: (training: TrainingData) => ReactNode;
}

export default function DashboardTrainings({trainings, loading, error, hasMore, assessmentIncomplete, onLoadMore, onRetry, renderTraining}: Props) {
    const [expanded, setExpanded] = useState<string>();
    const sorted = [...trainings].sort((a, b) => priority(a) - priority(b) || (a.dueDateKey ?? '9999').localeCompare(b.dueDateKey ?? '9999'));

    const open = expanded ?? sorted[0]?.id ?? '';
    return <section aria-label="Trainings" className="min-w-0 rounded-[20px] border border-[#dce7e9] bg-white/70 p-4 sm:p-6">
        <div className="mb-6 flex items-start justify-between gap-3">
            <div><h3 className="text-xl font-bold text-[#10141a]">Trainings</h3><p className="mt-1 text-sm text-[#596065]">Upload certificates for agency review.</p></div>
            {trainings.length > 0 && <span className="shrink-0 pt-1 text-xs text-[#596065]">{trainings.length} {hasMore ? 'loaded' : 'assigned'}</span>}
        </div>
        {assessmentIncomplete && <p className="mb-4 text-sm text-[#596065]">Some requirements are still being assessed. Check each training for details.</p>}
        {loading && !trainings.length ? <TrainingSkeleton/> : <>
            {hasMore && <p className="mb-3 text-xs text-[#596065]">Groups show loaded trainings. Load more to see the rest.</p>}
            <Accordion type="single" collapsible value={open} onValueChange={setExpanded} className="space-y-3">
                {Array.from(new Set(sorted.map(trainingGroup))).map((group, index) => <details key={group} open={index === 0} className="group/status pt-3 first:pt-0">
                    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg py-3 text-sm font-bold text-[#344c52] focus-visible:outline-2 focus-visible:outline-[#00b4b8] [&::-webkit-details-marker]:hidden">
                        <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 -rotate-90 group-open/status:rotate-0"/>
                        <h4 className="flex items-center gap-2">{group}<span className="rounded-full bg-[#e7eff0] px-2 py-0.5 text-xs font-medium">{sorted.filter(item => trainingGroup(item) === group).length}</span></h4>
                        <span aria-hidden="true" className="ml-1 h-px flex-1 bg-[#dce7e9]"/>
                    </summary>
                    <div className="space-y-3 pt-1">
                    {sorted.filter(training => trainingGroup(training) === group).map(training => {
                    const label = training.source === 'policy' ? trainingPolicyLabel(training) : training.status;
                    const tone = group === 'Approved' ? 'bg-[#e6f6ed] text-[#187343]' : ['Expired', 'Overdue'].includes(label) ? 'bg-[#fff0eb] text-[#b3371c]' : ['Due soon', 'Due today', 'Renewal due', 'Required before work', 'Required before HHA services'].includes(label) ? 'bg-[#fff3d6] text-[#8a5200]' : 'bg-[#eef2f5] text-[#4b5c6b]';
                    return <AccordionItem key={training.id ?? training.name} value={training.id ?? training.name} className="overflow-hidden rounded-xl border border-[#dce7e9] bg-white">
                        <AccordionTrigger aria-label={`${training.name}, ${label}`} className="gap-3 px-4 py-5 text-base hover:bg-[#f7fafa] focus-visible:outline-2 focus-visible:outline-[#00b4b8] sm:px-5">
                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-start justify-between gap-2">
                                    <span className="min-w-0 flex-1 break-words font-bold">{training.name}</span>
                                    <span className={`max-w-full rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>
                                </span>
                                <span className="mt-2 block text-xs font-normal text-[#596065]">
                                    {training.source === 'policy' && training.policyContextState === 'current' && training.dueDateKey && !['satisfied', 'not_required', 'before_work'].includes(training.deadlineState ?? '') && <>Due {dateLabel(training.dueDateKey)} · </>}
                                    {training.source === 'policy' ? 'Automatically assigned' : 'Assigned by your agency'}
                                    {(training.reviewState === 'awaiting_review' || training.status === 'Awaiting Review') && <span className="ml-2 text-[#2464a3]">· Awaiting agency review</span>}
                                </span>
                            </span>
                        </AccordionTrigger>
                        <AccordionContent forceMount hidden={open !== (training.id ?? training.name)} className="border-t border-[#dce7e9] bg-[#f5f9f9] p-4 sm:p-5">
                            {renderTraining(training)}
                        </AccordionContent>
                    </AccordionItem>;
                    })}
                    </div>
                </details>)}
            </Accordion>
            {!trainings.length && !loading && !error && <p className="py-8 text-center text-sm text-[#596065]">No trainings assigned yet.</p>}
            {loading && <div className="mt-4"><TrainingSkeleton compact/></div>}
        </>}
        {error && !loading && <div role="alert" className="mt-4 text-sm text-[#b3371c]">Unable to load trainings. <Button type="button" variant="ghost" onClick={onRetry}>Try again</Button></div>}
        {!loading && hasMore && <Button type="button" variant="ghost" className="mt-3 w-full text-[#007f83]" aria-label="Load more trainings" onClick={onLoadMore}>Load more trainings</Button>}
    </section>;
}
