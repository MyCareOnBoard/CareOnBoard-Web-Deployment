import type { ClientDocumentKey } from "@/lib/api/clients";
import type { PlanOfCareFormData } from "./planOfCare";
import type { ClinicalAssessmentFormData } from "./clinicalAssessment";

/** Insurance / payer row from an ISP (ASO, MCO, private). */
export type InsuranceDetail = {
    type?: string;
    name?: string;
    idGroup?: string;
    caseManager?: string;
    contact?: string;
};

export type ClientType = "ddd" | "hha";
export type HhaInsuranceType = "primary" | "secondary";

export type HhaReferralInfo = {
    source?: string;
    date?: Date;
    organization?: string;
    contactPerson?: string;
    contactNumber?: string;
};

export type HhaHomeInfo = {
    apartmentNumber?: string;
    county?: string;
    accessInstructions?: string;
    homeType?: string;
};

export type HhaInsuranceInfo = {
    id: string;
    type: HhaInsuranceType;
    company?: string;
    memberId?: string;
    groupNumber?: string;
    effectiveDate?: Date;
    authorizationRequired?: YesNo;
};

export type HhaServiceRequest = {
    requestedServices?: string[];
    daysNeeded?: string[];
    startDate?: Date;
    preferredTime?: string;
    hoursRequested?: string;
};

export type HhaAuthorization = {
    id: string;
    authorizationNumber?: string;
    serviceId?: string;
    serviceName?: string;
    serviceCode?: string;
    approvedHours?: string;
    startDate?: Date;
    endDate?: Date;
    payerSource?: string;
    rate?: string;
    unitType?: string;
    assignedDsps?: Dsp[];
    serviceType?: string;
    goal?: string;
    modifier?: string;
    clientPayType?: ServicePayType;
    staffRate?: string;
    payType?: ServicePayType;
};

export type HhaPhysicianInfo = {
    name?: string;
    npi?: string;
    phone?: string;
    fax?: string;
    address?: string;
};

export type HhaCaregiverPreferences = {
    languagePreference?: string;
    smokingAllowed?: YesNo;
    petInHome?: YesNo;
    liftAssistanceRequired?: YesNo;
    vehicleRequired?: YesNo;
    specialSkillsNeeded?: string;
};

export type Stage1ClientIdentityAndContactData = {
    firstName: string;
    lastName: string;
    middleName: string;
    gender?: string;
    dob?: Date;
    medicaidId: string;
    dddId: string;
    ssn: string;
    tier?: string;
    address: string;
    location?: { lat: string; lon: string };
    countyState: string;
    zipCode: string;
    secondaryAddress: string;
    secondaryLocation?: { lat: string; lon: string };
    secondaryCountyState: string;
    secondaryZipCode: string;
    phone: string;
    email: string;
    language?: string;
    communicationMethod?: string;
    /** ISP / program metadata */
    planId?: string;
    planType?: string;
    planPrintDate?: Date;
    program?: string;
    waiverEnrollmentDate?: Date;
    dddStatus?: string;
    medicaidType?: string;
    insuranceDetails?: InsuranceDetail[];
    preferredName?: string;
    maritalStatus?: string;
    medicareId?: string;
    homeInfo?: HhaHomeInfo;
    referralInfo?: HhaReferralInfo;
};

/** Client pay type may include per-mile billing; staff pay type uses only hourly / 15-min / daily in the UI. */
export type ServicePayType = "hourly" | "15-min" | "daily" | "mile";

/** Whether a client's services bill the state (claims) or the family (out of pocket). */
export type BillingDirection = "claims" | "out-of-pocket";

/** Wizard Stage 2 guardian / representative relationship — keep in sync with Gemini `GUARDIAN_RELATIONSHIP_ENUM`. */
export const GUARDIAN_RELATIONSHIP_VALUES = [
    "mother",
    "father",
    "sister",
    "brother",
    "child",
    "wife",
    "husband",
    "spouse",
    "partner",
    "grandmother",
    "grandfather",
    "grandparent",
    "aunt",
    "uncle",
    "nephew",
    "niece",
    "cousin",
    "step-parent",
    "relative",
    "guardian",
    "support-coordinator",
    "caregiver",
    "friend",
    "other",
] as const;

export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIP_VALUES)[number];

