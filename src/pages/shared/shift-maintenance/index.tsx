import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/ui/search-select";
import { Skeleton } from "@/components/ui/skeleton";
import ShiftDateRangeControl, { type ShiftDateRangeValue } from "@/components/shifts/ShiftDateRangeControl";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";
import {
  fetchShiftAnomalies,
  fetchShiftMaintenanceAudit,
  type FetchAnomaliesParams,
  type FetchAuditParams,
  type Shift,
  type ShiftAnomaly,
  type ShiftAuditRecord,
} from "@/lib/api/shifts";
import type { OperationalAgencySummary } from "@/lib/operational-agency/types";
import { Routes } from "@/routes/constants";
import { listAgencies } from "@/lib/api/agencies";
import {
  ACTION_LABELS,
  ANOMALY_LABELS,
  ROLE_LABELS,
  anomalyClientLabel,
  anomalyDspLabel,
  formatShiftAuditTimestamp,
  summarizeChanges,
} from "@/pages/shared/shift-maintenance/audit-display";
import { resolveShiftMaintenanceDateRange } from "./shiftMaintenanceDateRange";

const ShiftDetailsModal = lazy(() => import("@/components/ShiftDetailsModal"));

type TabKey = "anomalies" | "audit";

interface ShiftMaintenancePageProps {
  isSuperAdmin?: boolean;
  embedded?: boolean;
  agencies?: OperationalAgencySummary[];
}

function isAbort(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; name?: string };
  return candidate.code === "ERR_CANCELED"
    || candidate.name === "CanceledError"
    || candidate.name === "AbortError";
}

function shiftAnomalyToStub(anomaly: ShiftAnomaly): Shift {
  return {
    id: anomaly.id,
    agencyId: anomaly.agencyId,
    date: anomaly.date,
    startTime: anomaly.startTime ?? undefined,
    endTime: anomaly.endTime ?? undefined,
    status: anomaly.status,
    employeeId: anomaly.employeeId,
    clientId: anomaly.clientId,
    assignedDsp: anomaly.assignedDsp,
    clientName: anomaly.clientName,
  } as Shift;
}

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, value]);
  return debounced;
}

