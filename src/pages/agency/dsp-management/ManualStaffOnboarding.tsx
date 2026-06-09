import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUpload } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Radio } from "@/components/ui/radio";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { StageFooter } from "@/pages/shared/client-management/components/StageFooter";
import { useToast } from "@/hooks/use-toast";
import { Routes } from "@/routes/constants";
import UserIcon from "@/assets/icons/user.svg?react";
import { CalendarDays, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { differenceInYears, subYears } from "date-fns";

const STEP_TITLES = [
  "Profile & Pre-Screening",
  "Document Upload & Eligibility Verification",
  "Conditional Hire & Compliance",
  "Official Hire & Orientation",
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
  {
    id: "photo-id",
    label: "Upload Photo ID (State ID, Passport)",
    placeholder: "Upload your photo ID",
    requiresExpiry: true,
    optional: false,
  },
  {
    id: "driver-license",
    label: "Upload Driver’s License (optional)",
    placeholder: "Upload your driver’s license",
    requiresExpiry: true,
    optional: true,
  },
  {
    id: "social-security-card",
    label: "Upload Social Security Card or valid work permit.",
    placeholder: "Upload your social security card",
    requiresExpiry: true,
    optional: false,
  },
  {
    id: "diploma",
    label: "Upload High School Diploma/GED certificate.",
    placeholder: "Upload your high school certificate",
    requiresExpiry: false,
    optional: false,
  },
  {
    id: "certifications",
    label: "Upload any relevant certifications (e.g., CPR, First Aid — optional at this stage).",
    placeholder: "Upload any certification",
    requiresExpiry: false,
    optional: true,
  },
  {
    id: "hepatitis-b-vaccination",
    label: "Upload Hepatitis B vaccination series documents or chest x-ray.",
    placeholder: "Upload Hepatitis B vaccination series documents",
    requiresExpiry: false,
    optional: true,
  },
  {
    id: "hepatitis-b-immunity",
    label: "Upload Hepatitis B immunity (titer result)",
    placeholder: "Upload Hepatitis B immunity result",
    requiresExpiry: false,
    optional: true,
  },
  {
    id: "tb-test",
    label: "Upload TB test result.",
    placeholder: "Upload TB test result",
    requiresExpiry: false,
    optional: true,
  },
] as const;

type BooleanQuestionName = (typeof BOOLEAN_QUESTIONS)[number]["name"];

type ProfilePreScreeningData = {
  fullName: string;
  email: string;
  dateOfBirth: string;
  address: string;
  gender: "Male" | "Female" | "";
  booleanQuestions: Record<BooleanQuestionName, "Yes" | "No" | "">;
  resumeFile: File | null;
  declaration: boolean;
};

type DocumentUploadEntry = {
  fileType: string;
  file: File | null;
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
  informationCorrect: boolean;
};

type OrientationData = {
  declaration: boolean;
};

const defaultProfileData: ProfilePreScreeningData = {
  fullName: "",
  email: "",
  dateOfBirth: "",
  address: "",
  gender: "",
  booleanQuestions: {
    isAdult: "",
    hasDiploma: "",
    eligibleToWork: "",
    hasDisqualifyingOffense: "",
    hasTransportation: "",
  },
  resumeFile: null,
  declaration: false,
};

const defaultDocumentUploads: DocumentUploadEntry[] = DOCUMENT_FIELDS.map((field) => ({
  fileType: field.id,
  file: null,
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
  informationCorrect: false,
};

const defaultOrientationData: OrientationData = {
  declaration: false,
};

function StatusBadge({ status }: { status: "confirmed" | "pending" }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[100px] items-center justify-center gap-[4px] rounded-full border px-3 py-2 text-[13px] font-semibold",
        status === "confirmed"
          ? "bg-[#f0faf4] border-[#00b4b8] text-[#0eaf52]"
          : "bg-[#f5f5f5] border-[#d9d9d9] text-[#808081]"
      )}
    >
      {status === "confirmed" ? "Confirmed" : "Pending"}
    </span>
  );
}

