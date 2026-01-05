import React, {useState, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {useToast} from "@/hooks/use-toast";
import {useNavigate, useLocation} from "react-router";
import {Routes} from "@/routes/constants";
import {ArrowRight, ArrowLeft} from "lucide-react";
import {useCreateAgencyWithUserMutation, useUploadAgencyFileMutation} from "./api";
import {UserType} from "@/utils/auth/types/user.types";
import {SaveDraftModal} from "./SaveDraftModal";
import Step1AgencyIdentity from "@/pages/super-admin/agencies/components/StepOne";
import Step3Leadership from "@/pages/super-admin/agencies/components/StepTwo";
import Step5Operational from "@/pages/super-admin/agencies/components/StepThree";
import Step6AISettings from "@/pages/super-admin/agencies/components/StepFour";
import Step8Branding from "@/pages/super-admin/agencies/components/StepFive";
import Step9Billing from "@/pages/super-admin/agencies/components/StepSix";
import Step10Subscription from "@/pages/super-admin/agencies/components/StepSeven";

interface AgencyFormData {
    // Step 1: Agency Identity Information
    agencyName: string;
    legalBusinessName: string;
    dba: string;
    agencyType: string;
    ein: string;
    npi: string;
    medicaidProviderId: string;

    // Step 2: Contact Information
    primaryAddress: string;
    county_or_state: string;
    zipCode: string;
    mainPhone: string;
    supportEmail: string;
    websiteUrl: string;

    // Step 3: Leadership & Admin Contacts
    userName: string;
    userPhone: string;
    userEmail: string;
    userPassword: string;

    // Step 4: Service Configuration
    services: string[];
    serviceCodeMapping: Record<string, any>;
    evvSettings: Record<string, any>;

    // Step 5: Operational Settings
    schedulingRules: string;
    maxShiftPerDay: string;
    travelTimeRules: string;
    mileageSettings: string;
    mileageRate: number;
    incidentReportingSettings: string;
    whoReceivesNotifications: string;
    expenseReportSettings: string;
    allowedFileTypes: string[];
    allowRecurringSchedules: boolean;
    allowOverlappingVisits: boolean;
    offerMileageReimbursements: boolean;
    realtimeGpsTracking: boolean;

    // Step 6: AI Settings & Permissions
    aiNotesReview: boolean;
    aiPlanOfCareBuilder: boolean;
    aiScheduleOptimizer: boolean;
    aiDataCleaner: boolean;
    aiBillingValidator: boolean;

    // Step 7: Document Requirements
    requireIds: boolean;
    requireSsn: boolean;
    requireResume: boolean;
    requireCertificates: boolean;
    requireTrainings: boolean;
    requireClearances: boolean;
    expiryRules: boolean;
    autoReminders: boolean;
    reminderFrequency: string;
    whoReceivesReminders: string;

    // Step 10: Subscription & Licensing
    subscriptionTier: string;
    addOns: string[];

    // Step 8: Branding Setup
    logo: File | null;
    themeColor: string;
    letterhead: File | null;

    // Step 9: Billing Configuration
    billingFormat: string;
    dddFormat: string;
    hhaExchangeFormat: string;
    allowCustomReport: boolean;
    invoiceName: string;
    invoiceEmail: string;
    invoiceFax: string;
    payrollSystemIntegration: string;
    quickBooks: string;
    adp: string;
    paycheck: string;

    // Step 11: Security & Compliance
    permissionTemplates: boolean;
    auditRetentionPeriod: string;
    auditRetentionPeriodNumber: string;
}

const STEPS = [
    {
        id: 1,
        number: 1,
        title: "Agency Identity Information",
        description: "These fields uniquely identify the agency in the system.",
        requiredFields: [
            "agencyName",
            "agencyType",
            "ein",
            "primaryAddress",
            "county_or_state",
            "zipCode",
            "mainPhone",
            "supportEmail",
        ]
    },
    {
        id: 2,
        number: 2,
        title: "Leadership & Admin Contacts",
        description: "Defines the default Super Admin for the agency.",
        requiredFields: [
            "userName",
            "userPhone",
            "userEmail",
            "userPassword",
            "services"
        ]
    },
    {
        id: 3,
        number: 5,
        title: "Operational Settings",
        description: "Defines how the agency operates internally.",
        requiredFields: [
            "schedulingRules",
            "maxShiftPerDay",
            "travelTimeRules",
            "mileageSettings",
            "mileageRate",
            "incidentReportingSettings",
            "expenseReportSettings",
            "allowedFileTypes",
            "allowRecurringSchedules",
            "allowOverlappingVisits",
            "offerMileageReimbursements",
            "realtimeGpsTracking"
        ]
    },
    {
        id: 4,
        number: 6,
        title: "AI Settings & Permissions",
        description: "What AI features are enabled for the agency.",
        requiredFields: []
    },
    {
        id: 5,
        number: 8,
        title: "Branding Setup",
        description: "Aesthetic and identity settings.",
        requiredFields: [
            "logo",
            "themeColor",
            "letterhead"
        ]
    },
    {
        id: 6,
        number: 9,
        title: "Billing Configuration",
        description: "Needed for Timesheets, Invoices, and Exports.",
        requiredFields: [
            "billingFormat",
            "dddFormat",
            "hhaExchangeFormat",
            "allowCustomReport",
            "invoiceName",
            "invoiceEmail",
            "paycheck"
        ]
    },
    {
        id: 7,
        number: 10,
        title: "Subscription & Licensing Setup",
        description: "Defines how the agency pays and what tier they belong to.",
        requiredFields: [
            "subscriptionTier",
            "auditRetentionPeriod",
            "auditRetentionPeriodNumber"
        ]
    },
];

export default function AddAgencyWizard() {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentStep, setCurrentStep] = useState(1);
    const [agencyId] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
    const {toast} = useToast();

    const [createAgencyWithUser, {isLoading: isCreating}] = useCreateAgencyWithUserMutation();
    const [uploadFile, {isLoading: isUploading}] = useUploadAgencyFileMutation();

    const isSaving = isCreating || isUploading || isSavingDraft;

    const [fieldsWithErrors, setFieldsWithErrors] = useState<string[]>([]);

    const [formData, setFormData] = useState<AgencyFormData>({
        agencyName: "",
        legalBusinessName: "",
        dba: "",
        agencyType: "",
        ein: "",
        npi: "",
        medicaidProviderId: "",
        primaryAddress: "",
        county_or_state: "",
        zipCode: "",
        mainPhone: "",
        supportEmail: "",
        websiteUrl: "",
        userName: "",
        userPhone: "",
        userEmail: "",
        userPassword: "",
        services: [],
        serviceCodeMapping: {},
        evvSettings: {},
        schedulingRules: "",
        maxShiftPerDay: "5",
        travelTimeRules: "",
        mileageSettings: "",
        mileageRate: 0,
        incidentReportingSettings: "",
        whoReceivesNotifications: "",
        expenseReportSettings: "",
        allowedFileTypes: [],
        allowRecurringSchedules: false,
        allowOverlappingVisits: false,
        offerMileageReimbursements: false,
        realtimeGpsTracking: false,
        aiNotesReview: false,
        aiPlanOfCareBuilder: false,
        aiScheduleOptimizer: false,
        aiDataCleaner: false,
        aiBillingValidator: false,
        requireIds: false,
        requireSsn: false,
        requireResume: false,
        requireCertificates: false,
        requireTrainings: false,
        requireClearances: false,
        expiryRules: false,
        autoReminders: false,
        reminderFrequency: "",
        whoReceivesReminders: "",
        subscriptionTier: "basic",
        addOns: [],
        logo: null,
        themeColor: "#2B82FF",
        letterhead: null,
        billingFormat: "",
        dddFormat: "",
        hhaExchangeFormat: "",
        allowCustomReport: false,
        invoiceName: "",
        invoiceEmail: "",
        invoiceFax: "",
        payrollSystemIntegration: "",
        quickBooks: "",
        adp: "",
        paycheck: "",
        permissionTemplates: false,
        auditRetentionPeriod: "monthly",
        auditRetentionPeriodNumber: "",
    });

    const [agreedToTerms, setAgreedToTerms] = useState(false);

    // Load saved draft data if editing
    useEffect(() => {
        const savedData = location.state?.savedData;
        if (savedData) {
            setFormData(savedData.formData);
            setCurrentStep(savedData.currentStep || 1);
            setEditingDraftId(savedData.id);
        }
    }, [location.state]);

    const handleInputChange = (field: keyof AgencyFormData, value: any) => {
        setFormData((prev) => ({...prev, [field]: value}));
        setFieldsWithErrors((prev) => prev.filter((f) => f !== field));
    };

    const handleSaveDraft = async (saveName: string) => {
        setIsSavingDraft(true);
        try {
            const existingDrafts = JSON.parse(localStorage.getItem('agencyDrafts') || '[]');

            if (editingDraftId) {
                // Update existing draft
                const draftIndex = existingDrafts.findIndex((d: any) => d.id === editingDraftId);
                if (draftIndex !== -1) {
                    existingDrafts[draftIndex] = {
                        ...existingDrafts[draftIndex],
                        name: saveName,
                        savedDate: new Date().toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        }),
                        formData: formData,
                        currentStep: currentStep,
                    };
                }
            } else {
                // Create new draft
                const draftData = {
                    id: Date.now().toString(),
                    name: saveName,
                    savedDate: new Date().toLocaleDateString('en-US', {day: 'numeric', month: 'long', year: 'numeric'}),
                    formData: formData,
                    currentStep: currentStep,
                };
                existingDrafts.push(draftData);
                setEditingDraftId(draftData.id);
            }

            localStorage.setItem('agencyDrafts', JSON.stringify(existingDrafts));

            setShowSaveModal(false);
            toast({
                title: "Draft Saved",
                description: `"${saveName}" has been saved successfully.`,
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save draft",
                variant: "destructive",
            });
        } finally {
            setIsSavingDraft(false);
        }
    };

    const validateCurrentStep = (): { isValid: boolean; missingFields: string[] } => {
        const currentStepConfig = STEPS.find(step => step.id === currentStep);
        if (!currentStepConfig || !currentStepConfig.requiredFields?.length) {
            return { isValid: true, missingFields: [] };
        }

        const missingFields = currentStepConfig.requiredFields.filter(field => {
            const value = formData[field as keyof AgencyFormData];
            return value === '' || value === null || value === undefined || 
                   (Array.isArray(value) && value.length === 0);
        });

        setFieldsWithErrors(missingFields);

        return {
            isValid: missingFields.length === 0,
            missingFields
        };
    };

    const handleNext = () => {
        const { isValid, missingFields } = validateCurrentStep();
        
        if (!isValid) {
            // Format field names for display (add spaces before capital letters and capitalize first letter)
            const formattedFields = missingFields.map(field => 
                field.replace(/([A-Z])/g, ' $1')
                     .replace(/^./, str => str.toUpperCase())
                     .trim()
            );
            
            toast({
                title: "Missing Required Fields",
                description: `Please fill in the following required fields: ${formattedFields.join(', ')}`,
                variant: "destructive",
            });
            return;
        }

        if (currentStep < STEPS.length) {
            setCurrentStep(currentStep + 1);
        }
    };
    
    const handleStepClick = (stepNumber: number) => {
        if (stepNumber < currentStep) {
            // Allow going back to previous steps without validation
            setCurrentStep(stepNumber);
        } else if (stepNumber > currentStep) {
            // Validate current step before allowing to proceed to next steps
            const { isValid } = validateCurrentStep();
            if (isValid) {
                setCurrentStep(stepNumber);
            } else {
                toast({
                    title: "Complete Current Step",
                    description: "Please complete all required fields in the current step before proceeding.",
                    variant: "destructive",
                });
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async () => {
        // Validate all steps before submission
        for (let i = 0; i < STEPS.length; i++) {
            const step = STEPS[i];
            if (step.requiredFields?.length) {
                const missingFields = step.requiredFields.filter(field => {
                    const value = formData[field as keyof AgencyFormData];
                    return value === '' || value === null || value === undefined || 
                           (Array.isArray(value) && value.length === 0);
                });

                if (missingFields.length > 0) {
                    // Format field names for display
                    const formattedFields = missingFields.map(field => 
                        field.replace(/([A-Z])/g, ' $1')
                             .replace(/^./, str => str.toUpperCase())
                             .trim()
                    );

                    setCurrentStep(i + 1); // Navigate to the step with missing fields
                    toast({
                        title: `Step ${i + 1} Incomplete`,
                        description: `Please fill in the following required fields: ${formattedFields.join(', ')}`,
                        variant: "destructive",
                    });
                    return;
                }
            }
        }

        if (!agreedToTerms) {
            toast({
                title: "Agreement Required",
                description: "Please confirm that all information is correct",
                variant: "destructive",
            });
            return;
        }

        try {
            // Upload logo if exists
            let logoUrl = formData.logo ? (typeof formData.logo === 'string' ? formData.logo : '') : '';
            if (formData.logo && typeof formData.logo !== 'string') {
                const logoResult = await uploadFile({
                    file: formData.logo,
                    fileType: 'logo',
                    agencyId: agencyId
                }).unwrap();
                logoUrl = logoResult.url;
            }

            // Upload letterhead if exists
            let letterheadUrl = formData.letterhead ? (typeof formData.letterhead === 'string' ? formData.letterhead : '') : '';
            if (formData.letterhead && typeof formData.letterhead !== 'string') {
                const letterheadResult = await uploadFile({
                    file: formData.letterhead,
                    fileType: 'letterhead',
                    agencyId: agencyId
                }).unwrap();
                letterheadUrl = letterheadResult.url;
            }

            // Create agency with all wizard data
            await createAgencyWithUser({
                agency: {
                    name: formData.agencyName,
                    legalBusinessName: formData.legalBusinessName,
                    dba: formData.dba,
                    agencyType: formData.agencyType,
                    ein: formData.ein,
                    npi: formData.npi,
                    medicaidProviderId: formData.medicaidProviderId,
                    email: formData.supportEmail,
                    phone: formData.mainPhone,
                    address: formData.primaryAddress,
                    county: formData.county,
                    city: formData.county,
                    state: formData.state,
                    zipCode: formData.zipCode,
                    website: formData.websiteUrl,
                    services: formData.services,
                    serviceCodeMapping: formData.serviceCodeMapping,
                    evvSettings: formData.evvSettings,
                    schedulingRules: formData.schedulingRules,
                    maxShiftPerDay: parseInt(formData.maxShiftPerDay),
                    travelTimeRules: formData.travelTimeRules,
                    mileageSettings: formData.mileageSettings,
                    mileageRate: formData.mileageRate,
                    incidentReportingSettings: formData.incidentReportingSettings,
                    whoReceivesNotifications: formData.whoReceivesNotifications,
                    expenseReportSettings: formData.expenseReportSettings,
                    allowedFileTypes: formData.allowedFileTypes,
                    allowRecurringSchedules: formData.allowRecurringSchedules,
                    allowOverlappingVisits: formData.allowOverlappingVisits,
                    offerMileageReimbursements: formData.offerMileageReimbursements,
                    realtimeGpsTracking: formData.realtimeGpsTracking,
                    aiNotesReview: formData.aiNotesReview,
                    aiPlanOfCareBuilder: formData.aiPlanOfCareBuilder,
                    aiScheduleOptimizer: formData.aiScheduleOptimizer,
                    aiDataCleaner: formData.aiDataCleaner,
                    aiBillingValidator: formData.aiBillingValidator,
                    requireIds: formData.requireIds,
                    requireSsn: formData.requireSsn,
                    requireResume: formData.requireResume,
                    requireCertificates: formData.requireCertificates,
                    requireTrainings: formData.requireTrainings,
                    requireClearances: formData.requireClearances,
                    expiryRules: formData.expiryRules,
                    autoReminders: formData.autoReminders,
                    reminderFrequency: formData.reminderFrequency,
                    whoReceivesReminders: formData.whoReceivesReminders,
                    logo: logoUrl,
                    themeColor: formData.themeColor,
                    letterhead: letterheadUrl,
                    primaryColor: formData.themeColor,
                    billingFormat: formData.billingFormat,
                    dddFormat: formData.dddFormat,
                    hhaExchangeFormat: formData.hhaExchangeFormat,
                    allowCustomReport: formData.allowCustomReport,
                    invoiceName: formData.invoiceName,
                    invoiceEmail: formData.invoiceEmail,
                    invoiceFax: formData.invoiceFax,
                    payrollSystemIntegration: formData.payrollSystemIntegration,
                    quickBooks: formData.quickBooks,
                    adp: formData.adp,
                    paycheck: formData.paycheck,
                    subscriptionTier: formData.subscriptionTier,
                    numberOfDspSeats: parseInt(formData.numberOfDspSeats),
                    addOns: formData.addOns,
                    defaultUserRoles: formData.defaultUserRoles,
                    permissionTemplates: formData.permissionTemplates,
                    twoFactorAuth: formData.twoFactorAuth,
                    auditRetentionPeriod: formData.auditRetentionPeriod,
                },
                user: {
                    fullName: formData.userName,
                    email: formData.userEmail,
                    password: formData.userPassword,
                    phone: formData.userPhone,
                    userType: UserType.AGENCY,
                },
            }).unwrap();

            toast({
                title: "Success",
                description: "Agency created successfully",
            });
            navigate(Routes.superAdmin.agencies);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error?.data?.error || error?.message || "Failed to create agency",
                variant: "destructive",
            });
        }
    };

    const handleCancel = () => {
        navigate(Routes.superAdmin.agencies);
    };

    const currentStepData = STEPS.find((s) => s.id === currentStep);

    return (
        <div className="min-h-screen flex flex-col">
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="sticky top-0 px-8 pb-6 z-10">
                    <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
                        <div>
                            <h2 className="text-[28px] font-bold text-[#10141a]">Add new agency</h2>
                            {currentStepData && (
                                <div className="mt-2">
                                    <p className="text-[16px] font-semibold text-[#10141a]">
                                        {currentStepData.number}. {currentStepData.title}
                                    </p>
                                    <p className="text-[14px] text-[#808081] mt-1">{currentStepData.description}</p>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col items-center gap-3">
                            <div className="flex items-center gap-2 text-[#00b4b8] cursor-pointer"
                                 onClick={() => navigate(Routes.superAdmin.savedAgencies)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
                                     fill="none">
                                    <path
                                        d="M4 17.9808V9.70753C4 6.07416 4 4.25748 5.17157 3.12874C6.34315 2 8.22876 2 12 2C15.7712 2 17.6569 2 18.8284 3.12874C20 4.25748 20 6.07416 20 9.70753V17.9808C20 20.2867 20 21.4396 19.2272 21.8523C17.7305 22.6514 14.9232 19.9852 13.59 19.1824C12.8168 18.7168 12.4302 18.484 12 18.484C11.5698 18.484 11.1832 18.7168 10.41 19.1824C9.0768 19.9852 6.26947 22.6514 4.77285 21.8523C4 21.4396 4 20.2867 4 17.9808Z"
                                        stroke="#808081" stroke-width="1.5" stroke-linecap="round"
                                        stroke-linejoin="round"/>
                                    <path opacity="0.4" d="M4 7H20" stroke="#808081" stroke-width="1.5"/>
                                </svg>
                                <span className="text-[16px] text-[#808081] font-semibold">Saved Agencies</span>
                            </div>
                            <span className="text-[14px] text-black">Agency ID - {agencyId}</span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 px-8 py-2">
                    <div className="max-w-7xl mx-auto">
                        {currentStep === 1 && <Step1AgencyIdentity
                            formData={formData}
                            onChange={handleInputChange}
                            fieldsWithErrors={fieldsWithErrors}
                        />}
                        {currentStep === 2 && <Step3Leadership
                            formData={formData} onChange={handleInputChange}
                            fieldsWithErrors={fieldsWithErrors}
                        />}
                        {currentStep === 3 && <Step5Operational
                            formData={formData} onChange={handleInputChange}
                            fieldsWithErrors={fieldsWithErrors}
                        />}
                        {currentStep === 4 && <Step6AISettings
                            formData={formData} onChange={handleInputChange}
                            fieldsWithErrors={fieldsWithErrors}
                        />}
                        {currentStep === 5 && <Step8Branding
                            formData={formData} onChange={handleInputChange}
                            fieldsWithErrors={fieldsWithErrors}
                        />}
                        {currentStep === 6 && <Step9Billing
                            formData={formData}
                            onChange={handleInputChange}
                            fieldsWithErrors={fieldsWithErrors}
                        />}
                        {currentStep === 7 && <Step10Subscription
                            formData={formData} onChange={handleInputChange}
                            fieldsWithErrors={fieldsWithErrors}
                        />}
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 px-8 py-6">
                    <div className="flex flex-col max-w-7xl mx-auto w-full space-y-6">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="terms"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] rounded focus:ring-[#00b4b8]"
                            />
                            <label htmlFor="terms" className="text-[14px] text-[#10141a]">
                                I hereby declared that all the information are correct
                            </label>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                onClick={handleCancel}
                                variant="outline"
                                className="bg-[#f04438] hover:bg-[#d63b2f] text-white border-none px-6 py-2 rounded-[60px] font-semibold text-[14px]"
                                disabled={isSaving}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={() => setShowSaveModal(true)}
                                variant="outline"
                                className="bg-[#B2B2B3] hover:bg-[#d0d0d0] text-[#10141a] border-none px-6 py-2 rounded-[60px] font-semibold text-[14px] flex items-center gap-2"
                                disabled={isSaving}
                            >
                                Save
                            </Button>
                            {currentStep > 1 && (
                                <Button
                                    type="button"
                                    onClick={handleBack}
                                    className="bg-[#808081] hover:bg-[#6a6a6b] text-white px-6 py-2 rounded-[60px] font-semibold text-[14px] flex items-center gap-2"
                                    disabled={isSaving}
                                >
                                    <ArrowLeft className="w-4 h-4"/>
                                    Back
                                </Button>
                            )}
                            {currentStep < STEPS.length ? (
                                <Button
                                    type="button"
                                    onClick={handleNext}
                                    className="bg-[#00b4b8] hover:bg-[#009da1] text-white px-6 py-2 rounded-[60px] font-semibold text-[14px] flex items-center gap-2"
                                    disabled={isSaving}
                                >
                                    Next
                                    <ArrowRight className="w-4 h-4"/>
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    onClick={handleSubmit}
                                    className="bg-[#00b4b8] hover:bg-[#009da1] text-white px-6 py-2 rounded-[60px] font-semibold text-[14px]"
                                    disabled={isSaving || !agreedToTerms}
                                >
                                    {isSaving ? "Creating..." : "Create Agency"}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <SaveDraftModal
                open={showSaveModal}
                onOpenChange={setShowSaveModal}
                onSave={handleSaveDraft}
            />
        </div>
    );
}