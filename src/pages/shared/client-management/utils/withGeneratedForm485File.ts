import type { AddClientFormData } from "../types/formData";

/**
 * Pure helper: return form data with the generated Form 485 file attached.
 * A generated form is always unsigned, so `signed` is forced to false — the
 * staff sign offline and flip the toggle once the signed copy is uploaded.
 */
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
              signed: false,
            }
          : d,
      ),
    },
  };
}
