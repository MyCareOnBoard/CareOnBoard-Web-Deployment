import { useCallback } from "react";
import { AlertTriangle, FileText, ShieldCheck } from "lucide-react";
import { extractScClientOnboardingViaApi } from "@/lib/api/sc-client-extraction";
import type { ScClientExtractionBatch, ScClientExtractionResponse } from "../types/scClientExtraction";
import type { ScImportFormValues } from "../utils/mergeScExtractionDraft";
import { mergeScExtractionBatch } from "../utils/mergeScExtractionBatch";
import { formatGeminiExtractError } from "../utils/formatGeminiExtractError";
import DocumentImportDialog from "./extraction/DocumentImportDialog";
import ImportFileRow from "./extraction/ImportFileRow";
import { cn } from "@/lib/utils";
import type { ScPendingDocument } from "../utils/scEnrollmentDocuments";

export type ScImportReview = ScClientExtractionBatch & {
  detectedDocumentType: "batch";
  warnings: ScClientExtractionResponse["warnings"];
  fieldConfidences: ScClientExtractionResponse["fieldConfidences"];
  failures: Array<{ fileKey: string; fileName: string; message: string }>;
};
const slots = [{ id: "file", label: "Client document" }];
const documentTypeLabels = {
  batch: "SC intake documents",
  isp: "Individualized Service Plan (ISP)", njcat: "NJCAT assessment", dddApplication: "DDD eligibility application",
  enrollment: "Participant Enrollment Agreement", tierLetter: "DDD tier letter", guardianship: "Guardianship document",
  pcpt: "Person-Centered Planning Tool (PCPT)", other: "Other intake document", unknown: "Unrecognized document",
};

