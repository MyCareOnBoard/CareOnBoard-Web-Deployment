/** Insurance / payer row from an ISP (ASO, MCO, private). */
export type InsuranceDetail = {
    type?: string;
    name?: string;
    idGroup?: string;
    caseManager?: string;
    contact?: string;
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
};

/** Client pay type may include per-mile billing; staff pay type uses only hourly / 15-min / daily in the UI. */
export type ServicePayType = "hourly" | "15-min" | "daily" | "mile";

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

export type Service = {
    id: string;
    name?: string;
    code?: string;
    hours?: string;
    totalApprovedHours?: string;
    rate?: string;
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
    evvStatus?: string;
    evvDescription?: string;
    narrative?: string;
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
};

export type DocKey =
    | "isp"
    | "pcpt"
    | "poc"
    | "sdr"
    | "bsp"
    | "medicalDocs"
    | "consents";

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
    primaryDiagnosis?: string;
    secondaryDiagnosis?: string;
    healthHazards?: string;
    nutritionNotes?: string;
    selfCareNeeds?: AdlSupportNeed[];
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
        totalApprovedHours: "",
        rate: "",
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

export function createInitialDocs(): DocState[] {
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
        },
        stage2: {
            guardianName: "",
            guardianRelationship: undefined,
            guardianEmail: "",
            guardianPhone: "",
            guardianAddress: "",
            supportCoordinatorName: "",
            supportCoordinatorAgency: "",
            supportCoordinatorContact: "",
            outcomes: [createEmptyOutcome()],
            guardians: [],
            careTeam: [],
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
            primaryDiagnosis: undefined,
            secondaryDiagnosis: undefined,
            healthHazards: undefined,
            nutritionNotes: undefined,
            selfCareNeeds: [],
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
    };
}
