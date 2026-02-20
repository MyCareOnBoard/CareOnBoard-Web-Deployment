import { AddClientFormData } from "../types/formData";
import { CreateClientRequest, UpdateClientRequest } from "@/lib/api/clients";

export function formDataToApiPayload(
  formData: AddClientFormData,
  includeAgencyId: boolean = false
): CreateClientRequest {
  const s1 = formData.stage1;
  const s2 = formData.stage2;
  const s3 = formData.stage3;
  const s4 = formData.stage4;
  const s5 = formData.stage5;
  const s6 = formData.stage6;
  const s7 = formData.stage7;

  const toIso = (d?: Date) => (d ? d.toISOString() : undefined);

  const primaryLocation = s1.location;
  if (!primaryLocation || !primaryLocation.lat || !primaryLocation.lon) {
    throw new Error("Please select an address from the suggestions so we can capture coordinates.");
  }

  const services =
    s2.services?.map((svc) => ({
      id: svc.id,
      name: svc.name || "",
      code: svc.code || "",
      hours: svc.hours || "",
      totalApprovedHours: svc.totalApprovedHours || "",
      rate: svc.rate || "",
      payType: svc.payType,
      ispEffectiveDate: toIso(svc.ispEffectiveDate),
      startAuthDate: toIso(svc.startAuthDate),
      endAuthDate: toIso(svc.endAuthDate),
      pcptDate: toIso(svc.pcptDate),
      sdrStartDate: toIso(svc.sdrStartDate),
      sdrEndDate: toIso(svc.sdrEndDate),
    })) ?? [];

  const hasInvalidService = services.some((svc) => !svc.name || !svc.code);
  if (hasInvalidService) {
    throw new Error("Please select an Authorized Service for each service block (service code will auto-populate).");
  }

  const payload: CreateClientRequest = {
    ...(includeAgencyId && formData.agencyId ? { agencyId: formData.agencyId } : {}),
    firstName: s1.firstName || undefined,
    lastName: s1.lastName || undefined,
    middleName: s1.middleName || undefined,
    gender: s1.gender || undefined,
    email: s1.email || undefined,
    phone: s1.phone || undefined,
    dateOfBirth: toIso(s1.dob),
    primaryAddress: {
      address: s1.address || undefined,
      location: primaryLocation,
      countyState: s1.countyState || undefined,
      zipCode: s1.zipCode || undefined,
    },
    secondaryAddress: s1.secondaryAddress || s1.secondaryLocation || s1.secondaryCountyState || s1.secondaryZipCode
      ? {
          address: s1.secondaryAddress || undefined,
          location: s1.secondaryLocation || undefined,
          countyState: s1.secondaryCountyState || undefined,
          zipCode: s1.secondaryZipCode || undefined,
        }
      : undefined,
    languagePreference: s1.language || undefined,
    communicationMethod: s1.communicationMethod || undefined,
    medicaidId: s1.medicaidId || undefined,
    dddId: s1.dddId || undefined,
    ssn: s1.ssn || undefined,
    tier: s1.tier || undefined,
    guardianName: s2.guardianName || undefined,
    guardianRelationship: s2.guardianRelationship || undefined,
    guardianEmail: s2.guardianEmail || undefined,
    guardianPhone: s2.guardianPhone || undefined,
    guardianAddress: s2.guardianAddress || undefined,
    supportCoordinatorName: s2.supportCoordinatorName || undefined,
    supportCoordinatorAgency: s2.supportCoordinatorAgency || undefined,
    supportCoordinatorContact: s2.supportCoordinatorContact || undefined,
    services,
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
        issuedOnDate: toIso(d.issuedOnDate),
        expiryDate: toIso(d.expiryDate),
        autoReminder: d.autoReminder,
      })) ?? [],
    evvRequirement: s4.evvRequirement,
    primaryVisitLocationGps: s4.primaryVisitLocationGps,
    allowedSecondaryLocations: s4.allowedSecondaryLocations,
    minShiftLength: s4.minShiftLength || undefined,
    maxShiftLength: s4.maxShiftLength || undefined,
    backToBackAllowed: s4.backToBackAllowed,
    travelTimeAllowed: s4.travelTimeAllowed,
    primaryDsp: s5.primaryDsp || undefined,
    secondaryDsps: s5.secondaryDsps.length > 0 ? s5.secondaryDsps : undefined,
    genderPreference: s5.genderPreference || undefined,
    requiredCertifications: s5.requiredCertifications || undefined,
    specialConditions: s5.specialConditions || undefined,
    prefersFamiliar: s5.prefersFamiliar,
    noMaleFemaleStaff: s5.noMaleFemaleStaff,
    medicalRestrictionsTrained: s5.medicalRestrictionsTrained,
    autoChecks: s5.autoChecks,
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

  return payload;
}
