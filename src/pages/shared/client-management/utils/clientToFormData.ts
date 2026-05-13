import { Client } from "@/lib/api/clients";
import {
    AddClientFormData,
    createInitialAddClientFormData,
    createInitialDocs,
    EMERGENCY_CONTACT_RELATIONSHIP_VALUES,
    GUARDIAN_RELATIONSHIP_VALUES,
    type EmergencyContactRelationship,
    type GuardianRelationship,
} from "../types/formData";

const EMERGENCY_CONTACT_RELATIONSHIP_LOOKUP = new Set<string>(
    EMERGENCY_CONTACT_RELATIONSHIP_VALUES,
);

const GUARDIAN_RELATIONSHIP_LOOKUP = new Set<string>(GUARDIAN_RELATIONSHIP_VALUES);

function coerceGuardianRelationship(raw: unknown): GuardianRelationship | undefined {
    if (typeof raw !== "string") return undefined;
    const v = raw.trim();
    if (!v) return undefined;
    if (v === "parent") return "relative";
    if (GUARDIAN_RELATIONSHIP_LOOKUP.has(v)) return v as GuardianRelationship;
    return undefined;
}

function coerceEmergencyRelationship(
    raw: unknown,
): EmergencyContactRelationship | undefined {
    if (typeof raw !== "string") return undefined;
    const v = raw.trim();
    if (!v) return undefined;
    return EMERGENCY_CONTACT_RELATIONSHIP_LOOKUP.has(v)
        ? (v as EmergencyContactRelationship)
        : undefined;
}

