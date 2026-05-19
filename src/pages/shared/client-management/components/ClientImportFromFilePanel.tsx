import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { FileUp, Info, Loader2 } from "lucide-react";
import { extractClientIspViaApi } from "@/lib/api/gemini";
import type { ClientExtractionResponse, FieldConfidence } from "../types/clientExtraction";
import type { AddClientFormData } from "../types/formData";
import { mergeExtractionDraft } from "../utils/mergeExtractionDraft";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const LOW_CONFIDENCE = 0.85;

const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMPORT_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  isp: "ISP (Individualized Service Plan)",
  poc: "Plan of Care",
  pcpt: "PCPT",
  sdr: "SDR",
  bsp: "Behavior Plan / BSP",
  medicalDocs: "Medical Documents",
  consents: "Consents and Releases",
  unknown: "Not detected",
};

const FIELD_LABELS: Record<string, string> = {
  "stage1.firstName": "First name",
  "stage1.lastName": "Last name",
  "stage1.middleName": "Middle name",
  "stage1.gender": "Gender",
  "stage1.dob": "Date of birth",
  "stage1.medicaidId": "Medicaid ID",
  "stage1.dddId": "DDD ID",
  "stage1.ssn": "Social Security number",
  "stage1.address": "Address",
  "stage1.countyState": "County / state",
  "stage1.zipCode": "ZIP code",
  "stage1.phone": "Phone",
  "stage1.email": "Email",
  "stage1.language": "Language",
  "stage1.communicationMethod": "Communication method",
  "stage2.guardianName": "Guardian name",
  "stage2.guardianRelationship": "Guardian relationship",
  "stage2.guardianEmail": "Guardian email",
  "stage2.guardianPhone": "Guardian phone",
  "stage2.supportCoordinatorName": "Support coordinator name",
  "stage2.supportCoordinatorAgency": "Support coordinator agency",
  "stage2.supportCoordinatorContact": "Support coordinator contact",
  "stage3.medicalConditions": "Medical conditions",
  "stage3.allergies": "Allergies",
  "stage3.dietaryRestrictions": "Dietary restrictions",
  "stage6.emergencyName": "Emergency contact name",
  "stage6.primaryPhone": "Emergency primary phone",
  "stage6.secondaryPhone": "Emergency secondary phone",
  "stage6.hospitalPreference": "Hospital preference",
};

