import { memo } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CloseButton, SIDE_PANEL_OVERLAY, StatusPill } from "@/pages/userPanel/records/RecordsKit";
import type { PlanOfCare } from "../types";
import { isAllowedStorageUrl } from "../utils/storageUrl";
import { formatDate, PLAN_STATUS_LABEL, PLAN_STATUS_TONE, planStatus } from "../planOfCareView";

interface PlanOfCareModalProps {
  open: boolean;
  plan: PlanOfCare;
  /** The short id ("ABC123") for field staff; the name only for support coordinators. */
  clientLabel: string;
  onClose: () => void;
}

const PDF_FRAME = "h-[58dvh] w-full sm:h-[68dvh] lg:h-[72dvh]";

function PlanOfCareModalInner({ open, plan, clientLabel, onClose }: PlanOfCareModalProps) {
  const docTitle = plan.planOfCare?.title?.trim() || "Plan of care";
  const expiry = formatDate(plan.planOfCare?.expiryDate);
  const issued = formatDate(plan.planOfCare?.issuedOnDate);
  const status = planStatus(plan);
  const pdfUrl = plan.planOfCare?.url;
  const safePdfUrl = pdfUrl && isAllowedStorageUrl(pdfUrl) ? pdfUrl : undefined;
  const details = [clientLabel, issued && `Issued ${issued}`, expiry && `${status === "expired" ? "Expired" : "Expires"} ${expiry}`].filter(Boolean).join(" · ");

  return <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
    <DialogContent showCloseButton={false} overlayClassName={SIDE_PANEL_OVERLAY}
      className="flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-4xl flex-col gap-0 overflow-hidden rounded-[16px] border-0 bg-white p-0 sm:max-w-4xl dark:bg-[#1b232b]">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#edf1f2] px-5 py-4 dark:border-white/10">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="truncate text-[18px] font-bold text-[#10141a] dark:text-[#f4f6f7]">{docTitle}</DialogTitle>
            <StatusPill label={PLAN_STATUS_LABEL[status]} tone={PLAN_STATUS_TONE[status]} />
          </div>
          <DialogDescription className="mt-0.5 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">{details}</DialogDescription>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {safePdfUrl && <button type="button" aria-label="Open plan of care in new tab" onClick={() => window.open(safePdfUrl, "_blank", "noopener,noreferrer")}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-[#e3e8ea] text-[#10141a] transition-colors hover:bg-[#f3f5f6] dark:border-white/15 dark:text-[#f4f6f7] dark:hover:bg-white/5">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </button>}
          <CloseButton label="Close plan of care" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        {safePdfUrl ? <iframe key={safePdfUrl} src={safePdfUrl} title={docTitle} referrerPolicy="no-referrer"
            className={`${PDF_FRAME} rounded-[8px] border border-[#e3e8ea] bg-white dark:border-white/10`} />
          : <div className="mx-auto flex max-w-[420px] flex-col items-center py-14 text-center">
            <FileText className="h-10 w-10 text-[#8a979d]" strokeWidth={1.5} aria-hidden="true" />
            <p className="mt-3 text-base font-semibold text-[#5d6b73] dark:text-[#c9d3d6]">No document uploaded</p>
            <p className="mt-1.5 text-[13px] text-[#8a979d] dark:text-[#9aa4a8]">Your agency hasn&apos;t added a plan of care for this client yet. Contact your supervisor if you need one.</p>
          </div>}
      </div>
    </DialogContent>
  </Dialog>;
}

export const PlanOfCareModal = memo(PlanOfCareModalInner);
