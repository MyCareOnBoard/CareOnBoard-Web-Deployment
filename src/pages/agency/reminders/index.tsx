import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Bell,
  BellRing,
  BrainCircuit,
  ExternalLink,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import CustomDatePicker from "@/components/ui/datePicker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DotGridIcon, menuItemClassName } from "@/components/ui/dot-grid-menu";
import { useEffectiveAgencyMode, useAgencySupportsBothPrograms } from "@/hooks/useEffectiveAgencyMode";
import { Routes } from "@/routes/constants";

import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import ReminderModal from "./components/ReminderModal";
import { getReminderDateTime, RECURRENCE_LABELS, type Reminder, type ReminderDraft, type ReminderStatus } from "./types";
import {
  useGetRemindersQuery,
  useCreateReminderMutation,
  useUpdateReminderMutation,
  useDeleteReminderMutation,
} from "./api";

type StatusFilter = "all" | "pending" | "sent" | "failed";

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Upcoming" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
];

const STATUS_BADGE_CONFIG: Record<ReminderStatus, { label: string; dot: string; badge: string }> = {
  pending: {
    label: "Upcoming",
    dot: "bg-[#00b4b8]",
    badge: "border-[#00b4b8] text-[#008f93]",
  },
  sent: {
    label: "Sent",
    dot: "bg-[#22c55e]",
    badge: "border-[#22c55e] text-[#15803d]",
  },
  failed: {
    label: "Failed",
    dot: "bg-[#ef4444]",
    badge: "border-[#ef4444] text-[#dc2626]",
  },
};

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateInput(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(reminder: Reminder) {
  const date = getReminderDateTime(reminder);
  if (Number.isNaN(date.getTime())) return reminder.scheduledDate;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTime(reminder: Reminder) {
  const date = getReminderDateTime(reminder);
  if (Number.isNaN(date.getTime())) return reminder.scheduledTime;
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

// Row-actions trigger icon — matches the billing claims / payout tables.

function StatusBadge({ status }: { status: ReminderStatus }) {
  const cfg = STATUS_BADGE_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold ${cfg.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: Reminder["type"] }) {
  const isAi = type === "ai_prompt";
  return (
    <span className={`inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${
      isAi ? "bg-[#f5f3ff] text-[#7c3aed]" : "bg-[#f3f4f6] text-[#6b7280]"
    }`}>
      {isAi ? <BrainCircuit className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
      {isAi ? "AI Prompt" : "Normal"}
    </span>
  );
}

// Program view a reminder is scoped to; nothing rendered for agency-wide reminders.
function ModeBadge({ mode }: { mode?: Reminder["mode"] }) {
  if (!mode) return null;
  return (
    <span className={`inline-flex w-fit items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
      mode === "hha" ? "bg-[#e6f7f7] text-[#008f93]" : "bg-[#eef2ff] text-[#4f46e5]"
    }`}>
      {mode}
    </span>
  );
}

function RecurrenceBadge({ recurrence }: { recurrence: Reminder["recurrence"] }) {
  if (!recurrence || recurrence === "none") return null;
  return (
    <span className="inline-flex items-center rounded-full bg-[#fff7ed] px-2 py-0.5 text-[11px] font-semibold text-[#c2410c]">
      ↺ {RECURRENCE_LABELS[recurrence]}
    </span>
  );
}

interface ReminderRowProps {
  reminder: Reminder;
  onView: (reminder: Reminder) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (reminder: Reminder) => void;
  onOpenConversation: (conversationId: string) => void;
}

function ReminderRow({ reminder, onView, onEdit, onDelete, onOpenConversation }: ReminderRowProps) {
  const isPending = reminder.status === "pending";
  const hasConversation = reminder.type === "ai_prompt" && !!reminder.conversationId;
  const hasResult = reminder.type === "ai_prompt" && !!reminder.result;

  return (
    <div className={`grid grid-cols-1 gap-3 border-b border-[#e5e5e6] px-4 py-4 transition-colors last:border-b-0 hover:bg-[#f9fafb] ${REMINDER_GRID} md:items-center`}>
      <div className="min-w-0">
        <div className="flex items-start gap-2.5 md:items-center">
          <span className={`mt-2 h-2 w-2 shrink-0 rounded-full md:mt-0 ${STATUS_BADGE_CONFIG[reminder.status].dot}`} />
          <div className="min-w-0">
            <p className="whitespace-pre-wrap break-words text-[14px] font-semibold leading-6 text-[#10141a] line-clamp-2">
              {reminder.message}
            </p>
            {reminder.recurrence && reminder.recurrence !== "none" && (
              <p className="mt-0.5 text-[12px] text-[#c2410c]">
                ↺ Repeats {RECURRENCE_LABELS[reminder.recurrence].toLowerCase()}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="hidden md:flex md:flex-col md:items-start md:gap-1">
        <TypeBadge type={reminder.type} />
        <ModeBadge mode={reminder.mode} />
      </div>
      <div className="text-[14px] text-[#6b7280]">
        <span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Date</span>
        {formatDate(reminder)}
      </div>
      <div className="text-[14px] text-[#6b7280]">
        <span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Time</span>
        {formatTime(reminder)}
      </div>
      <div><StatusBadge status={reminder.status} /></div>
      <div className="md:justify-self-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Reminder actions"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-white transition-colors hover:bg-[#e5e5e6] active:bg-[#e5e5e6]"
            >
              <DotGridIcon />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[100] min-w-[160px] rounded-xl border-0 bg-white p-0 shadow-lg">
            {hasConversation ? (
              <DropdownMenuItem className={menuItemClassName} onClick={() => onOpenConversation(reminder.conversationId!)}>
                View conversation
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className={menuItemClassName} onClick={() => onView(reminder)}>
                {hasResult ? "View result" : "View"}
              </DropdownMenuItem>
            )}
            {isPending && (
              <DropdownMenuItem className={menuItemClassName} onClick={() => onEdit(reminder)}>
                Edit
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className={`${menuItemClassName} text-[#ef4444] hover:bg-[#fef2f2] focus:bg-[#fef2f2] focus:text-[#ef4444]`}
              onClick={() => onDelete(reminder)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

const GROUP_CONFIG: Array<{ status: ReminderStatus; label: string; filter: StatusFilter }> = [
  { status: "pending", label: "Upcoming", filter: "pending" },
  { status: "sent",    label: "Sent",     filter: "sent" },
  { status: "failed",  label: "Failed",   filter: "failed" },
];

// Shared column template (header/rows/skeleton) — kept compact so it fits within
// the content width; wider rows fall back to horizontal scroll, never clipping.
// NOTE: must be a full, literal class string (incl. the md: prefix) so Tailwind's
// JIT detects it — building it via `md:${...}` would not be generated.
const REMINDER_GRID = "md:grid-cols-[minmax(140px,2fr)_92px_minmax(90px,1fr)_72px_100px_72px]";

function ReminderRowsSkeleton() {
  return (
    <div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`grid grid-cols-1 gap-3 border-b border-[#e5e5e6] px-4 py-4 last:border-b-0 md:items-center ${REMINDER_GRID}`}
        >
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-2 w-2 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-48 max-w-full" />
          </div>
          <Skeleton className="hidden h-5 w-16 rounded-full md:block" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-md md:justify-self-end" />
        </div>
      ))}
    </div>
  );
}

export default function RemindersPage() {
  const navigate = useNavigate();
  const mode = useEffectiveAgencyMode();
  const supportsBothPrograms = useAgencySupportsBothPrograms();

  // refetchOnMountOrArgChange + isFetching keep the skeleton showing on every
  // DDD/HHA toggle, even when that view's data is already cached.
  const { data, isFetching: isLoading, isError, refetch } = useGetRemindersQuery(
    { mode: mode ?? undefined },
    { refetchOnMountOrArgChange: true },
  );
  const [createReminder, { isLoading: isCreating }] = useCreateReminderMutation();
  const [updateReminder, { isLoading: isUpdating }] = useUpdateReminderMutation();
  const [deleteReminder, { isLoading: isDeleting }] = useDeleteReminderMutation();

  const reminders = data?.data ?? [];

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [viewingReminder, setViewingReminder] = useState<Reminder | null>(null);
  const [deletingReminder, setDeletingReminder] = useState<Reminder | null>(null);

  const visibleReminders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reminders.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (dateFilter && r.scheduledDate !== dateFilter) return false;
      if (unassignedOnly && r.mode) return false;
      if (q && !r.message.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [reminders, searchQuery, statusFilter, dateFilter, unassignedOnly]);

  const groups = useMemo(() => {
    const activeGroups = statusFilter === "all"
      ? GROUP_CONFIG
      : GROUP_CONFIG.filter((g) => g.filter === statusFilter);

    return activeGroups.map((g) => ({
      ...g,
      reminders: visibleReminders
        .filter((r) => r.status === g.status)
        .sort((a, b) => {
          const aTime = getReminderDateTime(a).getTime();
          const bTime = getReminderDateTime(b).getTime();
          return g.status === "pending" ? aTime - bTime : bTime - aTime;
        }),
    })).filter((g) => g.reminders.length > 0);
  }, [visibleReminders, statusFilter]);

  const openConversation = (conversationId: string) => {
    navigate(`/agency/automations/${conversationId}`);
  };

  const openAddModal = () => {
    setEditingReminder(null);
    setModalOpen(true);
  };

  const openEditModal = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setModalOpen(true);
  };

  const handleSave = async (draft: ReminderDraft) => {
    // The modal always resolves an explicit mode (the editor's choice for
    // dual-program agencies, or the agency's fixed single program otherwise);
    // null means deliberately shared across both views.
    try {
      if (editingReminder) {
        await updateReminder({ reminderId: editingReminder.id, data: draft }).unwrap();
      } else {
        await createReminder(draft).unwrap();
      }
    } catch {
      // error handled by RTK Query; toast can be wired here if needed
    }
  };

  const handleDelete = async () => {
    if (!deletingReminder) return;
    try {
      await deleteReminder(deletingReminder.id).unwrap();
      if (viewingReminder?.id === deletingReminder.id) setViewingReminder(null);
    } catch {
      // error handled by RTK Query
    } finally {
      setDeletingReminder(null);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFilter("");
    setUnassignedOnly(false);
  };

  const hasFilters = Boolean(searchQuery || dateFilter || statusFilter !== "all" || unassignedOnly);
  const isSaving = isCreating || isUpdating;

  return (
    <div className="min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-0">
      <div className="flex flex-wrap items-center gap-2 mb-4 sm:mb-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(Routes.agency.tasks)}
          className="cursor-pointer border-0 flex items-center justify-center rounded-full bg-white backdrop-blur-sm transition-colors hover:bg-[#f0fbfb]"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-[28px] font-bold leading-[1.4] text-[#10141a] sm:text-[32px] lg:text-[40px]">
          Set Reminders
        </h1>
      </div>

      <div className="min-w-0 overflow-hidden bg-white shadow-sm rounded-xl sm:rounded-2xl">
        <div className="border-b border-[#e5e7eb] p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div>
              <h2 className="text-[20px] font-bold text-[#10141a] sm:text-[22px]">All Reminders</h2>
              <p className="mt-0.5 text-[13px] text-[#6b7280] sm:text-[14px]">
                Schedule normal reminders or AI-powered prompt reminders.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={openAddModal} className="flex-1 sm:flex-none">
                <Plus className="w-4 h-4" />
                Add Reminder
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-4 xl:flex-row xl:items-center">
            <div className="relative flex h-9 w-full min-w-0 items-center gap-2 rounded-full border border-[#e5e7eb] px-3 sm:w-[240px]">
              <Search className="h-3.5 w-3.5 shrink-0 text-[#808081]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reminders..."
                className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] text-[#10141a] outline-none placeholder:text-[#808081] focus:ring-0"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`rounded-full border px-3 py-1 text-[13px] font-medium transition-colors ${
                    statusFilter === filter.value
                      ? "border-[#00b4b8] bg-[#00b4b8] text-white"
                      : "border-[#e5e7eb] text-[#6b7280] hover:border-[#cccccd]"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {supportsBothPrograms && (
              <button
                type="button"
                onClick={() => setUnassignedOnly((prev) => !prev)}
                className={`rounded-full border px-3 py-1 text-[13px] font-medium transition-colors ${
                  unassignedOnly
                    ? "border-[#00b4b8] bg-[#00b4b8] text-white"
                    : "border-[#e5e7eb] text-[#6b7280] hover:border-[#cccccd]"
                }`}
              >
                Unassigned only
              </button>
            )}

            <div className="hidden h-5 w-px bg-[#e5e7eb] xl:block" />

            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-[190px] flex-1 sm:flex-none">
                <CustomDatePicker
                  date={fromDateInput(dateFilter)}
                  setDate={(d) => setDateFilter(d ? toDateInput(d) : "")}
                  placeholder="Filter by date"
                  startMonth={new Date(2000, 0)}
                  endMonth={new Date(2100, 11)}
                  className="h-9 min-h-9 rounded-full px-3 [--cr-field-height:36px]"
                  inputClassName="text-[13px]"
                />
              </div>
              {hasFilters && (
                <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                  <RotateCcw className="w-4 h-4" />
                  Clear
                </Button>
              )}
            </div>

            <span className="text-[13px] text-[#6b7280] xl:ml-auto">
              {visibleReminders.length} of {reminders.length}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="overflow-x-auto">
            <div className={`hidden gap-3 border-b border-[#e5e5e6] bg-[#f9fafb] px-4 py-3 md:grid ${REMINDER_GRID}`}>
              {["Reminder", "Type", "Date", "Time", "Status", "Actions"].map((label, i) => (
                <div key={i} className={`text-[12px] font-semibold uppercase text-[#808081] ${i === 5 ? "text-right" : ""}`}>
                  {label}
                </div>
              ))}
            </div>
            <ReminderRowsSkeleton />
          </div>
        ) : isError ? (
          <div className="p-8 text-center sm:p-12">
            <p className="text-[14px] font-semibold text-[#ef4444]">Failed to load reminders</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2 text-[13px] text-[#00b4b8] underline"
            >
              Try again
            </button>
          </div>
        ) : visibleReminders.length === 0 ? (
          <div className="p-8 text-center sm:p-12">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f3f4f6]">
              <BellRing className="h-7 w-7 text-[#b2b2b3]" />
            </div>
            <p className="text-[14px] font-semibold text-[#10141a]">
              {reminders.length === 0 ? "No reminders yet" : "No reminders match your filters"}
            </p>
            <p className="mt-1 text-[13px] text-[#6b7280]">
              {reminders.length === 0
                ? "Click Add Reminder to create your first reminder"
                : "Try changing your search, status, or date filter"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className={`hidden ${REMINDER_GRID} gap-3 border-b border-[#e5e5e6] bg-[#f9fafb] px-4 py-3 md:grid`}>
              {["Reminder", "Type", "Date", "Time", "Status", "Actions"].map((label, i) => (
                <div key={i} className={`text-[12px] font-semibold uppercase text-[#808081] ${i === 5 ? "text-right" : ""}`}>
                  {label}
                </div>
              ))}
            </div>
            {groups.map((group) => (
              <div key={group.status}>
                <div className="border-b border-[#e5e7eb] bg-[#fcfcfd] px-4 py-2.5 text-[12px] font-bold uppercase text-[#6b7280]">
                  {group.label} ({group.reminders.length})
                </div>
                {group.reminders.map((reminder) => (
                  <ReminderRow
                    key={reminder.id}
                    reminder={reminder}
                    onView={setViewingReminder}
                    onEdit={openEditModal}
                    onDelete={setDeletingReminder}
                    onOpenConversation={openConversation}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View / Result modal */}
      <Dialog open={!!viewingReminder} onOpenChange={(open) => { if (!open) setViewingReminder(null); }}>
        <DialogContent className="flex w-[min(560px,calc(100vw-32px))] flex-col gap-4 rounded-[30px] border border-[rgba(255,255,255,0.3)] bg-white p-5 backdrop-blur">
          {viewingReminder && (
            <>
              <DialogHeader className="items-start gap-2 text-left">
                <DialogTitle className="pr-6 text-[20px] font-bold leading-snug text-[#10141a]">
                  {viewingReminder.type === "ai_prompt" && viewingReminder.status === "sent"
                    ? "AI Prompt Result"
                    : "Reminder details"}
                </DialogTitle>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={viewingReminder.status} />
                  <TypeBadge type={viewingReminder.type} />
                  <ModeBadge mode={viewingReminder.mode} />
                  <RecurrenceBadge recurrence={viewingReminder.recurrence} />
                </div>
              </DialogHeader>

              <div>
                <p className="mb-1 text-[12px] font-semibold uppercase text-[#808081]">
                  {viewingReminder.type === "ai_prompt" ? "Prompt" : "Message"}
                </p>
                <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-[#10141a]">
                  {viewingReminder.message}
                </p>
              </div>

              {viewingReminder.type === "ai_prompt" && viewingReminder.result && (
                <div>
                  <p className="mb-1 text-[12px] font-semibold uppercase text-[#7c3aed]">AI Result</p>
                  <div className="max-h-60 overflow-y-auto rounded-xl bg-[#f5f3ff] p-3">
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[#1e1b4b]">
                      {viewingReminder.result}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-0.5 text-[12px] font-semibold uppercase text-[#808081]">
                    {viewingReminder.recurrence !== "none" && viewingReminder.status === "pending" ? "Next firing date" : "Date"}
                  </p>
                  <p className="text-[14px] text-[#6b7280]">{formatDate(viewingReminder)}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-[12px] font-semibold uppercase text-[#808081]">Time</p>
                  <p className="text-[14px] text-[#6b7280]">{formatTime(viewingReminder)}</p>
                </div>
                {viewingReminder.recurrence && viewingReminder.recurrence !== "none" && (
                  <div>
                    <p className="mb-0.5 text-[12px] font-semibold uppercase text-[#808081]">Recurrence</p>
                    <p className="text-[14px] text-[#6b7280]">{RECURRENCE_LABELS[viewingReminder.recurrence]}</p>
                  </div>
                )}
                {viewingReminder.lastSentAt && (
                  <div>
                    <p className="mb-0.5 text-[12px] font-semibold uppercase text-[#808081]">Last sent</p>
                    <p className="text-[14px] text-[#6b7280]">
                      {new Intl.DateTimeFormat(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(viewingReminder.lastSentAt))}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex flex-wrap justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setViewingReminder(null)}>Close</Button>
                {viewingReminder.conversationId && (
                  <Button
                    className="bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                    onClick={() => {
                      setViewingReminder(null);
                      openConversation(viewingReminder.conversationId!);
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Conversation
                  </Button>
                )}
                {viewingReminder.status === "pending" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      openEditModal(viewingReminder);
                      setViewingReminder(null);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </Button>
                )}
                <Button
                  className="bg-[#ef4444] text-white hover:bg-[#dc2626]"
                  onClick={() => {
                    setDeletingReminder(viewingReminder);
                    setViewingReminder(null);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ReminderModal
        open={modalOpen}
        reminder={editingReminder}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditingReminder(null);
        }}
        onSave={handleSave}
        isSaving={isSaving}
        supportsBothPrograms={supportsBothPrograms}
        activeMode={mode}
      />

      {/* Delete confirmation */}
      <DeleteConfirmationModal
        isOpen={!!deletingReminder}
        onClose={() => { if (!isDeleting) setDeletingReminder(null); }}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        title="Delete reminder?"
        message="This action cannot be undone. The reminder will be permanently removed."
      />
    </div>
  );
}
