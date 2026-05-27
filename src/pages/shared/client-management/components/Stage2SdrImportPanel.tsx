import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileUp, Info, Loader2 } from "lucide-react";
import { extractSdrDocumentViaApi } from "@/lib/api/gemini";
import type { ClientExtractionResponse } from "../types/clientExtraction";
import type { AddClientFormData } from "../types/formData";
import { formatGeminiExtractError } from "../utils/formatGeminiExtractError";
import {
  applySdrImportToWizard,
  buildSdrImportPreview,
  formatSdrPatchSummary,
} from "../utils/mergeSdrExtraction";
import {
  buildSdrExtractionContext,
  wizardHasAnchorServices,
} from "../utils/sdrImportAvailableServices";
import {
  buildExpectedClientIdentityJson,
  hasClientIdentityAnchors,
} from "../utils/sdrExpectedClientIdentity";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

const IDENTITY_FIELD_LABELS: Record<string, string> = {
  dddId: "DDD ID",
  medicaidId: "Medicaid ID",
  name: "Name",
};

const IDENTITY_WARNING_CODES = new Set([
  "SDR_CLIENT_IDENTITY_MISMATCH",
  "SDR_CLIENT_IDENTITY_PARTIAL_MISMATCH",
  "SDR_CLIENT_IDENTITY_INCONCLUSIVE",
]);

function formatIdentityFieldLabel(field: string): string {
  return IDENTITY_FIELD_LABELS[field] ?? field;
}

function findIdentityWarning(extraction: ClientExtractionResponse | null, code: string) {
  return extraction?.warnings?.find((w) => w.code === code);
}

type ModalStep = "pick" | "review";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
};

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

