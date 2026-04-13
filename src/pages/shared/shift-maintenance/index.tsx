import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/ui/search-select";
import CustomDatePicker from "@/components/ui/datePicker";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";
import {
  fetchShiftAnomalies,
  fetchShiftMaintenanceAudit,
  type ShiftAnomaly,
  type ShiftAuditRecord,
} from "@/lib/api/shifts";
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

const ShiftCorrectionModal = lazy(() => import("./ShiftCorrectionModal"));

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

type TabKey = "anomalies" | "audit";

interface ShiftMaintenancePageProps {
  isSuperAdmin?: boolean;
}

export default function ShiftMaintenancePage({ isSuperAdmin = false }: ShiftMaintenancePageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("anomalies");

  // Date range (default: last 7 days)
  const [fromDate, setFromDate] = useState<Date | null>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const fromDateStr = fromDate ? format(fromDate, "yyyy-MM-dd") : "";
  const toDateStr = toDate ? format(toDate, "yyyy-MM-dd") : "";
  const [agencyFilter, setAgencyFilter] = useState("");
  const [agencySearchQuery, setAgencySearchQuery] = useState("");
  const debouncedAgencySearch = useDebounce(agencySearchQuery, 350);
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [agenciesLoading, setAgenciesLoading] = useState(false);

  // Anomalies state
  const [anomalies, setAnomalies] = useState<ShiftAnomaly[]>([]);
  const [anomaliesLoading, setAnomaliesLoading] = useState(false);
  const [anomaliesCursor, setAnomaliesCursor] = useState<string | null>(null);
  const [anomaliesHasNext, setAnomaliesHasNext] = useState(false);
  const [anomaliesPage, setAnomaliesPage] = useState(0);

  // Audit state (deferred until tab is active)
  const [audits, setAudits] = useState<ShiftAuditRecord[]>([]);
  const [auditsLoading, setAuditsLoading] = useState(false);
  const [auditsCursor, setAuditsCursor] = useState<string | null>(null);
  const [auditsHasNext, setAuditsHasNext] = useState(false);
  const [auditsPage, setAuditsPage] = useState(0);
  const [auditsFetched, setAuditsFetched] = useState(false);

  // Edit modal
  const [editShift, setEditShift] = useState<ShiftAnomaly | null>(null);

  const resolvedAgencyId = isSuperAdmin ? agencyFilter : user?.agencyId;

  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;
    setAgenciesLoading(true);
    listAgencies({
      limit: 100,
      search: debouncedAgencySearch.trim() || undefined,
    })
      .then((res) => {
        if (!cancelled) {
          setAgencies(
            res.agencies.map((a) => ({
              id: a.id,
              name: (a.name || "").trim() || "Unnamed agency",
            })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast({
            title: "Couldn't load agencies",
            description: "Try again in a moment.",
            variant: "destructive",
          });
          setAgencies([]);
        }
      })
      .finally(() => {
        if (!cancelled) setAgenciesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, debouncedAgencySearch, toast]);

  const agencySelectOptions = useMemo(
    () =>
      agencies.map((a) => ({
        value: a.id,
        label: a.name,
        description: `ID: ${a.id}`,
      })),
    [agencies],
  );

  const loadAnomalies = useCallback(async (cursor?: string | null) => {
    if (!resolvedAgencyId || !fromDateStr || !toDateStr) return;
    setAnomaliesLoading(true);
    try {
      const res = await fetchShiftAnomalies({
        agencyId: resolvedAgencyId,
        from: fromDateStr,
        to: toDateStr,
        limit: 25,
        startAfter: cursor || undefined,
      });
      setAnomalies(res.anomalies);
      setAnomaliesHasNext(res.hasNextPage);
      setAnomaliesCursor(res.nextCursor);
    } catch {
      toast({
        title: "Couldn't load anomalies",
        description: "Check your connection, then try again. If it keeps happening, contact support.",
        variant: "destructive",
      });
    } finally {
      setAnomaliesLoading(false);
    }
  }, [resolvedAgencyId, fromDateStr, toDateStr, toast]);

  const loadAudits = useCallback(async (cursor?: string | null) => {
    if (!resolvedAgencyId) return;
    setAuditsLoading(true);
    try {
      const res = await fetchShiftMaintenanceAudit({
        agencyId: resolvedAgencyId,
        limit: 25,
        startAfter: cursor || undefined,
      });
      setAudits(res.audits);
      setAuditsHasNext(res.hasNextPage);
      setAuditsCursor(res.nextCursor);
      setAuditsFetched(true);
    } catch {
      toast({
        title: "Couldn't load audit log",
        description: "Check your connection, then try again. If it keeps happening, contact support.",
        variant: "destructive",
      });
    } finally {
      setAuditsLoading(false);
    }
  }, [resolvedAgencyId, toast]);

  // Fetch anomalies on mount / filter change
  useEffect(() => {
    setAnomaliesPage(0);
    loadAnomalies(null);
  }, [loadAnomalies]);

  // Deferred: fetch audits only when tab is switched to
  useEffect(() => {
    if (activeTab === "audit" && !auditsFetched) {
      setAuditsPage(0);
      loadAudits(null);
    }
  }, [activeTab, auditsFetched, loadAudits]);

  const handleAnomalyNextPage = () => {
    if (anomaliesHasNext && anomaliesCursor) {
      setAnomaliesPage((p) => p + 1);
      loadAnomalies(anomaliesCursor);
    }
  };

  const handleAuditNextPage = () => {
    if (auditsHasNext && auditsCursor) {
      setAuditsPage((p) => p + 1);
      loadAudits(auditsCursor);
    }
  };

  const handleCorrectionComplete = () => {
    setEditShift(null);
    loadAnomalies(null);
    setAnomaliesPage(0);
    setAuditsFetched(false);
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Page header — match agency client-details pattern */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!isSuperAdmin && (
            <button
              type="button"
              onClick={() => navigate(Routes.agency.scheduling)}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.5)] backdrop-blur-sm transition-colors hover:bg-[rgba(255,255,255,0.7)]"
              aria-label="Back to Shift Management"
            >
              <ArrowLeft className="h-5 w-5 text-[#10141a]" />
            </button>
          )}
          <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
            Shift Maintenance
          </h1>
        </div>
      </div>

      {/* Card */}
      <div className="backdrop-blur-[20px] bg-white/30 border border-white/30 rounded-[30px] p-6 min-h-[600px]">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4 mb-6">
          {isSuperAdmin && (
            <div className="flex flex-col gap-1 w-64">
              <span className="text-xs font-medium text-gray-600">Agency</span>
              <SearchSelect
                options={agencySelectOptions}
                value={agencyFilter}
                onChange={setAgencyFilter}
                onSearchChange={setAgencySearchQuery}
                disabled={agenciesLoading}
                placeholder={agenciesLoading ? "Loading agencies…" : "Search by agency name…"}
                searchPlaceholder="Type to search by name, email, or ID…"
                emptyMessage="No agencies found. Try a different search."
                className="w-full border-gray-200 bg-white"
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">From date</span>
            <CustomDatePicker
              date={fromDate}
              setDate={setFromDate}
              placeholder="Start date"
              endMonth={toDate ?? new Date()}
              className="w-44"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">To date</span>
            <CustomDatePicker
              date={toDate}
              setDate={setToDate}
              placeholder="End date"
              startMonth={fromDate ?? undefined}
              endMonth={new Date()}
              className="w-44"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={!fromDate || !toDate || (!isSuperAdmin ? false : !agencyFilter)}
            onClick={() => { loadAnomalies(null); setAnomaliesPage(0); setAuditsFetched(false); }}
          >
            Refresh scan
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-2xl p-1 w-fit">
          <button
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
              activeTab === "anomalies" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("anomalies")}
          >
            <AlertTriangle className="w-4 h-4" />
            Problem shifts
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
              activeTab === "audit" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("audit")}
          >
            <ClipboardList className="w-4 h-4" />
            Activity history
          </button>
        </div>

        {/* Anomalies Tab */}
        {activeTab === "anomalies" && (
          <div>
            {anomaliesLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : anomalies.length === 0 ? (
              <div className="text-center py-20 text-gray-500 max-w-md mx-auto space-y-2">
                <p className="font-medium text-gray-700">No problem shifts in this range</p>
                <p className="text-sm">
                  Try different dates, or pick a wider range. Shifts only appear here when the system flags an issue.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium">Time</th>
                        <th className="pb-3 font-medium">DSP</th>
                        <th className="pb-3 font-medium">Client</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Anomaly</th>
                        <th className="pb-3 font-medium">Fix</th>
                      </tr>
                    </thead>
                    <tbody>
                      {anomalies.map((a) => (
                        <tr key={a.id} className="border-b border-gray-100 hover:bg-white/40 transition-colors">
                          <td className="py-3">{a.date}</td>
                          <td className="py-3">{a.startTime || "-"} - {a.endTime || "-"}</td>
                          <td
                            className="py-3 truncate max-w-[120px]"
                            title={a.employeeId || undefined}
                          >
                            {anomalyDspLabel(a)}
                          </td>
                          <td
                            className="py-3 truncate max-w-[120px]"
                            title={a.clientId || undefined}
                          >
                            {anomalyClientLabel(a)}
                          </td>
                          <td className="py-3">
                            <Badge variant="outline" className="text-xs capitalize">{a.status}</Badge>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-1">
                              {a.anomalyCodes.map((code) => (
                                <span key={code} className={`text-xs px-2 py-0.5 rounded-full font-medium ${ANOMALY_LABELS[code]?.color || "bg-gray-100 text-gray-600"}`}>
                                  {ANOMALY_LABELS[code]?.label || code}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Review and fix this shift"
                              onClick={() => setEditShift(a)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-gray-500">Page {anomaliesPage + 1}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      disabled={anomaliesPage === 0}
                      onClick={() => { setAnomaliesPage(0); loadAnomalies(null); }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      disabled={!anomaliesHasNext}
                      onClick={handleAnomalyNextPage}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === "audit" && (
          <div>
            {auditsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : audits.length === 0 ? (
              <div className="text-center py-20 text-gray-500 max-w-md mx-auto space-y-2">
                <p className="font-medium text-gray-700">No activity yet</p>
                <p className="text-sm">
                  When people create shifts, clock in or out, or change schedules, those events show up here.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th className="pb-3 font-medium">Timestamp</th>
                        <th className="pb-3 font-medium">Who</th>
                        <th className="pb-3 font-medium">Role</th>
                        <th className="pb-3 font-medium">Action</th>
                        <th className="pb-3 font-medium">Details</th>
                        <th className="pb-3 font-medium">Shift ID</th>
                        <th className="pb-3 font-medium">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audits.map((a) => {
                        const actionMeta =
                          ACTION_LABELS[a.action as ShiftAuditRecord["action"]] || {
                            label: String(a.action),
                            color: "bg-gray-100 text-gray-600",
                          };
                        return (
                          <tr key={a.id} className="border-b border-gray-100 hover:bg-white/40 transition-colors">
                            <td className="py-3 whitespace-nowrap">{formatShiftAuditTimestamp(a.timestamp)}</td>
                            <td className="py-3">{a.actorName || a.actorUid}</td>
                            <td className="py-3 text-xs text-gray-500">{ROLE_LABELS[a.actorUserType] || a.actorUserType}</td>
                            <td className="py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionMeta.color}`}>
                                {actionMeta.label}
                              </span>
                            </td>
                            <td className="py-3 text-gray-600 max-w-[200px] truncate">{summarizeChanges(a.action, a.changes)}</td>
                            <td className="py-3 font-mono text-xs truncate max-w-[140px]">{a.shiftId}</td>
                            <td className="py-3 text-gray-600 max-w-[180px] truncate">{a.reason || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-gray-500">Page {auditsPage + 1}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      disabled={auditsPage === 0}
                      onClick={() => { setAuditsPage(0); loadAudits(null); }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      disabled={!auditsHasNext}
                      onClick={handleAuditNextPage}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Lazy-loaded correction modal */}
      {editShift && (
        <Suspense fallback={null}>
          <ShiftCorrectionModal
            shift={editShift}
            agencyId={resolvedAgencyId || ""}
            onClose={() => setEditShift(null)}
            onComplete={handleCorrectionComplete}
          />
        </Suspense>
      )}
    </div>
  );
}
