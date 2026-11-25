import { useState } from "react";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { Button } from "@/components/ui/button";
import type { ApplicantDocumentItem } from "@/lib/api/agencyApplicantsExtra";

type DocumentDefinition = {
  type: string;
  label: string;
};

export type ReferenceItem = {
  name: string;
  relation: string;
  mobile: string;
  email: string;
  emailConfirmation?: {
    status?: string;
    requestId?: string;
    requestedAt?: string;
    sentAt?: string | null;
    confirmedAt?: string | null;
    expiresAt?: string | null;
    confirmationMethod?: string;
    confirmedBy?: string;
  };
};

function getReferenceConfirmationPresentation(status?: string) {
  switch (status) {
    case "confirmed":
      return { label: "Email confirmed", className: "bg-[rgba(8,127,62,0.1)] text-[#087f3e]" };
    case "pending":
    case "sent":
    case "sending":
      return { label: "Confirmation pending", className: "bg-[#e0f3f3] text-[#005c5e]" };
    case "expired":
      return { label: "Link expired", className: "bg-[rgba(245,158,11,0.12)] text-[#b45309]" };
    case "failed":
      return { label: "Delivery failed", className: "bg-[#fde8e6] text-[#b42318]" };
    default:
      return { label: "Not sent", className: "bg-[rgba(95,99,104,0.08)] text-[#5f6368]" };
  }
}
interface DocumentsTabProps {
  documentDefinitions: readonly DocumentDefinition[];
  documents: ApplicantDocumentItem[];
  getDocumentUrlByType: (type: string) => string | undefined;
  references: ReferenceItem[];
  actionLoading: string | null;
  referenceActionLoading: string | null;
  onSendReferenceConfirmation: (email: string) => void;
  onConfirmReferenceManually: (reference: ReferenceItem) => void;
  onVerifyDocument: (docId: string) => void;
  onRejectDocument: (docId: string) => void;
  onRequestDocument: (docType: string) => void;
  canAdvanceDocumentsStage: boolean;
  showAdvanceDocumentsAction?: boolean;
  onAdvanceDocumentsStage: () => void;
}

