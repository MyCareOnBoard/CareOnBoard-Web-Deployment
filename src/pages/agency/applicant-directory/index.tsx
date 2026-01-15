import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Search, ArrowUpRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AddScheduleModal from "@/pages/agency/scheduling/components/AddScheduleModal";
import { Routes } from "@/routes/constants";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { applicantsApi, Applicant } from "@/lib/api/applicants";
import { agencyApplicantsExtraApi } from "@/lib/api/agencyApplicantsExtra";

interface PendingApproval {
  id: string;
  name: string;
  progress: number; // 0-100
}

export default function ApplicantDirectory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"today" | "week" | "month">("today");
  const [isLoading, setIsLoading] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const errorToastShownRef = useRef(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isClearanceLoading, setIsClearanceLoading] = useState(false);
  const [clearancePage, setClearancePage] = useState(1);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const itemsPerPage = 6;

  // Memoize these values
  const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage, itemsPerPage]);
  const totalPages = useMemo(() => totalCount > 0 ? Math.ceil(totalCount / itemsPerPage) : 0, [totalCount, itemsPerPage]);
  const paginatedApplicants = applicants;

  // API functions - with useCallback to prevent recreation
  const fetchApplicants = useCallback(async () => {
    setIsLoading(true);
    console.log('[ApplicantDirectory] Fetching applicants:', { 
      tab: 'all',
      period: activeTab, 
      search: debouncedSearchQuery, 
      limit: itemsPerPage, 
      offset: startIndex 
    });
    
    try {
      const res = await applicantsApi.directory({
        tab: 'all',
        period: activeTab,
        search: debouncedSearchQuery,
        limit: itemsPerPage,
        offset: startIndex,
      });
      
      console.log('[ApplicantDirectory] API Response:', res);
      
      const loaded = res?.data ?? [];
      setApplicants(loaded);
      setTotalCount(res?.pagination?.count ?? 0);
      // Reset error toast guard on successful load
      errorToastShownRef.current = false;
      
      console.log('[ApplicantDirectory] Set applicants:', loaded.length, 'items');
    } catch (error: any) {
      console.error('[ApplicantDirectory] Error fetching applicants:', error);
      const is404 = error?.response?.status === 404;
      const isNetwork = error?.code === 'ERR_NETWORK' || (error?.message || '').toLowerCase().includes('network');
      const description = isNetwork
        ? 'Unable to connect to the database. Please check your network connection.'
        : is404
          ? 'Applicants endpoint not found. Please contact your administrator.'
          : (error instanceof Error ? error.message : 'Failed to load applicants from database');
      // Show toast only once per failure cycle to avoid repeated popups (StrictMode double effects, retries)
      if (!errorToastShownRef.current) {
        toast({ title: 'Database Error', variant: 'destructive', description });
        errorToastShownRef.current = true;
      }
      // Clear data on error
      setApplicants([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, debouncedSearchQuery, itemsPerPage, startIndex, toast]);
  
  // Fetch clearance approvals from directory endpoint
  const fetchClearanceApprovals = useCallback(async () => {
    setIsClearanceLoading(true);
    try {
      const res = await applicantsApi.directory({
        tab: 'clearance',
        limit: 6,
        offset: (clearancePage - 1) * 6,
      });
      
      if (res?.success && res?.data && res.data.length > 0) {
        // Map backend data to PendingApproval format
        const approvals: PendingApproval[] = res.data.map((applicant: any) => ({
          id: applicant.id,
          name: applicant.name,
          progress: applicant.completionPercent ?? 75, // Use completionPercent from backend or default to 75
        }));
        setPendingApprovals(approvals);
      }
    } catch (error) {
      console.error('[ApplicantDirectory] Error fetching clearance approvals:', error);
    } finally {
      setIsClearanceLoading(false);
    }
  }, [clearancePage]);
  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await agencyApplicantsExtraApi.approveForHire(id);
      setPendingApprovals(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Success",
        description: "Applicant approved for hire",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to approve applicant",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    setActionLoading(id);
    try {
      await agencyApplicantsExtraApi.reject(id, "Clearance rejected by agency");
      setPendingApprovals(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Success",
        description: "Applicant clearance rejected",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to reject applicant",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewDetails = (id: string) => {
    navigate(Routes.agency.applicantProfile.replace(":id", id));
  };

  const handleViewClearanceList = () => {
    navigate(Routes.agency.applicantClearanceHiring);
  };

  const handleViewPendingApplicants = () => {
    navigate(Routes.agency.applicantPendingApplicants);
  }

  // Debounce search query to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when search query or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, activeTab]);

  // Fetch applicants when debounced search, tab, or page changes
  useEffect(() => {
    fetchApplicants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, activeTab, currentPage]);

  // Fetch clearance on mount and when page changes
  useEffect(() => {
    fetchClearanceApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearancePage]);

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
                    className="p-2 text-gray-400 transition-colors rounded-b-full shadow-md cursor-pointer hover:text-gray-600"
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
                      className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex-1 max-w-[300px]">
                        <p className="text-[16px] font-medium text-[#10141a] mb-2">{approval.name}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 overflow-hidden bg-gray-200 rounded-full">
                            <div 
                              className="h-full bg-[#00b3ad] rounded-full transition-all"
                              style={{ width: `${approval.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-6">
                        <Button
                          onClick={() => handleApprove(approval.id)}
                          disabled={actionLoading === approval.id}
                          className="bg-[#10b981] hover:bg-[#059669] text-white rounded-full px-6 py-2 flex items-center gap-2 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          <Check className="w-4 h-4" />
                          {actionLoading === approval.id ? 'Processing...' : 'Approve'}
                        </Button>
                        <Button
                          onClick={() => handleCancel(approval.id)}
                          disabled={actionLoading === approval.id}
                          className="bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-full px-6 py-2 flex items-center gap-2 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          <X className="w-4 h-4" />
                          {actionLoading === approval.id ? 'Processing...' : 'Cancel'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-600">
                    {clearancePage}/{Math.max(1, Math.ceil(pendingApprovals.length / 6))}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 text-gray-600 rounded hover:bg-gray-100"
                    onClick={() => setClearancePage(prev => Math.max(1, prev - 1))}
                    disabled={clearancePage === 1 || isClearanceLoading}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 text-gray-600 rounded hover:bg-gray-100"
                    onClick={() => setClearancePage(prev => prev + 1)}
                    disabled={isClearanceLoading || pendingApprovals.length < 6}
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
                  <button 
                    className="p-2 text-gray-400 transition-colors rounded-b-full shadow-md cursor-pointer hover:text-gray-600"
                    onClick={handleViewPendingApplicants}
                  >
                    <ArrowUpRight className="w-5 h-5" />
                  </button>
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