export function Stage2SdrImportPanel({ open, onOpenChange, formData, setFormData }: Props) {
  const [modalStep, setModalStep] = useState<ModalStep>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [overwrite, setOverwrite] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ClientExtractionResponse | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const { toast } = useToast();

  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backToPickRef = useRef<HTMLButtonElement>(null);

  const preview = useMemo(
    () =>
      extraction
        ? buildSdrImportPreview(extraction, formData.stage2.outcomes, { overwrite })
        : null,
    [extraction, overwrite, formData.stage2.outcomes],
  );

  const availableServicesJson = useMemo(
    () => buildSdrExtractionContext(formData.stage2.outcomes),
    [formData.stage2.outcomes],
  );

  const expectedClientIdentityJson = useMemo(
    () => buildExpectedClientIdentityJson(formData.stage1),
    [
      formData.stage1.firstName,
      formData.stage1.lastName,
      formData.stage1.medicaidId,
      formData.stage1.dddId,
    ],
  );

  const stage1HasIdentityAnchors = useMemo(
    () => hasClientIdentityAnchors(formData.stage1),
    [formData.stage1],
  );

  const bootstrapMode = !wizardHasAnchorServices(formData.stage2.outcomes);

  const resetPickState = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setModalStep("pick");
    setFile(null);
    setError(null);
    setLoading(false);
    setExtraction(null);
    setIsDragActive(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  useEffect(() => {
    if (!open) resetPickState();
    else setModalStep("pick");
  }, [open, resetPickState]);

  useEffect(() => {
    if (!open || modalStep !== "review") return;
    const id = requestAnimationFrame(() => backToPickRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, modalStep]);

  async function handleExtract(selected: File) {
    const err = validateImportFile(selected);
    if (err) {
      setError(err);
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    setExtraction(null);
    setFile(selected);
    try {
      const res = await extractSdrDocumentViaApi(selected, {
        signal: ac.signal,
        ...(availableServicesJson ? { availableServicesJson } : {}),
        ...(expectedClientIdentityJson ? { expectedClientIdentityJson } : {}),
      });
      setExtraction(res);
      setModalStep("review");
    } catch (e: unknown) {
      const msg = formatGeminiExtractError(e);
      if (msg) setError(msg);
      else setError(null);
    } finally {
      setLoading(false);
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!loading && modalStep === "pick") setIsDragActive(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!loading && modalStep === "pick") setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    const relatedTarget = e.relatedTarget as Node;
    if (!e.currentTarget.contains(relatedTarget)) {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (loading || modalStep !== "pick") return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) void handleExtract(dropped);
  };

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = (ev) => {
    const chosen = ev.target.files?.[0];
    ev.target.value = "";
    if (chosen) void handleExtract(chosen);
  };

  const backToPick = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setModalStep("pick");
    setFile(null);
    setExtraction(null);
    setError(null);
    setLoading(false);
    setIsDragActive(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  function handleApply() {
    if (!preview || !extraction) return;
    if (extraction.clientIdentityCheck?.status === "mismatch") return;

    setFormData((prev) => {
      const applied = applySdrImportToWizard(prev, preview, {
        overwrite,
        file: file ?? null,
        extraction,
      });

      queueMicrotask(() => {
        if (applied.appliedCount > 0) {
          toast({
            title: "SDR import",
            description: `SDR details added to ${applied.appliedCount} service(s). Review the highlighted services before saving.`,
          });
        } else if (file) {
          toast({
            title: "SDR file attached",
            description:
              "SDR file saved to the SDR documentation slot. No service rows were updated.",
          });
        } else if (preview.matched?.length === 0) {
          toast({
            title: "No changes",
            variant: "destructive",
            description:
              "We couldn't match any SDR details to the services below. Check the service codes and names, then try again.",
          });
        }

        if (applied.keptExistingCount > 0) {
          toast({
            title:
              applied.appliedCount > 0
                ? "Existing SDR breakdown preserved"
                : "Existing breakdowns kept",
            description:
              applied.appliedCount > 0
                ? `${applied.keptExistingCount} service(s) kept their imported SDR breakdown text; totals, PA, and weekly rows from the document were merged where applicable (overwrite off).`
                : `${applied.keptExistingCount} service(s) already had SDR details and were left unchanged (overwrite off).`,
            variant: "info",
          });
        }

        const warnText = (applied.localWarnings ?? []).slice(0, 3).join(" ");
        if (warnText) {
          toast({ title: "Review", description: warnText, variant: "warning" });
        }
      });

      return applied.formData;
    });
    onOpenChange(false);
  }

  const docMismatch =
    extraction?.detectedDocumentType &&
    extraction.detectedDocumentType !== "sdr" &&
    extraction.detectedDocumentType !== "unknown";

  const identityStatus = extraction?.clientIdentityCheck?.status;
  const identityBlocked =
    identityStatus === "mismatch" ||
    Boolean(findIdentityWarning(extraction, "SDR_CLIENT_IDENTITY_MISMATCH"));
  const canApply = !loading && !!extraction && !!preview && !identityBlocked;

  const partialIdentityWarning = findIdentityWarning(
    extraction,
    "SDR_CLIENT_IDENTITY_PARTIAL_MISMATCH",
  );
  const fullIdentityWarning = findIdentityWarning(extraction, "SDR_CLIENT_IDENTITY_MISMATCH");
  const inconclusiveIdentityWarning = findIdentityWarning(
    extraction,
    "SDR_CLIENT_IDENTITY_INCONCLUSIVE",
  );

  const anyPreviewRows =
    !!preview &&
    ((preview.matched?.length ?? 0) > 0 ||
      (preview.needsReview?.length ?? 0) > 0 ||
      (preview.skipped?.length ?? 0) > 0 ||
      (preview.keptExisting?.length ?? 0) > 0);

  const detectedLabel =
    extraction?.detectedDocumentType != null
      ? DOCUMENT_TYPE_LABELS[extraction.detectedDocumentType] ?? extraction.detectedDocumentType
      : "—";

  const reviewWarnings =
    extraction?.warnings
      ?.filter((w) => !w.code || !IDENTITY_WARNING_CODES.has(w.code))
      .map((w) => w.message) ?? [];

  function handleMainOpenChange(next: boolean) {
    if (!next) {
      abortRef.current?.abort();
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleMainOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[min(96vw,560px)] flex-col gap-4 p-5">
        <DialogHeader className="shrink-0 space-y-1 text-left">
          <DialogTitle className="text-lg font-semibold text-[#10141a]">
            {modalStep === "pick" && "Import SDR breakdowns"}
            {modalStep === "review" && "Review SDR matches"}
          </DialogTitle>

          {modalStep === "pick" ? (
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-muted-foreground">
                Upload an SDR (PDF, JPEG, PNG, or WebP, up to 10 MB). Review matches, then apply
                before saving.
                {stage1HasIdentityAnchors ? " The file must match the client on Stage 1." : null}
              </p>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="How SDR import works"
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
                  <p className="mb-1 font-semibold">How SDR import works</p>
                  <ul className="list-disc space-y-1 pl-4 text-[#5c6368]">
                    <li>When Stage 2 already has services, we match to those rows; otherwise outcomes are created from the SDR.</li>
                    <li>Weekly distribution table rows are imported when the PDF includes them.</li>
                    <li>Only updates SDR-related fields per service row (not guardians or demographics).</li>
                    <li>The same file attaches to the SDR documentation slot in step 3.</li>
                    <li>Nothing is saved until you finish the wizard and save the client.</li>
                  </ul>
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <>
              <p className="text-[12px] text-muted-foreground">
                Detected document: <span className="font-medium text-foreground">{detectedLabel}</span>
              </p>
              {extraction?.sourceDocument?.cached ? (
                <p className="text-[11px] text-muted-foreground">Reused a recent extraction</p>
              ) : null}
            </>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {modalStep === "pick" ? (
            <div className="space-y-4">
              <div
                className={cn(
                  "group relative overflow-hidden rounded-2xl border transition-all duration-200",
                  isDragActive && !loading
                    ? "border-[#00b4b8] bg-gradient-to-b from-[#e6fafa] to-white shadow-md ring-2 ring-[#00b4b8]/25"
                    : "border-[#e2e4e6] bg-gradient-to-b from-[#f8fafb] to-white shadow-sm hover:border-[#00b4b8]/40 hover:shadow-md",
                )}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role="presentation"
              >
                {isDragActive && !loading ? (
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
                  htmlFor="stage2-sdr-import-file"
                  className={cn(
                    "relative flex w-full flex-col items-center gap-4 px-5 py-10 text-center transition-colors outline-none focus-within:ring-2 focus-within:ring-[#00b4b8]/35 focus-within:ring-offset-2",
                    !loading ? "cursor-pointer" : "cursor-not-allowed opacity-75",
                  )}
                >
                  <input
                    id="stage2-sdr-import-file"
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                    className="sr-only"
                    disabled={loading}
                    onChange={onPickFile}
                  />
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00b4b8]/12 text-[#00b4b8] ring-1 ring-[#00b4b8]/15">
                    {loading ? (
                      <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
                    ) : (
                      <FileUp className="h-7 w-7" aria-hidden />
                    )}
                  </div>
                  <div className="max-w-[18rem] space-y-1">
                    <p className="text-[16px] font-semibold text-[#10141a]">Drop file here</p>
                    <p className="text-[13px] leading-snug text-[#5c6368]">
                      or browse from your device
                      {loading ? ". Reading service authorizations and weekly tables…" : ""}
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
                  {!loading ? (
                    <span className="inline-flex items-center rounded-[60px] border border-[#00b4b8] bg-white px-5 py-2.5 text-sm font-semibold text-[#00b4b8] shadow-sm ring-offset-background transition-colors group-hover:bg-[#e6fafa]">
                      Choose SDR file
                    </span>
                  ) : null}
                </label>
              </div>

              <div className="space-y-1" aria-live="polite">
                {loading && file ? (
                  <p className="text-[12px] text-[#5c6368]">
                    Reading service authorizations and weekly tables… this can take 1–3 minutes.{" "}
                    {file.name} —{" "}
                    {formatFileSize(file.size)}
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

          {modalStep === "review" && preview ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sdr-overwrite-modal"
                  checked={overwrite}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setOverwrite(e.target.checked)
                  }
                  label="Overwrite existing SDR details"
                  labelClassName="text-[13px] font-normal"
                />
              </div>

              {docMismatch ? (
                <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-[12px] text-amber-950">
                  This file doesn&apos;t look like an SDR. Review the matches before applying.
                </div>
              ) : null}

              {identityStatus === "match" ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-[12px] text-emerald-950">
                  This SDR matches the client you&apos;re adding.
                </div>
              ) : null}

              {identityStatus === "skipped" ? (
                <div className="rounded-md border border-[#e6e7e8] bg-[#f8f9fa] px-3 py-2 text-[12px] text-[#50565e]">
                  No client ID on file yet — confirm this SDR belongs to this client before you
                  apply.
                </div>
              ) : null}

              {identityStatus === "partial_mismatch" || partialIdentityWarning ? (
                <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-[12px] text-amber-950">
                  <p>{partialIdentityWarning?.message ?? "Some client details don't match."}</p>
                  {(extraction?.clientIdentityCheck?.mismatches ?? []).length > 0 ? (
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                      {extraction?.clientIdentityCheck?.mismatches?.map((m) => (
                        <li key={m.field}>
                          {formatIdentityFieldLabel(m.field)} — on file: {m.expected || "—"}, on
                          this SDR: {m.extracted || "—"}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {identityStatus === "inconclusive" || inconclusiveIdentityWarning ? (
                <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-[12px] text-amber-950">
                  {inconclusiveIdentityWarning?.message ??
                    "We couldn't read the client name or ID from this SDR. Check that it belongs to the client you're adding before you apply."}
                  {!stage1HasIdentityAnchors && !bootstrapMode ? (
                    <p className="mt-1">
                      Stage 2 has services but client IDs aren&apos;t complete — verify manually
                      before applying.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {identityBlocked ? (
                <div
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-950"
                  role="alert"
                >
                  <p className="font-semibold">
                    {fullIdentityWarning?.message ??
                      "This SDR is for a different client. Upload the correct client's SDR to continue."}
                  </p>
                  {(extraction?.clientIdentityCheck?.mismatches ?? []).length > 0 ? (
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 font-normal">
                      {extraction?.clientIdentityCheck?.mismatches?.map((m) => (
                        <li key={m.field}>
                          {formatIdentityFieldLabel(m.field)} — on file: {m.expected || "—"}, on
                          this SDR: {m.extracted || "—"}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 font-normal">
                      Apply is disabled until you upload the correct client&apos;s SDR.
                    </p>
                  )}
                </div>
              ) : null}

              {(preview.warnings ?? []).length > 0 ? (
                <div>
                  <p className="mb-1 text-[12px] font-semibold">Things to check</p>
                  <div className="max-h-[100px] overflow-y-auto rounded-md border border-amber-200 bg-amber-50/80 p-2">
                    <ul className="list-disc space-y-1 pl-4 text-[12px] text-amber-950">
                      {(preview.warnings ?? []).slice(0, 6).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              {reviewWarnings.length > 0 ? (
                <div>
                  <p className="mb-1 text-[12px] font-semibold">Notes from extraction</p>
                  <div className="max-h-[100px] overflow-y-auto rounded-md border border-[#e6e7e8] p-2">
                    <ul className="list-disc space-y-1 pl-4 text-[12px] text-[#10141a]">
                      {reviewWarnings.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              {(preview.matched ?? []).length > 0 ? (
                <div>
                  <p className="mb-1 text-[12px] font-semibold text-[#10141a]">
                    {bootstrapMode ? "Will add from SDR" : "Matched"}
                  </p>
                  <p className="mb-2 text-[12px] text-muted-foreground">
                    {bootstrapMode
                      ? "These outcomes and services will be added to Stage 2."
                      : "These SDR details are ready to apply."}
                  </p>
                  <div className="max-h-[120px] overflow-y-auto rounded-md border border-[#e6e7e8] p-2">
                    <ul className="list-disc space-y-1 pl-4 text-[12px]">
                      {preview.matched.map((m, i) => {
                        const enrich = formatSdrPatchSummary(m.patchDraft);
                        return (
                          <li key={`m-${m.wizardServiceId}-${i}`}>
                            <span className="font-medium">{m.extractCode || m.extractName || "Row"}</span>
                            {m.wizardServiceCode ? (
                              <>
                                {" "}
                                → service <span className="font-medium">{m.wizardServiceCode}</span>
                              </>
                            ) : null}
                            {enrich ? (
                              <p className="mt-0.5 text-[11px] leading-snug text-[#50565e]">{enrich}</p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ) : null}

              {(preview.keptExisting ?? []).length > 0 ? (
                <div>
                  <p className="mb-1 text-[12px] font-semibold text-[#10141a]">Kept existing</p>
                  <p className="mb-2 text-[12px] text-muted-foreground">
                    Matched rows with existing breakdowns — not overwritten while the checkbox is off.
                  </p>
                  <div className="max-h-[100px] overflow-y-auto rounded-md border border-[#e6e7e8] p-2">
                    <ul className="list-disc space-y-1 pl-4 text-[12px]">
                      {preview.keptExisting.map((m, i) => {
                        const enrich = formatSdrPatchSummary(m.patchDraft);
                        return (
                          <li key={`k-${m.wizardServiceId}-${i}`}>
                            <span className="font-medium">{m.extractCode || m.extractName || "Row"}</span>
                            {m.wizardServiceCode ? (
                              <>
                                {" "}
                                (<span className="font-medium">{m.wizardServiceCode}</span>)
                              </>
                            ) : null}
                            {enrich ? (
                              <p className="mt-0.5 text-[11px] leading-snug text-[#50565e]">{enrich}</p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ) : null}

              {(preview.needsReview ?? []).length > 0 ? (
                <div>
                  <p className="mb-1 text-[12px] font-semibold text-[#10141a]">Needs review</p>
                  <p className="mb-2 text-[12px] text-muted-foreground">
                    We found more than one possible service. Nothing in this section will be applied
                    automatically.
                  </p>
                  <div className="max-h-[100px] overflow-y-auto rounded-md border border-[#e6e7e8] p-2">
                    <ul className="list-disc space-y-1 pl-4 text-[12px]">
                      {preview.needsReview.map((x, i) => (
                        <li key={`r-${x.extractCode}-${i}`}>
                          {x.extractCode || x.extractName}: {x.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              {(preview.skipped ?? []).length > 0 ? (
                <div>
                  <p className="mb-1 text-[12px] font-semibold text-[#10141a]">Skipped</p>
                  <p className="mb-2 text-[12px] text-muted-foreground">
                    These SDR rows did not match a service below.
                  </p>
                  <div className="max-h-[100px] overflow-y-auto rounded-md border border-[#e6e7e8] p-2">
                    <ul className="list-disc space-y-1 pl-4 text-[12px]">
                      {preview.skipped.map((x, i) => (
                        <li key={`s-${x.extractCode}-${i}`}>
                          {x.extractCode || x.extractName || "Row"}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              {!anyPreviewRows && extraction ? (
                <p className="text-[12px] text-muted-foreground">
                  No SDR service details were found. Check that this is the right file, then try
                  again.
                </p>
              ) : null}

              {preview && anyPreviewRows && (preview.needsReview?.length ?? 0) === 0 ? (
                <p className="rounded-md border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-[12px] text-emerald-950">
                  Review the lists above, then apply. You can still edit each service row before
                  saving the client.
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
              onClick={() => handleMainOpenChange(false)}
            >
              Cancel
            </Button>
          ) : (
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
                disabled={!canApply}
                onClick={handleApply}
              >
                Apply SDR details
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
