import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import { Search, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { applicantsApi, Applicant } from "@/lib/api/applicants";
import { Routes } from "@/routes/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";


export default function PendingApplicants() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"today" | "week" | "month">("today");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const errorToastShownRef = useRef(false);
  const itemsPerPage = 6;

  // Memoize calculated values for performance
  const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage]);
  const totalPages = useMemo(() => totalCount > 0 ? Math.ceil(totalCount / itemsPerPage) : 1, [totalCount]);
  const paginatedApplicants = applicants;

  const fetchApplicants = useCallback(async () => {
    setIsLoading(true);
    console.log('[PendingApplicants] Fetching applicants:', {
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

      if (res?.success && res?.data) {
        setApplicants(res.data);
        setTotalCount(res?.pagination?.count ?? 0);
        // Reset error toast guard on successful load
        errorToastShownRef.current = false;
      } else {
        setApplicants([]);
        setTotalCount(0);
      }
    } catch (error: any) {
      console.error('[PendingApplicants] Error fetching applicants:', error);
      const is404 = error?.response?.status === 404;
      const isNetwork = error?.code === 'ERR_NETWORK' || (error?.message || '').toLowerCase().includes('network');
      const description = isNetwork
        ? 'Unable to connect to the database. Please check your network connection.'
        : is404
          ? 'Applicants endpoint not found. Please contact your administrator.'
          : (error instanceof Error ? error.message : 'Failed to load applicants from database');
      // Show toast only once per failure cycle
      if (!errorToastShownRef.current) {
        toast({ title: 'Database Error', variant: 'destructive', description });
        errorToastShownRef.current = true;
      }
      setApplicants([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, debouncedSearchQuery, startIndex, toast]);

  // Debounce search query to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 when debounced search query or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, activeTab]);

  // Fetch applicants when debounced search, tab, or page changes
  useEffect(() => {
    fetchApplicants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, activeTab, currentPage]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
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
                    Pending Applicants
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
                    className={`px-4 py-2 text-sm rounded-lg ${activeTab === "today"
                      ? "text-white bg-blue-500 hover:bg-blue-600"
                      : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                      }`}
                  >
                    Today
                  </Button>
                  <Button
                    onClick={() => setActiveTab("week")}
                    className={`px-4 py-2 text-sm rounded-lg ${activeTab === "week"
                      ? "text-white bg-blue-500 hover:bg-blue-600"
                      : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                      }`}
                  >
                    This Week
                  </Button>
                  <Button
                    onClick={() => setActiveTab("month")}
                    className={`px-4 py-2 text-sm rounded-lg ${activeTab === "month"
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
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">Loading...</div>
                </div>
              ) : paginatedApplicants.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-gray-500">No applicants found</p>
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
                        src={applicant.profilePictureUrl}
                        alt={applicant.name}
                        className="w-12 h-12 rounded-full shrink-0"
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
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap ${applicant.profileScreening
                          ? "bg-[rgba(14,175,82,0.05)] border border-[#0EAF52] text-[#0EAF52]"
                          : "bg-[rgba(128,128,129,0.05)] border border-[#525253] text-[#525253]"
                          }`}
                      >
                        {applicant.profileScreening && <CheckCircle2 className="w-6 h-6" />}
                        Profile & Pre-Screening
                      </span>
                      <span
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap ${applicant.documents
                          ? "bg-[rgba(14,175,82,0.05)] border border-[#0EAF52] text-[#0EAF52]"
                          : "bg-[rgba(128,128,129,0.05)] border border-[#525253] text-[#525253]"
                          }`}
                      >
                        {applicant.documents && <CheckCircle2 className="w-6 h-6" />}
                        Documents
                      </span>
                      <span
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap ${applicant.conditionalHire
                          ? "bg-[rgba(14,175,82,0.05)] border border-[#0EAF52] text-[#0EAF52]"
                          : "bg-[rgba(128,128,129,0.05)] border border-[#525253] text-[#525253]"
                          }`}
                      >
                        {applicant.conditionalHire && <CheckCircle2 className="w-6 h-6" />}
                        Conditional Hire
                      </span>
                      <span
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap ${applicant.finalAgencyReview
                          ? "bg-[rgba(220,38,38,0.05)] border border-[#DC2626] text-[#DC2626]"
                          : "bg-[rgba(128,128,129,0.05)] border border-[#525253] text-[#525253]"
                          }`}
                      >
                        {applicant.finalAgencyReview && <CheckCircle2 className="w-6 h-6" />}
                        Final Agency Review
                      </span>
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={() => handleVerifyDocuments(applicant.id)}
                      className="px-4 py-2 text-xs font-medium text-white bg-gray-400 rounded-lg shrink-0 hover:bg-gray-500"
                    >
                      Details
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {paginatedApplicants.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <span className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} applicants
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
