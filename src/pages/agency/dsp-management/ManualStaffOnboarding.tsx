import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUpload } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Radio } from "@/components/ui/radio";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { StageFooter } from "@/pages/shared/client-management/components/StageFooter";
import { useToast } from "@/hooks/use-toast";
import { Routes } from "@/routes/constants";
import { AlertCircle, CalendarDays, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { SuccessDialog, SuccessDialogContent } from "@/components/ui/success-dialog";
import { differenceInYears, subYears } from "date-fns";
import { checkEmailExists, uploadTempDocument, completeManualOnboarding } from "@/lib/api/manual-onboarding";

const STORAGE_KEY = "agencyManualStaffOnboarding";

const STEP_TITLES = [
  "Profile & Pre-Screening",
  "Document Upload & Eligibility Verification",
  "Staff Credentials Creation",
] as const;

const STEP_COUNT = STEP_TITLES.length;

const BOOLEAN_QUESTIONS = [
  { name: "isAdult", label: "Are you at least 18 years old?" },
  { name: "hasDiploma", label: "Do you have a High School Diploma or GED?" },
  { name: "eligibleToWork", label: "Are you legally eligible to work in the U.S.?" },
  { name: "hasDisqualifyingOffense", label: "Have you ever been convicted of a disqualifying offense under NJ law?" },
  { name: "hasTransportation", label: "Do you have reliable transportation? (Optional)" },
] as const;

const DOCUMENT_FIELDS = [
  { id: "photo-id", label: "Upload Photo ID (State ID, Passport)", placeholder: "Upload your photo ID", requiresExpiry: true, optional: false },
  { id: "driver-license", label: "Upload Driver's License (optional)", placeholder: "Upload your driver's license", requiresExpiry: true, optional: true },
  { id: "social-security-card", label: "Upload Social Security Card or valid work permit.", placeholder: "Upload your social security card", requiresExpiry: true, optional: false },
  { id: "diploma", label: "Upload High School Diploma/GED certificate.", placeholder: "Upload your high school certificate", requiresExpiry: false, optional: false },
  { id: "certifications", label: "Upload any relevant certifications (e.g., CPR, First Aid — optional at this stage).", placeholder: "Upload any certification", requiresExpiry: false, optional: true },
  { id: "hepatitis-b-vaccination", label: "Upload Hepatitis B vaccination series documents or chest x-ray.", placeholder: "Upload Hepatitis B vaccination series documents", requiresExpiry: false, optional: true },
  { id: "hepatitis-b-immunity", label: "Upload Hepatitis B immunity (titer result)", placeholder: "Upload Hepatitis B immunity result", requiresExpiry: false, optional: true },
  { id: "tb-test", label: "Upload TB test result.", placeholder: "Upload TB test result", requiresExpiry: false, optional: true },
] as const;

const DOC_TYPE_MAP: Record<string, string> = {
  "photo-id": "photoId",
  "driver-license": "driverLicense",
  "social-security-card": "socialSecurityCard",
  "diploma": "diploma",
  "certifications": "certifications",
  "hepatitis-b-vaccination": "hepatitisBVaccination",
  "hepatitis-b-immunity": "hepatitisBImmunity",
  "tb-test": "tbTest",
  "i9-form": "i9Form",
  "w4-form": "w4Form",
  "resume": "resume",
};

type BooleanQuestionName = (typeof BOOLEAN_QUESTIONS)[number]["name"];

type ProfilePreScreeningData = {
  fullName: string;
  email: string;
  dateOfBirth: string;
  address: string;
  gender: "Male" | "Female" | "";
  booleanQuestions: Record<BooleanQuestionName, "Yes" | "No" | "">;
  resumeFileName: string;
};

type DocumentUploadEntry = {
  fileType: string;
  fileName: string;
  url: string | null;
  expiryDate: string;
  optional: boolean;
};

type ReferenceData = {
  name: string;
  relationship: string;
  phoneNumber: string;
  email: string;
};

type ConditionalHireData = {
  authorizations: Record<string, boolean>;
  agreements: Record<string, boolean>;
};

const defaultProfileData: ProfilePreScreeningData = {
  fullName: "",
  email: "",
  dateOfBirth: "",
  address: "",
  gender: "",
  booleanQuestions: {
    isAdult: "Yes",
    hasDiploma: "",
    eligibleToWork: "",
    hasDisqualifyingOffense: "",
    hasTransportation: "",
  },
  resumeFileName: "",
};

const defaultDocumentUploads: DocumentUploadEntry[] = DOCUMENT_FIELDS.map((field) => ({
  fileType: field.id,
  fileName: "",
  url: null,
  expiryDate: "",
  optional: field.optional,
}));

const defaultReferences: ReferenceData[] = [
  { name: "", relationship: "", phoneNumber: "", email: "" },
  { name: "", relationship: "", phoneNumber: "", email: "" },
];

const defaultConditionalHireData: ConditionalHireData = {
  authorizations: {
    drugTest: false,
    fingerprint: false,
    centralRegistry: false,
    cariCheck: false,
    sexOffender: false,
    oigExclusion: false,
    healthTB: false,
    referenceChecks: false,
  },
  agreements: {
    abuseAwareness: false,
    hipaaConfidentiality: false,
    developmentalDisabilities: false,
  },
};

function generateRandomString(length: number) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+";
  const arr = new Uint32Array(length);
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(arr);
    return Array.from(arr).map((n) => charset[n % charset.length]).join("");
  }
  return Array.from({ length }, () => charset.charAt(Math.floor(Math.random() * charset.length))).join("");
}

