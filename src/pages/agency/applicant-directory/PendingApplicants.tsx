import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Routes } from "@/routes/constants";
import { Button } from "@/components/ui/button";
import { ApplicantsList } from "./components/ApplicantsList";
import { useApplicantDirectoryData } from "./useApplicantDirectoryData";

export default function PendingApplicants() {
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
      <div className="p-2">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(Routes.agency.applicantDirectory)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">
              Applicant&apos;s directory
            </h1>
          </div>

          {/* Pending Applicants Full Page List */}
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
