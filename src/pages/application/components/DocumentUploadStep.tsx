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
    </div>
  );
}

