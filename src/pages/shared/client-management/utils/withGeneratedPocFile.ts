import type { AddClientFormData } from "../types/formData";

/** Pure helper: return form data with generated POC file attached. */
export function withGeneratedPocFile(
  formData: AddClientFormData,
  patch: { file: File; fileName: string; issuedOnDate?: Date },
): AddClientFormData {
  return {
    ...formData,
    stage3: {
      ...formData.stage3,
      docs: formData.stage3.docs.map((d) =>
        d.key === "poc"
          ? {
              ...d,
              file: patch.file,
              fileName: patch.fileName,
              issuedOnDate: patch.issuedOnDate ?? d.issuedOnDate,
            }
          : d,
      ),
    },
  };
}
