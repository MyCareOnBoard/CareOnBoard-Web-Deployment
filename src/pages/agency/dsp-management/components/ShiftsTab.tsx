import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, generatePath } from "react-router";
import { ShiftsMonthCalendar } from "@/components/shifts/ShiftsMonthCalendar";
import { cn } from "@/lib/utils";
import { CalendarDays, List } from "lucide-react";
import { AgencyPagination } from "@/components/agency/AgencyListKit";
import {
  type Shift,
  categorizeShifts,
  deleteShift,
  formatShiftLocation,
  updateShift,
  ShiftType,
  SubmissionStatus,
} from "@/lib/api/shifts";
import type { Client } from "@/lib/api/clients";
import { shiftToScheduleFormData } from "@/pages/agency/scheduling/shift-to-schedule-form";
import type { ScheduleFormData } from "@/pages/agency/scheduling/components/AddScheduleModal";
import { Routes } from "@/routes/constants";
import { useToast } from "@/hooks/use-toast";
import { shiftDeleteConfirmMessage } from "@/lib/shift-delete-confirm";
import { getShiftRowStatusInfo } from "@/lib/shift-row-status";
import { formatShiftRowClockDisplay } from "@/lib/shift-row-time";
import { shiftTimeLabel } from "@/lib/shift-time";
import { detectShiftAnomalyCodes } from "@/lib/shift-anomaly-detection";
import { DspShiftScheduleListRow } from "./DspShiftScheduleListRow";
import { ConfirmDialog, ConfirmDialogContent } from "@/components/ui/confirm-dialog";
import { createAgencyOperationalDataAdapter } from "@/lib/operational-agency/dataAdapters";
import type { RootState } from "@/store/redux/store";
import { useAuth } from "@/utils/auth";

const AddScheduleModal = lazy(() => import("@/pages/agency/scheduling/components/AddScheduleModal"));
const ShiftDetailsModal = lazy(() => import("@/components/ShiftDetailsModal"));
const DeleteConfirmationModal = lazy(() =>
  import("@/components/modals/DeleteConfirmationModal").then((m) => ({
    default: m.DeleteConfirmationModal,
  })),
);

interface ShiftsTabProps {
  shifts: Shift[];
  isLoading: boolean;
  getInitials: (name: string) => string;
  agencyId: string;
  dspId: string;
  dspFullName: string;
  dspProfilePicture?: string;
  onShiftsUpdated?: () => void;
}

function getClientName(shift: Shift): string {
  if (!shift.client) return "Unknown Client";
  const c = shift.client as Client & { name?: string; avatar?: string };
  if (c.name) return c.name;
  const first = c.firstName || "";
  const last = c.lastName || "";
  return `${first} ${last}`.trim() || "Unknown Client";
}

function getClientAvatar(shift: Shift): string | undefined {
  if (!shift.client) return undefined;
  const c = shift.client as Client & { avatar?: string };
  return c.avatar ?? c.profileImage;
}

function formatShiftDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  } catch {
    return dateStr;
  }
}

function getSessionDuration(shift: Shift): string {
  if (shift.sessionDuration) return shift.sessionDuration;
  if (shift.startTime && shift.endTime) {
    try {
      const base = new Date(shift.date);
      const parseTime = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        const d = new Date(base);
        d.setHours(h, m, 0, 0);
        return d;
      };
      const start = parseTime(shift.startTime);
      const end = parseTime(shift.endTime);
      const diffMins = (end.getTime() - start.getTime()) / 60000;
      if (diffMins <= 0) return "";
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      if (mins === 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
      return `${hours}h ${mins}m`;
    } catch {
      return "";
    }
  }
  return "";
}

