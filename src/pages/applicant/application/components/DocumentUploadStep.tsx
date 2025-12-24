import {FileUpload} from "@/components/ui/file-upload";
import React, {useRef, useState, FormEvent, useEffect} from "react";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Checkbox} from "@/components/ui/checkbox";
import {Button} from "@/components/ui/button";
import {
  useGetEligibilityVerificationQuery,
  useSubmitDocumentUploadAndEligibilityVerificationMutation,
  useUploadDocumentMutation
} from "@/pages/applicant/application/api";
import {DocumentTypes} from "@/pages/applicant/application/types";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Calendar} from "@/components/ui/calendar";
import {CalendarDays} from "lucide-react";
import {toast} from "sonner";

interface DocumentUploadStepProps {
  onBack?: () => void;
  onNext?: () => void;
}

export interface ApplicantDocumentFileUploadedInfo {
  fileName: string;
  fileUrl: string;
  fileType: string;
  expiryDate?: string;
}

const files = [
  {
    id: "photo-id",
    label: "Upload Photo ID (Driver’s License, State ID, Passport)",
    placeholder: "Upload your photo ID",
    requiresExpiry: true
  },
  {
    id: "social-security-card",
    label: "Upload Social Security Card or valid work permit.",
    placeholder: "Upload social security card",
    requiresExpiry: true
  },
  {
    id: "diploma",
    label: "Upload High School Diploma/GED certificate.",
    placeholder: "Upload high school certificate",
    requiresExpiry: true
  },
  {
    id: "certifications",
    label: "Upload Any relevant certifications (e.g., CPR, First Aid — optional at this stage).",
    placeholder: "Upload any certificate",
    requiresExpiry: false
  },
  {
    id: "hepatitis-b-vaccination",
    label: "Upload Hepatitis B vaccination series documents.",
    placeholder: "Upload Hepatitis B vaccination series documents.",
    requiresExpiry: false
  },
  {
    id: "hepatitis-b-immunity",
    label: "Upload Hepatitis B immunity (titer result)",
    placeholder: "Upload Hepatitis B immunity (titer result)",
    requiresExpiry: false
  },
  {
    id: "tb-test",
    label: "Upload tb test result.",
    placeholder: "Upload TB test result",
    requiresExpiry: false
  }
]

const tenYearsFromNow = new Date()
tenYearsFromNow.setFullYear(new Date().getFullYear() + 10)

