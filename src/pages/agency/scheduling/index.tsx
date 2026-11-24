import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Settings,
  CalendarDays,
  FileText,
  Pencil,
  Trash2,
  Search,
  X,
  Wrench,
  MoreHorizontal,
  SlidersHorizontal,
  Users,
  UserRoundCheck,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { addDays, addWeeks, format, isSameDay, isToday, parseISO, startOfWeek } from "date-fns";
import { listShifts, deleteShift, Shift, ListShiftsParams } from "@/lib/api/shifts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation, useNavigate } from "react-router";
import AddScheduleModal, { ScheduleFormData } from "./components/AddScheduleModal";
import { shiftToScheduleFormData } from "./shift-to-schedule-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { staffLabels } from "@/lib/roleLabel";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";
import ShiftDetailsModal from "@/components/ShiftDetailsModal";
import { detectShiftAnomalyCodes } from "@/lib/shift-anomaly-detection";
import { ANOMALY_LABELS } from "@/pages/shared/shift-maintenance/audit-display";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import { getInitialsFromShiftPersonName } from "@/lib/shift-row-status";
import { shiftDeleteConfirmMessage } from "@/lib/shift-delete-confirm";
import { AgencyPageHeader, AgencyStatCard } from "@/components/agency/AgencyShell";
import { CI_PROGRAMS, ciApi, type CiSession } from "@/lib/api/ci-tracker";
import { Routes } from "@/routes/constants";
import { cn } from "@/lib/utils";
import {
  boardStatus,
  clientDisplayName,
  clientRef,
  clock24,
  clockSummary,
  compareShifts,
  formatDuration,
  groupOutings,
  outingStatus,
  scheduledMinutes,
  serviceLabel,
  serviceParts,
  staffRef,
  type BoardItem,
  type BoardStatus,
} from "./shift-board";

const PERSON_TYPEAHEAD_LIMIT = 10;
const PERSON_RESULTS_MERGED_MAX = 15;
const PERSON_SEARCH_DEBOUNCE_MS = 300;
const ROWS_PER_PAGE = 10;
/** Range pages of 200 shifts; a week rarely needs more than one. */
const WEEK_PAGE_LIMIT = 200;
const WEEK_MAX_PAGES = 5;

type PersonFilter = { kind: "client" | "dsp"; id: string; label: string };
type PersonSearchRow = { kind: "client" | "dsp"; id: string; label: string };
type Tab = "all" | Exclude<BoardStatus, "scheduled">;

const STATUS_PILL: Record<BoardStatus, { label: string; className: string }> = {
  missed: { label: "Missed shift", className: "bg-[#fde8e6] text-[#b42318] dark:bg-[#4a1b17] dark:text-[#ffb4a9]" },
  active: { label: "In progress", className: "bg-[#e6edf5] text-[#2d4a6b] dark:bg-[#1d2d40] dark:text-[#a9c4e4]" },
  completed: { label: "Completed", className: "bg-[#e3f6ec] text-[#0f7a43] dark:bg-[#0f3523] dark:text-[#7fe0aa]" },
  scheduled: { label: "Scheduled", className: "bg-[#eef1f3] text-[#3d4a50] dark:bg-white/10 dark:text-[#c9d3d6]" },
};

const OUTLINE_BUTTON =
  "inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-[#dcdfe2] bg-white px-3.5 text-sm font-medium text-[#10141a] transition-colors hover:bg-[#f4f5f6] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5";
const MENU_ITEM =
  "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[#10141a] hover:bg-black/[0.06] dark:text-[#f4f6f7] dark:hover:bg-white/10";

function StatusPill({ status, label }: { status: BoardStatus; label?: string }) {
  const pill = STATUS_PILL[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium", pill.className)}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {label || pill.label}
    </span>
  );
}

