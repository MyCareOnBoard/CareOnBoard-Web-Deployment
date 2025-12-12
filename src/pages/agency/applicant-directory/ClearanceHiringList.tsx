import { useState } from "react";
import { useNavigate } from "react-router";
import { Search, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Routes } from "@/routes/constants";

interface Applicant {
  id: string;
  name: string;
  role: string;
  profileScreening: boolean;
  documents: boolean;
  conditionalHire: boolean;
  finalAgencyReview: boolean;
  avatar: string;
}

const mockApplicants: Applicant[] = [
  {
    id: "1",
    name: "DR.Brooklyn Simmons",
    role: "Applicant",
    profileScreening: true,
    documents: true,
    conditionalHire: true,
    finalAgencyReview: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=1",
  },
  {
    id: "2",
    name: "DR.Brooklyn Simmons",
    role: "Applicant",
    profileScreening: true,
    documents: true,
    conditionalHire: false,
    finalAgencyReview: false,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=2",
  },
  {
    id: "3",
    name: "DR.Brooklyn Simmons",
    role: "Applicant",
    profileScreening: true,
    documents: true,
    conditionalHire: true,
    finalAgencyReview: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=3",
  },
  {
    id: "4",
    name: "DR.Brooklyn Simmons",
    role: "Applicant",
    profileScreening: true,
    documents: true,
    conditionalHire: true,
    finalAgencyReview: false,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=4",
  },
  {
    id: "5",
    name: "DR.Brooklyn Simmons",
    role: "Applicant",
    profileScreening: true,
    documents: true,
    conditionalHire: true,
    finalAgencyReview: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=5",
  },
  {
    id: "6",
    name: "DR.Brooklyn Simmons",
    role: "Applicant",
    profileScreening: true,
    documents: true,
    conditionalHire: true,
    finalAgencyReview: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=6",
  },
  {
    id: "7",
    name: "DR.Brooklyn Simmons",
    role: "Applicant",
    profileScreening: true,
    documents: true,
    conditionalHire: true,
    finalAgencyReview: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=7",
  },
];

export default function ClearanceHiringList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"today" | "week" | "month">("today");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const filteredApplicants = mockApplicants.filter((applicant) => {
    const search = searchQuery.toLowerCase();
    return (
      applicant.name.toLowerCase().includes(search) ||
      applicant.role.toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(filteredApplicants.length / itemsPerPage);
  const paginatedApplicants = filteredApplicants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when search query changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleViewProfile = (id: string) => {
    navigate(Routes.agency.applicantProfile.replace(':id', id));
  };

  const handleVerifyDocuments = (id: string) => {
    navigate(Routes.agency.applicantProfile.replace(':id', id));
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
              Applicant's directory
            </h1>
          </div>

          {/* Clearance & Hiring Toggle Section */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between gap-4">
                <div className="shrink-0">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Clearance & Hiring Toggle
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    These are your Pending Billing Approvals
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                      <Input
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full py-2 pr-4 text-sm border border-gray-300 rounded-lg pl-9"
                      />
                    </div>
                  <Button
                    onClick={() => setActiveTab("today")}
                    className={`px-4 py-2 text-sm rounded-lg ${
                      activeTab === "today"
                        ? "text-white bg-blue-500 hover:bg-blue-600"
                        : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Today
                  </Button>
                  <Button
                    onClick={() => setActiveTab("week")}
                    className={`px-4 py-2 text-sm rounded-lg ${
                      activeTab === "week"
                        ? "text-white bg-blue-500 hover:bg-blue-600"
                        : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    This Week
                  </Button>
                  <Button
                    onClick={() => setActiveTab("month")}
                    className={`px-4 py-2 text-sm rounded-lg ${
                      activeTab === "month"
                        ? "text-white bg-blue-500 hover:bg-blue-600"
                        : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    This month
                  </Button>
                </div>
              </div>
            </div>

            {/* Applicants List */}
            <div className="p-6 space-y-3">
              {paginatedApplicants.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-gray-500">No applicants found matching your search.</p>
                </div>
              ) : (
                paginatedApplicants.map((applicant) => (
                  <div
                    key={applicant.id}
                    className="flex items-center gap-4 p-4 transition bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:shadow-sm"
                  >
                    {/* Profile */}
                    <div className="flex items-center gap-4 min-w-[200px] shrink-0">
                      <img
                        src={applicant.avatar}
                        alt={applicant.name}
                        className="shrink-0 w-12 h-12 rounded-full"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {applicant.name}
                        </p>
                        <p className="text-xs text-gray-500">{applicant.role}</p>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-wrap items-center flex-1 gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          applicant.profileScreening
                            ? "bg-green-100 text-green-700 border border-green-300"
                            : "bg-gray-100 text-gray-700 border border-gray-300"
                        }`}
                      >
                        {applicant.profileScreening && <span>✓</span>}
                        Profile & Pre-Screening
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          applicant.documents
                            ? "bg-green-100 text-green-700 border border-green-300"
                            : "bg-gray-100 text-gray-700 border border-gray-300"
                        }`}
                      >
                        {applicant.documents && <span>✓</span>}
                        Documents
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          applicant.conditionalHire
                            ? "bg-green-100 text-green-700 border border-green-300"
                            : "bg-gray-100 text-gray-700 border border-gray-300"
                        }`}
                      >
                        {applicant.conditionalHire && <span>✓</span>}
                        Conditional Hire
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                          applicant.finalAgencyReview
                            ? "bg-red-100 text-red-700 border border-red-300"
                            : "bg-gray-100 text-gray-700 border border-gray-300"
                        }`}
                      >
                        {applicant.finalAgencyReview && <span>!</span>}
                        Final Agency Review
                      </span>
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={() => handleVerifyDocuments(applicant.id)}
                      className="shrink-0 px-4 py-2 text-xs font-medium text-white bg-gray-400 rounded-lg hover:bg-gray-500"
                    >
                      Verify Documents
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {filteredApplicants.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <span className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredApplicants.length)} of {filteredApplicants.length} applicants
                </span>
                <div className="flex items-center gap-2">
                  <span className="mr-2 text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
