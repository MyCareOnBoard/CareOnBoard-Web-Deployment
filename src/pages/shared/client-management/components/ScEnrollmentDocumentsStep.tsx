import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { format, isValid, parseISO } from "date-fns";
import { Eye, FileText, Trash2, UploadCloud } from "lucide-react";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ClientDocument } from "@/lib/api/clients";
import { SC_DOCUMENT_CATEGORIES, SC_DOCUMENT_SOURCES } from "@/lib/sc-client-documents";
import { clientDocumentUrl } from "@/pages/shared/client-details/components/ClientDocumentChecklist";
import type { ScPendingDocument } from "../utils/scEnrollmentDocuments";
import { DatePickerField } from "./forms/formControls";
import { formatFileSize } from "./extraction/ImportFileRow";

type DocumentPatch = Partial<Omit<ScPendingDocument, "file" | "documentType">>;
type Preview = { title: string; fileName?: string; url: string; file?: File };

export interface ScEnrollmentDocumentsStepProps {
  documents: ScPendingDocument[];
  existingDocuments: ClientDocument[];
  disabled: boolean;
  onAddFiles: (files: File[]) => void;
  onChangeDocument: (file: File, patch: DocumentPatch) => void;
  onRemoveDocument: (file: File) => void;
  renderAutofillAction: (document: ScPendingDocument) => ReactNode;
}

function selectedDate(value: string) {
  const date = value ? parseISO(value) : undefined;
  return date && isValid(date) ? date : undefined;
}

function displayDate(value?: string) {
  const date = value ? selectedDate(value) : undefined;
  return date ? format(date, "MMM d, yyyy") : "Not provided";
}

