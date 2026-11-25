import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import { UserPlus } from "lucide-react";
import { useDSPList } from "./useDSPManagement";
import { DSPList } from "./DSPList";
import { AgencyPageHeader } from "@/components/agency/AgencyShell";
import { WorkforceIcon } from "@/components/agency/AgencyIcons";
import { agencyPrimaryButton } from "@/components/agency/AgencyListKit";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import { staffLabels } from "@/lib/roleLabel";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import SupportCoordinatorManagement from "./SupportCoordinatorManagement";
import type { RootState } from "@/store/redux/store";

export default function DSPManagementPage() {
  const mode = useEffectiveAgencyMode();
  if (mode === "sc") return <SupportCoordinatorManagement />;
  return <StandardDSPManagementPage />;
}

function StandardDSPManagementPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const agencyId = user?.agencyId || "";
  const selectedMode = useSelector((state: RootState) => state.agencyMode.modeByAgency[agencyId]);
  const effectiveTypes = selectedMode ? [selectedMode] : user?.agency?.supportedClientTypes;
  const labels = staffLabels(effectiveTypes);
  const { dsps, stats, isLoading, error } = useDSPList();

  const header = (
    <AgencyPageHeader
      icon={WorkforceIcon}
      title={`${labels.title} management`}
      description={`Browse, search and manage your ${labels.plural}.`}
      actions={
        <button
          type="button"
          onClick={() => navigate(Routes.agency.manualStaffOnboarding)}
          className={agencyPrimaryButton}
        >
          <UserPlus aria-hidden="true" className="h-4 w-4" />
          Manual staff onboarding
        </button>
      }
    />
  );

  if (error) {
    return (
      <div className="pb-6">
        {header}
        <div role="alert" className="mt-5 rounded-[16px] border border-[#f0c8c4] bg-[#fdf3f2] px-6 py-10 text-center dark:border-[#ff6b5e]/30 dark:bg-[#ff6b5e]/10">
          <p className="text-[16px] font-medium text-[#b42318] dark:text-[#f8a1a1]">Failed to load DSPs</p>
          <p className="mt-1 text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      {header}
      <DSPList
        dsps={dsps}
        stats={stats}
        isLoading={isLoading}
      />
    </div>
  );
}
