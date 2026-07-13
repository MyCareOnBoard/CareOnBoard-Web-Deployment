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
      return { label: "Confirmation pending", className: "bg-[rgba(37,99,235,0.08)] text-[#2563eb]" };
    case "expired":
      return { label: "Link expired", className: "bg-[rgba(245,158,11,0.12)] text-[#b45309]" };
    case "failed":
      return { label: "Delivery failed", className: "bg-[rgba(213,52,17,0.08)] text-[#d53411]" };
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
  const documentByType = new Map(documents.map((document) => [document.type, document]));
  const isAdvancingStage = actionLoading === "advance-documents-stage";

  const getStatusClasses = (status: ApplicantDocumentItem["status"]) => {
    switch (status) {
      case "verified":
        return "bg-[rgba(14,175,82,0.1)] text-[#0eaf52]";
      case "rejected":
        return "bg-[rgba(213,52,17,0.08)] text-[#d53411]";
      case "uploaded":
        return "bg-[rgba(37,99,235,0.08)] text-[#2563eb]";
      default:
        return "bg-[rgba(128,128,129,0.08)] text-[#808081]";
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
      <div className="backdrop-blur-[8px] bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] rounded-[30px] px-4 py-4 md:px-6 md:py-5 space-y-3">
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
              className="rounded-[20px] bg-[rgba(255,255,255,0.8)] px-4 py-3"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-[60px] w-[52.5px] items-center justify-center rounded-[8px] bg-white shadow-sm">
                    <svg
                      className="h-6 w-6 text-[#808081]"
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
                    <span className="block text-[15px] font-medium text-[#10141a]">
                      {definition.label}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize ${getStatusClasses(status)}`}
                      >
                        {getStatusLabel(status)}
                      </span>
                      {!hasDocument && (
                        <span className="text-[12px] text-[#808081]">
                          Awaiting upload from applicant
                        </span>
                      )}
                      {document?.note && status === "rejected" && (
                        <span className="text-[12px] text-[#d53411]">
                          {document.note}
                        </span>
                      )}
                      {hasDocument && document?.expiryDate && (
                        <span className="text-[12px] text-[#808081]">
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
                        asChild
                        variant="outline"
                        className="rounded-[60px] border-[#0eaf52] bg-[rgba(14,175,82,0.1)] px-4 py-[6px] text-[11px] font-semibold text-[#0eaf52] hover:bg-[rgba(14,175,82,0.15)]"
                      >
                        <a href={url} target="_blank" rel="noreferrer">
                          View Document
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => onVerifyDocument(definition.type)}
                        disabled={isBusy || status === "verified"}
                        className="rounded-[60px] border-[#0eaf52] px-4 py-[6px] text-[11px] font-semibold text-[#0eaf52] hover:bg-[rgba(14,175,82,0.08)] disabled:opacity-60"
                      >
                        {isBusy && actionLoading === definition.type ? "Working..." : status === "verified" ? "Accepted" : "Accept"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => onRejectDocument(definition.type)}
                        disabled={isBusy || status === "rejected" || status === "verified"}
                        className="rounded-[60px] border-[#d53411] px-4 py-[6px] text-[11px] font-semibold text-[#d53411] hover:bg-[rgba(213,52,17,0.06)] disabled:opacity-60"
                      >
                        {isBusy && actionLoading === definition.type ? "Working..." : status === "rejected" ? "Rejected" : "Reject"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => onRequestDocument(definition.type)}
                      disabled={isRequesting}
                      className="rounded-[60px] border-[#2563eb] bg-[rgba(37,99,235,0.08)] px-4 py-[6px] text-[11px] font-semibold text-[#2563eb] hover:bg-[rgba(37,99,235,0.14)] disabled:opacity-60"
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
      <div className="backdrop-blur-[8px] bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] rounded-[30px] px-4 py-4 md:px-6 md:py-6 space-y-4">
        <h3 className="text-[18px] font-semibold text-[#10141a]">
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
                  className="rounded-[20px] bg-[rgba(255,255,255,0.8)] px-4 py-4 space-y-1"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-semibold text-[#10141a]">
                          {ref.name}
                        </p>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${presentation.className}`}>
                          {presentation.label}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#808081]">{ref.relation}</p>
                    </div>

                    {!isConfirmed && (
                      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                        {canSendEmail && (
                          <Button
                            variant="outline"
                            onClick={() => onSendReferenceConfirmation(ref.email)}
                            disabled={isQueued || Boolean(referenceActionLoading)}
                            className="h-8 rounded-[60px] border-[#2563eb] px-3 text-[11px] font-semibold text-[#2563eb] hover:bg-[rgba(37,99,235,0.08)] disabled:opacity-60"
                          >
                            {isQueued || sendLoading ? "Sending..." : "Send Email"}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => onConfirmReferenceManually(ref)}
                          disabled={Boolean(referenceActionLoading)}
                          className="h-8 rounded-[60px] border-[#0eaf52] px-3 text-[11px] font-semibold text-[#087f3e] hover:bg-[rgba(14,175,82,0.08)] disabled:opacity-60"
                        >
                          {confirmLoading ? "Confirming..." : "Manually Confirm"}
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
                    <div className="space-y-1">
                      <p className="text-[#808081]">Mobile</p>
                      <p className="font-medium text-[#10141a]">{ref.mobile || "-"}</p>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-[#808081]">Email</p>
                      <p className="break-words font-medium text-[#10141a]">{ref.email || "-"}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[20px] bg-[rgba(255,255,255,0.8)] px-4 py-5 text-[14px] text-[#808081]">
            No references have been submitted yet.
          </div>
        )}
      </div>
      {showAdvanceDocumentsAction && (
        <div className="flex justify-end">
          <Button
            onClick={onAdvanceDocumentsStage}
            disabled={!canAdvanceDocumentsStage || isAdvancingStage}
            className="rounded-[60px] bg-[#00B4B8] text-white hover:bg-[#009ca0] disabled:opacity-60"
          >
            {isAdvancingStage ? "Sending..." : "Send Conditional Hire Letter"}
          </Button>
        </div>
      )}
    </div>
  );
}
