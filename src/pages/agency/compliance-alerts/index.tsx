import { useState, useEffect } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Search, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Routes } from "@/routes/constants";
import { useGetExpiredDocumentsQuery, useGetUnsignedForm485ClientsQuery } from "./api";
import { ExpiredDocument } from "./apiTypes";
import { useAuth } from "@/utils/auth";
import { sendDocumentAlert } from "@/lib/api/employee-documents";
import { useToast } from "@/hooks/use-toast";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";

type StatusFilter = "all" | "active" | "inactive";

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// Shared grid template so the header, rows, and skeleton stay aligned.
const GRID_COLS =
  "md:grid-cols-[minmax(140px,2fr)_100px_minmax(95px,1fr)_minmax(140px,1.6fr)_120px]";
const HEADERS = ["Name", "Status", "Document", "Issue", "Action"];

function AlertRowsSkeleton() {
  return (
    <div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`grid grid-cols-1 gap-3 border-b border-[#e5e5e6] px-4 py-4 last:border-b-0 md:items-center ${GRID_COLS}`}
        >
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function ComplianceAlertsPage() {
  const navigate = useNavigate();
  const mode = useEffectiveAgencyMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [alertingDocId, setAlertingDocId] = useState<string | null>(null);
  const itemsPerPage = 10;

  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch expired employee documents (backend scopes to the active DDD/HHA view).
  // refetchOnMountOrArgChange keeps the skeleton showing on every mode switch,
  // even when that mode's data is already cached.
  const { data: docsData, isFetching: docsFetching, isError: docsError, refetch: refetchDocs } =
    useGetExpiredDocumentsQuery(
      { agencyId: user?.agencyId ?? "", mode: mode ?? undefined },
      { skip: !user?.agencyId, refetchOnMountOrArgChange: true }
    );
  const expiredDocuments = docsData?.data || [];

  // Fetch clients currently on an unsigned Form 485 (backend returns none in DDD view).
  const { data: clientsData, isFetching: clientsFetching, isError: clientsError, refetch: refetchClients } =
    useGetUnsignedForm485ClientsQuery(
      { agencyId: user?.agencyId ?? "", mode: mode ?? undefined },
      { skip: !user?.agencyId, refetchOnMountOrArgChange: true }
    );
  const unsignedClients = clientsData?.data || [];

  // isFetching (not isLoading) so the skeleton also shows on mode-change refetches.
  const isLoading = docsFetching || clientsFetching;
  // Only a hard error when BOTH sources fail; otherwise show whatever loaded.
  const isError = docsError && clientsError;

  // Combined compliance list: expired employee documents + unsigned-485 clients.
  // Both sources are already scoped to the active DDD/HHA view by the backend.
  const documentAlerts = expiredDocuments
    .map((doc) => ({
      kind: "document" as const,
      id: doc.id,
      name: doc.employee.fullName,
      role: doc.employee.role,
      status: doc.employee.status.charAt(0).toUpperCase() + doc.employee.status.slice(1),
      document: doc.documentType,
      issue: `Expired ${doc.daysExpired} day${doc.daysExpired !== 1 ? "s" : ""} ago`,
    }));

  const clientAlerts = unsignedClients.map((c) => ({
    kind: "client485" as const,
    id: c.id,
    name: c.name,
    role: "Client",
    status: c.status === "active" ? "Active" : "Inactive",
    document: "Form 485",
    issue: c.deactivated
      ? "Deactivated — signed 485 overdue"
      : c.daysLeft == null
        ? "Unsigned"
        : c.daysLeft <= 0
          ? "Unsigned — overdue"
          : `Unsigned — ${c.daysLeft} day${c.daysLeft !== 1 ? "s" : ""} left`,
  }));

  const complianceAlerts = [...documentAlerts, ...clientAlerts];

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  const filteredAlerts = complianceAlerts.filter((alert) => {
    const matchesSearch =
      alert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.document.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || alert.status.toLowerCase() === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentAlerts = filteredAlerts.slice(startIndex, startIndex + itemsPerPage);

  const handleSendAlert = async (doc: ExpiredDocument) => {
    try {
      setAlertingDocId(doc.id);
      await sendDocumentAlert(doc.employeeId, doc.id);
      toast({
        title: "Alert sent",
        description: `An alert has been sent to ${doc.employee.fullName} about their expired document.`,
      });
    } catch (error) {
      console.error("Failed to send document alert:", error);
      toast({
        title: "Couldn't send alert",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAlertingDocId(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-0">
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(Routes.agency.dashboard)}
          className="flex cursor-pointer items-center justify-center rounded-full border-0 bg-white backdrop-blur-sm transition-colors hover:bg-[#f0fbfb]"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-[28px] font-bold leading-[1.4] text-[#10141a] sm:text-[32px] lg:text-[40px]">
          Compliance Alerts
        </h1>
      </div>

      <div className="min-w-0 overflow-hidden rounded-xl border border-white bg-[#FFFFFF4D] shadow-sm sm:rounded-2xl">
        {/* Header + search + filters */}
        <div className="border-b border-[#e5e7eb] p-4 sm:p-6">
          <div>
            <div>
              <h2 className="text-[18px] font-bold leading-[1.4] text-[#10141a] sm:text-[20px]">
                Compliance Alerts
              </h2>
              <p className="mt-1 text-[13px] font-medium text-[#808081] sm:text-[14px]">
                Expiring documents and clients needing a signed Form 485
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:w-[240px] sm:flex-none">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#808081]" />
                <input
                  type="search"
                  placeholder="Search name or document"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-[#e5e5e6] bg-white py-2 pl-10 pr-4 text-[14px] outline-none transition-colors placeholder:text-[#808081] focus:border-[#00b4b8]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {STATUS_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setFilterStatus(filter.value)}
                    className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                      filterStatus === filter.value
                        ? "bg-[#00b4b8] text-white"
                        : "border border-[#e5e5e6] bg-white text-[#10141a] hover:border-[#00b4b8]"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="overflow-x-auto">
            <div className={`hidden gap-3 border-b border-[#e5e5e6] bg-[#f9fafb] px-4 py-3 md:grid ${GRID_COLS}`}>
              {HEADERS.map((label) => (
                <div key={label} className="text-[12px] font-semibold uppercase text-[#808081]">
                  {label}
                </div>
              ))}
            </div>
            <AlertRowsSkeleton />
          </div>
        ) : isError ? (
          <div className="p-8 text-center sm:p-12">
            <p className="text-[14px] font-semibold text-[#ef4444]">Couldn&apos;t load compliance alerts</p>
            <button
              type="button"
              onClick={() => {
                refetchDocs();
                refetchClients();
              }}
              className="mt-2 text-[13px] text-[#00b4b8] underline"
            >
              Try again
            </button>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-8 text-center sm:p-12">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ecfdf3]">
              <ShieldCheck className="h-7 w-7 text-[#12b76a]" />
            </div>
            <p className="text-[14px] font-semibold text-[#10141a]">
              {complianceAlerts.length === 0 ? "All clear" : "No alerts match your filters"}
            </p>
            <p className="mt-1 text-[13px] text-[#6b7280]">
              {complianceAlerts.length === 0
                ? "No expiring documents or clients needing a signed Form 485."
                : "Try changing your search or status filter"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop column headers */}
            <div className={`hidden gap-3 border-b border-[#e5e5e6] bg-[#f9fafb] px-4 py-3 md:grid ${GRID_COLS}`}>
              {HEADERS.map((label) => (
                <div key={label} className="text-[12px] font-semibold uppercase text-[#808081]">
                  {label}
                </div>
              ))}
            </div>

            {currentAlerts.map((alert) => {
              const rowSending = alertingDocId === alert.id;
              return (
                <div
                  key={alert.id}
                  className={`grid grid-cols-1 gap-3 border-b border-[#e5e5e6] px-4 py-4 transition-colors last:border-b-0 hover:bg-white/50 md:items-center ${GRID_COLS}`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold text-[#10141a]">{alert.name}</div>
                    <div className="text-[12px] font-medium capitalize text-[#808081]">{alert.role}</div>
                  </div>

                  <div>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${
                        alert.status === "Active"
                          ? "border-[#0EAF52] bg-[#0EAF521A] text-[#0EAF52]"
                          : "border-[#808081] bg-[#8080801A] text-[#808081]"
                      }`}
                    >
                      {alert.status}
                    </span>
                  </div>

                  <div className="text-[14px] font-medium text-[#10141a]">
                    <span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Document</span>
                    {alert.document}
                  </div>

                  <div className="text-[14px] font-medium text-[#d53411]">
                    <span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Issue</span>
                    {alert.issue}
                  </div>

                  <div className="md:justify-self-start">
                    {alert.kind === "client485" ? (
                      <button
                        type="button"
                        onClick={() => navigate(Routes.agency.clientDetails.replace(":clientId", alert.id))}
                        className="rounded-full border border-[#00b4b8] bg-[#00b4b8] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#009da1]"
                      >
                        View Client
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const doc = expiredDocuments.find((d) => d.id === alert.id);
                          if (doc) handleSendAlert(doc);
                        }}
                        disabled={rowSending}
                        className="rounded-full border border-red-500 bg-red-500 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {rowSending ? "Sending…" : "Send Alert"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {filteredAlerts.length > itemsPerPage && (
          <div className="flex items-center justify-center gap-3 py-4">
            <span className="text-[14px] font-medium text-[#10141a]">
              {currentPage}/<span className="text-[#808081]">{totalPages}</span>
            </span>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => currentPage > 1 && setCurrentPage((prev) => prev - 1)}
              className="rounded-full bg-white p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} className="text-[#10141a]" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => currentPage < totalPages && setCurrentPage((prev) => prev + 1)}
              className="rounded-full bg-white p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Next page"
            >
              <ChevronRight size={16} className="text-[#10141a]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
