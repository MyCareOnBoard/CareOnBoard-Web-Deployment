import {FileUpload} from "@/components/ui/file-upload";
import {useRef, useState} from "react";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Checkbox} from "@/components/ui/checkbox";
import {Button} from "@/components/ui/button";

interface DocumentUploadStepProps {
  onBack?: () => void;
  onNext?: () => void;
}

export default function DocumentUploadStep({onBack, onNext}: DocumentUploadStepProps) {
  const [name, setName] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(false);

  const onBlur = () => {
    if (!selectedFileName) {
      setUploadError('Please select a file');
    }
  };

  const onChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      setSelectedFileName(files[0].name);
    }
  };

  const [references, setReferences] = useState<{
    name: string;
    relationship: string;
    phone: string;
    email: string;
  }[]>([
    {
      name: "",
      relationship: "",
      phone: "",
      email: ""
    },
    {
      name: "",
      relationship: "",
      phone: "",
      email: ""
    }
  ])

  const files = [
    {
      id: "photo-id",
      label: "Photo ID (Driver’s License, State ID, Passport)",
      placeholder: "Upload your photo ID"
    },
    {
      id: "social-security",
      label: "Social Security Card or valid work permit.",
      placeholder: "Upload social security card"
    },
    {
      id: "high-school",
      label: "High School Diploma/GED certificate.",
      placeholder: "Upload high school certificate"
    },
    {
      id: "relevant-certificate",
      label: "Any relevant certifications (e.g., CPR, First Aid — optional at this stage).",
      placeholder: "Upload any certificate"
    },
    {
      id: "hepatitis-b-vaccination",
      label: "Hepatitis B vaccination series documents.",
      placeholder: "Upload Hepatitis B vaccination series documents."
    },
    {
      id: "hepatitis-b-immunity",
      label: "Hepatitis B immunity (titer result)",
      placeholder: "Upload Hepatitis B immunity (titer result)"
    },
    {
      id: "tb-test",
      label: "TB test result.",
      placeholder: "Upload TB test result"
    }
  ]

  return (
    <div className={"w-full"}>
      {files.map((file) =>
        <div className={"mb-6"}>
          <p className={"text-sm mb-2"}>{file.label}</p>
          <FileUpload
            name={file.id}
            className="h-[90px] w-full max-w-[100vw]"
            label={selectedFileName ?? file.placeholder}
            accept=".pdf,.doc,.docx"
            onBlur={onBlur}
            onChange={(event) => {
              onChange(event.target.files ?? null);
              setUploadError(null);
            }}
          />
        </div>
      )}
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
          label={selectedFileName ?? "Upload I-9 form"}
          accept=".pdf,.doc,.docx"
          onBlur={onBlur}
          onChange={(event) => {
            onChange(event.target.files ?? null);
            setUploadError(null);
          }}
        />
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
          label={selectedFileName ?? "Upload W-4 Form"}
          accept=".pdf,.doc,.docx"
          onBlur={onBlur}
          onChange={(event) => {
            onChange(event.target.files ?? null);
            setUploadError(null);
          }}
        />
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
                />
              </div>
              <div>
                <label className={"text-sm mb-2"}>Relationship</label>
                <Select>
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
                  type="text"
                  placeholder={"Enter phone number"}
                  className="w-full pr-10"
                />
              </div>
              <div>
                <label className={"text-sm mb-2"}>Email</label>
                <Input
                  type="email"
                  placeholder={"Enter email"}
                  className="w-full pr-10"
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
          name={name}
          onBlur={onBlur}
          checked={value}
          onChange={(event) => setValue(event.target.checked)}
          labelClassName={"text-[#808081] font-normal"}
          label="I hereby declared that all the information are correct"
        />
      </div>
      <div className="mt-6 pb-6">
        <Button
          type="button"
          onClick={onNext}
          className={'bg-[#00B4B8] backdrop-blur-[22px] hover:bg-[#00B4B8] active:bg-[#b2b2b3]'}
        >
            <span>
              {'Next'}
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

    </div>
  );
}

