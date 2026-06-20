import {
  AddClientFormData,
  type HhaAuthorization,
  type HhaInsuranceInfo,
} from "../types/formData";
import { CreateClientRequest } from "@/lib/api/clients";
import {
  wizardOutcomesToApiOutcomes,
} from "./outcomeServices";

const toIso = (d?: Date) => (d ? d.toISOString() : undefined);

function isMeaningfulHhaInsuranceRow(row: HhaInsuranceInfo): boolean {
  return Boolean(
    row.company?.trim() ||
      row.memberId?.trim() ||
      row.groupNumber?.trim() ||
      row.effectiveDate ||
      row.authorizationRequired,
  );
}

function isMeaningfulHhaAuthorizationRow(row: HhaAuthorization): boolean {
  return Boolean(
    row.authorizationNumber?.trim() ||
      row.serviceId?.trim() ||
      row.serviceName?.trim() ||
      row.serviceCode?.trim() ||
      row.approvedHours?.trim() ||
      row.startDate ||
      row.endDate ||
      row.payerSource?.trim() ||
      row.rate?.trim() ||
      row.unitType?.trim() ||
      row.staffRate?.trim() ||
      row.payType ||
      (row.assignedDsps?.length ?? 0) > 0,
  );
}

/** Mirrors backend client.schema: rows tied to a service must carry staffRate + payType. */
function hhaAuthorizationRowMissingPayFields(row: HhaAuthorization): boolean {
  const hasService = Boolean(row.serviceId?.trim() || row.serviceCode?.trim());
  return hasService && (!row.staffRate?.trim() || !row.payType);
}

function sanitizeOptionalEmail(raw: string | undefined): string | undefined {
  const s = raw?.trim() ?? "";
  if (!s) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : undefined;
}