export default function ScEnrollmentDocumentsStep({ documents, existingDocuments, disabled, onAddFiles, onChangeDocument, onRemoveDocument, renderAutofillAction }: ScEnrollmentDocumentsStepProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => () => {
    if (preview?.file) URL.revokeObjectURL(preview.url);
  }, [preview]);

  return <div className="space-y-6">
    <section aria-label="Documents" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="!mb-0">Documents</h2>
        <span className="rounded-full bg-[#f0f4f5] px-2.5 py-1 text-[11px] font-semibold text-[#617579]">Optional</span>
      </div>
      <p className="text-[13px] leading-relaxed text-[#617579]">Add client documents now or later from the client's Documents tab. Files already imported for autofill are included below. You can continue without adding documents.</p>
      <FileUpload
        ref={inputRef}
        aria-label="Add client documents"
        aria-describedby={`${id}-upload-help`}
        accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp"
        multiple
        disabled={disabled}
        onFilesSelected={files => {
          if (disabled || !files?.length) return;
          onAddFiles(Array.from(files));
          if (inputRef.current) inputRef.current.value = "";
        }}
        className="max-w-none border-dashed border-[#93bfc2] bg-[#f8fbfb] px-4 py-6"
        icon={<UploadCloud className="size-6 shrink-0 text-[#087b80]" aria-hidden="true" />}
        label={<span className="flex flex-col gap-1"><strong className="text-[13px] font-semibold text-[#087b80]">Click to add documents or drag and drop</strong><span id={`${id}-upload-help`} className="text-[12px] text-[#617579]">PDF, PNG, JPG, or WebP · Up to 10 MB each · Select multiple files</span></span>}
      />

      {documents.length > 0 ? <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#617579]">
          <span className="font-semibold text-[#10141a]">{documents.length} {documents.length === 1 ? "document" : "documents"} ready to attach</span>
          <span>Attached when you save the client</span>
        </div>
        {documents.map((document, index) => {
          const { file } = document;
          const fieldId = `${id}-document-${index}`;
          return <article key={`${file.name}-${file.size}-${file.lastModified}`} aria-label={`${file.name} document`} className="overflow-hidden rounded-xl border border-[#dce6e7] bg-white">
            <div className="flex items-center gap-3 bg-[#f8fbfb] px-3 py-3 sm:px-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf6f6] text-[#087b80]"><FileText className="size-5" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[13px] font-semibold leading-5 text-[#10141a] [overflow-wrap:anywhere]">{file.name}</h3>
                <p className="mt-0.5 text-[12px] leading-5 text-[#617579]">{document.category} · {formatFileSize(file.size)}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 rounded-xl p-0 text-[#617579] hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-500/30" aria-label={`Remove ${file.name} attachment`} title="Remove file" disabled={disabled} onClick={() => {
                if (preview?.file === file) setPreview(null);
                onRemoveDocument(file);
              }}><Trash2 className="size-4" aria-hidden="true" /></Button>
            </div>
            <fieldset disabled={disabled} className="min-w-0 space-y-4 border-t border-[#e8eeef] p-3 sm:p-4">
              <legend className="sr-only">Details for {file.name}</legend>
              <div className="sc-enrollment-grid two">
                <div className="sc-enrollment-field span-two">
                  <label htmlFor={`${fieldId}-title`}>Document name</label>
                  <Input id={`${fieldId}-title`} value={document.title} maxLength={120} onChange={event => onChangeDocument(file, { title: event.target.value })} />
                </div>
                <div className="sc-enrollment-field">
                  <label htmlFor={`${fieldId}-category`}>Document type</label>
                  <Select value={document.category} disabled={disabled} onValueChange={category => onChangeDocument(file, { category: category as ScPendingDocument["category"] })}>
                    <SelectTrigger id={`${fieldId}-category`} className="w-full rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>{SC_DOCUMENT_CATEGORIES.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="sc-enrollment-field">
                  <label htmlFor={`${fieldId}-source`}>Source</label>
                  <Select value={document.source || "not-provided"} disabled={disabled} onValueChange={source => onChangeDocument(file, { source: source === "not-provided" ? "" : source })}>
                    <SelectTrigger id={`${fieldId}-source`} className="w-full rounded-lg"><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent><SelectItem value="not-provided">Not provided</SelectItem>{SC_DOCUMENT_SOURCES.map(source => <SelectItem key={source} value={source}>{source}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="sc-enrollment-field span-two">
                  <label htmlFor={`${fieldId}-provider`}>Related provider</label>
                  <Input id={`${fieldId}-provider`} aria-label="Related provider" value={document.provider} maxLength={120} placeholder="Provider name, if applicable" onChange={event => onChangeDocument(file, { provider: event.target.value })} />
                </div>
                <div>
                  <DatePickerField id={`${fieldId}-effective`} label="Effective date" placeholder="Unknown / not provided" value={selectedDate(document.issuedOnDate)} onChange={date => onChangeDocument(file, { issuedOnDate: date ? format(date, "yyyy-MM-dd") : "" })} />
                  {document.issuedOnDate && <Button type="button" variant="link" className="mt-1 h-auto rounded px-0 py-1 text-xs text-[#087b80]" aria-label={`Clear effective date for ${file.name}`} onClick={() => onChangeDocument(file, { issuedOnDate: "" })}>Clear date</Button>}
                </div>
                <div>
                  <DatePickerField id={`${fieldId}-expiry`} label="Expiry date" placeholder="Unknown / not provided" value={selectedDate(document.expiryDate)} onChange={date => onChangeDocument(file, { expiryDate: date ? format(date, "yyyy-MM-dd") : "" })} />
                  {document.expiryDate && <Button type="button" variant="link" className="mt-1 h-auto rounded px-0 py-1 text-xs text-[#087b80]" aria-label={`Clear expiry date for ${file.name}`} onClick={() => onChangeDocument(file, { expiryDate: "" })}>Clear date</Button>}
                </div>
              </div>
              <p className="text-[12px] leading-5 text-[#617579]">Leave dates blank when they are unknown. Autofill suggestions are reviewed before applying to the client form.</p>
              <div className="flex flex-wrap items-center gap-2 border-t border-[#edf1f2] pt-3">
                <Button type="button" variant="outline" className="h-10 rounded-lg px-3 text-xs" aria-label={`Preview ${file.name}`} disabled={disabled} onClick={() => setPreview({ title: document.title || file.name, fileName: file.name, file, url: URL.createObjectURL(file) })}><Eye className="size-4" aria-hidden="true" />Preview</Button>
                {renderAutofillAction(document)}
              </div>
            </fieldset>
          </article>;
        })}
        <p className="text-[12px] leading-5 text-[#617579]">Removing a file keeps values already applied to the form.</p>
      </div> : <p className="rounded-xl border border-dashed border-[#dce6e7] px-4 py-6 text-center text-[13px] text-[#617579]">No new documents added.</p>}
    </section>

    {existingDocuments.length > 0 && <section aria-label="Saved documents" className="space-y-3">
      <h2 className="!mb-0">Saved documents</h2>
      <p className="text-[12px] leading-5 text-[#617579]">These files are already on the client record. Manage them from the client's Documents tab.</p>
      <ul className="space-y-2">
        {existingDocuments.map((document, index) => {
          const title = document.title || document.fileName || "Document";
          const url = clientDocumentUrl(document.url);
          return <li key={`${document.url || title}-${index}`} className="flex items-center gap-3 rounded-xl border border-[#dce6e7] bg-[#f8fbfb] px-3 py-3 sm:px-4">
            <FileText className="size-5 shrink-0 text-[#087b80]" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-5 text-[#10141a] [overflow-wrap:anywhere]">{title}</p>
              <p className="mt-0.5 text-[12px] leading-5 text-[#617579] [overflow-wrap:anywhere]">{document.category || "Other"} · {document.source || "Source not recorded"}</p>
              <p className="mt-0.5 text-[12px] leading-5 text-[#617579]">Effective: {displayDate(document.issuedOnDate)} · Expiry: {displayDate(document.expiryDate)}</p>
            </div>
            {url && <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 rounded-xl p-0 text-[#087b80]" aria-label={`Preview ${document.fileName || title}`} disabled={disabled} onClick={() => setPreview({ title, fileName: document.fileName, url })}><Eye className="size-4" aria-hidden="true" /></Button>}
          </li>;
        })}
      </ul>
    </section>}
    <DocumentPreviewModal open={Boolean(preview)} onOpenChange={open => { if (!open) setPreview(null); }} title={preview?.title || "Document preview"} url={preview?.url} fileName={preview?.fileName} />
  </div>;
}
