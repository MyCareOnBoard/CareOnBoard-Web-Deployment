import { useState, useCallback } from "react";
import { AddClientFormData } from "../types/formData";
import { createClient, updateClient } from "@/lib/api/clients";
import { formDataToApiPayload } from "../utils/formDataToApiPayload";
import { handleDocumentUploads } from "../utils/documentUploadHandler";

export function useClientSave() {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStage, setSaveStage] = useState<1 | 2>(1);
  const [showSavingModal, setShowSavingModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const saveClient = useCallback(async (
    formData: AddClientFormData,
    isEditMode: boolean,
    clientId?: string,
    includeAgencyId: boolean = false,
    progressive: boolean = false,
    markComplete: boolean = false
  ): Promise<{ success: boolean; clientId?: string; clientName?: string; error?: string }> => {
    if (isSaving) {
      return { success: false, error: "Save already in progress" };
    }

    setIsSaving(true);
    setShowSavingModal(true);
    setSaveStage(1);
    setErrorMessage(undefined);

    try {
      const payload = formDataToApiPayload(formData, includeAgencyId, progressive, markComplete);

      const useUpdatePath = isEditMode || (progressive && clientId);

      if (useUpdatePath && clientId) {
        const { documents, ...payloadWithoutDocs } = payload;
        await updateClient(clientId, payloadWithoutDocs);

        const fullName =
          `${formData.stage1.firstName || ""} ${formData.stage1.lastName || ""}`.trim();
        const clientName = fullName || "Client";

        setSaveStage(2);
        const finalDocuments = await handleDocumentUploads(clientId, formData);
        await updateClient(clientId, { documents: finalDocuments });

        setIsSaving(false);
        setShowSavingModal(false);
        return { success: true, clientId, clientName };
      } else {
        const { documents, ...payloadWithoutDocs } = payload;
        const created = await createClient(payloadWithoutDocs);

        const fullName =
          `${created.firstName || ""} ${created.lastName || ""}`.trim() ||
          `${formData.stage1.firstName || ""} ${formData.stage1.lastName || ""}`.trim();
        const clientName = fullName || "Client";

        setSaveStage(2);
        const finalDocuments = await handleDocumentUploads(created.id, formData);
        await updateClient(created.id, { documents: finalDocuments });

        setIsSaving(false);
        setShowSavingModal(false);
        return { success: true, clientId: created.id, clientName };
      }
    } catch (e: any) {
      console.error("Save client failed:", e);
      const error = e?.message || "Failed to save client. Please try again.";
      setErrorMessage(error);
      setIsSaving(false);
      setShowSavingModal(false);
      return { success: false, error };
    }
  }, []);

  return {
    saveClient,
    isSaving,
    saveStage,
    showSavingModal,
    errorMessage,
    setErrorMessage,
  };
}
