import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  Loader2,
  Wrench,
  CalendarDays,
  FileText,
  Pencil,
  Trash2,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, isSameDay, parseISO } from "date-fns";
import { listShifts, deleteShift, Shift, ShiftStatus, ListShiftsParams } from "@/lib/api/shifts";
import { listClients } from "@/lib/api/clients";
import { listEmployees } from "@/lib/api/employees";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, generatePath } from "react-router";
import { Routes } from "@/routes/constants";
import AddScheduleModal, { ScheduleFormData } from "./components/AddScheduleModal";
import { shiftToScheduleFormData } from "./shift-to-schedule-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/utils/auth";
import ShiftDetailsModal from "@/components/ShiftDetailsModal";
import { detectShiftAnomalyCodes } from "@/lib/shift-anomaly-detection";
import { ANOMALY_LABELS } from "@/pages/shared/shift-maintenance/audit-display";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import {
  getInitialsFromShiftPersonName,
  getShiftRowStatusInfo,
  isShiftMissed,
} from "@/lib/shift-row-status";
import { formatShiftRowClockDisplay } from "@/lib/shift-row-time";
import { shiftDeleteConfirmMessage } from "@/lib/shift-delete-confirm";

const PERSON_TYPEAHEAD_LIMIT = 10;
const PERSON_RESULTS_MERGED_MAX = 15;
const PERSON_SEARCH_DEBOUNCE_MS = 300;

type PersonFilter = { kind: "client" | "dsp"; id: string; label: string };

type PersonSearchRow = { kind: "client" | "dsp"; id: string; label: string };

function clientDisplayName(c: { firstName?: string; lastName?: string }): string {
  const n = `${c.firstName || ""} ${c.lastName || ""}`.trim();
  return n || "Unknown client";
}

