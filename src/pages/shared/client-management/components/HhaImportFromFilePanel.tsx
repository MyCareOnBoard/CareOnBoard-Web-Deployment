import React, { useCallback } from "react";
import { extractClientHhaPocClinicalViaApi } from "@/lib/api/gemini";
import type { ClientExtractionResponse } from "../types/clientExtraction";
import type { AddClientFormData } from "../types/formData";
import { mergeExtractionDraft } from "../utils/mergeExtractionDraft";
import { attachImportFileToDoc } from "../utils/attachImportFileToDoc";
import DocumentImportDialog, {
  type DownloadForm,
  type ImportSlot,
} from "./extraction/DocumentImportDialog";

const SLOTS: ImportSlot[] = [
  { id: "poc", label: "Plan of Care" },
  { id: "clinicalAssessment", label: "Clinical Assessment" },
];

const DOWNLOAD_FORMS: DownloadForm[] = [
  { label: "Plan of Care form", href: "/assets/Plan_of_Care_Form.pdf" },
  { label: "Clinical Assessment form", href: "/assets/Clinical_Assessment_Form.pdf" },
];

export default function HhaImportFromFilePanel({
  formData,
  setFormData,
}: {
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
}) {
  const onExtract = useCallback(
    (files: Record<string, File>) =>
      extractClientHhaPocClinicalViaApi({
        poc: files.poc,
        clinicalAssessment: files.clinicalAssessment,
      }),
    [],
  );

  const onApply = useCallback(
    (
      extraction: ClientExtractionResponse,
      { overwrite, files }: { overwrite: boolean; files: Record<string, File> },
    ) => {
      let merged = mergeExtractionDraft(formData, extraction, { overwrite }).formData;
      // Attach each uploaded file to its own Stage 3 slot (these keys are not part of
      // the merge's single-detectedDocumentType auto-attach).
      if (files.poc) merged = attachImportFileToDoc(merged, "poc", files.poc);
      if (files.clinicalAssessment) {
        merged = attachImportFileToDoc(merged, "clinicalAssessment", files.clinicalAssessment);
      }
      setFormData(merged);
    },
    [formData, setFormData],
  );

  const computePreviewWarnings = useCallback(
    (extraction: ClientExtractionResponse, { overwrite }: { overwrite: boolean }) =>
      mergeExtractionDraft(formData, extraction, { overwrite }).localWarnings,
    [formData],
  );

  const pickDescription = (
    <p className="text-[12px] leading-relaxed text-muted-foreground">
      Upload the client's Plan of Care and/or Clinical Assessment (PDF, JPEG, PNG, or WebP,
      up to 10 MB each), then extract to auto-fill the form. Each file is attached to its
      matching slot in step 3 (Healthcare &amp; Documents). Review every value before saving.
    </p>
  );

  return (
    <DocumentImportDialog
      triggerLabel="Import from POC / Clinical Assessment"
      triggerLabelMobile="Import"
      triggerAriaLabel="Import from Plan of Care or Clinical Assessment"
      dialogTitlePick="Import from Plan of Care / Clinical Assessment"
      pickDescription={pickDescription}
      slots={SLOTS}
      downloadForms={DOWNLOAD_FORMS}
      onExtract={onExtract}
      onApply={onApply}
      computePreviewWarnings={computePreviewWarnings}
    />
  );
}
