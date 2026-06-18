import React, { useCallback, useEffect, useRef, useState } from "react";
import { FileUp, Loader2, X } from "lucide-react";
import type { ClientExtractionResponse } from "../../types/clientExtraction";
import { formatGeminiExtractError } from "../../utils/formatGeminiExtractError";
import {
  DOCUMENT_TYPE_LABELS,
  labelForFieldConfidence,
} from "../../utils/documentTypeConstants";
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

const LOW_CONFIDENCE = 0.85;

const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMPORT_MIME = new Set([
  "application/pdf",
  "application/x-pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const DEFAULT_ACCEPT = ".pdf,application/pdf,image/jpeg,image/png,image/webp";

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

export type ImportSlot = { id: string; label: string; accept?: string };

export type DocumentImportDialogProps = {
  triggerLabel: string;
  triggerLabelMobile?: string;
  triggerAriaLabel?: string;
  dialogTitlePick: string;
  /** Body text / popover shown under the pick-step title. */
  pickDescription?: React.ReactNode;
  /** One slot for single-file import (DDD); two for HHA POC + Clinical Assessment. */
  slots: ImportSlot[];
  /** Single-slot panels extract immediately on pick; multi-slot use an explicit Extract button. */
  autoExtractOnPick?: boolean;
  onExtract: (files: Record<string, File>) => Promise<ClientExtractionResponse>;
  onApply: (
    extraction: ClientExtractionResponse,
    ctx: { overwrite: boolean; files: Record<string, File> },
  ) => void;
  /** Returns client-side warnings to show in the review step (typically merge localWarnings). */
  computePreviewWarnings?: (
    extraction: ClientExtractionResponse,
    ctx: { overwrite: boolean; files: Record<string, File> },
  ) => string[];
  /** Files already attached to the target doc slots, shown pre-filled each time the modal opens. */
  initialFiles?: Record<string, File>;
};

type ModalStep = "pick" | "review";

export default function DocumentImportDialog({
  triggerLabel,
  triggerLabelMobile,
  triggerAriaLabel,
  dialogTitlePick,
  pickDescription,
  slots,
  autoExtractOnPick = false,
  onExtract,
  onApply,
  computePreviewWarnings,
  initialFiles,
}: DocumentImportDialogProps) {
  const backToPickRef = useRef<HTMLButtonElement>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("pick");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [extraction, setExtraction] = useState<ClientExtractionResponse | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [previewLocalWarnings, setPreviewLocalWarnings] = useState<string[]>([]);
  const [dragActiveSlot, setDragActiveSlot] = useState<string | null>(null);

  const isSingleAutoExtract = autoExtractOnPick && slots.length === 1;
  const selectedEntries = Object.entries(selectedFiles);
  const selectedCount = selectedEntries.length;

  const resetPickState = useCallback(() => {
    setError(null);
    setExtraction(null);
    setSelectedFiles({});
    setBusy(false);
    setDragActiveSlot(null);
    setPreviewLocalWarnings([]);
  }, []);

  // Pre-fill the slots with any files already attached to the target doc slots
  // so the pick step shows what's there instead of empty pickers.
  const seedInitialFiles = useCallback(() => {
    if (initialFiles && Object.keys(initialFiles).length > 0) {
      setSelectedFiles(initialFiles);
    }
  }, [initialFiles]);

  const openImportModal = useCallback(() => {
    resetPickState();
    seedInitialFiles();
    setModalStep("pick");
    setImportModalOpen(true);
  }, [resetPickState, seedInitialFiles]);

  const closeImportModal = useCallback(() => {
    setImportModalOpen(false);
    setModalStep("pick");
    resetPickState();
  }, [resetPickState]);

  useEffect(() => {
    if (!extraction || selectedCount === 0 || !computePreviewWarnings) {
      setPreviewLocalWarnings([]);
      return;
    }
    setPreviewLocalWarnings(
      computePreviewWarnings(extraction, { overwrite, files: selectedFiles }),
    );
  }, [extraction, selectedFiles, selectedCount, overwrite, computePreviewWarnings]);

  useEffect(() => {
    if (!importModalOpen || modalStep !== "review") return;
    const id = requestAnimationFrame(() => backToPickRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [importModalOpen, modalStep]);

  const runExtract = useCallback(
    async (files: Record<string, File>) => {
      for (const file of Object.values(files)) {
        const validation = validateImportFile(file);
        if (validation) {
          setError(validation);
          return;
        }
      }
      if (Object.keys(files).length === 0) {
        setError("Select at least one document to extract.");
        return;
      }

      setBusy(true);
      setError(null);
      setSelectedFiles(files);
      try {
        const res = await onExtract(files);
        setExtraction(res);
        setModalStep("review");
      } catch (e: unknown) {
        const msg = formatGeminiExtractError(e);
        setError(msg || "We couldn't read that file. Try again or pick a different document.");
      } finally {
        setBusy(false);
      }
    },
    [onExtract],
  );

  const pickSlotFile = useCallback(
    (slotId: string, file: File) => {
      const validation = validateImportFile(file);
      if (validation) {
        setError(validation);
        return;
      }
      setError(null);
      if (isSingleAutoExtract) {
        void runExtract({ [slotId]: file });
        return;
      }
      setSelectedFiles((prev) => ({ ...prev, [slotId]: file }));
    },
    [isSingleAutoExtract, runExtract],
  );

  const removeSlotFile = useCallback((slotId: string) => {
    setSelectedFiles((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
  }, []);

  const backToPick = useCallback(() => {
    setModalStep("pick");
    resetPickState();
    seedInitialFiles();
  }, [resetPickState, seedInitialFiles]);

  const applyImport = useCallback(() => {
    if (!extraction || selectedCount === 0) return;
    onApply(extraction, { overwrite, files: selectedFiles });
    closeImportModal();
  }, [extraction, selectedCount, onApply, overwrite, selectedFiles, closeImportModal]);

  const reviewLines =
    extraction?.warnings
      ?.map((w) => w?.message)
      .filter((line): line is string => Boolean(line && line.trim())) ?? [];
  const lowConfidence =
    extraction?.fieldConfidences?.filter(
      (f) => typeof f.confidence === "number" && f.confidence < LOW_CONFIDENCE,
    ) ?? [];

  // When multiple documents were uploaded, the model returns a single
  // detectedDocumentType; show the uploaded slot labels so users know both were processed.
  const detectedLabel =
    selectedCount > 1
      ? selectedEntries
          .map(([id]) => slots.find((s) => s.id === id)?.label ?? id)
          .join(", ")
      : extraction?.detectedDocumentType != null
        ? DOCUMENT_TYPE_LABELS[extraction.detectedDocumentType] ?? extraction.detectedDocumentType
        : "—";
  const detectedLabelPrefix = selectedCount > 1 ? "Documents processed" : "Detected document";

  const busyMessage =
    selectedCount > 0
      ? `Reading ${selectedEntries
          .map(([, f]) => `${f.name} (${formatFileSize(f.size)})`)
          .join(" and ")}. This usually takes 30-60 seconds.`
      : "Reading document. This usually takes 30-60 seconds.";

  const showDialogReadyHint =
    Boolean(extraction) && reviewLines.length === 0 && lowConfidence.length === 0;

  const handleMainDialogOpenChange = (open: boolean) => {
    if (!open) closeImportModal();
  };

  const singleSlot = slots[0];

  return (
    <>
      <Button
        type="button"
        variant="outline"
        aria-label={triggerAriaLabel ?? triggerLabel}
        className="h-11 min-h-[44px] shrink-0 rounded-[12px] border-[#00b4b8] px-3 text-[#00b4b8] hover:bg-[#e6fafa] sm:px-4"
        onClick={openImportModal}
      >
        <FileUp className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden font-semibold sm:inline">{triggerLabel}</span>
        <span className="font-semibold sm:hidden">{triggerLabelMobile ?? "Import"}</span>
      </Button>

      <Dialog open={importModalOpen} onOpenChange={handleMainDialogOpenChange}>
        <DialogContent className="flex max-h-[90vh] w-[min(96vw,560px)] flex-col gap-4 p-5">
          <DialogHeader className="shrink-0 space-y-1 text-left">
            <DialogTitle className="text-lg font-semibold text-[#10141a]">
              {modalStep === "pick" && dialogTitlePick}
              {modalStep === "review" && "Review extracted information"}
            </DialogTitle>
            {modalStep === "pick" && pickDescription ? pickDescription : null}
            {modalStep === "review" ? (
              <p className="text-[12px] text-muted-foreground">
                {detectedLabelPrefix}:{" "}
                <span className="font-medium text-foreground">{detectedLabel}</span>
              </p>
            ) : null}
          </DialogHeader>

          {/* Announce step changes to assistive tech. */}
          <span className="sr-only" role="status" aria-live="polite">
            {modalStep === "review" ? "Step 2 of 2: Review extracted information" : ""}
          </span>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {modalStep === "pick" ? (
              <div className="space-y-4">
                {isSingleAutoExtract ? (
                  <SingleDropzone
                    accept={singleSlot.accept ?? DEFAULT_ACCEPT}
                    busy={busy}
                    dragActive={dragActiveSlot === singleSlot.id}
                    onDragStateChange={(active) =>
                      setDragActiveSlot(active ? singleSlot.id : null)
                    }
                    onPick={(file) => pickSlotFile(singleSlot.id, file)}
                  />
                ) : (
                  <div className="space-y-3">
                    {slots.map((slot) => (
                      <SlotPicker
                        key={slot.id}
                        slot={slot}
                        file={selectedFiles[slot.id] ?? null}
                        busy={busy}
                        dragActive={dragActiveSlot === slot.id}
                        onDragStateChange={(active) =>
                          setDragActiveSlot(active ? slot.id : null)
                        }
                        onPick={(file) => pickSlotFile(slot.id, file)}
                        onRemove={() => removeSlotFile(slot.id)}
                      />
                    ))}
                    {!busy && selectedCount === 0 ? (
                      <p className="text-[12px] text-[#5c6368]">
                        Select at least one document to continue.
                      </p>
                    ) : null}
                  </div>
                )}

                <div className="space-y-1" aria-live="polite">
                  {busy ? (
                    <p className="text-[12px] text-[#5c6368]">{busyMessage}</p>
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
                    Looks good. Review the form in the wizard, then click Apply to form.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <DialogFooter className="shrink-0 flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2">
            {modalStep === "pick" ? (
              <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 min-h-[44px] w-full sm:w-auto"
                  onClick={() => closeImportModal()}
                >
                  Cancel
                </Button>
                {!isSingleAutoExtract ? (
                  <Button
                    type="button"
                    className="h-11 min-h-[44px] w-full shrink-0 bg-[#00b4b8] hover:bg-[#009ea1] sm:w-auto"
                    onClick={() => void runExtract(selectedFiles)}
                    disabled={busy || selectedCount === 0}
                    aria-label={
                      selectedCount === 0
                        ? "Extract information — select at least one document first"
                        : "Extract information"
                    }
                  >
                    {busy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        Extracting…
                      </>
                    ) : (
                      "Extract information"
                    )}
                  </Button>
                ) : null}
              </div>
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
                  disabled={!extraction || selectedCount === 0}
                >
                  Apply to form
                </Button>
              </div>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SingleDropzone({
  accept,
  busy,
  dragActive,
  onDragStateChange,
  onPick,
}: {
  accept: string;
  busy: boolean;
  dragActive: boolean;
  onDragStateChange: (active: boolean) => void;
  onPick: (file: File) => void;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border transition-all duration-200",
        dragActive && !busy
          ? "border-[#00b4b8] bg-gradient-to-b from-[#e6fafa] to-white shadow-md ring-2 ring-[#00b4b8]/25"
          : "border-[#e2e4e6] bg-gradient-to-b from-[#f8fafb] to-white shadow-sm hover:border-[#00b4b8]/40 hover:shadow-md",
      )}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!busy) onDragStateChange(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!busy) onDragStateChange(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (busy) return;
        const relatedTarget = e.relatedTarget as Node;
        if (!e.currentTarget.contains(relatedTarget)) onDragStateChange(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragStateChange(false);
        if (busy) return;
        const file = e.dataTransfer.files?.[0];
        if (file) onPick(file);
      }}
      role="presentation"
    >
      {dragActive && !busy ? (
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
          type="file"
          accept={accept}
          className="sr-only"
          disabled={busy}
          onChange={(ev) => {
            const file = ev.target.files?.[0];
            ev.target.value = "";
            if (file) onPick(file);
          }}
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
  );
}

function SlotPicker({
  slot,
  file,
  busy,
  dragActive,
  onDragStateChange,
  onPick,
  onRemove,
}: {
  slot: ImportSlot;
  file: File | null;
  busy: boolean;
  dragActive: boolean;
  onDragStateChange: (active: boolean) => void;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const inputId = `client-import-slot-${slot.id}`;
  return (
    <div
      className={cn(
        "relative rounded-2xl border p-3 transition-all duration-200",
        dragActive && !busy
          ? "border-[#00b4b8] bg-[#e6fafa] ring-2 ring-[#00b4b8]/25"
          : "border-[#e2e4e6] bg-gradient-to-b from-[#f8fafb] to-white hover:border-[#00b4b8]/40",
      )}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!busy) onDragStateChange(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!busy) onDragStateChange(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (busy) return;
        const relatedTarget = e.relatedTarget as Node;
        if (!e.currentTarget.contains(relatedTarget)) onDragStateChange(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragStateChange(false);
        if (busy) return;
        const dropped = e.dataTransfer.files?.[0];
        if (dropped) onPick(dropped);
      }}
      role="presentation"
    >
      {dragActive && !busy ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded-[14px] bg-[#00b4b8]/10 text-center backdrop-blur-[1px]"
        >
          <FileUp className="h-6 w-6 text-[#00b4b8]" aria-hidden />
          <p className="text-[13px] font-semibold text-[#00b4b8]">Release to upload</p>
        </div>
      ) : null}
      <p className="mb-2 text-[13px] font-semibold text-[#10141a]">{slot.label}</p>
      {file ? (
        <div className="flex items-center justify-between gap-2 rounded-[10px] border border-[#00b4b8]/30 bg-white px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#10141a]">
            {file.name}
          </span>
          <button
            type="button"
            aria-label={`Remove ${slot.label}`}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#5c6368] hover:bg-[#e6e7e8]"
            onClick={onRemove}
            disabled={busy}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-[#00b4b8]/50 bg-white px-3 py-4 text-[12px] font-medium text-[#00b4b8] transition-colors",
            !busy ? "cursor-pointer hover:bg-[#e6fafa]" : "cursor-not-allowed opacity-75",
          )}
        >
          <input
            id={inputId}
            type="file"
            accept={slot.accept ?? DEFAULT_ACCEPT}
            className="sr-only"
            disabled={busy}
            onChange={(ev) => {
              const picked = ev.target.files?.[0];
              ev.target.value = "";
              if (picked) onPick(picked);
            }}
          />
          <FileUp className="h-4 w-4 shrink-0" aria-hidden />
          Choose file or drop here
        </label>
      )}
    </div>
  );
}
