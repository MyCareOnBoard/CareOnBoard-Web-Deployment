import { useState, useCallback, useRef } from "react";
import { AddClientFormData } from "../types/formData";
import { createClientWithReview, updateClientWithReview, updateClient, type ClientDocument } from "@/lib/api/clients";
import {assignmentReviewMetadata, type AssignmentReviewEnvelope} from '@/lib/api/assignment-review';
import {parseAssignmentDecisions, assignmentDecisionError, type AssignmentDecisionEnvelope, type AssignmentAcknowledgment} from '@/lib/api/assignment-decision';
import { formDataToApiPayload } from "../utils/formDataToApiPayload";
import { handleDocumentUploads } from "../utils/documentUploadHandler";
import { hasClientDocumentEdits, preflightClientDocumentEdits } from "../utils/clientDocumentEdits";
import { hasUploadedForm485 } from "../utils/form485GenerationEligibility";

export function withoutClientAssignments(form: AddClientFormData): AddClientFormData {
  return {...form, stage2: {...form.stage2,
    outcomes: form.stage2.outcomes.map(outcome => ({...outcome, services: outcome.services.map(row => ({...row, assignedDsps: []}))})),
    hhaAuthorizations: form.stage2.hhaAuthorizations?.map(row => ({...row, assignedDsps: []})),
  }};
}

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
    markComplete: boolean = false,
    assignmentAcknowledgments: AssignmentAcknowledgment[] = []
  ): Promise<{ success: boolean; clientId?: string; clientName?: string; documents?: ClientDocument[]; error?: string; assignmentReview?: AssignmentReviewEnvelope; assignmentDecisions?: AssignmentDecisionEnvelope['assignmentDecisions']; assignmentError?: ReturnType<typeof assignmentDecisionError>; documentsChangedAfterReview?: boolean }> => {
    if (savingRef.current) return { success: false, error: "Save already in progress" };
    savingRef.current = true;
    setIsSaving(true);
    setShowSavingModal(true);
    setSaveStage(1);
    setErrorMessage(undefined);
    let savedClientId = clientId;

    try {
      preflightClientDocumentEdits(formData.stage3);
      if (markComplete && formData.acuityRequirements?.enabled) {
        if (!formData.acuityRequirements.types.length) throw new Error('Select Medication, Behavioral, or Both in Step 3 before completing onboarding.');
        const hasAenf = formData.stage3.docs.some(doc => doc.key === 'aenf' && (doc.file || doc.files?.length || doc.url?.trim()))
          || formData.stage3.originalDocuments?.some(doc => doc.key === 'aenf' && doc.url?.trim());
        if (!hasAenf) throw new Error('Upload the required AENF in Step 3 before completing onboarding.');
      }
      const documentsChanged = hasClientDocumentEdits(formData.stage3);
      const { documents: _documents, ...payload } = formDataToApiPayload(formData, includeAgencyId, progressive, markComplete);
      // Upload first; the server checks the saved AENF when the final active status is sent.
      if (markComplete && formData.acuityRequirements?.enabled) delete payload.status;
      if (isEditMode && !savedClientId) throw new Error("Reload the client before saving.");
      const profileResponse = savedClientId
        ? await updateClientWithReview(savedClientId, payload, formData.agencyId, assignmentAcknowledgments)
        : await createClientWithReview(payload, assignmentAcknowledgments);
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
      return { success: true, clientId: savedClientId, clientName, documents: finalDocuments, assignmentReview, ...parseAssignmentDecisions(profileResponse), documentsChangedAfterReview: documentsChanged };
    } catch (e: any) {
      console.error("Save client failed.", {status: e?.response?.status, code: e?.response?.data?.code});
      const error = e?.response?.data?.error || e?.response?.data?.message || e?.message || "Failed to save client. Please try again.";
      setErrorMessage(error);
      return { success: false, clientId: savedClientId, error, assignmentError: assignmentDecisionError(e), ...parseAssignmentDecisions(e?.response?.data) };
    } finally {
      savingRef.current = false;
      setIsSaving(false);
      setShowSavingModal(false);
    }
  }, []);

  return { saveClient, isSaving, saveStage, showSavingModal, errorMessage, setErrorMessage };
}
