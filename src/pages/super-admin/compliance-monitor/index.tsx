import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  buildScopedComplianceQuery,
  parseComplianceMonitorScope,
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
  const [activeTab, setActiveTab] =
    useState<ComplianceCategory>("documents");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [sendingIssueIds, setSendingIssueIds] = useState<Set<string>>(
    () => new Set(),
  );
  const location = useLocation();
  const navigate = useNavigate();
  const agencyScope = parseComplianceMonitorScope(location.search);
  const queryParams = buildScopedComplianceQuery(
    { page: currentPage, limit: ITEMS_PER_PAGE },
    agencyScope,
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

  const clearAgencyScope = () => {
    setCurrentPage(1);
    setExpandedIssueId(null);
    navigate(location.pathname, { replace: true });
  };

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

      {agencyScope && (
        <section
          aria-label="Applied agency filter"
          className="flex flex-col gap-4 rounded-2xl border border-[#99E0E2] bg-[#EDFAFA] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#007F83]">
              Agency filter applied
            </p>
            <p className="mt-1 font-semibold text-[#10141A]">
              Showing compliance issues for {agencyScope.agencyName}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={clearAgencyScope}
            className="h-11 w-full border-[#99E0E2] bg-white text-[#007F83] hover:bg-[#E5F8F8] sm:w-auto"
          >
            <X aria-hidden="true" />
            Clear agency filter
          </Button>
        </section>
      )}

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
