import { Client } from "@/lib/api/clients";
import {
    AddClientFormData,
    createEmptyServiceAuthorization,
    createInitialAddClientFormData,
    createInitialDocs,
    EMERGENCY_CONTACT_RELATIONSHIP_VALUES,
    GUARDIAN_RELATIONSHIP_VALUES,
    type Dsp,
    type EmergencyContactRelationship,
    type GuardianRelationship,
    type Outcome,
} from "../types/formData";
import { groupLoadedServicesIntoOutcomes, clientSdrDetailsToWizard, type ServiceLoadRow } from "./outcomeServices";

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

    const apiServiceToWizard = (svc: import("@/lib/api/clients").ClientService) => ({
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
        provider: svc.provider,
        location: svc.location,
        claimsSource: svc.claimsSource,
        unitType: svc.unitType,
        frequency: svc.frequency,
        totalUnits: svc.totalUnits,
        totalCost: svc.totalCost,
        evvStatus: svc.evvStatus,
        evvDescription: svc.evvDescription,
        narrative: svc.narrative,
        procedureName: svc.procedureName,
        sdrComputedTotalHours: svc.sdrComputedTotalHours,
        sdrPriorAuthorization:
          svc.sdrPriorAuthorization &&
          typeof svc.sdrPriorAuthorization === "object"
            ? { ...svc.sdrPriorAuthorization }
            : undefined,
        sdrWeeklyDistribution:
          svc.sdrWeeklyDistribution && typeof svc.sdrWeeklyDistribution === "object"
            ? {
                ...(svc.sdrWeeklyDistribution.standardLine
                  ? { standardLine: svc.sdrWeeklyDistribution.standardLine }
                  : {}),
                ...(Array.isArray(svc.sdrWeeklyDistribution.rows)
                  ? {
                      rows: svc.sdrWeeklyDistribution.rows.map((r) =>
                        r && typeof r === "object"
                          ? {
                              weekRange: r.weekRange,
                              units: r.units,
                              hours: r.hours,
                            }
                          : {},
                      ),
                    }
                  : {}),
              }
            : undefined,
        sdrDetails: clientSdrDetailsToWizard(svc.sdrDetails),
        assignedDsps:
            svc.assignedDsps?.map((d) => ({ id: d.id, name: d.name ?? "" })) ?? [],
    });

    const newOutcomeId = () =>
        typeof crypto !== "undefined" && "randomUUID" in crypto
            ? `outcome-${crypto.randomUUID()}`
            : `outcome-${Math.random().toString(16).slice(2)}`;

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
            planId: client.ispMetadata?.planId,
            planType: client.ispMetadata?.planType,
            planPrintDate: client.ispMetadata?.planPrintDate
                ? parseDate(client.ispMetadata.planPrintDate)
                : undefined,
            program: client.ispMetadata?.program,
            waiverEnrollmentDate: client.ispMetadata?.waiverEnrollmentDate
                ? parseDate(client.ispMetadata.waiverEnrollmentDate)
                : undefined,
            dddStatus: client.ispMetadata?.dddStatus,
            medicaidType: client.ispMetadata?.medicaidType,
            insuranceDetails: client.ispMetadata?.insuranceDetails?.length
                ? client.ispMetadata.insuranceDetails.map((d) => ({
                      type: d.type ?? "",
                      name: d.name ?? "",
                      idGroup: d.idGroup ?? "",
                      caseManager: d.caseManager ?? "",
                      contact: d.contact ?? "",
                  }))
                : [],
        },
        stage2: (() => {
            let outcomes: Outcome[];

            const nestedOutcomes = client.outcomes;
            if (nestedOutcomes?.length) {
                outcomes = nestedOutcomes.map((o) => ({
                    id: (o.id && String(o.id).trim()) || newOutcomeId(),
                    statement: o.statement ?? "",
                    services:
                        o.services && o.services.length > 0
                            ? o.services.map((svc) => apiServiceToWizard(svc))
                            : [createEmptyServiceAuthorization()],
                }));
            } else {
                const loadRows: ServiceLoadRow[] =
                    client.services && client.services.length > 0
                        ? client.services.map((svc) => ({
                              svc: apiServiceToWizard(svc),
                              outcomeTags:
                                  svc.outcomes
                                      ?.map((x) => String(x).trim())
                                      .filter((t) => Boolean(t)) ?? [],
                          }))
                        : [];
                outcomes =
                    loadRows.length > 0
                        ? groupLoadedServicesIntoOutcomes(loadRows)
                        : [];
            }

            const hasAssigned = outcomes.some((og) =>
                og.services.some((s) => (s.assignedDsps?.length ?? 0) > 0),
            );
            if (!hasAssigned && (client.primaryDsp || client.secondaryDsps?.length)) {
                const dspList: Dsp[] = [];
                if (client.primaryDsp?.id) {
                    dspList.push({
                        id: client.primaryDsp.id,
                        name: client.primaryDsp.name ?? "",
                    });
                }
                for (const d of client.secondaryDsps ?? []) {
                    if (d.id && !dspList.some((x) => x.id === d.id)) {
                        dspList.push({ id: d.id, name: d.name ?? "" });
                    }
                }
                if (dspList.length && outcomes[0]?.services[0]) {
                    outcomes = outcomes.map((og, oi) =>
                        oi === 0
                            ? {
                                  ...og,
                                  services: og.services.map((s, si) =>
                                      si === 0
                                          ? { ...s, assignedDsps: dspList }
                                          : s,
                                  ),
                              }
                            : og,
                    );
                }
            }

            const gi = client.guardianInfo;

            const rawGuardians =
                (client.guardians && client.guardians.length > 0
                    ? client.guardians
                    : gi?.guardians) ?? [];

            const mapGuardianRow = (g: (typeof rawGuardians)[number]) => ({
                name: g.name ?? "",
                relationship: coerceGuardianRelationship(g.relationship),
                email: g.email ?? "",
                primaryPhone: g.primaryPhone ?? "",
                secondaryPhone: g.secondaryPhone ?? "",
                address: g.address ?? "",
                priority: g.priority,
                supportCoordinatorName: g.supportCoordinatorName ?? "",
                supportCoordinatorAgency: g.supportCoordinatorAgency ?? "",
                supportCoordinatorContact: g.supportCoordinatorContact ?? "",
            });

            let guardians = rawGuardians.map(mapGuardianRow);

            const hasFlatGuardian =
                (client.guardianName && client.guardianName.trim()) ||
                (gi?.guardianName && gi.guardianName.trim()) ||
                (client.guardianEmail && client.guardianEmail.trim()) ||
                (gi?.guardianEmail && gi.guardianEmail.trim()) ||
                (client.guardianPhone && client.guardianPhone.trim()) ||
                (gi?.guardianPhone && gi.guardianPhone.trim()) ||
                (client.guardianAddress && client.guardianAddress.trim()) ||
                (gi?.guardianAddress && gi.guardianAddress.trim()) ||
                client.guardianRelationship ||
                gi?.guardianRelationship;

            const hasFlatSc =
                (client.supportCoordinatorName && client.supportCoordinatorName.trim()) ||
                (gi?.supportCoordinatorName && gi.supportCoordinatorName.trim()) ||
                (client.supportCoordinatorAgency && client.supportCoordinatorAgency.trim()) ||
                (gi?.supportCoordinatorAgency && gi.supportCoordinatorAgency.trim()) ||
                (client.supportCoordinatorContact && client.supportCoordinatorContact.trim()) ||
                (gi?.supportCoordinatorContact && gi.supportCoordinatorContact.trim());

            if (guardians.length === 0 && (hasFlatGuardian || hasFlatSc)) {
                guardians = [
                    {
                        name: client.guardianName || gi?.guardianName || "",
                        relationship: coerceGuardianRelationship(
                            client.guardianRelationship || gi?.guardianRelationship,
                        ),
                        email: client.guardianEmail || gi?.guardianEmail || "",
                        primaryPhone: client.guardianPhone || gi?.guardianPhone || "",
                        secondaryPhone: "",
                        address: client.guardianAddress || gi?.guardianAddress || "",
                        priority: undefined,
                        supportCoordinatorName:
                            client.supportCoordinatorName || gi?.supportCoordinatorName || "",
                        supportCoordinatorAgency:
                            client.supportCoordinatorAgency || gi?.supportCoordinatorAgency || "",
                        supportCoordinatorContact:
                            client.supportCoordinatorContact || gi?.supportCoordinatorContact || "",
                    },
                ];
            } else if (guardians.length > 0 && hasFlatSc) {
                const g0 = guardians[0];
                const scN =
                    client.supportCoordinatorName || gi?.supportCoordinatorName || "";
                const scA =
                    client.supportCoordinatorAgency || gi?.supportCoordinatorAgency || "";
                const scC =
                    client.supportCoordinatorContact || gi?.supportCoordinatorContact || "";
                guardians = [
                    {
                        ...g0,
                        supportCoordinatorName: g0.supportCoordinatorName?.trim() || scN || "",
                        supportCoordinatorAgency: g0.supportCoordinatorAgency?.trim() || scA || "",
                        supportCoordinatorContact: g0.supportCoordinatorContact?.trim() || scC || "",
                    },
                    ...guardians.slice(1),
                ];
            }

            return {
                guardianName: "",
                guardianRelationship: undefined,
                guardianEmail: "",
                guardianPhone: "",
                guardianAddress: "",
                supportCoordinatorName: "",
                supportCoordinatorAgency: "",
                supportCoordinatorContact: "",
                outcomes,
                guardians,
                careTeam:
                    ((client.careTeam && client.careTeam.length > 0
                        ? client.careTeam
                        : client.guardianInfo?.careTeam) ?? []).map((c) => ({
                        role: c.role ?? "",
                        name: c.name ?? "",
                        agency: c.agency ?? "",
                        phone: c.phone ?? "",
                        email: c.email ?? "",
                        address: c.address ?? "",
                    })),
            };
        })(),
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
            diagnosis:
                client.healthcareSafety?.diagnosis ??
                (client as any).diagnosis ??
                undefined,
            healthHazards:
                client.healthcareSafety?.healthHazards ?? (client as any).healthHazards ?? undefined,
            nutritionNotes:
                client.healthcareSafety?.nutritionNotes ?? (client as any).nutritionNotes ?? undefined,
            selfCareNeeds: (() => {
                const v =
                    client.healthcareSafety?.selfCareNeeds ?? (client as any).selfCareNeeds;
                return Array.isArray(v) ? v : [];
            })(),
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
            ...(() => {
                const raw =
                    client.goalsAndEmergency?.emergencyContacts ?? client.emergencyContacts;
                const flatName =
                    client.goalsAndEmergency?.emergencyName ?? (client as any).emergencyName ?? "";
                const flatRel = coerceEmergencyRelationship(
                    client.goalsAndEmergency?.emergencyRelationship ??
                        (client as any).emergencyRelationship,
                );
                const flatP1 =
                    client.goalsAndEmergency?.primaryPhone ?? (client as any).primaryPhone ?? "";
                const flatP2 =
                    client.goalsAndEmergency?.secondaryPhone ?? (client as any).secondaryPhone ?? "";
                const flatHosp =
                    client.goalsAndEmergency?.hospitalPreference ??
                    (client as any).hospitalPreference ??
                    "";
                const flatProt =
                    client.goalsAndEmergency?.emergencyProtocol ??
                    (client as any).emergencyProtocol ??
                    "";

                let rows: import("../types/formData").Stage6EmergencyContact[] =
                    raw?.length ?
                        raw.map((e) => ({
                            name: e.name ?? "",
                            relationship: coerceEmergencyRelationship(e.relationship),
                            primaryPhone: e.primaryPhone ?? "",
                            secondaryPhone: e.secondaryPhone ?? "",
                            hospitalPreference: e.hospitalPreference ?? "",
                            emergencyProtocol: e.emergencyProtocol ?? "",
                            priority: e.priority,
                        }))
                    :   [];

                const hasFlatPrimary =
                    flatName.trim() ||
                    flatP1.trim() ||
                    flatP2.trim() ||
                    flatHosp.trim() ||
                    flatProt.trim() ||
                    flatRel !== undefined;

                if (rows.length === 0 && hasFlatPrimary) {
                    rows = [
                        {
                            name: flatName,
                            relationship: flatRel,
                            primaryPhone: flatP1,
                            secondaryPhone: flatP2,
                            hospitalPreference: flatHosp,
                            emergencyProtocol: flatProt,
                            priority: 1,
                        },
                    ];
                }

                const first = rows[0];
                return {
                    emergencyName: first?.name ?? "",
                    emergencyRelationship: first?.relationship,
                    primaryPhone: first?.primaryPhone ?? "",
                    secondaryPhone: first?.secondaryPhone ?? "",
                    hospitalPreference: first?.hospitalPreference ?? "",
                    emergencyProtocol: first?.emergencyProtocol ?? "",
                    emergencyContacts: rows,
                };
            })(),
            medicationList: client.goalsAndEmergency?.medicationList ?? (client as any).medicationList ?? "",
            medications: (() => {
                const raw = client.goalsAndEmergency?.medications ?? (client as any).medications;
                if (!raw?.length) return [];
                return raw.map((m: import("@/lib/api/clients").ClientMedicationRow) => ({
                    name: m.name ?? "",
                    dosage: m.dosage ?? "",
                    frequency: m.frequency ?? "",
                    notes: m.notes ?? "",
                    selfAdminister: typeof m.selfAdminister === "boolean" ? m.selfAdminister : undefined,
                }));
            })(),
            emergencyBackupPlan: (() => {
                const ebp =
                    client.goalsAndEmergency?.emergencyBackupPlan ??
                    (client as any).emergencyBackupPlan;
                if (!ebp) return undefined;
                return {
                    pers: normalizeYesNo(ebp.pers),
                    providerManagedSetting: normalizeYesNo(ebp.providerManagedSetting),
                    advanceDirective: normalizeYesNo(ebp.advanceDirective),
                    proxyDecisionMaker: normalizeYesNo(ebp.proxyDecisionMaker),
                    narrative: ebp.narrative ?? "",
                };
            })(),
            employmentStatus:
                client.goalsAndEmergency?.employmentStatus ??
                (client as any).employmentStatus ??
                undefined,
            employmentPlan:
                client.goalsAndEmergency?.employmentPlan ?? (client as any).employmentPlan ?? undefined,
            votingPlan:
                client.goalsAndEmergency?.votingPlan ?? (client as any).votingPlan ?? undefined,
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
            teamMembers: (() => {
                const raw =
                    client.systemAiAndAudit?.teamMembers ?? (client as any).teamMembers;
                if (!raw?.length) return [];
                return raw.map((t: import("@/lib/api/clients").ClientTeamMember) => ({
                    name: t.name ?? "",
                    relationship: t.relationship ?? "",
                    contact: t.contact ?? "",
                }));
            })(),
        },
    };
}
