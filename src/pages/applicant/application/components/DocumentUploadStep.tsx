import { FileUpload } from "@/components/ui/file-upload";
import React, { useRef, useState, FormEvent, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  useGetEligibilityVerificationQuery,
  useSubmitDocumentUploadAndEligibilityVerificationMutation,
  useUploadDocumentMutation
} from "@/pages/applicant/application/api";
import { DocumentTypes, DocumentUploadAndEligibilityPayload } from "@/pages/applicant/application/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { SuccessDialog, SuccessDialogContent } from "@/components/ui/success-dialog";
import { getApplicationStatus } from "@/lib/api/job-application";
import { useAuth } from "@/utils/auth";
import { getApplicantDocs, type ApplicantType } from "@/pages/applicant/application/documentConfig";

interface DocumentUploadStepProps {
  onBack?: () => void;
  onNext?: () => void;
  onSuccess?: () => void;
}

export interface ApplicantDocumentFileUploadedInfo {
  fileName: string;
  fileUrl: string;
  fileType: string;
  expiryDate?: string;
}

const tenYearsFromNow = new Date()
tenYearsFromNow.setFullYear(new Date().getFullYear() + 10)

// Download metadata for the government-form (isForm) document blocks.
// Keyed by doc id; copy preserved verbatim from the original DSP markup.
const FORM_DOWNLOADS: Record<string, {
  downloadUrl: string;
  linkText: string;
  uploadHint: string;
  uploadName: string;
}> = {
  "i9-form": {
    downloadUrl: "https://drive.google.com/uc?export=download&id=1qOI9TiJrCTagScUNJBzHbNg8FJhpQH6N",
    linkText: " Click here to download I-9 form",
    uploadHint: "( Upload document below after filling the form)",
    uploadName: "upload-i-9-form",
  },
  "w4-form": {
    downloadUrl: "https://drive.google.com/uc?export=download&id=1MraR-6Wn9CwlsQPs-a-nG2AfavOj5fKF",
    linkText: "Click here to download W-4 forms",
    uploadHint: "(Upload document below after filling the form)",
    uploadName: "upload-w-4-form",
  },
};

