import React, { useMemo, useCallback } from "react";
import { AddClientFormData } from "./types/formData";
import { ClientFormConfig } from "./types/config";
import { useClientForm } from "./hooks/useClientForm";
import { useClientSave } from "./hooks/useClientSave";
import { StageFooter } from "./components/StageFooter";
import { SaveClientSuccessModal } from "./components/SaveClientSuccessModal";
import { SaveClientErrorModal } from "./components/SaveClientErrorModal";
import { Stage1ClientIdentityAndContact } from "./stages/Stage1ClientIdentityAndContact";
import { Stage2GuardianAndFunding } from "./stages/Stage2GuardianAndFunding";
import { Stage3HealthcareAndDocuments } from "./stages/Stage3HealthcareAndDocuments";
import { Stage4EvvAndVisitConfig } from "./stages/Stage4EvvAndVisitConfig";
import { Stage5StaffAssignmentAndRestrictions } from "./stages/Stage5StaffAssignmentAndRestrictions";
import { Stage6GoalsAndEmergency } from "./stages/Stage6GoalsAndEmergency";
import { Stage7SystemAiAndAudit } from "./stages/Stage7SystemAiAndAudit";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

type ClientFormWizardProps = {
  initialFormData?: AddClientFormData;
  clientId?: string;
  isEditMode?: boolean;
  config: ClientFormConfig;
  onSuccess?: (clientId?: string, isProgressive?: boolean) => void;
};

export function ClientFormWizard({
  initialFormData,
  clientId,
  isEditMode = false,
  config,
  onSuccess,
}: ClientFormWizardProps) {
  const {
    formData,
    setFormData,
    stage,
    declared,
    setDeclared,
    isFirst,
    isLast,
    goToNext,
    goToPrev,
  } = useClientForm(initialFormData);

  const {
    saveClient,
    isSaving,
    saveStage,
    showSavingModal,
    errorMessage,
    setErrorMessage,
  } = useClientSave();

  const [showSaveSuccess, setShowSaveSuccess] = React.useState(false);
  const [savedClientName, setSavedClientName] = React.useState<string | undefined>(undefined);

  const handleSave = useCallback(async () => {
    const result = await saveClient(
      formData,
      isEditMode,
      clientId,
      config.showAgencySelection,
      !isLast,
      isLast
    );

    if (result.success) {
      const isProgressive = !isLast;
      if (isProgressive && onSuccess && result.clientId) {
        onSuccess(result.clientId, true);
      } else {
        setSavedClientName(result.clientName);
        setShowSaveSuccess(true);
        if (onSuccess) {
          onSuccess(result.clientId);
        }
      }
    }
  }, [
    formData,
    isEditMode,
    clientId,
    config.showAgencySelection,
    isLast,
    onSuccess,
    saveClient,
  ]);

  const handleSuccessClose = useCallback(() => {
    setShowSaveSuccess(false);
    if (onSuccess) {
      onSuccess();
    }
  }, [onSuccess]);

  const handleErrorClose = useCallback((open: boolean) => {
    if (!open) setErrorMessage(undefined);
  }, []);

  const footer = useMemo(
    () => (
      <StageFooter
        declared={declared}
        setDeclared={setDeclared}
        isFirst={isFirst}
        isLast={isLast}
        onPrev={goToPrev}
        onNext={goToNext}
        onSave={handleSave}
        primaryLoading={isSaving}
        requireDeclaration={true}
        saveButtonText={config.successMessage || "Save Progress"}
      />
    ),
    [declared, isFirst, isLast, isSaving, config.successMessage, goToNext, goToPrev, handleSave]
  );

  const pageTitle = config.pageTitle || (isEditMode ? "Edit client" : "Add client");

  const stageContent = useMemo(() => {
    if (stage === 1)
      return (
        <Stage1ClientIdentityAndContact
          showAgencySelection={config.showAgencySelection}
          agencies={config.agencies || []}
          loadingAgencies={config.loadingAgencies || false}
          userAgencyId={config.userAgencyId}
          footer={footer}
          formData={formData}
          setFormData={setFormData}
          pageTitle={pageTitle}
          backNavigate={config.backNavigate}
          clientId={config.clientId}
          isEditMode={config.isEditMode}
        />
      );
    if (stage === 2)
      return (
        <Stage2GuardianAndFunding
          footer={footer}
          formData={formData}
          setFormData={setFormData}
          pageTitle={pageTitle}
        />
      );
    if (stage === 3)
      return (
        <Stage3HealthcareAndDocuments
          footer={footer}
          formData={formData}
          setFormData={setFormData}
          pageTitle={pageTitle}
        />
      );
    if (stage === 4)
      return (
        <Stage4EvvAndVisitConfig
          footer={footer}
          formData={formData}
          setFormData={setFormData}
          pageTitle={pageTitle}
        />
      );
    if (stage === 5)
      return (
        <Stage5StaffAssignmentAndRestrictions
          footer={footer}
          formData={formData}
          setFormData={setFormData}
          pageTitle={pageTitle}
        />
      );
    if (stage === 6)
      return (
        <Stage6GoalsAndEmergency
          footer={footer}
          formData={formData}
          setFormData={setFormData}
          pageTitle={pageTitle}
        />
      );
    if (stage === 7)
      return (
        <Stage7SystemAiAndAudit
          footer={footer}
          formData={formData}
          setFormData={setFormData}
          pageTitle={pageTitle}
        />
      );
    return null;
  }, [
    stage,
    config,
    formData,
    setFormData,
    pageTitle,
    footer,
  ]);

  return (
    <>
      {stageContent}

      <Dialog open={showSavingModal} onOpenChange={() => {}}>
        <DialogContent
          showCloseButton={false}
          className="w-[min(90vw,426px)] gap-6 p-5"
        >
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-[#00b4b8] animate-spin" />
            <p className="text-center text-[16px] font-semibold text-[#10141a]">
              {saveStage === 1 ? "Saving client information..." : "Uploading documents..."}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <SaveClientSuccessModal
        open={showSaveSuccess}
        onOpenChange={handleSuccessClose}
        clientName={savedClientName}
      />

      <SaveClientErrorModal
        open={!!errorMessage}
        onOpenChange={handleErrorClose}
        errorMessage={errorMessage}
      />
    </>
  );
}
