import { complianceLabel, complianceReasonLabel, civilDateLabel, type DocumentComplianceResponse } from '@/pages/agency/compliance-alerts/apiTypes';
import {getApplicantDocs} from "@/pages/applicant/application/documentConfig";
import { useState, useEffect, useRef } from "react";
import { FileText, Plus } from "lucide-react";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { agencyOutlineButton, agencyPrimaryButton } from "@/components/agency/AgencyListKit";
import { cn } from "@/lib/utils";
import type { EmployeeDocument } from "@/lib/api/employee-documents";
import { documentTypeLabel } from "@/lib/documentTypes";
import { DocumentReviewDialog, type DocumentReviewMode } from "./DocumentReviewDialog";

/** Expiry problems the agency fixes by entering the date. */
const EXPIRY_FIXABLE = new Set(["missing_expiry_date", "invalid_expiry_date"]);

const rowButton = "inline-flex h-8 cursor-pointer items-center justify-center rounded-[8px] px-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50";
const rowOutlineButton = cn(rowButton, "border border-[#dcdfe2] bg-white text-[#10141a] hover:bg-[#f4f6f7] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5");

interface DocumentsSectionProps {
  compliance?: DocumentComplianceResponse;
  complianceError?: boolean;
  refreshCompliance?: () => unknown;
  focusDocumentId?: string | null;
  focusDocumentKey?: string | null;
  documents: EmployeeDocument[];
  isLoading: boolean;
  onRequestDocument: () => void;
  getDocumentStatusColor: (status: string) => string;
  getDocumentActionButton: (status: string, doc?: EmployeeDocument) => React.ReactNode;
  /** With these, rows offer Review (accept/reject) and Set expiry. */
  employeeId?: string;
  employeeName?: string;
  onDocumentsChanged?: () => void;
}

