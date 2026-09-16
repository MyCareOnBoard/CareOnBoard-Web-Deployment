import type { ChecklistReason, ChecklistRow, ChecklistStatus, Client, ClientDocument } from '@/lib/api/clients';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DOCUMENT_TYPE_OPTIONS } from '@/pages/shared/client-management/utils/documentTypeConstants';
import { Routes } from '@/routes/constants';
export type ClientDocumentChecklistProps = { client: Pick<Client, 'documents' | 'documentChecklist'>; canUpload: boolean; refreshing: boolean; refreshError: string | null; onRefresh: () => void; onUpload: (key: ChecklistRow['key']) => void; onViewFiles: (key: ChecklistRow['key']) => void };
export const CHECKLIST_LABELS: Record<ChecklistStatus, string> = {
  not_uploaded: 'No file recorded', multiple_files: 'Multiple files', needs_review: 'Needs review', expired: 'Expired',
  expires_today: 'Expires today', on_file: 'On file', on_file_no_expiry: 'On file · expiry not recorded',
};
const reasons: Record<ChecklistReason, string> = {
  invalid_reference: 'The saved file reference needs checking.', malformed_entry: 'Saved document details need checking.',
  invalid_issued_date: 'Confirm the recorded issued date.', ambiguous_issued_date: 'Confirm the recorded issued date.',
  invalid_expiry_date: 'Confirm the recorded expiry date.', ambiguous_expiry_date: 'Confirm the recorded expiry date.',
  reversed_dates: 'The issued date is later than the expiry date.',
  invalid_timezone: 'Your agency timezone needs updating before expiry dates can be checked.',
};
export const checklistVariant = (status: ChecklistStatus) => status === 'expired' ? 'expired' : ['needs_review', 'expires_today', 'multiple_files'].includes(status) ? 'incomplete' : 'outline';
const dateReason = (reason?: ChecklistReason | null) => Boolean(reason && !['invalid_reference', 'malformed_entry'].includes(reason));
const statusLabel = (status: ChecklistStatus, reason?: ChecklistReason | null) => status === 'needs_review' && dateReason(reason) ? 'Check dates' : CHECKLIST_LABELS[status];
const tracked = new Set(['isp', 'pcpt', 'sdr', 'form485', 'poc', 'physicianOrders', 'clinicalAssessment']);
export function checklistEntryDisplay(client: Pick<Client, 'documentChecklist'>, document: ClientDocument, index: number) {
  if (!tracked.has(document.key)) return null;
  const entry = client.documentChecklist?.state === 'ready'
    ? client.documentChecklist.groups.flatMap(group => group.rows).find(row => row.key === document.key)?.entries.find(item => item.documentIndex === index)
    : undefined;
  const placeholder = client.documentChecklist?.state === 'ready' && !entry && !document.url;
  return { label: entry ? statusLabel(entry.status, entry.reasonCode) : placeholder ? 'No file recorded' : 'Needs review', variant: entry ? checklistVariant(entry.status) : placeholder ? 'outline' : 'incomplete',
    reason: entry?.warningCode ? reasons[entry.warningCode] : entry?.reasonCode ? reasons[entry.reasonCode] : null };
}
export function usableClientDocuments(documents: Client['documents']) {
  return Array.isArray(documents) ? documents.flatMap((document, index) => document && typeof document === 'object' && typeof document.key === 'string' ? [{ document, index }] : []) : [];
}
export function clientDocumentUrl(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined;
  try { const parsed = new URL(url); return ['http:', 'https:'].includes(parsed.protocol) ? url : undefined; } catch { return undefined; }
}
export function showClientChecklist(client: Client, role?: string, mode?: string | null) {
  if (!['agency', 'agency_staff', 'super_admin'].includes(role || '') || mode === 'sc') return false;
  if (client.documentChecklist) return true;
  const programs = client.servicePrograms ?? [client.type || 'ddd'];
  return Array.isArray(programs) && programs.some(program => ['ddd', 'hha'].includes(program) && (!mode || program === mode));
}

