import React, {useState, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {useToast} from "@/hooks/use-toast";
import {useNavigate, useLocation} from "react-router";
import {Routes} from "@/routes/constants";
import {ArrowRight, ArrowLeft, Bookmark, RefreshCw, Eye, EyeOff, Upload, Save} from "lucide-react";
import {useCreateAgencyWithUserMutation, useUploadAgencyFileMutation} from "./api";
import {UserType} from "@/utils/auth/types/user.types";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Toggle} from "@/components/ui/toggle";
import {SaveDraftModal} from "./SaveDraftModal";

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
  county: string;
  state: string;
  zipCode: string;
  mainPhone: string;
  supportEmail: string;
  websiteUrl: string;

  // Step 3: Leadership & Admin Contacts
  userName: string;
  userRole: string;
  accessLevel: string;
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
  numberOfDspSeats: string;
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
  defaultUserRoles: string[];
  permissionTemplates: boolean;
  twoFactorAuth: boolean;
  auditRetentionPeriod: string;
}

const STEPS = [
  {
    id: 1,
    title: "Agency Identity Information",
    description: "These fields uniquely identify the agency in the system."
  },
  {id: 2, title: "Contact Information", description: "Used for communication, verification, and notifications."},
  {id: 3, title: "Leadership & Admin Contacts", description: "Defines the default Super Admin for the agency."},
  {id: 4, title: "Service Configuration", description: "Used to auto-populate billing, scheduling, and EVV rules."},
  {id: 5, title: "Operational Settings", description: "Defines how the agency operates internally."},
  {id: 6, title: "AI Settings & Permissions", description: "What AI features are enabled for the agency."},
  {id: 7, title: "Document Requirements", description: "What documents DSPs must upload before being cleared."},
  {id: 8, title: "Branding Setup", description: "Aesthetic and identity settings."},
  {id: 9, title: "Billing Configuration", description: "Needed for Timesheets, Invoices, and Exports."},
  {
    id: 10,
    title: "Subscription & Licensing Setup",
    description: "Defines how the agency pays and what tier they belong to."
  },
  {id: 11, title: "Security & Compliance Settings", description: "Define user management and access levels."},
];

export default function AddAgencyWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [agencyId] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [isSaved, setIsSaved] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const {toast} = useToast();

  const [createAgencyWithUser, {isLoading: isCreating}] = useCreateAgencyWithUserMutation();
  const [uploadFile, {isLoading: isUploading}] = useUploadAgencyFileMutation();

  const isSaving = isCreating || isUploading || isSavingDraft;

  const [formData, setFormData] = useState<AgencyFormData>({
    agencyName: "",
    legalBusinessName: "",
    dba: "",
    agencyType: "",
    ein: "",
    npi: "",
    medicaidProviderId: "",
    primaryAddress: "",
    county: "",
    state: "",
    zipCode: "",
    mainPhone: "",
    supportEmail: "",
    websiteUrl: "",
    userName: "",
    userRole: "",
    accessLevel: "",
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
    numberOfDspSeats: "5",
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
    defaultUserRoles: [],
    permissionTemplates: false,
    twoFactorAuth: false,
    auditRetentionPeriod: "1",
  });

  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Load saved draft data if editing
  useEffect(() => {
    const savedData = location.state?.savedData;
    if (savedData) {
      setFormData(savedData.formData);
      setCurrentStep(savedData.currentStep || 1);
      setEditingDraftId(savedData.id);
      setIsSaved(true);
    }
  }, [location.state]);

  const handleInputChange = (field: keyof AgencyFormData, value: any) => {
    setFormData((prev) => ({...prev, [field]: value}));
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
            savedDate: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
            formData: formData,
            currentStep: currentStep,
          };
        }
      } else {
        // Create new draft
        const draftData = {
          id: Date.now().toString(),
          name: saveName,
          savedDate: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
          formData: formData,
          currentStep: currentStep,
        };
        existingDrafts.push(draftData);
        setEditingDraftId(draftData.id);
      }
      
      localStorage.setItem('agencyDrafts', JSON.stringify(existingDrafts));
      
      setIsSaved(true);
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

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
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
                    {currentStepData.id}. {currentStepData.title}
                  </p>
                  <p className="text-[14px] text-[#808081] mt-1">{currentStepData.description}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isSaved && (
                <div className="flex items-center gap-2 text-[#00b4b8]">
                  <Bookmark className="w-4 h-4 fill-current"/>
                  <span className="text-[14px] font-medium">Saved Agency</span>
                </div>
              )}
              <span className="text-[14px] text-black">Agency ID - {agencyId}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-7xl mx-auto">
            {currentStep === 1 && <Step1AgencyIdentity formData={formData} onChange={handleInputChange}/>}
            {currentStep === 2 && <Step2ContactInfo formData={formData} onChange={handleInputChange}/>}
            {currentStep === 3 && <Step3Leadership formData={formData} onChange={handleInputChange}/>}
            {currentStep === 4 && <Step4ServiceConfig formData={formData} onChange={handleInputChange}/>}
            {currentStep === 5 && <Step5Operational formData={formData} onChange={handleInputChange}/>}
            {currentStep === 6 && <Step6AISettings formData={formData} onChange={handleInputChange}/>}
            {currentStep === 7 && <Step7Documents formData={formData} onChange={handleInputChange}/>}
            {currentStep === 8 && <Step8Branding formData={formData} onChange={handleInputChange}/>}
            {currentStep === 9 && <Step9Billing formData={formData} onChange={handleInputChange}/>}
            {currentStep === 10 && <Step10Subscription formData={formData} onChange={handleInputChange}/>}
            {currentStep === 11 && <Step11Security formData={formData} onChange={handleInputChange}/>}
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

