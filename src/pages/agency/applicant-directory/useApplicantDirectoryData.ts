import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { applicantsApi, Applicant } from "@/lib/api/applicants";

export type PeriodFilter = "today" | "week" | "month";

const ITEMS_PER_PAGE = 6;

interface UseApplicantDirectoryDataResult {
  applicants: Applicant[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  searchQuery: string;
  activeTab: PeriodFilter;
  setSearchQuery: (value: string) => void;
  setActiveTab: (value: PeriodFilter) => void;
  goToPage: (page: number) => void;
}

export function useApplicantDirectoryData(): UseApplicantDirectoryDataResult {
  const { toast } = useToast();
  const toastRef = useRef(toast);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<PeriodFilter>("today");
  const [isLoading, setIsLoading] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const errorToastShownRef = useRef(false);

  // Keep latest toast function in a ref so it doesn't force refetch effect
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const startIndex = useMemo(
    () => (currentPage - 1) * ITEMS_PER_PAGE,
    [currentPage]
  );

  const totalPages = useMemo(
    () => (totalCount > 0 ? Math.ceil(totalCount / ITEMS_PER_PAGE) : 0),
    [totalCount]
  );

  const fetchApplicants = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await applicantsApi.directory({
        tab: "all",
        period: activeTab,
        search: debouncedSearchQuery,
        limit: ITEMS_PER_PAGE,
        offset: startIndex,
      });

      const loaded = res?.data ?? [];
      setApplicants(loaded);
      setTotalCount(res?.pagination?.count ?? 0);
      errorToastShownRef.current = false;
    } catch (error: any) {
      const is404 = error?.response?.status === 404;
      const isNetwork =
        error?.code === "ERR_NETWORK" ||
        (error?.message || "").toLowerCase().includes("network");
      const description = isNetwork
        ? "Unable to connect to the database. Please check your network connection."
        : is404
        ? "Applicants endpoint not found. Please contact your administrator."
        : error instanceof Error
        ? error.message
        : "Failed to load applicants from database";

      if (!errorToastShownRef.current) {
        toastRef.current({
          title: "Database Error",
          variant: "destructive",
          description,
        });
        errorToastShownRef.current = true;
      }

      setApplicants([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, debouncedSearchQuery, startIndex]);

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
  }, [fetchApplicants]);

  const goToPage = (page: number) => {
    setCurrentPage((prev) => {
      if (page < 1) return 1;
      if (totalPages > 0 && page > totalPages) return totalPages;
      return page;
    });
  };

  return {
    applicants,
    isLoading,
    currentPage,
    totalPages,
    searchQuery,
    activeTab,
    setSearchQuery,
    setActiveTab,
    goToPage,
  };
}

