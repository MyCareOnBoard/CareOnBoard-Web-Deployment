import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Ban, Car, ChevronDown, ChevronRight, CircleCheck, CircleX, Ellipsis, Eye, Navigation, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import { AgencyPageHeader, AgencyStatCard } from "@/components/agency/AgencyShell";
import {
  AgencyFilterSelect, AgencyListCard, AgencyPagination, AgencyPerson, AgencyPill, AgencySearchField, AgencySegmented,
  agencyMenuContent, agencyMenuItem, agencyPrimaryButton, agencyRowLink, agencyRowMenuButton,
  agencyTd, agencyTh, agencyTheadRow, agencyTr, type AgencyTone,
} from "@/components/agency/AgencyListKit";
import AddMileageModal from "./components/AddMileageModal";
import RideDetailModal from "./components/RideDetailModal";
import AddManualMileageModal from "../../userPanel/mileage/components/AddManualMileageModal";
import BillingDateRangeModal from "@/pages/agency/billing/components/BillingDateRangeModal";
import { formatRideServiceLabel } from "./utils/transportationClientService";
import { mileageApi, MileageRide } from "@/lib/api/mileage";
import { useAuth } from "@/utils/auth";
import type { RootState } from "@/store/redux/store";
import { staffLabels } from "@/lib/roleLabel";
import { cn } from "@/lib/utils";

const LIMIT = 10;

type StatusFilter = "all" | "active" | "completed" | "missed" | "cancelled";
type ManualFilter = "all" | "manual" | "tracked";
type RideState = "scheduled" | "in_progress" | "paused" | "missed" | "completed" | "cancelled";

function parseScheduledDate(v: unknown): Date | null {
  if (!v) return null;
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "object" && v !== null) {
    const s = (v as { seconds?: number; _seconds?: number }).seconds ?? (v as { _seconds?: number })._seconds;
    if (typeof s === "number") return new Date(s * 1000);
  }
  return null;
}

/** A scheduled ride whose start has passed was never driven: missed. */
function rideState(ride: MileageRide, now: Date): RideState {
  if (ride.status === "scheduled") {
    const start = parseScheduledDate(ride.scheduledStartTime);
    return start !== null && start < now ? "missed" : "scheduled";
  }
  return ride.status as RideState;
}

const isActive = (state: RideState) => state === "in_progress" || state === "paused" || state === "scheduled";

const STATE_META: Record<RideState, { label: string; tone: AgencyTone }> = {
  scheduled: { label: "Scheduled", tone: "teal" },
  in_progress: { label: "In progress", tone: "slate" },
  paused: { label: "Paused", tone: "amber" },
  missed: { label: "Missed", tone: "red" },
  completed: { label: "Completed", tone: "green" },
  cancelled: { label: "Cancelled", tone: "grey" },
};

