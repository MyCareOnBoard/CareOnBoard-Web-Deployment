import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Search, ArrowUpRight, Check, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      console.log('[ApplicantDirectory] Loaded applicants:', loaded);
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
        <div className="backdrop-blur-[8px] bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] border-solid overflow-hidden relative rounded-[30px]">
          <div className="p-[19px]">
            {/* Header and Controls */}
            <div className="mb-[37px]">
              {/* Title Section */}
              <div className="mb-6">
                <h2 className="text-[20px] font-medium text-[#10141a] leading-[1.6] font-['Urbanist'] mb-1">
                  Pending Applicant
                </h2>
                <p className="text-[14px] font-medium text-[#808081] leading-[1.4] font-['Urbanist']">
                  These are your Pending Applicant
                </p>
              </div>

              {/* Search and Filter Row */}
              <div className="flex flex-wrap items-center gap-4 justify-end">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute w-4 h-4 text-[#808081] transform -translate-y-1/2 left-3 top-1/2" />
                  <Input
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-[200px] md:w-[250px] py-2 pr-4 text-sm border border-gray-300 rounded-lg pl-9 bg-white"
                  />
                </div>

                {/* Filter Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setActiveTab("today")}
                    className={`px-5 py-2 text-[14px] rounded-full font-medium transition-all ${activeTab === "today"
                      ? "text-white bg-[#00B4B8] hover:bg-[#00a0a4]"
                      : "text-[#10141a] bg-white border border-[#B2B2B3] hover:bg-gray-50"
                      }`}
                  >
                    Today
                  </Button>
                  <Button
                    onClick={() => setActiveTab("week")}
                    className={`px-5 py-2 text-[14px] rounded-full font-medium transition-all ${activeTab === "week"
                      ? "text-white bg-[#00B4B8] hover:bg-[#00a0a4]"
                      : "text-[#10141a] bg-white border border-[#B2B2B3] hover:bg-gray-50"
                      }`}
                  >
                    This Week
                  </Button>
                  <Button
                    onClick={() => setActiveTab("month")}
                    className={`px-5 py-2 text-[14px] rounded-full font-medium transition-all ${activeTab === "month"
                      ? "text-white bg-[#00B4B8] hover:bg-[#00a0a4]"
                      : "text-[#10141a] bg-white border border-[#B2B2B3] hover:bg-gray-50"
                      }`}
                  >
                    This month
                  </Button>
                </div>

                {/* Arrow Button */}
                <button
                  className="p-2 text-[#808081] transition-colors rounded-full hover:text-[#10141a] hover:bg-white/50"
                  onClick={handleViewPendingApplicants}
                >
                  <ArrowUpRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Applicants List */}
            <div className="space-y-[26px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-[#808081]">Loading...</div>
                </div>
              ) : paginatedApplicants.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-[#808081]">No applicants found</div>
                </div>
              ) : (
                <>
                  {paginatedApplicants.map((applicant) => (
                    <div
                      key={applicant.id}
                      className="backdrop-blur-[20px] flex flex-wrap lg:flex-nowrap items-center gap-6 lg:gap-[26px] p-4 lg:p-0 rounded-[20px] transition-all hover:bg-white/20"
                    >
                      {/* Profile Section */}
                      <div className="flex items-center gap-4 min-w-[200px] shrink-0">
                        <img
                          src={applicant.avatar}
                          alt={applicant.name}
                          className="w-[60px] h-[60px] rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-[16px] font-semibold text-[#10141a] leading-[1.6] font-['Urbanist'] mb-0.5">
                            {applicant.name}
                          </p>
                          <p className="text-[14px] font-medium text-[#808081] leading-[1.4] font-['Urbanist']">
                            {applicant.role}
                          </p>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-wrap items-center flex-1 gap-3 min-w-0">
                        <span
                          className={`inline-flex items-center gap-[4px] p-[10px] rounded-[60px] text-[14px] font-semibold whitespace-nowrap font-['Urbanist'] border-[0.5px] transition-all ${applicant.profileScreening
                            ? "bg-[rgba(14,175,82,0.05)] text-[#0eaf52] border-[#0eaf52]"
                            : "bg-[rgba(128,128,129,0.05)] text-[#525253] border-[#525253]"
                            }`}
                        >
                          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                            {applicant.profileScreening ? (
                              <CheckCircle2 />
                            ) : (
                              <div className="w-6 h-6 rounded-full border-[1.5px] border-[#525253]" />
                            )}
                          </div>
                          Profile & Pre-Screening
                        </span>
                        <span
                          className={`inline-flex items-center gap-[4px] p-[10px] rounded-[60px] text-[14px] font-semibold whitespace-nowrap font-['Urbanist'] border-[0.5px] transition-all ${applicant.documents
                            ? "bg-[rgba(14,175,82,0.05)] text-[#0eaf52] border-[#0eaf52]"
                            : "bg-[rgba(128,128,129,0.05)] text-[#525253] border-[#525253]"
                            }`}
                        >
                          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                            {applicant.documents ? (
                              <CheckCircle2 />
                            ) : (
                              <div className="w-6 h-6 rounded-full border-[1.5px] border-[#525253]" />
                            )}
                          </div>
                          Documents
                        </span>
                        <span
                          className={`inline-flex items-center gap-[4px] p-[10px] rounded-[60px] text-[14px] font-semibold whitespace-nowrap font-['Urbanist'] border-[0.5px] transition-all ${applicant.conditionalHire
                            ? "bg-[rgba(14,175,82,0.05)] text-[#0eaf52] border-[#0eaf52]"
                            : "bg-[rgba(128,128,129,0.05)] text-[#525253] border-[#525253]"
                            }`}
                        >
                          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                            {applicant.conditionalHire ? (
                              <CheckCircle2 />
                            ) : (
                              <div className="w-6 h-6 rounded-full border-[1.5px] border-[#525253]" />
                            )}
                          </div>
                          Conditional Hire
                        </span>
                        <span
                          className={`inline-flex items-center gap-[4px] p-[10px] rounded-[60px] text-[14px] font-semibold whitespace-nowrap font-['Urbanist'] border-[0.5px] transition-all ${applicant.finalAgencyReview
                            ? "bg-[rgba(14,175,82,0.05)] text-[#0eaf52] border-[#0eaf52]"
                            : "bg-[rgba(128,128,129,0.05)] text-[#525253] border-[#525253]"
                            }`}
                        >
                          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                            {applicant.finalAgencyReview ? (
                              <CheckCircle2 />
                            ) : (
                              <div className="w-6 h-6 rounded-full border-[1.5px] border-[#525253]" />
                            )}
                          </div>
                          Final Agency Review
                        </span>
                      </div>

                      {/* Action Button */}
                      <Button
                        onClick={() => handleViewDetails(applicant.id)}
                        className="px-8 py-2.5 text-[14px] font-semibold text-[#808081] bg-[#B2B2B3]/30 rounded-full shrink-0 hover:bg-[#B2B2B3]/50 border-0 transition-all font-['Urbanist']"
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
              <div className="flex items-center justify-center gap-3 mt-8 pt-6">
                <span className="text-[14px] text-[#10141a] font-medium min-w-[40px] text-center">
                  {currentPage}/{totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0 rounded-full hover:bg-white/50 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0 rounded-full hover:bg-white/50 disabled:opacity-30"
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
