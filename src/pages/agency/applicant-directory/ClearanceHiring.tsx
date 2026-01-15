import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, X, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Routes } from "@/routes/constants";
import { agencyApplicantsExtraApi } from "@/lib/api/agencyApplicantsExtra";
import { applicantsApi } from "@/lib/api/applicants";
import { useToast } from "@/hooks/use-toast";

interface ClearanceItem {
  id: string;
  name: string;
  progress: number;
}

export function ClearanceHiring() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<"today" | "week" | "month">("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<ClearanceItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const errorToastShownRef = useRef(false);
  const itemsPerPage = 6;
  
  // Memoize calculated values for performance
  const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage]);
  const totalPages = useMemo(() => totalCount > 0 ? Math.ceil(totalCount / itemsPerPage) : 1, [totalCount]);

  const fetchClearanceData = useCallback(async () => {
    setIsLoading(true);
    console.log('[ClearanceHiring] Fetching clearance data:', {
      tab: 'clearance',
      period: activeFilter,
      search: debouncedSearchQuery,
      limit: itemsPerPage,
      offset: startIndex
    });
    
    try {
      const res = await applicantsApi.directory({
        tab: 'clearance',
        period: activeFilter,
        search: debouncedSearchQuery,
        limit: itemsPerPage,
        offset: startIndex,
      });
      
      if (res?.success && res?.data) {
        const clearanceItems: ClearanceItem[] = res.data.map((applicant: any) => ({
          id: applicant.id,
          name: applicant.name,
          progress: applicant.completionPercent ?? 60,
        }));
        setItems(clearanceItems);
        setTotalCount(res?.pagination?.count ?? 0);
        // Reset error toast guard on successful load
        errorToastShownRef.current = false;
      } else {
        setItems([]);
        setTotalCount(0);
      }
    } catch (error: any) {
      console.error('[ClearanceHiring] Error fetching clearance data:', error);
      const is404 = error?.response?.status === 404;
      const isNetwork = error?.code === 'ERR_NETWORK' || (error?.message || '').toLowerCase().includes('network');
      const description = isNetwork
        ? 'Unable to connect to the database. Please check your network connection.'
        : is404
          ? 'Clearance endpoint not found. Please contact your administrator.'
          : (error instanceof Error ? error.message : 'Failed to load clearance applicants from database');
      // Show toast only once per failure cycle
      if (!errorToastShownRef.current) {
        toast({ title: 'Database Error', variant: 'destructive', description });
        errorToastShownRef.current = true;
      }
      setItems([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter, debouncedSearchQuery, startIndex, toast]);

  // Debounce search query to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 when debounced search query or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, activeFilter]);

  // Fetch clearance data when debounced search, filter, or page changes
  useEffect(() => {
    fetchClearanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery, activeFilter, currentPage]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await agencyApplicantsExtraApi.approveForHire(id);
      toast({
        title: "Success",
        description: "Applicant approved for hire",
      });
      // Refresh the list after approval
      fetchClearanceData();
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
      toast({
        title: "Success",
        description: "Applicant clearance rejected",
      });
      // Refresh the list after rejection
      fetchClearanceData();
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

  const handleBackToDirectory = () => {
    navigate(Routes.agency.applicantDirectory);
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToDirectory}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-[28px] font-bold text-[#10141a]">Applicant's directory</h1>
        </div>
      </div>

      {/* Subheader and Filters */}
      <div className="relative p-4 overflow-hidden rounded-[24px] backdrop-blur-[50px] bg-[rgba(255,255,255,0.4)] shadow-sm"
            >
      <div className="flex flex-wrap items-center justify-between gap-4 ">
        <div>
          <h2 className="text-[20px] font-semibold text-[#10141a]">Clearance & Hiring Toggle</h2>
          <p className="text-[14px] text-[#808081]">These are your Pending Applicant</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <Input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-[200px] rounded-lg border-gray-200 focus:border-[#00b3ad] focus:ring-[#00b3ad]"
            />
          </div>

          {/* Filter Buttons */}
          <Button
            variant={activeFilter === "today" ? "default" : "outline"}
            onClick={() => setActiveFilter("today")}
            className={`rounded-full px-5 py-2 ${
              activeFilter === "today"
                ? "bg-[#00b3ad] text-white hover:bg-[#00a39f]"
                : "bg-white text-[#808081] border-gray-200 hover:bg-gray-50"
            }`}
          >
            Today
          </Button>
          <Button
            variant={activeFilter === "week" ? "default" : "outline"}
            onClick={() => setActiveFilter("week")}
            className={`rounded-full px-5 py-2 ${
              activeFilter === "week"
                ? "bg-[#00b3ad] text-white hover:bg-[#00a39f]"
                : "bg-white text-[#808081] border-gray-200 hover:bg-gray-50"
            }`}
          >
            This Week
          </Button>
          <Button
            variant={activeFilter === "month" ? "default" : "outline"}
            onClick={() => setActiveFilter("month")}
            className={`rounded-full px-5 py-2 ${
              activeFilter === "month"
                ? "bg-[#00b3ad] text-white hover:bg-[#00a39f]"
                : "bg-white text-[#808081] border-gray-200 hover:bg-gray-50"
            }`}
          >
            This month
          </Button>
        </div>
      </div>

      {/* Applicant List */}
      <div className="mt-6 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">No clearance applicants found</div>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0"
            >
              {/* Name and Progress Bar */}
              <div className="flex-1 max-w-[300px]">
                <p className="text-[16px] font-medium text-[#10141a] mb-2">{item.name}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 overflow-hidden bg-gray-200 rounded-full">
                    <div 
                      className="h-full bg-[#00b3ad] rounded-full transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 ml-6">
              <Button
                onClick={() => handleApprove(item.id)}
                disabled={actionLoading === item.id}
                className="bg-[#10b981] hover:bg-[#059669] text-white rounded-full px-6 py-2 flex items-center gap-2 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                {actionLoading === item.id ? 'Processing...' : 'Approve'}
              </Button>
              <Button
                onClick={() => handleCancel(item.id)}
                disabled={actionLoading === item.id}
                className="bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-full px-6 py-2 flex items-center gap-2 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                {actionLoading === item.id ? 'Processing...' : 'Cancel'}
              </Button>
            </div>
          </div>
        ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-3 pt-4">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-[14px] text-gray-600 font-medium">
          {currentPage}/{totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>  
    </div>
  );
}

export default ClearanceHiring;
