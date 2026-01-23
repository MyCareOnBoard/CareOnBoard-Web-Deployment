import { useNavigate } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Routes } from "@/routes/constants";
import { ApplicantsList } from "./components/ApplicantsList";
import { useApplicantDirectoryData } from "./useApplicantDirectoryData";

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

  const handleViewDetails = (id: string) => {
    navigate(Routes.agency.applicantProfile.replace(":id", id));
  };

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

        {/* Applicant Directory List Section */}
        <div className="backdrop-blur-[8px] bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] border-solid overflow-hidden relative rounded-[30px]">
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
  );
}
