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
import { createAgencyClient, type CreateClientRequest } from "@/lib/api/clients";

export default function AddClientPage() {
  const navigate = useNavigate();
  const totalStages = 7;
  const [stage, setStage] = useState<number>(1);
  const [declared, setDeclared] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [savedClientName, setSavedClientName] = useState<string | undefined>(undefined);
  const [formData, setFormData] = useState(() => createInitialAddClientFormData());
  const [isSaving, setIsSaving] = useState(false);

  const flattenAddClientFormData = (): CreateClientRequest => {
    const s1 = formData.stage1;
    const s2 = formData.stage2;
    const s3 = formData.stage3;
    const s4 = formData.stage4;
    const s5 = formData.stage5;
    const s6 = formData.stage6;
    const s7 = formData.stage7;

    const toIso = (d?: Date) => (d ? d.toISOString() : undefined);

    const location = s1.location;
    if (!location || !location.lat || !location.lon) {
      throw new Error("Please select an address from the suggestions so we can capture coordinates.");
    }

    const services =
      s2.services?.map((svc) => ({
        id: svc.id,
        name: svc.name || "",
        code: svc.code || "",
        hours: svc.hours || "",
        rate: svc.rate || "",
        ispEffectiveDate: toIso(svc.ispEffectiveDate),
        startAuthDate: toIso(svc.startAuthDate),
        endAuthDate: toIso(svc.endAuthDate),
        pcptDate: toIso(svc.pcptDate),
        sdrDate: toIso(svc.sdrDate),
      })) ?? [];

    const hasInvalidService = services.some((svc) => !svc.name || !svc.code);
    if (hasInvalidService) {
      throw new Error("Please select an Authorized Service for each service block (service code will auto-populate).");
    }

    const primaryService = services[0];

    return {
      // Stage 1
      firstName: s1.firstName || undefined,
      lastName: s1.lastName || undefined,
      middleName: s1.middleName || undefined,
      gender: s1.gender || undefined,
      email: s1.email || undefined,
      phone: s1.phone || undefined,
      dateOfBirth: toIso(s1.dob),
      address: s1.address || undefined,
      location,
      countyState: s1.countyState || undefined,
      zipCode: s1.zipCode || undefined,
      languagePreference: s1.language || undefined,
      communicationMethod: s1.communicationMethod || undefined,
      medicaidId: s1.medicaidId || undefined,
      dddId: s1.dddId || undefined,
      ssn: s1.ssn || undefined,
      nursingLevel: s1.nursingLevel || undefined,

      // Top-level service summary (optional, but useful for lists)
      service: primaryService?.name,
      serviceCode: primaryService?.code,
      billingRate: primaryService?.rate,

      // Stage 2
      guardianName: s2.guardianName || undefined,
      guardianRelationship: s2.guardianRelationship || undefined,
      guardianEmail: s2.guardianEmail || undefined,
      guardianPhone: s2.guardianPhone || undefined,
      guardianAddress: s2.guardianAddress || undefined,
      supportCoordinatorName: s2.supportCoordinatorName || undefined,
      supportCoordinatorAgency: s2.supportCoordinatorAgency || undefined,
      supportCoordinatorContact: s2.supportCoordinatorContact || undefined,
      services,

      // Stage 3
      medicalConditions: s3.medicalConditions || undefined,
      allergies: s3.allergies || undefined,
      dietaryRestrictions: s3.dietaryRestrictions || undefined,
      seizurePlan: s3.seizurePlan || undefined,
      mobilitySupportNeeds: s3.mobilitySupportNeeds || undefined,
      behaviorSupportPlan: s3.behaviorSupportPlan || undefined,
      communicationNeeds: s3.communicationNeeds || undefined,
      emergencyProtocols: s3.emergencyProtocols || undefined,
      documents:
        s3.docs?.map((d) => ({
          key: d.key,
          title: d.title,
          fileName: d.fileName,
          uploadDate: toIso(d.uploadDate),
          expiryDate: toIso(d.expiryDate),
          autoReminder: d.autoReminder,
        })) ?? [],

      // Stage 4
      evvRequirement: s4.evvRequirement,
      primaryVisitLocationGps: s4.primaryVisitLocationGps,
      allowedSecondaryLocations: s4.allowedSecondaryLocations,
      minShiftLength: s4.minShiftLength || undefined,
      maxShiftLength: s4.maxShiftLength || undefined,
      backToBackAllowed: s4.backToBackAllowed,
      travelTimeAllowed: s4.travelTimeAllowed,

      // Stage 5
      primaryDspAssigned: s5.primaryDspAssigned || undefined,
      primaryDspId: s5.primaryDspId || undefined,
      secondaryDsps: s5.secondaryDsps || undefined,
      secondaryDspId: s5.secondaryDspId || undefined,
      genderPreference: s5.genderPreference || undefined,
      requiredCertifications: s5.requiredCertifications || undefined,
      specialConditions: s5.specialConditions || undefined,
      prefersFamiliar: s5.prefersFamiliar,
      noMaleFemaleStaff: s5.noMaleFemaleStaff,
      medicalRestrictionsTrained: s5.medicalRestrictionsTrained,
      autoChecks: s5.autoChecks,

      // Stage 6
      clientGoals: s6.clientGoals || undefined,
      communityGoals: s6.communityGoals || undefined,
      dailyLivingGoals: s6.dailyLivingGoals || undefined,
      behavioralGoals: s6.behavioralGoals || undefined,
      skillBuildingGoals: s6.skillBuildingGoals || undefined,
      ispOutcomes: s6.ispOutcomes || undefined,
      targetBehaviors: s6.targetBehaviors || undefined,
      supportStrategies: s6.supportStrategies || undefined,
      emergencyName: s6.emergencyName || undefined,
      emergencyRelationship: s6.emergencyRelationship || undefined,
      primaryPhone: s6.primaryPhone || undefined,
      secondaryPhone: s6.secondaryPhone || undefined,
      hospitalPreference: s6.hospitalPreference || undefined,
      emergencyProtocol: s6.emergencyProtocol || undefined,
      medicationList: s6.medicationList || undefined,

      // Stage 7
      aiNotesReview: s7.aiNotesReview,
      aiPlanOfCareBuilder: s7.aiPlanOfCareBuilder,
      aiGoalTracking: s7.aiGoalTracking,
      expiringDocsReminder: s7.expiringDocsReminder,
      renewalsReminder: s7.renewalsReminder,
      auditCycle: s7.auditCycle,
      assignedQaStaff: s7.assignedQaStaff || undefined,
      requiredVisitDocumentation: s7.requiredVisitDocumentation || undefined,
      notesReviewRules: s7.notesReviewRules || undefined,
      billingValidationRules: s7.billingValidationRules || undefined,
    };
  };

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
            const payload = flattenAddClientFormData();
            const created = await createAgencyClient(payload);
            const fullName =
              `${created.firstName || ""} ${created.lastName || ""}`.trim() ||
              `${formData.stage1.firstName} ${formData.stage1.lastName}`.trim();
            setSavedClientName(fullName.length > 0 ? fullName : undefined);
            setShowSaveSuccess(true);
          } catch (e: any) {
            console.error("Save client failed:", e);
            window.alert(e?.message || "Failed to save client. Please try again.");
          } finally {
            setIsSaving(false);
          }
        }}
        primaryLoading={isSaving}
        requireDeclaration={true}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [declared, isFirst, isLast, isSaving, formData]
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