export function DocumentsSection({
  compliance, complianceError, refreshCompliance, focusDocumentId, focusDocumentKey,
  documents,
  isLoading,
  onRequestDocument,
  getDocumentStatusColor,
  getDocumentActionButton,
  employeeId, employeeName, onDocumentsChanged,
}: DocumentsSectionProps) {
  const slot=[...getApplicantDocs('dsp'),...getApplicantDocs('hha')].find(row=>row.id===focusDocumentKey);
  const slotRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(slot&&!isLoading){slotRef.current?.focus();slotRef.current?.scrollIntoView?.({block:'nearest'});}},[slot?.id,isLoading]);
  const [preview, setPreview] = useState<EmployeeDocument | null>(null);
  const [reviewing, setReviewing] = useState<{document: EmployeeDocument; mode: DocumentReviewMode} | null>(null);
  const canReview = Boolean(employeeId && onDocumentsChanged);

  useEffect(() => {
    if (!focusDocumentId) return;
    const row = document.getElementById(`document-${focusDocumentId}`);
    row?.focus(); row?.scrollIntoView?.({block: 'nearest'});
  }, [focusDocumentId, documents, isLoading]);
  return (
    <section aria-label="Documents" className="min-w-0 rounded-[16px] border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eceef0] px-5 py-3 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <FileText aria-hidden="true" className="h-5 w-5 shrink-0 text-[#007679] dark:text-[#7fd3d3]" />
          <div>
            <h3 className="text-base font-semibold text-[#10141a] dark:text-[#f4f6f7]">Documents</h3>
            <p className="text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">Here are your uploaded documents</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRequestDocument}
          className={agencyPrimaryButton}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Request new document
        </button>
      </div>
      <div className="px-5 py-4">

      {slot&&!isLoading&&<div ref={slotRef} tabIndex={-1} className="mb-4 rounded-[12px] border border-[#bfe3e3] bg-[#f3fafa] p-4 dark:border-[#0f7e7d]/40 dark:bg-[#0f7e7d]/10"><p className="text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Selected requirement: {slot.label}</p><p className="my-2 text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">Review the matching files below. If the required file is missing, request it from this staff member.</p><button type="button" className={agencyOutlineButton} onClick={onRequestDocument}>Request document</button></div>}
      {(complianceError || compliance?.syncStatus === 'error') && <p role="alert" className="mb-3 rounded-[10px] border border-[#f0c8c4] bg-[#fdf3f2] px-3.5 py-2.5 text-[13px] text-[#b42318] dark:border-[#ff6b5e]/30 dark:bg-[#ff6b5e]/10 dark:text-[#f8a1a1]">We couldn't load document expiry status. Try again. Last checked: {compliance?.evaluatedAt ? new Date(compliance.evaluatedAt).toLocaleString() : 'Not yet checked'}. <button type="button" onClick={refreshCompliance} className="cursor-pointer font-medium underline underline-offset-4">Retry</button></p>}
      {focusDocumentId && !isLoading && !documents.some(doc => doc.id === focusDocumentId) && <p role="status" className="mb-3 text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">This document is unavailable or you no longer have access. <a href="?" className="font-medium text-[#007679] underline underline-offset-4 dark:text-[#7fd3d3]">Back to documents</a></p>}
      <div className="space-y-2">
        {isLoading ? (
          <div aria-hidden="true" className="space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-[60px] animate-pulse rounded-[12px] bg-[#f4f5f6] dark:bg-white/5" />)}
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-[#dcdfe2] px-6 py-12 text-center dark:border-white/15">
            <span aria-hidden="true" className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-[#f4f5f6] text-[#6b737a] dark:bg-white/5 dark:text-[#9aa4a8]">
              <FileText className="h-5 w-5" />
            </span>
            <p className="text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">No documents uploaded yet</p>
          </div>
        ) : (
          documents.map((doc) => {
            const issue = compliance?.items.find(item => item.documentId === doc.id);
            const pilot = compliance?.pilotEnabled !== false && Boolean(refreshCompliance);
            const status = pilot ? (complianceError || compliance?.syncStatus === 'error' ? 'Expiry status unavailable' : complianceLabel(issue)) : doc.status;
            const reason = pilot ? complianceReasonLabel(issue) : null;
            const review = doc.review?.status;
            const fixExpiry = canReview && pilot && review !== 'pending' && EXPIRY_FIXABLE.has(issue?.reasonCode ?? '');
            return (
            <div key={doc.id} id={`document-${doc.id}`} tabIndex={-1} className="flex flex-col gap-3 rounded-[12px] border border-[#eceef0] px-4 py-3 transition-colors hover:bg-[#f8f9fa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:hover:bg-white/5">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e0f3f3] text-[#005c5e] dark:bg-[#0f7e7d]/20 dark:text-[#7fd3d3]">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="truncate text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{documentTypeLabel(doc.documentName)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {review === 'pending' || review === 'rejected' ? (
                  <span
                    title={review === 'rejected' && doc.review?.reason ? `Reason: ${doc.review.reason}` : undefined}
                    className={`inline-flex h-6 items-center rounded-[6px] px-2 text-[12px] font-medium ${review === 'pending' ? 'bg-[#fcf5dc] text-[#7a5800] dark:bg-[#e0b400]/15 dark:text-[#f0cf6b]' : 'bg-[#fde8e6] text-[#b42318] dark:bg-[#ef4444]/15 dark:text-[#f8a1a1]'}`}
                  >
                    {review === 'pending' ? 'Awaiting review' : 'Rejected · new copy requested'}
                    {review === 'rejected' && doc.review?.reason ? <span className="sr-only">. Reason: {doc.review.reason}</span> : null}
                  </span>
                ) : (
                  <span className={`inline-flex min-h-6 items-center rounded-[6px] px-2 py-0.5 text-[12px] font-medium capitalize ${getDocumentStatusColor(pilot ? issue?.condition ?? 'pending' : doc.status)}`}>
                    {status === 'expiring-soon' ? 'Expiring Soon' : status === 'unavailable' ? 'Unavailable' : status}{reason ? ` · ${reason}` : ''}{pilot && issue?.expiryDateKey ? ` · ${civilDateLabel(issue.expiryDateKey)}` : ''}
                  </span>
                )}
                {canReview && review === 'pending' && (
                  <button type="button" onClick={() => setReviewing({document: doc, mode: 'review'})} className={cn(rowButton, "bg-[#003839] text-white hover:bg-[#0b4c4d] dark:bg-[#0f7e7d] dark:hover:bg-[#13908f]")}>
                    Review
                  </button>
                )}
                {fixExpiry && (
                  <button type="button" onClick={() => setReviewing({document: doc, mode: 'expiry'})} className={rowOutlineButton}>
                    Set expiry
                  </button>
                )}
                {getDocumentActionButton(doc.status, doc)}
                {doc.fileUrl ? (
                  <button
                    type="button"
                    onClick={() => setPreview(doc)}
                    className={rowOutlineButton}
                  >
                    View
                  </button>
                ) : null}
              </div>
            </div>
          );})
        )}
      </div>
      </div>
      {canReview && reviewing && (
        <DocumentReviewDialog
          employeeId={employeeId!}
          employeeName={employeeName || 'this staff member'}
          document={reviewing.document}
          mode={reviewing.mode}
          currentExpiryDateKey={compliance?.items.find(item => item.documentId === reviewing.document.id)?.expiryDateKey}
          onClose={() => setReviewing(null)}
          onSaved={() => onDocumentsChanged?.()}
          onView={setPreview}
        />
      )}
      <DocumentPreviewModal
        open={preview !== null}
        onOpenChange={(open) => { if (!open) setPreview(null); }}
        title={preview ? documentTypeLabel(preview.documentName) : "Document preview"}
        url={preview?.fileUrl}
        fileName={preview?.fileName}
      />
    </section>
  );
}
