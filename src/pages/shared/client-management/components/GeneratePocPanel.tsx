import React, { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, Sparkles, X } from "lucide-react";
import type { AddClientFormData } from "../types/formData";
import type { ClientPocGenerationResponse } from "../types/clientPocGeneration";
import {
  canGeneratePoc,
  getDocByKey,
  getPocSourceSummary,
  hasDocSource,
  pocSourceSummaryLabel,
} from "../utils/pocGenerationEligibility";
import { useGeneratePoc } from "../hooks/useGeneratePoc";
import { GeneratedPocDocument } from "./GeneratedPocDocument";
import {
  buildPocPdfBlob,
  downloadPocPdfFromBlob,
  pocBlobToFile,
} from "../utils/generatePocPdf";
import { withGeneratedPocFile } from "../utils/withGeneratedPocFile";
import { createPocPdfBlobCache } from "../utils/pocPdfBlobCache";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type ModalStep = "confirm" | "generating" | "preview";

export type GeneratePocPanelHandle = {
  openModal: () => void;
};

type GeneratePocPanelProps = {
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
  clientId?: string;
  /** When true, render only the modal (no inline CTA). */
  modalOnly?: boolean;
  /** Controlled open state for modal-only usage. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onApplied?: (nextFormData: AddClientFormData) => void;
};

function pocResultIdentity(result: ClientPocGenerationResponse): string {
  return [
    result.generationJobId ?? "",
    result.fileName,
    String(result.sections.length),
  ].join("|");
}

const GeneratePocPanel = React.forwardRef<GeneratePocPanelHandle, GeneratePocPanelProps>(
  function GeneratePocPanel(
    {
      formData,
      setFormData,
      clientId,
      modalOnly = false,
      open: controlledOpen,
      onOpenChange,
      onApplied,
    },
    ref,
  ) {
    const { toast } = useToast();
    const [internalOpen, setInternalOpen] = useState(false);
    const [step, setStep] = useState<ModalStep>("confirm");
    const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState<"document" | "pdf">("document");
    const pdfBlobCacheRef = useRef(createPocPdfBlobCache());

    const open = controlledOpen ?? internalOpen;

    const setOpenState = useCallback(
      (value: boolean) => {
        if (onOpenChange) onOpenChange(value);
        else setInternalOpen(value);
      },
      [onOpenChange],
    );

    const { busy, error, result, generate, cancel, reset } = useGeneratePoc(
      formData,
      clientId,
    );

    const eligible = canGeneratePoc(formData);
    const sourceSummary = getPocSourceSummary(formData);
    const isp = getDocByKey(formData.stage3.docs, "isp");
    const pcpt = getDocByKey(formData.stage3.docs, "pcpt");
    const usingExistingFiles =
      (!isp?.file && hasDocSource(isp)) || (!pcpt?.file && hasDocSource(pcpt));

    const revokePreviewUrl = useCallback(() => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
      pdfBlobCacheRef.current.reset();
    }, [previewBlobUrl]);

    const getOrBuildPdfBlob = useCallback(
      async (response: ClientPocGenerationResponse): Promise<Blob> =>
        pdfBlobCacheRef.current.getOrBuild(pocResultIdentity(response), () =>
          buildPocPdfBlob(response),
        ),
      [],
    );

    useEffect(() => {
      if (!result) {
        revokePreviewUrl();
      }
    }, [result, revokePreviewUrl]);

    const closeModal = useCallback(() => {
      cancel();
      reset();
      revokePreviewUrl();
      setStep("confirm");
      setPreviewMode("document");
      setOpenState(false);
    }, [cancel, reset, revokePreviewUrl, setOpenState]);

    const openModal = useCallback(() => {
      reset();
      revokePreviewUrl();
      setStep("confirm");
      setOpenState(true);
    }, [reset, revokePreviewUrl, setOpenState]);

    const handleDialogOpenChange = useCallback(
      (next: boolean) => {
        if (!next) closeModal();
      },
      [closeModal],
    );

    React.useImperativeHandle(ref, () => ({ openModal }), [openModal]);

    useEffect(() => {
      if (!open) return;
      if (step !== "generating") return;
      if (busy) return;
      if (result) {
        setStep("preview");
      } else if (error) {
        setStep("confirm");
      }
    }, [open, step, busy, result, error]);

    const handleGenerate = useCallback(async () => {
      setStep("generating");
      await generate(false);
    }, [generate]);

    const handleDownload = useCallback(async () => {
      if (!result) return;
      const blob = await getOrBuildPdfBlob(result);
      downloadPocPdfFromBlob(blob, result.fileName || "plan-of-care.pdf");
    }, [result, getOrBuildPdfBlob]);

    const handleUseAsPoc = useCallback(async () => {
      if (!result) return;
      try {
        const blob = await getOrBuildPdfBlob(result);
        const file = pocBlobToFile(blob, result);
        const nextFormData = withGeneratedPocFile(formData, {
          file,
          fileName: file.name,
          issuedOnDate: new Date(),
        });
        setFormData(nextFormData);
        toast({
          title: "Plan of care added",
          description: "It will upload when you save the client.",
          variant: "success",
        });
        onApplied?.(nextFormData);
        closeModal();
      } catch {
        toast({
          title: "Couldn't prepare the PDF",
          description: "Try again or upload a POC file manually.",
          variant: "destructive",
        });
      }
    }, [result, formData, setFormData, toast, onApplied, closeModal, getOrBuildPdfBlob]);

    const handleShowPdfPreview = useCallback(async () => {
      if (!result) return;
      const blob = await getOrBuildPdfBlob(result);
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(URL.createObjectURL(blob));
      setPreviewMode("pdf");
    }, [result, getOrBuildPdfBlob, previewBlobUrl]);

    if (!eligible && !modalOnly) return null;

    return (
      <>
        {!modalOnly ? (
          <div className="mb-3 rounded-[12px] border border-[#cceeee] bg-[#f0fbfb] p-4">
            <p className="text-[13px] text-[#10141a] mb-3">
              No POC uploaded. Generate one from the ISP and/or PCPT, then review
              before saving.
              {usingExistingFiles ? " Using the ISP/PCPT already on file." : ""}
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-[12px] border-[#00b4b8] text-[#00b4b8] hover:bg-[#e6fafa]"
              onClick={openModal}
              disabled={busy}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Plan of Care
            </Button>
          </div>
        ) : null}

        <Dialog open={open} onOpenChange={handleDialogOpenChange}>
          <DialogContent
            showCloseButton={false}
            className={
              step === "preview"
                ? "flex max-h-[90vh] w-[min(96vw,720px)] flex-col gap-0 p-0"
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
                    Generate Plan of Care
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
                  AI will draft a structured plan of care from your uploaded documents.
                  Review the result before saving it to the client record.
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
                      {pocSourceSummaryLabel(sourceSummary)}
                    </p>
                    {usingExistingFiles ? (
                      <p className="mt-1 text-[13px] text-[#808081]">
                        Using the ISP/PCPT already on file for this client.
                      </p>
                    ) : null}
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
                    Generating the plan of care from the ISP/PCPT&hellip;
                  </p>
                </div>
              ) : null}

              {step === "preview" && result ? (
                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
                  <div className="flex items-center justify-between gap-3">
                    <DialogDescription className="min-w-0 flex-1 text-left text-[13px] leading-relaxed text-[#808081]">
                      Review the generated sections or PDF, then attach it as the client&apos;s POC.
                    </DialogDescription>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={previewMode === "document" ? "default" : "outline"}
                        onClick={() => setPreviewMode("document")}
                      >
                        <FileText className="mr-1 h-4 w-4" />
                        Sections
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={previewMode === "pdf" ? "default" : "outline"}
                        onClick={() => void handleShowPdfPreview()}
                      >
                        PDF preview
                      </Button>
                    </div>
                  </div>
                  <div className="max-h-[50vh] min-h-0 flex-1 overflow-y-auto rounded-[12px] border border-[#e5e5e6] bg-white p-4">
                    {previewMode === "pdf" && previewBlobUrl ? (
                      <iframe
                        src={previewBlobUrl}
                        title="Generated Plan of Care PDF"
                        className="h-[45vh] w-full border-0"
                      />
                    ) : (
                      <GeneratedPocDocument response={result} />
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

            {step === "confirm" ? (
              <DialogFooter className="flex shrink-0 flex-row justify-end gap-2 border-t border-[#e6e7e8] px-5 py-4">
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
              <DialogFooter className="flex shrink-0 flex-row justify-end gap-2 border-t border-[#e6e7e8] px-5 py-4">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
              </DialogFooter>
            ) : null}

            {step === "preview" && result ? (
              <DialogFooter className="flex shrink-0 flex-row items-center justify-between gap-2 border-t border-[#e6e7e8] px-5 py-4">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <div className="flex flex-row gap-2">
                  <Button type="button" variant="outline" onClick={() => void handleDownload()}>
                    Download PDF
                  </Button>
                  <Button type="button" onClick={() => void handleUseAsPoc()}>
                    Use as POC
                  </Button>
                </div>
              </DialogFooter>
            ) : null}
          </DialogContent>
        </Dialog>
      </>
    );
  },
);

export default GeneratePocPanel;
