import React, { useCallback, useMemo } from "react";
import { Info } from "lucide-react";
import { extractClientIspViaApi } from "@/lib/api/gemini";
import type { ClientExtractionResponse } from "../types/clientExtraction";
import type { AddClientFormData } from "../types/formData";
import { mergeExtractionDraft } from "../utils/mergeExtractionDraft";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import DocumentImportDialog, {
  type ImportSlot,
} from "./extraction/DocumentImportDialog";

const SLOTS: ImportSlot[] = [{ id: "file", label: "ISP document" }];

/**
 * A folder-imported file is attached to its guessed slot before it is read. When the
 * reader recognises it as a different document, drop the guessed copy so the file is
 * not saved twice.
 */
export function withoutGuessedSlot(formData: AddClientFormData, file: File | undefined, detected: string): AddClientFormData {
  if (!file || !formData.stage3.docs.some((d) => d.key === detected)) return formData;
  return {
    ...formData,
    stage3: {
      ...formData.stage3,
      docs: formData.stage3.docs.map((d) => {
        if (d.key === detected || (d.file !== file && !d.files?.includes(file))) return d;
        const files = (d.files ?? (d.file ? [d.file] : [])).filter((f) => f !== file);
        return { ...d, file: files[0], files: files.length > 1 ? files : undefined, fileName: files.length ? files.map((f) => f.name).join(", ") : undefined };
      }),
    },
  };
}

export default function ClientImportFromFilePanel({
  formData,
  setFormData,
  autoStartFile,
}: {
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
  /** Folder import: read this file as soon as the wizard opens. */
  autoStartFile?: File;
}) {
  const autoStartFiles = useMemo(() => (autoStartFile ? { file: autoStartFile } : undefined), [autoStartFile]);
  const onExtract = useCallback(
    (files: Record<string, File>) =>
      extractClientIspViaApi(files.file, { type: formData.type }),
    [formData.type],
  );

  const onApply = useCallback(
    (
      extraction: ClientExtractionResponse,
      { overwrite, files }: { overwrite: boolean; files: Record<string, File> },
    ) => {
      const base = withoutGuessedSlot(formData, files.file, extraction.detectedDocumentType);
      const { formData: merged } = mergeExtractionDraft(base, extraction, {
        overwrite,
        importFile: files.file ?? null,
      });
      setFormData(merged);
    },
    [formData, setFormData],
  );

  const computePreviewWarnings = useCallback(
    (
      extraction: ClientExtractionResponse,
      { overwrite, files }: { overwrite: boolean; files: Record<string, File> },
    ) =>
      mergeExtractionDraft(formData, extraction, {
        overwrite,
        importFile: files.file ?? null,
      }).localWarnings,
    [formData],
  );

  const pickDescription = (
    <div className="flex items-start gap-2">
      <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-muted-foreground">
        Upload an ISP (PDF, JPEG, PNG, or WebP, up to 10 MB). Review the extracted fields
        before saving.
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
  );

  return (
    <DocumentImportDialog
      triggerLabel="Import from ISP document"
      triggerLabelMobile="Import"
      triggerAriaLabel="Import from ISP document"
      dialogTitlePick="Import from ISP document"
      pickDescription={pickDescription}
      slots={SLOTS}
      autoExtractOnPick
      onExtract={onExtract}
      onApply={onApply}
      computePreviewWarnings={computePreviewWarnings}
      initialFiles={autoStartFiles}
      autoStart={Boolean(autoStartFiles)}
    />
  );
}
