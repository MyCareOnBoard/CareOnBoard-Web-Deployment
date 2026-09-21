import {useEffect, type ReactNode} from 'react';
import {AlertCircle, CheckCircle2, ChevronDown, FileText, Upload} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Skeleton} from '@/components/ui/skeleton';

export interface DashboardDocument {
    type: string; label: string; id?: string; documentId?: string;
    fileUrl: string; status: string; expiryLabel?: string; reasonCode?: string | null;
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
const groups = ['Needs attention', 'Not uploaded', 'Checking status', 'Current', 'Available'] as const;
function groupFor(document: DashboardDocument) {
    if (!document.fileUrl) return 'Not uploaded';
    if (document.status === 'Updating expiry status…') return 'Checking status';
    if (document.status.toLowerCase() === 'current') return 'Current';
    if (['available', 'not applicable'].includes(document.status.toLowerCase())) return 'Available';
    return 'Needs attention';
}
function badge(document: DashboardDocument) {
    const status = document.status.toLowerCase();
    if (!document.fileUrl) return {label: 'Not uploaded', color: 'bg-[#eef2f5] text-[#596065]'};
    if (status === 'expired') return {label: 'Expired', color: 'bg-[#fff0eb] text-[#b3371c]'};
    if (status === 'expiring' || status === 'expires today') return {label: status === 'expiring' ? 'Expiring soon' : 'Expires today', color: 'bg-[#fff3d6] text-[#8a5200]'};
    if (status === 'current') return {label: 'Current', color: 'bg-[#e6f6ed] text-[#187343]'};
    return {label: status === 'available' ? 'Uploaded' : document.status || 'Status unavailable', color: 'bg-[#edf3fa] text-[#375f84]'};
}
interface Props {
    documents: DashboardDocument[];
    loading: boolean; error: boolean; focusDocumentId?: string | null;
    onRetry: () => void; onUpload: (type?: string) => void; onView: (url: string) => void;
    children?: ReactNode;
}
export default function DashboardDocuments({documents, loading, error, focusDocumentId, onRetry, onUpload, onView, children}: Props) {
    const focusType = documents.find(item => focusDocumentId && (item.id === focusDocumentId || item.documentId === focusDocumentId))?.type;
    useEffect(() => {
        if (!focusType || loading || error) return;
        const row = window.document.getElementById('staff-document-' + focusType);
        if (!row) return;
        const group = row.closest('details');
        if (group) group.open = true;
        row.focus();
        row.scrollIntoView?.({block: 'nearest'});
    }, [focusType, loading, error]);
    const visibleGroups = groups.filter(group => documents.some(item => groupFor(item) === group));

    return <section aria-label="Documents" className="min-w-0 self-start rounded-[20px] border border-[#dce7e9] bg-white/70 p-4 sm:p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div><h3 className="text-xl font-bold text-[#10141a]">Documents</h3><p className="mt-1 text-sm text-[#596065]">Your document checklist and expiry status.</p></div>
            <Button type="button" onClick={() => onUpload()} className="h-auto gap-2 rounded-full bg-[#00b4b8] px-4 py-2.5 text-white hover:bg-[#009da1]"><Upload size={16} aria-hidden="true"/>Upload document</Button>
        </div>
        {children}
        {loading ? <div role="status" aria-label="Loading documents" className="space-y-5">
            <span className="sr-only">Loading documents</span>
            <div aria-hidden="true" className="space-y-5">{[0,1].map(group => <div key={group} className="rounded-xl border border-[#dce7e9] p-4">
                <Skeleton className="mb-5 h-5 w-40 motion-reduce:animate-none"/>
                {[0,1].map(row => <div key={row} className="mt-4 flex items-center gap-3">
                    <Skeleton className="h-9 w-8 shrink-0 motion-reduce:animate-none"/>
                    <div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4 motion-reduce:animate-none"/><Skeleton className="h-3 w-1/2 motion-reduce:animate-none"/></div>
                    <Skeleton className="h-5 w-12 motion-reduce:animate-none"/>
                </div>)}
            </div>)}</div>
        </div> : error ? <p role="alert" className="text-sm text-[#b3371c]">Unable to load documents. <Button type="button" variant="ghost" onClick={onRetry}>Retry documents</Button></p> : <>
            <div className="space-y-4">
                {visibleGroups.map((group, index) => <details key={group} open={index === 0 || documents.some(item => groupFor(item) === group && item.type === focusType)} className="group/documents overflow-hidden rounded-xl border border-[#dce7e9] bg-white">
                    <summary className="flex cursor-pointer list-none items-center gap-3 bg-[#f5f9f9] p-4 focus-visible:outline-2 focus-visible:outline-[#00b4b8] [&::-webkit-details-marker]:hidden">
                        {group === 'Needs attention' ? <AlertCircle size={20} className="shrink-0 text-[#a76000]" aria-hidden="true"/> : group === 'Current' ? <CheckCircle2 size={20} className="shrink-0 text-[#187343]" aria-hidden="true"/> : <FileText size={20} className="shrink-0 text-[#687e82]" aria-hidden="true"/>}
                        <h4 className="flex flex-1 flex-wrap items-center gap-2 text-sm font-bold text-[#21383e]">{group} <span className="rounded-full bg-[#e7eff0] px-2 py-0.5 text-xs font-medium">{documents.filter(item => groupFor(item) === group).length}</span></h4>
                        <ChevronDown size={18} aria-hidden="true" className="shrink-0 -rotate-90 group-open/documents:rotate-0"/>
                    </summary>
                    <div className="divide-y divide-[#e5edef] px-4">
                        {documents.filter(item => groupFor(item) === group).map(item => {
                            const status = badge(item);
                            const replace = ['expired', 'expiring', 'expires today', 'needs review'].includes(item.status.toLowerCase());
                            return <div key={item.type} id={'staff-document-' + item.type} tabIndex={-1} className="flex flex-wrap items-center gap-3 py-4 focus:outline-2 focus:outline-[#00b4b8]">
                                <FileText className="h-8 w-7 shrink-0 text-[#687e82]" aria-hidden="true"/>
                                <div className="min-w-0 flex-1 basis-40">
                                    <div className="flex flex-wrap items-center gap-2"><p className="break-words text-sm font-bold text-[#10141a]">{item.label}</p><span className={`rounded-full px-2 py-1 text-xs font-medium ${status.color}`}>{status.label}</span></div>
                                    <p className="mt-1 text-xs text-[#596065]">{!item.fileUrl ? 'Upload this document to your record.' : item.status.toLowerCase() === 'needs review' ? (reviewReasons[item.reasonCode ?? ''] ?? 'Your agency needs to review this document. Contact them for details.') : item.expiryLabel ? `${item.status.toLowerCase() === 'expired' ? 'Expired' : 'Expires'} ${item.expiryLabel}` : item.status === 'Updating expiry status…' ? 'Checking document expiry details.' : 'Document on file.'}</p>
                                </div>
                                <div className="ml-auto flex shrink-0 items-center gap-1">
                                    {item.fileUrl && <Button type="button" variant="ghost" className="px-2 text-[#007f83]" aria-label={`View ${item.label}`} onClick={() => onView(item.fileUrl)}>View</Button>}
                                    {(!item.fileUrl || replace) && <Button type="button" variant="ghost" className="px-2 text-[#007f83]" aria-label={`${item.fileUrl ? 'Replace' : 'Upload'} ${item.label}`} onClick={() => onUpload(item.type)}>{item.fileUrl ? 'Replace' : 'Upload'}</Button>}
                                </div>
                            </div>;
                        })}
                    </div>
                </details>)}
            </div>
        </>}
    </section>;
}
