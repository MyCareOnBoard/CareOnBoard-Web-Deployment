import StepPlaceholder from "./StepPlaceholder";

interface DocumentUploadStepProps {
  onBack?: () => void;
  onNext?: () => void;
}

export default function DocumentUploadStep({ onBack, onNext }: DocumentUploadStepProps) {
  return (
    <StepPlaceholder
      title="Document Upload & Eligibility Verification"
      description="We will gather verification documents, licenses, and proof of eligibility before continuing."
      bulletPoints={[
        "Upload identification (Driver’s license or Passport)",
        "Provide certifications or license numbers",
        "Submit proof of eligibility to work",
      ]}
      onBack={onBack}
      onNext={onNext}
      backLabel="Return to Profile"
      nextLabel="Continue to Conditional Hire"
    />
  );
}