export function formDataToApiPayload(
  formData: AddClientFormData,
  includeAgencyId: boolean = false,
  progressive: boolean = false,
  markComplete: boolean = false
): CreateClientRequest {
  const s1 = formData.stage1;
  const s2 = formData.stage2;
  const s3 = formData.stage3;
  const s4 = formData.stage4;
  const s5 = formData.stage5;
  const s6 = formData.stage6;
  const s7 = formData.stage7;
  const isHhaClient = formData.type === "hha";

  const primaryLocation = s1.location;
  if (!progressive && (!primaryLocation || !primaryLocation.lat || !primaryLocation.lon)) {
    throw new Error("Please select an address from the suggestions so we can capture coordinates.");
  }

  const outcomesPayload = isHhaClient ? [] : wizardOutcomesToApiOutcomes(s2.outcomes ?? []);
  const hasDddIspMetadata =
    !isHhaClient &&
    Boolean(
      (s1.planId && s1.planId.trim()) ||
        (s1.planType && s1.planType.trim()) ||
        s1.planPrintDate ||
        (s1.program && s1.program.trim()) ||
        s1.waiverEnrollmentDate ||
        (s1.dddStatus && s1.dddStatus.trim()) ||
        (s1.medicaidType && s1.medicaidType.trim()) ||
        (s1.insuranceDetails && s1.insuranceDetails.length > 0),
    );

  if (!progressive && !isHhaClient) {
    const flatForValidation = s2.outcomes?.flatMap((o) => o.services) ?? [];
    const hasInvalidService = flatForValidation.some((svc) => !svc.name || !svc.code);
    if (hasInvalidService) {
      throw new Error(
        "Enter both a service code and service name for each service authorization row.",
      );
    }
  }

  if (!progressive && isHhaClient) {
    const incomplete = (s2.hhaAuthorizations ?? [])
      .filter(isMeaningfulHhaAuthorizationRow)
      .find(hhaAuthorizationRowMissingPayFields);
    if (incomplete) {
      const label =
        incomplete.serviceName?.trim() || incomplete.serviceCode?.trim() || "a service";
      throw new Error(
        `Enter a staff rate and pay type for the authorization covering ${label}.`,
      );
    }
  }

  const payload: CreateClientRequest = {
    ...(includeAgencyId && formData.agencyId ? { agencyId: formData.agencyId } : {}),
    type: formData.type || "ddd",
    firstName: s1.firstName || undefined,
    lastName: s1.lastName || undefined,
    middleName: s1.middleName || undefined,
    gender: s1.gender || undefined,
    email: s1.email || undefined,
    phone: s1.phone || undefined,
    dateOfBirth: toIso(s1.dob),
    primaryAddress:
      primaryLocation?.lat && primaryLocation?.lon
        ? {
            address: s1.address || undefined,
            location: primaryLocation,
            countyState: s1.countyState || undefined,
            zipCode: s1.zipCode || undefined,
          }
        : s1.address || s1.countyState || s1.zipCode
          ? {
              address: s1.address || undefined,
              location: undefined,
              countyState: s1.countyState || undefined,
              zipCode: s1.zipCode || undefined,
            }
          : undefined,
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
    preferredName: s1.preferredName?.trim() || undefined,
    maritalStatus: s1.maritalStatus?.trim() || undefined,
    medicareId: s1.medicareId?.trim() || undefined,
    homeInfo:
      isHhaClient && s1.homeInfo
        ? {
            apartmentNumber: s1.homeInfo.apartmentNumber?.trim() || undefined,
            county: s1.homeInfo.county?.trim() || undefined,
            accessInstructions: s1.homeInfo.accessInstructions?.trim() || undefined,
            homeType: s1.homeInfo.homeType?.trim() || undefined,
          }
        : undefined,
    referralInfo:
      isHhaClient && s1.referralInfo
        ? {
            source: s1.referralInfo.source?.trim() || undefined,
            date: toIso(s1.referralInfo.date),
            organization: s1.referralInfo.organization?.trim() || undefined,
            contactPerson: s1.referralInfo.contactPerson?.trim() || undefined,
            contactNumber: s1.referralInfo.contactNumber?.trim() || undefined,
          }
        : undefined,
    ssn: s1.ssn || undefined,
    tier: isHhaClient ? undefined : s1.tier || undefined,
    ispMetadata:
      hasDddIspMetadata
        ? {
            planId: s1.planId?.trim() || undefined,
            planType: s1.planType?.trim() || undefined,
            planPrintDate: toIso(s1.planPrintDate),
            program: s1.program?.trim() || undefined,
            waiverEnrollmentDate: toIso(s1.waiverEnrollmentDate),
            dddStatus: s1.dddStatus?.trim() || undefined,
            medicaidType: s1.medicaidType?.trim() || undefined,
            insuranceDetails:
              s1.insuranceDetails && s1.insuranceDetails.length > 0
                ? s1.insuranceDetails.map((d) => ({
                    type: d.type?.trim() || undefined,
                    name: d.name?.trim() || undefined,
                    idGroup: d.idGroup?.trim() || undefined,
                    caseManager: d.caseManager?.trim() || undefined,
                    contact: d.contact?.trim() || undefined,
                  }))
                : undefined,
          }
        : undefined,
    guardians:
      s2.guardians && s2.guardians.length > 0
        ? s2.guardians.map((g) => ({
            id: g.id?.trim() || undefined,
            name: g.name?.trim() || undefined,
            relationship: g.relationship || undefined,
            email: sanitizeOptionalEmail(g.email),
            primaryPhone: g.primaryPhone?.trim() || undefined,
            secondaryPhone: g.secondaryPhone?.trim() || undefined,
            address: g.address?.trim() || undefined,
            priority: g.priority,
            supportCoordinatorName: g.supportCoordinatorName?.trim() || undefined,
            supportCoordinatorAgency: g.supportCoordinatorAgency?.trim() || undefined,
            supportCoordinatorContact: g.supportCoordinatorContact?.trim() || undefined,
            isLegalGuardian: g.isLegalGuardian || undefined,
            hasPowerOfAttorney: g.hasPowerOfAttorney || undefined,
          }))
        : undefined,
    careTeam:
      s2.careTeam && s2.careTeam.length > 0
        ? s2.careTeam.map((c) => ({
            role: c.role?.trim() || undefined,
            name: c.name?.trim() || undefined,
            agency: c.agency?.trim() || undefined,
            phone: c.phone?.trim() || undefined,
            email: sanitizeOptionalEmail(c.email),
            address: c.address?.trim() || undefined,
          }))
        : undefined,
    guardianName: (s2.guardians?.[0]?.name?.trim() || s2.guardianName) || undefined,
    guardianRelationship: s2.guardians?.[0]?.relationship || s2.guardianRelationship || undefined,
    guardianEmail:
      sanitizeOptionalEmail(s2.guardians?.[0]?.email) ??
      sanitizeOptionalEmail(s2.guardianEmail),
    guardianPhone: (s2.guardians?.[0]?.primaryPhone?.trim() || s2.guardianPhone) || undefined,
    guardianAddress: (s2.guardians?.[0]?.address?.trim() || s2.guardianAddress) || undefined,
    supportCoordinatorName:
      (s2.guardians?.[0]?.supportCoordinatorName?.trim() || s2.supportCoordinatorName) || undefined,
    supportCoordinatorAgency:
      (s2.guardians?.[0]?.supportCoordinatorAgency?.trim() || s2.supportCoordinatorAgency) || undefined,
    supportCoordinatorContact:
      (s2.guardians?.[0]?.supportCoordinatorContact?.trim() || s2.supportCoordinatorContact) || undefined,
    outcomes: outcomesPayload,
    insuranceInfo: (() => {
      if (!isHhaClient || !s2.insuranceInfo?.length) return undefined;
      const rows = s2.insuranceInfo
        .filter(isMeaningfulHhaInsuranceRow)
        .map((i) => ({
          id: i.id,
          type: i.type,
          company: i.company?.trim() || undefined,
          memberId: i.memberId?.trim() || undefined,
          groupNumber: i.groupNumber?.trim() || undefined,
          effectiveDate: toIso(i.effectiveDate),
          authorizationRequired: i.authorizationRequired || undefined,
        }));
      return rows.length > 0 ? rows : undefined;
    })(),
    hhaServiceRequest:
      isHhaClient && s2.hhaServiceRequest
        ? {
            requestedServices: s2.hhaServiceRequest.requestedServices?.filter(Boolean),
            daysNeeded: s2.hhaServiceRequest.daysNeeded?.filter(Boolean),
            startDate: toIso(s2.hhaServiceRequest.startDate),
            preferredTime: s2.hhaServiceRequest.preferredTime?.trim() || undefined,
            hoursRequested: s2.hhaServiceRequest.hoursRequested?.trim() || undefined,
          }
        : undefined,
    hhaAuthorizations: (() => {
      if (!isHhaClient || !s2.hhaAuthorizations?.length) return undefined;
      const rows = s2.hhaAuthorizations
        .filter(isMeaningfulHhaAuthorizationRow)
        // Backend rejects service rows without staffRate/payType; keep incomplete
        // rows out of progressive draft saves (they stay in local wizard state).
        .filter((a) => !progressive || !hhaAuthorizationRowMissingPayFields(a))
        .map((a) => ({
          id: a.id,
          authorizationNumber: a.authorizationNumber?.trim() || undefined,
          serviceId: a.serviceId?.trim() || undefined,
          serviceName: a.serviceName?.trim() || undefined,
          serviceCode: a.serviceCode?.trim() || undefined,
          approvedHours: a.approvedHours?.trim() || undefined,
          startDate: toIso(a.startDate),
          endDate: toIso(a.endDate),
          payerSource: a.payerSource?.trim() || undefined,
          rate: a.rate?.trim() || undefined,
          unitType: a.unitType?.trim() || undefined,
          serviceType: a.serviceType?.trim() || undefined,
          goal: a.goal?.trim() || undefined,
          modifier: a.modifier?.trim() || undefined,
          clientPayType: a.clientPayType || undefined,
          staffRate: a.staffRate?.trim() || undefined,
          payType: a.payType || undefined,
          assignedDsps:
            a.assignedDsps && a.assignedDsps.length > 0
              ? a.assignedDsps.map((d) => ({ id: d.id, name: d.name }))
              : undefined,
        }));
      return rows.length > 0 ? rows : undefined;
    })(),
    medicalConditions: s3.medicalConditions?.length ? s3.medicalConditions : undefined,
    allergies: s3.allergies?.length ? s3.allergies : undefined,
    dietaryRestrictions: s3.dietaryRestrictions?.length ? s3.dietaryRestrictions : undefined,
    seizurePlan: s3.seizurePlan || undefined,
    mobilitySupportNeeds: s3.mobilitySupportNeeds?.length ? s3.mobilitySupportNeeds : undefined,
    behaviorSupportPlan: s3.behaviorSupportPlan || undefined,
    communicationNeeds: s3.communicationNeeds?.length ? s3.communicationNeeds : undefined,
    emergencyProtocols: s3.emergencyProtocols || undefined,
    diagnosis: s3.diagnosis?.trim() || undefined,
    healthHazards: s3.healthHazards?.trim() || undefined,
    nutritionNotes: s3.nutritionNotes?.trim() || undefined,
    selfCareNeeds:
      s3.selfCareNeeds && s3.selfCareNeeds.length > 0
        ? s3.selfCareNeeds.map((a) => ({
            domain: a.domain?.trim() || undefined,
            levelOfSupport: a.levelOfSupport?.trim() || undefined,
            notes: a.notes?.trim() || undefined,
          }))
        : undefined,
    physicianInfo:
      isHhaClient && s3.physicianInfo
        ? {
            name: s3.physicianInfo.name?.trim() || undefined,
            npi: s3.physicianInfo.npi?.trim() || undefined,
            phone: s3.physicianInfo.phone?.trim() || undefined,
            fax: s3.physicianInfo.fax?.trim() || undefined,
            address: s3.physicianInfo.address?.trim() || undefined,
          }
        : undefined,
    fallRisk: isHhaClient ? s3.fallRisk || undefined : undefined,
    specialPrecautions: isHhaClient ? s3.specialPrecautions?.trim() || undefined : undefined,
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
    genderPreference: s5.genderPreference || undefined,
    requiredCertifications: s5.requiredCertifications || undefined,
    specialConditions: s5.specialConditions || undefined,
    prefersFamiliar: s5.prefersFamiliar,
    noMaleFemaleStaff: s5.noMaleFemaleStaff,
    medicalRestrictionsTrained: s5.medicalRestrictionsTrained,
    caregiverPreferences:
      isHhaClient && s5.hhaCaregiverPreferences
        ? {
            languagePreference: s5.hhaCaregiverPreferences.languagePreference?.trim() || undefined,
            smokingAllowed: s5.hhaCaregiverPreferences.smokingAllowed || undefined,
            petInHome: s5.hhaCaregiverPreferences.petInHome || undefined,
            liftAssistanceRequired:
              s5.hhaCaregiverPreferences.liftAssistanceRequired || undefined,
            vehicleRequired: s5.hhaCaregiverPreferences.vehicleRequired || undefined,
            specialSkillsNeeded:
              s5.hhaCaregiverPreferences.specialSkillsNeeded?.trim() || undefined,
          }
        : undefined,
    autoChecks: s5.autoChecks,
    clientGoals: s6.clientGoals || undefined,
    communityGoals: s6.communityGoals || undefined,
    dailyLivingGoals: s6.dailyLivingGoals || undefined,
    behavioralGoals: s6.behavioralGoals || undefined,
    skillBuildingGoals: s6.skillBuildingGoals || undefined,
    ispOutcomes: s6.ispOutcomes || undefined,
    targetBehaviors: s6.targetBehaviors || undefined,
    supportStrategies: s6.supportStrategies || undefined,
    ...(() => {
      const ec = s6.emergencyContacts ?? [];
      const first = ec[0];
      return {
        emergencyName: first?.name?.trim() || s6.emergencyName || undefined,
        emergencyRelationship: first?.relationship || s6.emergencyRelationship || undefined,
        primaryPhone: first?.primaryPhone?.trim() || s6.primaryPhone || undefined,
        secondaryPhone: first?.secondaryPhone?.trim() || s6.secondaryPhone || undefined,
        hospitalPreference:
          first?.hospitalPreference?.trim() || s6.hospitalPreference || undefined,
        emergencyProtocol: first?.emergencyProtocol?.trim() || s6.emergencyProtocol || undefined,
      };
    })(),
    medicationList: s6.medicationList || undefined,
    medications:
      s6.medications && s6.medications.length > 0
        ? s6.medications.map((m) => ({
            name: m.name?.trim() || undefined,
            dosage: m.dosage?.trim() || undefined,
            frequency: m.frequency?.trim() || undefined,
            notes: m.notes?.trim() || undefined,
            selfAdminister: m.selfAdminister,
          }))
        : undefined,
    emergencyBackupPlan: (() => {
      const ebp = s6.emergencyBackupPlan;
      if (!ebp) return undefined;
      if (
        !ebp.pers &&
        !ebp.providerManagedSetting &&
        !ebp.advanceDirective &&
        !ebp.proxyDecisionMaker &&
        !(ebp.narrative && ebp.narrative.trim())
      ) {
        return undefined;
      }
      return {
        pers: ebp.pers || undefined,
        providerManagedSetting: ebp.providerManagedSetting || undefined,
        advanceDirective: ebp.advanceDirective || undefined,
        proxyDecisionMaker: ebp.proxyDecisionMaker || undefined,
        narrative: ebp.narrative?.trim() || undefined,
      };
    })(),
    emergencyContacts:
      s6.emergencyContacts && s6.emergencyContacts.length > 0
        ? s6.emergencyContacts.map((e) => ({
            name: e.name?.trim() || undefined,
            relationship: e.relationship || undefined,
            primaryPhone: e.primaryPhone?.trim() || undefined,
            secondaryPhone: e.secondaryPhone?.trim() || undefined,
            hospitalPreference: e.hospitalPreference?.trim() || undefined,
            emergencyProtocol: e.emergencyProtocol?.trim() || undefined,
            priority: e.priority,
          }))
        : undefined,
    employmentStatus: s6.employmentStatus?.trim() || undefined,
    employmentPlan: s6.employmentPlan?.trim() || undefined,
    votingPlan: s6.votingPlan?.trim() || undefined,
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
    teamMembers:
      s7.teamMembers && s7.teamMembers.length > 0
        ? s7.teamMembers.map((t) => ({
            name: t.name?.trim() || undefined,
            relationship: t.relationship?.trim() || undefined,
            contact: t.contact?.trim() || undefined,
          }))
        : undefined,
    ...(markComplete ? { status: "active" as const } : {}),
  };

  return payload;
}
