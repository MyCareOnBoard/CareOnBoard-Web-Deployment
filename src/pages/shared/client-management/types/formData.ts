export type Stage1ClientIdentityAndContactData = {
    firstName: string;
    lastName: string;
    middleName: string;
    gender?: string;
    dob?: Date;
    medicaidId: string;
    dddId: string;
    ssn: string;
    nursingLevel?: string;
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
};

export type ServicePayType = "hourly" | "15-min" | "daily";

export type Service = {
    id: string;
    name?: string;
    code?: string;
    hours?: string;
    totalApprovedHours?: string;
    rate?: string;
    payType?: ServicePayType;
    ispEffectiveDate?: Date;
    startAuthDate?: Date;
    endAuthDate?: Date;
    pcptDate?: Date;
    sdrStartDate?: Date;
    sdrEndDate?: Date;
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
    file?: File;
    files?: File[];
    url?: string;
    fileName?: string;
    issuedOnDate?: Date;
    expiryDate?: Date;
    autoReminder: boolean;
};

export type Stage3HealthcareAndDocumentsData = {
    medicalConditions: string;
    allergies: string;
    dietaryRestrictions: string;
    seizurePlan: string;
    mobilitySupportNeeds: string;
    behaviorSupportPlan: string;
    communicationNeeds: string;
    emergencyProtocols: string;
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
    clientGoals: string;
    communityGoals: string;
    dailyLivingGoals: string;
    behavioralGoals: string;
    skillBuildingGoals: string;
    ispOutcomes: string;
    targetBehaviors: string;
    supportStrategies: string;
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
    agencyId?: string;
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
        totalApprovedHours: "",
        rate: "",
        payType: undefined,
        ispEffectiveDate: undefined,
        startAuthDate: undefined,
        endAuthDate: undefined,
        pcptDate: undefined,
        sdrStartDate: undefined,
        sdrEndDate: undefined,
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
            nursingLevel: undefined,
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