function PersonAvatar({ name, image, className }: { name: string; image?: string; className?: string }) {
  return (
    <Avatar className={cn("h-9 w-9 shrink-0 rounded-full", className)}>
      {image ? <AvatarImage src={image} alt="" className="h-full w-full object-cover" /> : null}
      <AvatarFallback className="h-full w-full rounded-full bg-[#e6eeee] text-[12px] font-semibold text-[#0b5c5d] dark:bg-white/10 dark:text-[#7fd3d3]">
        {getInitialsFromShiftPersonName(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function ServiceCell({ shift }: { shift: Shift }) {
  const { name, code } = serviceParts(shift);
  return (
    <div className="min-w-0 text-sm">
      <p className="truncate text-[#10141a] dark:text-[#f4f6f7]" title={name}>{name}</p>
      {code && code !== name && <p className="text-xs text-[#5b636b] dark:text-[#9aa4a8]">{code}</p>}
    </div>
  );
}

function TimeCell({ shift }: { shift: Shift }) {
  const minutes = scheduledMinutes(shift);
  return (
    <div className="text-sm">
      <p className="whitespace-nowrap text-[#10141a] dark:text-[#f4f6f7]">{clock24(shift.startTime)} – {shift.endTime ? clock24(shift.endTime) : "?"}</p>
      {minutes != null && <p className="text-xs text-[#5b636b] dark:text-[#9aa4a8]">{formatDuration(minutes)}</p>}
    </div>
  );
}

function ClockCell({ shift }: { shift: Shift }) {
  const status = boardStatus(shift);
  const { clockIn, clockOut, workedMinutes } = clockSummary(shift);
  if (!clockIn) {
    return status === "missed"
      ? <p className="text-sm font-medium text-[#b42318] dark:text-[#ffb4a9]">Not clocked in</p>
      : <p className="text-sm text-[#8a979d]">–</p>;
  }
  return (
    <div className="text-sm">
      <p className="whitespace-nowrap text-[#10141a] dark:text-[#f4f6f7]">{clockIn} / {clockOut || "–"}</p>
      <p className="text-xs text-[#5b636b] dark:text-[#9aa4a8]">
        {clockOut ? (workedMinutes != null ? formatDuration(workedMinutes) : "Clocked out") : "On shift"}
      </p>
    </div>
  );
}

/** The day in "?date=YYYY-MM-DD" (e.g. an outing's "Open in Shift management" link), else today. */
function dateFromSearch(search: string): Date {
  const param = new URLSearchParams(search).get("date");
  const parsed = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? parseISO(param) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
}

export default function SchedulingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    actor,
    agencyId,
    agency,
    mode: selectedMode,
    routes,
    data,
    capabilities,
  } = useOperationalAgency();
  const effectiveTypes = selectedMode ? [selectedMode] : agency.supportedClientTypes;
  const labels = staffLabels([...effectiveTypes]);
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(() => dateFromSearch(location.search));
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>("all");
  const [serviceFilter, setServiceFilter] = useState<Set<string>>(new Set());
  const [outingsOnly, setOutingsOnly] = useState(false);
  const [expandedOutings, setExpandedOutings] = useState<Set<string>>(new Set());
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
  const [weekTruncated, setWeekTruncated] = useState(false);
  const [outingSessions, setOutingSessions] = useState<Record<string, CiSession>>({});
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
  const deleteRequestVersion = useRef(0);

  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekStartKey = format(weekStart, "yyyy-MM-dd");
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  /** Loads every shift in the selected week (Monday to Sunday). */
  const loadShifts = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const start = parseISO(weekStartKey);
      const params: ListShiftsParams = {
        limit: WEEK_PAGE_LIMIT,
        agencyId,
        client: true,
        employee: true,
        clientType: selectedMode ?? undefined,
        startDate: weekStartKey,
        endDate: format(addDays(start, 6), "yyyy-MM-dd"),
      };
      if (personFilter?.kind === "client") params.clientId = personFilter.id;
      if (personFilter?.kind === "dsp") params.employeeId = personFilter.id;

      const loaded: Shift[] = [];
      let cursor: string | null | undefined;
      for (let pageIndex = 0; pageIndex < WEEK_MAX_PAGES; pageIndex += 1) {
        const response = await listShifts(cursor ? { ...params, startAfter: cursor } : params, { signal });
        if (signal?.aborted) return;
        loaded.push(...(response.shifts || []));
        cursor = response.nextCursor;
        if (!cursor) break;
      }
      setShifts(loaded);
      setWeekTruncated(Boolean(cursor));
    } catch (error) {
      if (signal?.aborted) return;
      console.error("Failed to fetch shifts:", error);
      toast({
        title: "Couldn’t load shifts",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [agencyId, personFilter, toast, selectedMode, weekStartKey]);

  useEffect(() => {
    const controller = new AbortController();
    void loadShifts(controller.signal);
    return () => controller.abort();
  }, [loadShifts]);

  // Names and places for the week's group outings (agency side only; staff pages use their own).
  const outingIdsKey = useMemo(
    () => [...new Set(shifts.map((s) => s.ciSessionId).filter(Boolean))].sort().join(","),
    [shifts],
  );
  useEffect(() => {
    if (actor !== "agency" || !outingIdsKey) {
      setOutingSessions({});
      return;
    }
    const controller = new AbortController();
    ciApi
      .listSessions({ from: weekStartKey, to: format(addDays(parseISO(weekStartKey), 6), "yyyy-MM-dd") }, controller.signal)
      .then((sessions) => {
        if (controller.signal.aborted) return;
        setOutingSessions(Object.fromEntries(sessions.map((s) => [s.id, s])));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [actor, outingIdsKey, weekStartKey]);

  useEffect(() => {
    deleteRequestVersion.current += 1;
    setSelectedDate(dateFromSearch(location.search));
    setCalendarOpen(false);
    setPage(1);
    setTab("all");
    setServiceFilter(new Set());
    setOutingsOnly(false);
    setExpandedOutings(new Set());
    setShowAddScheduleModal(false);
    setShowShiftDetails(false);
    setSelectedShift(null);
    setEditFormData(null);
    setModalMode("create");
    setShiftMenuOpenForId(null);
    setShiftPendingDelete(null);
    setIsDeletingShift(false);
    setPersonFilter(null);
    setPersonSearchInput("");
    setPersonSearchOpen(false);
    setPersonSearchResults([]);
    setPersonSearchSettledKey(null);
    setPersonSearchTruncated(false);
    setShifts([]);
    return () => {
      deleteRequestVersion.current += 1;
    };
  }, [agencyId]);

  const handleEdit = (shift: Shift) => {
    setEditFormData(shiftToScheduleFormData(shift));
    setModalMode("edit");
    setShowAddScheduleModal(true);
  };

  const closeShiftRowMenu = () => setShiftMenuOpenForId(null);

  const goToShiftDetailsPage = (shift: Shift) => {
    closeShiftRowMenu();
    if (actor === "super_admin") {
      const params = new URLSearchParams({
        agencyId,
        returnTo: `${location.pathname}${location.search}`,
      });
      navigate(routes.details(shift.id, params.toString()));
      return;
    }
    navigate(routes.details(shift.id));
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
    const requestId = ++deleteRequestVersion.current;
    const pendingShiftId = shiftPendingDelete.id;
    setIsDeletingShift(true);
    try {
      await deleteShift(pendingShiftId, { agencyId });
      if (requestId !== deleteRequestVersion.current) return;
      setShifts((prev) => prev.filter((s) => s.id !== pendingShiftId));
      toast({
        title: "Shift deleted",
        description: "This shift was removed from the schedule.",
      });
      setShiftPendingDelete(null);
    } catch (err) {
      if (requestId !== deleteRequestVersion.current) return;
      console.error(err);
      toast({
        title: "Couldn't delete shift",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      if (requestId === deleteRequestVersion.current) setIsDeletingShift(false);
    }
  };

  const shiftsByDay = useMemo(() => {
    const byDay = new Map<string, Shift[]>();
    for (const shift of shifts) {
      if (!shift.date) continue;
      const list = byDay.get(shift.date);
      if (list) list.push(shift); else byDay.set(shift.date, [shift]);
    }
    return byDay;
  }, [shifts]);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  const dayShifts = useMemo(
    () => [...(shiftsByDay.get(selectedKey) || [])].sort(compareShifts),
    [shiftsByDay, selectedKey],
  );

  const dayStats = useMemo(() => {
    const counts: Record<BoardStatus, number> = { missed: 0, active: 0, completed: 0, scheduled: 0 };
    for (const shift of dayShifts) counts[boardStatus(shift)] += 1;
    const clients = new Set(dayShifts.map((s) => s.clientId || s.client?.id).filter(Boolean));
    return { ...counts, total: dayShifts.length, clients: clients.size };
  }, [dayShifts]);

  const serviceOptions = useMemo(() => {
    const options = new Map<string, string>();
    for (const shift of shifts) {
      const code = shift.serviceCode || "";
      if (code && !options.has(code)) options.set(code, serviceLabel(shift));
    }
    return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [shifts]);

  const filtersActive = serviceFilter.size + (outingsOnly ? 1 : 0);

  const boardItems = useMemo<BoardItem[]>(() => {
    const visible = dayShifts.filter((shift) =>
      (tab === "all" || boardStatus(shift) === tab) &&
      (!serviceFilter.size || serviceFilter.has(shift.serviceCode || "")) &&
      (!outingsOnly || Boolean(shift.ciSessionId)));
    return groupOutings(visible);
  }, [dayShifts, tab, serviceFilter, outingsOnly]);

  const visibleShiftCount = boardItems.reduce((sum, item) => sum + (item.kind === "outing" ? item.shifts.length : 1), 0);
  const totalPages = Math.max(1, Math.ceil(boardItems.length / ROWS_PER_PAGE));
  const pageItems = boardItems.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);
  const pageShiftCount = pageItems.reduce((sum, item) => sum + (item.kind === "outing" ? item.shifts.length : 1), 0);

  useEffect(() => {
    setPage(1);
  }, [selectedKey, personFilter, tab, serviceFilter, outingsOnly]);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (personFilter) {
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
          data.searchClients({
            search: q,
            mode: selectedMode ?? undefined,
            limit: PERSON_TYPEAHEAD_LIMIT,
            signal: ac.signal,
          }),
          data.searchStaff({
            search: q,
            mode: selectedMode ?? undefined,
            limit: PERSON_TYPEAHEAD_LIMIT,
            signal: ac.signal,
          }),
        ]);

        if (ac.signal.aborted) return;

        const rows: PersonSearchRow[] = [];

        if (clientsOutcome.status === "fulfilled") {
          for (const c of clientsOutcome.value.items) {
            rows.push({
              kind: "client",
              id: c.id,
              label: c.name || "Unknown client",
            });
          }
        }

        if (employeesOutcome.status === "fulfilled") {
          for (const e of employeesOutcome.value.items) {
            rows.push({
              kind: "dsp",
              id: e.id,
              label: e.name?.trim() || `Unknown ${labels.noun}`,
            });
          }
        }

        const merged = rows.slice(0, PERSON_RESULTS_MERGED_MAX);
        setPersonSearchResults(merged);
        setPersonSearchSettledKey(q);
        setPersonSearchTruncated(
          rows.length > PERSON_RESULTS_MERGED_MAX ||
          (clientsOutcome.status === "fulfilled" && clientsOutcome.value.truncated) ||
          (employeesOutcome.status === "fulfilled" && employeesOutcome.value.truncated),
        );

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
  }, [personSearchInput, personFilter, toast, selectedMode, labels.noun, data]);

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

  const openAddSchedule = () => {
    setEditFormData(null);
    setModalMode("create");
    setShowAddScheduleModal(true);
  };

  const toggleOuting = (id: string) => setExpandedOutings((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const dayIsToday = isToday(selectedDate);
  const dayLabel = format(selectedDate, "EEE d MMM");
  const completedShare = dayStats.total ? Math.round((dayStats.completed / dayStats.total) * 100) : 0;

  const emptyMessage = (() => {
    if (shifts.length === 0) {
      return personFilter
        ? `No shifts for ${personFilter.label} this week. Clear the search or pick another week.`
        : "No shifts this week. Add a schedule to get started.";
    }
    if (dayShifts.length === 0) {
      return `No shifts on ${format(selectedDate, "EEEE d MMMM")}${personFilter ? ` for ${personFilter.label}` : ""}. Pick another day above.`;
    }
    return "No shifts match these filters.";
  })();

  const shiftMenu = (shift: Shift, name: string) => (
    <Popover
      open={shiftMenuOpenForId === shift.id}
      onOpenChange={(open) => setShiftMenuOpenForId(open ? shift.id : null)}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-[#dcdfe2] bg-white text-[#10141a] hover:bg-[#f4f5f6] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7]"
          aria-expanded={shiftMenuOpenForId === shift.id}
          aria-haspopup="dialog"
          aria-label={`Shift actions for ${name}`}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(calc(100vw-2rem),15.5rem)] p-1" align="end">
        <div className="flex flex-col gap-0.5" role="menu">
          <button type="button" role="menuitem" className={MENU_ITEM} aria-label="Open full shift details page" onClick={() => goToShiftDetailsPage(shift)}>
            <FileText className="size-4 shrink-0 text-[#808081]" aria-hidden />
            Details
          </button>
          <button type="button" role="menuitem" className={MENU_ITEM} aria-label="Edit this shift in the schedule" onClick={() => openEditScheduleFromMenu(shift)}>
            <Pencil className="size-4 shrink-0 text-[#808081]" aria-hidden />
            Edit
          </button>
          {capabilities.shiftMaintenance ? (
            <button type="button" role="menuitem" className={MENU_ITEM} aria-label="Adjust clock times, notes, or mark shift completed" onClick={() => openShiftMaintenanceModal(shift)}>
              <Wrench className="size-4 shrink-0 text-[#808081]" aria-hidden />
              Maintenance
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[#D53411] hover:bg-red-50 dark:hover:bg-red-500/10"
            aria-label="Delete this shift from the schedule"
            onClick={() => requestDeleteShiftFromMenu(shift)}
          >
            <Trash2 className="size-4 shrink-0" aria-hidden />
            Delete
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );

  const shiftStatusCell = (shift: Shift) => {
    const status = boardStatus(shift);
    const anomaly = detectShiftAnomalyCodes(shift).find((code) => code !== "missed");
    const meta = anomaly ? ANOMALY_LABELS[anomaly] : null;
    if (meta && status !== "missed") {
      return (
        <span className={cn("inline-flex whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold", meta.color)} title={meta.label}>
          {anomaly === "incomplete_clock" ? "Incomplete shift" : meta.label}
        </span>
      );
    }
    return <StatusPill status={status} label={status === "completed" && shift.approved ? "Approved" : undefined} />;
  };

  const shiftRow = (shift: Shift, nested = false) => {
    const name = clientDisplayName(shift);
    const staffName = shift.employee?.fullName || `Unknown ${labels.noun}`;
    const missed = boardStatus(shift) === "missed";
    return (
      <tr key={shift.id} className={cn("border-t border-[#eceef0] dark:border-white/10", nested && "bg-[#fafbfb] dark:bg-white/[0.02]")}>
        <td className={cn("py-3 pr-3", nested ? "pl-12" : "pl-4")}>
          <div className="flex min-w-0 items-center gap-3">
            <PersonAvatar name={name} image={shift.client?.profileImage} className={nested ? "h-7 w-7" : undefined} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#10141a] dark:text-[#f4f6f7]">{name}</p>
              <p className="text-xs text-[#5b636b] dark:text-[#9aa4a8]">{clientRef(shift)}</p>
            </div>
          </div>
        </td>
        <td className="px-3 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <PersonAvatar name={staffName} image={shift.employee?.profilePicture} />
            <div className="min-w-0">
              <p className="truncate text-sm text-[#10141a] dark:text-[#f4f6f7]">{staffName}</p>
              <p className="text-xs text-[#5b636b] dark:text-[#9aa4a8]">{staffRef(shift)}</p>
            </div>
          </div>
        </td>
        <td className="px-3 py-3"><ServiceCell shift={shift} /></td>
        <td className="px-3 py-3"><TimeCell shift={shift} /></td>
        <td className="px-3 py-3"><ClockCell shift={shift} /></td>
        <td className="px-3 py-3">{shiftStatusCell(shift)}</td>
        <td className="py-3 pl-3 pr-4">
          <div className="flex items-center justify-end gap-2">
            {missed && (
              <button
                type="button"
                onClick={() => handleEdit(shift)}
                className="inline-flex cursor-pointer items-center gap-0.5 whitespace-nowrap text-sm font-medium text-[#0b5c5d] hover:underline dark:text-[#7fd3d3]"
                aria-label={`Find cover for ${name}: assign another ${labels.noun}`}
              >
                Find cover <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            )}
            {shiftMenu(shift, name)}
          </div>
        </td>
      </tr>
    );
  };

  const outingRows = (item: Extract<BoardItem, { kind: "outing" }>) => {
    const session = outingSessions[item.sessionId];
    const lead = item.shifts.find((s) => s.employeeId === session?.leadEmployeeId) || item.shifts[0];
    const staffName = lead.employee?.fullName || `Unknown ${labels.noun}`;
    const program = session?.program;
    const title = session?.location?.name
      ? `${session.location.name} ${program === "day" ? "day program" : "outing"}`
      : program ? CI_PROGRAMS[program].label : "Group outing";
    const expanded = expandedOutings.has(item.sessionId);
    const clockedIn = item.shifts.filter((s) => clockSummary(s).clockIn).length;
    const status = outingStatus(item.shifts);
    const attendanceRoute = program === "day" ? Routes.agency.dayProgram : Routes.agency.communityInclusions;
    const extraStaff = Math.max(0, (session?.employeeIds?.length || 1) - 1);
    return (
      <React.Fragment key={`outing-${item.sessionId}`}>
        <tr className="border-t border-[#eceef0] dark:border-white/10">
          <td className="py-3 pl-4 pr-3">
            <button
              type="button"
              onClick={() => toggleOuting(item.sessionId)}
              aria-expanded={expanded}
              className="flex min-w-0 cursor-pointer items-center gap-3 text-left"
            >
              <span className="flex shrink-0 -space-x-1.5">
                {item.shifts.slice(0, 3).map((s) => (
                  <PersonAvatar key={s.id} name={clientDisplayName(s)} image={s.client?.profileImage} className="h-8 w-8 ring-2 ring-white dark:ring-[#141b21]" />
                ))}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-[#10141a] dark:text-[#f4f6f7]">{title}</span>
                <span className="flex items-center gap-1 text-xs text-[#5b636b] dark:text-[#9aa4a8]">
                  {item.shifts.length} clients · group
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} aria-hidden />
                </span>
              </span>
            </button>
          </td>
          <td className="px-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <PersonAvatar name={staffName} image={lead.employee?.profilePicture} />
              <div className="min-w-0">
                <p className="truncate text-sm text-[#10141a] dark:text-[#f4f6f7]">{staffName}</p>
                <p className="text-xs text-[#5b636b] dark:text-[#9aa4a8]">Lead{extraStaff ? ` · +${extraStaff} staff` : ""}</p>
              </div>
            </div>
          </td>
          <td className="px-3 py-3 text-sm text-[#10141a] dark:text-[#f4f6f7]">{program ? CI_PROGRAMS[program].label : serviceLabel(lead)}</td>
          <td className="px-3 py-3"><TimeCell shift={lead} /></td>
          <td className="px-3 py-3 text-sm text-[#10141a] dark:text-[#f4f6f7]">
            {clockedIn ? `${clockedIn} of ${item.shifts.length} clocked in` : <span className="text-[#8a979d]">–</span>}
          </td>
          <td className="px-3 py-3"><StatusPill status={status} /></td>
          <td className="py-3 pl-3 pr-4">
            <div className="flex items-center justify-end gap-2">
              {actor === "agency" && (
                <Link
                  to={`${attendanceRoute}?${new URLSearchParams({ date: lead.date, ciSessionId: item.sessionId }).toString()}`}
                  className="inline-flex items-center gap-0.5 whitespace-nowrap text-sm font-medium text-[#0b5c5d] hover:underline dark:text-[#7fd3d3]"
                >
                  Attendance <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
              <button
                type="button"
                onClick={() => toggleOuting(item.sessionId)}
                aria-label={expanded ? `Hide the clients on ${title}` : `Show the clients on ${title}`}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-[#dcdfe2] bg-white text-[#10141a] hover:bg-[#f4f5f6] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7]"
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} aria-hidden />
              </button>
            </div>
          </td>
        </tr>
        {expanded && item.shifts.map((s) => shiftRow(s, true))}
      </React.Fragment>
    );
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "all", label: "All", count: dayStats.total },
    { id: "active", label: "Active", count: dayStats.active },
    { id: "completed", label: "Completed", count: dayStats.completed },
    { id: "missed", label: "Missed", count: dayStats.missed },
  ];

  return (
    <>
      <div className="flex flex-col gap-6">
        <AgencyPageHeader
          icon={CalendarDays}
          title="Shift management"
          description={`Schedule ${labels.noun}s to clients, watch today's shifts and act on missed ones.`}
          actions={
            <>
              {capabilities.shiftMaintenance ? (
                <button
                  type="button"
                  onClick={() => navigate(routes.maintenance())}
                  className={OUTLINE_BUTTON}
                  aria-label="Open shift maintenance: review problem shifts and activity history"
                >
                  <Settings className="h-4 w-4 shrink-0" aria-hidden />
                  Maintenance
                </button>
              ) : null}
              <button
                type="button"
                onClick={openAddSchedule}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] bg-[#003839] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#00494a] dark:bg-[#00a3a7] dark:text-[#06292a]"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add schedule
              </button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AgencyStatCard
            icon={UserRoundCheck}
            label={dayIsToday ? "Active now" : `Active · ${dayLabel}`}
            value={loading ? "–" : dayStats.active}
            footnote="Clocked in and on shift."
          />
          <AgencyStatCard
            icon={CheckCircle2}
            label={dayIsToday ? "Completed today" : `Completed · ${dayLabel}`}
            value={loading ? "–" : dayStats.completed}
            extra={!loading && dayStats.total > 0 ? (
              <span className="ml-auto h-1.5 w-20 overflow-hidden rounded-full bg-[#dfe3e6] dark:bg-white/10" role="img" aria-label={`${completedShare}% of the day's shifts completed`}>
                <span className="block h-full rounded-full bg-[#0b8a8c]" style={{ width: `${completedShare}%` }} />
              </span>
            ) : undefined}
            footnote="Clocked out."
          />
          <AgencyStatCard
            icon={AlertTriangle}
            label={dayIsToday ? "Missed today" : `Missed · ${dayLabel}`}
            value={loading ? "–" : dayStats.missed}
            extra={!loading && dayStats.missed > 0 ? (
              <button
                type="button"
                onClick={() => setTab("missed")}
                className="ml-auto cursor-pointer rounded-md bg-[#fde8e6] px-2 py-1 text-xs font-medium text-[#b42318] hover:bg-[#fbd5d0] dark:bg-[#4a1b17] dark:text-[#ffb4a9]"
              >
                Needs cover
              </button>
            ) : undefined}
            footnote="No clock-in 15 min after the start."
          />
          <AgencyStatCard
            icon={ClipboardList}
            label={dayIsToday ? "Total today" : `Total · ${dayLabel}`}
            value={loading ? "–" : dayStats.total}
            footnote={`Across ${dayStats.clients} client${dayStats.clients === 1 ? "" : "s"}.`}
          />
        </div>

        {/* Week strip */}
        <div className="flex items-center gap-2 rounded-[14px] border border-[#e4e7ea] p-2 dark:border-white/10">
          <button
            type="button"
            onClick={() => setSelectedDate((d) => addWeeks(d, -1))}
            aria-label="Previous week"
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-[#dcdfe2] bg-white hover:bg-[#f4f5f6] dark:border-white/15 dark:bg-transparent"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <div className="grid min-w-0 flex-1 grid-cols-7 gap-1.5">
            {weekDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const selected = isSameDay(day, selectedDate);
              const count = shiftsByDay.get(key)?.length || 0;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  aria-pressed={selected}
                  aria-label={loading ? format(day, "EEEE d MMMM") : `${format(day, "EEEE d MMMM")}: ${count} shift${count === 1 ? "" : "s"}`}
                  className={cn(
                    "flex cursor-pointer flex-col items-center rounded-[10px] py-2 transition-colors",
                    selected
                      ? "bg-[#003839] text-white dark:bg-[#00a3a7] dark:text-[#06292a]"
                      : "bg-[#f4f5f6] text-[#10141a] hover:bg-[#eceef0] dark:bg-white/5 dark:text-[#f4f6f7]",
                  )}
                >
                  <span className={cn("text-xs", selected ? "text-white/80 dark:text-[#06292a]/80" : "text-[#5b636b] dark:text-[#9aa4a8]")}>{format(day, "EEE")}</span>
                  <span className="text-lg font-medium leading-tight">{format(day, "d")}</span>
                  {isToday(day) && !selected && <span aria-hidden="true" className="mt-0.5 h-1 w-1 rounded-full bg-[#0b8a8c]" />}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate((d) => addWeeks(d, 1))}
            aria-label="Next week"
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-[#dcdfe2] bg-white hover:bg-[#f4f5f6] dark:border-white/15 dark:bg-transparent"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* Shifts table */}
        <div className="rounded-[14px] border border-[#e4e7ea] dark:border-white/10">
          <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div role="tablist" aria-label="Shift status" className="flex w-fit flex-wrap gap-1 rounded-[10px] bg-[#f4f5f6] p-1 dark:bg-white/5">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-[8px] px-3 py-1.5 text-sm transition-colors",
                    tab === t.id
                      ? "bg-white font-medium text-[#10141a] shadow-sm dark:bg-[#1b232b] dark:text-[#f4f6f7]"
                      : "text-[#5b636b] hover:text-[#10141a] dark:text-[#9aa4a8]",
                  )}
                >
                  {t.label}
                  <span className={cn(
                    "rounded-md px-1.5 text-xs",
                    t.id === "missed" && t.count > 0 ? "bg-[#fde8e6] text-[#b42318]" : "bg-[#e4e7ea] text-[#3d4a50] dark:bg-white/10 dark:text-[#c9d3d6]",
                  )}>
                    {loading ? "–" : t.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div ref={personSearchContainerRef} className="relative sm:w-[240px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a979d]" aria-hidden />
                <input
                  type="search"
                  autoComplete="off"
                  placeholder={`Search client or ${labels.noun}`}
                  aria-label={`Search by client or ${labels.noun} name to filter shifts`}
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
                      e.target.select();
                      return;
                    }
                    setPersonSearchOpen(true);
                  }}
                  className="h-10 w-full rounded-[10px] border border-[#dcdfe2] bg-white pl-9 pr-9 text-sm text-[#10141a] outline-none placeholder:text-[#8a979d] focus-visible:border-[#0b8a8c] focus-visible:ring-2 focus-visible:ring-[#0b8a8c]/20 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7]"
                />
                {personFilter ? (
                  <button
                    type="button"
                    className="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-[#10141a] hover:bg-black/[0.06] dark:text-[#f4f6f7]"
                    aria-label="Clear person filter and show all shifts"
                    onClick={clearPersonFilter}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
                {showPersonDropdown ? (
                  <div
                    id="recent-shifts-person-results"
                    role="listbox"
                    className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-[min(320px,70vh)] overflow-auto rounded-xl border border-[#e4e7ea] bg-white py-1 shadow-lg dark:border-white/10 dark:bg-[#1b232b]"
                  >
                    {personSearchLoading && personSearchResults.length === 0 ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-[14px] text-[#808081]">
                        <Loader2 className="size-4 animate-spin text-[#0b8a8c]" aria-hidden />
                        Searching…
                      </div>
                    ) : null}
                    {personSearchResults.map((row) => (
                      <button
                        key={`${row.kind}-${row.id}`}
                        type="button"
                        role="option"
                        aria-selected={false}
                        className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-left text-[14px] hover:bg-black/[0.06] dark:hover:bg-white/10"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectPersonRow(row)}
                      >
                        <span className="min-w-0 truncate font-medium text-[#10141a] dark:text-[#f4f6f7]">{row.label}</span>
                        <span className="shrink-0 rounded-full bg-black/[0.06] px-2 py-0.5 text-[12px] font-semibold text-[#808081]">
                          {row.kind === "client" ? "Client" : labels.noun}
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

              <Popover
                open={calendarOpen}
                onOpenChange={(open) => {
                  setCalendarOpen(open);
                  if (open) setCalendarMonth(selectedDate);
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={OUTLINE_BUTTON}
                    aria-expanded={calendarOpen}
                    aria-haspopup="dialog"
                    aria-label={`Date: ${format(selectedDate, "MMMM d, yyyy")}. Open calendar to change`}
                  >
                    <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="whitespace-nowrap">Date: {format(selectedDate, "EEE d MMM yyyy")}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-[#5b636b]" aria-hidden />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-1">
                    <Calendar
                      mode="single"
                      weekStartsOn={1}
                      captionLayout="dropdown"
                      month={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      selected={selectedDate}
                      onSelect={(d) => {
                        if (d) {
                          setSelectedDate(d);
                          setCalendarMonth(d);
                        }
                        setCalendarOpen(false);
                      }}
                    />
                  </div>
                  {!dayIsToday ? (
                    <div className="border-t border-[#e5e5e6] p-2 dark:border-white/10">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 w-full text-[14px] font-medium"
                        onClick={() => {
                          setSelectedDate(new Date());
                          setCalendarOpen(false);
                        }}
                      >
                        Go to today
                      </Button>
                    </div>
                  ) : null}
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className={OUTLINE_BUTTON} aria-label={filtersActive ? `Filter: ${filtersActive} active` : "Filter shifts"}>
                    <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
                    Filter
                    {filtersActive > 0 && (
                      <span className="rounded-md bg-[#003839] px-1.5 text-xs text-white dark:bg-[#00a3a7] dark:text-[#06292a]">{filtersActive}</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="end">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#5b636b]">Service</p>
                  {serviceOptions.length === 0 ? (
                    <p className="mt-2 text-sm text-[#5b636b]">No services this week.</p>
                  ) : (
                    <ul className="mt-2 flex max-h-52 flex-col gap-1 overflow-y-auto">
                      {serviceOptions.map(([code, label]) => (
                        <li key={code}>
                          <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-[#f4f5f6] dark:hover:bg-white/5">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[#003839]"
                              checked={serviceFilter.has(code)}
                              onChange={() => setServiceFilter((prev) => {
                                const next = new Set(prev);
                                if (next.has(code)) next.delete(code); else next.add(code);
                                return next;
                              })}
                            />
                            <span className="min-w-0 truncate">{label}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                  <label className="mt-3 flex cursor-pointer items-center gap-2 border-t border-[#eceef0] pt-3 text-sm dark:border-white/10">
                    <input type="checkbox" className="h-4 w-4 accent-[#003839]" checked={outingsOnly} onChange={(e) => setOutingsOnly(e.target.checked)} />
                    <Users className="h-4 w-4 text-[#5b636b]" aria-hidden />
                    Group outings only
                  </label>
                  {filtersActive > 0 && (
                    <button
                      type="button"
                      onClick={() => { setServiceFilter(new Set()); setOutingsOnly(false); }}
                      className="mt-3 w-full cursor-pointer rounded-md py-1.5 text-sm font-medium text-[#0b5c5d] hover:bg-[#f4f5f6] dark:text-[#7fd3d3] dark:hover:bg-white/5"
                    >
                      Clear filters
                    </button>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center border-t border-[#eceef0] py-12 dark:border-white/10">
              <Loader2 className="h-6 w-6 animate-spin text-[#0b8a8c]" aria-label="Loading shifts" />
            </div>
          ) : boardItems.length === 0 ? (
            <div className="flex items-center justify-center border-t border-[#eceef0] px-4 py-12 text-center dark:border-white/10">
              <p className="max-w-md text-sm text-[#5b636b] dark:text-[#9aa4a8]">{emptyMessage}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] table-fixed text-left">
                <colgroup>
                  <col className="w-[21%]" />
                  <col className="w-[18%]" />
                  <col className="w-[15%]" />
                  <col className="w-[11%]" />
                  <col className="w-[11%]" />
                  <col className="w-[11%]" />
                  <col className="w-[13%]" />
                </colgroup>
                <thead>
                  <tr className="border-t border-[#eceef0] bg-[#f8f9fa] text-xs font-medium text-[#5b636b] dark:border-white/10 dark:bg-white/[0.03] dark:text-[#9aa4a8]">
                    <th scope="col" className="py-2.5 pl-4 pr-3 font-medium">Client</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">{labels.noun}</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Service</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Time</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Clock in / out</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                    <th scope="col" className="py-2.5 pl-3 pr-4 text-right font-medium"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item) => (item.kind === "outing" ? outingRows(item) : shiftRow(item.shift)))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && boardItems.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-[#eceef0] px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
              <p className="text-sm text-[#5b636b] dark:text-[#9aa4a8]">
                Showing {pageShiftCount} of {visibleShiftCount} shift{visibleShiftCount === 1 ? "" : "s"}
                {weekTruncated ? " (this week has more shifts than we can show; search for a client or staff member to narrow it)" : ""}
              </p>
              {totalPages > 1 && (
                <nav aria-label="Shift pages" className="flex items-center gap-1">
                  <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className={cn(OUTLINE_BUTTON, "h-8 px-2.5")}>
                    <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                    .map((n, i, list) => (
                      <React.Fragment key={n}>
                        {i > 0 && n - list[i - 1] > 1 && <span className="px-1 text-sm text-[#8a979d]">…</span>}
                        <button
                          type="button"
                          onClick={() => setPage(n)}
                          aria-current={n === page ? "page" : undefined}
                          className={cn(
                            "h-8 min-w-8 cursor-pointer rounded-[8px] px-2 text-sm",
                            n === page
                              ? "bg-[#003839] text-white dark:bg-[#00a3a7] dark:text-[#06292a]"
                              : "text-[#10141a] hover:bg-[#f4f5f6] dark:text-[#f4f6f7] dark:hover:bg-white/5",
                          )}
                        >
                          {n}
                        </button>
                      </React.Fragment>
                    ))}
                  <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={cn(OUTLINE_BUTTON, "h-8 px-2.5")}>
                    Next <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                </nav>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Schedule Modal */}
      <AddScheduleModal
        isOpen={showAddScheduleModal}
        agencyId={agencyId}
        agencyName={agency.name}
        agencyMode={selectedMode}
        supportedClientTypes={agency.supportedClientTypes}
        data={data}
        onClose={() => {
          setShowAddScheduleModal(false);
          setEditFormData(null);
          setModalMode("create");
        }}
        onShiftsUpdated={() => void loadShifts()}
        editData={editFormData}
        mode={modalMode}
      />
      {capabilities.shiftMaintenance ? <ShiftDetailsModal
        isOpen={showShiftDetails}
        shift={selectedShift}
        anomalyCodes={selectedShift ? detectShiftAnomalyCodes(selectedShift) : []}
        hydrateFromServer
        agencyId={agencyId}
        agencyName={agency.name}
        onClose={() => {
          setShowShiftDetails(false);
          setSelectedShift(null);
        }}
        onShiftUpdated={(_updated) => void loadShifts()}
      /> : null}
      <DeleteConfirmationModal
        isOpen={!!shiftPendingDelete}
        onClose={() => {
          if (!isDeletingShift) setShiftPendingDelete(null);
        }}
        onConfirm={confirmDeleteShift}
        isDeleting={isDeletingShift}
        title="Delete this shift?"
        message={shiftPendingDelete ? shiftDeleteConfirmMessage(shiftPendingDelete, agency.name) : ""}
        confirmText="Delete shift"
        cancelText="Cancel"
      />
    </>
  );
}