export const GUARDIAN_RELATIONSHIP_LABELS: Record<GuardianRelationship, string> = {
    mother: "Mother",
    father: "Father",
    sister: "Sister",
    brother: "Brother",
    child: "Child",
    wife: "Wife",
    husband: "Husband",
    spouse: "Spouse",
    partner: "Partner",
    grandmother: "Grandmother",
    grandfather: "Grandfather",
    grandparent: "Grandparent",
    aunt: "Aunt",
    uncle: "Uncle",
    nephew: "Nephew",
    niece: "Niece",
    cousin: "Cousin",
    "step-parent": "Step-parent",
    relative: "Relative",
    guardian: "Guardian",
    "support-coordinator": "Support coordinator",
    caregiver: "Caregiver",
    friend: "Friend",
    other: "Other",
};

/** Structured SDR (service delivery) breakdown imported from client SDR docs. */
export type ServiceSdrDetails = {
    deliveryMethods?: string[];
    supportTasks?: string[];
    frequency?: string;
    duration?: string;
    setting?: string;
    staffing?: string;
    source?: {
        outcomeStatement?: string;
        serviceName?: string;
        serviceCode?: string;
        provider?: string;
        claimsSource?: string;
    };
    importedAt?: string;
};

/** Max list length per SDR extraction / persistence (Firestore size guard). */
export const SDR_DETAILS_LIST_MAX = 50;

export type Service = {
    id: string;
    name?: string;
    code?: string;
    hours?: string;
    totalHours?: string;
    staffRate?: string;
    payType?: ServicePayType;
    clientRate?: string;
    clientPayType?: ServicePayType;
    ispEffectiveDate?: Date;
    startAuthDate?: Date;
    endAuthDate?: Date;
    pcptDate?: Date;
    sdrStartDate?: Date;
    sdrEndDate?: Date;
    /** Rich ISP authorization fields (optional; billing/scheduling may ignore) */
    provider?: string;
    location?: string;
    claimsSource?: string;
    unitType?: string;
    frequency?: string;
    totalUnits?: string;
    totalCost?: string;
    /** Procedure label when separate from procedural code on SDRs (e.g. "CBS"). */
    procedureName?: string;
    sdrPriorAuthorization?: Partial<{
        /** @deprecated Extraction-only; canonical auth dates use `startAuthDate` / `endAuthDate`. */
        startDate: string;
        /** @deprecated Extraction-only; canonical auth dates use `startAuthDate` / `endAuthDate`. */
        endDate: string;
        paNumber: string;
        approvedUnitsTillDate: string;
    }>;
    sdrWeeklyDistribution?: Partial<{
        standardLine: string;
        rows: Array<
            Partial<{
                weekRange: string;
                units: string;
                hours: string;
            }>
        >;
    }>;
    evvStatus?: string;
    evvDescription?: string;
    narrative?: string;
    /** Imported SDR breakdown (delivery methods, tasks); not duplicated on provider/Sdr dates */
    sdrDetails?: ServiceSdrDetails;
    /** Manually assigned staff for this service only (not extracted by AI). */
    assignedDsps?: Dsp[];
};

/** ISP outcome row: one statement owning one or more service authorization rows (wizard canonical model). */
export type Outcome = {
    id: string;
    statement: string;
    services: Service[];
};

/** Guardians / representatives; optional support coordinator fields mirror the legacy single-row ISP layout. */
export type GuardianContact = {
    id: string;
    name?: string;
    relationship?: GuardianRelationship;
    email?: string;
    primaryPhone?: string;
    secondaryPhone?: string;
    address?: string;
    priority?: number;
    supportCoordinatorName?: string;
    supportCoordinatorAgency?: string;
    supportCoordinatorContact?: string;
    isLegalGuardian?: YesNo;
    hasPowerOfAttorney?: YesNo;
};

export type CareTeamContact = {
    role?: string;
    name?: string;
    agency?: string;
    phone?: string;
    email?: string;
    address?: string;
};

export type Stage2GuardianAndFundingData = {
    /** Bills the provider (claims) or the payer/family (out of pocket). Applies to all this client's services. */
    billingDirection: BillingDirection;
    /** Out-of-pocket only: who pays (bill-to) and where invoices are emailed. Required for out-of-pocket. */
    outOfPocketPayerName?: string;
    outOfPocketPayerEmail?: string;
    guardianName: string;
    guardianRelationship?: GuardianRelationship;
    guardianEmail: string;
    guardianPhone: string;
    guardianAddress: string;
    supportCoordinatorName: string;
    supportCoordinatorAgency: string;
    supportCoordinatorContact: string;
    /** Canonical: each outcome nests its service authorization rows. */
    outcomes: Outcome[];
    guardians?: GuardianContact[];
    careTeam?: CareTeamContact[];
    insuranceInfo?: HhaInsuranceInfo[];
    hhaServiceRequest?: HhaServiceRequest;
    hhaAuthorizations?: HhaAuthorization[];
};

