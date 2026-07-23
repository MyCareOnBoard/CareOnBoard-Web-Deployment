import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/ui/search-select";
import { useListAllAgenciesQuery } from "@/pages/super-admin/agencies/api";
import { Routes } from "@/routes/constants";
import {
  type ComplianceCategory,
  type ComplianceIssue,
  useGetComplianceDocumentsQuery,
  useGetComplianceEvvQuery,
  useGetComplianceNotesQuery,
  useGetComplianceOthersQuery,
  useSendClientComplianceAlertMutation,
  useSendComplianceAlertMutation,
} from "./complianceApi";
import {
  buildComplianceMonitorLocationSearch,
  buildScopedComplianceQuery,
  parseComplianceMonitorScope,
  parseComplianceMonitorTextSearch,
} from "./complianceMonitorScope";
import ComplianceIssueRow from "./components/ComplianceIssueRow";
import {
  ComplianceMonitorError,
  ComplianceMonitorSkeleton,
} from "./components/ComplianceMonitorStates";

const ITEMS_PER_PAGE = 10;

const CATEGORY_META: Record<
  ComplianceCategory,
  { tab: string; title: string; subtitle: string; empty: string }
> = {
  documents: {
    tab: "Documents",
    title: "Document alerts",
    subtitle: "Employee documents and client Form 485 issues",
    empty: "No document compliance issues found.",
  },
  notes: {
    tab: "Notes",
    title: "Note alerts",
    subtitle: "Documentation issues requiring agency attention",
    empty: "No note compliance issues found.",
  },
  evv: {
    tab: "EVV",
    title: "EVV alerts",
    subtitle: "Electronic visit verification issues",
    empty: "No EVV compliance issues found.",
  },
  others: {
    tab: "Other issues",
    title: "Other alerts",
    subtitle: "Other compliance issues across the network",
    empty: "No other compliance issues found.",
  },
};

const CATEGORIES = Object.keys(CATEGORY_META) as ComplianceCategory[];

