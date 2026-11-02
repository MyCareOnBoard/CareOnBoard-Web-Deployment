import type {ReactNode} from 'react';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';

export type HubSection = 'documents' | 'trainings';

export interface HubSummary {
    /** Short attention label, e.g. "2 need attention"; omitted when nothing needs action. */
    alert?: string;
    summary: string;
    /** 0–1 share that is current/approved. */
    progress: number;
}

interface Props {
    active: HubSection;
    onChange: (section: HubSection) => void;
    documents: HubSummary;
    trainings: HubSummary;
    documentsPanel: ReactNode;
    trainingsPanel: ReactNode;
}

const sections: {key: HubSection; label: string}[] = [{key: 'documents', label: 'Documents'}, {key: 'trainings', label: 'Trainings'}];

export default function ComplianceHub({active, onChange, documents, trainings, documentsPanel, trainingsPanel}: Props) {
    const summaries = {documents, trainings};
    return <section aria-labelledby="dashboard-compliance" className="min-w-0 rounded-[12px] border border-[#e8edef] bg-white p-4 sm:p-5 dark:border-white/10 dark:bg-[#1b232b]">
        <h2 id="dashboard-compliance" className="text-[16px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">My documents &amp; trainings</h2>
        <p className="mt-1 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">Everything your agency needs on file to keep you eligible for shifts.</p>
        <Tabs value={active} onValueChange={value => onChange(value as HubSection)} className="mt-4 gap-5">
            <TabsList aria-label="Documents or trainings" className="grid h-auto w-full grid-cols-2 gap-2.5 rounded-none bg-transparent p-0 sm:gap-3">
                {sections.map(({key, label}) => {
                    const summary = summaries[key];
                    return <TabsTrigger key={key} value={key}
                        className="flex h-auto flex-col items-stretch gap-2 whitespace-normal rounded-[8px] border border-[#e3e8ea] bg-white px-3.5 py-3 text-left text-[#10141a] shadow-none hover:text-[#10141a] data-[state=active]:border-[#00a3a7] data-[state=active]:bg-[#f2fafa] data-[state=active]:text-[#10141a] data-[state=active]:shadow-none sm:px-4 sm:py-3.5 dark:border-white/10 dark:bg-transparent dark:text-[#f4f6f7] dark:data-[state=active]:border-[#00a3a7] dark:data-[state=active]:bg-[#00a3a7]/10 dark:data-[state=active]:text-white">
                        <span className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[15px] font-semibold">{label}</span>
                            {summary.alert && <span className="rounded-full bg-[#fff0eb] px-2 py-0.5 text-xs font-semibold text-[#b3371c] dark:bg-[#d53411]/20 dark:text-[#f3a08c]">{summary.alert}</span>}
                        </span>
                        <span className="text-[13px] font-medium text-[#5d6b73] dark:text-[#9aa4a8]">{summary.summary}</span>
                        <span className="block h-1.5 w-full overflow-hidden rounded-full bg-[#e3ebed] dark:bg-white/10" aria-hidden="true">
                            <span className="block h-full rounded-full bg-[#00a3a7]" style={{width: `${Math.round(Math.min(1, Math.max(0, summary.progress)) * 100)}%`}}/>
                        </span>
                    </TabsTrigger>;
                })}
            </TabsList>
            {/* Both panels stay mounted so upload drafts and sub-tab choices survive switching. */}
            <TabsContent value="documents" forceMount hidden={active !== 'documents'}>{documentsPanel}</TabsContent>
            <TabsContent value="trainings" forceMount hidden={active !== 'trainings'}>{trainingsPanel}</TabsContent>
        </Tabs>
    </section>;
}