export default function DocumentUploadStep({onNext}: DocumentUploadStepProps) {
  const [documentTypeUploading, setDocumentTypeUploading] = useState<DocumentTypes | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(false);
  const [openDatePopoverId, setOpenDatePopoverId] = useState<string | null>(null);
  const [fileUploads, setFileUploads] = useState<ApplicantDocumentFileUploadedInfo[]>(files.map((file) => ({
    fileName: "",
    fileUrl: "",
    fileType: file.id,
    expiryDate: undefined
  })));

  const [uploadFile, {isLoading}] = useUploadDocumentMutation();
  const {data: eligibilityVerificationData} = useGetEligibilityVerificationQuery(undefined, {
    refetchOnMountOrArgChange: true
  });

  const [
    submitDocumentUploadAndEligibilityVerification,
    {isLoading: isSubmitting}
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

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.requiresExpiry) {
        const findUpload = fileUploads.find((item) => item.fileType === file.id);
        if (findUpload?.fileUrl && !findUpload.expiryDate) {
          toast.error("Please select an expiry date for " + file.label);
          return;
        }
      }
    }

    const fileUploadsWithExpiryDateButNoFile = fileUploads.filter((item) => item.expiryDate && !item.fileUrl);

    if (fileUploadsWithExpiryDateButNoFile.length > 0) {
      const file = files.find((item) => item.id === fileUploadsWithExpiryDateButNoFile[0].fileType);
      if (file) {
        toast.error("Please upload a file for " + file.label);
        return;
      }
    }

    try {
      const response = await submitDocumentUploadAndEligibilityVerification({
        data: {
          photoIdUrl: fileUploads.find((item) => item.fileType === "photo-id"),
          socialSecurityCardUrl: fileUploads.find((item) => item.fileType === "social-security-card"),
          diplomaUrl: fileUploads.find((item) => item.fileType === "diploma"),
          certificationsUrl: fileUploads.find((item) => item.fileType === "certifications"),
          hepatitisBVaccinationUrl: fileUploads.find((item) => item.fileType === "hepatitis-b-vaccination"),
          hepatitisBImmunityUrl: fileUploads.find((item) => item.fileType === "hepatitis-b-immunity"),
          tbTestResultUrl: fileUploads.find((item) => item.fileType === "tb-test"),
          i9FormUrl: fileUploads.find((item) => item.fileType === "i9-form"),
          w4FormUrl: fileUploads.find((item) => item.fileType === "w4-form"),
          references,
          declarationAgreed: value
        },
        method: eligibilityVerificationData ? "PUT" : "POST"
      }).unwrap();
      console.log(response);
      onNext?.();
    } catch (error) {
      console.error("Error submitting document upload and eligibility verification:", error);
    }
  };

  useEffect(() => {
    if (eligibilityVerificationData) {
      setReferences(eligibilityVerificationData.data.references);
      setValue(eligibilityVerificationData.data.declarationAgreed);
      const fileKeys = [
        "photoIdUrl",
        "socialSecurityCardUrl",
        "diplomaUrl",
        "certificationsUrl",
        "hepatitisBVaccinationUrl",
        "hepatitisBImmunityUrl",
        "tbTestResultUrl",
        "i9FormUrl",
        "w4FormUrl"
      ]
      const fileKeysIds = {
        "photoIdUrl": "photo-id",
        "socialSecurityCardUrl": "social-security-card",
        "diplomaUrl": "diploma",
        "certificationsUrl": "certifications",
        "hepatitisBVaccinationUrl": "hepatitis-b-vaccination",
        "hepatitisBImmunityUrl": "hepatitis-b-immunity",
        "tbTestResultUrl": "tb-test",
        "i9FormUrl": "i9-form",
        "w4FormUrl": "w4-form"
      }
      setFileUploads(Object.entries(eligibilityVerificationData.data).filter(([key, value]) => fileKeys.includes(key) && value).map(([key, value]) => {
        const splittedFileUrl = value?.fileUrl ? value.fileUrl?.split("/") : []
        return {
          fileName: splittedFileUrl[splittedFileUrl.length - 1],
          fileUrl: value.fileUrl,
          fileType: fileKeysIds[key as keyof typeof fileKeysIds] as DocumentTypes,
          expiryDate: value.expiryDate
        }
      }))
    }
  }, [eligibilityVerificationData]);

  return (
    <form className={"w-full"} onSubmit={handleSubmit}>
      {files.map((file, index) => {
        const fileUpload = fileUploads.find((item) => item.fileType === file.id);
        return (
          <div className={"mb-6"} key={index}>
            <div className={"flex justify-between items-center"}>
              <p className={"text-sm mb-2"}>{file.label}</p>
              {file.requiresExpiry && (
                <div className="px-4 py-3 flex items-center justify-center">
                  <Popover
                    open={openDatePopoverId === String(index)}
                    onOpenChange={(open) => setOpenDatePopoverId(open ? String(index) : null)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full h-full flex items-center justify-center focus:outline-none cursor-pointer"
                      >
                          <span
                            className="flex items-center gap-2 text-[14px] font-normal leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]"
                          >
                            {fileUpload?.expiryDate
                              ? `Expiry Date (${fileUpload?.expiryDate})`
                              : "Expiry Date"
                            }
                            <CalendarDays className={"w-5 h-5"}/>
                          </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="mt-3 w-auto border-none bg-white p-0 shadow-lg">
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
                            date.toLocaleString("default", {month: "long"}),
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
            {fileUpload?.fileUrl && <FileNameCard fileUploads={fileUploads} documentType={file.id as DocumentTypes}/>}
          </div>
        )
      })}
      <div className={"mb-6"}>
        <p className={"text-sm mb-2 flex items-center"}>
          <span>Upload document</span>
          <span className={"ml-1 flex items-center"}>
            <span className={"text-[#5993FF]"}>I-9 form</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M15.4168 5.76152L5.34501 15.8334L4.1665 14.6549L14.2383 4.58301L15.4168 5.76152Z"
                    fill="#5993FF"/>
              <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M5.8335 4.16699H15.8335V14.167H14.1668V5.83366H5.8335V4.16699Z"
                    fill="#5993FF"/>
              </svg>
          </span>
          <span>(Download the form, after filling up the form, You need to upload the form here)</span>
        </p>
        <FileUpload
          name={"upload-i-9-form"}
          className="h-[90px] w-full max-w-[100vw]"
          label={(isLoading && "i9-form" === documentTypeUploading) ? "Uploading..." : "Upload I-9 Form"}
          accept=".pdf, .jpg, .png, .webp"
          onChange={async (event) => {
            await handleFileUpload(event.target.files ?? null, "i9-form");
          }}
        />
        <FileNameCard fileUploads={fileUploads} documentType={"i9-form" as DocumentTypes}/>
      </div>
      <div className={"mb-6"}>
        <p className={"text-sm mb-2 flex items-center"}>
          <span>Upload document</span>
          <span className={"ml-1 flex items-center"}>
            <span className={"text-[#5993FF]"}>W-4 forms</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M15.4168 5.76152L5.34501 15.8334L4.1665 14.6549L14.2383 4.58301L15.4168 5.76152Z"
                    fill="#5993FF"/>
              <path fill-rule="evenodd" clip-rule="evenodd"
                    d="M5.8335 4.16699H15.8335V14.167H14.1668V5.83366H5.8335V4.16699Z"
                    fill="#5993FF"/>
              </svg>
          </span>
          <span>(Download the form, after filling up the form, You need to upload the form here)</span>
        </p>
        <FileUpload
          name={"upload-w-4-form"}
          className="h-[90px] w-full max-w-[100vw]"
          label={(isLoading && "w4-form" === documentTypeUploading) ? "Uploading..." : "Upload W-4 Form"}
          accept=".pdf, .jpg, .png, .webp"
          onChange={async (event) => {
            await handleFileUpload(event.target.files ?? null, "w4-form");
          }}
        />
        <FileNameCard fileUploads={fileUploads} documentType={"w4-form" as DocumentTypes}/>
      </div>

      <div>
        <h3 className={"font-semibold mb-3"}>Provide Two Professional References:</h3>
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
                    <SelectValue placeholder="Select Relationship"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="colleague">Colleague</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="friend">Friend</SelectItem>
                    <SelectItem value="professor">Professor</SelectItem>
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
      <div className="mt-6 pb-6">
        <Button
          type="submit"
          disabled={isSubmitting}
          className={'bg-[#00B4B8] backdrop-blur-[22px] hover:bg-[#00B4B8] active:bg-[#b2b2b3]'}
        >
            <span>
              {isSubmitting ? 'Submitting' : 'Next'}
            </span>
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none">
            <path
              d="M4 10H16M16 10L10 4M16 10L10 16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </div>

    </form>
  );
}

export const FileNameCard = (
  {fileUploads, documentType}: {
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
              stroke-linejoin="round"/>
        <path opacity="0.4" d="M6.66675 9.16699H10.0001" stroke="#00944A" stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"/>
        <path
          d="M10.8333 17.917V17.5003C10.8333 15.1433 10.8333 13.9648 11.5655 13.2326C12.2978 12.5003 13.4763 12.5003 15.8333 12.5003H16.2499M16.6666 11.1196V8.33366C16.6666 5.19096 16.6666 3.61962 15.6903 2.6433C14.714 1.66699 13.1426 1.66699 9.99992 1.66699C6.85723 1.66699 5.28588 1.66699 4.30956 2.6433C3.33325 3.61961 3.33325 5.19096 3.33325 8.33366V12.1205C3.33325 14.8247 3.33325 16.1767 4.07164 17.0926C4.22082 17.2776 4.38934 17.4461 4.57436 17.5952C5.49018 18.3337 6.84227 18.3337 9.54642 18.3337C10.1344 18.3337 10.4283 18.3337 10.6976 18.2387C10.7536 18.2189 10.8084 18.1962 10.862 18.1706C11.1196 18.0473 11.3274 17.8395 11.7432 17.4237L15.6903 13.4767C16.172 12.9949 16.4128 12.7541 16.5398 12.4477C16.6666 12.1415 16.6666 11.8008 16.6666 11.1196Z"
          stroke="#00944A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>{fileUploaded?.fileName}</span>
    </div>
  )
}