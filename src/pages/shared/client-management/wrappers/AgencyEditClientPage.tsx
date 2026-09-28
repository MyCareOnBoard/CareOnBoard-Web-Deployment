import { AgencyClientFormWrapper } from "./AgencyClientFormWrapper";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import { SupportCoordinatorEnrollmentWizard } from "../SupportCoordinatorEnrollmentWizard";

export default function AgencyEditClientPage() {
  const mode = useEffectiveAgencyMode();
  if (mode === "sc") return <SupportCoordinatorEnrollmentWizard isEditMode />;
  return <AgencyClientFormWrapper isEditMode={true} />;
}
