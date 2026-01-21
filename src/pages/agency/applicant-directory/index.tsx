import { useNavigate } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Routes } from "@/routes/constants";
import { ApplicantsList } from "./components/ApplicantsList";
import { useApplicantDirectoryData } from "./useApplicantDirectoryData";
import { useClearanceApprovals } from "./useClearanceApprovals";
import { ClearanceCard } from "./components/ClearanceCard";

export default function ApplicantDirectory() {
  const navigate = useNavigate();
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
  } = useApplicantDirectoryData();

  const {
    pendingApprovals,
    clearancePage,
    isClearanceLoading,
    actionLoadingId,
    nextPage,
    prevPage,
    approve,
    cancel,
  } = useClearanceApprovals();

  const handleViewDetails = (id: string) => {
    navigate(Routes.agency.applicantProfile.replace(":id", id));
  };

  const handleViewClearanceList = () => {
    navigate(Routes.agency.applicantClearanceHiring);
  };

  const handleViewPendingApplicants = () => {
    navigate(Routes.agency.applicantPendingApplicants);
  }

  return (
    <div className="min-h-screen">
      {/* Main Content */}
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex mb-4">
          <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
            Applicant's directory
          </h1>
        </div>

        {/* Stats / Clearance Overview Section */}
        <div className="mb-8">
          <ClearanceCard
            pendingApprovals={pendingApprovals}
            clearancePage={clearancePage}
            isLoading={isClearanceLoading}
            actionLoadingId={actionLoadingId}
            onNextPage={nextPage}
            onPrevPage={prevPage}
            onApprove={approve}
            onCancel={cancel}
            onViewFullList={handleViewClearanceList}
          />
        </div>

        {/* Applicant Directory List Section */}
        <div className="backdrop-blur-[8px] bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] border-solid overflow-hidden relative rounded-[30px]">
          <div className="p-[19px]">
            <div className="mb-[37px]">
              <div className="mb-6">
                <h2 className="text-[20px] font-medium text-[#10141a] leading-[1.6] font-['Urbanist'] mb-1">
                  Pending Applicant
                </h2>
                <p className="text-[14px] font-medium text-[#808081] leading-[1.4] font-['Urbanist']">
                  These are your Pending Applicant
                </p>
              </div>
            </div>

            <ApplicantsList
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
            />
          </div>
        </div>
      </div>
    </div>
  );
}