export type DocKey =
    | "isp"
    | "pcpt"
    | "poc"
    | "sdr"
    | "bsp"
    | "medicalDocs"
    | "consents"
    | "physicianOrders"
    | "insuranceCards"
    | "medicaidCard"
    | "medicareCard"
    | "idCard"
    | "guardianshipDocs"
    | "assessmentForms"
    | "clinicalAssessment"
    | "form485"
    | "hospitalDischarge";

/**
 * Compile-time guard: DocKey must stay identical to the API's ClientDocumentKey.
 * If the two unions diverge, the assignment below fails to type-check.
 */
type _AssertExtends<A, B> = [A] extends [B] ? true : never;
export const DOC_KEY_MATCHES_API: _AssertExtends<DocKey, ClientDocumentKey> &
    _AssertExtends<ClientDocumentKey, DocKey> = true;

export type DocState = {
    key: DocKey;
    title: string;
    uploadLabel: string;
    file?: File;
    files?: File[];
    url?: string;
    fileName?: string;
    issuedOnDate?: Date;
    expiryDate?: Date;
    autoReminder: boolean;
};

export type AdlSupportNeed = {
    domain?: string;
    levelOfSupport?: string;
    notes?: string;
};

export type Stage3HealthcareAndDocumentsData = {
    medicalConditions: string[];
    allergies: string[];
    dietaryRestrictions: string[];
    seizurePlan: string;
    mobilitySupportNeeds: string[];
    behaviorSupportPlan: string;
    communicationNeeds: string[];
    emergencyProtocols: string;
    docs: DocState[];
    diagnosis?: string;
    healthHazards?: string;
    nutritionNotes?: string;
    selfCareNeeds?: AdlSupportNeed[];
    physicianInfo?: HhaPhysicianInfo;
    fallRisk?: YesNo;
    specialPrecautions?: string;
};

export type YesNo = "yes" | "no" | "";

export type Stage4EvvAndVisitConfigData = {
    evvRequirement: YesNo;
    primaryVisitLocationGps: YesNo;
    allowedSecondaryLocations: YesNo;
    minShiftLength: string;
    maxShiftLength: string;
    backToBackAllowed: YesNo;
    travelTimeAllowed: YesNo;
};

export type AutoCheckKey = "compliance" | "training" | "background" | "expired";

/** Stage 6 emergency contact — single source of truth for the Select. */
export const EMERGENCY_CONTACT_RELATIONSHIP_OPTIONS = [
    { value: "parent", label: "Parent" },
    { value: "guardian", label: "Guardian" },
    { value: "spouse", label: "Spouse" },
    { value: "sibling", label: "Sibling" },
    { value: "relative", label: "Relative" },
    { value: "friend", label: "Friend" },
    { value: "case-manager", label: "Case manager" },
    { value: "other", label: "Other" },
] as const;

export const EMERGENCY_CONTACT_RELATIONSHIP_VALUES = EMERGENCY_CONTACT_RELATIONSHIP_OPTIONS.map(
    (o) => o.value,
) as ReadonlyArray<(typeof EMERGENCY_CONTACT_RELATIONSHIP_OPTIONS)[number]["value"]>;

export type EmergencyContactRelationship =
    (typeof EMERGENCY_CONTACT_RELATIONSHIP_OPTIONS)[number]["value"];

export type Dsp = {
    id: string;
    name: string;
};

export type Stage5StaffAssignmentAndRestrictionsData = {
    genderPreference?: string;
    requiredCertifications: string;
    specialConditions: string;
    prefersFamiliar: YesNo;
    noMaleFemaleStaff: YesNo;
    medicalRestrictionsTrained: YesNo;
    autoChecks: Record<AutoCheckKey, boolean>;
    hhaCaregiverPreferences?: HhaCaregiverPreferences;
};

export type ClientMedication = {
    name?: string;
    dosage?: string;
    frequency?: string;
    notes?: string;
    selfAdminister?: boolean;
};

