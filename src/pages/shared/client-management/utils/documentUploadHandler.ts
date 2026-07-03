import { AddClientFormData, DocKey } from "../types/formData";
import { ClientDocument, ClientDocumentKey, ClientDocumentUploadResult, uploadClientDocument } from "@/lib/api/clients";
import { DOC_KEY_TO_SERVER_TYPE } from "./documentTypeConstants";

const docKeyToType: Record<string, string> = DOC_KEY_TO_SERVER_TYPE;

export async function handleDocumentUploads(
  clientId: string,
  formData: AddClientFormData
): Promise<ClientDocument[]> {
  const uploadResults: Record<string, ClientDocumentUploadResult[]> = {};

  for (const doc of formData.stage3.docs) {
    const documentType = docKeyToType[doc.key];
    if (!documentType) continue;

    const filesToUpload: File[] = [];
    if (doc.files && doc.files.length > 0) {
      filesToUpload.push(...doc.files);
    } else if (doc.file) {
      filesToUpload.push(doc.file);
    }

    if (filesToUpload.length === 0) continue;

    const results: ClientDocumentUploadResult[] = [];
    for (const file of filesToUpload) {
      const result = await uploadClientDocument(clientId, documentType, file);
      results.push(result);
    }

    uploadResults[doc.key] = results;
  }

  const existingDocs = formData.stage3.docs.filter((d) => d.url && !d.file && !d.files);
  const finalDocuments: ClientDocument[] = existingDocs.map((doc) => ({
    key: doc.key as ClientDocumentKey,
    title: doc.title || "",
    fileName: doc.fileName,
    url: doc.url!,
    issuedOnDate: doc.issuedOnDate ? doc.issuedOnDate.toISOString() : undefined,
    expiryDate: doc.expiryDate ? doc.expiryDate.toISOString() : undefined,
    autoReminder: doc.autoReminder,
    // Carry signed/unsigned for Form 485. Pass through undefined (legacy docs)
    // rather than coercing to false, so re-saving a grandfathered 485 doesn't
    // flip it to "unsigned" and start a grace clock.
    ...(doc.key === "form485" ? { signed: doc.signed } : {}),
  }));

  for (const key in uploadResults) {
    const matchingDoc = formData.stage3.docs.find((d) => d.key === (key as DocKey));

    for (const result of uploadResults[key]) {
      finalDocuments.push({
        key: key as ClientDocumentKey,
        title: matchingDoc?.title || "",
        fileName: result.fileName,
        url: result.url,
        issuedOnDate: matchingDoc?.issuedOnDate
          ? matchingDoc.issuedOnDate.toISOString()
          : undefined,
        expiryDate: matchingDoc?.expiryDate
          ? matchingDoc.expiryDate.toISOString()
          : undefined,
        autoReminder: matchingDoc?.autoReminder,
        ...(key === "form485" ? { signed: matchingDoc?.signed } : {}),
      });
    }
  }

  return finalDocuments;
}