// Step Components
function Step1AgencyIdentity({formData, onChange}: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Agency Name */}
      <div>
        <Label htmlFor="agencyName" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Agency Name
        </Label>
        <Input
          id="agencyName"
          value={formData.agencyName}
          onChange={(e) => onChange("agencyName", e.target.value)}
          placeholder="Enter agency name"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>

      {/* Legal Business Name */}
      <div>
        <Label htmlFor="legalBusinessName" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Legal Business Name (if different)
        </Label>
        <Input
          id="legalBusinessName"
          value={formData.legalBusinessName}
          onChange={(e) => onChange("legalBusinessName", e.target.value)}
          placeholder="Enter legal business name"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>

      {/* DBA */}
      <div>
        <Label htmlFor="dba" className="mb-2 text-[14px] font-medium text-[#10141a]">
          DBA (Doing Business As)
        </Label>
        <Input
          id="dba"
          value={formData.dba}
          onChange={(e) => onChange("dba", e.target.value)}
          placeholder="Enter DBA"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>

      {/* Agency Type */}
      <div>
        <Label htmlFor="agencyType" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Agency Type
        </Label>
        <Select
          required
          value={formData.agencyType}
          onValueChange={(value) => onChange("agencyType", value)}
        >
          <SelectTrigger className={"w-full"}>
            <SelectValue placeholder="Select agency type"/>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="provider">Provider Agency</SelectItem>
            <SelectItem value="support_coordination">Support Coordination Agency</SelectItem>
            <SelectItem value="others">Others</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Agency EIN */}
      <div>
        <Label htmlFor="ein" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Agency EIN (Employer Identification Number)
        </Label>
        <Input
          id="ein"
          value={formData.ein}
          onChange={(e) => onChange("ein", e.target.value)}
          placeholder="Enter EIN"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>

      {/* NPI Number */}
      <div>
        <Label htmlFor="npi" className="mb-2 text-[14px] font-medium text-[#10141a]">
          NPI Number (if applicable)
        </Label>
        <Input
          id="npi"
          value={formData.npi}
          onChange={(e) => onChange("npi", e.target.value)}
          placeholder="Enter NPI"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>

      {/* Medicaid/CDD Provider ID */}
      <div>
        <Label htmlFor="medicaidProviderId" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Medicaid/CDD Provider ID
        </Label>
        <Input
          id="medicaidProviderId"
          value={formData.medicaidProviderId}
          onChange={(e) => onChange("medicaidProviderId", e.target.value)}
          placeholder="Enter DDD ID"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>
    </div>
  );
}

function Step2ContactInfo({formData, onChange}: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Primary Agency Address */}
      <div className="md:col-span-3">
        <Label htmlFor="primaryAddress" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Primary Agency Address
        </Label>
        <Input
          id="primaryAddress"
          value={formData.primaryAddress}
          onChange={(e) => onChange("primaryAddress", e.target.value)}
          placeholder="Enter primary address"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>

      {/* County / State */}
      <div>
        <Label htmlFor="county" className="mb-2 text-[14px] font-medium text-[#10141a]">
          County / State
        </Label>
        <Input
          id="county"
          value={formData.county}
          onChange={(e) => onChange("county", e.target.value)}
          placeholder="Enter County / State"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>

      {/* Zip Code */}
      <div>
        <Label htmlFor="zipCode" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Zip Code
        </Label>
        <Input
          id="zipCode"
          value={formData.zipCode}
          onChange={(e) => onChange("zipCode", e.target.value)}
          placeholder="Enter Zip Code"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>

      {/* Main Phone Number */}
      <div>
        <Label htmlFor="mainPhone" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Main Phone Number
        </Label>
        <Input
          id="mainPhone"
          value={formData.mainPhone}
          onChange={(e) => onChange("mainPhone", e.target.value)}
          placeholder="Enter Main Phone Number"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>

      {/* Support/Office Email */}
      <div>
        <Label htmlFor="supportEmail" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Support/Office Email
        </Label>
        <Input
          id="supportEmail"
          type="email"
          value={formData.supportEmail}
          onChange={(e) => onChange("supportEmail", e.target.value)}
          placeholder="Enter Support/Office Email"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>

      {/* Website URL (optional) */}
      <div>
        <Label htmlFor="websiteUrl" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Website URL (optional)
        </Label>
        <Input
          id="websiteUrl"
          value={formData.websiteUrl}
          onChange={(e) => onChange("websiteUrl", e.target.value)}
          placeholder="Enter Website URL"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>
    </div>
  );
}

