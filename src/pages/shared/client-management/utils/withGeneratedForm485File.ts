import type { AddClientFormData } from "../types/formData";

/** Pure helper: return form data with the generated Form 485 file attached. */
export function withGeneratedForm485File(
  formData: AddClientFormData,
  patch: { file: File; fileName: string; issuedOnDate?: Date },
): AddClientFormData {
  return {
    ...formData,
    stage3: {
      ...formData.stage3,
      docs: formData.stage3.docs.map((d) =>
        d.key === "form485"
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
