import {AssignmentReviewRosterProvider, rosterAssignmentsChanged, type SavedRosterReview} from "@/components/AssignmentReviewRoster";
import {assignmentSaveMessage, assignmentServiceRowKey} from "@/lib/api/assignment-review";
import { refreshClientDocumentBaseline } from "./utils/clientDocumentEdits";
import React, { useMemo, useCallback, useEffect, Suspense, lazy, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AddClientFormData, createInitialDocs, type ClientType } from "./types/formData";
import { ClientFormConfig } from "./types/config";
import { useClientForm } from "./hooks/useClientForm";
import { useClientSave } from "./hooks/useClientSave";
import { useToast } from "@/hooks/use-toast";
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
import {
  canGeneratePoc,
  shouldShowPocSaveGuard,
} from "./utils/pocGenerationEligibility";
import {
  PocSaveGuardModal,
  type PocSaveGuardAction,
} from "./components/PocSaveGuardModal";
import type { GeneratePocPanelHandle } from "./components/GeneratePocPanel";
import { scrollToPocUpload } from "./utils/pocUploadDom";
import { ClientTypePicker } from "./components/ClientTypePicker";
import { useAuth } from "@/utils/auth";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";

const ClientImportFromFilePanel = lazy(
  () => import("./components/ClientImportFromFilePanel"),
);

const HhaImportFromFilePanel = lazy(
  () => import("./components/HhaImportFromFilePanel"),
);