function Step3Leadership({formData, onChange}: any) {
  const [showPassword, setShowPassword] = useState(false);
  const {toast} = useToast();

  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    onChange("userPassword", password);
    setShowPassword(true);
    toast({
      title: "Password Generated",
      description: "A secure password has been generated",
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* User Name */}
      <div>
        <Label htmlFor="userName" className="mb-2 text-[14px] font-medium text-[#10141a]">
          User Name
        </Label>
        <Input
          id="userName"
          value={formData.userName}
          onChange={(e) => onChange("userName", e.target.value)}
          placeholder="Enter user name"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>

      {/* Role */}
      <div>
        <Label htmlFor="userRole" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Role
        </Label>
        <Select
          value={formData.userRole}
          onValueChange={(value) => onChange("userRole", value)}
        >
          <SelectTrigger className={"w-full"}>
            <SelectValue placeholder="Select User"/>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Access Level */}
      <div>
        <Label htmlFor="accessLevel" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Access Level
        </Label>
        <Select
          required
          value={formData.accessLevel}
          onValueChange={(value) => onChange("accessLevel", value)}
        >
          <SelectTrigger className={"w-full"}>
            <SelectValue placeholder="Select Access Level"/>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full">Full Access</SelectItem>
            <SelectItem value="limited">Limited Access</SelectItem>
            <SelectItem value="read_only">Read Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Phone Number */}
      <div>
        <Label htmlFor="userPhone" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Phone Number
        </Label>
        <Input
          id="userPhone"
          value={formData.userPhone}
          onChange={(e) => onChange("userPhone", e.target.value)}
          placeholder="Enter Phone Number"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>

      {/* Email Address */}
      <div>
        <Label htmlFor="userEmail" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Email Address
        </Label>
        <Input
          id="userEmail"
          type="email"
          value={formData.userEmail}
          onChange={(e) => onChange("userEmail", e.target.value)}
          placeholder="Enter email"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>

      {/* Generate Password */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="userPassword" className="text-[14px] font-medium text-[#10141a]">
            Generate password
          </Label>
          <button
            type="button"
            onClick={generatePassword}
            className="flex items-center gap-2 text-[#00b4b8] hover:text-[#009da1] transition-colors"
          >
            <RefreshCw className="w-4 h-4"/>
          </button>
        </div>
        <div className="relative">
          <Input
            id="userPassword"
            type={showPassword ? "text" : "password"}
            value={formData.userPassword}
            onChange={(e) => onChange("userPassword", e.target.value)}
            placeholder="Generated password"
            className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8] pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#808081] hover:text-[#10141a]"
          >
            {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step4ServiceConfig({formData, onChange}: any) {
  const services = [
    "Services the Agency Provides",
    "Community Based Supports (CBS)",
    "Individual Supports (IS)",
    "Respite",
    "Community Inclusion",
    "Transportation",
    "Employment Services",
    "Service Codes Mapping (DDD service codes + rate structure)",
    "EVV Requirement Setting",
    "Which services require EVV",
    "Which are exempt",
    "Visit rules",
    "Minimum/maximum hours allowed",
  ];

  const toggleService = (service: string) => {
    const currentServices = formData.services || [];
    if (currentServices.includes(service)) {
      onChange("services", currentServices.filter((s: string) => s !== service));
    } else {
      onChange("services", [...currentServices, service]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[16px] font-semibold text-[#10141a] mb-4">Select the following services</h3>
        <div className="space-y-3">
          {services.map((service) => (
            <div key={service} className="flex items-start gap-3">
              <div className="flex items-center h-6">
                <input
                  type="checkbox"
                  id={service}
                  checked={(formData.services || []).includes(service)}
                  onChange={() => toggleService(service)}
                  className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] rounded focus:ring-[#00b4b8]"
                />
              </div>
              <label htmlFor={service} className="text-[14px] text-[#10141a] cursor-pointer flex-1">
                {service}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step5Operational({formData, onChange}: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Scheduling rules */}
      <div>
        <Label htmlFor="schedulingRules" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Scheduling rules
        </Label>
        <Input
          id="schedulingRules"
          value={formData.schedulingRules}
          onChange={(e) => onChange("schedulingRules", e.target.value)}
          placeholder="Enter scheduling rules"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>

      {/* Max shift per day */}
      <div>
        <Label htmlFor="maxShiftPerDay" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Max shift per day
        </Label>
        <Select
          value={formData.maxShiftPerDay}
          onValueChange={(value) => onChange("maxShiftPerDay", value)}
        >
          <SelectTrigger className={"w-full"}>
            <SelectValue placeholder="Select number of shift"/>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="15">15</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="30">30</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Travel time rules */}
      <div>
        <Label htmlFor="travelTimeRules" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Travel time rules
        </Label>
        <Input
          id="travelTimeRules"
          value={formData.travelTimeRules}
          onChange={(e) => onChange("travelTimeRules", e.target.value)}
          placeholder="Enter Travel time rules"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>

      {/* Mileage Settings */}
      <div>
        <Label htmlFor="mileageSettings" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Mileage Settings
        </Label>
        <Input
          id="mileageSettings"
          value={formData.mileageSettings}
          onChange={(e) => onChange("mileageSettings", e.target.value)}
          placeholder="Enter Mileage Settings"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>

      {/* Mileage rate */}
      <div>
        <Label htmlFor="mileageRate" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Mileage rate
        </Label>
        <Input
          id="mileageRate"
          type="number"
          step="0.01"
          value={formData.mileageRate}
          onChange={(e) => onChange("mileageRate", parseFloat(e.target.value))}
          placeholder="Enter Mileage rate"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>

      {/* Incident Reporting Settings */}
      <div>
        <Label htmlFor="incidentReportingSettings" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Incident Reporting Settings
        </Label>
        <Input
          id="incidentReportingSettings"
          value={formData.incidentReportingSettings}
          onChange={(e) => onChange("incidentReportingSettings", e.target.value)}
          placeholder="Enter Incident Reporting Settings"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>

      {/* Who receives notifications */}
      <div>
        <Label htmlFor="whoReceivesNotifications" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Who receives notifications
        </Label>
        <Select
          value={formData.whoReceivesNotifications}
          onValueChange={(value) => onChange("whoReceivesNotifications", value)}
        >
          <SelectTrigger className={"w-full"}>
            <SelectValue placeholder="Select role"/>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="supervisor">Supervisor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Expense Report Settings */}
      <div>
        <Label htmlFor="expenseReportSettings" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Expense Report Settings
        </Label>
        <Input
          id="expenseReportSettings"
          value={formData.expenseReportSettings}
          onChange={(e) => onChange("expenseReportSettings", e.target.value)}
          placeholder="Enter Expense Report Settings"
          className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
        />
      </div>

      {/* Allowed file types */}
      <div>
        <Label htmlFor="allowedFileTypes" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Allowed file types
        </Label>
        <Select
          value={formData.allowedFileTypes[0] || ""}
          onValueChange={(value) => onChange("allowedFileTypes", [value])}
        >
          <SelectTrigger className={"w-full"}>
            <SelectValue placeholder="Select file types"/>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={"pdf"}>pdf</SelectItem>
            <SelectItem value={"jpg"}>jpg</SelectItem>
            <SelectItem value={"png"}>png</SelectItem>
            <SelectItem value={"all"}>All of the above</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Allow recurring schedules? */}
      <div className="md:col-span-2">
        <Label className="mb-3 text-[14px] font-medium text-[#10141a] block">
          Allow recurring schedules?
        </Label>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="allowRecurringSchedules"
              checked={formData.allowRecurringSchedules === true}
              onChange={() => onChange("allowRecurringSchedules", true)}
              className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] focus:ring-[#00b4b8]"
            />
            <span className="text-[14px] text-[#10141a]">Yes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="allowRecurringSchedules"
              checked={formData.allowRecurringSchedules === false}
              onChange={() => onChange("allowRecurringSchedules", false)}
              className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] focus:ring-[#00b4b8]"
            />
            <span className="text-[14px] text-[#10141a]">No</span>
          </label>
        </div>
      </div>

      {/* Allow overlapping visits? */}
      <div className="md:col-span-2">
        <Label className="mb-3 text-[14px] font-medium text-[#10141a] block">
          Allow overlapping visits?
        </Label>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="allowOverlappingVisits"
              checked={formData.allowOverlappingVisits === true}
              onChange={() => onChange("allowOverlappingVisits", true)}
              className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] focus:ring-[#00b4b8]"
            />
            <span className="text-[14px] text-[#10141a]">Yes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="allowOverlappingVisits"
              checked={formData.allowOverlappingVisits === false}
              onChange={() => onChange("allowOverlappingVisits", false)}
              className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] focus:ring-[#00b4b8]"
            />
            <span className="text-[14px] text-[#10141a]">No</span>
          </label>
        </div>
      </div>

      {/* Do they offer mileage reimbursements? */}
      <div className="md:col-span-2">
        <Label className="mb-3 text-[14px] font-medium text-[#10141a] block">
          Do they offer mileage reimbursements?
        </Label>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="offerMileageReimbursements"
              checked={formData.offerMileageReimbursements === true}
              onChange={() => onChange("offerMileageReimbursements", true)}
              className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] focus:ring-[#00b4b8]"
            />
            <span className="text-[14px] text-[#10141a]">Yes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="offerMileageReimbursements"
              checked={formData.offerMileageReimbursements === false}
              onChange={() => onChange("offerMileageReimbursements", false)}
              className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] focus:ring-[#00b4b8]"
            />
            <span className="text-[14px] text-[#10141a]">No</span>
          </label>
        </div>
      </div>

      {/* Real-time GPS tracking */}
      <div className="md:col-span-2">
        <Label className="mb-3 text-[14px] font-medium text-[#10141a] block">
          Real-time GPS tracking
        </Label>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="realtimeGpsTracking"
              checked={formData.realtimeGpsTracking === true}
              onChange={() => onChange("realtimeGpsTracking", true)}
              className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] focus:ring-[#00b4b8]"
            />
            <span className="text-[14px] text-[#10141a]">Enable</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="realtimeGpsTracking"
              checked={formData.realtimeGpsTracking === false}
              onChange={() => onChange("realtimeGpsTracking", false)}
              className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] focus:ring-[#00b4b8]"
            />
            <span className="text-[14px] text-[#10141a]">Disable</span>
          </label>
        </div>
      </div>
    </div>
  );
}

function Step6AISettings({formData, onChange}: any) {
  const ToggleSwitch = ({checked, onChange}: { checked: boolean; onChange: () => void }) => (
    <Toggle
      className={"h-8 w-14"}
      pressed={checked}
      onPressedChange={onChange}
    />
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* AI Notes Review */}
        <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
          <Label className="text-[14px] font-medium text-[#10141a]">AI Notes Review</Label>
          <ToggleSwitch
            checked={formData.aiNotesReview}
            onChange={() => onChange("aiNotesReview", !formData.aiNotesReview)}
          />
        </div>

        {/* AI Plan of Care Builder */}
        <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
          <Label className="text-[14px] font-medium text-[#10141a]">AI Plan of Care Builder</Label>
          <ToggleSwitch
            checked={formData.aiPlanOfCareBuilder}
            onChange={() => onChange("aiPlanOfCareBuilder", !formData.aiPlanOfCareBuilder)}
          />
        </div>

        {/* AI Schedule Optimizer */}
        <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
          <Label className="text-[14px] font-medium text-[#10141a]">AI Schedule Optimizer</Label>
          <ToggleSwitch
            checked={formData.aiScheduleOptimizer}
            onChange={() => onChange("aiScheduleOptimizer", !formData.aiScheduleOptimizer)}
          />
        </div>

        {/* AI Data Cleaner & Compliance Alerts */}
        <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
          <Label className="text-[14px] font-medium text-[#10141a]">
            AI Data Cleaner & Compliance Alerts
          </Label>
          <ToggleSwitch
            checked={formData.aiDataCleaner}
            onChange={() => onChange("aiDataCleaner", !formData.aiDataCleaner)}
          />
        </div>

        {/* AI Billing Validator */}
        <div className="flex items-center justify-between py-3">
          <Label className="text-[14px] font-medium text-[#10141a]">AI Billing Validator</Label>
          <ToggleSwitch
            checked={formData.aiBillingValidator}
            onChange={() => onChange("aiBillingValidator", !formData.aiBillingValidator)}
          />
        </div>
      </div>
    </div>
  );
}

function Step7Documents({formData, onChange}: any) {
  const ToggleSwitch = ({checked, onChange}: { checked: boolean; onChange: () => void }) => (
    <Toggle
      className={"h-8 w-14"}
      pressed={checked}
      onPressedChange={onChange}
    />
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[16px] font-semibold text-[#10141a] mb-4">
          What documents DSPs must upload before being cleared
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* IDs */}
          <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
            <Label className="text-[14px] font-medium text-[#10141a]">IDs</Label>
            <ToggleSwitch
              checked={formData.requireIds}
              onChange={() => onChange("requireIds", !formData.requireIds)}
            />
          </div>

          {/* Clearances */}
          <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
            <Label className="text-[14px] font-medium text-[#10141a]">
              Clearances (background, drug test, fingerprint, etc.)
            </Label>
            <ToggleSwitch
              checked={formData.requireClearances}
              onChange={() => onChange("requireClearances", !formData.requireClearances)}
            />
          </div>

          {/* SSN */}
          <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
            <Label className="text-[14px] font-medium text-[#10141a]">SSN</Label>
            <ToggleSwitch
              checked={formData.requireSsn}
              onChange={() => onChange("requireSsn", !formData.requireSsn)}
            />
          </div>

          {/* Expiry rules */}
          <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
            <Label className="text-[14px] font-medium text-[#10141a]">
              Expiry rules (e.g., training expires annually)
            </Label>
            <ToggleSwitch
              checked={formData.expiryRules}
              onChange={() => onChange("expiryRules", !formData.expiryRules)}
            />
          </div>

          {/* Resume */}
          <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
            <Label className="text-[14px] font-medium text-[#10141a]">Resume</Label>
            <ToggleSwitch
              checked={formData.requireResume}
              onChange={() => onChange("requireResume", !formData.requireResume)}
            />
          </div>

          {/* Auto-reminder settings */}
          <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
            <Label className="text-[14px] font-medium text-[#10141a]">Auto-reminder settings</Label>
            <ToggleSwitch
              checked={formData.autoReminders}
              onChange={() => onChange("autoReminders", !formData.autoReminders)}
            />
          </div>

          {/* Certificates */}
          <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
            <Label className="text-[14px] font-medium text-[#10141a]">Certificates</Label>
            <ToggleSwitch
              checked={formData.requireCertificates}
              onChange={() => onChange("requireCertificates", !formData.requireCertificates)}
            />
          </div>

          {/* Reminder frequency */}
          <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
            <Label className="text-[14px] font-medium text-[#10141a]">Reminder frequency</Label>
            <ToggleSwitch
              checked={formData.reminderFrequency !== ""}
              onChange={() => onChange("reminderFrequency", formData.reminderFrequency ? "" : "monthly")}
            />
          </div>

          {/* Trainings */}
          <div className="flex items-center justify-between py-3">
            <Label className="text-[14px] font-medium text-[#10141a]">Trainings</Label>
            <ToggleSwitch
              checked={formData.requireTrainings}
              onChange={() => onChange("requireTrainings", !formData.requireTrainings)}
            />
          </div>

          {/* Who receives them */}
          <div className="flex items-center justify-between py-3">
            <Label className="text-[14px] font-medium text-[#10141a]">Who receives them</Label>
            <ToggleSwitch
              checked={formData.whoReceivesReminders !== ""}
              onChange={() => onChange("whoReceivesReminders", formData.whoReceivesReminders ? "" : "admin")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Step8Branding({formData, onChange}: any) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [letterheadPreview, setLetterheadPreview] = useState<string | null>(null);

  const predefinedColors = [
    "#D53411",
    "#D5B111",
    "#0EAF52",
    "#115CD5",
    "#11CBD5",
  ];

  const handleFileUpload = (field: "logo" | "letterhead", file: File | null) => {
    onChange(field, file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (field === "logo") {
          setLogoPreview(reader.result as string);
        } else {
          setLetterheadPreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    } else {
      if (field === "logo") {
        setLogoPreview(null);
      } else {
        setLetterheadPreview(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Logo */}
      <div>
        <Label className="mb-2 text-[14px] font-medium text-[#10141a] block">Upload Logo</Label>
        <div
          className="border-2 bg-white border border-[#e5e5e6] rounded-[12px] h-[71px] flex items-center justify-center hover:border-[#00b4b8] transition-colors cursor-pointer">
          <label htmlFor="logo-upload" className="flex items-center gap-2 cursor-pointer">
            <Upload className="w-5 h-5 text-[#808081]"/>
            <span className="text-[14px] text-[#808081]">
              {logoPreview ? "Change logo" : "Upload logo here"}
            </span>
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload("logo", e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>
        </div>
        {logoPreview && (
          <div className="mt-3">
            <img src={logoPreview} alt="Logo preview" className="h-16 object-contain"/>
          </div>
        )}
      </div>

      {/* Theme */}
      <div>
        <Label className="mb-2 text-[14px] font-medium text-[#10141a] block">Theme</Label>
        <div className="flex items-center gap-3">
          {predefinedColors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange("themeColor", color)}
              className={`w-6 h-6 rounded-full transition-all ${
                formData.themeColor === color ? "ring-2 ring-offset-2 ring-[#00b4b8]" : ""
              }`}
              style={{backgroundColor: color}}
            />
          ))}
          <div className="flex items-center gap-2 ml-2">
            <span className="text-[14px] text-[#808081]">Custom</span>
            <div className="relative">
              <input
                type="color"
                value={formData.themeColor}
                onChange={(e) => onChange("themeColor", e.target.value)}
                className="w-6 h-6 rounded-full cursor-pointer"
              />
              {!predefinedColors.includes(formData.themeColor) && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#00b4b8] rounded-full border-2 border-white"/>
              )}
            </div>
            <input
              type="text"
              value={formData.themeColor}
              onChange={(e) => onChange("themeColor", e.target.value)}
              placeholder="#000000"
              className="text-[14px] font-mono text-[#10141a] bg-white py-1 px-4 border border-[#e5e5e6] rounded focus:border-[#00b4b8] focus:ring-1 focus:ring-[#00b4b8] outline-none w-28"
            />
          </div>
        </div>
        <p className="text-[14px] text-[#808081] mt-2">Choose preferred theme for the app.</p>
      </div>

      {/* Letterhead / Footer for Reports */}
      <div>
        <Label className="mb-2 text-[14px] font-medium text-[#10141a] block">
          Letterhead / Footer for Reports
        </Label>
        <div
          className="border-2 bg-white border border-[#e5e5e6] rounded-[12px] h-[71px] flex items-center justify-center hover:border-[#00b4b8] transition-colors cursor-pointer">
          <label htmlFor="letterhead-upload" className="flex items-center gap-2 cursor-pointer">
            <Upload className="w-5 h-5 text-[#808081]"/>
            <span className="text-[14px] text-[#808081]">
              {letterheadPreview ? "Change letterhead" : "Upload here"}
            </span>
            <input
              id="letterhead-upload"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleFileUpload("letterhead", e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>
        </div>
        {letterheadPreview && (
          <div className="mt-3">
            <img src={letterheadPreview} alt="Letterhead preview" className="h-16 object-contain"/>
          </div>
        )}
      </div>
    </div>
  );
}

function Step9Billing({formData, onChange}: any) {
  return (
    <div className="space-y-6">
      {/* Billing Format, DDD format, HHA eXchange Format */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <Label htmlFor="billingFormat" className="mb-2 text-[14px] font-medium text-[#10141a]">
            Billing Format
          </Label>
          <Input
            id="billingFormat"
            value={formData.billingFormat}
            onChange={(e) => onChange("billingFormat", e.target.value)}
            placeholder="Enter Billing Format"
            className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
          />
        </div>

        <div>
          <Label htmlFor="dddFormat" className="mb-2 text-[14px] font-medium text-[#10141a]">
            DDD format
          </Label>
          <Input
            id="dddFormat"
            value={formData.dddFormat}
            onChange={(e) => onChange("dddFormat", e.target.value)}
            placeholder="Enter DDD format"
            className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
          />
        </div>

        <div>
          <Label htmlFor="hhaExchangeFormat" className="mb-2 text-[14px] font-medium text-[#10141a]">
            HHA eXchange Format
          </Label>
          <Input
            id="hhaExchangeFormat"
            value={formData.hhaExchangeFormat}
            onChange={(e) => onChange("hhaExchangeFormat", e.target.value)}
            placeholder="Enter HHA eXchange format"
            className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
          />
        </div>
      </div>

      {/* Allow custom report? */}
      <div>
        <Label className="mb-3 text-[14px] font-medium text-[#10141a] block">
          Allow custom report?
        </Label>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="allowCustomReport"
              checked={formData.allowCustomReport === true}
              onChange={() => onChange("allowCustomReport", true)}
              className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] focus:ring-[#00b4b8]"
            />
            <span className="text-[14px] text-[#10141a]">Yes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="allowCustomReport"
              checked={formData.allowCustomReport === false}
              onChange={() => onChange("allowCustomReport", false)}
              className="w-4 h-4 text-[#00b4b8] border-[#e5e5e6] focus:ring-[#00b4b8]"
            />
            <span className="text-[14px] text-[#10141a]">No</span>
          </label>
        </div>
      </div>

      {/* Invoice Contact */}
      <div>
        <h3 className="text-[16px] font-semibold text-[#10141a] mb-4">Invoice Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div>
            <Label htmlFor="invoiceName" className="mb-2 text-[14px] font-medium text-[#10141a]">
              Name
            </Label>
            <Input
              id="invoiceName"
              value={formData.invoiceName}
              onChange={(e) => onChange("invoiceName", e.target.value)}
              placeholder="Enter name"
              className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="invoiceEmail" className="mb-2 text-[14px] font-medium text-[#10141a]">
              Email
            </Label>
            <Input
              id="invoiceEmail"
              type="email"
              value={formData.invoiceEmail}
              onChange={(e) => onChange("invoiceEmail", e.target.value)}
              placeholder="Enter email"
              className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
            />
          </div>

          {/* Fax */}
          <div>
            <Label htmlFor="invoiceFax" className="mb-2 text-[14px] font-medium text-[#10141a]">
              Fax (some still use fax)
            </Label>
            <Input
              id="invoiceFax"
              value={formData.invoiceFax}
              onChange={(e) => onChange("invoiceFax", e.target.value)}
              placeholder="Enter fax"
              className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
            />
          </div>

          {/* Payroll System Integration */}
          <div>
            <Label htmlFor="payrollSystemIntegration" className="mb-2 text-[14px] font-medium text-[#10141a]">
              Payroll System Integration (optional)
            </Label>
            <Input
              id="payrollSystemIntegration"
              value={formData.payrollSystemIntegration}
              onChange={(e) => onChange("payrollSystemIntegration", e.target.value)}
              placeholder="Enter Payroll System Integration"
              className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
            />
          </div>

          {/* Quick Books */}
          <div>
            <Label htmlFor="quickBooks" className="mb-2 text-[14px] font-medium text-[#10141a]">
              Quick Books
            </Label>
            <Input
              id="quickBooks"
              value={formData.quickBooks}
              onChange={(e) => onChange("quickBooks", e.target.value)}
              placeholder="Enter QuickBooks"
              className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
            />
          </div>

          {/* ADP */}
          <div>
            <Label htmlFor="adp" className="mb-2 text-[14px] font-medium text-[#10141a]">
              ADP
            </Label>
            <Input
              id="adp"
              value={formData.adp}
              onChange={(e) => onChange("adp", e.target.value)}
              placeholder="Enter ADP"
              className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
            />
          </div>

          {/* Paycheck */}
          <div>
            <Label htmlFor="paycheck" className="mb-2 text-[14px] font-medium text-[#10141a]">
              Paycheck
            </Label>
            <Input
              id="paycheck"
              value={formData.paycheck}
              onChange={(e) => onChange("paycheck", e.target.value)}
              placeholder="Enter paycheck"
              className="h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Step10Subscription({formData, onChange}: any) {
  const tiers = [
    {id: "basic", label: "Basic"},
    {id: "professional", label: "Professional"},
    {id: "enterprise", label: "Enterprise (Multi-site)"},
  ];

  const addOns = ["All features", "EVV", "Payroll sync"];

  const toggleAddOn = (addOn: string) => {
    const currentAddOns = formData.addOns || [];
    if (currentAddOns.includes(addOn)) {
      onChange("addOns", currentAddOns.filter((a: string) => a !== addOn));
    } else {
      onChange("addOns", [...currentAddOns, addOn]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Subscription Tier */}
      <div>
        <Label className="mb-3 text-[14px] font-medium text-[#10141a] block">
          Subscription Tier
        </Label>
        <div className="flex items-center gap-3">
          {tiers.map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() => onChange("subscriptionTier", tier.id)}
              className={`px-6 py-2 rounded-[60px] text-[14px] font-medium transition-colors ${
                formData.subscriptionTier === tier.id
                  ? "bg-[#00b4b8] text-white"
                  : "bg-[#e5e5e6] text-[#10141a] hover:bg-[#d0d0d0]"
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      {/* Number of DSP seats */}
      <div>
        <Label htmlFor="numberOfDspSeats" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Number of DSP seats
        </Label>
        <Select
          value={formData.numberOfDspSeats}
          onValueChange={(value) => onChange("numberOfDspSeats", value)}
        >
          <SelectTrigger className={"w-full"}>
            <SelectValue placeholder="Select number"/>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={"5"}>5</SelectItem>
            <SelectItem value={"10"}>10</SelectItem>
            <SelectItem value={"15"}>15</SelectItem>
            <SelectItem value={"20"}>20</SelectItem>
            <SelectItem value={"25"}>25</SelectItem>
            <SelectItem value={"30"}>30</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Select Add-ons */}
      <div>
        <Label className="mb-3 text-[14px] font-medium text-[#10141a] block">Select Add-ons</Label>
        <div className="flex items-center gap-3">
          {addOns.map((addOn) => (
            <button
              key={addOn}
              type="button"
              onClick={() => toggleAddOn(addOn)}
              className={`px-6 py-2 rounded-[60px] text-[14px] font-medium transition-colors ${
                (formData.addOns || []).includes(addOn)
                  ? "bg-[#00b4b8] text-white"
                  : "bg-[#e5e5e6] text-[#10141a] hover:bg-[#d0d0d0]"
              }`}
            >
              {addOn}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step11Security({formData, onChange}: any) {
  const ToggleSwitch = ({checked, onChange}: { checked: boolean; onChange: () => void }) => (
    <Toggle
      className={"h-8 w-14"}
      pressed={checked}
      onPressedChange={onChange}
    />
  );

  const roles = ["Role", "Role", "Role", "Role", "Role", "Role"];

  const toggleRole = (role: string) => {
    const currentRoles = formData.defaultUserRoles || [];
    if (currentRoles.includes(role)) {
      onChange("defaultUserRoles", currentRoles.filter((r: string) => r !== role));
    } else {
      onChange("defaultUserRoles", [...currentRoles, role]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Default user roles */}
      <div>
        <Label className="mb-3 text-[14px] font-medium text-[#10141a] block">Default user roles</Label>
        <div className="flex flex-wrap gap-3">
          {roles.map((role, index) => (
            <button
              key={`${role}-${index}`}
              type="button"
              onClick={() => toggleRole(`${role}-${index}`)}
              className={`px-6 py-2 rounded-[60px] text-[14px] font-medium transition-colors ${
                (formData.defaultUserRoles || []).includes(`${role}-${index}`)
                  ? "bg-[#00b4b8] text-white"
                  : "bg-[#e5e5e6] text-[#10141a] hover:bg-[#d0d0d0]"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Permission Templates */}
      <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
        <Label className="text-[14px] font-medium text-[#10141a]">Permission Templates</Label>
        <ToggleSwitch
          checked={formData.permissionTemplates}
          onChange={() => onChange("permissionTemplates", !formData.permissionTemplates)}
        />
      </div>

      {/* Two-Factor Authentication Settings */}
      <div className="flex items-center justify-between py-3 border-b border-[#e5e5e6]">
        <Label className="text-[14px] font-medium text-[#10141a]">
          Two-Factor Authentication Settings
        </Label>
        <ToggleSwitch
          checked={formData.twoFactorAuth}
          onChange={() => onChange("twoFactorAuth", !formData.twoFactorAuth)}
        />
      </div>

      {/* Audit retention period */}
      <div>
        <Label htmlFor="auditRetentionPeriod" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Audit retention period
        </Label>
        <Select
          value={formData.auditRetentionPeriod}
          onValueChange={(value) => onChange("auditRetentionPeriod", value)}
        >
          <SelectTrigger className={"w-full"}>
            <SelectValue placeholder="Select time"/>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={"1"}>1 month</SelectItem>
            <SelectItem value={"2"}>2 months</SelectItem>
            <SelectItem value={"3"}>3 months</SelectItem>
            <SelectItem value={"6"}>6 months</SelectItem>
            <SelectItem value={"12"}>12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