/** "2026-11-01" → "1 Nov 2026" for the date filter button. */
function dayLabel(value: string) {
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = plain ? new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3])) : new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function MileagePage() {
  const { user } = useAuth();
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const selectedMode = useSelector((state: RootState) => state.agencyMode.modeByAgency[agencyId]);
  const labels = staffLabels(selectedMode ? [selectedMode] : undefined);
  const staffLabel = labels.noun;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRide, setEditingRide] = useState<MileageRide | null>(null);
  const [viewingRide, setViewingRide] = useState<MileageRide | null>(null);
  const [rideToDelete, setRideToDelete] = useState<MileageRide | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rideToCancel, setRideToCancel] = useState<MileageRide | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [rides, setRides] = useState<MileageRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [manualFilter, setManualFilter] = useState<ManualFilter>("all");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [showDateModal, setShowDateModal] = useState(false);

  const fetchRides = useCallback(async (currentOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await mileageApi.listAgency({
        limit: LIMIT,
        offset: currentOffset,
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
        isManual: manualFilter === "manual" ? true : manualFilter === "tracked" ? false : undefined,
        clientType: selectedMode,
      });
      setRides(res.data ?? []);
      setTotalCount(res.pagination?.count ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mileage could not be loaded.");
      setRides([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, manualFilter, selectedMode]);

  useEffect(() => { void fetchRides(offset); }, [fetchRides, offset]);

  // Reset to first page when server-side filters change
  useEffect(() => { setOffset(0); }, [dateRange, manualFilter, selectedMode]);

  const refresh = () => { void fetchRides(offset); };

  const handleDeleteConfirm = async () => {
    if (!rideToDelete) return;
    setIsDeleting(true);
    try {
      await mileageApi.deleteAgency(rideToDelete.id);
      setRideToDelete(null);
      toast.success("Mileage deleted.");
      await fetchRides(offset);
    } catch (e) {
      console.error("Failed to delete ride:", e);
      toast.error("The mileage could not be deleted. Try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!rideToCancel) return;
    setIsCancelling(true);
    try {
      await mileageApi.cancelAgency(rideToCancel.id);
      setRideToCancel(null);
      toast.success("Ride cancelled.");
      await fetchRides(offset);
    } catch (e) {
      console.error("Failed to cancel ride:", e);
      toast.error("The ride could not be cancelled. Try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  const now = new Date();
  const withState = rides.map((ride) => ({ ride, state: rideState(ride, now) }));

  // These counts cover the rides on the current page; the API does not send totals per status.
  const pageCounts = {
    active: withState.filter(({ state }) => isActive(state)).length,
    completed: withState.filter(({ state }) => state === "completed").length,
    missed: withState.filter(({ state }) => state === "missed").length,
    cancelled: withState.filter(({ state }) => state === "cancelled").length,
  };
  const completedDistance = withState
    .filter(({ state }) => state === "completed")
    .reduce((sum, { ride }) => sum + (ride.actualDistance ?? 0), 0);

  // pagination.count is used as the total only when it is clearly one (more than this page
  // reaches); a short page means this is the last one. Otherwise a full page may have more after it.
  const currentPage = Math.floor(offset / LIMIT) + 1;
  const isLastPage = rides.length < LIMIT;
  const knownTotal = totalCount > offset + rides.length ? totalCount : isLastPage ? offset + rides.length : null;
  const totalPages = knownTotal !== null ? Math.max(1, Math.ceil(knownTotal / LIMIT)) : undefined;
  const hasNextPage = knownTotal !== null ? offset + LIMIT < knownTotal : !isLastPage;

  // At most one page of rides, so filtering on every render is cheap.
  const query = searchTerm.trim().toLowerCase();
  const filteredRides = withState.filter(({ ride, state }) => {
    if (statusFilter === "active" && !isActive(state)) return false;
    if (statusFilter === "missed" && state !== "missed") return false;
    if (statusFilter === "completed" && state !== "completed") return false;
    if (statusFilter === "cancelled" && state !== "cancelled") return false;
    if (query && ![ride.clientName, ride.caregiverName, ride.serviceCode, ride.purpose].some((text) => text?.toLowerCase().includes(query))) return false;
    return true;
  });

  const hasDateRange = !!(dateRange.startDate || dateRange.endDate);
  const dateText = hasDateRange
    ? [dateRange.startDate && dayLabel(dateRange.startDate), dateRange.endDate && dayLabel(dateRange.endDate)].filter(Boolean).join(" – ")
    : "All dates";
  const filtersOn = !!searchTerm.trim() || statusFilter !== "all" || manualFilter !== "all" || hasDateRange;
  const pageNote = currentPage > 1 || hasNextPage ? "On this page." : undefined;

  return (
    <div className="pb-6">
      <AgencyPageHeader
        icon={Car}
        title="Mileage"
        description={`Trips ${labels.nounPlural} drive for clients. Distance comes from GPS segments; you approve rides for billing.`}
        actions={(
          <button type="button" onClick={() => setIsModalOpen(true)} className={agencyPrimaryButton}>
            <Plus aria-hidden="true" className="h-4 w-4" />Add mileage
          </button>
        )}
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AgencyStatCard icon={Navigation} label="Active trips" value={loading ? "—" : pageCounts.active}
          footnote={["In progress, paused or upcoming.", pageNote].filter(Boolean).join(" ")} />
        <AgencyStatCard icon={CircleCheck} label="Completed" value={loading ? "—" : pageCounts.completed}
          footnote={loading ? undefined : `${Math.round(completedDistance * 10) / 10} km driven${pageNote ? " on this page" : ""}.`} />
        <AgencyStatCard icon={CircleX} label="Missed" value={loading ? "—" : pageCounts.missed}
          footnote={["Scheduled, not driven.", pageNote].filter(Boolean).join(" ")} />
        <AgencyStatCard icon={Ban} label="Cancelled" value={loading ? "—" : pageCounts.cancelled}
          footnote={["Cancelled before the trip.", pageNote].filter(Boolean).join(" ")} />
      </div>

      <AgencyListCard label="Mileage history" className="mt-5">
        <div className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center">
          <AgencySegmented label="Status" value={statusFilter} onChange={setStatusFilter}
            options={[
              { value: "all", label: "All", count: loading || knownTotal === null ? undefined : knownTotal },
              { value: "active", label: "Active" },
              { value: "completed", label: "Completed" },
              { value: "missed", label: "Missed" },
              { value: "cancelled", label: "Cancelled" },
            ]} />
          <div className="flex flex-wrap items-center gap-2.5 xl:ml-auto">
            <AgencySearchField label="Search mileage" value={searchTerm} onChange={setSearchTerm} className="min-w-[180px] flex-1 xl:w-[200px] xl:flex-none" />
            <AgencyFilterSelect label="Type" value={manualFilter} onChange={(value) => setManualFilter(value as ManualFilter)}
              options={[{ value: "all", label: "All" }, { value: "manual", label: "Manual" }, { value: "tracked", label: "Tracked" }]} />
            <div className="inline-flex h-10 items-center rounded-[10px] border border-[#dcdfe2] bg-white text-[14px] dark:border-white/15 dark:bg-[#151c22]">
              <button type="button" onClick={() => setShowDateModal(true)}
                className="inline-flex h-full cursor-pointer items-center gap-1 rounded-[10px] pl-3.5 pr-3 text-[#10141a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:text-[#f4f6f7]">
                <span className="text-[#4b535b] dark:text-[#9aa4a8]">Date:</span> {dateText}
                {!hasDateRange && <ChevronDown aria-hidden="true" className="ml-1 h-4 w-4 text-[#4b535b]" />}
              </button>
              {hasDateRange && (
                <button type="button" aria-label="Clear date range" onClick={() => setDateRange({ startDate: "", endDate: "" })}
                  className="mr-1.5 grid h-7 w-7 cursor-pointer place-items-center rounded-full text-[#4b535b] hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-[#007679] dark:hover:bg-white/5">
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div aria-hidden="true" className="space-y-px border-t border-[#eceef0] dark:border-white/10">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-[66px] animate-pulse bg-[#f8f9fa] dark:bg-white/5" />)}
            <span role="status" className="sr-only">Loading mileage</span>
          </div>
        ) : error ? (
          <div role="alert" className="flex flex-wrap items-center justify-center gap-3 border-t border-[#eceef0] px-6 py-10 text-[14px] text-[#b42318] dark:border-white/10 dark:text-[#f8a1a1]">
            {error}
            <button type="button" onClick={refresh} className={agencyRowLink}>Try again</button>
          </div>
        ) : filteredRides.length === 0 ? (
          <div className="border-t border-[#eceef0] px-6 py-14 text-center dark:border-white/10">
            <p className="text-[16px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{filtersOn ? "No rides match your filters" : "No mileage yet"}</p>
            <p className="mt-1 text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">
              {filtersOn ? "Try another status, type, date range or search." : `Add mileage, or rides ${labels.nounPlural} track in the app will appear here.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px]">
              <thead>
                <tr className={agencyTheadRow}>
                  <th scope="col" className={agencyTh}>Client</th>
                  <th scope="col" className={agencyTh}>{staffLabel}</th>
                  <th scope="col" className={agencyTh}>Scheduled</th>
                  <th scope="col" className={agencyTh}>Service</th>
                  <th scope="col" className={agencyTh}>Segments</th>
                  <th scope="col" className={agencyTh}>Distance</th>
                  <th scope="col" className={agencyTh}>Status</th>
                  <th scope="col" className={agencyTh}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredRides.map(({ ride, state }) => {
                  const start = parseScheduledDate(ride.scheduledStartTime);
                  const meta = STATE_META[state] ?? { label: String(ride.status).replace(/_/g, " "), tone: "grey" as AgencyTone };
                  return (
                    <tr key={ride.id} className={agencyTr}>
                      <td className={agencyTd}>
                        {ride.clientId
                          ? <AgencyPerson name={ride.clientName || "Unknown client"} imageUrl={ride.clientAvatarUrl} />
                          : <AgencyPerson name={ride.purpose || "Manual mileage"} detail="No client" />}
                      </td>
                      <td className={agencyTd}><AgencyPerson name={ride.caregiverName || "Unknown"} imageUrl={ride.caregiverAvatarUrl} /></td>
                      <td className={cn(agencyTd, "whitespace-nowrap")}>
                        <span className="block">{start ? start.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
                        {start && <span className="mt-0.5 block text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">{start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>}
                      </td>
                      <td className={cn(agencyTd, "max-w-[180px]")}><span className="line-clamp-2">{formatRideServiceLabel(ride)}</span></td>
                      <td className={cn(agencyTd, "tabular-nums")}>{ride.segmentCount ?? 0}</td>
                      <td className={cn(agencyTd, "whitespace-nowrap tabular-nums")}>{ride.actualDistance != null ? `${ride.actualDistance} km` : "—"}</td>
                      <td className={agencyTd}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <AgencyPill tone={meta.tone}>{meta.label}</AgencyPill>
                          {!ride.clientId && <span className="rounded-[6px] border border-[#e4e7ea] px-1.5 py-0.5 text-[11px] text-[#4b535b] dark:border-white/15 dark:text-[#9aa4a8]">Manual</span>}
                          {ride.isRecurring && (
                            <span className="inline-flex items-center gap-1 rounded-[6px] border border-[#e4e7ea] px-1.5 py-0.5 text-[11px] text-[#4b535b] dark:border-white/15 dark:text-[#9aa4a8]">
                              <RefreshCw aria-hidden="true" className="h-2.5 w-2.5" />Recurring
                            </span>
                          )}
                          {ride.approved && <span className="rounded-[6px] bg-[#e6f6ec] px-1.5 py-0.5 text-[11px] font-medium text-[#1a7f37] dark:bg-[#30a46c]/15 dark:text-[#7ee2a8]">Approved</span>}
                        </div>
                      </td>
                      <td className={cn(agencyTd, "whitespace-nowrap")}>
                        <div className="flex items-center justify-end gap-3">
                          <button type="button" onClick={() => setViewingRide(ride)} className={agencyRowLink}>
                            {state === "missed" ? "Review" : "Details"}<ChevronRight aria-hidden="true" className="h-4 w-4" />
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" aria-label={`Actions for mileage ride ${ride.id}`} className={agencyRowMenuButton}>
                                <Ellipsis aria-hidden="true" className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" sideOffset={6} collisionPadding={16} className={agencyMenuContent}>
                              <DropdownMenuItem className={agencyMenuItem} onSelect={() => setViewingRide(ride)}>
                                <Eye aria-hidden="true" className="h-4 w-4 text-[#007679] dark:text-[#7fd3d3]" />View details
                              </DropdownMenuItem>
                              <DropdownMenuItem className={agencyMenuItem} onSelect={() => { setEditingRide(ride); setIsModalOpen(true); }}>
                                <Pencil aria-hidden="true" className="h-4 w-4 text-[#007679] dark:text-[#7fd3d3]" />Edit mileage
                              </DropdownMenuItem>
                              {ride.status === "scheduled" && (
                                <DropdownMenuItem className={agencyMenuItem} onSelect={() => setRideToCancel(ride)}>
                                  <Ban aria-hidden="true" className="h-4 w-4 text-[#007679] dark:text-[#7fd3d3]" />Cancel ride
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className={cn(agencyMenuItem, "text-[#b42318] dark:text-[#f8a1a1]")} onSelect={() => setRideToDelete(ride)}>
                                <Trash2 aria-hidden="true" className="h-4 w-4" />Delete mileage
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && (rides.length > 0 || offset > 0) && (
          <AgencyPagination
            summary={knownTotal !== null
              ? `Showing ${filteredRides.length} of ${knownTotal} trip${knownTotal === 1 ? "" : "s"}`
              : `Showing ${filteredRides.length} trip${filteredRides.length === 1 ? "" : "s"} · page ${currentPage}`}
            page={currentPage}
            pages={totalPages}
            hasNext={hasNextPage}
            onPage={(page) => setOffset(Math.max(0, (page - 1) * LIMIT))}
          />
        )}
      </AgencyListCard>

      {/* Track Mileage Modal */}
      <AddManualMileageModal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} onCreated={refresh} />

      {/* Add / Edit Mileage Modal */}
      <AddMileageModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingRide(null); }}
        onMileageCreated={refresh}
        onMileageUpdated={refresh}
        mode={editingRide ? "edit" : "create"}
        initialRide={editingRide}
      />

      <DeleteConfirmationModal
        isOpen={!!rideToDelete}
        onClose={() => !isDeleting && setRideToDelete(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        title="Delete mileage?"
        message="Are you sure you want to delete this mileage record? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />

      <RideDetailModal
        ride={viewingRide}
        isOpen={!!viewingRide}
        onClose={() => setViewingRide(null)}
        onRideUpdated={(updated) => {
          setViewingRide(updated);
          setRides((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
        }}
      />

      <DeleteConfirmationModal
        isOpen={!!rideToCancel}
        onClose={() => !isCancelling && setRideToCancel(null)}
        onConfirm={handleCancelConfirm}
        isDeleting={isCancelling}
        title="Cancel ride?"
        message="Are you sure you want to cancel this ride? The ride will be marked as cancelled."
        confirmText="Cancel ride"
        cancelText="Keep"
      />

      <BillingDateRangeModal
        open={showDateModal}
        onClose={() => setShowDateModal(false)}
        values={dateRange}
        onChange={setDateRange}
        onApply={(v) => { setDateRange(v); setOffset(0); setShowDateModal(false); }}
        title="Filter by date range"
        description="Show mileage records within a date range"
      />
    </div>
  );
}
