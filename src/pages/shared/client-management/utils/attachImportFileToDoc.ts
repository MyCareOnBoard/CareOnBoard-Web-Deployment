import type { AddClientFormData, DocKey } from "../types/formData";

/**
 * Attach an uploaded file to a Stage 3 document slot by key (immutably).
 * Used when an import flow knows exactly which slot a file belongs to (e.g. the HHA
 * POC / Clinical Assessment import attaches each file to its own slot).
 */
export function attachImportFileToDoc(
  formData: AddClientFormData,
  key: DocKey,
  file: File,
): AddClientFormData {
  return {
    ...formData,
    stage3: {
      ...formData.stage3,
      docs: formData.stage3.docs.map((d) =>
        // Clear any stale multi-file selection so the upload handler uses this file.
        d.key === key ? { ...d, file, files: undefined, fileName: file.name } : d,
      ),
    },
  };
}