function getInitialSessionKey(): string {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return saved.sessionKey || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export default function ManualStaffOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sessionKey] = useState(getInitialSessionKey);
  const [activeStep, setActiveStep] = useState(0);
  const [maxSavedStep, setMaxSavedStep] = useState(0);
  const [declared, setDeclared] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [profileData, setProfileData] = useState<ProfilePreScreeningData>(defaultProfileData);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [resumeIsUploading, setResumeIsUploading] = useState(false);

  const [documentUploads, setDocumentUploads] = useState<DocumentUploadEntry[]>(defaultDocumentUploads);
  const [uploadingDocTypes, setUploadingDocTypes] = useState<Set<string>>(new Set());

  const [i9FileName, setI9FileName] = useState("");
  const [i9Url, setI9Url] = useState<string | null>(null);
  const [i9IsUploading, setI9IsUploading] = useState(false);
  const [w4FileName, setW4FileName] = useState("");
  const [w4Url, setW4Url] = useState<string | null>(null);
  const [w4IsUploading, setW4IsUploading] = useState(false);

  const [openDatePopoverId, setOpenDatePopoverId] = useState<string | null>(null);
  const [references, setReferences] = useState<ReferenceData[]>(defaultReferences);
  const [conditionalHireData, setConditionalHireData] = useState<ConditionalHireData>(defaultConditionalHireData);
  const [orientationDeclaration, setOrientationDeclaration] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  type EmailCheckStatus = "idle" | "checking" | "taken" | "available";
  const [emailCheckStatus, setEmailCheckStatus] = useState<EmailCheckStatus>("idle");
  const emailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const tenYearsFromNow = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 10);
    return d;
  }, []);

  // Debounced email existence check
  useEffect(() => {
    const email = profileData.email.trim();
    const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);

    if (!email || !isValidFormat) {
      setEmailCheckStatus("idle");
      return;
    }

    setEmailCheckStatus("checking");
    emailDebounceRef.current = setTimeout(async () => {
      try {
        const exists = await checkEmailExists(email.toLowerCase());
        setEmailCheckStatus(exists ? "taken" : "available");
      } catch {
        setEmailCheckStatus("idle");
      }
    }, 600);

    return () => {
      if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
    };
  }, [profileData.email]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let loadedPassword = "";

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.activeStep !== undefined) setActiveStep(parsed.activeStep);
        if (parsed.maxSavedStep !== undefined) setMaxSavedStep(parsed.maxSavedStep);
        if (parsed.profileData) setProfileData(parsed.profileData);
        if (parsed.resumeUrl) setResumeUrl(parsed.resumeUrl);
        if (parsed.documentUploads) setDocumentUploads(parsed.documentUploads);
        if (parsed.i9FileName) setI9FileName(parsed.i9FileName);
        if (parsed.i9Url) setI9Url(parsed.i9Url);
        if (parsed.w4FileName) setW4FileName(parsed.w4FileName);
        if (parsed.w4Url) setW4Url(parsed.w4Url);
        if (parsed.references) setReferences(parsed.references);
        if (parsed.conditionalHireData) setConditionalHireData(parsed.conditionalHireData);
        if (parsed.orientationDeclaration) setOrientationDeclaration(parsed.orientationDeclaration);
        if (parsed.generatedPassword) {
          loadedPassword = parsed.generatedPassword;
          setGeneratedPassword(parsed.generatedPassword);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    if (!loadedPassword) {
      setGeneratedPassword(`P@ss${generateRandomString(8)}`);
    }
  }, []);

  // Reset declaration on step change
  useEffect(() => {
    setDeclared(false);
  }, [activeStep]);

  const persistToStorage = (overrides?: Record<string, unknown>) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sessionKey,
        activeStep,
        maxSavedStep,
        profileData,
        resumeUrl,
        documentUploads,
        i9FileName,
        i9Url,
        w4FileName,
        w4Url,
        references,
        conditionalHireData,
        orientationDeclaration,
        generatedPassword,
        ...overrides,
      }),
    );
  };

  const handlePrev = () => setActiveStep((prev) => Math.max(prev - 1, 0));
  const handleNext = () => setActiveStep((prev) => Math.min(prev + 1, STEP_COUNT - 1));

  // ===== FILE UPLOAD HANDLERS (immediate upload on selection) =====

  const handleResumeSelected = async (files: FileList | null) => {
    const file = files?.[0] ?? null;
    if (!file) return;
    setProfileData((prev) => ({ ...prev, resumeFileName: file.name }));
    setResumeUrl(null);
    setResumeIsUploading(true);
    try {
      const result = await uploadTempDocument(sessionKey, "resume", file);
      setResumeUrl(result.url);
    } catch {
      toast({ title: "Upload failed", description: "Failed to upload resume. Please try again.", variant: "destructive" });
      setProfileData((prev) => ({ ...prev, resumeFileName: "" }));
    } finally {
      setResumeIsUploading(false);
    }
  };

  const handleFileSelected = async (fileType: string, files: FileList | null) => {
    const file = files?.[0] ?? null;
    if (!file) return;
    setDocumentUploads((prev) =>
      prev.map((item) => item.fileType === fileType ? { ...item, fileName: file.name, url: null } : item)
    );
    setUploadingDocTypes((prev) => new Set([...prev, fileType]));
    try {
      const docType = DOC_TYPE_MAP[fileType] || fileType;
      const result = await uploadTempDocument(sessionKey, docType, file);
      setDocumentUploads((prev) =>
        prev.map((item) => item.fileType === fileType ? { ...item, url: result.url } : item)
      );
    } catch {
      toast({ title: "Upload failed", description: `Failed to upload document. Please try again.`, variant: "destructive" });
      setDocumentUploads((prev) =>
        prev.map((item) => item.fileType === fileType ? { ...item, fileName: "", url: null } : item)
      );
    } finally {
      setUploadingDocTypes((prev) => { const next = new Set(prev); next.delete(fileType); return next; });
    }
  };

  const handleI9FileSelected = async (files: FileList | null) => {
    const file = files?.[0] ?? null;
    if (!file) return;
    setI9FileName(file.name);
    setI9Url(null);
    setI9IsUploading(true);
    try {
      const result = await uploadTempDocument(sessionKey, "i9Form", file);
      setI9Url(result.url);
    } catch {
      toast({ title: "Upload failed", description: "Failed to upload I-9 form. Please try again.", variant: "destructive" });
      setI9FileName("");
    } finally {
      setI9IsUploading(false);
    }
  };

  const handleW4FileSelected = async (files: FileList | null) => {
    const file = files?.[0] ?? null;
    if (!file) return;
    setW4FileName(file.name);
    setW4Url(null);
    setW4IsUploading(true);
    try {
      const result = await uploadTempDocument(sessionKey, "w4Form", file);
      setW4Url(result.url);
    } catch {
      toast({ title: "Upload failed", description: "Failed to upload W-4 form. Please try again.", variant: "destructive" });
      setW4FileName("");
    } finally {
      setW4IsUploading(false);
    }
  };

  const handleGeneratePassword = () => {
    const newPwd = `P@ss${generateRandomString(8)}`;
    setGeneratedPassword(newPwd);
    setShowPassword(true);
    persistToStorage({ generatedPassword: newPwd });
  };

  // ===== VALIDATION =====

  const validateStep1 = (): string | null => {
    if (!profileData.fullName.trim()) return "Full name is required";
    if (!profileData.email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) return "Enter a valid email address";
    if (emailCheckStatus === "checking") return "Please wait — verifying email availability";
    if (emailCheckStatus === "taken") return "An account with this email already exists";
    if (!profileData.dateOfBirth) return "Date of birth is required";
    if (!profileData.address.trim()) return "Address is required";
    if (!profileData.gender) return "Gender is required";
    for (const q of BOOLEAN_QUESTIONS.slice(0, 4)) {
      if (!profileData.booleanQuestions[q.name]) return `Please answer: "${q.label}"`;
    }
    if (profileData.booleanQuestions.eligibleToWork === "No") {
      return "This applicant is not legally eligible to work in the U.S. and cannot be onboarded.";
    }
    if (profileData.booleanQuestions.hasDisqualifyingOffense === "Yes") {
      return "This applicant has a disqualifying offense under NJ law and cannot be onboarded.";
    }
    if (!generatedPassword || generatedPassword.length < 6) return "Password must be at least 6 characters";
    if (resumeIsUploading) return "Please wait for the resume upload to complete";
    return null;
  };

  const validateStep2 = (): string | null => {
    if (uploadingDocTypes.size > 0 || i9IsUploading || w4IsUploading) {
      return "Please wait for all file uploads to complete";
    }
    const requiredDocs = ["photo-id", "social-security-card", "diploma"];
    for (const docId of requiredDocs) {
      const entry = documentUploads.find((d) => d.fileType === docId);
      if (!entry?.url) {
        const field = DOCUMENT_FIELDS.find((f) => f.id === docId);
        return `Please upload: ${field?.label ?? docId}`;
      }
    }
    for (let i = 0; i < 2; i++) {
      const ref = references[i];
      if (!ref.name.trim() || !ref.relationship || !ref.phoneNumber.trim() || !ref.email.trim()) {
        return `Reference ${i + 1} is incomplete — name, relationship, phone, and email are required`;
      }
    }
    return null;
  };

  // Conditional hire / compliance step removed from agency flow

  // ===== SAVE HANDLER =====

  const handleSave = async () => {
    if (isSubmitting) return;

    if (activeStep === 0) {
      const err = validateStep1();
      if (err) { toast({ title: "Validation error", description: err, variant: "destructive" }); return; }
      const newMax = Math.max(maxSavedStep, 1);
      setMaxSavedStep(newMax);
      persistToStorage({ activeStep: 1, maxSavedStep: newMax });
      setActiveStep(1);
    } else if (activeStep === 1) {
      const err = validateStep2();
      if (err) { toast({ title: "Validation error", description: err, variant: "destructive" }); return; }
      const newMax = Math.max(maxSavedStep, 2);
      setMaxSavedStep(newMax);
      persistToStorage({ activeStep: 2, maxSavedStep: newMax });
      setActiveStep(2);
    } else if (activeStep === 2) {
      if (!orientationDeclaration) {
        toast({ title: "Validation error", description: "Please confirm credentials have been shared with the new staff member", variant: "destructive" });
        return;
      }

      setIsSubmitting(true);
      try {
        // Assemble all documents
        const docs: Record<string, { url: string | null; expiryDate: string }> = {};
        for (const entry of documentUploads) {
          const key = DOC_TYPE_MAP[entry.fileType];
          if (key && (entry.url || !entry.optional)) {
            docs[key] = { url: entry.url, expiryDate: entry.expiryDate };
          }
        }
        if (resumeUrl) docs.resume = { url: resumeUrl, expiryDate: "" };
        if (i9Url) docs.i9Form = { url: i9Url, expiryDate: "" };
        if (w4Url) docs.w4Form = { url: w4Url, expiryDate: "" };

        const newMax = Math.max(maxSavedStep, 3);
        setMaxSavedStep(newMax);
        persistToStorage({ activeStep: 2, maxSavedStep: newMax });

        await completeManualOnboarding({
          profile: {
            fullName: profileData.fullName.trim(),
            email: profileData.email.trim().toLowerCase(),
            password: generatedPassword,
            dateOfBirth: profileData.dateOfBirth,
            address: profileData.address.trim(),
            gender: profileData.gender,
            preScreeningAnswers: profileData.booleanQuestions as Record<string, string>,
          },
          documents: docs,
          references,
          compliance: {
            authorizations: conditionalHireData.authorizations,
            agreements: conditionalHireData.agreements,
          },
        });

        localStorage.removeItem(STORAGE_KEY);
        setShowSuccessDialog(true);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Failed to complete onboarding";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // ===== STEP CONTENT =====

  const stepComponents = [
    // Step 1: Profile & Pre-Screening
    <section key="profile" className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-[#10141a]">Profile & Pre-Screening</h2>
        <p className="text-sm text-[#808081] max-w-3xl">
          Collect applicant identity, contact, and eligibility details for staff onboarding.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Label htmlFor="full-name">Full Name</Label>
          <Input id="full-name" value={profileData.fullName} placeholder="Enter full name"
            onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })} />
        </div>
        <div className="space-y-4">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              value={profileData.email}
              placeholder="Enter email"
              className={cn(
                emailCheckStatus === "taken" && "border-red-500 focus-visible:ring-red-500",
                emailCheckStatus === "available" && "border-green-500 focus-visible:ring-green-500",
              )}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
            />
            {emailCheckStatus === "checking" && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#808081]" />
            )}
            {emailCheckStatus === "available" && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
            )}
            {emailCheckStatus === "taken" && (
              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
            )}
          </div>
          {emailCheckStatus === "taken" && (
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-red-600">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              An account with this email already exists
            </p>
          )}
          {emailCheckStatus === "available" && (
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-green-700">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Email is available
            </p>
          )}
        </div>
        <div className="space-y-4">
          <Label htmlFor="date-of-birth">Date of Birth</Label>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="w-full text-left">
                <div className="flex items-center gap-3 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3">
                  <span className="text-sm text-[#10141a]">{profileData.dateOfBirth || "Select date of birth"}</span>
                  <CalendarDays className="ml-auto h-5 w-5 text-[#808081]" />
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[100%] max-w-[350px] p-0">
              <Calendar mode="single" className="bg-white" captionLayout="dropdown"
                startMonth={new Date(1924, 0)} endMonth={subYears(new Date(), 18)}
                selected={profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : undefined}
                defaultMonth={profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : new Date()}
                onSelect={(date) => {
                  if (!date) return;
                  const age = differenceInYears(new Date(), date);
                  setProfileData((prev) => ({
                    ...prev,
                    dateOfBirth: date.toISOString().split("T")[0],
                    booleanQuestions: { ...prev.booleanQuestions, isAdult: age >= 18 ? "Yes" : "No" },
                  }));
                }}
                formatters={{ formatMonthDropdown: (d) => d.toLocaleString("default", { month: "long" }) }}
                classNames={{
                  dropdown_root: "relative border-none shadow-none has-focus:ring-0",
                  caption_label: "rounded-md pl-2 pr-2 flex items-center gap-1 text-sm h-8 [&>svg]:hidden",
                }}
                autoFocus={true} />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-4">
          <Label htmlFor="address">Address</Label>
          <Input id="address" value={profileData.address} placeholder="Enter address"
            onChange={(e) => setProfileData({ ...profileData, address: e.target.value })} />
        </div>
        <div className="space-y-4">
          <Label>Gender</Label>
          <div className="flex gap-4">
            <Radio id="gender-male" name="gender" value="Male" label="Male"
              checked={profileData.gender === "Male"}
              onChange={() => setProfileData({ ...profileData, gender: "Male" })} />
            <Radio id="gender-female" name="gender" value="Female" label="Female"
              checked={profileData.gender === "Female"}
              onChange={() => setProfileData({ ...profileData, gender: "Female" })} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {BOOLEAN_QUESTIONS.map((q) => (
          <div key={q.name} className="space-y-3 rounded-2xl border border-[#d9d9d9] bg-white p-4">
            <p className="text-sm font-medium text-[#10141a]">{q.label}</p>
            <div className="flex gap-3">
              <Radio id={`${q.name}-yes`} name={q.name} value="Yes" label="Yes"
                checked={profileData.booleanQuestions[q.name] === "Yes"}
                disabled={q.name === "isAdult"}
                onChange={() => setProfileData({ ...profileData, booleanQuestions: { ...profileData.booleanQuestions, [q.name]: "Yes" } })} />
              <Radio id={`${q.name}-no`} name={q.name} value="No" label="No"
                checked={profileData.booleanQuestions[q.name] === "No"}
                disabled={q.name === "isAdult"}
                onChange={() => setProfileData({ ...profileData, booleanQuestions: { ...profileData.booleanQuestions, [q.name]: "No" } })} />
            </div>
          </div>
        ))}
      </div>

      {profileData.booleanQuestions.eligibleToWork === "No" && (
        <div className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
          <p className="text-sm text-[#dc2626]">
            This applicant is not legally eligible to work in the U.S. and cannot be onboarded.
          </p>
        </div>
      )}
      {profileData.booleanQuestions.hasDisqualifyingOffense === "Yes" && (
        <div className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
          <p className="text-sm text-[#dc2626]">
            This applicant has a disqualifying offense under NJ law and cannot be onboarded.
          </p>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-[#d9d9d9] bg-white p-6">
        <p className="text-sm font-semibold text-[#10141a]">Upload Resume in PDF format (Optional)</p>
        <FileUpload
          label={profileData.resumeFileName || "Drag & drop your resume or browse files"}
          onFilesSelected={handleResumeSelected}
          accept=".pdf,.doc,.docx" />
        {resumeIsUploading && (
          <div className="flex items-center gap-2 text-sm text-[#808081]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading resume…
          </div>
        )}
        {resumeUrl && !resumeIsUploading && (
          <p className="text-sm text-[#0eaf52]">✓ Resume uploaded</p>
        )}
      </div>
    </section>,

    // Step 2: Document Upload & Eligibility Verification
    <section key="documents" className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-[#10141a]">Document Upload & Eligibility Verification</h2>
        <p className="text-sm text-[#808081] max-w-3xl">
          Upload all required documents and add expiry dates where applicable. Documents are saved as you select them.
        </p>
      </div>

      <div className="grid gap-6">
        {DOCUMENT_FIELDS.map((field) => {
          const upload = documentUploads.find((item) => item.fileType === field.id);
          const isUploading = uploadingDocTypes.has(field.id);
          return (
            <div key={field.id} className="rounded-2xl border border-[#d9d9d9] bg-white p-6">
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[#10141a]">{field.label}</p>
                    <p className="text-sm text-[#808081]">{field.placeholder}</p>
                  </div>
                  {field.requiresExpiry && (
                    <div className="flex items-center gap-2 rounded-2xl border border-[#e5e5e6] bg-[#fafafa] px-4 py-3">
                      <Popover
                        open={openDatePopoverId === field.id}
                        onOpenChange={(open) => setOpenDatePopoverId(open ? field.id : null)}>
                        <PopoverTrigger asChild>
                          <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-[#d9d9d9] bg-white px-4 py-3 text-sm text-[#10141a]">
                            <span>{upload?.expiryDate ? `Expiry Date (${upload.expiryDate})` : "Expiry Date"}</span>
                            <CalendarDays className="h-5 w-5 text-[#10141a]" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 mt-3 bg-white border-none shadow-lg">
                          <Calendar mode="single" className="bg-white" captionLayout="dropdown"
                            startMonth={new Date()} endMonth={tenYearsFromNow}
                            selected={upload?.expiryDate ? new Date(upload.expiryDate) : new Date()}
                            defaultMonth={new Date()} disabled={{ before: new Date() }}
                            onSelect={(date) => {
                              if (date) {
                                setDocumentUploads((prev) =>
                                  prev.map((item) =>
                                    item.fileType === field.id ? { ...item, expiryDate: formatDate(date) } : item
                                  )
                                );
                                setOpenDatePopoverId(null);
                              }
                            }}
                            formatters={{ formatMonthDropdown: (d) => d.toLocaleString("default", { month: "long" }) }}
                            classNames={{
                              dropdown_root: "relative border-none shadow-none has-focus:ring-0",
                              caption_label: "rounded-md pl-2 pr-2 flex items-center gap-1 text-sm h-8 [&>svg]:hidden",
                            }}
                            autoFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              </div>
              <FileUpload
                className="h-[90px] w-full max-w-[100vw]"
                label={upload?.url ? `✓ ${upload.fileName}` : (upload?.fileName || field.placeholder)}
                onFilesSelected={(files) => handleFileSelected(field.id, files)}
                accept=".pdf,.jpg,.png,.webp" />
              {isUploading && (
                <div className="mt-3 flex items-center gap-2 text-sm text-[#808081]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading…
                </div>
              )}
              {upload?.url && !isUploading && (
                <p className="mt-2 text-sm text-[#0eaf52]">✓ Uploaded successfully</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-6">
        <p className="flex items-center mb-2 text-sm">
          <span className="flex items-center ml-1">
            <a href="https://drive.google.com/uc?export=download&id=1qOI9TiJrCTagScUNJBzHbNg8FJhpQH6N" className="text-[#5993FF] font-extrabold">Click here to download I-9 form</a>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M15.4168 5.76152L5.34501 15.8334L4.1665 14.6549L14.2383 4.58301L15.4168 5.76152Z" fill="#5993FF" />
              <path fillRule="evenodd" clipRule="evenodd" d="M5.8335 4.16699H15.8335V14.167H14.1668V5.83366H5.8335V4.16699Z" fill="#5993FF" />
            </svg>
          </span>
          <span>( Upload document below after filling the form)</span>
        </p>
        <FileUpload
          name="upload-i-9-form" className="h-[90px] w-full max-w-[100vw]"
          label={i9Url ? `✓ ${i9FileName}` : (i9FileName || "Upload I-9 Form")}
          accept=".pdf,.jpg,.png,.webp"
          onFilesSelected={handleI9FileSelected} />
        {i9IsUploading && (
          <div className="mt-2 flex items-center gap-2 text-sm text-[#808081]">
            <Loader2 className="w-4 h-4 animate-spin" /> Uploading I-9…
          </div>
        )}
        {i9Url && !i9IsUploading && <p className="mt-2 text-sm text-[#0eaf52]">✓ I-9 uploaded</p>}
      </div>

      <div className="mb-6">
        <p className="flex items-center mb-2 text-sm">
          <span className="flex items-center ml-1">
            <a href="https://drive.google.com/uc?export=download&id=1MraR-6Wn9CwlsQPs-a-nG2AfavOj5fKF" className="text-[#5993FF] font-extrabold">Click here to download W-4 forms</a>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M15.4168 5.76152L5.34501 15.8334L4.1665 14.6549L14.2383 4.58301L15.4168 5.76152Z" fill="#5993FF" />
              <path fillRule="evenodd" clipRule="evenodd" d="M5.8335 4.16699H15.8335V14.167H14.1668V5.83366H5.8335V4.16699Z" fill="#5993FF" />
            </svg>
          </span>
          <span>(Upload document below after filling the form)</span>
        </p>
        <FileUpload
          name="upload-w-4-form" className="h-[90px] w-full max-w-[100vw]"
          label={w4Url ? `✓ ${w4FileName}` : (w4FileName || "Upload W-4 Form")}
          accept=".pdf,.jpg,.png,.webp"
          onFilesSelected={handleW4FileSelected} />
        {w4IsUploading && (
          <div className="mt-2 flex items-center gap-2 text-sm text-[#808081]">
            <Loader2 className="w-4 h-4 animate-spin" /> Uploading W-4…
          </div>
        )}
        {w4Url && !w4IsUploading && <p className="mt-2 text-sm text-[#0eaf52]">✓ W-4 uploaded</p>}
      </div>

      <div className="space-y-8 rounded-2xl border border-[#d9d9d9] bg-white p-6">
        <div>
          <h3 className="mb-3 text-lg font-semibold text-[#10141a]">Provide Two Professional References</h3>
          <p className="text-sm text-[#00b4b8]">Note: Please provide valid email address for your references.</p>
        </div>
        {references.map((ref, index) => (
          <div key={index} className="space-y-4 rounded-2xl border border-[#e5e5e6] bg-[#fafafa] p-4">
            <p className="font-semibold text-[#10141a]">Reference {index + 1}</p>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 text-sm">Name</label>
                <Input value={ref.name} placeholder="Enter name"
                  onChange={(e) => { const next = [...references]; next[index] = { ...next[index], name: e.target.value }; setReferences(next); }} />
              </div>
              <div>
                <label className="mb-2 text-sm">Relationship</label>
                <Select required value={ref.relationship}
                  onValueChange={(v) => { const next = [...references]; next[index] = { ...next[index], relationship: v }; setReferences(next); }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select Relationship" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="colleague">Colleague</SelectItem>
                    <SelectItem value="others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 text-sm">Phone Number</label>
                <Input value={ref.phoneNumber} placeholder="Enter phone number"
                  onChange={(e) => { const next = [...references]; next[index] = { ...next[index], phoneNumber: e.target.value }; setReferences(next); }} />
              </div>
              <div>
                <label className="mb-2 text-sm">Email</label>
                <Input type="email" value={ref.email} placeholder="Enter email"
                  onChange={(e) => { const next = [...references]; next[index] = { ...next[index], email: e.target.value }; setReferences(next); }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>,

    

    // Step 4: Staff Credentials
    <section key="orientation" className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-[#10141a]">Staff Credentials Creation</h2>
        <p className="text-sm text-[#808081] max-w-3xl">
          Review the login credentials below. The staff member's account will be created when you click "Complete Onboarding".
        </p>
      </div>

      <div className="rounded-2xl border border-[#d9d9d9] bg-white p-6 space-y-6">
        <div className="p-4 border rounded-2xl bg-amber-50 border-amber-200">
          <p className="text-sm font-medium text-amber-800">
            The account has not been created yet. Clicking "Complete Onboarding" below will create the account and finalize all records.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[#e5e5e6] bg-slate-50 p-4">
            <Label className="text-sm font-semibold text-[#10141a]">Email</Label>
            <Input type="email" value={profileData.email || ""} readOnly className="mt-2" />
          </div>

          <div className="rounded-2xl border border-[#e5e5e6] bg-slate-50 p-4 relative">
            <Label className="text-sm font-semibold text-[#10141a]">Password</Label>
            <Input
              type={showPassword ? "text" : "password"}
              value={generatedPassword}
              readOnly
              className="pr-12 mt-2" />
            <button type="button" onClick={() => setShowPassword((p) => !p)}
              className="absolute right-8 top-[56px] text-[#808081] hover:text-[#10141a]"
              aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={handleGeneratePassword}
              className="flex items-center justify-center px-3 py-2 rounded-lg border border-[#808081] text-sm font-medium text-[#10141a] hover:bg-[#f5f5f5]">
              Generate New Password
            </button>
          </div>

          <div className="rounded-2xl border border-[#d9d9d9] bg-white p-4">
            <div className="flex items-start gap-3">
              <Checkbox id="orientation-confirmation" checked={orientationDeclaration}
                onChange={(e) => setOrientationDeclaration(e.target.checked)} />
              <Label htmlFor="orientation-confirmation" className="text-sm text-[#808081] cursor-pointer">
                I confirm that I will share the generated login credentials with the new staff member after the account is created.
              </Label>
            </div>
          </div>
        </div>
      </div>
    </section>,
  ];

  const footer = (
    <StageFooter
      declared={declared}
      setDeclared={setDeclared}
      isFirst={activeStep === 0}
      isLast={true}
      onPrev={handlePrev}
      onNext={() => {}}
      onSave={handleSave}
      primaryLoading={isSubmitting}
      requireDeclaration={true}
      saveButtonText={activeStep === STEP_COUNT - 1 ? "Complete Onboarding" : "Save and continue"}
    />
  );

  return (
    <div className="min-h-screen">
      <div className="mb-[24px] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">Manual Staff Onboarding</h1>
        <div className="flex items-center gap-3">
          <Button type="button" onClick={() => navigate(Routes.agency.dspManagement)}>
            Back to DSP Management
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        <div className="rounded-[30px] border border-[#e5e5e6] bg-white p-6">
          <div className="mb-[28px] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-[24px] font-semibold text-[#10141a]">Onboarding Steps</h2>
              <p className="text-sm text-[#808081]">Complete each stage to onboard new staff into the agency.</p>
            </div>
          </div>

          <div className="mb-[24px] pb-0 overflow-x-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button type="button" onClick={handlePrev} disabled={activeStep === 0 || isSubmitting}>
                  Previous
                </Button>
                <Button type="button" onClick={handleNext}
                  disabled={activeStep >= maxSavedStep || activeStep === STEP_COUNT - 1 || isSubmitting}>
                  Next
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm text-[#808081]">Step {activeStep + 1} of {STEP_COUNT}</div>
                <div className="flex gap-2">
                  {STEP_TITLES.map((title, i) => (
                    <div key={title}
                      className={cn(
                        "h-2 rounded-full transition-all",
                        i === activeStep ? "w-8 bg-[#00b4b8]" : i < activeStep ? "w-4 bg-[#00b4b8]/50" : "w-4 bg-[#d9d9d9]"
                      )} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {STEP_TITLES.map((title, i) => (
                <div key={title} className={cn(
                  "text-xs px-3 py-1 rounded-full whitespace-nowrap",
                  i === activeStep ? "bg-[#00b4b8]/10 text-[#00b4b8] font-semibold" :
                  i < activeStep ? "bg-[#f0faf4] text-[#0eaf52]" : "bg-[#f5f5f5] text-[#808081]"
                )}>
                  {i < activeStep ? "✓ " : ""}{title}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#e5e5e6] bg-[#fcfcfd] p-6 shadow-[0_6px_40px_-12px_rgba(16,20,26,0.16)]">
            {stepComponents[activeStep]}
          </div>
        </div>

        {footer}
      </div>

      <SuccessDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <SuccessDialogContent
          title="Staff Onboarded Successfully"
          description={`${profileData.fullName} has been onboarded as a staff member. Their account is now active — share the login credentials with them so they can log in.`}
          buttonText="Done"
          onButtonClick={() => { setShowSuccessDialog(false); navigate(Routes.agency.dspManagement); }}
        />
      </SuccessDialog>
    </div>
  );
}
