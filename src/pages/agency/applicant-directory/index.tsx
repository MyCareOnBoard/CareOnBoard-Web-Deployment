import { useLocation, useNavigate } from "react-router";
import { UserRoundSearch } from "lucide-react";
import { Routes } from "@/routes/constants";
import { AgencyPageHeader } from "@/components/agency/AgencyShell";
import { ApplicantsList } from "./components/ApplicantsList";
import { CopySignupLinkButton } from "./components/CopySignupLinkButton";
import { DirectoryViewNav } from "./components/DirectoryViewNav";
import { useApplicantDirectoryData } from "./useApplicantDirectoryData";

export default function ApplicantDirectory() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    applicants,
    isLoading,
    currentPage,
    totalPages,
    searchQuery,
    activeTab,
    setSearchQuery,
    setActiveTab,
    goToPage,
  } = useApplicantDirectoryData({ tab: "pending" });

  const handleViewDetails = (id: string) => {
    navigate(Routes.agency.applicantProfile.replace(":id", id));
  };

  return (
    <div className="min-w-0 pb-6">
      <AgencyPageHeader
        icon={UserRoundSearch}
        title="Applicants directory"
        description="People who applied through your sign-up link. Review, then onboard or decline."
        actions={<CopySignupLinkButton />}
      />

      <ApplicantsList
        nav={<DirectoryViewNav currentPath={location.pathname} />}
        applicants={applicants}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterPeriod={activeTab}
        onFilterChange={setActiveTab}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={goToPage}
        onApplicantSelect={(applicant) => handleViewDetails(applicant.id)}
        isLoading={isLoading}
        title="Pending applicants"
        description="All pending applications."
      />
    </div>
  );
}
