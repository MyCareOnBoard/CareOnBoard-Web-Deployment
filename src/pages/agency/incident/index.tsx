import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { ChevronLeft, ChevronRight, RotateCcw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { AgencyPageHeader } from "@/components/agency/AgencyShell";
import { getAllIncidents, IncidentStatus, type IncidentReport, type IncidentSummary } from "@/lib/api/incidents";
import { getClientById } from "@/lib/api/clients";
import { staffLabels } from "@/lib/roleLabel";
import { cn } from "@/lib/utils";
import { useAuth } from "@/utils/auth";
import type { RootState } from "@/store/redux/store";
import IncidentReviewPanel from "./components/IncidentReviewPanel";
import { clientNameOf, formatDayAndTime, IncidentStatusPill, isPending } from "./components/incidentFormat";

const PAGE_SIZE = 10;
const PENDING = [IncidentStatus.SUBMITTED, IncidentStatus.UNDER_REVIEW];

type Tab = "pending" | "all";

const segment = "inline-flex h-9 cursor-pointer items-center gap-2 rounded-[9px] px-3 text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#007679]";
const segmentOn = "bg-white font-medium text-[#10141a] shadow-[0_1px_2px_rgba(16,20,26,0.08)] dark:bg-[#1b232b] dark:text-[#f4f6f7]";
const segmentOff = "text-[#4b535b] hover:text-[#10141a] dark:text-[#9aa4a8] dark:hover:text-[#f4f6f7]";
const outlineButton = "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#dcdfe2] bg-white px-4 text-[14px] font-semibold text-[#10141a] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5";
const pageButton = "grid h-8 w-8 cursor-pointer place-items-center rounded-full text-[#4b535b] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#9aa4a8] dark:hover:bg-white/5";

const reporterOf = (incident: IncidentReport) => incident.employee?.fullName
  || [incident.employee?.firstName, incident.employee?.lastName].filter(Boolean).join(" ")
  || "Unknown";

export default function IncidentPage() {
  const { user } = useAuth();
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const selectedMode = useSelector((state: RootState) => state.agencyMode.modeByAgency[agencyId]);
  const staff = staffLabels(selectedMode ? [selectedMode] : user?.agency?.supportedClientTypes);

  const [tab, setTab] = useState<Tab>("pending");
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch on mount, page or tab change, and program switch. A program switch resets to page 1
  // first (when not already there) so the switch triggers a single fetch, not two.
  const prevModeRef = useRef(selectedMode);
  useEffect(() => {
    if (!user?.agencyId) {
      setLoading(false);
      return;
    }
    if (prevModeRef.current !== selectedMode) {
      prevModeRef.current = selectedMode;
      if (currentPage !== 1) {
        setCurrentPage(1);
        return;
      }
    }
    void fetchIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.agencyId, currentPage, selectedMode, tab]);

  /** Some incidents arrive with only a client id; fill in the client's name. */
  const withClientData = async (list: IncidentReport[]) => {
    if (!user?.agencyId) return list;
    return Promise.all(list.map(async (incident) => {
      if ((incident.client?.firstName && incident.client?.lastName) || !incident.clientId) return incident;
      try {
        const client = await getClientById(incident.clientId, user.agencyId!);
        return client ? { ...incident, client } : incident;
      } catch {
        return incident;
      }
    }));
  };

  const fetchIncidents = async () => {
    if (!user?.agencyId) return;
    setLoading(true);
    try {
      const response = await getAllIncidents(user.agencyId, {
        page: currentPage,
        limit: PAGE_SIZE,
        clientType: selectedMode,
        ...(tab === "pending" ? { status: PENDING } : {}),
      });
      if (response.success && response.data) {
        const data = response.data as unknown as IncidentReport[] | (Partial<typeof response.data> & {
          pagination?: { totalPages?: number; total?: number };
        });
        const list = Array.isArray(data) ? data : data.incidents || [];
        // Keep Pending honest even if the server returns other statuses.
        const shown = tab === "pending" ? list.filter((incident) => isPending(incident.status)) : list;
        setIncidents(await withClientData(shown));
        setTotalPages(Array.isArray(data) ? 1 : data.pagination?.totalPages || data.totalPages || 1);
        setTotal(Array.isArray(data) ? list.length : data.pagination?.total ?? data.total ?? null);
        setSummary(Array.isArray(data) ? null : data.summary ?? null);
      } else {
        setIncidents([]);
        setTotalPages(1);
        setTotal(null);
      }
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Incidents could not be loaded. Try again.");
      setIncidents([]);
      setTotalPages(1);
      setTotal(null);
    } finally {
      setLoading(false);
    }
  };

  // Keep a report open: the one chosen, or the first in the list.
  useEffect(() => {
    if (loading) return;
    if (!incidents.some((incident) => incident.id === selectedId)) setSelectedId(incidents[0]?.id ?? null);
  }, [incidents, loading, selectedId]);

  const selected = incidents.find((incident) => incident.id === selectedId) ?? null;

  const select = (id: string) => {
    setSelectedId(id);
    // Below the two-column layout the panel sits under the list, so bring it into view.
    if (window.matchMedia("(max-width: 1279px)").matches) {
      requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  const changeTab = (next: Tab) => {
    if (next === tab) return;
    setTab(next);
    setCurrentPage(1);
  };

  const handleDecided = (incidentId: string, status: IncidentStatus) => {
    setIncidents((prev) => prev.map((incident) => (incident.id === incidentId ? { ...incident, status } : incident)));
    void fetchIncidents();
  };

  const counts: Record<Tab, number | undefined> = {
    pending: summary ? (summary.submitted ?? 0) + (summary.under_review ?? 0) : tab === "pending" ? total ?? undefined : undefined,
    all: summary?.total ?? (tab === "all" ? total ?? undefined : undefined),
  };

  return (
    <div className="pb-6">
      <AgencyPageHeader
        icon={TriangleAlert}
        title="Incidents"
        description={`Reports filed by ${staff.nounPlural}. Review each one and mark it resolved or not resolved.`}
        actions={(
          <button type="button" onClick={() => void fetchIncidents()} disabled={loading} className={outlineButton}>
            <RotateCcw aria-hidden="true" className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
        )}
      />

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,470px)]">
        <section aria-label="Incident reports" className="min-w-0 overflow-hidden rounded-[16px] border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b]">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div role="group" aria-label="Show" className="flex rounded-[12px] bg-[#f4f5f6] p-1 dark:bg-white/5">
              {(["pending", "all"] as const).map((value) => {
                const on = tab === value;
                return (
                  <button key={value} type="button" aria-pressed={on} onClick={() => changeTab(value)} className={cn(segment, on ? segmentOn : segmentOff)}>
                    {value === "pending" ? "Pending" : "All"}
                    {counts[value] !== undefined && (
                      <span className={cn(
                        "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[12px] font-medium tabular-nums",
                        on ? "bg-[#0f7e7d] text-white" : "bg-[#e4e7ea] text-[#4b535b] dark:bg-white/10 dark:text-[#c9d1d4]",
                      )}>
                        {counts[value]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {loading && incidents.length === 0 ? (
            <div aria-hidden="true" className="space-y-px border-t border-[#eceef0] dark:border-white/10">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-[66px] animate-pulse bg-[#f8f9fa] dark:bg-white/5" />)}
            </div>
          ) : incidents.length === 0 ? (
            <div className="border-t border-[#eceef0] px-6 py-14 text-center dark:border-white/10">
              <p className="text-[16px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{tab === "pending" ? "No incidents waiting for review" : "No incidents reported"}</p>
              <p className="mt-1 text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">
                {tab === "pending" ? "New reports from your staff will appear here." : `Incidents reported by ${staff.nounPlural} will appear here.`}
              </p>
            </div>
          ) : (
            <div className={cn("overflow-x-auto", loading && "opacity-60")} aria-busy={loading}>
              <table className="w-full min-w-[620px] text-left text-[14px]">
                <thead>
                  <tr className="border-y border-[#eceef0] bg-[#f8f9fa] text-[13px] text-[#4b535b] dark:border-white/10 dark:bg-white/5 dark:text-[#9aa4a8]">
                    <th scope="col" className="px-4 py-2.5 font-normal">Incident</th>
                    <th scope="col" className="px-4 py-2.5 font-normal">Client</th>
                    <th scope="col" className="px-4 py-2.5 font-normal">Date</th>
                    <th scope="col" className="px-4 py-2.5 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((incident) => {
                    const on = incident.id === selectedId;
                    const { day, time } = formatDayAndTime(incident);
                    const summaryLine = incident.whatHappened?.trim().split(/\r?\n/)[0] || "No description";
                    return (
                      <tr key={incident.id} onClick={() => select(incident.id)}
                        className={cn("cursor-pointer border-b border-[#eceef0] align-top transition-colors last:border-b-0 dark:border-white/10",
                          on ? "bg-[#eef7f7] dark:bg-[#0f7e7d]/15" : "hover:bg-[#f8f9fa] dark:hover:bg-white/5")}>
                        <td className="max-w-[300px] px-4 py-3">
                          <button type="button" aria-pressed={on} onClick={(e) => { e.stopPropagation(); select(incident.id); }}
                            className="block w-full truncate rounded text-left font-medium text-[#10141a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:text-[#f4f6f7]">
                            {summaryLine}
                          </button>
                          <span className="mt-0.5 block truncate text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">{incident.source === "compliance_pattern" ? "Detected for" : "Reported by"} {reporterOf(incident)}</span>
                        </td>
                        <td className="px-4 py-3 text-[#10141a] dark:text-[#e6eaec]">{clientNameOf(incident)}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="block text-[#10141a] dark:text-[#e6eaec]">{day}</span>
                          {time && <span className="mt-0.5 block text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">{time}</span>}
                        </td>
                        <td className="px-4 py-3"><IncidentStatusPill status={incident.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {incidents.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eceef0] px-4 py-3 text-[13px] text-[#4b535b] dark:border-white/10 dark:text-[#9aa4a8]">
              <span>Showing {incidents.length}{total !== null ? ` of ${total}` : ""}</span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="Previous page" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1 || loading} className={pageButton}>
                    <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <span className="px-1 tabular-nums">Page {currentPage} of {totalPages}</span>
                  <button type="button" aria-label="Next page" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages || loading} className={pageButton}>
                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <div ref={panelRef} className="min-w-0 scroll-mt-24 xl:sticky xl:top-24">
          {selected ? (
            <IncidentReviewPanel incident={selected} staffNoun={staff.noun} onDecided={handleDecided} />
          ) : !loading && incidents.length > 0 ? (
            <p className="rounded-[16px] border border-dashed border-[#dcdfe2] px-6 py-10 text-center text-[14px] text-[#4b535b] dark:border-white/15 dark:text-[#9aa4a8]">
              Select an incident to read the report.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
