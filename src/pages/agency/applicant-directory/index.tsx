import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Search, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AddScheduleModal from "@/pages/agency/scheduling/components/AddScheduleModal";
import { Routes } from "@/routes/constants";
import { useToast } from "@/hooks/use-toast";
import { applicantsApi, Applicant } from "@/lib/api/applicants";

interface PendingApproval {
  id: string;
  name: string;
  progress: number; // 0-100
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
];

export default function ApplicantDirectory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"today" | "week" | "month">("today");
  const [isLoading, setIsLoading] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const errorToastShownRef = useRef(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([
    { id: "1", name: "DR.Brooklyn Simmons", progress: 75 },
    { id: "2", name: "DR.Brooklyn Simmons", progress: 75 },
    { id: "3", name: "DR.Brooklyn Simmons", progress: 75 },
    { id: "4", name: "DR.Brooklyn Simmons", progress: 75 },
    { id: "5", name: "DR.Brooklyn Simmons", progress: 75 },
    { id: "6", name: "DR.Brooklyn Simmons", progress: 75 },
  ]);
  const itemsPerPage = 6;

  // Memoize these values
  const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage, itemsPerPage]);
  const totalPages = useMemo(() => totalCount > 0 ? Math.ceil(totalCount / itemsPerPage) : 0, [totalCount, itemsPerPage]);
  const paginatedApplicants = applicants;

  // API functions - with useCallback to prevent recreation
  const fetchApplicants = useCallback(async () => {
    setIsLoading(true);
    console.log('[ApplicantDirectory] Fetching applicants:', { 
      period: activeTab, 
      search: searchQuery, 
      limit: itemsPerPage, 
      offset: startIndex 
    });
    
    try {
      const res = await applicantsApi.list({
        period: activeTab,
        search: searchQuery,
        limit: itemsPerPage,
        offset: startIndex,
      });
      
      console.log('[ApplicantDirectory] API Response:', res);
      
      const loaded = res?.data ?? [];
      const finalData = Array.isArray(loaded) && loaded.length > 0 ? loaded : mockApplicants;
      setApplicants(finalData);
      setTotalCount(finalData.length);
      // Reset error toast guard on successful load
      errorToastShownRef.current = false;
      
      console.log('[ApplicantDirectory] Set applicants:', res.data?.length ?? 0, 'items');
    } catch (error: any) {
      console.error('[ApplicantDirectory] Error fetching applicants:', error);
      const is404 = error?.response?.status === 404;
      const isNetwork = error?.code === 'ERR_NETWORK' || (error?.message || '').toLowerCase().includes('network');
      const description = isNetwork
        ? 'Network/CORS issue contacting API. See console for details.'
        : is404
          ? 'Applicants endpoint not available yet. Backend work pending.'
          : (error instanceof Error ? error.message : 'Unable to load applicants');
      // Show toast only once per failure cycle to avoid repeated popups (StrictMode double effects, retries)
      if (!errorToastShownRef.current) {
        toast({ title: 'Applicants', variant: 'destructive', description });
        errorToastShownRef.current = true;
      }
      // Clear data on error
      setApplicants([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchQuery, itemsPerPage, startIndex, toast]);

  const handleApprove = async (id: string) => {
    try {
      await applicantsApi.approve(id);
      setPendingApprovals(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Approved",
        description: "Applicant has been approved successfully.",
      });
    } catch (error) {
      console.error("Error approving:", error);
      toast({
        title: "Error",
        description: "Failed to approve applicant. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await applicantsApi.cancel(id);
      setPendingApprovals(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Cancelled",
        description: "Applicant approval has been cancelled.",
      });
    } catch (error) {
      console.error("Error canceling:", error);
      toast({
        title: "Error",
        description: "Failed to cancel approval. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (id: string) => {
    navigate(Routes.agency.applicantProfile.replace(":id", id));
  };

  const handleViewClearanceList = () => {
    navigate(Routes.agency.applicantClearanceHiring);
  };

  // Reset page when search query or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  // Fetch once on mount; do not retry in background on filter changes
  useEffect(() => {
    fetchApplicants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      {/* Main Content */}
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flexmb-4">
            <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
              Applicant's directory
            </h1>
          </div>

          {/* Stats Overview Section */}
          <div className="mb-8">
            {/* Clearance & Hiring Card */}
            <div 
              className="relative overflow-hidden rounded-[24px] backdrop-blur-[50px] bg-[rgba(255,255,255,0.4)] shadow-sm"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-[18px] font-semibold text-[#10141a] mb-1">
                      Clearance & Hiring Toggle
                    </h2>
                    <p className="text-[13px] text-gray-600">
                      These are your Pending Hiring Approvals
                    </p>
                  </div>
                  <button 
                    className="text-gray-400 transition-colors hover:text-gray-600"
                    onClick={handleViewClearanceList}
                  >
                    <ArrowUpRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Clearance Items with Progress */}
                <div className="mb-4 space-y-3">
                  {pendingApprovals.slice(0, 6).map((approval) => (
                    <div
                      key={approval.id}
                      className="flex items-center justify-between gap-4 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#10141a] mb-2 truncate">
                          {approval.name}
                        </p>
                        {/* Progress bar */}
                        <div className="w-full h-2 overflow-hidden bg-gray-200 rounded-full">
                          <div 
                            className="h-full transition-all duration-300 bg-[#00b4b8]"
                            style={{ width: `${approval.progress}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(approval.id);
                          }}
                          className="px-4 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-full hover:bg-green-700 whitespace-nowrap"
                        >
                          ✓ Approve
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancel(approval.id);
                          }}
                          className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-full hover:bg-red-700 whitespace-nowrap"
                        >
                          ✕ Cancel
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-600">
                    1/{Math.ceil(pendingApprovals.length / 6)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 text-gray-600 rounded hover:bg-gray-100"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 text-gray-600 rounded hover:bg-gray-100"
                    onClick={() => setCurrentPage(Math.min(Math.ceil(pendingApprovals.length / 6), currentPage + 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Applicant Directory List Section */}
          <div className="bg-[rgba(255,255,255,0.4)] rounded-lg backdrop-blur-[50px] shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col gap-4">
                {/* Header Row */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Pending Applicant
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                      These are your Pending Applicant
                     </p>
                  </div>
                   {/* Search and Filter Row */}
                <div className="flex items-center justify-end gap-4">
                  <div className="flex-1 max-w-sm">
                    <div className="relative">
                      <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                      <Input
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full py-2 pr-4 text-sm border border-gray-300 rounded-lg pl-9"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => setActiveTab("today")}
                      className={`px-4 py-2 text-sm rounded-lg font-medium ${
                        activeTab === "today" 
                          ? "text-white bg-blue-500 hover:bg-blue-600" 
                          : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      Today
                    </Button>
                    <Button 
                      onClick={() => setActiveTab("week")}
                      className={`px-4 py-2 text-sm rounded-lg font-medium ${
                        activeTab === "week" 
                          ? "text-white bg-blue-500 hover:bg-blue-600" 
                          : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      This Week
                    </Button>
                    <Button 
                      onClick={() => setActiveTab("month")}
                      className={`px-4 py-2 text-sm rounded-lg font-medium ${
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
            </div>

            {/* Applicants List */}
            <div className="p-4 space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">Loading...</div>
                </div>
              ) : paginatedApplicants.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">No applicants found</div>
                </div>
              ) : (
                <>
                  {paginatedApplicants.map((applicant) => (
                    <div
                      key={applicant.id}
                      className="flex items-center gap-6 p-4 transition bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      {/* Profile Section */}
                      <div className="flex items-center gap-3 min-w-[220px] shrink-0">
                        <img
                          src={applicant.avatar}
                          alt={applicant.name}
                          className="w-12 h-12 rounded-full shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {applicant.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {applicant.role}
                          </p>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-wrap items-center flex-1 gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                            applicant.profileScreening
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : "bg-gray-200 text-gray-600 border border-gray-300"
                          }`}
                        >
                          {applicant.profileScreening ? "✓" : "○"}
                          Profile & Pre-Screening
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                            applicant.documents
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : "bg-gray-200 text-gray-600 border border-gray-300"
                          }`}
                        >
                          {applicant.documents ? "✓" : "○"}
                          Documents
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                            applicant.conditionalHire
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : "bg-gray-200 text-gray-600 border border-gray-300"
                          }`}
                        >
                          {applicant.conditionalHire ? "✓" : "○"}
                          Conditional Hire
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                            applicant.finalAgencyReview
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : "bg-gray-200 text-gray-600 border border-gray-300"
                          }`}
                        >
                          {applicant.finalAgencyReview ? "✓ " : "○ "}
                          Final Agency Review
                        </span>
                      </div>

                      {/* Action Button */}
                      <Button 
                        onClick={() => handleViewDetails(applicant.id)}
                        className="px-6 py-2 text-xs font-medium text-gray-600 bg-gray-300 rounded-full shrink-0 hover:bg-gray-400"
                      >
                        Details
                      </Button>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Pagination */}
            {paginatedApplicants.length > 0 && (
              <div className="flex items-center justify-center gap-4 px-6 py-6 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600 min-w-[50px] text-center">
                  {currentPage}/{totalPages}
                </span>
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
