import StepPlaceholder from "./StepPlaceholder";

interface OrientationStepProps {
  onBack?: () => void;
  onNext?: () => void;
}

export default function OrientationStep({ onBack, onNext }: OrientationStepProps) {
  return (
    <StepPlaceholder
      title="Official Hire & Orientation"
      description="Congratulations! We finalize onboarding logistics and schedule your orientation sessions."
      bulletPoints={[
        "Sign official offer letter",
        "Schedule agency orientation session",
        "Review onboarding checklist and contacts",
      ]}
      onBack={onBack}
      onNext={onNext}
      backLabel="Return to Final Review"
      nextLabel="Finish"
    />
  );
}

