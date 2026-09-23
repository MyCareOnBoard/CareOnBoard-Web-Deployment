import { AgencyClientFormWrapper } from "./AgencyClientFormWrapper";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import { SupportCoordinatorEnrollmentWizard } from "../SupportCoordinatorEnrollmentWizard";

export default function AgencyAddClientPage() {
  const mode = useEffectiveAgencyMode();
  if (mode === "sc") return <SupportCoordinatorEnrollmentWizard />;
  return <AgencyClientFormWrapper isEditMode={false} />;
}
