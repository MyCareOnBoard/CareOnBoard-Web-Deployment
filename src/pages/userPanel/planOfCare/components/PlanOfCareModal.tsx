import { memo } from "react";
import { format, isValid, parseISO } from "date-fns";
import { ExternalLink, FileText, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PlanOfCare } from "../types";
import { PlanOfCareClientAvatar } from "./PlanOfCareClientAvatar";
import { isAllowedStorageUrl } from "../utils/storageUrl";
import {
  MODAL_BODY,
  MODAL_HEADER,
  MODAL_HEADER_ACTIONS,
  MODAL_HEADER_ICON_BTN,
  MODAL_HEADER_ICON_BTN_CLOSE,
  MODAL_MAX_WIDTH,
  MODAL_META_CARD,
  MODAL_PDF_FRAME,
  MODAL_SHELL,
  MODAL_SKELETON,
  MODAL_TITLE,
  SECTION_SUBTITLE,
} from "../planOfCareStyles";

interface PlanOfCareModalProps {
  open: boolean;
  isLoading: boolean;
  plan: PlanOfCare | null;
  onClose: () => void;
}

function formatDisplayDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  const isoParsed = parseISO(trimmed);
  if (isValid(isoParsed)) {
    return format(isoParsed, "MMM d, yyyy");
  }
  const fallback = new Date(trimmed);
  if (isValid(fallback)) {
    return format(fallback, "MMM d, yyyy");
  }
  return trimmed;
}

function PlanOfCareModalSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className={`${MODAL_SKELETON} ${MODAL_PDF_FRAME} rounded-xl`} />
      <p className="text-[14px] font-medium text-[#808081] text-center">
        Loading document…
      </p>
    </div>
  );
}

function PlanOfCareModalInner({
  open,
  isLoading,
  plan,
  onClose,
}: PlanOfCareModalProps) {
  const displayName = plan?.clientName || "Client";
  const docTitle = plan?.planOfCare?.title?.trim() || "Plan of care";
  const expiryLabel = formatDisplayDate(plan?.planOfCare?.expiryDate);

  const pdfUrl = plan?.planOfCare?.url;
  const safePdfUrl =
    pdfUrl && isAllowedStorageUrl(pdfUrl) ? pdfUrl : undefined;
  const showPdfEmbed =
    open && !isLoading && Boolean(safePdfUrl) && Boolean(plan);

  const handleOpenInNewTab = () => {
    if (!safePdfUrl) return;
    window.open(safePdfUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={`${MODAL_SHELL} ${MODAL_MAX_WIDTH}`}
      >
        <div className={MODAL_HEADER}>
          <div className="flex items-start gap-4 min-w-0 flex-1">
            {plan && (
              <PlanOfCareClientAvatar
                name={displayName}
                imageUrl={plan.clientImage}
                size="modal"
              />
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle className={MODAL_TITLE}>{docTitle}</DialogTitle>
              <p className={`${SECTION_SUBTITLE} mt-0.5 truncate`}>
                {displayName}
                {expiryLabel && (
                  <>
                    <span className="text-[#808081]"> · </span>
                    <span>Expires {expiryLabel}</span>
                  </>
                )}
              </p>
              <DialogDescription className="sr-only">
                Plan of care document for {displayName}
                {expiryLabel ? `, expires ${expiryLabel}` : ""}
              </DialogDescription>
            </div>
          </div>
          <div className={MODAL_HEADER_ACTIONS}>
            {safePdfUrl && (
              <button
                type="button"
                aria-label="Open plan of care in new tab"
                onClick={handleOpenInNewTab}
                className={MODAL_HEADER_ICON_BTN}
              >
                <ExternalLink className="h-[18px] w-[18px] stroke-[1.75]" />
              </button>
            )}
            <button
              type="button"
              aria-label="Close plan of care"
              onClick={onClose}
              className={MODAL_HEADER_ICON_BTN_CLOSE}
            >
              <X className="h-[18px] w-[18px] stroke-[1.75]" />
            </button>
          </div>
        </div>

        <div className={MODAL_BODY}>
          {isLoading && <PlanOfCareModalSkeleton />}

          {!isLoading && plan && (
            <div className="flex flex-1 flex-col min-h-0">
              {showPdfEmbed ? (
                <div className="flex flex-1 min-h-0 overflow-hidden border border-[#e5e5e6] bg-white">
                  <iframe
                    key={safePdfUrl ?? `plan-${plan.clientId}`}
                    src={safePdfUrl}
                    title={plan.planOfCare!.title || "Plan of Care PDF"}
                    className={`${MODAL_PDF_FRAME} border-0`}
                    referrerPolicy="no-referrer"
                    aria-label={
                      plan.planOfCare!.title || "Plan of Care PDF"
                    }
                  />
                </div>
              ) : (
                <div
                  className={`${MODAL_META_CARD} flex flex-col items-center text-center gap-3 py-10 px-4`}
                >
                  <FileText
                    className="w-10 h-10 text-[#808081]"
                    aria-hidden
                  />
                  <div>
                    <p className="text-[16px] font-semibold text-[#10141a]">
                      No document uploaded
                    </p>
                    <p className={`${SECTION_SUBTITLE} mt-2 max-w-md`}>
                      Your agency hasn&apos;t added a plan of care PDF for this
                      client yet. Contact your supervisor if you need one.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isLoading && !plan && (
            <p className="text-[14px] font-medium text-[#808081] text-center py-8">
              Couldn&apos;t load this plan of care. Try closing and opening
              again.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const PlanOfCareModal = memo(PlanOfCareModalInner);
