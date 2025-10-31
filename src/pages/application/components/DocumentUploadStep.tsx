import {FileUpload} from "@/components/ui/file-upload";
import {useRef, useState} from "react";

interface DocumentUploadStepProps {
  onBack?: () => void;
  onNext?: () => void;
}

export default function DocumentUploadStep({onBack, onNext}: DocumentUploadStepProps) {
  const [name, setName] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

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
          <span className={"flex items-center gap-2"}>
            <span>I-9 form</span>
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
          <span className={"flex items-center gap-2"}>
            <span>W-4 forms</span>
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
    </div>
  );
}

