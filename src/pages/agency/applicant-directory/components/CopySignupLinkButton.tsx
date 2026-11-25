import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import { agencyOutlineButton } from "@/components/agency/AgencyListKit";

/** Copies the agency's applicant sign-up link (same link as the dashboard's button). */
export function CopySignupLinkButton() {
  const { user } = useAuth();
  const mode = useEffectiveAgencyMode();
  const agencyId = user?.agencyId || user?.agency?.id || "";

  const copySignupLink = async () => {
    const url = `${window.location.origin}${Routes.auth.signup}?agencyId=${encodeURIComponent(agencyId)}${mode === "sc" ? "&applicantType=support_coordinator" : ""}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Sign-up link copied");
    } catch {
      toast.error("Could not copy the link. Copy it from the address bar instead.");
    }
  };

  return (
    <button type="button" onClick={copySignupLink} className={agencyOutlineButton}>
      <Link2 aria-hidden="true" className="h-4 w-4" />
      Copy sign-up link
    </button>
  );
}