function TimelineIndicator({ status, isLast }: { status: "confirmed" | "pending"; isLast: boolean }) {
  return (
    <div className="relative flex h-full w-[12px] flex-col items-center px-0">
      <div className={cn("h-[12px] w-[12px] rounded-full", status === "confirmed" ? "bg-[#00b4b8]" : "bg-[#d9d9d9]")}></div>
      {!isLast && <div className={cn("absolute top-[14px] h-[85px] w-[3px]", status === "confirmed" ? "bg-[#00b4b8]" : "bg-[#d9d9d9]")}></div>}
    </div>
  );
}

export default function ManualStaffOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState(0);
  const [declared, setDeclared] = useState(false);
  const [profileData, setProfileData] = useState<ProfilePreScreeningData>(defaultProfileData);
  const [documentUploads, setDocumentUploads] = useState<DocumentUploadEntry[]>(defaultDocumentUploads);
  const [i9File, setI9File] = useState<File | null>(null);
  const [w4File, setW4File] = useState<File | null>(null);
  const [openDatePopoverId, setOpenDatePopoverId] = useState<string | null>(null);
  const [references, setReferences] = useState<ReferenceData[]>(defaultReferences);
  const [conditionalHireData, setConditionalHireData] = useState<ConditionalHireData>(defaultConditionalHireData);
  const [orientationData, setOrientationData] = useState<OrientationData>(defaultOrientationData);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  

  const formatDate = (date: Date) =>
    date
      .toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
      .replace(/ /g, " ");

  const tenYearsFromNow = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 10);
    return date;
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("agencyManualStaffOnboarding");
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      if (parsed.activeStep !== undefined) {
        setActiveStep(parsed.activeStep);
      }
      if (parsed.profileData) {
        setProfileData(parsed.profileData);
      }
      if (parsed.documentUploads) {
        setDocumentUploads(parsed.documentUploads);
      }
      if (parsed.references) {
        setReferences(parsed.references);
      }
      if (parsed.conditionalHireData) {
        setConditionalHireData(parsed.conditionalHireData);
      }
      if (parsed.orientationData) {
        setOrientationData(parsed.orientationData);
      }
      if (parsed.generatedPassword) {
        setGeneratedPassword(parsed.generatedPassword);
      }
    } catch {
      localStorage.removeItem("agencyManualStaffOnboarding");
    }
  }, []);

  useEffect(() => {
    setDeclared(false);
  }, [activeStep]);

  const steps = useMemo(
    () =>
      STEP_TITLES.map((title, index) => ({
        title,
        status: index <= activeStep ? "complete" : "pending",
      })),
    [activeStep]
  );

  const handleSave = () => {
    localStorage.setItem(
      "agencyManualStaffOnboarding",
      JSON.stringify({
        activeStep,
        profileData,
        documentUploads,
        references,
        conditionalHireData,
        orientationData,
        generatedPassword,
      })
    );

    toast({
      title: "Progress saved",
      description: "Your onboarding progress has been saved locally.",
      variant: "success",
    });
    if (activeStep === STEP_COUNT - 1) {
      setShowSuccessDialog(true);
    }
  };

  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, STEP_COUNT - 1));
  };

  const handlePrev = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleFileSelected = (fileType: string, files: FileList | null) => {
    setDocumentUploads((prev) =>
      prev.map((item) =>
        item.fileType === fileType
          ? { ...item, file: files?.[0] ?? null }
          : item
      )
    );
  };

  const generateRandomString = (length: number) => {
    const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+";
    const arr = new Uint32Array(length);
    if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(arr);
      return Array.from(arr)
        .map((n) => charset[n % charset.length])
        .join("");
    }
    return Array.from({ length }, () => charset.charAt(Math.floor(Math.random() * charset.length))).join("");
  };

  const ensureCredentials = () => {
    if (!generatedPassword) {
      setGeneratedPassword(`P@ss${generateRandomString(8)}`);
    }
  };

  const handleGeneratePassword = () => {
    setGeneratedPassword(`P@ss${generateRandomString(8)}`);
    setShowPassword(true);
  };

  useEffect(() => {
    if (activeStep === STEP_COUNT - 1) {
      ensureCredentials();
    }
  }, [activeStep]);

  const stepComponents = [
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
          <Input
            id="full-name"
            value={profileData.fullName}
            placeholder="Enter full name"
            onChange={(event) => setProfileData({ ...profileData, fullName: event.target.value })}
          />
        </div>

        <div className="space-y-4">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={profileData.email}
            placeholder="Enter your email"
            onChange={(event) => setProfileData({ ...profileData, email: event.target.value })}
          />
        </div>

        <div className="space-y-4">
          <Label htmlFor="date-of-birth">Date of Birth</Label>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="w-full text-left">
                <div className="flex items-center gap-3 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3">
                  <span className="text-sm text-[#10141a]">
                    {profileData.dateOfBirth || "Select date of birth"}
                  </span>
                  <CalendarDays className="ml-auto h-5 w-5 text-[#808081]" />
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[100%] max-w-[350px] p-0">
              <Calendar
                mode="single"
                className="bg-white"
                captionLayout="dropdown"
                startMonth={new Date(1924, 0)}
                endMonth={subYears(new Date(), 18)}
                selected={profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : undefined}
                defaultMonth={profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : new Date()}
                onSelect={(date) => {
                  if (!date) return;
                  const nextDate = date.toISOString().split("T")[0];
                  const age = differenceInYears(new Date(), date);
                  setProfileData((prev) => ({
                    ...prev,
                    dateOfBirth: nextDate,
                    booleanQuestions: {
                      ...prev.booleanQuestions,
                      isAdult: age >= 18 ? "Yes" : "No",
                    },
                  }));
                }}
                formatters={{
                  formatMonthDropdown: (date) =>
                    date.toLocaleString("default", { month: "long" }),
                }}
                classNames={{
                  dropdown_root: "relative border-none shadow-none has-focus:ring-0",
                  caption_label: "rounded-md pl-2 pr-2 flex items-center gap-1 text-sm h-8 [&>svg]:hidden",
                }}
                autoFocus={true}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-4">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={profileData.address}
            placeholder="Enter address"
            onChange={(event) => setProfileData({ ...profileData, address: event.target.value })}
          />
        </div>

        <div className="space-y-4">
          <Label>Gender</Label>
          <div className="flex gap-4">
            <Radio
              id="gender-male"
              name="gender"
              value="Male"
              label="Male"
              checked={profileData.gender === "Male"}
              onChange={() => setProfileData({ ...profileData, gender: "Male" })}
            />
            <Radio
              id="gender-female"
              name="gender"
              value="Female"
              label="Female"
              checked={profileData.gender === "Female"}
              onChange={() => setProfileData({ ...profileData, gender: "Female" })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {BOOLEAN_QUESTIONS.map((question) => (
          <div key={question.name} className="space-y-3 rounded-2xl border border-[#d9d9d9] bg-white p-4">
            <p className="text-sm font-medium text-[#10141a]">{question.label}</p>
            <div className="flex gap-3">
              <Radio
                id={`${question.name}-yes`}
                name={question.name}
                value="Yes"
                label="Yes"
                checked={profileData.booleanQuestions[question.name] === "Yes"}
                onChange={() => setProfileData({
                  ...profileData,
                  booleanQuestions: { ...profileData.booleanQuestions, [question.name]: "Yes" },
                })}
              />
              <Radio
                id={`${question.name}-no`}
                name={question.name}
                value="No"
                label="No"
                checked={profileData.booleanQuestions[question.name] === "No"}
                onChange={() => setProfileData({
                  ...profileData,
                  booleanQuestions: { ...profileData.booleanQuestions, [question.name]: "No" },
                })}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-2xl border border-[#d9d9d9] bg-white p-6">
        <p className="text-sm font-semibold text-[#10141a]">Upload Resume in PDF format (Optional)</p>
        <FileUpload
          label={profileData.resumeFile ? profileData.resumeFile.name : "Drag & drop your resume or browse files"}
          onFilesSelected={(files) => setProfileData({
            ...profileData,
            resumeFile: files?.[0] ?? null,
          })}
          accept=".pdf,.doc,.docx"
        />
      </div>
    </section>,
    // Document Upload & Eligibility Verification
    <section key="documents" className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-[#10141a]">Document Upload & Eligibility Verification</h2>
        <p className="text-sm text-[#808081] max-w-3xl">
          Upload all required documents and add expiry date by picking a date on sections with an Expiry Date attached. Once you have uploaded the documents, click the submit button to complete this stage.
        </p>
      </div>

      <div className="grid gap-6">
        {DOCUMENT_FIELDS.map((field) => {
          const upload = documentUploads.find((item) => item.fileType === field.id);
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
                        onOpenChange={(open) => setOpenDatePopoverId(open ? field.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-xl border border-[#d9d9d9] bg-white px-4 py-3 text-sm text-[#10141a]"
                          >
                            <span>
                              {upload?.expiryDate
                                ? `Expiry Date (${upload.expiryDate})`
                                : "Expiry Date"}
                            </span>
                            <CalendarDays className="h-5 w-5 text-[#10141a]" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 mt-3 bg-white border-none shadow-lg">
                          <Calendar
                            mode="single"
                            className="bg-white"
                            captionLayout="dropdown"
                            startMonth={new Date()}
                            endMonth={tenYearsFromNow}
                            selected={upload?.expiryDate ? new Date(upload.expiryDate) : new Date()}
                            defaultMonth={new Date()}
                            disabled={{ before: new Date() }}
                            onSelect={(date) => {
                              if (date) {
                                setDocumentUploads((prev) =>
                                  prev.map((item) =>
                                    item.fileType === field.id
                                      ? { ...item, expiryDate: formatDate(date) }
                                      : item
                                  )
                                );
                                setOpenDatePopoverId(null);
                              }
                            }}
                            formatters={{
                              formatMonthDropdown: (date) =>
                                date.toLocaleString("default", { month: "long" }),
                            }}
                            classNames={{
                              dropdown_root: "relative border-none shadow-none has-focus:ring-0",
                              caption_label: "rounded-md pl-2 pr-2 flex items-center gap-1 text-sm h-8 [&>svg]:hidden",
                            }}
                            autoFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
              </div>

              <FileUpload
                className="h-[90px] w-full max-w-[100vw]"
                label={upload?.file?.name ?? field.placeholder}
                onFilesSelected={(files) => handleFileSelected(field.id, files)}
                accept=".pdf, .jpg, .png, .webp"
              />
              {upload?.file && (
                <div className="mt-3 rounded-2xl border border-[#e5e5e6] bg-[#fafafa] p-4">
                  <p className="text-sm font-medium text-[#10141a]">Selected file</p>
                  <p className="text-sm text-[#808081]">{upload.file.name}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-6">
        <p className="flex items-center mb-2 text-sm">
          <span className="flex items-center ml-1">
            <a href="https://drive.google.com/uc?export=download&id=1qOI9TiJrCTagScUNJBzHbNg8FJhpQH6N" className={"text-[#5993FF] font-extrabold"}> Click here to download I-9 form</a>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M15.4168 5.76152L5.34501 15.8334L4.1665 14.6549L14.2383 4.58301L15.4168 5.76152Z"
                fill="#5993FF" />
              <path fillRule="evenodd" clipRule="evenodd"
                d="M5.8335 4.16699H15.8335V14.167H14.1668V5.83366H5.8335V4.16699Z"
                fill="#5993FF" />
            </svg>
          </span>
          <span>( Upload document below after filling the form)</span>
        </p>
        <FileUpload
          name="upload-i-9-form"
          className="h-[90px] w-full max-w-[100vw]"
          label={i9File ? i9File.name : "Upload I-9 Form"}
          accept=".pdf, .jpg, .png, .webp"
          onFilesSelected={(files) => setI9File(files?.[0] ?? null)}
        />
      </div>
      <div className="mb-6">
        <p className="flex items-center mb-2 text-sm">
          <span className="flex items-center ml-1">
            <a href="https://drive.google.com/uc?export=download&id=1MraR-6Wn9CwlsQPs-a-nG2AfavOj5fKF" className={"text-[#5993FF] font-extrabold"}>Click here to download W-4 forms</a>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M15.4168 5.76152L5.34501 15.8334L4.1665 14.6549L14.2383 4.58301L15.4168 5.76152Z"
                fill="#5993FF" />
              <path fillRule="evenodd" clipRule="evenodd"
                d="M5.8335 4.16699H15.8335V14.167H14.1668V5.83366H5.8335V4.16699Z"
                fill="#5993FF" />
            </svg>
          </span>
          <span>(Upload document below after filling the form)</span>
        </p>
        <FileUpload
          name="upload-w-4-form"
          className="h-[90px] w-full max-w-[100vw]"
          label={w4File ? w4File.name : "Upload W-4 Form"}
          accept=".pdf, .jpg, .png, .webp"
          onFilesSelected={(files) => setW4File(files?.[0] ?? null)}
        />
      </div>

      <div className="space-y-8 rounded-2xl border border-[#d9d9d9] bg-white p-6">
        <div>
          <h3 className="mb-3 text-lg font-semibold text-[#10141a]">Provide Two Professional References</h3>
          <p className="text-sm text-[#00b4b8]">Note: Please provide valid email address for your references.</p>
        </div>
        {references.map((reference, index) => (
          <div key={index} className="space-y-4 rounded-2xl border border-[#e5e5e6] bg-[#fafafa] p-4">
            <p className="font-semibold text-[#10141a]">Reference {index + 1}</p>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 text-sm">Name</label>
                <Input
                  value={reference.name}
                  placeholder="Enter name"
                  onChange={(event) => {
                    const next = [...references];
                    next[index] = { ...next[index], name: event.target.value };
                    setReferences(next);
                  }}
                />
              </div>
              <div>
                <label className="mb-2 text-sm">Relationship</label>
                <Select
                  required
                  value={reference.relationship}
                  onValueChange={(value: string) => {
                    const next = [...references];
                    next[index] = { ...next[index], relationship: value };
                    setReferences(next);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Relationship" />
                  </SelectTrigger>
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
                <Input
                  value={reference.phoneNumber}
                  placeholder="Enter phone number"
                  onChange={(event) => {
                    const next = [...references];
                    next[index] = { ...next[index], phoneNumber: event.target.value };
                    setReferences(next);
                  }}
                />
              </div>
              <div>
                <label className="mb-2 text-sm">Email</label>
                <Input
                  type="email"
                  value={reference.email}
                  placeholder="Enter email"
                  onChange={(event) => {
                    const next = [...references];
                    next[index] = { ...next[index], email: event.target.value };
                    setReferences(next);
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>,

    <section key="conditional" className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-[#10141a]">Conditional Hire & Compliance</h2>
        <p className="text-sm text-[#808081] max-w-3xl">
          Toggle all required authorizations and agreements to move the candidate to the next step.
        </p>
      </div>

      <div className="space-y-6 rounded-2xl border border-[#d9d9d9] bg-white p-6">
        {(
          [
            { label: "Authorize Drug test appointment", key: "drugTest" },
            { label: "Authorize Fingerprint appointment", key: "fingerprint" },
            { label: "Authorize Central Registry Check (Developmental Disabilities Abuse/Neglect Registry)", key: "centralRegistry" },
            { label: "Authorize CARI Check (Child Abuse Record Information, DCF)", key: "cariCheck" },
            { label: "Authorize Sex Offender Registry Check (Megan's Law)", key: "sexOffender" },
            { label: "Authorize OIG Exclusion List Check (LEIE)", key: "oigExclusion" },
            { label: "Authorize Health & TB Screening", key: "healthTB" },
            { label: "Authorize Reference Checks (Minimum 2, Non-Family)", key: "referenceChecks" },
          ] as const
        ).map((item) => (
          <div key={item.key} className="flex items-center justify-between border-b border-[#e5e5e6] py-4 last:border-b-0">
            <p className="text-sm text-[#10141a]">{item.label}</p>
            <Toggle
              pressed={conditionalHireData.authorizations[item.key]}
              onPressedChange={(pressed) =>
                setConditionalHireData({
                  ...conditionalHireData,
                  authorizations: {
                    ...conditionalHireData.authorizations,
                    [item.key]: pressed,
                  },
                })
              }
            />
          </div>
        ))}
      </div>

      <div className="space-y-6 rounded-2xl border border-[#d9d9d9] bg-white p-6">
        {(
          [
            { label: "I accept the terms and condition for Abuse, Neglect, and Exploitation Awareness", key: "abuseAwareness" },
            { label: "I accept the terms and condition for HIPAA & Confidentiality", key: "hipaaConfidentiality" },
            { label: "I accept the terms and condition for Overview of Developmental Disabilities", key: "developmentalDisabilities" },
          ] as const
        ).map((item) => (
          <div key={item.key} className="flex items-start gap-3">
            <Checkbox
              id={item.key}
              checked={conditionalHireData.agreements[item.key]}
              onChange={() =>
                setConditionalHireData({
                  ...conditionalHireData,
                  agreements: {
                    ...conditionalHireData.agreements,
                    [item.key]: !conditionalHireData.agreements[item.key],
                  },
                })
              }
            />
            <Label htmlFor={item.key} className="text-sm text-[#808081] cursor-pointer">
              {item.label}
            </Label>
          </div>
        ))}
      </div>
    </section>,

    <section key="orientation" className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-[#10141a]">Official Hire & Orientation</h2>
        <p className="text-sm text-[#808081] max-w-3xl">
          Complete the hire process and share secure login credentials with the new staff member.
        </p>
      </div>

      <div className="rounded-2xl border border-[#d9d9d9] bg-white p-6 space-y-6">
        <p className="text-sm text-[#10141a]">
          Your candidate is ready for onboarding. Use the credentials below to set up their staff access.
        </p>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[#e5e5e6] bg-slate-50 p-4">
            <Label htmlFor="official-hire-email" className="text-sm font-semibold text-[#10141a]">
              Email
            </Label>
            <Input
              id="official-hire-email"
              type="email"
              value={profileData.email || ""}
              readOnly
              className="mt-2"
            />
          </div>

          <div className="rounded-2xl border border-[#e5e5e6] bg-slate-50 p-4 relative">
            <Label htmlFor="official-hire-password" className="text-sm font-semibold text-[#10141a]">
              Password
            </Label>
            <Input
              id="official-hire-password"
              type={showPassword ? "text" : "password"}
              value={generatedPassword}
              readOnly
              className="pr-12 mt-2"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-8 top-[56px] text-[#808081] hover:text-[#10141a]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="flex items-center justify-center px-3 py-2 rounded-lg border border-[#808081] text-sm font-medium text-[#10141a] hover:bg-[#f5f5f5]"
            >
              Generate Password
            </button>
          </div>

          <div className="rounded-2xl border border-[#d9d9d9] bg-white p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="orientation-confirmation"
                checked={orientationData.declaration}
                onChange={(event) => setOrientationData({ ...orientationData, declaration: event.target.checked })}
              />
              <Label htmlFor="orientation-confirmation" className="text-sm text-[#808081] cursor-pointer">
                I confirm that I have shared the generated login credentials with the new staff member.
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
      isLast={activeStep === STEP_COUNT - 1}
      onPrev={handlePrev}
      onNext={handleNext}
      onSave={handleSave}
      primaryLoading={false}
      requireDeclaration={true}
      saveButtonText="Save and continue"
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
              <p className="text-sm text-[#808081]">Complete each stage to manage new staff onboarding in the agency panel.</p>
            </div>
          </div>

          <div className="mb-[24px] pb-0 overflow-x-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button type="button" onClick={handlePrev} disabled={activeStep === 0}>
                  Previous
                </Button>
                <Button type="button" onClick={handleNext} disabled={activeStep === STEP_COUNT - 1}>
                  Next
                </Button>
              </div>
              <div className="text-sm text-[#808081]">Step {activeStep + 1} of {STEP_COUNT}</div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#e5e5e6] bg-[#fcfcfd] p-6 shadow-[0_6px_40px_-12px_rgba(16,20,26,0.16)]">
            {stepComponents[activeStep]}
          </div>
        </div>

        {footer}
      </div>
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Staff onboarded</DialogTitle>
            <DialogDescription>
              The staff member has been successfully onboarded. You can share the credentials with the staff member.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex items-center justify-end gap-3">
              <Button
                onClick={() => {
                  setShowSuccessDialog(false);
                  navigate(Routes.agency.dspManagement);
                }}
              >
                Done
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
