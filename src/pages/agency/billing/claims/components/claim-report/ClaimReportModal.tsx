import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAgencyById } from "@/lib/api/agencies";
import type { Shift } from "@/lib/api/shifts";
import type { RecentClaim } from "../../data/mockClaimsDashboardData";
import type { ClaimReportFormState, ClaimSignaturePayload } from "../../data/mockClaimReportData";
import { buildClaimReportFromClaim } from "../../utils/claimReportUtils";
import type { ClaimReportPrefillSnapshot } from "../../utils/claimReportPrefillUtils";
import { downloadClaimReportPdf } from "../../utils/claimReportPrintUtils";
import { normalizeSignaturePayload } from "../../utils/claimReportSignatureUtils";
import { useAuth } from "@/utils/auth";
import {
  CLAIM_REPORT_PRINT_ROOT_CLASS,
  CLAIMS_REPORT_MODAL_CLASS,
  CLAIMS_REPORT_MODAL_SHELL_CLASS,
} from "../claimsModalStyles";
import ClaimReportAgreementPanel from "./ClaimReportAgreementPanel";
import ClaimReportLeftColumn from "./ClaimReportLeftColumn";
import ClaimReportServiceTable from "./ClaimReportServiceTable";
import ClaimReportSummaryFooter from "./ClaimReportSummaryFooter";
import "./claimReportPrint.css";

const DigitalSignatureModal = lazy(
  () => import("@/pages/applicant/application/components/DigitalSignature")
);

type SignatureTarget = "signed" | "physician";

type ClaimReportModalProps = {
  open: boolean;
  claim: RecentClaim;
  selectedShifts: Shift[];
  savedClaimId?: string;
  claimNumber?: string;
  initialPrefill: ClaimReportPrefillSnapshot;
  onClose: () => void;
};

