import StepPlaceholder from "./StepPlaceholder";

interface ConditionalHireStepProps {
  onBack?: () => void;
  onNext?: () => void;
}

export default function ConditionalHireStep({ onBack, onNext }: ConditionalHireStepProps) {
  return (
    <StepPlaceholder
      title="Conditional Hire & Compliance"
      description="A member of our compliance team will review your documentation and begin background checks."
      bulletPoints={[
        "Confirm consent for background screening",
        "Review conditional offer requirements",
        "Provide payroll and banking information",
      ]}
      onBack={onBack}
      onNext={onNext}
      backLabel="Return to Document Upload"
      nextLabel="Continue to Final Review"
    />
  );
}