export type EmergencyBackupPlan = {
    pers?: YesNo;
    providerManagedSetting?: YesNo;
    advanceDirective?: YesNo;
    proxyDecisionMaker?: YesNo;
    narrative?: string;
};

export type Stage6EmergencyContact = {
    name?: string;
    relationship?: EmergencyContactRelationship;
    primaryPhone?: string;
    secondaryPhone?: string;
    hospitalPreference?: string;
    emergencyProtocol?: string;
    priority?: number;
};

export type TeamMember = {
    name?: string;
    relationship?: string;
    contact?: string;
};

export type Stage6GoalsAndEmergencyData = {
    clientGoals: string;
    communityGoals: string;
    dailyLivingGoals: string;
    behavioralGoals: string;
    skillBuildingGoals: string;
    ispOutcomes: string;
    targetBehaviors: string;
    supportStrategies: string;
    emergencyName: string;
    /** Must match Select options in Stage 6 emergency contact. */
    emergencyRelationship?: EmergencyContactRelationship;
    primaryPhone: string;
    secondaryPhone: string;
    hospitalPreference: string;
    emergencyProtocol: string;
    medicationList: string;
    medications?: ClientMedication[];
    emergencyBackupPlan?: EmergencyBackupPlan;
    emergencyContacts?: Stage6EmergencyContact[];
    employmentStatus?: string;
    employmentPlan?: string;
    votingPlan?: string;
};

export type AuditCycle = "monthly" | "quarterly";

export type Stage7SystemAiAndAuditData = {
    aiNotesReview: boolean;
    aiPlanOfCareBuilder: boolean;
    aiGoalTracking: boolean;
    expiringDocsReminder: boolean;
    renewalsReminder: boolean;
    auditCycle: AuditCycle;
    assignedQaStaff: string;
    requiredVisitDocumentation: string;
    notesReviewRules: string;
    billingValidationRules: string;
    teamMembers?: TeamMember[];
};

export type AddClientFormData = {
    agencyId?: string;
    type: ClientType;
    /**
     * Stage 1 should run Places autocomplete on imported primary address and clear after processing.
     * Not sent to APIs.
     */
    _pendingImportedPrimaryGeocode?: boolean;
    stage1: Stage1ClientIdentityAndContactData;
    stage2: Stage2GuardianAndFundingData;
    stage3: Stage3HealthcareAndDocumentsData;
    stage4: Stage4EvvAndVisitConfigData;
    stage5: Stage5StaffAssignmentAndRestrictionsData;
    stage6: Stage6GoalsAndEmergencyData;
    stage7: Stage7SystemAiAndAuditData;
    /**
     * In-progress drafts of the on-site HHA intake forms, kept while the wizard is
     * open so closing/reopening the modal (or switching stages) preserves entries.
     * In-memory only — not sent to APIs (formDataToApiPayload ignores these).
     */
    planOfCareDraft?: PlanOfCareFormData;
    clinicalAssessmentDraft?: ClinicalAssessmentFormData;
};

export function createEmptyServiceAuthorization(): Service {
    return {
        id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
                ? `service-${crypto.randomUUID()}`
                : `service-${Math.random().toString(16).slice(2)}`,
        name: undefined,
        code: undefined,
        hours: "",
        totalHours: "",
        staffRate: "",
        payType: undefined,
        clientRate: "",
        clientPayType: undefined,
        ispEffectiveDate: undefined,
        startAuthDate: undefined,
        endAuthDate: undefined,
        pcptDate: undefined,
        sdrStartDate: undefined,
        sdrEndDate: undefined,
        provider: undefined,
        location: undefined,
        claimsSource: undefined,
        unitType: undefined,
        frequency: undefined,
        totalUnits: undefined,
        totalCost: undefined,
        evvStatus: undefined,
        evvDescription: undefined,
        narrative: undefined,
        sdrDetails: undefined,
        assignedDsps: [],
    };
}

export function createEmptyOutcome(): Outcome {
    return {
        id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
                ? `outcome-${crypto.randomUUID()}`
                : `outcome-${Math.random().toString(16).slice(2)}`,
        statement: "",
        services: [createEmptyServiceAuthorization()],
    };
}

function newId(prefix: string): string {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `${prefix}-${crypto.randomUUID()}`
        : `${prefix}-${Math.random().toString(16).slice(2)}`;
}

