import {useEffect, useState, type ReactNode} from 'react';
import {AlertCircle, CheckCircle2, FileText, Upload} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Skeleton} from '@/components/ui/skeleton';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {subTabCount, subTabList, subTabTrigger} from './subTabStyles';

export interface DashboardDocument {
    type: string; label: string; id?: string; documentId?: string;
    fileUrl: string; status: string; expiryLabel?: string; reasonCode?: string | null;
    /** Set while the agency's request for this document is still waiting on an upload. */
    request?: {validThroughLabel?: string; message?: string};
    /** The agency's review of the uploaded file. */
    review?: {status: string; reason?: string | null};
}
const reviewReasons: Record<string, string> = {
    missing_expiry_date: 'No expiry date is recorded. Ask your agency to confirm whether one is required.',
    invalid_expiry_date: 'The expiry date could not be read. Ask your agency to correct it.',
    duplicate_document_slot: 'Multiple records exist for this document type. Ask your agency to review them.',
    invalid_identity: 'Your agency needs to review which staff record this document belongs to.',
    invalid_timezone: 'Your agency needs to correct its time zone before expiry can be checked.',
    unknown_applicability: 'Your agency needs to confirm whether this document requires expiry tracking.',
    evidence_pending: 'This document is awaiting agency review.',
    evidence_rejected: 'This document was rejected. Upload a replacement or contact your agency.',
    evidence_unavailable: 'Document evidence is unavailable. Contact your agency.',
    missing_file: 'No file is attached to this record. Upload a replacement or contact your agency.',
};
export const groups = ['Needs attention', 'Not uploaded', 'Checking status', 'Current', 'Available'] as const;
export function groupFor(document: DashboardDocument) {
    if (!document.fileUrl) return 'Not uploaded';
    if (document.request) return 'Needs attention';
    if (document.review?.status === 'rejected') return 'Needs attention';
    if (document.review?.status === 'pending' || document.status === 'Updating expiry status…') return 'Checking status';
    if (document.status.toLowerCase() === 'current') return 'Current';
    if (['available', 'not applicable', 'no expiry'].includes(document.status.toLowerCase())) return 'Available';
    return 'Needs attention';
}
function badge(document: DashboardDocument) {
    const status = document.status.toLowerCase();
    if (document.request) return {label: 'Requested', color: 'bg-[#fff3d6] text-[#8a5200]'};
    if (!document.fileUrl) return {label: 'Not uploaded', color: 'bg-[#eef2f5] text-[#596065]'};
    if (document.review?.status === 'rejected') return {label: 'Rejected', color: 'bg-[#fff0eb] text-[#b3371c]'};
    if (document.review?.status === 'pending') return {label: 'Awaiting review', color: 'bg-[#fff3d6] text-[#8a5200]'};
    if (status === 'expired') return {label: 'Expired', color: 'bg-[#fff0eb] text-[#b3371c]'};
    if (status === 'expiring' || status === 'expires today') return {label: status === 'expiring' ? 'Expiring soon' : 'Expires today', color: 'bg-[#fff3d6] text-[#8a5200]'};
    if (status === 'current') return {label: 'Current', color: 'bg-[#e6f6ed] text-[#187343]'};
    return {label: status === 'available' ? 'Uploaded' : document.status || 'Status unavailable', color: 'bg-[#edf3fa] text-[#375f84]'};
}
function reviewText(review: NonNullable<DashboardDocument['review']>) {
    return review.status === 'rejected'
        ? `Your agency rejected this file${review.reason ? `: ${review.reason}` : '.'} Upload a new copy.`
        : 'Your agency is reviewing this document.';
}
function requestText(request: NonNullable<DashboardDocument['request']>, onFile: boolean) {
    const parts = [onFile ? 'Your agency asked for a new copy of this document.' : 'Your agency asked you to upload this document.'];
    if (request.validThroughLabel) parts.push(`It should be valid through ${request.validThroughLabel}.`);
    if (request.message) parts.push(`Note: ${request.message}`);
    return parts.join(' ');
}
interface Props {
    documents: DashboardDocument[];
    loading: boolean; error: boolean; focusDocumentId?: string | null;
    /** Scrolls to this document type's row, e.g. from a document request notification. */
    focusDocumentType?: string | null;
    onRetry: () => void; onUpload: (type?: string) => void; onView: (url: string, title: string) => void;
    children?: ReactNode;
    /** Shown inside the dashboard's documents & trainings panel, which supplies its own heading. */
    embedded?: boolean;
}
export default function DashboardDocuments({documents, loading, error, focusDocumentId, focusDocumentType, onRetry, onUpload, onView, children, embedded = false}: Props) {
    const focusDocument = documents.find(item => focusDocumentId ? item.id === focusDocumentId || item.documentId === focusDocumentId : Boolean(focusDocumentType) && item.type === focusDocumentType);
    const focusType = focusDocument?.type;
    const focusGroup = focusDocument ? groupFor(focusDocument) : undefined;
    const visibleGroups = groups.filter(group => documents.some(item => groupFor(item) === group));
    const [activeGroup, setActiveGroup] = useState<typeof groups[number]>();
    const currentGroup = (activeGroup && visibleGroups.includes(activeGroup) ? activeGroup : visibleGroups[0]) as typeof groups[number] | undefined;

    // A deep link to a specific document (e.g. from a notification) should land on
    // that document's own group tab, not whatever the default would otherwise be.
    useEffect(() => {
        if (focusGroup) setActiveGroup(focusGroup as typeof groups[number]);
    }, [focusGroup]);

    useEffect(() => {
        if (!focusType || loading || error) return;
        const row = window.document.getElementById('staff-document-' + focusType);
        if (!row) return;
        row.focus();
        row.scrollIntoView?.({block: 'nearest'});
    }, [focusType, loading, error, currentGroup]);

    return <div role="region" aria-label="Documents" className="min-w-0">
        <div className={`flex flex-wrap items-start justify-between gap-4 ${embedded ? 'mb-4' : 'mb-6'}`}>
            {embedded ? <p className="pt-2.5 text-sm text-[#596065] dark:text-[#9aa4a8]">Your document checklist and expiry status.</p>
                : <div><h3 className="text-xl font-bold text-[#10141a] dark:text-[#f4f6f7]">Documents</h3><p className="mt-1 text-sm text-[#596065] dark:text-[#9aa4a8]">Your document checklist and expiry status.</p></div>}
            <Button type="button" onClick={() => onUpload()} className="h-10 gap-2 rounded-[6px] px-4 font-semibold bg-[#003839] text-white hover:bg-[#00494a] dark:bg-[#00a3a7] dark:text-[#06292a] dark:hover:bg-[#33b5b8]"><Upload size={16} aria-hidden="true"/>Upload document</Button>
        </div>
        {children}
        {loading ? <div role="status" aria-label="Loading documents" className="space-y-5">
            <span className="sr-only">Loading documents</span>
            <div aria-hidden="true" className="space-y-5">{[0,1].map(group => <div key={group} className="rounded-[8px] border border-[#e3e8ea] p-4 dark:border-white/10">
                <Skeleton className="mb-5 h-5 w-40 motion-reduce:animate-none"/>
                {[0,1].map(row => <div key={row} className="mt-4 flex items-center gap-3">
                    <Skeleton className="h-9 w-8 shrink-0 motion-reduce:animate-none"/>
                    <div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4 motion-reduce:animate-none"/><Skeleton className="h-3 w-1/2 motion-reduce:animate-none"/></div>
                    <Skeleton className="h-5 w-12 motion-reduce:animate-none"/>
                </div>)}
            </div>)}</div>
        </div> : error ? <p role="alert" className="text-sm text-[#b3371c]">Unable to load documents. <Button type="button" variant="ghost" onClick={onRetry}>Retry documents</Button></p>
        : visibleGroups.length === 0 ? <p className="py-8 text-center text-sm text-[#596065] dark:text-[#9aa4a8]">No documents to show.</p>
        : <Tabs value={currentGroup} onValueChange={value => setActiveGroup(value as typeof groups[number])}>
            <TabsList className={`w-full ${subTabList}`}>
                {visibleGroups.map(group => <TabsTrigger key={group} value={group} className={`sm:flex-1 ${subTabTrigger}`}>
                    {group === 'Needs attention' ? <AlertCircle size={15} className="text-[#a76000]" aria-hidden="true"/> : group === 'Current' ? <CheckCircle2 size={15} className="text-[#187343]" aria-hidden="true"/> : <FileText size={15} className="text-[#687e82]" aria-hidden="true"/>}
                    {group}{' '}
                    <span className={subTabCount}>{documents.filter(item => groupFor(item) === group).length}</span>
                </TabsTrigger>)}
            </TabsList>
            {visibleGroups.map(group => <TabsContent key={group} value={group} forceMount hidden={currentGroup !== group}>
                <div className="divide-y divide-[#e5edef] dark:divide-white/10 rounded-[8px] border border-[#e3e8ea] bg-white dark:border-white/10 dark:bg-[#1b232b] px-4">
                    {documents.filter(item => groupFor(item) === group).map(item => {
                        const status = badge(item);
                        const reviewState = item.review?.status === 'pending' || item.review?.status === 'rejected' ? item.review : undefined;
                        const replace = Boolean(item.request) || reviewState?.status === 'rejected' || ['expired', 'expiring', 'expires today', 'needs review'].includes(item.status.toLowerCase());
                        return <div key={item.type} id={'staff-document-' + item.type} tabIndex={-1} className="flex flex-wrap items-center gap-3 py-4 focus:outline-2 focus:outline-[#00b4b8]">
                            <FileText className="h-8 w-7 shrink-0 text-[#687e82]" aria-hidden="true"/>
                            <div className="min-w-0 flex-1 basis-40">
                                <div className="flex flex-wrap items-center gap-2"><p className="break-words text-sm font-bold text-[#10141a] dark:text-[#f4f6f7]">{item.label}</p><span className={`rounded-full px-2 py-1 text-xs font-medium ${status.color}`}>{status.label}</span></div>
                                <p className="mt-1 text-xs text-[#596065] dark:text-[#9aa4a8]">{item.request ? requestText(item.request, Boolean(item.fileUrl)) : !item.fileUrl ? 'Upload this document to your record.' : reviewState ? reviewText(reviewState) : item.status.toLowerCase() === 'needs review' ? (reviewReasons[item.reasonCode ?? ''] ?? 'Your agency needs to review this document. Contact them for details.') : item.expiryLabel ? `${item.status.toLowerCase() === 'expired' ? 'Expired' : 'Expires'} ${item.expiryLabel}` : item.status === 'Updating expiry status…' ? 'Checking document expiry details.' : 'Document on file.'}</p>
                            </div>
                            <div className="ml-auto flex shrink-0 items-center gap-1">
                                {item.fileUrl && <Button type="button" variant="ghost" className="px-2 text-[#007f83]" aria-label={`View ${item.label}`} onClick={() => onView(item.fileUrl, item.label)}>View</Button>}
                                {(!item.fileUrl || replace) && <Button type="button" variant="ghost" className="px-2 text-[#007f83]" aria-label={`${item.fileUrl ? 'Replace' : 'Upload'} ${item.label}`} onClick={() => onUpload(item.type)}>{item.fileUrl ? 'Replace' : 'Upload'}</Button>}
                            </div>
                        </div>;
                    })}
                </div>
            </TabsContent>)}
        </Tabs>}
    </div>;
}