export default function DocumentUploadStep({ onSuccess, onNext }: DocumentUploadStepProps) {
  const { user } = useAuth();
  const applicantType: ApplicantType = user?.applicantType === "hha" ? "hha" : "dsp";

  // All document definitions for this applicant type (single source of truth).
  const docDefs = getApplicantDocs(applicantType);
  // Documents rendered as upload cards in the main loop (excludes I-9/W-4 form blocks).
  const uploadDocs = docDefs.filter((def) => !def.isForm);
  // Government form definitions (I-9 / W-4) rendered with download links.
  const formDocs = docDefs.filter((def) => def.isForm);

  const [documentTypeUploading, setDocumentTypeUploading] = useState<DocumentTypes | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(false);
  const [openDatePopoverId, setOpenDatePopoverId] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [canGoToNextStage, setCanGoToNextStage] = useState(false);
  const [fileUploads, setFileUploads] = useState<ApplicantDocumentFileUploadedInfo[]>(docDefs.map((def) => ({
    fileName: "",
    fileUrl: "",
    fileType: def.id,
    expiryDate: undefined
  })));

  const [uploadFile, { isLoading }] = useUploadDocumentMutation();
  const { data: eligibilityVerificationData } = useGetEligibilityVerificationQuery(undefined);

  const [
    submitDocumentUploadAndEligibilityVerification,
    { isLoading: isSubmitting }
  ] = useSubmitDocumentUploadAndEligibilityVerificationMutation();

  const [references, setReferences] = useState<{
    name: string;
    relationship: string;
    phoneNumber: string;
    email: string;
  }[]>([
    {
      name: "",
      relationship: "",
      phoneNumber: "",
      email: ""
    },
    {
      name: "",
      relationship: "",
      phoneNumber: "",
      email: ""
    }
  ])

  const handleFileUpload = async (
    files: FileList | null,
    documentType: DocumentTypes
  ) => {
    try {
      if (!files) return;
      const file = files[0];
      const formData = new FormData();
      formData.append("file", file);
      setDocumentTypeUploading(documentType);
      const response = await uploadFile({
        data: formData,
        documentType
      }).unwrap();

      setFileUploads((prev) => [
        ...prev.filter((item) => item.fileType !== documentType),
        {
          fileName: response.data.fileName,
          fileUrl: response.data.url,
          fileType: documentType
        }
      ]);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).replace(/ /g, ' ');
  }

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    for (let i = 0; i < docDefs.length; i++) {
      const def = docDefs[i];
      if (def.requiresExpiry) {
        const findUpload = fileUploads.find((item) => item.fileType === def.id);
        if (findUpload?.fileUrl && !findUpload.expiryDate) {
          toast.error("Please select an expiry date for " + def.label);
          return;
        }
      }
    }

    const fileUploadsWithExpiryDateButNoFile = fileUploads.filter((item) => item.expiryDate && !item.fileUrl);

    if (fileUploadsWithExpiryDateButNoFile.length > 0) {
      const def = docDefs.find((item) => item.id === fileUploadsWithExpiryDateButNoFile[0].fileType);
      if (def) {
        toast.error("Please upload a file for " + def.label);
        return;
      }
    }

    const isReferenceIncomplete = references.some(
      (ref) =>
        !ref.name?.trim() ||
        !ref.relationship?.trim() ||
        !ref.phoneNumber?.trim() ||
        !ref.email?.trim(),
    );
    if (isReferenceIncomplete) {
      toast.error(
        "Please complete both professional references (name, relationship, phone number, and email).",
      );
      return;
    }

    if (!value) {
      toast.error("Please confirm the declaration that all information is correct.");
      return;
    }

    try {
      // Build the eligibility payload from the config defs (keyed by camelCase *Url field).
      const payloadData: Partial<DocumentUploadAndEligibilityPayload> = {};
      docDefs.forEach((def) => {
        (payloadData as Record<string, ApplicantDocumentFileUploadedInfo | undefined>)[def.field] =
          fileUploads.find((item) => item.fileType === def.id);
      });

      const response = await submitDocumentUploadAndEligibilityVerification({
        data: {
          ...payloadData,
          references,
          declarationAgreed: value
        },
        method: eligibilityVerificationData ? "PUT" : "POST"
      }).unwrap();

      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error("Error submitting document upload and eligibility verification:", error);
      const message =
        error?.data?.error ||
        error?.data?.message ||
        error?.message ||
        "Failed to save documents and references. Please try again.";
      toast.error(message);
    }
  };

  useEffect(() => {
    if (eligibilityVerificationData) {
      const payload = eligibilityVerificationData.data || {};
      setReferences((prev) =>
        Array.isArray(payload.references) ? payload.references : prev
      );
      setValue(Boolean(payload.declarationAgreed));

      const fileFieldToType: Record<string, string> = docDefs.reduce(
        (acc, def) => {
          acc[def.field] = def.id;
          return acc;
        },
        {} as Record<string, string>,
      );

      const normalizeExpiryDate = (value?: string) => {
        if (!value) return undefined;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : formatDate(date);
      };

      const preloaded: ApplicantDocumentFileUploadedInfo[] = Object.entries(fileFieldToType).reduce(
        (acc, [field, fileType]) => {
          const rawValue = payload[field as keyof typeof payload] as any;
          const fileEntry = Array.isArray(rawValue) ? rawValue[0] : rawValue;
          if (!fileEntry?.fileUrl) return acc;
          const split = String(fileEntry.fileUrl).split("/");
          acc.push({
            fileName: split[split.length - 1] || "",
            fileUrl: fileEntry.fileUrl,
            fileType: fileType as DocumentTypes,
            expiryDate: normalizeExpiryDate(fileEntry.expiryDate),
          });
          return acc;
        },
        [] as ApplicantDocumentFileUploadedInfo[],
      );

      setFileUploads(preloaded);
    }
  }, [eligibilityVerificationData]);

  useEffect(() => {
    const checkStage = async () => {
      try {
        const response = await getApplicationStatus();
        const currentStep = response?.status?.currentStep;
        const movedPastEligibility =
          currentStep === "compliance" ||
          currentStep === "review" ||
          currentStep === "orientation";
        setCanGoToNextStage(Boolean(movedPastEligibility));
      } catch (error) {
        setCanGoToNextStage(false);
      }
    };

    checkStage();
  }, []);

  return (
    <>
     <h2 className="mb-2 text-xl font-bold text-gray-900">
        Upload all required documents and add expiry date by picking a date on sections with an Expiry Date attached. 
        Once you have uploaded the documents, click the submit button to complete this stage.
      </h2>
    <form className={"w-full"} onSubmit={handleSubmit}>
      {uploadDocs.map((file, index) => {
        const fileUpload = fileUploads.find((item) => item.fileType === file.id);
        return (
          <div className={"mb-6"} key={file.id}>
            <div className={"flex justify-between items-center"}>
              <p className={"text-sm mb-2"}>{file.label}</p>
              {file.requiresExpiry && (
                <div className="flex items-center justify-center px-4 py-3">
                  <Popover
                    open={openDatePopoverId === String(index)}
                    onOpenChange={(open) => setOpenDatePopoverId(open ? String(index) : null)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center justify-center w-full h-full cursor-pointer focus:outline-none"
                      >
                        <span
                          className="flex items-center gap-2 text-[14px] font-normal leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]"
                        >
                          {fileUpload?.expiryDate
                            ? `Expiry Date (${fileUpload?.expiryDate})`
                            : "Expiry Date"
                          }
                          <CalendarDays className={"w-5 h-5"} />
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0 mt-3 bg-white border-none shadow-lg">
                      <Calendar
                        mode="single"
                        className="bg-white"
                        captionLayout="dropdown"
                        startMonth={new Date()}
                        endMonth={tenYearsFromNow}
                        selected={fileUpload?.expiryDate ? new Date(fileUpload?.expiryDate) : new Date()}
                        defaultMonth={new Date()}
                        disabled={{
                          before: new Date()
                        }}
                        onSelect={async (date) => {
                          if (date) {
                            setFileUploads((prev) => prev.map((item) => {
                              if (item.fileType === file.id) {
                                return {
                                  ...item,
                                  expiryDate: formatDate(date)
                                }
                              }
                              return item
                            }))
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
                        autoFocus={true}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
            <FileUpload
              name={file.id}
              className="h-[90px] w-full max-w-[100vw]"
              label={(isLoading && file.id === documentTypeUploading) ? "Uploading..." : file.placeholder}
              accept=".pdf, .jpg, .png, .webp"
              onChange={async (event) => {
                await handleFileUpload(event.target.files ?? null, file.id as DocumentTypes);
              }}
            />
            {fileUpload?.fileUrl && <FileNameCard fileUploads={fileUploads} documentType={file.id as DocumentTypes} />}
          </div>
        )
      })}
      {formDocs.map((formDoc) => {
        const meta = FORM_DOWNLOADS[formDoc.id];
        return (
          <div className={"mb-6"} key={formDoc.id}>
            <p className={"text-sm mb-2 flex items-center"}>
              <span className={"ml-1 flex items-center"}>
                <a href={meta.downloadUrl} className={"text-[#5993FF] font-extrabold"}>{meta.linkText}</a>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M15.4168 5.76152L5.34501 15.8334L4.1665 14.6549L14.2383 4.58301L15.4168 5.76152Z"
                    fill="#5993FF" />
                  <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M5.8335 4.16699H15.8335V14.167H14.1668V5.83366H5.8335V4.16699Z"
                    fill="#5993FF" />
                </svg>
              </span>
              <span>{meta.uploadHint}</span>
            </p>
            <FileUpload
              name={meta.uploadName}
              className="h-[90px] w-full max-w-[100vw]"
              label={(isLoading && formDoc.id === documentTypeUploading) ? "Uploading..." : formDoc.label}
              accept=".pdf, .jpg, .png, .webp"
              onChange={async (event) => {
                await handleFileUpload(event.target.files ?? null, formDoc.id);
              }}
            />
            <FileNameCard fileUploads={fileUploads} documentType={formDoc.id} />
          </div>
        );
      })}

      <div>
        <h3 className={"font-semibold mb-3"}>Provide Two Professional References: <p className={"text-sm text-[#00B4B8] text-bold"}>Note: Please provide valid email address for your references.</p></h3>
        
        {references.map((reference, index) => (
          <div key={index}>
            <p className={"font-semibold mb-2"}>Reference {index + 1}</p>
            <div className={"mb-5 grid lg:grid-cols-4 md:grid-cols-3 grid-cols-2 gap-2"}>
              <div>
                <label className={"text-sm mb-2"}>Name</label>
                <Input
                  type="text"
                  placeholder={"Enter name"}
                  className="w-full pr-10"
                  value={reference.name}
                  onChange={(e) => setReferences((prev) => {
                    const newReferences = [...prev];
                    newReferences[index] = {
                      ...newReferences[index],
                      name: e.target.value
                    };
                    return newReferences;
                  })}
                  required
                />
              </div>
              <div>
                <label className={"text-sm mb-2"}>Relationship</label>
                <Select
                  required
                  value={reference.relationship}
                  onValueChange={(value) => setReferences((prev) => {
                    const newReferences = [...prev];
                    newReferences[index] = {
                      ...newReferences[index],
                      relationship: value || reference.relationship
                    };
                    return newReferences;
                  })}>
                  <SelectTrigger className={"w-full"}>
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
                <label className={"text-sm mb-2"}>Phone Number</label>
                <Input
                  required
                  type="text"
                  placeholder={"Enter phone number"}
                  className="w-full pr-10"
                  value={reference.phoneNumber}
                  onChange={(e) => setReferences((prev) => {
                    const newReferences = [...prev];
                    newReferences[index] = {
                      ...newReferences[index],
                      phoneNumber: e.target.value
                    };
                    return newReferences;
                  })}
                />
              </div>
              <div>
                <label className={"text-sm mb-2"}>Email</label>
                <Input
                  type="email"
                  placeholder={"Enter email"}
                  className="w-full pr-10"
                  value={reference.email}
                  onChange={(e) => setReferences((prev) => {
                    const newReferences = [...prev];
                    newReferences[index] = {
                      ...newReferences[index],
                      email: e.target.value
                    };
                    return newReferences;
                  })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className={"mt-6"}>
        <Checkbox
          className={"border-[#808081] bg-transparent w-4 h-4 mr-2"}
          ref={ref}
          name={"declare"}
          checked={value}
          onChange={(event) => setValue(event.target.checked)}
          labelClassName={"text-[#808081] font-normal"}
          label="I hereby declared that all the information are correct"
          required={true}
        />
      </div>
      <div className="pb-6 mt-6">
        {canGoToNextStage ? (
          <Button
            type="button"
            onClick={() => onNext?.()}
            className={'bg-[#00B4B8] backdrop-blur-[22px] hover:bg-[#00B4B8] active:bg-[#b2b2b3]'}
          >
            <span>Next</span>
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 10H16M16 10L10 4M16 10L10 16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={isSubmitting}
            className={'bg-[#00B4B8] backdrop-blur-[22px] hover:bg-[#00B4B8] active:bg-[#b2b2b3]'}
          >
            <span>
              {isSubmitting ? 'Saving...' : 'Save Documents & References'}
            </span>
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 10H16M16 10L10 4M16 10L10 16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        )}
      </div>

    </form>
    <SuccessDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
      <SuccessDialogContent
        title="Documents Saved"
        description="Your documents and references were submitted successfully. Each document will be reviewed and accepted individually by your agency before you are moved to the next stage."
        buttonText="Okay"
        onButtonClick={() => setShowSuccessDialog(false)}
      />
    </SuccessDialog>
    </>
  );
}

export const FileNameCard = (
  { fileUploads, documentType }: {
    fileUploads: ApplicantDocumentFileUploadedInfo[];
    documentType: DocumentTypes;
  }
) => {
  const fileUploaded = fileUploads.find((item) => item.fileType === documentType);
  if (!fileUploaded) return null;
  return (
    <div className={"flex space-x-2 my-3 bg-[#00D84114] p-3 rounded"}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path opacity="0.4" d="M6.66675 5.83301H13.3334" stroke="#00944A" stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round" />
        <path opacity="0.4" d="M6.66675 9.16699H10.0001" stroke="#00944A" stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round" />
        <path
          d="M10.8333 17.917V17.5003C10.8333 15.1433 10.8333 13.9648 11.5655 13.2326C12.2978 12.5003 13.4763 12.5003 15.8333 12.5003H16.2499M16.6666 11.1196V8.33366C16.6666 5.19096 16.6666 3.61962 15.6903 2.6433C14.714 1.66699 13.1426 1.66699 9.99992 1.66699C6.85723 1.66699 5.28588 1.66699 4.30956 2.6433C3.33325 3.61961 3.33325 5.19096 3.33325 8.33366V12.1205C3.33325 14.8247 3.33325 16.1767 4.07164 17.0926C4.22082 17.2776 4.38934 17.4461 4.57436 17.5952C5.49018 18.3337 6.84227 18.3337 9.54642 18.3337C10.1344 18.3337 10.4283 18.3337 10.6976 18.2387C10.7536 18.2189 10.8084 18.1962 10.862 18.1706C11.1196 18.0473 11.3274 17.8395 11.7432 17.4237L15.6903 13.4767C16.172 12.9949 16.4128 12.7541 16.5398 12.4477C16.6666 12.1415 16.6666 11.8008 16.6666 11.1196Z"
          stroke="#00944A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span>{fileUploaded?.fileName}</span>
    </div>
  )
}