export function createEmptyGuardianContact(): GuardianContact {
    return {
        id: newId("guardian"),
        name: "",
        email: "",
        primaryPhone: "",
        address: "",
        supportCoordinatorName: "",
        supportCoordinatorAgency: "",
        supportCoordinatorContact: "",
    };
}

export function createEmptyHhaInsuranceInfo(type: HhaInsuranceType = "primary"): HhaInsuranceInfo {
    return {
        id: newId("insurance"),
        type,
        company: "",
        memberId: "",
        groupNumber: "",
        effectiveDate: undefined,
        authorizationRequired: "",
    };
}

export function createEmptyHhaAuthorization(): HhaAuthorization {
    return {
        id: newId("hha-auth"),
        authorizationNumber: "",
        serviceId: undefined,
        serviceName: "",
        serviceCode: "",
        approvedHours: "",
        startDate: undefined,
        endDate: undefined,
        payerSource: "",
        rate: "",
        unitType: "",
        assignedDsps: [],
        serviceType: undefined,
        modifier: undefined,
        clientPayType: undefined,
        staffRate: "",
        payType: undefined,
    };
}

export function createInitialDocs(type: ClientType = "ddd"): DocState[] {
    if (type === "hha") {
        return [
            {
                key: "physicianOrders",
                title: "Physician Orders",
                uploadLabel: "Upload Physician Orders",
                autoReminder: true,
            },
            {
                key: "poc",
                title: "Plan of Care (POC)",
                uploadLabel: "Upload Plan of Care (POC)",
                autoReminder: true,
            },
            {
                key: "form485",
                title: "Form 485",
                uploadLabel: "Upload Form 485 (CMS-485 Plan of Care)",
                autoReminder: true,
            },
            {
                key: "insuranceCards",
                title: "Insurance Cards",
                uploadLabel: "Upload front and back insurance cards",
                autoReminder: true,
            },
            {
                key: "medicaidCard",
                title: "Medicaid Card",
                uploadLabel: "Upload Medicaid card",
                autoReminder: true,
            },
            {
                key: "medicareCard",
                title: "Medicare Card",
                uploadLabel: "Upload Medicare card",
                autoReminder: true,
            },
            {
                key: "idCard",
                title: "ID Card",
                uploadLabel: "Upload ID card",
                autoReminder: true,
            },
            {
                key: "guardianshipDocs",
                title: "Guardianship / POA Documents",
                uploadLabel: "Upload guardianship or POA documents",
                autoReminder: true,
            },
            {
                key: "consents",
                title: "Consent Forms",
                uploadLabel: "Upload consent forms",
                autoReminder: true,
            },
            {
                key: "clinicalAssessment",
                title: "Clinical Assessment",
                uploadLabel: "Upload clinical assessment",
                autoReminder: true,
            },
            {
                key: "hospitalDischarge",
                title: "Hospital Discharge Papers",
                uploadLabel: "Upload hospital discharge papers",
                autoReminder: true,
            },
        ];
    }

    return [
        {
            key: "isp",
            title: "ISP (Individualized Service Plan)",
            uploadLabel: "Upload ISP (Individualized Service Plan)",
            autoReminder: true,
        },
        {
            key: "pcpt",
            title: "PCPT (Person-Centered Planning Tool)",
            uploadLabel: "Upload PCPT (Person-Centered Planning Tool)",
            autoReminder: true,
        },
        {
            key: "poc",
            title: "Plan of Care (POC)",
            uploadLabel: "Upload Plan of Care (POC)",
            autoReminder: true,
        },
        {
            key: "sdr",
            title: "SDR (Service Detail Report)",
            uploadLabel: "Upload SDR (Service Detail Report)",
            autoReminder: true,
        },
        {
            key: "bsp",
            title: "Behavior Plan / BSP",
            uploadLabel: "Upload Behavior Plan / BSP",
            autoReminder: true,
        },
        {
            key: "medicalDocs",
            title: "Medical Documents (allergies, seizure plan, care notes)",
            uploadLabel: "Upload Medical Documents (allergies, seizure plan, care notes)",
            autoReminder: true,
        },
        {
            key: "consents",
            title: "Consents & Releases",
            uploadLabel: "Upload Consents & Releases",
            autoReminder: true,
        },
    ];
}

