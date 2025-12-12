import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import { Stage1ClientIdentityAndContact } from "@/pages/agency/add-client/stages/Stage1ClientIdentityAndContact";
import { Stage2GuardianAndFunding } from "@/pages/agency/add-client/stages/Stage2GuardianAndFunding";
import { Stage3HealthcareAndDocuments } from "@/pages/agency/add-client/stages/Stage3HealthcareAndDocuments";
import { Stage4EvvAndVisitConfig } from "@/pages/agency/add-client/stages/Stage4EvvAndVisitConfig";
import { Stage5StaffAssignmentAndRestrictions } from "@/pages/agency/add-client/stages/Stage5StaffAssignmentAndRestrictions";
import { Stage6GoalsAndEmergency } from "@/pages/agency/add-client/stages/Stage6GoalsAndEmergency";
import { Stage7SystemAiAndAudit } from "@/pages/agency/add-client/stages/Stage7SystemAiAndAudit";
import { StageFooter } from "@/pages/agency/add-client/components/StageFooter";
import { SaveClientSuccessModal } from "@/pages/agency/add-client/components/SaveClientSuccessModal";
import { createInitialAddClientFormData } from "@/pages/agency/add-client/formData";

export default function AddClientPage() {
  const navigate = useNavigate();
  const totalStages = 7;
  const [stage, setStage] = useState<number>(1);
  const [declared, setDeclared] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [savedClientName, setSavedClientName] = useState<string | undefined>(undefined);
  const [formData, setFormData] = useState(() => createInitialAddClientFormData());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Require re-confirmation per stage, like the Figma flow.
    setDeclared(false);
  }, [stage]);

  const isFirst = stage === 1;
  const isLast = stage === totalStages;

  const footer = useMemo(
    () => (
      <StageFooter
        declared={declared}
        setDeclared={setDeclared}
        isFirst={isFirst}
        isLast={isLast}
        onPrev={() => setStage((s) => Math.max(1, s - 1))}
        onNext={() => setStage((s) => Math.min(totalStages, s + 1))}
        onSave={async () => {
          if (isSaving) return;
          setIsSaving(true);
          try {
            // TODO: hook into real API save once backend payload mapping is finalized.
            // For now, treat Save as successful and show the success modal.
            const fullName = `${formData.stage1.firstName} ${formData.stage1.lastName}`.trim();
            setSavedClientName(fullName.length > 0 ? fullName : undefined);
            setShowSaveSuccess(true);
          } finally {
            setIsSaving(false);
          }
        }}
        primaryLoading={isSaving}
        requireDeclaration={true}
      />
    ),
    [declared, formData.stage1.firstName, formData.stage1.lastName, isFirst, isLast, isSaving]
  );

  const stageContent = (() => {
    if (stage === 1)
      return <Stage1ClientIdentityAndContact footer={footer} formData={formData} setFormData={setFormData} />;
    if (stage === 2)
      return <Stage2GuardianAndFunding footer={footer} formData={formData} setFormData={setFormData} />;
    if (stage === 3)
      return <Stage3HealthcareAndDocuments footer={footer} formData={formData} setFormData={setFormData} />;
    if (stage === 4)
      return <Stage4EvvAndVisitConfig footer={footer} formData={formData} setFormData={setFormData} />;
    if (stage === 5)
      return <Stage5StaffAssignmentAndRestrictions footer={footer} formData={formData} setFormData={setFormData} />;
    if (stage === 6)
      return <Stage6GoalsAndEmergency footer={footer} formData={formData} setFormData={setFormData} />;
    if (stage === 7)
      return <Stage7SystemAiAndAudit footer={footer} formData={formData} setFormData={setFormData} />;
    return null;
  })();

  if (stageContent) {
    return (
      <>
        {stageContent}
        <SaveClientSuccessModal
          open={showSaveSuccess}
          onOpenChange={(open) => {
            setShowSaveSuccess(open);
            if (!open) {
              navigate(Routes.agency.clients);
            }
          }}
          clientName={savedClientName}
        />
      </>
    );
  }

  if (
    stage !== 1 &&
    stage !== 2 &&
    stage !== 3 &&
    stage !== 4 &&
    stage !== 5 &&
    stage !== 6 &&
    stage !== 7
  ) {
    return (
      <div className="min-h-[calc(100vh-200px)]">
        <div className="mb-10">
          <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
            Add client
          </h1>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081] mt-2">
            Stage {stage}/7 coming soon.
          </p>
        </div>
      </div>
    );
  }

  return null;
}