const GeneratePocPanel = lazy(
  () => import("./components/GeneratePocPanel"),
);

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
    goToStage,
  } = useClientForm(initialFormData);

  const {
    saveClient,
    isSaving,
    saveStage,
    showSavingModal,
    errorMessage,
    setErrorMessage,
  } = useClientSave();

  const { toast } = useToast();
  const { user } = useAuth();
  const agencyMode = useEffectiveAgencyMode();
  const navigate = useNavigate();

  const [showSaveSuccess, setShowSaveSuccess] = React.useState(false);
  const [savedClientName, setSavedClientName] = React.useState<string | undefined>(undefined);
  const [pocGuardOpen, setPocGuardOpen] = useState(false);
  const [generatePocOpen, setGeneratePocOpen] = useState(false);
  const [typeSelected, setTypeSelected] = useState(isEditMode);
  const savedClientIdRef = useRef<string | undefined>(clientId);
  const reviewCaptureRef = useRef("");
  const savedAssignmentFormRef = useRef(initialFormData);
  const [savedReview, setSavedReview] = useState<SavedRosterReview>();
  const rosterRows = (data?: AddClientFormData) => data?.type === "hha" ? data.stage2.hhaAuthorizations ?? [] : data?.stage2.outcomes.flatMap(outcome => outcome.services) ?? [];
  const pendingSuccessClientIdRef = useRef<string | undefined>(undefined);
  const handleTypeSelect = useCallback(
    (type: ClientType) => {
      setFormData((prev) => ({
        ...prev,
        type,
        stage3: {
          ...prev.stage3,
          docs: createInitialDocs(type),
        },
      }));
      setTypeSelected(true);
    },
    [setFormData],
  );

  // Client types the agency is allowed to create. Missing/empty => both
  // (backward-compatible: existing agencies keep showing the picker).
  const allowed = useMemo<ClientType[]>(
    () =>
      config.supportedClientTypes?.length
        ? config.supportedClientTypes
        : ["ddd", "hha"],
    [config.supportedClientTypes],
  );

  // When the agency supports exactly one client type, skip the picker entirely
  // for new clients by auto-selecting that type (jumps straight to Stage 1).
  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (isEditMode) return;
    if (autoSelectedRef.current) return;
    if (allowed.length === 1) {
      autoSelectedRef.current = true;
      handleTypeSelect(allowed[0]);
    }
  }, [isEditMode, allowed, handleTypeSelect]);

  const handlePickerBack = useCallback(() => {
    if (config.backNavigate) {
      navigate(config.backNavigate);
    }
  }, [config.backNavigate, navigate]);

  const skipPocGuardRef = useRef(false);
  const generatePocRef = useRef<GeneratePocPanelHandle>(null);

  const runSave = useCallback(async (dataToSave: AddClientFormData = formData) => {
    const submittedViewKey = reviewCaptureRef.current;
    const assignmentsChanged = rosterAssignmentsChanged(rosterRows(savedAssignmentFormRef.current), rosterRows(dataToSave));
    const result = await saveClient(
      !isEditMode && agencyMode === "sc" && !dataToSave.servicePrograms ? { ...dataToSave, servicePrograms: ["sc"] } : dataToSave,
      isEditMode,
      clientId ?? savedClientIdRef.current,
      config.showAgencySelection,
      !isLast,
      isLast
    );

    if (result.clientId) savedClientIdRef.current = result.clientId;
    if (!result.success) return;
    const reviewMessage = agencyMode === "sc" ? undefined : assignmentSaveMessage(result.assignmentReview, assignmentsChanged, true);
    setSavedReview({metadata: result.assignmentReview, submittedViewKey, documentsChanged: !!result.documentsChangedAfterReview, assignmentChanged: assignmentsChanged});
    savedAssignmentFormRef.current = {...dataToSave, stage2: {...dataToSave.stage2,
      outcomes: dataToSave.stage2.outcomes.map(outcome => ({...outcome, services: outcome.services.map(row => ({...row, reviewSourceRowKey: assignmentServiceRowKey(row, "ddd")}))})),
      hhaAuthorizations: dataToSave.stage2.hhaAuthorizations?.map(row => ({...row, reviewSourceRowKey: assignmentServiceRowKey(row, "hha")})),
    }};
    if (reviewMessage) toast({title: "Assignment review", description: reviewMessage});
    if (result.documents) {
      const baseline = refreshClientDocumentBaseline(dataToSave.stage3, result.documents);
      setFormData(prev => ({ ...prev, stage3: { ...prev.stage3, docs: baseline.docs, originalDocuments: baseline.originalDocuments } }));
    }

    const isProgressive = !isLast;

    if (isProgressive) {
      toast({
        title: isEditMode ? "Client updated" : "Progress saved",
        description: isEditMode
          ? "Your changes have been saved."
          : "You can continue on the next stage.",
        variant: "success",
      });
      if (onSuccess && result.clientId) {
        onSuccess(result.clientId, true);
      }
      return;
    }

    if (isEditMode) {
      toast({
        title: "Client updated",
        description: result.clientName
          ? `${result.clientName} has been updated successfully.`
          : "Client has been updated successfully.",
        variant: "success",
      });
      onSuccess?.(result.clientId);
      return;
    }

    pendingSuccessClientIdRef.current = result.clientId;
    setSavedClientName(result.clientName);
    setShowSaveSuccess(true);
  }, [
    formData,
    agencyMode,
    isEditMode,
    clientId,
    config.showAgencySelection,
    isLast,
    onSuccess,
    saveClient,
    setFormData,
    toast,
  ]);

  const handleSave = useCallback(() => {
    if (!skipPocGuardRef.current && shouldShowPocSaveGuard(formData)) {
      setPocGuardOpen(true);
      return;
    }
    skipPocGuardRef.current = false;
    void runSave();
  }, [formData, runSave]);

  const handlePocGuardAction = useCallback(
    (action: PocSaveGuardAction) => {
      setPocGuardOpen(false);
      if (action === "upload") {
        if (stage !== 3) {
          goToStage(3);
          requestAnimationFrame(() => scrollToPocUpload());
        } else {
          scrollToPocUpload();
        }
        return;
      }
      if (action === "generate") {
        setGeneratePocOpen(true);
        generatePocRef.current?.openModal();
        return;
      }
      skipPocGuardRef.current = true;
      void runSave();
    },
    [runSave, stage, goToStage],
  );

  const handleSuccessClose = useCallback(() => {
    setShowSaveSuccess(false);
    onSuccess?.(pendingSuccessClientIdRef.current);
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
  const isDddClient = formData.type !== "hha";

  const stageContent = useMemo(() => {
    if (!isEditMode && !typeSelected) {
      return (
        <ClientTypePicker
          pageTitle={pageTitle}
          onSelect={handleTypeSelect}
          onBack={config.backNavigate ? handlePickerBack : undefined}
          allowed={allowed}
        />
      );
    }

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
          clientId={clientId ?? config.clientId}
          isEditMode={config.isEditMode}
          headerRightAction={
            !isEditMode ? (
              <Suspense fallback={null}>
                {formData.type === "hha" ? (
                  <HhaImportFromFilePanel formData={formData} setFormData={setFormData} />
                ) : (
                  <ClientImportFromFilePanel formData={formData} setFormData={setFormData} />
                )}
              </Suspense>
            ) : undefined
          }
        />
      );
    if (stage === 2)
      return (
        <AssignmentReviewRosterProvider enabled={agencyMode !== 'sc'} clientId={savedClientIdRef.current} agencyId={formData.agencyId} program={formData.type} savedRows={rosterRows(savedAssignmentFormRef.current)} captureRef={reviewCaptureRef} savedReview={savedReview}>
        <Stage2GuardianAndFunding
          footer={footer}
          formData={formData}
          setFormData={setFormData}
          pageTitle={pageTitle}
        />
        </AssignmentReviewRosterProvider>
      );
    if (stage === 3)
      return (
        <Stage3HealthcareAndDocuments
          footer={footer}
          formData={formData}
          setFormData={setFormData}
          pageTitle={pageTitle}
          clientId={clientId ?? savedClientIdRef.current}
          isSaving={isSaving}
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
    isEditMode,
    typeSelected,
    handleTypeSelect,
    handlePickerBack,
    clientId,
    isSaving,
    isDddClient,
    allowed,
  ]);

  return (
    <>
      {stage === 1 && user?.agency?.supportedClientTypes?.includes("sc") && (
        <label className="flex items-center gap-3 mb-5 text-sm">
          <input type="checkbox" checked={formData.servicePrograms?.includes("sc") ?? (!isEditMode && agencyMode === "sc")}
            disabled={agencyMode === "sc"}
            onChange={(event) => setFormData((previous) => ({ ...previous, servicePrograms: event.target.checked
              ? [...new Set([...(previous.servicePrograms ?? [previous.type]), "sc" as const])]
              : (previous.servicePrograms ?? [previous.type]).filter((program) => program !== "sc") }))} />
          Enroll this client in Support Coordination
        </label>
      )}
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

      <PocSaveGuardModal
        open={pocGuardOpen}
        onOpenChange={setPocGuardOpen}
        showGenerateOption={isDddClient && canGeneratePoc(formData)}
        onAction={handlePocGuardAction}
      />

      {(isDddClient && (canGeneratePoc(formData) || generatePocOpen)) ? (
        <Suspense fallback={null}>
          <GeneratePocPanel
            ref={generatePocRef}
            formData={formData}
            setFormData={setFormData}
            clientId={clientId}
            modalOnly
            open={generatePocOpen}
            onOpenChange={setGeneratePocOpen}
            onApplied={(nextFormData) => {
              skipPocGuardRef.current = true;
              void runSave(nextFormData);
            }}
          />
        </Suspense>
      ) : null}
    </>
  );
}
