export type Stage1ClientIdentityAndContactData = {
    // Identity
    firstName: string;
    lastName: string;
    middleName: string;
    gender?: string;
    dob?: Date;
    medicaidId: string;
    dddId: string;
    ssn: string;
    nursingLevel?: string;

    // Contact
    address: string;
    location?: { lat: string; lon: string };
    countyState: string;
    zipCode: string;
    phone: string;
    email: string;
    language?: string;
    communicationMethod?: string;
};

export type Service = {
    id: string;
    name?: string;
    code?: string;
    hours?: string;
    rate?: string;
    ispEffectiveDate?: Date;
    startAuthDate?: Date;
    endAuthDate?: Date;
    pcptDate?: Date;
    sdrDate?: Date;
};

export type Stage2GuardianAndFundingData = {
    guardianName: string;
    guardianRelationship?: string;
    guardianEmail: string;
    guardianPhone: string;
    guardianAddress: string;
    supportCoordinatorName: string;
    supportCoordinatorAgency: string;
    supportCoordinatorContact: string;
    services: Service[];
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
    // Single-file upload (ISP, PCPT, POC, SDR, BSP)
    file?: File;
    // Multi-file upload support (used for medicalDocs and consents)
    files?: File[];
    fileName?: string;
    uploadDate?: Date;
    expiryDate?: Date;
    autoReminder: boolean;
};

export type Stage3HealthcareAndDocumentsData = {
    // Section 5
    medicalConditions: string;
    allergies: string;
    dietaryRestrictions: string;
    seizurePlan: string;
    mobilitySupportNeeds: string;
    behaviorSupportPlan: string;
    communicationNeeds: string;
    emergencyProtocols: string;

    // Section 6
    docs: DocState[];
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

export type Dsp = {
    id: string;
    name: string;
};

export type Stage5StaffAssignmentAndRestrictionsData = {
    primaryDsp?: Dsp;
    secondaryDsps: Dsp[];
    genderPreference?: string;
    requiredCertifications: string;
    specialConditions: string;
    prefersFamiliar: YesNo;
    noMaleFemaleStaff: YesNo;
    medicalRestrictionsTrained: YesNo;
    autoChecks: Record<AutoCheckKey, boolean>;
};

export type Stage6GoalsAndEmergencyData = {
    // Goals
    clientGoals: string;
    communityGoals: string;
    dailyLivingGoals: string;
    behavioralGoals: string;
    skillBuildingGoals: string;
    ispOutcomes: string;
    targetBehaviors: string;
    supportStrategies: string;

    // Emergency
    emergencyName: string;
    emergencyRelationship?: string;
    primaryPhone: string;
    secondaryPhone: string;
    hospitalPreference: string;
    emergencyProtocol: string;
    medicationList: string;
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
};

export type AddClientFormData = {
    stage1: Stage1ClientIdentityAndContactData;
    stage2: Stage2GuardianAndFundingData;
    stage3: Stage3HealthcareAndDocumentsData;
    stage4: Stage4EvvAndVisitConfigData;
    stage5: Stage5StaffAssignmentAndRestrictionsData;
    stage6: Stage6GoalsAndEmergencyData;
    stage7: Stage7SystemAiAndAuditData;
};

function createEmptyServiceAuthorization(): Service {
    return {
        id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
                ? `service-${crypto.randomUUID()}`
                : `service-${Math.random().toString(16).slice(2)}`,
        name: undefined,
        code: undefined,
        hours: "",
        rate: "",
        ispEffectiveDate: undefined,
        startAuthDate: undefined,
        endAuthDate: undefined,
        pcptDate: undefined,
        sdrDate: undefined,
    };
}

function createInitialDocs(): DocState[] {
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
        stage1: {
            firstName: "",
            lastName: "",
            middleName: "",
            gender: undefined,
            dob: undefined,
            medicaidId: "",
            dddId: "",
            ssn: "",
            nursingLevel: undefined,
            address: "",
            location: undefined,
            countyState: "",
            zipCode: "",
            phone: "",
            email: "",
            language: undefined,
            communicationMethod: undefined,
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
            services: [createEmptyServiceAuthorization()],
        },
        stage3: {
            medicalConditions: "",
            allergies: "",
            dietaryRestrictions: "",
            seizurePlan: "",
            mobilitySupportNeeds: "",
            behaviorSupportPlan: "",
            communicationNeeds: "",
            emergencyProtocols: "",
            docs: createInitialDocs(),
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
            primaryDsp: undefined,
            secondaryDsps: [],
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
        },
    };
}