function TableSkeleton({ columns }: { columns: number }) {
  return (
    <tbody aria-busy="true" aria-label="Loading maintenance table">
      {Array.from({ length: 6 }).map((_, rowIndex) => (
        <tr key={rowIndex} data-testid="maintenance-table-skeleton-row" className="border-b border-[#edf0f1] last:border-b-0">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <td key={columnIndex} className="px-4 py-4">
              <Skeleton className={`h-4 rounded ${columnIndex === columns - 1 ? "ml-auto w-8" : columnIndex === 0 ? "w-32" : "w-20"}`} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

function EmptyTable({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f1f6f6] text-[#7d9697]">
        <ClipboardList className="h-6 w-6" aria-hidden />
      </span>
      <p className="mt-4 text-sm font-semibold text-[#10141a]">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[13px] leading-5 text-[#6b7280]">{description}</p>
    </div>
  );
}

function TableError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="px-6 py-14 text-center">
      <AlertTriangle className="mx-auto h-6 w-6 text-[#d53411]" aria-hidden />
      <p className="mt-3 text-sm font-semibold text-[#7f1d1d]">{message}</p>
      <Button type="button" variant="outline" className="mt-4 rounded-full" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" aria-hidden />
        Try again
      </Button>
    </div>
  );
}

function Pagination({
  page,
  hasNext,
  onFirst,
  onNext,
}: {
  page: number;
  hasNext: boolean;
  onFirst: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-[#e5e7eb] bg-[#fbfcfc] px-4 py-3">
      <span className="text-xs font-medium text-[#6b7280]">Page {page + 1}</span>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="h-9 w-9 rounded-lg p-0" disabled={page === 0} onClick={onFirst} aria-label="First page">
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-9 w-9 rounded-lg p-0" disabled={!hasNext} onClick={onNext} aria-label="Next page">
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

export default function ShiftMaintenancePage({
  isSuperAdmin = false,
  embedded = false,
  agencies: suppliedAgencies = [],
}: ShiftMaintenancePageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("anomalies");
  const [dateRange, setDateRange] = useState(() => resolveShiftMaintenanceDateRange(location.search));
  const [agencyFilter, setAgencyFilter] = useState(() => new URLSearchParams(location.search).get("agencyId") ?? "");
  const [agencySearchQuery, setAgencySearchQuery] = useState("");
  const debouncedAgencySearch = useDebounce(agencySearchQuery, 350);
  const [loadedAgencies, setLoadedAgencies] = useState<OperationalAgencySummary[]>([]);
  const [agenciesLoading, setAgenciesLoading] = useState(false);

  const [anomalies, setAnomalies] = useState<ShiftAnomaly[]>([]);
  const [anomaliesLoading, setAnomaliesLoading] = useState(true);
  const [anomalyError, setAnomalyError] = useState<string | null>(null);
  const [anomaliesCursor, setAnomaliesCursor] = useState<string | null>(null);
  const [anomaliesHasNext, setAnomaliesHasNext] = useState(false);
  const [anomaliesPage, setAnomaliesPage] = useState(0);

  const [audits, setAudits] = useState<ShiftAuditRecord[]>([]);
  const [auditsLoading, setAuditsLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditsCursor, setAuditsCursor] = useState<string | null>(null);
  const [auditsHasNext, setAuditsHasNext] = useState(false);
  const [auditsPage, setAuditsPage] = useState(0);
  const [editShift, setEditShift] = useState<ShiftAnomaly | null>(null);

  const fromDateStr = dateRange.startDate;
  const toDateStr = dateRange.endDate;
  const resolvedAgencyId = isSuperAdmin ? agencyFilter || undefined : user?.agencyId;

  useEffect(() => {
    const nextRange = resolveShiftMaintenanceDateRange(location.search);
    setDateRange((current) => current.startDate === nextRange.startDate && current.endDate === nextRange.endDate
      ? current
      : nextRange);
    if (isSuperAdmin) {
      const nextAgencyId = new URLSearchParams(location.search).get("agencyId") ?? "";
      setAgencyFilter((current) => current === nextAgencyId ? current : nextAgencyId);
    }
  }, [isSuperAdmin, location.search]);

  useEffect(() => {
    if (!isSuperAdmin || embedded) return;
    let cancelled = false;
    setAgenciesLoading(true);
    void listAgencies({ limit: 100, search: debouncedAgencySearch.trim() || undefined })
      .then((response) => {
        if (cancelled) return;
        setLoadedAgencies(response.agencies.map((agency) => ({
          id: agency.id,
          name: (agency.name || "").trim() || "Unnamed agency",
          status: "active",
          supportedClientTypes: agency.supportedClientTypes ?? ["ddd", "hha"],
          timezone: agency.timezone ?? "UTC",
        })));
      })
      .catch(() => {
        if (!cancelled) toast({ title: "Couldn't load agencies", description: "Try again in a moment.", variant: "destructive" });
      })
      .finally(() => {
        if (!cancelled) setAgenciesLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedAgencySearch, embedded, isSuperAdmin, toast]);

  const availableAgencies = useMemo(() => {
    const byId = new Map<string, OperationalAgencySummary>();
    [...loadedAgencies, ...suppliedAgencies].forEach((agency) => byId.set(agency.id, agency));
    return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
  }, [loadedAgencies, suppliedAgencies]);
  const agencyNames = useMemo(() => new Map(availableAgencies.map((agency) => [agency.id, agency.name])), [availableAgencies]);
  const agencyNameFor = useCallback((agencyId?: string | null) => {
    if (!agencyId) return "Unknown agency";
    return agencyNames.get(agencyId) ?? agencyId;
  }, [agencyNames]);

  const loadAnomalies = useCallback(async (cursor?: string | null, signal?: AbortSignal) => {
    if (!fromDateStr || !toDateStr) return;
    setAnomaliesLoading(true);
    setAnomalyError(null);
    try {
      const params: FetchAnomaliesParams = {
        ...(resolvedAgencyId ? { agencyId: resolvedAgencyId } : {}),
        from: fromDateStr,
        to: toDateStr,
        limit: 25,
        startAfter: cursor || undefined,
      };
      const response = await fetchShiftAnomalies(params, { signal });
      if (signal?.aborted) return;
      setAnomalies(response.anomalies);
      setAnomaliesHasNext(response.hasNextPage);
      setAnomaliesCursor(response.nextCursor);
    } catch (error) {
      if (signal?.aborted || isAbort(error)) return;
      setAnomalyError("We couldn't load problem shifts.");
    } finally {
      if (!signal?.aborted) setAnomaliesLoading(false);
    }
  }, [fromDateStr, resolvedAgencyId, toDateStr]);

  const loadAudits = useCallback(async (cursor?: string | null, signal?: AbortSignal) => {
    setAuditsLoading(true);
    setAuditError(null);
    try {
      const params: FetchAuditParams = {
        ...(resolvedAgencyId ? { agencyId: resolvedAgencyId } : {}),
        limit: 25,
        startAfter: cursor || undefined,
      };
      const response = await fetchShiftMaintenanceAudit(params, { signal });
      if (signal?.aborted) return;
      setAudits(response.audits);
      setAuditsHasNext(response.hasNextPage);
      setAuditsCursor(response.nextCursor);
    } catch (error) {
      if (signal?.aborted || isAbort(error)) return;
      setAuditError("We couldn't load activity history.");
    } finally {
      if (!signal?.aborted) setAuditsLoading(false);
    }
  }, [resolvedAgencyId]);

  useEffect(() => {
    const controller = new AbortController();
    setAnomaliesPage(0);
    void loadAnomalies(null, controller.signal);
    return () => controller.abort();
  }, [loadAnomalies]);

  useEffect(() => {
    if (activeTab !== "audit") return;
    const controller = new AbortController();
    setAuditsPage(0);
    void loadAudits(null, controller.signal);
    return () => controller.abort();
  }, [activeTab, loadAudits]);

  const applyDateRange = (range: ShiftDateRangeValue) => {
    setDateRange(range);
    const params = new URLSearchParams(location.search);
    params.set("startDate", range.startDate);
    params.set("endDate", range.endDate);
    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
  };

  const changeAgencyFilter = (agencyId: string) => {
    setAgencyFilter(agencyId);
    const params = new URLSearchParams(location.search);
    if (agencyId) params.set("agencyId", agencyId);
    else params.delete("agencyId");
    params.set("startDate", dateRange.startDate);
    params.set("endDate", dateRange.endDate);
    navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { replace: true });
  };

  const handleCorrectionComplete = () => {
    setEditShift(null);
    setAnomaliesPage(0);
    void loadAnomalies(null);
    if (activeTab === "audit") void loadAudits(null);
  };

  const selectedAgencyName = resolvedAgencyId
    ? agencyNameFor(resolvedAgencyId)
    : user?.agency?.name;
  const agencySelectOptions = availableAgencies.map((agency) => ({
    value: agency.id,
    label: agency.name,
    description: `ID: ${agency.id}`,
  }));
  const activeRows = activeTab === "anomalies" ? anomalies.length : audits.length;

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {!embedded ? (
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!isSuperAdmin ? (
              <button type="button" onClick={() => navigate(Routes.agency.scheduling)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#dce3e3] bg-white transition-colors hover:bg-[#f3f7f7]" aria-label="Back to Shift Management">
                <ArrowLeft className="h-5 w-5 text-[#10141a]" aria-hidden />
              </button>
            ) : null}
            <h1 className="text-[32px] font-semibold leading-tight text-[#10141a] sm:text-[40px]">Shift Maintenance</h1>
          </div>
        </div>
      ) : null}

      {!embedded ? (
        <div className="mb-5 flex flex-wrap items-end gap-4 rounded-2xl border border-[#dce3e3] bg-[#f9fbfb] p-4">
          {isSuperAdmin ? (
            <div className="flex w-64 flex-col gap-1">
              <span className="text-xs font-semibold text-[#5f6b6d]">Agency</span>
              <SearchSelect
                options={agencySelectOptions}
                value={agencyFilter}
                onChange={changeAgencyFilter}
                onSearchChange={setAgencySearchQuery}
                disabled={agenciesLoading}
                placeholder={agenciesLoading ? "Loading agencies…" : "All agencies"}
                searchPlaceholder="Search agencies…"
                emptyMessage="No agencies found."
                className="w-full bg-white"
              />
            </div>
          ) : null}
          <div className="flex min-w-[17rem] flex-1 flex-col gap-1 sm:max-w-sm">
            <span className="text-xs font-semibold text-[#5f6b6d]">Date range</span>
            <ShiftDateRangeControl value={dateRange} onApply={applyDateRange} description="Choose the dates to scan for shift maintenance issues" />
          </div>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => {
            if (activeTab === "anomalies") void loadAnomalies(null);
            else void loadAudits(null);
          }}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh
          </Button>
        </div>
      ) : null}

      <section className="min-w-0 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm" aria-labelledby="maintenance-records-title">
        <div className="border-b border-[#e5e7eb] px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="maintenance-records-title" className="text-[20px] font-bold text-[#10141a] sm:text-[22px]">Maintenance records</h2>
              <p className="mt-1 text-[13px] text-[#6b7280]">
                Review shift exceptions and the administrative history behind them.
              </p>
            </div>
            {!anomaliesLoading && !auditsLoading ? (
              <span className="text-[13px] font-medium text-[#6b7280]">{activeRows} on this page</span>
            ) : null}
          </div>
          <div className="mt-4 flex w-fit rounded-lg bg-[#eef3f3] p-1" role="tablist" aria-label="Maintenance records">
            {([
              ["anomalies", "Problem shifts", AlertTriangle],
              ["audit", "Activity history", ClipboardList],
            ] as const).map(([tab, label, Icon]) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors ${activeTab === tab
                  ? "bg-white text-[#075b5d] shadow-sm"
                  : "text-[#657274] hover:text-[#234f50]"}`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "anomalies" ? (
          anomalyError ? (
            <TableError message={anomalyError} onRetry={() => void loadAnomalies(null)} />
          ) : !anomaliesLoading && anomalies.length === 0 ? (
            <EmptyTable title="No problem shifts in this range" description="Try a different date range. Shifts appear here only when the system records an anomaly." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm" aria-label="Problem shifts">
                <thead className="bg-[#f9fafb] text-[11px] font-semibold uppercase tracking-wide text-[#808081]">
                  <tr>
                    <th scope="col" className="px-4 py-3">Shift</th>
                    {isSuperAdmin ? <th scope="col" className="px-4 py-3">Agency</th> : null}
                    <th scope="col" className="px-4 py-3">Staff</th>
                    <th scope="col" className="px-4 py-3">Time</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Issue</th>
                    <th scope="col" className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                {anomaliesLoading ? <TableSkeleton columns={isSuperAdmin ? 7 : 6} /> : (
                  <tbody>
                    {anomalies.map((anomaly) => {
                      const clientName = anomalyClientLabel(anomaly);
                      return (
                        <tr key={`${anomaly.agencyId}:${anomaly.id}`} className="border-b border-[#edf0f1] transition-colors last:border-b-0 hover:bg-[#fbfcfc]">
                          <td className="px-4 py-4">
                            <p className="font-semibold text-[#10141a]">{clientName}</p>
                            <p className="mt-0.5 text-xs text-[#6b7280]">{anomaly.date}</p>
                          </td>
                          {isSuperAdmin ? <td className="px-4 py-4 text-[#4f5c5e]">{agencyNameFor(anomaly.agencyId)}</td> : null}
                          <td className="px-4 py-4 text-[#4f5c5e]">{anomalyDspLabel(anomaly)}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-[#4f5c5e]">{anomaly.startTime || "—"} – {anomaly.endTime || "—"}</td>
                          <td className="px-4 py-4"><Badge variant="outline" className="capitalize">{anomaly.status}</Badge></td>
                          <td className="px-4 py-4">
                            <div className="flex max-w-[240px] flex-wrap gap-1.5">
                              {anomaly.anomalyCodes.map((code) => (
                                <span key={code} className={`rounded-full px-2 py-1 text-xs font-semibold ${ANOMALY_LABELS[code]?.color || "bg-gray-100 text-gray-600"}`}>
                                  {ANOMALY_LABELS[code]?.label || code}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button type="button" className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[#075b5d] transition-colors hover:bg-[#eaf5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8]" aria-label={`Review ${clientName} shift`} onClick={() => setEditShift(anomaly)}>
                              <Pencil className="h-4 w-4" aria-hidden />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                )}
              </table>
              {!anomaliesLoading ? (
                <Pagination page={anomaliesPage} hasNext={anomaliesHasNext} onFirst={() => {
                  setAnomaliesPage(0);
                  void loadAnomalies(null);
                }} onNext={() => {
                  if (!anomaliesHasNext || !anomaliesCursor) return;
                  setAnomaliesPage((page) => page + 1);
                  void loadAnomalies(anomaliesCursor);
                }} />
              ) : null}
            </div>
          )
        ) : auditError ? (
          <TableError message={auditError} onRetry={() => void loadAudits(null)} />
        ) : !auditsLoading && audits.length === 0 ? (
          <EmptyTable title="No activity yet" description="Shift creation, clock events, schedule changes, and maintenance updates appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-sm" aria-label="Activity history">
              <thead className="bg-[#f9fafb] text-[11px] font-semibold uppercase tracking-wide text-[#808081]">
                <tr>
                  <th scope="col" className="px-4 py-3">Event</th>
                  {isSuperAdmin ? <th scope="col" className="px-4 py-3">Agency</th> : null}
                  <th scope="col" className="px-4 py-3">Actor</th>
                  <th scope="col" className="px-4 py-3">Role</th>
                  <th scope="col" className="px-4 py-3">Shift</th>
                  <th scope="col" className="px-4 py-3">Changes</th>
                  <th scope="col" className="px-4 py-3">Note</th>
                </tr>
              </thead>
              {auditsLoading ? <TableSkeleton columns={isSuperAdmin ? 7 : 6} /> : (
                <tbody>
                  {audits.map((audit) => {
                    const actionMeta = ACTION_LABELS[audit.action] || { label: String(audit.action), color: "bg-gray-100 text-gray-600" };
                    return (
                      <tr key={`${audit.agencyId}:${audit.id}`} className="border-b border-[#edf0f1] transition-colors last:border-b-0 hover:bg-[#fbfcfc]">
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${actionMeta.color}`}>{actionMeta.label}</span>
                          <p className="mt-1.5 whitespace-nowrap text-xs text-[#6b7280]">{formatShiftAuditTimestamp(audit.timestamp)}</p>
                        </td>
                        {isSuperAdmin ? <td className="px-4 py-4 text-[#4f5c5e]">{agencyNameFor(audit.agencyId)}</td> : null}
                        <td className="px-4 py-4 font-medium text-[#10141a]">{audit.actorName || audit.actorUid}</td>
                        <td className="px-4 py-4 text-[#6b7280]">{ROLE_LABELS[audit.actorUserType] || audit.actorUserType}</td>
                        <td className="max-w-[150px] truncate px-4 py-4 text-xs text-[#4f5c5e]" title={audit.shiftId}>{audit.shiftId}</td>
                        <td className="max-w-[240px] truncate px-4 py-4 text-[#4f5c5e]" title={summarizeChanges(audit.action, audit.changes)}>{summarizeChanges(audit.action, audit.changes)}</td>
                        <td className="max-w-[220px] truncate px-4 py-4 text-[#6b7280]" title={audit.reason || undefined}>{audit.reason || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>
            {!auditsLoading ? (
              <Pagination page={auditsPage} hasNext={auditsHasNext} onFirst={() => {
                setAuditsPage(0);
                void loadAudits(null);
              }} onNext={() => {
                if (!auditsHasNext || !auditsCursor) return;
                setAuditsPage((page) => page + 1);
                void loadAudits(auditsCursor);
              }} />
            ) : null}
          </div>
        )}
      </section>

      {editShift ? (
        <Suspense fallback={null}>
          <ShiftDetailsModal
            isOpen
            shift={shiftAnomalyToStub(editShift)}
            anomalyCodes={editShift.anomalyCodes}
            hydrateFromServer
            agencyId={editShift.agencyId || resolvedAgencyId || ""}
            agencyName={agencyNameFor(editShift.agencyId) || selectedAgencyName}
            onClose={() => setEditShift(null)}
            onMaintenanceComplete={handleCorrectionComplete}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
