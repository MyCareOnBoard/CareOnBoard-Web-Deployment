import React, { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Plus } from "lucide-react";
import { Client, ClientDocument, ChecklistRow } from "@/lib/api/clients";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  isForm485Required,
  hasSignedForm485,
  form485GraceInfo,
} from "@/pages/shared/client-management/utils/form485GenerationEligibility";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";

import { ClientDocumentChecklist, checklistEntryDisplay, usableClientDocuments, clientDocumentUrl } from '@/pages/shared/client-details/components/ClientDocumentChecklist';

export function DocumentsTab({
  focusDocumentKey,
  client,
  showChecklist = false, refreshing = false, refreshError = null, onRefresh = () => {}, onUploadChecklist,
  onOpenUploadModal,
  onActivateClient,
}: {
  client: Client;
  focusDocumentKey?:string|null;
  showChecklist?: boolean;
  refreshing?: boolean;
  refreshError?: string | null;
  onRefresh?: () => void;
  onUploadChecklist?: (key: ChecklistRow['key']) => void;
  onOpenUploadModal?: (document?: ClientDocument) => void;
  onActivateClient?: () => void;
}) {
  const requestedSlot=['isp','pcpt','sdr','aenf','form485','poc','physicianOrders','clinicalAssessment'].includes(focusDocumentKey || '')?focusDocumentKey:null;
  const focusRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(requestedSlot){focusRef.current?.focus();focusRef.current?.scrollIntoView?.({block:'nearest'});}},[requestedSlot,client.id]);
  const [preview, setPreview] = useState<ClientDocument | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => setPreview(null), [client]);
  const safeDocuments = usableClientDocuments(client.documents);
  const safeClient = { ...client, documents: safeDocuments.map(({ document }) => ({ ...document, url: typeof document.url === 'string' ? document.url : undefined })) };
  const grace = form485GraceInfo(safeClient);
  const viewFiles = (key: ChecklistRow['key']) => {
    const row = listRef.current?.querySelector<HTMLElement>(`[data-document-key="${key}"]`);
    row?.focus(); row?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  };
  const canReactivate =
    Boolean(onActivateClient) &&
    client.status === "pending" &&
    hasSignedForm485(safeClient.documents);
  const formatDeadline = (d?: Date) =>
    d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

  const documents = useMemo(() => usableClientDocuments(client.documents).map(({ document: doc, index }) => {
    const server = checklistEntryDisplay(client, doc, index);
    const url = clientDocumentUrl(doc.url);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const expiry = typeof doc.expiryDate === 'string' ? new Date(doc.expiryDate) : null;
    expiry?.setHours(0, 0, 0, 0);
    const status = server?.label || (expiry && expiry < today ? 'Expired' : url ? 'Available' : 'Not uploaded');
    return { id: index, title: typeof doc.title === 'string' ? doc.title : doc.key,
      fileName: typeof doc.fileName === 'string' ? doc.fileName : undefined,
      url, status, variant: server?.variant || (status === 'Expired' ? 'expired' : status === 'Available' ? 'success' : 'pending'),
      reason: server?.reason, isForm485: doc.key === 'form485', signed: doc.signed !== false, document: doc };
  }), [client.documents, client.documentChecklist]);

  return (
    <>
      {requestedSlot&&<div ref={focusRef} tabIndex={-1} className="mt-5 rounded-[12px] border border-[#bfe3e3] bg-[#f3fafa] p-4 dark:border-[#0f7e7d]/40 dark:bg-[#0f7e7d]/10"><p className="text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Selected document: {requestedSlot.toUpperCase()}</p><p className="my-2 text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">Review the current file and dates below.</p>{safeDocuments.some(({document})=>document.key===requestedSlot&&clientDocumentUrl(document.url))?<Button variant="outline" onClick={()=>{const doc=safeDocuments.find(({document})=>document.key===requestedSlot&&clientDocumentUrl(document.url))?.document;if(doc)setPreview(doc);}}>View selected document</Button>:onUploadChecklist?<Button onClick={()=>onUploadChecklist(requestedSlot as ChecklistRow['key'])}>Upload required document</Button>:<p className="text-sm">No file recorded. Ask your agency administrator to upload it.</p>}</div>}
      <div className="mt-5 flex flex-col gap-5 overflow-hidden rounded-[16px] border border-[#e4e7ea] bg-white p-5 dark:border-white/10 dark:bg-[#1b232b]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eceef0] pb-4 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <FileText aria-hidden="true" className="h-5 w-5 shrink-0 text-[#007679] dark:text-[#7fd3d3]" />
            <div>
              <h2 className="text-base font-semibold text-[#10141a] dark:text-[#f4f6f7]">
                Documents
              </h2>
              <p className="text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">
                Here are your uploaded documents
              </p>
            </div>
          </div>
          {onOpenUploadModal && <Button
            className="shrink-0"
            onClick={() => {
              if (onOpenUploadModal) {
                onOpenUploadModal();
              }
            }}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add Document
          </Button>}
        </div>

        {isForm485Required(safeClient) && (
          <div className="rounded-[12px] border border-[#fdb022] bg-[#fffaeb] px-4 py-3">
            <p className="text-[13px] font-medium text-[#b54708]">
              {onOpenUploadModal ? 'Form 485 required to activate this client. Upload the signed Form 485 (CMS-485 Plan of Care) — you’ll be prompted to activate once it’s added.' : 'Form 485 required to activate this client. Ask your agency administrator to upload the signed copy.'}
            </p>
          </div>
        )}

        {grace.state === "unsigned-grace" && (
          <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[#fdb022] bg-[#fffaeb] px-4 py-3">
            <p className="text-[13px] font-medium text-[#b54708]">
              Active on an <strong>unsigned</strong> Form 485.{" "}
              {grace.deadline
                ? `${onOpenUploadModal ? 'Upload the signed copy' : 'Signed copy required'} by ${formatDeadline(grace.deadline)}${
                    typeof grace.daysLeft === "number"
                      ? ` (${grace.daysLeft} day${grace.daysLeft === 1 ? "" : "s"} left)`
                      : ""
                  } to keep the client active.`
                : "A signed copy is required to keep the client active."}
            </p>
          </div>
        )}

        {grace.state === "expired" && (
          <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[#f97066] bg-[#fef3f2] px-4 py-3">
            <p className="text-[13px] font-medium text-[#b42318]">
              Form 485 grace period expired — this client was deactivated. A signed Form 485 is required to reactivate.
            </p>
          </div>
        )}

        {canReactivate && (
          <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[#12b76a] bg-[#ecfdf3] px-4 py-3">
            <p className="text-[13px] font-medium text-[#027a48]">
              A signed Form 485 is on file. This client can be activated.
            </p>
            <Button
              size="sm" className="shrink-0"
              onClick={() => onActivateClient?.()}
            >
              Activate client
            </Button>
          </div>
        )}

        {showChecklist && <ClientDocumentChecklist client={client} canUpload={Boolean(onUploadChecklist)} refreshing={refreshing} refreshError={refreshError} onRefresh={onRefresh} onUpload={key => onUploadChecklist?.(key)} onViewFiles={viewFiles} />}
        <div ref={listRef} className="flex flex-col gap-3">
          {documents.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[#dcdfe2] py-12 text-center dark:border-white/15">
              <p className="text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">
                No documents uploaded yet.
              </p>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                tabIndex={-1}
                data-document-key={doc.document.key}
                aria-label={`${doc.title} file ${doc.id + 1}`}
                className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[#eceef0] px-4 py-3 transition-colors hover:bg-[#f8f9fa] focus-visible:outline focus-visible:outline-[#007679] dark:border-white/10 dark:hover:bg-white/5"
              >
                <div aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e0f3f3] text-[#005c5e] dark:bg-[#0f7e7d]/20 dark:text-[#7fd3d3]">
                  <FileText className="h-4 w-4" />
                </div>

                <div className="flex flex-1 flex-wrap items-center justify-between gap-3 min-w-0">
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="truncate text-[14px] font-medium leading-[1.4] text-[#10141a] dark:text-[#f4f6f7]">
                      {doc.title}
                    </p>
                    {typeof doc.document.issuedOnDate === 'string' && doc.document.issuedOnDate && <p className="text-xs text-[#4b535b] break-all dark:text-[#9aa4a8]">Recorded issued date: {doc.document.issuedOnDate}</p>}
                    {typeof doc.document.expiryDate === 'string' && doc.document.expiryDate && <p className="text-xs text-[#4b535b] break-all dark:text-[#9aa4a8]">Recorded expiry date: {doc.document.expiryDate}</p>}
                    {doc.fileName && <p title={doc.fileName} className="truncate text-[12px] text-[#4b535b] dark:text-[#9aa4a8]">{doc.fileName}</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {doc.isForm485 && doc.url ? (
                      <Badge variant={doc.signed ? "success" : "pending"}>
                        {doc.signed ? "Signed" : "Unsigned"}
                      </Badge>
                    ) : null}
                    <Badge variant={doc.variant}>{doc.status}</Badge>
                  {doc.reason && <span className="text-xs text-[#b54708]">{doc.reason}</span>}
                  {onOpenUploadModal && <Button type="button" variant="outline" size="sm" onClick={() => onOpenUploadModal(doc.document)}>Update document</Button>}
                  {doc.url ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPreview({ ...doc.document, title: doc.title, fileName: doc.fileName, url: doc.url })}
                      >
                        View
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <DocumentPreviewModal
        open={preview !== null}
        onOpenChange={(open) => { if (!open) setPreview(null); }}
        title={preview?.title ?? "Document preview"}
        url={preview?.url}
        fileName={preview?.fileName}
      />
    </>
  );
}


