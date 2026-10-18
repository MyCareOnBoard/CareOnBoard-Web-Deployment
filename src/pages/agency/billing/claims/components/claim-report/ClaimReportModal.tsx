import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RecentClaim } from "../../data/mockClaimsDashboardData";
import type { ClaimReportFormState, ClaimSignaturePayload } from "../../data/mockClaimReportData";
import { buildClaimReportFromClaim } from "../../utils/claimReportUtils";
import type { ClaimReportPrefillSnapshot } from "../../utils/claimReportPrefillUtils";
import { downloadClaimReportPdf } from "../../utils/claimReportPrintUtils";
import { normalizeSignaturePayload } from "../../utils/claimReportSignatureUtils";
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
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";
import {
  downloadX12Batch,
  exportClaimsX12,
  getClaimReport,
  updateClaimReport,
  X12ExportError,
  type BillingClaimEdiExport,
  type BillingClaimStatus,
  type ClaimReportFormInput,
  type X12ExportCheck,
} from "@/lib/api/claims";
import { claimX12ButtonText, getClaimX12Action } from "../x12-export/x12ExportUtils";
import ClaimReportActionsFooter from "./ClaimReportActionsFooter";
import {
  applySavedClaimReport,
  buildClaimReportFieldsInput,
} from "../../utils/claimReportSavedFormUtils";

const DigitalSignatureModal = lazy(
  () => import("@/pages/applicant/application/components/DigitalSignature")
);
const EdiSettingsDialog = lazy(() => import("../x12-export/EdiSettingsDialog"));

type SignatureTarget = "signed" | "physician";

type SaveState = "idle" | "loading" | "load-error" | "saving" | "saved" | "error";
type SignatureFields = Pick<ClaimReportFormInput, "patientSignature" | "providerSignature">;
const SIGNATURE_FIELDS = ["patientSignature", "providerSignature"] as const;

const AUTOSAVE_DELAY_MS = 800;

const SAVE_STATE_LABEL: Record<SaveState, string> = {
  idle: "",
  loading: "Loading saved details…",
  "load-error": "Couldn't load the saved details, so changes here won't be saved.",
  saving: "Saving…",
  saved: "Saved",
  error: "Couldn't save. It will try again on your next change.",
};

type ClaimReportModalProps = {
  open: boolean;
  claim: RecentClaim;
  savedClaimId?: string;
  claimNumber?: string;
  initialPrefill: ClaimReportPrefillSnapshot;
  /** Save onset date, signatures and other report fields on the claim (Claims Management). */
  canSave?: boolean;
  /** Claims Management: may create and download this claim's 837P file. */
  canManageClaims?: boolean;
  status?: BillingClaimStatus;
  ediExport?: BillingClaimEdiExport | null;
  /** Called after this claim is put in a new 837P file. */
  onExported?: () => void;
  onClose: () => void;
};

