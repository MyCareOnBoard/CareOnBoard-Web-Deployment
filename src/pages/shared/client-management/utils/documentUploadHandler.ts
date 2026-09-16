import type { AddClientFormData } from "../types/formData";
import { type ClientDocument, uploadClientDocument } from "@/lib/api/clients";
import { DOC_KEY_TO_SERVER_TYPE } from "./documentTypeConstants";
import { clientDocumentReplacement, hasClientDocumentEdit, mergeClientDocumentEdit, preflightClientDocumentEdits } from "./clientDocumentEdits";

export async function handleDocumentUploads(clientId: string, formData: AddClientFormData): Promise<ClientDocument[]> {
  const stage3 = formData.stage3;
  preflightClientDocumentEdits(stage3);
  let documents = stage3.originalDocuments ?? [];
  for (const doc of stage3.docs.filter(hasClientDocumentEdit)) {
    const replacement = clientDocumentReplacement(doc);
    const files = doc.files?.length ? doc.files : doc.file ? [doc.file] : [];
    if (!files.length) {
      documents = mergeClientDocumentEdit({ originalDocuments: documents, originalDocument: doc.originalDocument, replacement });
      continue;
    }
    for (const [index, file] of files.entries()) {
      const uploaded = await uploadClientDocument(clientId, DOC_KEY_TO_SERVER_TYPE[doc.key] ?? doc.key, file);
      documents = mergeClientDocumentEdit({ originalDocuments: documents, originalDocument: index === 0 ? doc.originalDocument : undefined,
        replacement: { ...replacement, url: uploaded.url, fileName: uploaded.fileName } });
    }
  }
  return documents;
}
