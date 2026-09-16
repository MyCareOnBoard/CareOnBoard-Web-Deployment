import React, { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Plus } from "lucide-react";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { Client, ClientDocument, ChecklistRow } from "@/lib/api/clients";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  isForm485Required,
  form485GraceInfo,
} from "@/pages/shared/client-management/utils/form485GenerationEligibility";

import { ClientDocumentChecklist, checklistEntryDisplay, usableClientDocuments, clientDocumentUrl } from '@/pages/shared/client-details/components/ClientDocumentChecklist';

export function DocumentsTab({
  client,
  showChecklist = false, refreshing = false, refreshError = null, onRefresh = () => {}, onUploadChecklist,
  onOpenUploadModal,
  readOnly = false,
}: {
  client: Client;
  showChecklist?: boolean;
  refreshing?: boolean;
  refreshError?: string | null;
  onRefresh?: () => void;
  onUploadChecklist?: (key: ChecklistRow['key']) => void;
  onOpenUploadModal?: (document?: ClientDocument) => void;
  readOnly?: boolean;
}) {
  const [preview, setPreview] = useState<{
    title: string;
    fileName?: string;
    url: string;
  } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => setPreview(null), [client]);
  const safeDocuments = usableClientDocuments(client.documents);
  const safeClient = { ...client, documents: safeDocuments.map(({ document }) => ({ ...document, url: typeof document.url === 'string' ? document.url : undefined })) };
  const grace = form485GraceInfo(safeClient);
  const viewFiles = (key: ChecklistRow['key']) => {
    const row = listRef.current?.querySelector<HTMLElement>(`[data-document-key="${key}"]`);
    row?.focus(); row?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  };
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
        {!readOnly && onOpenUploadModal && (
        <Button
          className="h-11 rounded-[60px] bg-[#00b4b8] text-white hover:bg-[#00a0a4] px-6 shrink-0"
          onClick={() => {
            if (onOpenUploadModal) {
              onOpenUploadModal();
            }
          }}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Document
        </Button>
        )}
      </div>

      {isForm485Required(safeClient) && (
        <div className="rounded-[12px] border border-[#fdb022] bg-[#fffaeb] px-4 py-3">
          <p className="text-[13px] font-medium text-[#b54708]">
            Form 485 required to activate this client. Ask your agency administrator to upload the signed copy.
          </p>
        </div>
      )}

      {grace.state === "unsigned-grace" && (
        <div className="rounded-[12px] border border-[#fdb022] bg-[#fffaeb] px-4 py-3">
          <p className="text-[13px] font-medium text-[#b54708]">
            Active on an <strong>unsigned</strong> Form 485.{" "}
            {grace.deadline
              ? `Signed copy due by ${formatDeadline(grace.deadline)}${
                  typeof grace.daysLeft === "number"
                    ? ` (${grace.daysLeft} day${grace.daysLeft === 1 ? "" : "s"} left)`
                    : ""
                }.`
              : "A signed copy is required to keep the client active."}
          </p>
        </div>
      )}

      {grace.state === "expired" && (
        <div className="rounded-[12px] border border-[#f97066] bg-[#fef3f2] px-4 py-3">
          <p className="text-[13px] font-medium text-[#b42318]">
            Form 485 grace period expired — this client was deactivated. A signed
            Form 485 is required to reactivate.
          </p>
        </div>
      )}

      {showChecklist && <ClientDocumentChecklist client={client} canUpload={!readOnly && Boolean(onUploadChecklist)} refreshing={refreshing} refreshError={refreshError} onRefresh={onRefresh} onUpload={key => onUploadChecklist?.(key)} onViewFiles={viewFiles} />}
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
                  {doc.fileName ? (
                    <p className="text-[12px] font-medium leading-[1.4] text-[#808081] truncate">
                      {doc.fileName}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {doc.isForm485 && doc.url ? (
                    <Badge variant={doc.signed ? "success" : "pending"}>
                      {doc.signed ? "Signed" : "Unsigned"}
                    </Badge>
                  ) : null}
                  <Badge variant={doc.variant}>{doc.status}</Badge>
                  {doc.reason && <span className="text-xs text-[#b54708]">{doc.reason}</span>}
                  {!readOnly && onOpenUploadModal && <Button type="button" variant="outline" size="sm" onClick={() => onOpenUploadModal(doc.document)}>Update document</Button>}
                  {doc.url ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPreview({
                        title: doc.title,
                        fileName: doc.fileName,
                        url: doc.url!,
                      })}
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
      <DocumentPreviewModal
        open={preview !== null}
        onOpenChange={(open) => { if (!open) setPreview(null); }}
        title={preview?.title ?? "Document preview"}
        url={preview?.url}
        fileName={preview?.fileName}
      />
    </div>
  );
}


