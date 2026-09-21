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
      {requestedSlot&&<div ref={focusRef} tabIndex={-1} className="mt-4 rounded-xl border border-primary/30 bg-background p-4"><p className="font-semibold">Selected document: {requestedSlot.toUpperCase()}</p><p className="my-2 text-sm text-muted-foreground">Review the current file and dates below.</p>{safeDocuments.some(({document})=>document.key===requestedSlot&&clientDocumentUrl(document.url))?<Button variant="outline" onClick={()=>{const doc=safeDocuments.find(({document})=>document.key===requestedSlot&&clientDocumentUrl(document.url))?.document;if(doc)setPreview(doc);}}>View selected document</Button>:onUploadChecklist?<Button onClick={()=>onUploadChecklist(requestedSlot as ChecklistRow['key'])}>Upload required document</Button>:<p className="text-sm">No file recorded. Ask your agency administrator to upload it.</p>}</div>}
      <div className="mt-4 backdrop-blur bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] rounded-[30px] p-[20px] flex flex-col gap-[24px] overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-[4px]">
            <p className="text-[24px] font-medium leading-[normal] text-[#10141a]">
              Documents
            </p>
            <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
              Here are your uploaded documents
            </p>
          </div>
          {onOpenUploadModal && <Button
            className="h-11 rounded-[60px] bg-[#00b4b8] text-white hover:bg-[#00a0a4] px-6 shrink-0"
            onClick={() => {
              if (onOpenUploadModal) {
                onOpenUploadModal();
              }
            }}
          >
            <Plus className="w-5 h-5 mr-2" />
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
              className="h-9 shrink-0 rounded-[60px] bg-[#12b76a] px-5 text-white hover:bg-[#039855]"
              onClick={() => onActivateClient?.()}
            >
              Activate client
            </Button>
          </div>
        )}

        {showChecklist && <ClientDocumentChecklist client={client} canUpload={Boolean(onUploadChecklist)} refreshing={refreshing} refreshError={refreshError} onRefresh={onRefresh} onUpload={key => onUploadChecklist?.(key)} onViewFiles={viewFiles} />}
        <div ref={listRef} className="flex flex-col gap-3">
          {documents.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-[14px] font-medium text-[#808081]">
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
                className="backdrop-blur-[20px] rounded-[20px] flex flex-wrap items-center gap-[16px] focus-visible:outline focus-visible:outline-[#00b4b8]"
              >
                <div className="w-[52.5px] h-[60px] rounded-[8px] bg-white flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-[#00b4b8]" />
                </div>

                <div className="flex flex-1 flex-wrap items-center justify-between gap-3 min-w-0">
                  <div className="flex flex-col gap-1 min-w-0">
                    <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a] truncate">
                      {doc.title}
                    </p>
                    {typeof doc.document.issuedOnDate === 'string' && doc.document.issuedOnDate && <p className="text-xs text-[#808081] break-all">Recorded issued date: {doc.document.issuedOnDate}</p>}
                    {typeof doc.document.expiryDate === 'string' && doc.document.expiryDate && <p className="text-xs text-[#808081] break-all">Recorded expiry date: {doc.document.expiryDate}</p>}
                    {doc.fileName && <p title={doc.fileName} className="text-[12px] font-medium text-[#808081] truncate">{doc.fileName}</p>}
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