export function DocumentsTab({
  documentDefinitions,
  documents,
  getDocumentUrlByType,
  references,
  actionLoading,
  referenceActionLoading,
  onSendReferenceConfirmation,
  onConfirmReferenceManually,
  onVerifyDocument,
  onRejectDocument,
  onRequestDocument,
  canAdvanceDocumentsStage,
  showAdvanceDocumentsAction = true,
  onAdvanceDocumentsStage,
}: DocumentsTabProps) {
  const [preview, setPreview] = useState<{ title: string; url: string; fileName?: string } | null>(null);
  const documentByType = new Map(documents.map((document) => [document.type, document]));
  const isAdvancingStage = actionLoading === "advance-documents-stage";

  const getStatusClasses = (status: ApplicantDocumentItem["status"]) => {
    switch (status) {
      case "verified":
        return "bg-[#e6f6ec] text-[#1a7f37] dark:bg-[#30a46c]/15 dark:text-[#7ee2a8]";
      case "rejected":
        return "bg-[#fde8e6] text-[#b42318] dark:bg-[#ef4444]/15 dark:text-[#f8a1a1]";
      case "uploaded":
        return "bg-[#e0f3f3] text-[#005c5e] dark:bg-[#0f7e7d]/20 dark:text-[#7fd3d3]";
      default:
        return "bg-[#eef0f2] text-[#2a3138] dark:bg-white/10 dark:text-[#c9d1d4]";
    }
  };

  const getStatusLabel = (status: ApplicantDocumentItem["status"]) => {
    switch (status) {
      case "verified":
        return "Accepted";
      case "rejected":
        return "Rejected";
      case "uploaded":
        return "Uploaded";
      default:
        return "Pending";
    }
  };

  const formatExpiryDate = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const parsed = new Date(expiryDate);
    if (Number.isNaN(parsed.getTime())) return expiryDate;
    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Documents list */}
      <div className="rounded-[16px] border border-[#e4e7ea] bg-white p-4 md:p-5 dark:border-white/10 dark:bg-[#1b232b] space-y-3">
        {documentDefinitions.map((definition) => {
          const document = documentByType.get(definition.type);
          const url = getDocumentUrlByType(definition.type);
          const hasDocument = Boolean(url);
          const status = document?.status ?? (hasDocument ? "uploaded" : "pending");
          const isBusy = actionLoading === definition.type;
          const isRequesting = actionLoading === `request-${definition.type}`;

          return (
            <div
              key={definition.type}
              className="rounded-[12px] bg-[#f4f5f6] dark:bg-white/5 px-4 py-3"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white dark:bg-white/10">
                    <svg
                      className="h-5 w-5 text-[#007679] dark:text-[#7fd3d3]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <span className="block text-[15px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
                      {definition.label}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-[6px] px-2 py-0.5 text-[12px] font-medium capitalize ${getStatusClasses(status)}`}
                      >
                        {getStatusLabel(status)}
                      </span>
                      {!hasDocument && (
                        <span className="text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">
                          Awaiting upload from applicant
                        </span>
                      )}
                      {document?.note && status === "rejected" && (
                        <span className="text-[12px] text-[#b42318] dark:text-[#f8a1a1]">
                          {document.note}
                        </span>
                      )}
                      {hasDocument && document?.expiryDate && (
                        <span className="text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">
                          Expiry: {formatExpiryDate(document.expiryDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  {hasDocument ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { if (url) setPreview({ title: definition.label, url, fileName: document?.fileName }); }}
                        className="h-8 rounded-[8px] px-3 text-[13px] font-medium shadow-none disabled:opacity-60 border-[#dcdfe2] bg-white text-[#10141a] hover:bg-[#f4f6f7] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5"
                      >
                        View Document
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => onVerifyDocument(definition.type)}
                        disabled={isBusy || status === "verified"}
                        className="h-8 rounded-[8px] px-3 text-[13px] font-medium shadow-none disabled:opacity-60 border-[#003839] bg-[#003839] text-white hover:bg-[#0b4c4d] hover:text-white dark:border-[#0f7e7d] dark:bg-[#0f7e7d]"
                      >
                        {isBusy && actionLoading === definition.type ? "Working..." : status === "verified" ? "Accepted" : "Accept"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => onRejectDocument(definition.type)}
                        disabled={isBusy || status === "rejected" || status === "verified"}
                        className="h-8 rounded-[8px] px-3 text-[13px] font-medium shadow-none disabled:opacity-60 border-[#f1c4bf] bg-white text-[#b42318] hover:bg-[#fdf2f1] hover:text-[#b42318] dark:border-[#f8a1a1]/30 dark:bg-transparent dark:text-[#f8a1a1]"
                      >
                        {isBusy && actionLoading === definition.type ? "Working..." : status === "rejected" ? "Rejected" : "Reject"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => onRequestDocument(definition.type)}
                      disabled={isRequesting}
                      className="h-8 rounded-[8px] px-3 text-[13px] font-medium shadow-none disabled:opacity-60 border-[#007679] bg-white text-[#007679] hover:bg-[#e0f3f3] hover:text-[#007679] dark:border-[#7fd3d3]/40 dark:bg-transparent dark:text-[#7fd3d3]"
                    >
                      {isRequesting ? "Requesting..." : "Request Document"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* References card */}
      <div className="rounded-[16px] border border-[#e4e7ea] bg-white p-4 md:p-5 dark:border-white/10 dark:bg-[#1b232b] space-y-4">
        <h3 className="text-[18px] font-medium leading-tight text-[#10141a] dark:text-[#f4f6f7]">
          References
        </h3>
        {references.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {references.map((ref, index) => {
              const status = ref.emailConfirmation?.status;
              const presentation = getReferenceConfirmationPresentation(status);
              const emailKey = ref.email.trim().toLowerCase();
              const sendLoading = referenceActionLoading === `send:${emailKey}`;
              const confirmLoading = referenceActionLoading === `confirm:${emailKey}`;
              const isQueued = status === "pending" || status === "sending";
              const isConfirmed = status === "confirmed";
              const canSendEmail = !isConfirmed && status !== "sent";

              return (
                <div
                  key={emailKey || `${ref.name}-${index}`}
                  className="rounded-[12px] bg-[#f4f5f6] dark:bg-white/5 px-4 py-4 space-y-1"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">
                          {ref.name}
                        </p>
                        <span className={`rounded-[6px] px-2 py-0.5 text-[12px] font-medium ${presentation.className}`}>
                          {presentation.label}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">{ref.relation}</p>
                    </div>

                    {!isConfirmed && (
                      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                        {canSendEmail && (
                          <Button
                            variant="outline"
                            onClick={() => onSendReferenceConfirmation(ref.email)}
                            disabled={isQueued || Boolean(referenceActionLoading)}
                            className="h-8 rounded-[8px] px-3 text-[13px] font-medium shadow-none disabled:opacity-60 border-[#007679] bg-white text-[#007679] hover:bg-[#e0f3f3] hover:text-[#007679] dark:border-[#7fd3d3]/40 dark:bg-transparent dark:text-[#7fd3d3]"
                          >
                            {isQueued || sendLoading ? "Sending..." : "Send Email"}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => onConfirmReferenceManually(ref)}
                          disabled={Boolean(referenceActionLoading)}
                          className="h-8 rounded-[8px] px-3 text-[13px] font-medium shadow-none disabled:opacity-60 border-[#dcdfe2] bg-white text-[#10141a] hover:bg-[#f4f6f7] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5"
                        >
                          {confirmLoading ? "Confirming..." : "Manually Confirm"}
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
                    <div className="space-y-1">
                      <p className="text-[#6b737a] dark:text-[#9aa4a8]">Mobile</p>
                      <p className="font-medium text-[#10141a] dark:text-[#f4f6f7]">{ref.mobile || "-"}</p>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-[#6b737a] dark:text-[#9aa4a8]">Email</p>
                      <p className="break-words font-medium text-[#10141a] dark:text-[#f4f6f7]">{ref.email || "-"}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[12px] bg-[#f4f5f6] dark:bg-white/5 px-4 py-5 text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">
            No references have been submitted yet.
          </div>
        )}
      </div>
      {showAdvanceDocumentsAction && (
        <div className="flex justify-end">
          <Button
            onClick={onAdvanceDocumentsStage}
            disabled={!canAdvanceDocumentsStage || isAdvancingStage}
            className="h-10 rounded-[10px] bg-[#003839] px-4 text-[14px] font-semibold text-white hover:bg-[#0b4c4d] disabled:opacity-60 dark:bg-[#0f7e7d]"
          >
            {isAdvancingStage ? "Sending..." : "Send Conditional Hire Letter"}
          </Button>
        </div>
      )}
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