export function clientToFormData(client: Client, includeAgencyId: boolean = false): AddClientFormData {
    const initial = createInitialAddClientFormData();

    const parseDate = (dateValue?: string | { _seconds?: number; _nanoseconds?: number } | Date): Date | undefined => {
        if (!dateValue) return undefined;

        try {
            if (typeof dateValue === 'object' && '_seconds' in dateValue && dateValue._seconds) {
                return new Date(dateValue._seconds * 1000);
            }
            if (dateValue instanceof Date) {
                return dateValue;
            }
            if (typeof dateValue === 'string') {
                return new Date(dateValue);
            }
        } catch {
            return undefined;
        }
        return undefined;
    };

    const normalizeYesNo = (value: any): "yes" | "no" | "" => {
        if (value === "yes" || value === "no") return value;
        if (value === true || value === "true") return "yes";
        if (value === false || value === "false") return "no";
        return "";
    };

    return {
        ...initial,
        ...(includeAgencyId && client.agencyId ? { agencyId: String(client.agencyId) } : {}),
        stage1: {
            firstName: client.firstName || "",
            lastName: client.lastName || "",
            middleName: client.middleName || "",
            gender: client.gender,
            dob: parseDate(client.dateOfBirth),
            medicaidId: client.medicaidId || "",
            dddId: client.dddId || "",
            ssn: client.ssn || "",
            tier: client.tier,
            address: client.primaryAddress?.address || client.address || "",
            location: client.primaryAddress?.location || client.location,
            countyState: client.primaryAddress?.countyState || client.countyState || "",
            zipCode: client.primaryAddress?.zipCode || client.zipCode || "",
            secondaryAddress: client.secondaryAddress?.address || "",
            secondaryLocation: client.secondaryAddress?.location,
            secondaryCountyState: client.secondaryAddress?.countyState || "",
            secondaryZipCode: client.secondaryAddress?.zipCode || "",
            phone: client.phone || "",
            email: client.email || "",
            language: client.languagePreference,
            communicationMethod: client.communicationMethod,
        },
        stage2: {
            guardianName: client.guardianName || "",
            guardianRelationship: coerceGuardianRelationship(client.guardianRelationship),
            guardianEmail: client.guardianEmail || "",
            guardianPhone: client.guardianPhone || "",
            guardianAddress: client.guardianAddress || "",
            supportCoordinatorName: client.supportCoordinatorName || "",
            supportCoordinatorAgency: client.supportCoordinatorAgency || "",
            supportCoordinatorContact: client.supportCoordinatorContact || "",
            services: client.services && client.services.length > 0
                ? client.services.map((svc) => ({
                    id: svc.id,
                    name: svc.name || "",
                    code: svc.code || "",
                    hours: svc.hours || "",
                    totalApprovedHours: svc.totalApprovedHours || "",
                    rate: svc.rate || "",
                    payType: svc.payType,
                    clientRate: svc.clientRate || "",
                    clientPayType: svc.clientPayType,
                    ispEffectiveDate: svc.ispEffectiveDate ? parseDate(svc.ispEffectiveDate) : undefined,
                    startAuthDate: svc.startAuthDate ? parseDate(svc.startAuthDate) : undefined,
                    endAuthDate: svc.endAuthDate ? parseDate(svc.endAuthDate) : undefined,
                    pcptDate: svc.pcptDate ? parseDate(svc.pcptDate) : undefined,
                    sdrStartDate: svc.sdrStartDate ? parseDate(svc.sdrStartDate) : undefined,
                    sdrEndDate: svc.sdrEndDate ? parseDate(svc.sdrEndDate) : undefined,
                }))
                : initial.stage2.services,
        },
        stage3: {
            medicalConditions: (() => {
                const v = client.healthcareSafety?.medicalConditions ?? client.medicalConditions;
                return Array.isArray(v) ? v : [];
            })(),
            allergies: (() => {
                const v = client.healthcareSafety?.allergies ?? client.allergies;
                return Array.isArray(v) ? v : [];
            })(),
            dietaryRestrictions: (() => {
                const v = client.healthcareSafety?.dietaryRestrictions ?? client.dietaryRestrictions;
                return Array.isArray(v) ? v : [];
            })(),
            seizurePlan: client.healthcareSafety?.seizurePlan ?? client.seizurePlan ?? "",
            mobilitySupportNeeds: (() => {
                const v = client.healthcareSafety?.mobilitySupportNeeds ?? client.mobilitySupportNeeds;
                return Array.isArray(v) ? v : [];
            })(),
            behaviorSupportPlan: client.healthcareSafety?.behaviorSupportPlan ?? client.behaviorSupportPlan ?? "",
            communicationNeeds: (() => {
                const v = client.healthcareSafety?.communicationNeeds ?? client.communicationNeeds;
                return Array.isArray(v) ? v : [];
            })(),
            emergencyProtocols: client.healthcareSafety?.emergencyProtocols ?? client.emergencyProtocols ?? "",
            docs: (() => {
                const allDocs = createInitialDocs();
                const existingDocs = client.documents || [];

                return allDocs.map((defaultDoc) => {
                    const existingDoc = existingDocs.find((d) => d.key === defaultDoc.key);
                    if (existingDoc) {
                        return {
                            ...defaultDoc,
                            url: existingDoc.url,
                            fileName: existingDoc.fileName,
                            issuedOnDate: existingDoc.issuedOnDate ? parseDate(existingDoc.issuedOnDate) : undefined,
                            expiryDate: existingDoc.expiryDate ? parseDate(existingDoc.expiryDate) : undefined,
                            autoReminder: existingDoc.autoReminder ?? defaultDoc.autoReminder,
                        };
                    }
                    return defaultDoc;
                });
            })(),
        },
        stage4: {
            evvRequirement: normalizeYesNo(client.evvVisitConfig?.evvRequirement ?? (client as any).evvRequirement),
            primaryVisitLocationGps: normalizeYesNo(client.evvVisitConfig?.primaryVisitLocationGps ?? (client as any).primaryVisitLocationGps),
            allowedSecondaryLocations: normalizeYesNo(client.evvVisitConfig?.allowedSecondaryLocations ?? (client as any).allowedSecondaryLocations),
            minShiftLength: client.evvVisitConfig?.minShiftLength ?? (client as any).minShiftLength ?? "",
            maxShiftLength: client.evvVisitConfig?.maxShiftLength ?? (client as any).maxShiftLength ?? "",
            backToBackAllowed: normalizeYesNo(client.evvVisitConfig?.backToBackAllowed ?? (client as any).backToBackAllowed),
            travelTimeAllowed: normalizeYesNo(client.evvVisitConfig?.travelTimeAllowed ?? (client as any).travelTimeAllowed),
        },
        stage5: {
            primaryDsp: client.primaryDsp ? { id: client.primaryDsp.id, name: client.primaryDsp.name } : undefined,
            secondaryDsps: client.secondaryDsps?.map((dsp) => ({ id: dsp.id, name: dsp.name })) || [],
            genderPreference: (client as any).genderPreference ?? undefined,
            requiredCertifications: (client as any).requiredCertifications ?? "",
            specialConditions: (client as any).specialConditions ?? "",
            prefersFamiliar: normalizeYesNo((client as any).prefersFamiliar),
            noMaleFemaleStaff: normalizeYesNo((client as any).noMaleFemaleStaff),
            medicalRestrictionsTrained: normalizeYesNo((client as any).medicalRestrictionsTrained),
            autoChecks: (client as any).autoChecks ? {
                compliance: (client as any).autoChecks.compliance ?? false,
                training: (client as any).autoChecks.training ?? false,
                background: (client as any).autoChecks.background ?? false,
                expired: (client as any).autoChecks.expired ?? false,
            } : {
                compliance: false,
                training: false,
                background: false,
                expired: false,
            },
        },
        stage6: {
            clientGoals: client.goalsAndEmergency?.clientGoals ?? (client as any).clientGoals ?? "",
            communityGoals: client.goalsAndEmergency?.communityGoals ?? (client as any).communityGoals ?? "",
            dailyLivingGoals: client.goalsAndEmergency?.dailyLivingGoals ?? (client as any).dailyLivingGoals ?? "",
            behavioralGoals: client.goalsAndEmergency?.behavioralGoals ?? (client as any).behavioralGoals ?? "",
            skillBuildingGoals: client.goalsAndEmergency?.skillBuildingGoals ?? (client as any).skillBuildingGoals ?? "",
            ispOutcomes: client.goalsAndEmergency?.ispOutcomes ?? client.ispOutcomes ?? (client as any).ispOutcomes ?? "",
            targetBehaviors: client.goalsAndEmergency?.targetBehaviors ?? (client as any).targetBehaviors ?? "",
            supportStrategies: client.goalsAndEmergency?.supportStrategies ?? (client as any).supportStrategies ?? "",
            emergencyName: client.goalsAndEmergency?.emergencyName ?? (client as any).emergencyName ?? "",
            emergencyRelationship: coerceEmergencyRelationship(
                client.goalsAndEmergency?.emergencyRelationship ?? (client as any).emergencyRelationship,
            ),
            primaryPhone: client.goalsAndEmergency?.primaryPhone ?? (client as any).primaryPhone ?? "",
            secondaryPhone: client.goalsAndEmergency?.secondaryPhone ?? (client as any).secondaryPhone ?? "",
            hospitalPreference: client.goalsAndEmergency?.hospitalPreference ?? (client as any).hospitalPreference ?? "",
            emergencyProtocol: client.goalsAndEmergency?.emergencyProtocol ?? (client as any).emergencyProtocol ?? "",
            medicationList: client.goalsAndEmergency?.medicationList ?? (client as any).medicationList ?? "",
        },
        stage7: {
            aiNotesReview: client.systemAiAndAudit?.aiNotesReview ?? (client as any).aiNotesReview ?? true,
            aiPlanOfCareBuilder: client.systemAiAndAudit?.aiPlanOfCareBuilder ?? (client as any).aiPlanOfCareBuilder ?? true,
            aiGoalTracking: client.systemAiAndAudit?.aiGoalTracking ?? (client as any).aiGoalTracking ?? true,
            expiringDocsReminder: client.systemAiAndAudit?.expiringDocsReminder ?? (client as any).expiringDocsReminder ?? true,
            renewalsReminder: client.systemAiAndAudit?.renewalsReminder ?? (client as any).renewalsReminder ?? true,
            auditCycle: (client.systemAiAndAudit?.auditCycle ?? (client as any).auditCycle ?? "monthly") as "monthly" | "quarterly",
            assignedQaStaff: client.systemAiAndAudit?.assignedQaStaff ?? (client as any).assignedQaStaff ?? "",
            requiredVisitDocumentation: client.systemAiAndAudit?.requiredVisitDocumentation ?? (client as any).requiredVisitDocumentation ?? "",
            notesReviewRules: client.systemAiAndAudit?.notesReviewRules ?? (client as any).notesReviewRules ?? "",
            billingValidationRules: client.systemAiAndAudit?.billingValidationRules ?? (client as any).billingValidationRules ?? "",
        },
    };
}