export function ClientDocumentChecklist({ client, canUpload, refreshing, refreshError, onRefresh, onUpload, onViewFiles }: ClientDocumentChecklistProps) {
  const checklist = client.documentChecklist;
  const checked = checklist?.evaluatedAt ? new Date(checklist.evaluatedAt).toLocaleString() : '';
  const timezoneWarning = checklist?.state === 'ready' && checklist.groups.some(group => group.rows.some(row => row.reasonCode === 'invalid_timezone' || row.entries.some(entry => entry.reasonCode === 'invalid_timezone' || entry.warningCode === 'invalid_timezone')));
  return <section aria-label="Document checklist" className="rounded-[20px] border border-[#e5e5e6] bg-white/60 p-4 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold text-[#10141a]">Document checklist</h2>
      {checklist && <Button type="button" variant="outline" size="sm" disabled={refreshing} onClick={onRefresh}>{refreshing ? 'Refreshing…' : 'Refresh'}</Button>}
    </div>
    <p className="text-sm text-[#808081]">Files and dates on record. This checklist does not confirm approval or readiness for assignment.</p>
    {refreshError && <div role="status" className="text-sm text-[#b54708]">{checked ? `Could not refresh. Showing results checked ${checked}` : 'Could not load the checklist. Try again.'} <Button type="button" variant="outline" size="sm" onClick={onRefresh}>Retry</Button></div>}
    {!checklist ? <p className="text-sm">Document checklist is not available yet.</p> : checklist.state === 'unavailable' ? <div className="text-sm" role="status">
      <p>{checklist.reasonCode === 'invalid_documents' ? 'Checklist unavailable — saved document data could not be read' : 'Document checklist unavailable'}</p><p>{checklist.reasonCode === 'evaluation_failed' ? 'Could not load the checklist. Try again.' : 'Saved document details need checking. Ask your agency administrator to review them.'}</p>
      {checklist.reasonCode === 'evaluation_failed' && !refreshError && <Button type="button" variant="outline" size="sm" onClick={onRefresh}>Retry</Button>}
    </div> : <>
      {checklist.warningCode && <p className="text-sm text-[#b54708]">Saved document details need checking. Ask your agency administrator to review them.</p>}
      {timezoneWarning && <p className="text-sm text-[#b54708]">Your agency timezone needs updating before expiry dates can be checked. {canUpload ? <a className="underline" href={`${Routes.agency.agencySettings}?tab=agencyInfo`}>Open Agency Information</a> : 'Ask your agency administrator.'}</p>}
      {checklist.groups.map(group => <div key={group.program} className="space-y-2"><h3 className="text-sm font-semibold uppercase">{group.program}</h3>
        {group.rows.map(row => {
          const expired = row.entries.filter(entry => entry.status === 'expired').length;
          const review = row.entries.filter(entry => dateReason(entry.reasonCode) || dateReason(entry.warningCode)).length;
          const warnings = [...new Set(row.entries.flatMap(entry => entry.warningCode ? [entry.warningCode] : []))];
          return <div key={row.key} className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5e5e6] py-3">
            <div className="min-w-0 flex-1"><p className="text-sm font-medium break-words">{DOCUMENT_TYPE_OPTIONS.find(option => option.value === row.key)?.label || row.key}</p>
              {row.status === 'multiple_files' && <p className="text-xs text-[#808081]">{row.entries.length} files recorded. Check which copy applies.</p>}
              {row.entries.length > 1 && (expired > 0 || review > 0) && <p className="text-xs text-[#b54708]">{expired} expired · {review} needing date review</p>}
              {row.entries.length === 1 && row.entries[0].expiryDate && <p className="text-xs text-[#808081]">Expiry: {row.entries[0].expiryDate}</p>}
              {row.reasonCode && row.reasonCode !== 'invalid_timezone' && <p className="text-xs text-[#b54708]">{reasons[row.reasonCode]}</p>}
              {warnings.map(reason => <p key={reason} className="text-xs text-[#b54708]">{reasons[reason]}</p>)}
            </div>
            <Badge variant={checklistVariant(row.status)} className="whitespace-normal">{statusLabel(row.status, row.reasonCode)}</Badge>
            {row.status === 'not_uploaded' ? canUpload && <Button type="button" variant="outline" size="sm" onClick={() => onUpload(row.key)}>Upload</Button>
              : <Button type="button" variant="outline" size="sm" onClick={() => onViewFiles(row.key)}>View files</Button>}
          </div>;
        })}
      </div>)}
      {!canUpload && <p className="text-xs text-[#808081]">Ask your agency administrator to upload or update documents.</p>}
    </>}
    {checklist && <p className="text-xs text-[#808081]">Checked {checked}{checklist.localDate ? ` · Agency date ${checklist.localDate}` : ''}{checklist.timezone ? ` (${checklist.timezone})` : ''}</p>}
  </section>;
}