function humanizeLastSegment(path: string): string {
  const seg = path.split(".").pop() ?? path;
  const spaced = seg.replace(/([A-Z])/g, " $1").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function labelForFieldConfidence(f: FieldConfidence): string {
  const p = f.path ?? "";
  return FIELD_LABELS[p] ?? f.label?.trim() ?? humanizeLastSegment(p);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateImportFile(file: File): string | null {
  if (file.size > MAX_IMPORT_BYTES) {
    return `${file.name} is ${formatFileSize(file.size)}. Maximum size is 10 MB. Try a smaller file or compress images.`;
  }
  const mime = (file.type || "").toLowerCase();
  if (!mime || !ALLOWED_IMPORT_MIME.has(mime)) {
    return "Unsupported file type. Use PDF, JPEG, PNG, or WebP.";
  }
  return null;
}

type ModalStep = "pick" | "review";

export default function ClientImportFromFilePanel({
  formData,
  setFormData,
}: {
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const backToPickRef = useRef<HTMLButtonElement>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("pick");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [extraction, setExtraction] = useState<ClientExtractionResponse | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewLocalWarnings, setPreviewLocalWarnings] = useState<string[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);

  const resetPickState = useCallback(() => {
    setError(null);
    setExtraction(null);
    setPendingFile(null);
    setBusy(false);
    setIsDragActive(false);
    setPreviewLocalWarnings([]);
  }, []);

  const openImportModal = useCallback(() => {
    resetPickState();
    setModalStep("pick");
    setImportModalOpen(true);
  }, [resetPickState]);

  const closeImportModal = useCallback(() => {
    setImportModalOpen(false);
    setModalStep("pick");
    resetPickState();
  }, [resetPickState]);

  useEffect(() => {
    if (!extraction || !pendingFile) {
      setPreviewLocalWarnings([]);
      return;
    }
    const { localWarnings } = mergeExtractionDraft(formData, extraction, {
      overwrite,
      importFile: pendingFile,
    });
    setPreviewLocalWarnings(localWarnings);
  }, [extraction, pendingFile, formData, overwrite]);

  useEffect(() => {
    if (!importModalOpen || modalStep !== "review") return;
    const id = requestAnimationFrame(() => backToPickRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [importModalOpen, modalStep]);

  const runExtract = useCallback(async (file: File) => {
    const validation = validateImportFile(file);
    if (validation) {
      setError(validation);
      return;
    }

    setBusy(true);
    setError(null);
    setPendingFile(file);
    try {
      const res = await extractClientIspViaApi(file);
      setExtraction(res);
      setModalStep("review");
    } catch (e: unknown) {
      let msg: string | null = null;
      if (axios.isAxiosError(e)) {
        const data = e.response?.data as { message?: string; error?: string } | undefined;
        msg =
          (typeof data?.message === "string" && data.message) ||
          (typeof data?.error === "string" && data.error) ||
          e.message;
      } else if (e instanceof Error) {
        msg = e.message;
      }
      setError(msg || "We couldn't read that file. Try again or pick a different document.");
    } finally {
      setBusy(false);
    }
  }, []);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!busy && modalStep === "pick") setIsDragActive(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!busy && modalStep === "pick") setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const relatedTarget = e.relatedTarget as Node;
    if (!e.currentTarget.contains(relatedTarget)) {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (busy || modalStep !== "pick") return;
    const file = e.dataTransfer.files?.[0];
    if (file) void runExtract(file);
  };

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (file) void runExtract(file);
  };

  const backToPick = useCallback(() => {
    setModalStep("pick");
    resetPickState();
  }, [resetPickState]);

  const applyImport = useCallback(() => {
    if (!extraction || !pendingFile) return;
    const { formData: merged } = mergeExtractionDraft(formData, extraction, {
      overwrite,
      importFile: pendingFile,
    });
    setFormData(merged);
    closeImportModal();
  }, [extraction, pendingFile, formData, setFormData, overwrite, closeImportModal]);

  const reviewLines = extraction?.warnings?.map((w) => w.message) ?? [];
  const lowConfidence =
    extraction?.fieldConfidences?.filter(
      (f) => typeof f.confidence === "number" && f.confidence < LOW_CONFIDENCE,
    ) ?? [];

  const detectedLabel =
    extraction?.detectedDocumentType != null
      ? DOCUMENT_TYPE_LABELS[extraction.detectedDocumentType] ?? extraction.detectedDocumentType
      : "—";

  const showDialogReadyHint =
    Boolean(extraction) && reviewLines.length === 0 && lowConfidence.length === 0;

  const handleMainDialogOpenChange = (open: boolean) => {
    if (!open) closeImportModal();
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        aria-label="Import from document"
        className="h-11 min-h-[44px] shrink-0 rounded-[12px] border-[#00b4b8] px-3 text-[#00b4b8] hover:bg-[#e6fafa] sm:px-4"
        onClick={openImportModal}
      >
        <FileUp className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden font-semibold sm:inline">Import from document</span>
        <span className="font-semibold sm:hidden">Import</span>
      </Button>

      <Dialog open={importModalOpen} onOpenChange={handleMainDialogOpenChange}>
        <DialogContent className="flex max-h-[90vh] w-[min(96vw,560px)] flex-col gap-4 p-5">
          <DialogHeader className="shrink-0 space-y-1 text-left">
            <DialogTitle className="text-lg font-semibold text-[#10141a]">
              {modalStep === "pick" && "Import from document"}
              {modalStep === "review" && "Review extracted information"}
            </DialogTitle>
            {modalStep === "pick" ? (
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-muted-foreground">
                  Upload an ISP or Plan of Care (PDF, JPEG, PNG, or WebP, up to 10 MB). We&apos;ll extract
                  what we can; you approve before anything is saved.
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="How auto-fill works"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#5c6368] transition-colors hover:bg-[#e6e7e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8]/40"
                    >
                      <Info className="h-4 w-4" aria-hidden />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="bottom"
                    align="end"
                    className="w-[min(90vw,320px)] rounded-xl border border-[#e6e7e8] bg-white p-4 text-[12px] text-[#10141a] shadow-lg"
                  >
                    <p className="mb-1 font-semibold">How auto-fill works</p>
                    <ul className="list-disc space-y-1 pl-4 text-[#5c6368]">
                      <li>Works best with ISPs and Plans of Care.</li>
                      <li>
                        We fill identity, guardian, services, healthcare, goals, and emergency fields
                        when we can read them.
                      </li>
                      <li>
                        The same file is attached under the matching slot in step 3 (Healthcare and
                        Documents).
                      </li>
                      <li>
                        You review every value before saving. Nothing is stored until you click Save on the
                        wizard.
                      </li>
                    </ul>
                  </PopoverContent>
                </Popover>
              </div>
            ) : null}
            {modalStep === "review" ? (
              <>
                <p className="text-[12px] text-muted-foreground">
                  Detected document:{" "}
                  <span className="font-medium text-foreground">{detectedLabel}</span>
                </p>
                {extraction?.sourceDocument?.cached ? (
                  <p className="text-[11px] text-muted-foreground">Reused a recent extraction</p>
                ) : null}
              </>
            ) : null}
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {modalStep === "pick" ? (
              <div className="space-y-4">
                <div
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border transition-all duration-200",
                    isDragActive && !busy
                      ? "border-[#00b4b8] bg-gradient-to-b from-[#e6fafa] to-white shadow-md ring-2 ring-[#00b4b8]/25"
                      : "border-[#e2e4e6] bg-gradient-to-b from-[#f8fafb] to-white shadow-sm hover:border-[#00b4b8]/40 hover:shadow-md",
                  )}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  role="presentation"
                >
                  {isDragActive && !busy ? (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded-[14px] bg-[#00b4b8]/10 px-6 text-center backdrop-blur-[1px]"
                    >
                      <FileUp className="h-8 w-8 text-[#00b4b8]" aria-hidden />
                      <p className="text-[15px] font-semibold text-[#00b4b8]">Release to upload</p>
                      <p className="text-[12px] text-[#5c6368]">PDF, JPG, PNG, or WebP</p>
                    </div>
                  ) : null}
                  <label
                    htmlFor="client-import-file-modal"
                    className={cn(
                      "relative flex w-full flex-col items-center gap-4 px-5 py-10 text-center transition-colors outline-none focus-within:ring-2 focus-within:ring-[#00b4b8]/35 focus-within:ring-offset-2",
                      !busy ? "cursor-pointer" : "cursor-not-allowed opacity-75",
                    )}
                  >
                    <input
                      id="client-import-file-modal"
                      ref={inputRef}
                      type="file"
                      accept=".pdf,application/pdf,image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={busy}
                      onChange={onPickFile}
                    />
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00b4b8]/12 text-[#00b4b8] ring-1 ring-[#00b4b8]/15">
                      {busy ? (
                        <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
                      ) : (
                        <FileUp className="h-7 w-7" aria-hidden />
                      )}
                    </div>
                    <div className="max-w-[18rem] space-y-1">
                      <p className="text-[16px] font-semibold text-[#10141a]">Drop file here</p>
                      <p className="text-[13px] leading-snug text-[#5c6368]">
                        or browse from your device{busy ? ". Reading your document…" : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {(["PDF", "JPG", "PNG", "WebP"] as const).map((label) => (
                        <span
                          key={label}
                          className="rounded-full border border-[#e6e7e8] bg-white/80 px-2.5 py-1 text-[11px] font-medium tabular-nums text-[#5c6368] shadow-[0_1px_2px_rgba(16,20,26,0.04)]"
                        >
                          {label}
                        </span>
                      ))}
                      <span className="rounded-full border border-[#e6e7e8] bg-white/80 px-2.5 py-1 text-[11px] font-medium text-[#5c6368] shadow-[0_1px_2px_rgba(16,20,26,0.04)]">
                        Max 10 MB
                      </span>
                    </div>
                    {!busy ? (
                      <span className="inline-flex items-center rounded-[60px] border border-[#00b4b8] bg-white px-5 py-2.5 text-sm font-semibold text-[#00b4b8] shadow-sm ring-offset-background transition-colors group-hover:bg-[#e6fafa]">
                        Choose file
                      </span>
                    ) : null}
                  </label>
                </div>

                <div className="space-y-1" aria-live="polite">
                  {busy && pendingFile ? (
                    <p className="text-[12px] text-[#5c6368]">
                      Reading document. This usually takes 30-60 seconds. {pendingFile.name} —{" "}
                      {formatFileSize(pendingFile.size)}
                    </p>
                  ) : null}
                  {error ? (
                    <p className="text-[12px] font-medium text-red-600" role="alert">
                      {error}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {modalStep === "review" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="import-overwrite-modal"
                    checked={overwrite}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setOverwrite(e.target.checked)
                    }
                    label="Replace fields I've already filled in"
                    labelClassName="text-[13px] font-normal"
                  />
                </div>

                {previewLocalWarnings.length > 0 ? (
                  <div>
                    <p className="mb-1 text-[12px] font-semibold">Things to check before saving</p>
                    <div className="max-h-[120px] overflow-y-auto rounded-md border border-amber-200 bg-amber-50/80 p-2">
                      <ul className="list-disc space-y-1 pl-4 text-[12px] text-amber-950">
                        {previewLocalWarnings.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}

                {reviewLines.length > 0 ? (
                  <div>
                    <p className="mb-1 text-[12px] font-semibold">Notes from the document</p>
                    <div className="max-h-[120px] overflow-y-auto rounded-md border p-2">
                      <ul className="list-disc space-y-1 pl-4 text-[12px]">
                        {reviewLines.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}

                {lowConfidence.length > 0 ? (
                  <div>
                    <p className="mb-1 text-[12px] font-semibold">Please double-check these</p>
                    <div className="max-h-[140px] overflow-y-auto rounded-md border p-2">
                      <ul className="space-y-1 text-[11px]">
                        {lowConfidence.map((f, i) => {
                          const label = labelForFieldConfidence(f);
                          const pct = Math.round((f.confidence ?? 0) * 100);
                          return (
                            <li
                              key={i}
                              title={f.path}
                              aria-label={f.path ? `${f.path}: ${pct}%` : undefined}
                            >
                              <span className="font-medium">{label}</span> — {pct}%
                              {f.valuePreview ? `: ${f.valuePreview}` : ""}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                ) : null}

                {showDialogReadyHint ? (
                  <p className="rounded-md border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-[12px] text-emerald-950">
                    Looks good. Review the form in the wizard, then click Use this data.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <DialogFooter className="shrink-0 flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2">
            {modalStep === "pick" ? (
              <Button
                type="button"
                variant="ghost"
                className="h-11 min-h-[44px] w-full sm:w-auto"
                onClick={() => closeImportModal()}
              >
                Cancel
              </Button>
            ) : null}

            {modalStep === "review" ? (
              <div className="flex w-full flex-row items-center justify-between gap-3">
                <button
                  ref={backToPickRef}
                  type="button"
                  className={cn(buttonVariants({ variant: "ghost" }), "h-11 min-h-[44px] shrink-0")}
                  onClick={backToPick}
                >
                  Back
                </button>
                <Button
                  type="button"
                  className="h-11 min-h-[44px] shrink-0 bg-[#00b4b8] hover:bg-[#009ea1]"
                  onClick={applyImport}
                  disabled={!extraction || !pendingFile}
                >
                  Use this data
                </Button>
              </div>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