export default function ComplianceMonitor() {
  const location = useLocation();
  const navigate = useNavigate();
  const agencyScope = parseComplianceMonitorScope(location.search);
  const urlTextSearch = parseComplianceMonitorTextSearch(location.search);
  const [activeTab, setActiveTab] =
    useState<ComplianceCategory>("documents");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [sendingIssueIds, setSendingIssueIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [searchInput, setSearchInput] = useState(urlTextSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlTextSearch);
  const agencyQuery = useListAllAgenciesQuery({
    limit: 100,
    status: "active",
  });
  const agencyOptions = useMemo(() => {
    const options = (agencyQuery.data?.agencies ?? [])
      .filter((agency) => agency.status === "active")
      .map((agency) => ({ value: agency.id, label: agency.name }))
      .sort((left, right) => left.label.localeCompare(right.label));

    if (
      agencyScope &&
      !options.some((option) => option.value === agencyScope.agencyId)
    ) {
      options.unshift({
        value: agencyScope.agencyId,
        label: agencyScope.agencyName,
      });
    }

    return options;
  }, [
    agencyQuery.data?.agencies,
    agencyScope?.agencyId,
    agencyScope?.agencyName,
  ]);

  useEffect(() => {
    setSearchInput(urlTextSearch);
    setDebouncedSearch(urlTextSearch);
  }, [urlTextSearch]);

  useEffect(() => {
    const normalizedSearch = searchInput.trim();
    if (normalizedSearch === debouncedSearch) return;

    const timer = window.setTimeout(() => {
      setDebouncedSearch(normalizedSearch);
      setCurrentPage(1);
      setExpandedIssueId(null);
      const nextSearch = buildComplianceMonitorLocationSearch({
        scope: agencyScope,
        search: normalizedSearch,
      });
      if (nextSearch !== location.search) {
        navigate(`${location.pathname}${nextSearch}`, { replace: true });
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [
    agencyScope?.agencyId,
    agencyScope?.agencyName,
    debouncedSearch,
    location.pathname,
    location.search,
    navigate,
    searchInput,
  ]);

  const queryParams = buildScopedComplianceQuery(
    { page: currentPage, limit: ITEMS_PER_PAGE },
    agencyScope,
    debouncedSearch,
  );

  const documentsQuery = useGetComplianceDocumentsQuery(queryParams, {
    skip: activeTab !== "documents",
  });
  const notesQuery = useGetComplianceNotesQuery(queryParams, {
    skip: activeTab !== "notes",
  });
  const evvQuery = useGetComplianceEvvQuery(queryParams, {
    skip: activeTab !== "evv",
  });
  const othersQuery = useGetComplianceOthersQuery(queryParams, {
    skip: activeTab !== "others",
  });
  const currentQuery = {
    documents: documentsQuery,
    notes: notesQuery,
    evv: evvQuery,
    others: othersQuery,
  }[activeTab];

  const [sendAlert] = useSendComplianceAlertMutation();
  const [sendClientAlert] = useSendClientComplianceAlertMutation();
  const currentData = currentQuery.data?.data ?? [];
  const pagination = currentQuery.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const categoryMeta = CATEGORY_META[activeTab];

  const handleTabChange = (tab: ComplianceCategory) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setExpandedIssueId(null);
  };

  const changePage = (page: number) => {
    setCurrentPage(page);
    setExpandedIssueId(null);
  };

  const navigateWithFilters = (
    scope: typeof agencyScope,
    search = searchInput,
  ) => {
    const nextSearch = buildComplianceMonitorLocationSearch({ scope, search });
    navigate(`${location.pathname}${nextSearch}`, { replace: true });
  };

  const handleAgencyChange = (agencyId: string) => {
    const selectedAgency = agencyOptions.find(
      (option) => option.value === agencyId,
    );
    const nextScope = selectedAgency
      ? { agencyId: selectedAgency.value, agencyName: selectedAgency.label }
      : null;

    setCurrentPage(1);
    setExpandedIssueId(null);
    navigateWithFilters(nextScope);
  };

  const clearAgencyScope = () => {
    setCurrentPage(1);
    setExpandedIssueId(null);
    navigateWithFilters(null);
  };

  const clearSearch = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setCurrentPage(1);
    setExpandedIssueId(null);
    navigateWithFilters(agencyScope, "");
  };

  const clearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setCurrentPage(1);
    setExpandedIssueId(null);
    navigate(location.pathname, { replace: true });
  };

  const hasFilters = Boolean(agencyScope || searchInput.trim());

  const handleSendAlert = async (issue: ComplianceIssue) => {
    if (sendingIssueIds.has(issue.id)) return;
    const clientId =
      issue.subjectType === "client" ? issue.clientId : undefined;
    if (issue.subjectType === "client" && !clientId) {
      toast.error("Client information is unavailable");
      return;
    }

    setSendingIssueIds((current) => new Set(current).add(issue.id));
    try {
      if (clientId) {
        const response = await sendClientAlert({ clientId }).unwrap();
        const administratorLabel =
          response.data.notifiedCount === 1
            ? "agency administrator"
            : "agency administrators";
        const skippedLabel =
          response.data.skippedCount === 1
            ? "administrator"
            : "administrators";
        const skippedCopy = response.data.skippedCount
          ? `; ${response.data.skippedCount} ${skippedLabel} could not receive it`
          : "";
        toast.success(
          `Alert sent to ${response.data.notifiedCount} ${administratorLabel}${skippedCopy}`,
        );
      } else {
        await sendAlert({
          userId: issue.userId,
          category: activeTab,
          issueType: issue.issueType,
          documentType: issue.documentType,
          details: issue.details,
        }).unwrap();
        toast.success("Compliance alert sent successfully");
      }
    } catch (error: unknown) {
      const message = (error as { data?: { error?: string } })?.data?.error;
      toast.error(message || "Failed to send alert");
    } finally {
      setSendingIssueIds((current) => {
        const next = new Set(current);
        next.delete(issue.id);
        return next;
      });
    }
  };

  const handleSeeDoc = (issue: ComplianceIssue) => {
    window.open(issue.fileUrl, "_blank", "noopener,noreferrer");
  };

  const handleViewClient = (issue: ComplianceIssue) => {
    if (!issue.clientId) return;
    navigate(
      Routes.superAdmin.clientDetails.replace(":clientId", issue.clientId),
    );
  };

  return (
    <main className="min-w-0 space-y-6 font-['Urbanist']">
      <header>
        <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#00B4B8]">
          Compliance operations
        </p>
        <h1 className="mt-1 text-[clamp(1.875rem,4vw,2.5rem)] font-bold leading-tight text-[#10141A]">
          Compliance monitor
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">
          Review compliance issues and notify the right agency team.
        </p>
      </header>

      <section
        aria-label="Compliance filters"
        className="rounded-2xl border border-[#E6EAEC] bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.72fr)_auto] lg:items-end">
          <div className="min-w-0">
            <label
              htmlFor="compliance-search"
              className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280]"
            >
              Search issues
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#808081]"
              />
              <input
                id="compliance-search"
                type="search"
                aria-label="Search compliance issues"
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                  setCurrentPage(1);
                  setExpandedIssueId(null);
                }}
                placeholder="Search by name, email, or agency"
                className="h-12 w-full rounded-xl border border-[#DCE3E5] bg-[#F8FAFA] py-3 pl-10 pr-11 text-sm text-[#10141A] outline-none transition placeholder:text-[#9AA1A6] focus:border-[#00B4B8] focus:bg-white focus:ring-2 focus:ring-[#00B4B8]/15"
              />
              {searchInput && (
                <button
                  type="button"
                  aria-label="Clear compliance search"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-[#6B7280] transition hover:bg-[#E8F7F7] hover:text-[#007F83] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B4B8]"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
              Agency
            </label>
            <SearchSelect
              options={agencyOptions}
              value={agencyScope?.agencyId || ""}
              onChange={handleAgencyChange}
              placeholder={
                agencyQuery.isLoading ? "Loading agencies..." : "All agencies"
              }
              searchPlaceholder="Search active agencies"
              emptyMessage="No active agencies found"
              disabled={agencyQuery.isLoading || agencyQuery.isError}
            />
            {agencyQuery.isError && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#A13D2D]">
                <span>Couldn't load agencies.</span>
                <button
                  type="button"
                  aria-label="Retry agency filter"
                  onClick={() => void agencyQuery.refetch()}
                  className="font-semibold text-[#007F83] underline decoration-[#99E0E2] underline-offset-2"
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          {hasFilters && (
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className="h-12 w-full border-[#CFE4E5] bg-white text-[#007F83] hover:bg-[#EDFAFA] lg:w-auto"
            >
              <X aria-hidden="true" />
              Clear filters
            </Button>
          )}
        </div>

        {agencyScope && (
          <div className="mt-4 flex flex-col gap-3 border-t border-[#E6EAEC] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-[#36595A]" aria-live="polite">
              Showing compliance issues for {agencyScope.agencyName}
            </p>
            <button
              type="button"
              onClick={clearAgencyScope}
              className="w-fit text-sm font-semibold text-[#007F83] underline decoration-[#99E0E2] underline-offset-4"
            >
              Clear agency only
            </button>
          </div>
        )}
      </section>
      <div
        role="tablist"
        aria-label="Compliance issue categories"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      >
        {CATEGORIES.map((category) => {
          const active = activeTab === category;
          return (
            <Button
              key={category}
              id={`compliance-tab-${category}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="compliance-results"
              variant={active ? "default" : "outline"}
              onClick={() => handleTabChange(category)}
              className={
                "h-11 shrink-0 " +
                (active
                  ? "border border-[#00B4B8]"
                  : "border-[#E6EAEC] bg-white text-[#6B7280] hover:bg-[#F5F7F8] hover:text-[#10141A]")
              }
            >
              {CATEGORY_META[category].tab}
            </Button>
          );
        })}
      </div>

      <section
        id="compliance-results"
        role="tabpanel"
        aria-labelledby={`compliance-tab-${activeTab}`}
        className="rounded-[32px] border border-[#E8ECEF] bg-white/80 p-4 shadow-sm sm:p-6"
      >
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[22px] font-bold text-[#10141A]">
              {categoryMeta.title}
            </h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              {categoryMeta.subtitle}
            </p>
          </div>
          {pagination && (
            <span className="w-fit rounded-full bg-[#EDFAFA] px-3 py-1.5 text-xs font-semibold text-[#007F83]">
              {pagination.total} {pagination.total === 1 ? "issue" : "issues"}
            </span>
          )}
        </div>

        {currentQuery.isLoading ? (
          <ComplianceMonitorSkeleton />
        ) : currentQuery.isError ? (
          <ComplianceMonitorError
            message={`We couldn't load ${categoryMeta.title.toLowerCase()}.`}
            retryLabel={`Retry ${categoryMeta.title.toLowerCase()}`}
            onRetry={() => void currentQuery.refetch()}
          />
        ) : currentData.length === 0 ? (
          <div className="rounded-2xl border border-[#E6EAEC] bg-[#F5F7F8] p-6 text-center text-sm text-[#6B7280]">
            {categoryMeta.empty}
          </div>
        ) : (
          <div className="space-y-3">
            {currentData.map((issue) => (
              <ComplianceIssueRow
                key={issue.id}
                issue={issue}
                category={activeTab}
                expanded={expandedIssueId === issue.id}
                sending={sendingIssueIds.has(issue.id)}
                onToggle={() =>
                  setExpandedIssueId((current) =>
                    current === issue.id ? null : issue.id,
                  )
                }
                onViewDocument={handleSeeDoc}
                onViewClient={handleViewClient}
                onSendAlert={handleSendAlert}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav
            aria-label="Compliance pagination"
            className="mt-6 flex items-center justify-center gap-3"
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Previous compliance page"
              disabled={currentPage === 1}
              onClick={() => changePage(Math.max(1, currentPage - 1))}
              className="border-[#E6EAEC] bg-white text-[#10141A]"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <p className="min-w-16 text-center text-sm font-semibold text-[#10141A]">
              {currentPage}{" "}
              <span className="font-normal text-[#808081]">
                of {totalPages}
              </span>
            </p>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Next compliance page"
              disabled={currentPage === totalPages}
              onClick={() =>
                changePage(Math.min(totalPages, currentPage + 1))
              }
              className="border-[#E6EAEC] bg-white text-[#10141A]"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </nav>
        )}
      </section>
    </main>
  );
}
