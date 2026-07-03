import React, { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import type { AddClientFormData } from "../types/formData";
import type { Form485Document } from "../types/clientForm485Generation";
import {
  canGenerateForm485,
  getForm485MissingSources,
  FORM485_GRACE_DAYS,
} from "../utils/form485GenerationEligibility";
import { useGenerateForm485 } from "../hooks/useGenerateForm485";
import Form485PrintTemplate from "./Form485PrintTemplate";
import Form485EditForm from "./Form485EditForm";
import { generateFormPdfBlob } from "../utils/generateFormPdfBlob";
import { downloadPocPdfFromBlob } from "../utils/generatePocPdf";
import { withGeneratedForm485File } from "../utils/withGeneratedForm485File";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ModalStep = "confirm" | "generating" | "preview";
type Form485Tab = "edit" | "preview";

const FORM485_TABS: ReadonlyArray<{ id: Form485Tab; label: string }> = [
  { id: "edit", label: "Edit form" },
  { id: "preview", label: "Preview" },
];

type GenerateForm485PanelProps = {
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
  clientId?: string;
};

export default function GenerateForm485Panel({
  formData,
  setFormData,
  clientId,
}: GenerateForm485PanelProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ModalStep>("confirm");
  const [activeTab, setActiveTab] = useState<Form485Tab>("edit");
  // Editable copy of the generated form. Drives the Edit form, the Preview tab,
  // and (deferred) the off-screen template captured to PDF, so exports reflect edits.
  const [editedForm485, setEditedForm485] = useState<Form485Document | null>(null);
  const deferredForm485 = useDeferredValue(editedForm485);
  const printRef = useRef<HTMLDivElement>(null);
  const blobCacheRef = useRef<{ key: string; blob: Blob } | null>(null);
  const [downloading, setDownloading] = useState(false);

  const { busy, error, result, generate, cancel, reset } = useGenerateForm485(
    formData,
    clientId,
  );

  // Re-seed the editable copy whenever a new result arrives (a regenerate is a
  // fresh draft, so prior edits are intentionally discarded).
  useEffect(() => {
    if (result) {
      setEditedForm485(result.form485);
      setActiveTab("edit");
      blobCacheRef.current = null;
    } else {
      setEditedForm485(null);
    }
  }, [result]);

  const setField = useCallback(
    <K extends keyof Form485Document>(key: K, next: Form485Document[K]) =>
      setEditedForm485((prev) => {
        if (!prev || prev[key] === next) return prev;
        // Content changed: drop the cached PDF so the next export re-renders.
        blobCacheRef.current = null;
        return { ...prev, [key]: next };
      }),
    [],
  );

  const canGenerate = canGenerateForm485(formData);
  const missingSources = getForm485MissingSources(formData);

  const closeModal = useCallback(() => {
    cancel();
    reset();
    blobCacheRef.current = null;
    setEditedForm485(null);
    setActiveTab("edit");
    setStep("confirm");
    setOpen(false);
  }, [cancel, reset]);

  const openModal = useCallback(() => {
    reset();
    setStep("confirm");
    setOpen(true);
  }, [reset]);

  const handleDialogOpenChange = useCallback(
    (next: boolean) => {
      if (!next) closeModal();
    },
    [closeModal],
  );

  useEffect(() => {
    if (!open) return;
    if (step !== "generating") return;
    if (busy) return;
    if (result) setStep("preview");
    else if (error) setStep("confirm");
  }, [open, step, busy, result, error]);

  const handleGenerate = useCallback(async () => {
    setStep("generating");
    await generate(false);
  }, [generate]);

  const buildBlob = useCallback(async (): Promise<Blob | null> => {
    if (!printRef.current || !result) return null;
    // Cache by result identity so repeated downloads of the same generated form
    // don't re-run the html2canvas + jsPDF pipeline (cleared whenever edits change).
    const key = `${result.generationJobId ?? ""}|${result.fileName}`;
    if (blobCacheRef.current?.key === key) return blobCacheRef.current.blob;
    const blob = await generateFormPdfBlob(printRef.current);
    blobCacheRef.current = { key, blob };
    return blob;
  }, [result]);

  const handleDownload = useCallback(async () => {
    if (!result || downloading) return;
    setDownloading(true);
    try {
      const blob = await buildBlob();
      if (blob) downloadPocPdfFromBlob(blob, result.fileName || "form-485.pdf");
    } finally {
      setDownloading(false);
    }
  }, [result, downloading, buildBlob]);

  const handleUseAsForm485 = useCallback(async () => {
    if (!result || downloading) return;
    setDownloading(true);
    try {
      const blob = await buildBlob();
      if (!blob) {
        toast({
          title: "Couldn't prepare the PDF",
          description: "Try again or upload a Form 485 file manually.",
          variant: "destructive",
        });
        return;
      }
      const fileName = result.fileName || "form-485.pdf";
      const file = new File([blob], fileName, { type: "application/pdf" });
      setFormData((prev) =>
        withGeneratedForm485File(prev, { file, fileName, issuedOnDate: new Date() }),
      );
      toast({
        title: "Form 485 added (unsigned)",
        description: `It will upload when you save the client. The client stays active for ${FORM485_GRACE_DAYS} days until the signed copy is uploaded.`,
        variant: "success",
      });
      closeModal();
    } catch {
      toast({
        title: "Couldn't prepare the PDF",
        description: "Try again or upload a Form 485 file manually.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  }, [result, downloading, buildBlob, setFormData, toast, closeModal]);

  return (
    <>
      <div className="mb-3 rounded-[12px] border border-[#cceeee] bg-[#f0fbfb] p-4">
        <p className="mb-3 text-[13px] text-[#10141a]">
          Generate the CMS-485 (Form 485) from the Plan of Care and Clinical Assessment, then
          review and download it to sign and upload as the client&apos;s Form 485.
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-[12px] border-[#00b4b8] text-[#00b4b8] hover:bg-[#e6fafa] disabled:opacity-50"
          onClick={openModal}
          disabled={busy || !canGenerate}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Form 485
        </Button>
        {!canGenerate ? (
          <p className="mt-2 text-[12px] text-[#808081]">
            Attach a {missingSources.join(" and a ")} to generate the Form 485.
          </p>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          showCloseButton={false}
          className={
            step === "preview"
              ? "flex max-h-[92vh] w-[min(96vw,820px)] flex-col gap-0 p-0"
              : "flex w-[min(96vw,480px)] flex-col gap-0 p-0"
          }
        >
          <DialogHeader className="shrink-0 items-start gap-2 space-y-0 border-b border-[#e6e7e8] px-5 pb-2.5 pt-5 text-left">
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e6fafa] text-[#00b4b8]">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                <DialogTitle className="text-left text-lg font-semibold text-[#10141a]">
                  Generate Form 485
                </DialogTitle>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full text-[#808081] hover:bg-[#f5f5f6] hover:text-[#10141a]"
                onClick={closeModal}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {step === "confirm" ? (
              <DialogDescription className="text-left text-[13px] leading-relaxed text-[#808081]">
                AI will draft a CMS-485 from the Plan of Care and Clinical Assessment. Review and
                download it to sign, then upload it as the client&apos;s Form 485.
              </DialogDescription>
            ) : step === "generating" ? (
              <DialogDescription className="text-left text-[13px] leading-relaxed text-[#808081]">
                This usually takes up to a minute. You can cancel at any time.
              </DialogDescription>
            ) : null}
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
            {step === "confirm" ? (
              <div className="space-y-4">
                <div className="rounded-[12px] border border-[#cceeee] bg-[#f0fbfb] px-4 py-3">
                  <p className="text-[12px] font-medium uppercase tracking-wide text-[#00b4b8]">
                    Source documents
                  </p>
                  <p className="mt-1 text-[14px] font-medium text-[#10141a]">
                    Using: Plan of Care and Clinical Assessment
                  </p>
                </div>
                {error ? (
                  <p
                    className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            ) : null}

            {step === "generating" ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <Loader2 className="h-10 w-10 animate-spin text-[#00b4b8]" />
                <p className="max-w-[320px] text-center text-[14px] font-medium leading-relaxed text-[#10141a]">
                  Generating the Form 485 from the Plan of Care and Clinical Assessment&hellip;
                </p>
              </div>
            ) : null}

            {step === "preview" && result && editedForm485 ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
                <DialogDescription className="text-left text-[13px] leading-relaxed text-[#808081]">
                  Review and edit the generated CMS-485, then download it to sign and upload as the
                  client&apos;s Form 485.
                </DialogDescription>
                {result.warnings.length > 0 ? (
                  <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                    <p className="mb-1 font-semibold">Review before signing:</p>
                    <ul className="list-disc space-y-0.5 pl-4">
                      {result.warnings.map((w, i) => (
                        <li key={i}>{w.message}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  {FORM485_TABS.map((tab, index) => (
                    <React.Fragment key={tab.id}>
                      {index > 0 ? (
                        <span aria-hidden className="select-none text-[#cccccd]">
                          &middot;
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        aria-pressed={activeTab === tab.id}
                        className={cn(
                          "inline-flex min-h-[44px] cursor-pointer items-center rounded-[8px] px-3 text-sm transition-colors",
                          activeTab === tab.id
                            ? "font-semibold text-[#00b4b8]"
                            : "font-medium text-[#808081] hover:text-[#10141a]",
                        )}
                      >
                        {tab.label}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
                <div className="max-h-[58vh] min-h-0 flex-1 overflow-auto rounded-[12px] border border-[#e5e5e6] bg-white p-4">
                  {activeTab === "edit" ? (
                    <Form485EditForm value={editedForm485} setField={setField} />
                  ) : (
                    <Form485PrintTemplate form485={editedForm485} />
                  )}
                </div>
                {error ? (
                  <p
                    className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
                    role="alert"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Always-mounted off-screen template fed by the deferred edited values.
              Holds printRef so the PDF capture works from either tab without
              reconciling the heavy paper template on every keystroke. */}
          {step === "preview" && editedForm485 ? (
            <div
              aria-hidden
              className="pointer-events-none fixed left-[-10000px] top-0 w-[800px]"
            >
              <div ref={printRef}>
                <Form485PrintTemplate form485={deferredForm485 ?? editedForm485} />
              </div>
            </div>
          ) : null}

          {step === "confirm" ? (
            <DialogFooter className="flex shrink-0 flex-row items-center justify-between gap-2 border-t border-[#e6e7e8] px-5 py-4">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleGenerate()} disabled={busy}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate
              </Button>
            </DialogFooter>
          ) : null}

          {step === "generating" ? (
            <DialogFooter className="flex shrink-0 flex-row justify-start gap-2 border-t border-[#e6e7e8] px-5 py-4">
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
            </DialogFooter>
          ) : null}

          {step === "preview" && result ? (
            <DialogFooter className="flex shrink-0 flex-row items-center justify-between gap-2 border-t border-[#e6e7e8] px-5 py-4">
              <Button type="button" variant="outline" onClick={closeModal} disabled={downloading}>
                Cancel
              </Button>
              <div className="flex flex-row items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleDownload()}
                  disabled={downloading}
                >
                  {downloading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Preparing PDF&hellip;
                    </>
                  ) : (
                    "Download PDF"
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleUseAsForm485()}
                  disabled={downloading}
                >
                  Use as Form 485
                </Button>
              </div>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