export default function SchedulingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [showShiftDetails, setShowShiftDetails] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [editFormData, setEditFormData] = useState<ScheduleFormData | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [shiftMenuOpenForId, setShiftMenuOpenForId] = useState<string | null>(null);
  const [shiftPendingDelete, setShiftPendingDelete] = useState<Shift | null>(null);
  const [isDeletingShift, setIsDeletingShift] = useState(false);

  // API data states
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [personFilter, setPersonFilter] = useState<PersonFilter | null>(null);
  const [personSearchInput, setPersonSearchInput] = useState("");
  const [personSearchOpen, setPersonSearchOpen] = useState(false);
  const [personSearchResults, setPersonSearchResults] = useState<PersonSearchRow[]>([]);
  const [personSearchLoading, setPersonSearchLoading] = useState(false);
  /** When this equals trimmed query, last fetch finished (for empty state). */
  const [personSearchSettledKey, setPersonSearchSettledKey] = useState<string | null>(null);
  const [personSearchTruncated, setPersonSearchTruncated] = useState(false);
  const personSearchContainerRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 6;

  const loadShifts = useCallback(async () => {
    const agencyId = user?.agencyId;
    if (!agencyId) return;

    try {
      setLoading(true);
      const params: ListShiftsParams = {
        limit: 100,
        agencyId,
        client: true,
        employee: true,
      };
      if (personFilter?.kind === "client") params.clientId = personFilter.id;
      if (personFilter?.kind === "dsp") params.employeeId = personFilter.id;

      const response = await listShifts(params);
      setShifts(response.shifts || []);
    } catch (error) {
      console.error("Failed to fetch shifts:", error);
      toast({
        title: "Couldn’t load shifts",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.agencyId, personFilter, toast]);

  useEffect(() => {
    if (!user?.agencyId) return;
    void loadShifts();
  }, [user?.agencyId, loadShifts]);

  const handleEdit = (shift: Shift) => {
    setEditFormData(shiftToScheduleFormData(shift));
    setModalMode("edit");
    setShowAddScheduleModal(true);
  };

  const closeShiftRowMenu = () => setShiftMenuOpenForId(null);

  const goToShiftDetailsPage = (shift: Shift) => {
    closeShiftRowMenu();
    navigate(generatePath(Routes.agency.shiftDetails, { shiftId: shift.id }));
  };

  const openShiftMaintenanceModal = (shift: Shift) => {
    closeShiftRowMenu();
    setSelectedShift(shift);
    setShowShiftDetails(true);
  };

  const openEditScheduleFromMenu = (shift: Shift) => {
    closeShiftRowMenu();
    handleEdit(shift);
  };

  const requestDeleteShiftFromMenu = (shift: Shift) => {
    closeShiftRowMenu();
    setShiftPendingDelete(shift);
  };

  const confirmDeleteShift = async () => {
    if (!shiftPendingDelete) return;
    setIsDeletingShift(true);
    try {
      await deleteShift(shiftPendingDelete.id);
      setShifts((prev) => prev.filter((s) => s.id !== shiftPendingDelete.id));
      toast({
        title: "Shift deleted",
        description: "This shift was removed from the schedule.",
      });
      setShiftPendingDelete(null);
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
  };

  // Calculate shift statistics
  const shiftStats = useMemo(() => {
    const targetDate = selectedDate || new Date();
    const filteredShifts = shifts.filter(shift => {
      if (!shift.date) return false;
      try {
        const shiftDate = parseISO(shift.date);
        return isSameDay(shiftDate, targetDate);
      } catch {
        return false;
      }
    });

    const active = filteredShifts.filter(s => s.status === ShiftStatus.ONGOING).length;
    const completed = filteredShifts.filter(s => s.status === ShiftStatus.COMPLETED).length;
    const missed = filteredShifts.filter(isShiftMissed).length;

    return {
      active,
      completed,
      missed,
      date: format(targetDate, "d MMMM"),
      total: filteredShifts.length,
    };
  }, [shifts, selectedDate]);

  const shiftDatesWithShifts = useMemo(() => {
    const s = new Set<string>();
    for (const sh of shifts) {
      if (sh.date) s.add(sh.date);
    }
    return s;
  }, [shifts]);

  const filteredActivityShifts = useMemo(() => {
    if (!selectedDate) return shifts;
    return shifts.filter(shift => {
      if (!shift.date) return false;
      try {
        const shiftDate = parseISO(shift.date);
        return isSameDay(shiftDate, selectedDate);
      } catch {
        return false;
      }
    });
  }, [shifts, selectedDate]);

  const totalActivityPages = Math.max(1, Math.ceil(filteredActivityShifts.length / itemsPerPage));

  useEffect(() => {
    setActivityPage(1);
  }, [selectedDate, personFilter]);

  useEffect(() => {
    setActivityPage((p) => Math.min(Math.max(1, p), totalActivityPages));
  }, [totalActivityPages]);

  useEffect(() => {
    const agencyId = user?.agencyId;
    if (!agencyId || personFilter) {
      setPersonSearchResults([]);
      setPersonSearchLoading(false);
      setPersonSearchSettledKey(null);
      setPersonSearchTruncated(false);
      return;
    }

    const q = personSearchInput.trim();
    if (q.length < 2) {
      setPersonSearchResults([]);
      setPersonSearchLoading(false);
      setPersonSearchSettledKey(null);
      setPersonSearchTruncated(false);
      return;
    }

    const ac = new AbortController();
    setPersonSearchLoading(true);
    setPersonSearchSettledKey(null);

    const timer = window.setTimeout(async () => {
      try {
        const [clientsOutcome, employeesOutcome] = await Promise.allSettled([
          listClients({
            search: q,
            agencyId,
            limit: PERSON_TYPEAHEAD_LIMIT,
            signal: ac.signal,
          }),
          listEmployees({
            search: q,
            agencyId,
            limit: PERSON_TYPEAHEAD_LIMIT,
            signal: ac.signal,
          }),
        ]);

        if (ac.signal.aborted) return;

        const rows: PersonSearchRow[] = [];

        if (clientsOutcome.status === "fulfilled") {
          for (const c of clientsOutcome.value) {
            rows.push({
              kind: "client",
              id: c.id,
              label: clientDisplayName(c),
            });
          }
        }

        if (employeesOutcome.status === "fulfilled") {
          for (const e of employeesOutcome.value.employees) {
            rows.push({
              kind: "dsp",
              id: e.id,
              label: e.fullName?.trim() || "Unknown DSP",
            });
          }
        }

        const merged = rows.slice(0, PERSON_RESULTS_MERGED_MAX);
        setPersonSearchResults(merged);
        setPersonSearchSettledKey(q);
        setPersonSearchTruncated(rows.length > PERSON_RESULTS_MERGED_MAX);

        if (
          clientsOutcome.status === "rejected" &&
          employeesOutcome.status === "rejected"
        ) {
          toast({
            title: "Couldn’t search directory",
            description: "Check your connection and try again.",
            variant: "destructive",
          });
        }
      } catch (err) {
        if (ac.signal.aborted) return;
        console.error("Person search failed:", err);
        setPersonSearchResults([]);
        setPersonSearchSettledKey(q);
        setPersonSearchTruncated(false);
      } finally {
        if (!ac.signal.aborted) {
          setPersonSearchLoading(false);
        }
      }
    }, PERSON_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [personSearchInput, user?.agencyId, personFilter, toast]);

  useEffect(() => {
    if (!personSearchOpen) return;
    const onDocMouseDown = (ev: MouseEvent) => {
      const el = personSearchContainerRef.current;
      if (el && !el.contains(ev.target as Node)) {
        setPersonSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [personSearchOpen]);

  const paginatedShifts = filteredActivityShifts.slice(
    (activityPage - 1) * itemsPerPage,
    activityPage * itemsPerPage
  );

  const clearPersonFilter = useCallback(() => {
    setPersonFilter(null);
    setPersonSearchInput("");
    setPersonSearchResults([]);
    setPersonSearchSettledKey(null);
    setPersonSearchTruncated(false);
    setPersonSearchOpen(false);
  }, []);

  const selectPersonRow = useCallback((row: PersonSearchRow) => {
    setPersonFilter((prev) => {
      if (prev?.id === row.id && prev.kind === row.kind) return prev;
      return { kind: row.kind, id: row.id, label: row.label };
    });
    setPersonSearchInput(row.label);
    setPersonSearchOpen(false);
    setPersonSearchResults([]);
    setPersonSearchSettledKey(null);
    setPersonSearchTruncated(false);
  }, []);

  const personSearchTrimmed = personSearchInput.trim();
  const showPersonDropdown =
    personSearchOpen &&
    !personFilter &&
    personSearchTrimmed.length >= 2 &&
    (personSearchLoading ||
      personSearchResults.length > 0 ||
      (personSearchSettledKey === personSearchTrimmed && !personSearchLoading));

  return (
    <>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
            Shift Management
          </h1>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(Routes.agency.shiftMaintenance)}
              className="flex items-center gap-2 rounded-full border-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.5)] px-4 py-3 h-auto text-[14px] font-semibold text-[#10141a] shadow-sm hover:bg-white/80"
              aria-label="Open shift maintenance: review problem shifts and activity history"
            >
              <Wrench className="size-5 shrink-0" aria-hidden />
              Maintenance
            </Button>
            <Button
              onClick={() => {
                setEditFormData(null);
                setModalMode("create");
                setShowAddScheduleModal(true);
              }}
              className="flex items-center gap-3 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-4 py-3 h-auto font-semibold text-[14px]"
            >
              <Plus className="w-5 h-5" />
              Add Schedule
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-5">
          {/* Shifts Summary Card */}
          <div className="rounded-[20px] bg-[#FFFFFF4D] p-6 shadow-sm border border-white">
            <div className="flex items-center gap-2">
              {/* Title Section */}
              <div className="flex flex-col gap-1 w-[214px]">
                <h2 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
                  Shifts ({shiftStats.date})
                </h2>
                <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                  Scheduled shifts on {shiftStats.date}
                  {personFilter ? ` · ${personFilter.label}` : ""}
                </p>
              </div>

              {/* Stats Section */}
              <div className="flex gap-12 px-6 cursor-pointer" onClick={() => navigate(Routes.agency.shiftsList)}>
                {/* Active */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[40px] font-semibold leading-normal text-[#10141a]">
                    {loading ? "-" : shiftStats.active}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#0EAF52]" />
                    <span className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                      Active
                    </span>
                  </div>
                </div>

                {/* Completed */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[40px] font-semibold leading-normal text-[#10141a]">
                    {loading ? "-" : shiftStats.completed}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#2B82FF]" />
                    <span className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                      Completed
                    </span>
                  </div>
                </div>

                {/* Missed */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[40px] font-semibold leading-normal text-[#10141a]">
                    {loading ? "-" : shiftStats.missed}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#D53411]" />
                    <span className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                      Missed
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[40px] font-semibold leading-normal text-[#10141a]">
                    {loading ? "-" : shiftStats.total}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#808081]" />
                    <span className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                      Total
                    </span>
                  </div>
                </div>
              </div>

              {/* Expand Button */}
              <button
                onClick={() => navigate(Routes.agency.shiftsList)}
                className="ml-auto bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full w-[38px] h-[38px] flex items-center justify-center hover:bg-white/70 transition-colors cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 text-[#10141a]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent shifts */}
      <div className="mt-5 rounded-[20px] bg-[#FFFFFF4D] p-6 shadow-sm border border-white">
        <div>
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 basis-full lg:basis-[min(100%,240px)]">
              <h2 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
                Recent Shifts
              </h2>
              <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                Filter by date, search for a client or DSP to narrow the list.
              </p>
            </div>

            <div
              ref={personSearchContainerRef}
              className="relative w-full max-w-md flex-1 lg:mx-2 lg:min-w-[220px]"
            >
              <div className="relative flex items-center gap-1">
                <Search className="pointer-events-none absolute left-3 size-4 text-[#808081]" aria-hidden />
                <Input
                  type="search"
                  autoComplete="off"
                  placeholder="Search by client or DSP name"
                  aria-label="Search by client or DSP name to filter shifts"
                  aria-expanded={showPersonDropdown}
                  aria-controls="recent-shifts-person-results"
                  aria-autocomplete="list"
                  role="combobox"
                  value={personSearchInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (personFilter) {
                      setPersonFilter(null);
                      setPersonSearchInput(v);
                      setPersonSearchOpen(true);
                      return;
                    }
                    setPersonSearchInput(v);
                  }}
                  onFocus={(e) => {
                    if (personFilter) {
                      (e.target as HTMLInputElement).select();
                      return;
                    }
                    setPersonSearchOpen(true);
                  }}
                  className="h-10 rounded-full border-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.5)] pl-9 pr-10 text-[14px] font-medium shadow-sm"
                />
                {personFilter ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 size-8 shrink-0 rounded-full text-[#10141a] hover:bg-black/[0.06]"
                    aria-label="Clear person filter and show all shifts"
                    onClick={clearPersonFilter}
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
              {showPersonDropdown ? (
                <div
                  id="recent-shifts-person-results"
                  role="listbox"
                  className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-[min(320px,70vh)] overflow-auto rounded-xl border border-white/40 bg-[#FFFFFFF2] py-1 shadow-lg backdrop-blur-md"
                >
                  {personSearchLoading && personSearchResults.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-[14px] text-[#808081]">
                      <Loader2 className="size-4 animate-spin text-[#00b4b8]" aria-hidden />
                      Searching…
                    </div>
                  ) : null}
                  {personSearchResults.map((row) => (
                    <button
                      key={`${row.kind}-${row.id}`}
                      type="button"
                      role="option"
                      className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left text-[14px] hover:bg-black/[0.06]"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectPersonRow(row)}
                    >
                      <span className="min-w-0 truncate font-medium text-[#10141a]">{row.label}</span>
                      <span className="shrink-0 rounded-full bg-black/[0.06] px-2 py-0.5 text-[12px] font-semibold text-[#808081]">
                        {row.kind === "client" ? "Client" : "DSP"}
                      </span>
                    </button>
                  ))}
                  {!personSearchLoading &&
                  personSearchSettledKey === personSearchTrimmed &&
                  personSearchResults.length === 0 ? (
                    <p className="px-3 py-4 text-center text-[14px] text-[#808081]">No matches</p>
                  ) : null}
                  {personSearchTruncated ? (
                    <p className="border-t border-[#e5e5e6] px-3 py-2 text-[12px] text-[#808081]">
                      Keep typing to narrow results.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
              <Popover
                open={calendarOpen}
                onOpenChange={(open) => {
                  setCalendarOpen(open);
                  if (open) setCalendarMonth(selectedDate ?? new Date());
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex h-10 items-center gap-2 rounded-full border-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.5)] px-3 text-[14px] font-semibold text-[#10141a] shadow-sm hover:bg-white/80"
                    aria-expanded={calendarOpen}
                    aria-haspopup="dialog"
                    aria-label={
                      selectedDate
                        ? `Date filter: ${format(selectedDate, "MMMM d, yyyy")}. Open calendar to change`
                        : "Filter recent shifts by date"
                    }
                  >
                    <CalendarDays className="size-4 shrink-0 text-[#10141a]" aria-hidden />
                    <span className="max-w-[140px] truncate sm:max-w-[180px]">
                      {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Filter by date"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto border border-white/40 bg-[#FFFFFFF2] p-0 shadow-lg backdrop-blur-md" align="end">
                  <div className="p-1">
                    <Calendar
                      mode="single"
                      weekStartsOn={1}
                      captionLayout="dropdown"
                      month={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      selected={selectedDate ?? undefined}
                      onSelect={(d) => {
                        setSelectedDate(d ?? null);
                        if (d) setCalendarMonth(d);
                        setCalendarOpen(false);
                      }}
                      modifiers={{
                        hasShift: (date) => shiftDatesWithShifts.has(format(date, "yyyy-MM-dd")),
                      }}
                      modifiersClassNames={{
                        hasShift:
                          "relative after:pointer-events-none after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary data-[selected-single=true]:after:bg-primary-foreground",
                      }}
                    />
                  </div>
                  {selectedDate ? (
                    <div className="border-t border-[#e5e5e6] p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 w-full text-[14px] font-medium text-[#10141a]"
                        onClick={() => {
                          setSelectedDate(null);
                          setCalendarOpen(false);
                        }}
                      >
                        Show all days
                      </Button>
                    </div>
                  ) : null}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Activity Items */}
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#00b4b8]" />
              </div>
            ) : filteredActivityShifts.length === 0 ? (
              <div className="flex items-center justify-center py-8 px-4 text-center">
                <p className="text-[14px] text-[#808081] max-w-md">
                  {shifts.length === 0
                    ? personFilter
                      ? `No shifts for ${personFilter.label}. Clear the person filter or pick another name.`
                      : "No shifts yet. Add a schedule to get started."
                    : selectedDate && personFilter
                      ? `No shifts for ${personFilter.label} on ${format(selectedDate, "MMMM d, yyyy")}. Try another date, clear the person filter, or open the calendar and choose Show all days.`
                    : selectedDate
                      ? `No shifts on ${format(selectedDate, "MMMM d, yyyy")}. Try another date, or open the calendar filter and choose Show all days.`
                      : personFilter
                        ? `No shifts for ${personFilter.label} in this list. Clear the filter or try another name.`
                        : "No shifts to show."}
                </p>
              </div>
            ) : (
              paginatedShifts.map((shift) => {
                const statusInfo = getShiftRowStatusInfo(shift, shift.approved);
                const anomalyCodes = detectShiftAnomalyCodes(shift);
                const primaryAnomaly = anomalyCodes[0];
                const primaryAnomalyMeta = primaryAnomaly ? ANOMALY_LABELS[primaryAnomaly] : null;
                const primaryAnomalyLabel =
                  primaryAnomaly === "incomplete_clock" ? "Incomplete shift" : primaryAnomalyMeta?.label;
                const clientName = shift.client
                  ? `${shift.client.firstName || ""} ${shift.client.lastName || ""}`.trim() || "Unknown Client"
                  : "Unknown Client";
                const employeeName = shift.employee?.fullName || "Unknown DSP";

                return (
                  <div
                    key={shift.id}
                    className="flex flex-wrap items-center gap-4 backdrop-blur-[20px] rounded-[20px]"
                  >
                    {/* Client Info */}
                    <div className="flex items-center gap-4 w-[256px]">
                      <Avatar className="w-[52.5px] h-[60px] rounded-[8px] shrink-0">
                        {shift.client?.profileImage && (
                          <AvatarImage
                            src={shift.client.profileImage}
                            alt={clientName}
                            className="w-full h-full object-cover aspect-auto"
                          />
                        )}
                        <AvatarFallback className="w-full h-full rounded-[8px] bg-linear-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
                          {getInitialsFromShiftPersonName(clientName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[16px] font-semibold leading-[1.6] text-black">
                          {clientName}
                        </span>
                        <span className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                          Client
                        </span>
                      </div>
                    </div>

                    {/* DSP/Employee Info */}
                    <div className="flex items-center gap-4 w-[256px]">
                      <Avatar className="w-[52.5px] h-[60px] rounded-[8px] shrink-0">
                        {shift.employee?.profilePicture && (
                          <AvatarImage
                            src={shift.employee.profilePicture}
                            alt={employeeName}
                            className="w-full h-full object-cover aspect-auto"
                          />
                        )}
                        <AvatarFallback className="w-full h-full rounded-[8px] bg-linear-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
                          {getInitialsFromShiftPersonName(employeeName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[16px] font-semibold leading-[1.6] text-black">
                          {employeeName}
                        </span>
                        <span className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                          DSP
                        </span>
                      </div>
                    </div>

                    {/* Status & Times */}
                    <div className="flex items-center gap-16 flex-1 w-[100px]">
                      {/* Anomaly takes priority over status when present. */}
                      {primaryAnomalyMeta ? (
                        <div
                          className={`rounded-full min-h-7 flex items-center justify-center gap-1 px-2.5 text-[12px] font-semibold whitespace-nowrap ${primaryAnomalyMeta.color}`}
                          title={primaryAnomalyMeta.label}
                        >
                          {primaryAnomalyLabel}
                        </div>
                      ) : (
                        <div
                          className="rounded-full min-w-[54px] min-h-7 flex items-center justify-center gap-1 px-2.5"
                          style={{
                            backgroundColor: statusInfo.bgColor,
                            border: `1px solid ${statusInfo.color}`
                          }}
                        >
                          <span
                            className="text-[12px] font-semibold"
                            style={{ color: statusInfo.color }}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-16 flex-1 w-[100px]">
                      {/* Clocked In */}
                      <div className="text-[14px] font-medium leading-[1.4] flex flex-col">
                        <span className="text-[#808081] whitespace-nowrap">Clocked In </span>
                        <span className="text-[#10141a]">
                          {shift.clockedInAt ? formatShiftRowClockDisplay(shift.clockedInAt) : "--:-- --"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-16 flex-1 w-[100px]">
                      {/* Clocked Out */}
                      <div className="text-[14px] font-medium leading-[1.4] flex flex-col">
                        <span className="text-[#808081] whitespace-nowrap">Clocked Out </span>
                        <span className="text-[#10141a]">
                          {shift.clockedOutAt ? formatShiftRowClockDisplay(shift.clockedOutAt) : "--:-- --"}
                        </span>
                      </div>
                    </div>

                    <Popover
                      open={shiftMenuOpenForId === shift.id}
                      onOpenChange={(open) => setShiftMenuOpenForId(open ? shift.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 gap-1.5 rounded-full border-[rgba(255,255,255,0.6)] bg-white px-4 text-[14px] font-semibold text-[#10141a] shadow-sm hover:bg-white"
                          aria-expanded={shiftMenuOpenForId === shift.id}
                          aria-haspopup="dialog"
                          aria-label={`Shift actions for ${clientName}`}
                        >
                          Actions
                          <ChevronDown className="size-4 shrink-0 opacity-70" aria-hidden />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[min(calc(100vw-2rem),15.5rem)] border border-white/40 bg-[#FFFFFFF2] p-1 shadow-lg backdrop-blur-md"
                        align="end"
                      >
                        <div className="flex flex-col gap-0.5" role="menu">
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[#10141a] hover:bg-black/[0.06]"
                            aria-label="Open full shift details page"
                            onClick={() => goToShiftDetailsPage(shift)}
                          >
                            <FileText className="size-4 shrink-0 text-[#808081]" aria-hidden />
                            Details
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[#10141a] hover:bg-black/[0.06]"
                            aria-label="Edit this shift in the schedule"
                            onClick={() => openEditScheduleFromMenu(shift)}
                          >
                            <Pencil className="size-4 shrink-0 text-[#808081]" aria-hidden />
                            Edit
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[#10141a] hover:bg-black/[0.06]"
                            aria-label="Adjust clock times, notes, or mark shift completed"
                            onClick={() => openShiftMaintenanceModal(shift)}
                          >
                            <Wrench className="size-4 shrink-0 text-[#808081]" aria-hidden />
                            Maintenance
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[#D53411] hover:bg-red-50"
                            aria-label="Delete this shift from the schedule"
                            onClick={() => requestDeleteShiftFromMenu(shift)}
                          >
                            <Trash2 className="size-4 shrink-0" aria-hidden />
                            Delete
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {filteredActivityShifts.length > 0 && totalActivityPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <span className="text-[16px] font-medium leading-[1.6] text-[#10141a]">
                {activityPage}
                <span className="text-[14px] text-[#808081]">/{totalActivityPages}</span>
              </span>
              <button
                onClick={() => setActivityPage(Math.max(1, activityPage - 1))}
                disabled={activityPage === 1}
                className="backdrop-blur-[2.909px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full p-1.5 disabled:opacity-50 hover:bg-white/70 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-[#10141a]" />
              </button>
              <button
                onClick={() => setActivityPage(Math.min(totalActivityPages, activityPage + 1))}
                disabled={activityPage === totalActivityPages}
                className="backdrop-blur-[2.909px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full p-1.5 disabled:opacity-50 hover:bg-white/70 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-[#10141a]" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Schedule Modal */}
      <AddScheduleModal
        isOpen={showAddScheduleModal}
        onClose={() => {
          setShowAddScheduleModal(false);
          setEditFormData(null);
          setModalMode("create");
        }}
        onShiftsUpdated={() => void loadShifts()}
        editData={editFormData}
        mode={modalMode}
      />
      <ShiftDetailsModal
        isOpen={showShiftDetails}
        shift={selectedShift}
        anomalyCodes={selectedShift ? detectShiftAnomalyCodes(selectedShift) : []}
        hydrateFromServer
        agencyId={user?.agencyId ?? ""}
        onClose={() => {
          setShowShiftDetails(false);
          setSelectedShift(null);
        }}
        onShiftUpdated={(_updated) => void loadShifts()}
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
  );
}
