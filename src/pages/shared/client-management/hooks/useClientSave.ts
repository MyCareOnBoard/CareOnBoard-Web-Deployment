import { useState, useCallback, useRef } from "react";
import { AddClientFormData } from "../types/formData";
import { createClientWithReview, updateClientWithReview, updateClient, type ClientDocument } from "@/lib/api/clients";
import {assignmentReviewMetadata, type AssignmentReviewEnvelope} from '@/lib/api/assignment-review';
import { formDataToApiPayload } from "../utils/formDataToApiPayload";
import { handleDocumentUploads } from "../utils/documentUploadHandler";
import { hasClientDocumentEdits, preflightClientDocumentEdits } from "../utils/clientDocumentEdits";
import { hasUploadedForm485 } from "../utils/form485GenerationEligibility";

export function useClientSave() {
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
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
  ): Promise<{ success: boolean; clientId?: string; clientName?: string; documents?: ClientDocument[]; error?: string; assignmentReview?: AssignmentReviewEnvelope; documentsChangedAfterReview?: boolean }> => {
    if (savingRef.current) return { success: false, error: "Save already in progress" };
    savingRef.current = true;
    setIsSaving(true);
    setShowSavingModal(true);
    setSaveStage(1);
    setErrorMessage(undefined);
    let savedClientId = clientId;

    try {
      preflightClientDocumentEdits(formData.stage3);
      const documentsChanged = hasClientDocumentEdits(formData.stage3);
      const { documents: _documents, ...payload } = formDataToApiPayload(formData, includeAgencyId, progressive, markComplete);
      if (isEditMode && !savedClientId) throw new Error("Reload the client before saving.");
      const profileResponse = savedClientId
        ? await updateClientWithReview(savedClientId, payload, formData.agencyId)
        : await createClientWithReview(payload);
      savedClientId = profileResponse.data.id || savedClientId;
      if (!savedClientId) throw new Error('Client save did not return an ID. Reload before trying again.');
      const assignmentReview = assignmentReviewMetadata(profileResponse);

      setSaveStage(2);
      const finalDocuments = documentsChanged
        ? await handleDocumentUploads(savedClientId, formData)
        : formData.stage3.originalDocuments;
      // Final status still runs when the document array is unchanged.
      const finalStatus = markComplete
        ? formData.type === "hha" && !hasUploadedForm485(finalDocuments ?? []) ? "pending" : "active"
        : undefined;
      if (documentsChanged || finalStatus) {
        await updateClient(savedClientId, {
          ...(documentsChanged ? { documents: finalDocuments } : {}),
          ...(finalStatus ? { status: finalStatus } : {}),
        }, ...(formData.agencyId ? [formData.agencyId] : []));
      }
      const clientName = `${formData.stage1.firstName || ""} ${formData.stage1.lastName || ""}`.trim() || "Client";
      return { success: true, clientId: savedClientId, clientName, documents: finalDocuments, assignmentReview, documentsChangedAfterReview: documentsChanged };
    } catch (e: any) {
      console.error("Save client failed:", e);
      const error = e?.response?.data?.error || e?.response?.data?.message || e?.message || "Failed to save client. Please try again.";
      setErrorMessage(error);
      return { success: false, clientId: savedClientId, error };
    } finally {
      savingRef.current = false;
      setIsSaving(false);
      setShowSavingModal(false);
    }
  }, []);

  return { saveClient, isSaving, saveStage, showSavingModal, errorMessage, setErrorMessage };
}