export default function ClaimReportModal({
  open,
  claim,
  selectedShifts,
  savedClaimId,
  claimNumber,
  initialPrefill,
  onClose,
}: ClaimReportModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [form, setForm] = useState<ClaimReportFormState>(() =>
    buildClaimReportFromClaim(claim, initialPrefill),
  );
  const [signatureTarget, setSignatureTarget] = useState<SignatureTarget | null>(null);
  const [signatureModalEverOpened, setSignatureModalEverOpened] = useState(false);

  const updateForm = useCallback((patch: Partial<ClaimReportFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    if (!open) return;

    const agencyId = user?.agencyId;
    if (!agencyId) return;

    let cancelled = false;

    getAgencyById(agencyId)
      .then((agency) => {
        if (cancelled) return;

        const nipId = agency.npi?.trim() ?? "";
        const providerId = agency.medicaidProviderId?.trim() ?? "";

        setForm((prev) => ({
          ...prev,
          serviceLines: prev.serviceLines.map((line) => ({
            ...line,
            nipId,
            providerId,
          })),
        }));
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Failed to load agency for claim report:", error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, user?.agencyId]);

  const updateDiagnosis = useCallback((letter: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      diagnosisCodes: { ...prev.diagnosisCodes, [letter]: value },
    }));
  }, []);

  const [isDownloading, setIsDownloading] = useState(false);

  const openSignature = useCallback((target: SignatureTarget) => {
    setSignatureModalEverOpened(true);
    setSignatureTarget(target);
  }, []);

  const handleSignatureSave = useCallback(
    async (payload: { signatureType: string; signatureData: string }) => {
      if (!signatureTarget) return;

      const claimPayload: ClaimSignaturePayload = {
        signatureType: payload.signatureType as ClaimSignaturePayload["signatureType"],
        signatureData: payload.signatureData,
      };
      const normalized = await normalizeSignaturePayload(claimPayload);
      updateForm(
        signatureTarget === "signed"
          ? { signedSignature: normalized }
          : { physicianSignature: normalized }
      );
      setSignatureTarget(null);
    },
    [signatureTarget, updateForm]
  );

  const handleDownload = useCallback(async () => {
    if (!printRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadClaimReportPdf(printRef.current, form.clientName);
    } catch (error) {
      console.error("Error generating claim report PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  }, [form.clientName, isDownloading]);

  const handleSend = useCallback(() => undefined, []);

  const openSignedSignature = useCallback(() => openSignature("signed"), [openSignature]);
  const openPhysicianSignature = useCallback(() => openSignature("physician"), [openSignature]);
  const clearSignedSignature = useCallback(
    () => updateForm({ signedSignature: null }),
    [updateForm]
  );
  const clearPhysicianSignature = useCallback(
    () => updateForm({ physicianSignature: null }),
    [updateForm]
  );

  const blockClaimCloseWhileSigning = useCallback((event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("[data-signature-modal]")) {
      event.preventDefault();
    }
  }, []);

  return (
    <>
      <Dialog
        open={open}
        modal={signatureTarget === null}
        onOpenChange={(value) => {
          if (!value && signatureTarget !== null) return;
          if (!value) onClose();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className={`${CLAIMS_REPORT_MODAL_CLASS} ${CLAIMS_REPORT_MODAL_SHELL_CLASS}`}
          onPointerDownOutside={blockClaimCloseWhileSigning}
          onInteractOutside={blockClaimCloseWhileSigning}
        >
          <div
            id="claim-report-print"
            ref={printRef}
            className={`${CLAIM_REPORT_PRINT_ROOT_CLASS} flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden`}
          >
            <DialogHeader className="w-full shrink-0 items-start space-y-0 pt-6 text-left">
              <div className="flex w-full items-start justify-between gap-4">
                <DialogTitle className="text-left text-[20px] font-bold text-[#10141a] sm:text-[24px]">
                  Claim report
                </DialogTitle>
                {claimNumber ? (
                  <p className="mt-1 text-[14px] font-medium text-[#808081]">
                    {claimNumber} · Pending
                  </p>
                ) : null}
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  className="claim-report-no-print inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center transition-colors"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e5e5e6] bg-[#f5f5f5] text-[#808081] hover:bg-[#eef4f5] active:bg-[#eef4f5]">
                    <X className="h-4 w-4" />
                  </span>
                </button>
              </div>
            </DialogHeader>

            <div key={claim.id} className="claim-report-modal-body flex-1 overflow-x-hidden overflow-y-auto pb-6">
              <div className="claim-report-print-section grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr] lg:gap-0">
                <div className="lg:border-r lg:border-[#e5e5e6] lg:pr-8">
                  <ClaimReportLeftColumn form={form} onUpdate={updateForm} />
                </div>
                <div className="mt-6 lg:mt-0 lg:pl-8">
                  <ClaimReportAgreementPanel
                    form={form}
                    claimId={savedClaimId ?? claim.id}
                    onUpdate={updateForm}
                    onUpdateDiagnosis={updateDiagnosis}
                    onOpenSignedSignature={openSignedSignature}
                    onClearSignedSignature={clearSignedSignature}
                  />
                </div>
              </div>

              <ClaimReportServiceTable serviceLines={form.serviceLines} />

              <ClaimReportSummaryFooter
                form={form}
                claimId={savedClaimId ?? claim.id}
                isDownloading={isDownloading}
                onUpdate={updateForm}
                onDownload={handleDownload}
                onSend={handleSend}
                onOpenPhysicianSignature={openPhysicianSignature}
                onClearPhysicianSignature={clearPhysicianSignature}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {signatureModalEverOpened ? (
        <Suspense fallback={null}>
          <DigitalSignatureModal
            isOpen={signatureTarget !== null}
            setIsOpen={(isOpen) => {
              if (!isOpen) setSignatureTarget(null);
            }}
            skipBackend
            useCase={signatureTarget ? `claim-report-${signatureTarget}` : "claim-report"}
            onSave={handleSignatureSave}
            nested
          />
        </Suspense>
      ) : null}
    </>
  );
}