export default function ClaimReportModal({
  open,
  claim,
  savedClaimId,
  claimNumber,
  initialPrefill,
  canSave = false,
  canManageClaims = false,
  status = "pending",
  ediExport = null,
  onExported,
  onClose,
}: ClaimReportModalProps) {
  const { agencyId } = useOperationalAgency();
  const printRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<ClaimReportFormState>(() =>
    buildClaimReportFromClaim(claim, initialPrefill),
  );
  const [signatureTarget, setSignatureTarget] = useState<SignatureTarget | null>(null);
  const [signatureModalEverOpened, setSignatureModalEverOpened] = useState(false);

  const persistId = canSave ? savedClaimId : undefined;
  const [saveState, setSaveState] = useState<SaveState>(savedClaimId ? "loading" : "idle");
  const [locked, setLocked] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const loadedRef = useRef(!savedClaimId);
  // Signatures whose save hasn't succeeded yet; they ride along with the next save.
  const unsavedSignaturesRef = useRef<SignatureFields>({});
  const fieldsDirtyRef = useRef(false);
  const formRef = useRef(form);
  formRef.current = form;
  const saveChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const lastSaveFailedRef = useRef(false);

  // Load what was saved on the claim before (onset date, signatures, conditions).
  useEffect(() => {
    if (!savedClaimId || !agencyId) return;
    const controller = new AbortController();
    loadedRef.current = false;
    setLoadFailed(false);
    setSaveState("loading");
    getClaimReport({ context: { agencyId }, claimId: savedClaimId, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setForm((prev) => applySavedClaimReport(prev, result.reportForm));
        setLocked(result.locked);
        setSaveState("idle");
        loadedRef.current = true;
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        // Saving now would overwrite the saved values with the prefill, so stay read-only.
        setLoadFailed(true);
        setSaveState("load-error");
      });
    return () => controller.abort();
  }, [agencyId, savedClaimId, loadAttempt]);

  const persist = useCallback(
    (payload: ClaimReportFormInput) => {
      if (!persistId || !agencyId || locked || loadFailed) return;
      const body: ClaimReportFormInput = { ...unsavedSignaturesRef.current, ...payload };
      const sent: SignatureFields = {};
      for (const field of SIGNATURE_FIELDS) {
        if (field in body) sent[field] = body[field];
      }
      Object.assign(unsavedSignaturesRef.current, sent);
      setSaveState("saving");
      // Saves run one after another so a later edit never lands before an earlier one.
      saveChainRef.current = saveChainRef.current
        .catch(() => undefined)
        .then(() => updateClaimReport({ context: { agencyId }, claimId: persistId, payload: body }))
        .then(() => {
          for (const field of SIGNATURE_FIELDS) {
            // Keep it if a newer signature replaced it while this save was running.
            if (field in sent && unsavedSignaturesRef.current[field] === sent[field]) {
              delete unsavedSignaturesRef.current[field];
            }
          }
          lastSaveFailedRef.current = false;
          setSaveState("saved");
        })
        .catch((error: unknown) => {
          const code = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
          if (code === "CLAIM_REPORT_LOCKED") {
            setLocked(true);
            setSaveState("idle");
            return;
          }
          lastSaveFailedRef.current = true;
          setSaveState("error");
        });
    },
    [agencyId, loadFailed, locked, persistId],
  );
  const persistRef = useRef(persist);
  persistRef.current = persist;

  const updateForm = useCallback((patch: Partial<ClaimReportFormState>) => {
    if (loadedRef.current) fieldsDirtyRef.current = true;
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const fieldsKey = JSON.stringify(buildClaimReportFieldsInput(form));
  useEffect(() => {
    if (!fieldsDirtyRef.current) return;
    const timer = window.setTimeout(() => {
      // The 837P button may have sent these changes already.
      if (!fieldsDirtyRef.current) return;
      fieldsDirtyRef.current = false;
      persist(buildClaimReportFieldsInput(formRef.current));
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [fieldsKey, persist]);

  // Closing the report unmounts it; send any change still waiting on the autosave delay.
  useEffect(
    () => () => {
      const hasUnsavedSignature = Object.keys(unsavedSignaturesRef.current).length > 0;
      if (!fieldsDirtyRef.current && !hasUnsavedSignature) return;
      fieldsDirtyRef.current = false;
      persistRef.current(buildClaimReportFieldsInput(formRef.current));
    },
    [],
  );

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
      setForm((prev) => ({
        ...prev,
        ...(signatureTarget === "signed"
          ? { signedSignature: normalized }
          : { physicianSignature: normalized }),
      }));
      persist(
        signatureTarget === "signed"
          ? { patientSignature: normalized }
          : { providerSignature: normalized },
      );
      setSignatureTarget(null);
    },
    [persist, signatureTarget]
  );

  const handleDownload = useCallback(async () => {
    if (!printRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadClaimReportPdf(printRef.current, form.clientName);
    } catch {
      console.error("Error generating claim report PDF.");
    } finally {
      setIsDownloading(false);
    }
  }, [form.clientName, isDownloading]);

  const handleSend = useCallback(() => undefined, []);

  const [claimEdiExport, setClaimEdiExport] = useState(ediExport);
  const [x12Busy, setX12Busy] = useState(false);
  const [x12Problem, setX12Problem] = useState<{ message: string; details: X12ExportCheck | null } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const x12Mode = savedClaimId
    ? getClaimX12Action({ canManage: canManageClaims, status, ediExport: claimEdiExport })
    : null;

  const handleX12 = useCallback(async () => {
    if (!agencyId || !savedClaimId || x12Busy) return;
    const context = { agencyId };
    setX12Busy(true);
    setX12Problem(null);
    let created = false;
    try {
      let batch = claimEdiExport?.batchId
        ? {
            id: claimEdiExport.batchId,
            fileName: claimEdiExport.fileName || `837P_${claimEdiExport.controlNumber ?? claimEdiExport.batchId}.x12`,
          }
        : null;
      if (!batch) {
        // The file is built from what is saved on the claim, so send pending edits first.
        if (fieldsDirtyRef.current || Object.keys(unsavedSignaturesRef.current).length > 0) {
          fieldsDirtyRef.current = false;
          persist(buildClaimReportFieldsInput(formRef.current));
        }
        await saveChainRef.current;
        if (lastSaveFailedRef.current) {
          setX12Problem({ message: "Couldn't save your latest changes, so no 837P file was made. Try again.", details: null });
          return;
        }
        const result = await exportClaimsX12({ context, claimIds: [savedClaimId] });
        batch = result.batch;
        created = true;
        setClaimEdiExport({
          batchId: result.batch.id,
          controlNumber: result.batch.interchangeControlNumber,
          usageIndicator: result.batch.usageIndicator,
          exportedAt: result.batch.createdAt,
          fileName: result.batch.fileName,
        });
        setLocked(true);
        onExported?.();
      }
      await downloadX12Batch({ context, batch });
    } catch (error) {
      if (error instanceof X12ExportError) {
        setX12Problem({ message: error.message, details: error.details });
      } else {
        setX12Problem({
          message: created || claimEdiExport?.batchId
            ? "Couldn't download the 837P file. Try again."
            : "Couldn't create the 837P file. Try again.",
          details: null,
        });
      }
    } finally {
      setX12Busy(false);
    }
  }, [agencyId, claimEdiExport, onExported, persist, savedClaimId, x12Busy]);

  const x12Action = x12Mode
    ? {
        ...claimX12ButtonText({ mode: x12Mode, busy: x12Busy, ediExport: claimEdiExport }),
        busy: x12Busy,
        onClick: () => void handleX12(),
      }
    : null;
  const pdfAction = {
    label: isDownloading ? "Creating PDF…" : "Download claim form (PDF)",
    detail: "CMS-1500 style, for printing or records",
    busy: isDownloading,
    onClick: () => void handleDownload(),
  };

  const footerStatus = locked ? (
    <p role="status">This claim is already in an 837P file, so changes here are not saved.</p>
  ) : persistId && SAVE_STATE_LABEL[saveState] ? (
    <p
      className={saveState === "error" || saveState === "load-error" ? "text-[#d92d20]" : undefined}
      role="status"
      aria-live="polite"
    >
      {SAVE_STATE_LABEL[saveState]}
      {saveState === "load-error" ? (
        <button
          type="button"
          onClick={() => setLoadAttempt((attempt) => attempt + 1)}
          className="ml-2 font-medium underline"
        >
          Try again
        </button>
      ) : null}
    </p>
  ) : null;

  const x12Details = x12Problem?.details;
  const x12Notice = x12Problem ? (
    <div role="alert" className="claim-report-no-print rounded-[10px] bg-[#fef3f2] px-4 py-3 text-[14px] text-[#b42318]">
      <p className="font-medium">{x12Problem.message}</p>
      {x12Details?.settingsErrors.length ? (
        <div className="mt-2">
          <ul className="list-disc space-y-1 pl-5">
            {x12Details.settingsErrors.map((issue, index) => (
              <li key={`settings-${index}`}>{issue.message}</li>
            ))}
          </ul>
          <button type="button" onClick={() => setSettingsOpen(true)} className="mt-2 font-medium underline">
            Open 837P settings
          </button>
        </div>
      ) : null}
      {x12Details?.claimErrors.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {x12Details.claimErrors.map((issue, index) => (
            <li key={`claim-${index}`}>{issue.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  ) : null;

  const openSignedSignature = useCallback(() => openSignature("signed"), [openSignature]);
  const openPhysicianSignature = useCallback(() => openSignature("physician"), [openSignature]);
  const clearSignedSignature = useCallback(() => {
    setForm((prev) => ({ ...prev, signedSignature: null }));
    persist({ patientSignature: null });
  }, [persist]);
  const clearPhysicianSignature = useCallback(() => {
    setForm((prev) => ({ ...prev, physicianSignature: null }));
    persist({ providerSignature: null });
  }, [persist]);

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
              <DialogDescription className="sr-only">
                Review claim details, add signatures, download, or send the report.
              </DialogDescription>
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
                onUpdate={updateForm}
                onOpenPhysicianSignature={openPhysicianSignature}
                onClearPhysicianSignature={clearPhysicianSignature}
              />
            </div>
          </div>

          {/* Outside the print root, so the PDF never includes it. */}
          <ClaimReportActionsFooter
            status={footerStatus}
            notice={x12Notice}
            pdf={pdfAction}
            x12={x12Action}
            onSend={handleSend}
            onClose={onClose}
          />
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

      {settingsOpen ? (
        <Suspense fallback={null}>
          <EdiSettingsDialog
            open
            onClose={() => setSettingsOpen(false)}
            onSaved={() => setX12Problem(null)}
          />
        </Suspense>
      ) : null}
    </>
  );
}