export function createInitialAddClientFormData(): AddClientFormData {
    return {
        agencyId: undefined,
        type: "ddd",
        stage1: {
            firstName: "",
            lastName: "",
            middleName: "",
            gender: undefined,
            dob: undefined,
            medicaidId: "",
            dddId: "",
            ssn: "",
            tier: undefined,
            address: "",
            location: undefined,
            countyState: "",
            zipCode: "",
            secondaryAddress: "",
            secondaryLocation: undefined,
            secondaryCountyState: "",
            secondaryZipCode: "",
            phone: "",
            email: "",
            language: undefined,
            communicationMethod: undefined,
            planId: undefined,
            planType: undefined,
            planPrintDate: undefined,
            program: undefined,
            waiverEnrollmentDate: undefined,
            dddStatus: undefined,
            medicaidType: undefined,
            insuranceDetails: [],
            preferredName: "",
            maritalStatus: "",
            medicareId: "",
            homeInfo: {
                apartmentNumber: "",
                county: "",
                accessInstructions: "",
                homeType: "",
            },
            referralInfo: {
                source: "",
                date: undefined,
                organization: "",
                contactPerson: "",
                contactNumber: "",
            },
        },
        stage2: {
            billingDirection: "claims",
            outOfPocketPayerName: "",
            outOfPocketPayerEmail: "",
            guardianName: "",
            guardianRelationship: undefined,
            guardianEmail: "",
            guardianPhone: "",
            guardianAddress: "",
            supportCoordinatorName: "",
            supportCoordinatorAgency: "",
            supportCoordinatorContact: "",
            outcomes: [],
            guardians: [],
            careTeam: [],
            insuranceInfo: [createEmptyHhaInsuranceInfo("primary")],
            hhaServiceRequest: {
                requestedServices: [],
                daysNeeded: [],
                startDate: undefined,
                preferredTime: "",
                hoursRequested: "",
            },
            hhaAuthorizations: [createEmptyHhaAuthorization()],
        },
        stage3: {
            medicalConditions: [],
            allergies: [],
            dietaryRestrictions: [],
            seizurePlan: "",
            mobilitySupportNeeds: [],
            behaviorSupportPlan: "",
            communicationNeeds: [],
            emergencyProtocols: "",
            docs: createInitialDocs(),
            diagnosis: undefined,
            healthHazards: undefined,
            nutritionNotes: undefined,
            selfCareNeeds: [],
            physicianInfo: {
                name: "",
                npi: "",
                phone: "",
                fax: "",
                address: "",
            },
            fallRisk: "",
            specialPrecautions: "",
        },
        stage4: {
            evvRequirement: "",
            primaryVisitLocationGps: "",
            allowedSecondaryLocations: "",
            minShiftLength: "",
            maxShiftLength: "",
            backToBackAllowed: "",
            travelTimeAllowed: "",
        },
        stage5: {
            genderPreference: undefined,
            requiredCertifications: "",
            specialConditions: "",
            prefersFamiliar: "",
            noMaleFemaleStaff: "",
            medicalRestrictionsTrained: "",
            autoChecks: {
                compliance: false,
                training: false,
                background: false,
                expired: false,
            },
            hhaCaregiverPreferences: {
                languagePreference: "",
                smokingAllowed: "",
                petInHome: "",
                liftAssistanceRequired: "",
                vehicleRequired: "",
                specialSkillsNeeded: "",
            },
        },
        stage6: {
            clientGoals: "",
            communityGoals: "",
            dailyLivingGoals: "",
            behavioralGoals: "",
            skillBuildingGoals: "",
            ispOutcomes: "",
            targetBehaviors: "",
            supportStrategies: "",
            emergencyName: "",
            emergencyRelationship: undefined,
            primaryPhone: "",
            secondaryPhone: "",
            hospitalPreference: "",
            emergencyProtocol: "",
            medicationList: "",
            medications: [],
            emergencyBackupPlan: undefined,
            emergencyContacts: [],
            employmentStatus: undefined,
            employmentPlan: undefined,
            votingPlan: undefined,
        },
        stage7: {
            aiNotesReview: true,
            aiPlanOfCareBuilder: true,
            aiGoalTracking: true,
            expiringDocsReminder: true,
            renewalsReminder: true,
            auditCycle: "monthly",
            assignedQaStaff: "",
            requiredVisitDocumentation: "",
            notesReviewRules: "",
            billingValidationRules: "",
            teamMembers: [],
        },
        planOfCareDraft: undefined,
        clinicalAssessmentDraft: undefined,
    };
}