export default function ScImportFromFilePanel<T extends ScImportFormValues>({ form, disabled, pendingDocuments, onApply, onRemoveDocument, initialFiles, triggerLabel, triggerAriaLabel, triggerClassName }: {
  form: T;
  disabled: boolean;
  pendingDocuments: ScPendingDocument[];
  onRemoveDocument: (file: File) => void;
  onApply: (extraction: ScImportReview, context: { overwrite: boolean; files: Record<string, File> }) => void;
  initialFiles?: Record<string, File>;
  triggerLabel?: string;
  triggerAriaLabel?: string;
  triggerClassName?: string;
}) {
  const pendingCount = pendingDocuments.length;
  const onExtract = useCallback(async (files: Record<string, File>, { signal, onProgress }: { signal: AbortSignal; onProgress?: (message: string) => void }): Promise<ScImportReview> => {
    const documents: ScClientExtractionBatch["documents"] = [], failures: ScImportReview["failures"] = [];
    const entries = Object.entries(files);
    // Read in selection order to bound provider load and preserve conflict precedence.
    for (const [index, [fileKey, file]] of entries.entries()) {
      onProgress?.(`Reading ${index + 1} of ${entries.length}: ${file.name}. This can take 30–60 seconds per file.`);
      try {
        const result = await extractScClientOnboardingViaApi(file, { signal });
        if (signal.aborted) throw new DOMException("Import cancelled", "AbortError");
        documents.push({ fileKey, extraction: { ...result, sourceDocument: { ...result.sourceDocument, fileName: file.name }, fieldConfidences: result.fieldConfidences.map(({ valuePreview: _value, sourceSnippet: _snippet, label: _label, ...field }) => field) } });
      } catch (error) {
        if (signal.aborted) throw error;
        const reference = (error as { response?: { data?: { extractionJobId?: unknown } } } | null)?.response?.data?.extractionJobId;
        const suffix = typeof reference === "string" && /^[a-f0-9-]{36}$/i.test(reference) ? ` Reference: ${reference}.` : "";
        failures.push({ fileKey, fileName: file.name, message: `${formatGeminiExtractError(error) || "This document could not be read."}${suffix}` });
      }
    }
    if (!documents.length) throw new Error(failures.map(failure => `${failure.fileName}: ${failure.message}`).join(" "));
    return { detectedDocumentType: "batch", documents, failures, warnings: [], fieldConfidences: [] };
  }, []);
  const computePreviewWarnings = useCallback((extraction: ScImportReview, { overwrite }: { overwrite: boolean }) => mergeScExtractionBatch(form, extraction.documents, { overwrite }).warnings, [form]);
  const canApply = useCallback((extraction: ScImportReview, { overwrite }: { overwrite: boolean }) => !mergeScExtractionBatch(form, extraction.documents, { overwrite }).blocked, [form]);

  return <DocumentImportDialog<ScImportReview>
    triggerLabel={triggerLabel ?? (pendingCount ? `Upload document (${pendingCount})` : "Upload document")}
    triggerLabelMobile={triggerLabel ?? (pendingCount ? `Upload document (${pendingCount})` : "Upload document")}
    triggerAriaLabel={triggerAriaLabel ?? "Upload document"}
    triggerClassName={triggerClassName ?? "sc-enrollment-upload"}
    initialFiles={initialFiles}
    dialogTitlePick="Import client document"
    pickDescription={<div className="w-full space-y-4 text-[13px] leading-relaxed text-[#617579]">
      <p>Select up to 5 different files, including an ISP, completed NJCAT, DDD application, enrollment agreement, or supporting document. Review suggestions before applying them. Originals attach when you save the client.</p>
      {pendingCount > 0 && <section aria-label="Documents ready to attach" className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[13px] font-semibold text-[#10141a]">Documents ready to attach</h3>
          <span className="shrink-0 rounded-full bg-[#eaf6f6] px-2.5 py-1 text-[11px] font-semibold text-[#087b80]">{pendingCount} ready</span>
        </div>
        <ul className="space-y-2">{pendingDocuments.map(({ file, category }, index) => <ImportFileRow key={index} file={file} detail={category} removeLabel={`Remove ${file.name} attachment`} disabled={disabled} onRemove={() => onRemoveDocument(file)} />)}</ul>
        <p className="text-[12px]">Removing a file keeps values already applied to the form.</p>
      </section>}
    </div>}
    slots={slots}
    multipleFiles
    onExtract={onExtract}
    onApply={onApply}
    onAttachOnly={files => {
      onApply({ detectedDocumentType: "batch", documents: [], failures: [], warnings: [], fieldConfidences: [] }, { overwrite: false, files });
    }}
    computePreviewWarnings={computePreviewWarnings}
    canApply={canApply}
    disabled={disabled}
    documentTypeLabels={documentTypeLabels}
    renderReview={(extraction, { overwrite, files }) => {
      const preview = mergeScExtractionBatch(form, extraction.documents, { overwrite });
      return <section aria-label="Extracted field values" className="space-y-5 text-[13px]">
        <div className="flex items-start gap-3 px-1">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#087b80]" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold text-[#10141a]">Empty fields are filled by default</p>
            <p className="text-[12px] leading-5 text-[#617579]">Existing values stay unless you select replacement. When documents disagree, the first document's readable value is kept. Eligibility, monitoring, agreement participation, and signatures stay manual.</p>
          </div>
        </div>
        {preview.blocked && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium leading-5 text-red-800">The documents conflict with participant information in this form or another selected file. Check that every document belongs to the same client before importing.</p>}
        {preview.previews.map(document => <section key={document.fileKey} aria-label={`Extracted values from ${files[document.fileKey]?.name}`} className="overflow-hidden rounded-2xl border border-[#dce6e7] bg-white">
          <header className="flex items-start gap-3 border-b border-[#e6edee] bg-[#f6f9f9] px-4 py-3.5">
            <FileText className="mt-0.5 size-5 shrink-0 text-[#087b80]" aria-hidden="true" />
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="text-[14px] font-semibold leading-5 text-[#10141a] [overflow-wrap:anywhere]">{files[document.fileKey]?.name}</h3>
              <p className="text-[12px] leading-5 text-[#617579]">{documentTypeLabels[document.extraction.detectedDocumentType]}</p>
            </div>
            <span className="shrink-0 rounded-full border border-[#dce6e7] bg-white px-2 py-1 text-[11px] font-medium tabular-nums text-[#4b6266]">{document.rows.length} fields</span>
          </header>
          {document.rows.length ? <dl className="divide-y divide-[#e6edee]">
          {document.rows.map(row => {
            const evidence = document.extraction.fieldConfidences.find(field => field.path.replace(/^draft\./, "") === row.key);
            let action = row.currentValue === row.extractedValue ? "Already matches" : "Keep current / earlier value";
            if (row.willApply) action = row.key === "outcomes" ? "Will add" : !row.extractedValue ? "Will clear" : row.currentValue ? "Will replace" : "Will fill";
            return <div key={row.key} className="grid gap-2 px-4 py-3.5 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] sm:gap-5">
              <dt className="flex flex-wrap items-center justify-between gap-2 sm:block sm:space-y-2">
                <span className="block font-medium text-[#4b6266]">{row.label}</span>
                <span className={cn("inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium leading-5", row.willApply ? row.extractedValue ? "bg-[#eaf6f6] text-[#087b80]" : "bg-amber-50 text-amber-800" : "bg-[#f0f3f4] text-[#52676b]")}>{action}</span>
              </dt>
              <dd className="min-w-0 space-y-2">
                <p className={cn("whitespace-pre-wrap font-medium leading-5 [overflow-wrap:anywhere]", row.extractedValue ? "text-[#10141a]" : "text-[#617579]")}>{row.extractedValue || "Not provided"}</p>
                {row.currentValue && row.currentValue !== row.extractedValue && <div className="border-l-2 border-[#dce6e7] pl-2.5 text-[12px] leading-5 text-[#617579]"><span className="block">Current value</span><span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{row.currentValue}</span></div>}
                {(evidence?.page || evidence && evidence.confidence < 0.85) && <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-5">
                  {evidence?.page && <span className="text-[#617579]">Page {evidence.page}</span>}
                  {evidence && evidence.confidence < 0.85 && <span className="inline-flex items-center gap-1 font-medium text-amber-800"><AlertTriangle className="size-3" aria-hidden="true" />Check source</span>}
                </div>}
              </dd>
            </div>;
          })}
        </dl> : <p className="px-4 py-4 text-[13px] leading-5 text-[#617579]">No supported onboarding fields were found. This original will attach without autofill.</p>}
        </section>)}
        {extraction.failures.length > 0 && <section aria-label="Files without extraction" className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
          <h3 className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4 shrink-0" aria-hidden="true" />Files that need attention</h3>
          {extraction.failures.map(failure => <div key={failure.fileKey} className="space-y-1 text-[12px] leading-5 [overflow-wrap:anywhere]"><p className="font-semibold">{failure.fileName}</p><p>{failure.message} The original will attach without autofill. Go back to select a different file if needed.</p></div>)}
        </section>}
      </section>;
    }}
  />;
}