export function ShiftsTab({
  shifts,
  isLoading,
  getInitials,
  agencyId,
  dspId,
  dspFullName,
  dspProfilePicture,
  onShiftsUpdated,
}: ShiftsTabProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const agencyMode = useSelector((state: RootState) => state.agencyMode.modeByAgency[agencyId]) ?? null;
  const supportedClientTypes = user?.agency?.supportedClientTypes?.length
    ? user.agency.supportedClientTypes
    : (["ddd", "hha"] as const);
  const operationalData = useMemo(() => createAgencyOperationalDataAdapter(agencyId), [agencyId]);
  const [shiftsView, setShiftsView] = useState<"calendar" | "list">("calendar");
  const [shiftsTab, setShiftsTab] = useState<"previous" | "ongoing" | "upcoming">("previous");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [shiftMenuOpenForId, setShiftMenuOpenForId] = useState<string | null>(null);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [editFormData, setEditFormData] = useState<ScheduleFormData | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("edit");
  const [showShiftDetails, setShowShiftDetails] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [shiftPendingDelete, setShiftPendingDelete] = useState<Shift | null>(null);
  const [isDeletingShift, setIsDeletingShift] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [shiftToApprove, setShiftToApprove] = useState<Shift | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  const categorized = useMemo(() => categorizeShifts(shifts), [shifts]);

  const filteredShifts = useMemo(() => {
    switch (shiftsTab) {
      case "previous":
        return categorized.previous;
      case "ongoing":
        return categorized.current ? [categorized.current] : [];
      case "upcoming":
        return categorized.upcoming;
      default:
        return [];
    }
  }, [shiftsTab, categorized]);

  const handleTabChange = (tab: "previous" | "ongoing" | "upcoming") => {
    setShiftsTab(tab);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredShifts.length / pageSize));
  const paginatedShifts = filteredShifts.slice((page - 1) * pageSize, page * pageSize);

  const closeRowMenu = useCallback(() => setShiftMenuOpenForId(null), []);

  const goToShiftDetailsPage = useCallback(
    (shift: Shift) => {
      closeRowMenu();
      navigate(generatePath(Routes.agency.shiftDetails, { shiftId: shift.id }));
    },
    [closeRowMenu, navigate],
  );

  const handleEdit = useCallback(
    (shift: Shift) => {
      closeRowMenu();
      setEditFormData(shiftToScheduleFormData(shift));
      setModalMode("edit");
      setShowAddScheduleModal(true);
    },
    [closeRowMenu],
  );

  const openShiftMaintenanceModal = useCallback(
    (shift: Shift) => {
      closeRowMenu();
      setSelectedShift(shift);
      setShowShiftDetails(true);
    },
    [closeRowMenu],
  );

  const requestDeleteShiftFromMenu = useCallback(
    (shift: Shift) => {
      closeRowMenu();
      setShiftPendingDelete(shift);
    },
    [closeRowMenu],
  );

  const requestApproveShiftFromMenu = useCallback(
    (shift: Shift) => {
      closeRowMenu();
      setShiftToApprove(shift);
      setShowApproveModal(true);
    },
    [closeRowMenu],
  );

  const confirmDeleteShift = useCallback(async () => {
    if (!shiftPendingDelete) return;
    setIsDeletingShift(true);
    try {
      await deleteShift(shiftPendingDelete.id, { agencyId });
      toast({
        title: "Shift deleted",
        description: "This shift was removed from the schedule.",
      });
      setShiftPendingDelete(null);
      onShiftsUpdated?.();
    } catch (err) {
      console.error(err);
      toast({
        title: "Couldn't delete shift",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingShift(false);
    }
  }, [agencyId, shiftPendingDelete, toast, onShiftsUpdated]);

  const confirmApproveShift = useCallback(async () => {
    if (!shiftToApprove) return;
    setIsApproving(true);
    try {
      await updateShift(shiftToApprove.id, { type: ShiftType.AUTOMATIC }, { agencyId });
      toast({
        title: "Success",
        description: "Shift has been approved and converted to automatic.",
      });
      setShowApproveModal(false);
      setShiftToApprove(null);
      onShiftsUpdated?.();
    } catch (error) {
      console.error("Failed to approve shift:", error);
      toast({
        title: "Error",
        description: "Failed to approve shift. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  }, [agencyId, shiftToApprove, toast, onShiftsUpdated]);

  const tabClass = (tab: "previous" | "ongoing" | "upcoming") => cn(
    "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-[9px] px-3 text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#007679]",
    shiftsTab === tab
      ? "bg-[#003839] font-medium text-white shadow-[0_1px_2px_rgba(16,20,26,0.12)] dark:bg-[#0f7e7d] dark:text-white"
      : "text-[#4b535b] hover:text-[#10141a] dark:text-[#9aa4a8] dark:hover:text-[#f4f6f7]",
  );

  const viewButton = (on: boolean) => cn(
    "grid h-8 w-8 cursor-pointer place-items-center rounded-[7px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#007679]",
    on ? "bg-[#003839] font-medium text-white shadow-[0_1px_2px_rgba(16,20,26,0.12)] dark:bg-[#0f7e7d] dark:text-white" : "text-[#4b535b] hover:text-[#10141a] dark:text-[#9aa4a8] dark:hover:text-[#f4f6f7]",
  );

  const shiftsViewToggle = (opts?: { dividerAfterYear?: boolean }) => (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-[10px] bg-[#f4f5f6] p-1 dark:bg-white/5",
        opts?.dividerAfterYear && "ml-0.5",
      )}
      role="tablist"
      aria-label="Shifts view"
    >
      <button
        type="button"
        className={viewButton(shiftsView === "calendar")}
        aria-pressed={shiftsView === "calendar"}
        aria-label="Calendar view"
        onClick={() => setShiftsView("calendar")}
      >
        <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
      </button>
      <button
        type="button"
        className={viewButton(shiftsView === "list")}
        aria-pressed={shiftsView === "list"}
        aria-label="List view"
        onClick={() => setShiftsView("list")}
      >
        <List aria-hidden="true" className="size-4 shrink-0" />
      </button>
    </div>
  );

  const renderShiftRow = (shift: Shift) => {
    const clientName = getClientName(shift);
    const clientImageUrl = getClientAvatar(shift);
    const dspName = shift.employee?.fullName?.trim() || dspFullName;
    const dspImageUrl = shift.employee?.profilePicture || dspProfilePicture;
    const statusInfo = getShiftRowStatusInfo(shift, shift.approved);
    const locationAddress = formatShiftLocation(shift.location) || "";
    const dateLabel = formatShiftDate(shift.date);

    let clockedInDisplay: string;
    let clockedOutDisplay: string;
    let durationLabel: string | null = null;
    let showApproveMenuItem = false;

    if (shiftsTab === "ongoing") {
      clockedInDisplay = shift.clockedInAt
        ? formatShiftRowClockDisplay(shift.clockedInAt)
        : shiftTimeLabel(shift, shift.startTime) || "--:-- --";
      clockedOutDisplay = shiftTimeLabel(shift, shift.endTime) || "--:-- --";
    } else if (shiftsTab === "previous") {
      clockedInDisplay = formatShiftRowClockDisplay(shift.clockedInAt);
      clockedOutDisplay = formatShiftRowClockDisplay(shift.clockedOutAt);
    } else {
      clockedInDisplay = "--:-- --";
      clockedOutDisplay = "--:-- --";
      const d = getSessionDuration(shift);
      durationLabel = d || null;
      showApproveMenuItem =
        shift.type === ShiftType.MANUAL && shift.submissionStatus === SubmissionStatus.SUBMITTED;
    }

    return (
      <DspShiftScheduleListRow
        key={shift.id}
        clientName={clientName}
        clientImageUrl={clientImageUrl}
        clientInitials={getInitials(clientName)}
        dspName={dspName}
        dspImageUrl={dspImageUrl}
        dspInitials={getInitials(dspName)}
        dateLabel={dateLabel}
        locationAddress={locationAddress}
        durationLabel={durationLabel}
        statusInfo={statusInfo}
        clockedInDisplay={clockedInDisplay}
        clockedOutDisplay={clockedOutDisplay}
        menuOpen={shiftMenuOpenForId === shift.id}
        onMenuOpenChange={(open) => setShiftMenuOpenForId(open ? shift.id : null)}
        onDetails={() => goToShiftDetailsPage(shift)}
        onEdit={() => handleEdit(shift)}
        onMaintenance={() => openShiftMaintenanceModal(shift)}
        onDelete={() => requestDeleteShiftFromMenu(shift)}
        showApproveMenuItem={showApproveMenuItem}
        onApprove={showApproveMenuItem ? () => requestApproveShiftFromMenu(shift) : undefined}
      />
    );
  };

  return (
    <div className="space-y-4">
      {shiftsView === "calendar" && (
        <div className="rounded-[16px] border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b] p-5">
          <ShiftsMonthCalendar
            variant="dsp"
            agencyId={agencyId}
            employeeId={dspId}
            headerActions={shiftsViewToggle({ dividerAfterYear: true })}
          />
        </div>
      )}

      {shiftsView === "list" && (
        <>
          <div className="flex justify-end">{shiftsViewToggle()}</div>
          <div className="overflow-hidden rounded-[16px] border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b]">
            <div className="p-4">
            <div role="group" aria-label="Shift period" className="flex max-w-full flex-wrap items-center gap-0.5 rounded-[12px] bg-[#f4f5f6] p-1 sm:inline-flex dark:bg-white/5">
              <button type="button" onClick={() => handleTabChange("previous")} className={tabClass("previous")}>
                Previous Shifts
                {categorized.previous.length > 0 && (
                  <span className="text-[12px] opacity-80">({categorized.previous.length})</span>
                )}
              </button>
              <button type="button" onClick={() => handleTabChange("ongoing")} className={tabClass("ongoing")}>
                Ongoing Shifts
                {categorized.current && <span className="text-[12px] opacity-80">(1)</span>}
              </button>
              <button type="button" onClick={() => handleTabChange("upcoming")} className={tabClass("upcoming")}>
                Upcoming Shifts
                {categorized.upcoming.length > 0 && (
                  <span className="text-[12px] opacity-80">({categorized.upcoming.length})</span>
                )}
              </button>
            </div>

            </div>

            <div className="border-t border-[#eceef0] px-4 py-4 dark:border-white/10">
            {isLoading ? (
              <div role="status" aria-label="Loading shifts" className="space-y-3">
                {[0, 1, 2].map((i) => <div key={i} aria-hidden="true" className="h-[88px] animate-pulse rounded-[12px] bg-[#f4f5f6] dark:bg-white/5" />)}
              </div>
            ) : filteredShifts.length === 0 ? (
              <div className="flex items-center justify-center px-4 py-10 text-center">
                <p className="text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">No {shiftsTab} shifts available</p>
              </div>
            ) : (
              <div className="space-y-3">{paginatedShifts.map(renderShiftRow)}</div>
            )}
            </div>

            {!isLoading && filteredShifts.length > pageSize && (
              <AgencyPagination
                summary={`Showing ${paginatedShifts.length} of ${filteredShifts.length} shifts`}
                page={page}
                pages={totalPages}
                onPage={(next) => setPage(Math.min(totalPages, Math.max(1, next)))}
              />
            )}
          </div>
        </>
      )}

      <Suspense fallback={null}>
        {shiftsView === "list" && (
          <>
            <AddScheduleModal
              isOpen={showAddScheduleModal}
              agencyId={agencyId}
              agencyName={user?.agency?.name || "Agency"}
              agencyMode={agencyMode}
              supportedClientTypes={supportedClientTypes}
              data={operationalData}
              onClose={() => {
                setShowAddScheduleModal(false);
                setEditFormData(null);
              }}
              onShiftsUpdated={() => onShiftsUpdated?.()}
              editData={editFormData}
              mode={modalMode}
            />
            <ShiftDetailsModal
              isOpen={showShiftDetails}
              shift={selectedShift}
              anomalyCodes={selectedShift ? detectShiftAnomalyCodes(selectedShift) : []}
              hydrateFromServer
              agencyId={agencyId}
              onClose={() => {
                setShowShiftDetails(false);
                setSelectedShift(null);
              }}
              onShiftUpdated={() => onShiftsUpdated?.()}
            />
            <DeleteConfirmationModal
              isOpen={!!shiftPendingDelete}
              onClose={() => {
                if (!isDeletingShift) setShiftPendingDelete(null);
              }}
              onConfirm={confirmDeleteShift}
              isDeleting={isDeletingShift}
              title="Delete this shift?"
              message={shiftPendingDelete ? shiftDeleteConfirmMessage(shiftPendingDelete) : ""}
              confirmText="Delete shift"
              cancelText="Cancel"
            />
          </>
        )}
      </Suspense>

      <ConfirmDialog
        open={showApproveModal && !!shiftToApprove}
        onOpenChange={(open: boolean) => {
          if (isApproving) return;
          setShowApproveModal(open);
          if (!open) setShiftToApprove(null);
        }}
      >
        <ConfirmDialogContent
          title="Approve shift?"
          description={
            shiftToApprove
              ? `Are you sure you want to approve this manual shift for ${
                  shiftToApprove.client
                    ? `${shiftToApprove.client.firstName || ""} ${shiftToApprove.client.lastName || ""}`.trim() ||
                      "Unknown Client"
                    : "Unknown Client"
                }? This will convert it to an automatic shift.`
              : ""
          }
          confirmText="Approve Shift"
          cancelText="Cancel"
          onConfirm={() => shiftToApprove && void confirmApproveShift()}
          onCancel={() => setShowApproveModal(false)}
          isLoading={isApproving}
          loadingText="Approving..."
        />
      </ConfirmDialog>
    </div>
  );
}
