import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  BellRing,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import CustomDatePicker from "@/components/ui/datePicker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Routes } from "@/routes/constants";
import { selectUser } from "@/utils/auth/store/authSelectors";

import ReminderModal from "./components/ReminderModal";
import { getReminderDateTime, type Reminder, type ReminderDraft } from "./types";

type StatusFilter = "all" | "current" | "past";
type ReminderStatus = "Current" | "Past";

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "current", label: "Current" },
  { value: "past", label: "Past" },
];

function isReminder(value: unknown): value is Reminder {
  if (!value || typeof value !== "object") return false;
  const reminder = value as Partial<Reminder>;
  return Boolean(
    reminder.id &&
    typeof reminder.message === "string" &&
    typeof reminder.date === "string" &&
    typeof reminder.time === "string"
  );
}

function loadReminders(storageKey: string) {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isReminder) : [];
  } catch {
    return [];
  }
}

function createReminderId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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
  if (Number.isNaN(date.getTime())) return reminder.date;

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatTime(reminder: Reminder) {
  const date = getReminderDateTime(reminder);
  if (Number.isNaN(date.getTime())) return reminder.time;

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getStatus(reminder: Reminder, now: number): ReminderStatus {
  return getReminderDateTime(reminder).getTime() < now ? "Past" : "Current";
}

interface ReminderRowProps {
  reminder: Reminder;
  status: ReminderStatus;
  onView: (reminder: Reminder) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (reminder: Reminder) => void;
}

function StatusBadge({ status }: { status: ReminderStatus }) {
  const isCurrent = status === "Current";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold ${
      isCurrent ? "border-[#00b4b8] text-[#008f93]" : "border-[#d1d5db] text-[#6b7280]"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isCurrent ? "bg-[#00b4b8]" : "bg-[#9ca3af]"}`} />
      {status}
    </span>
  );
}

function ReminderRow({ reminder, status, onView, onEdit, onDelete }: ReminderRowProps) {
  return (
    <div className="grid grid-cols-1 gap-3 border-b border-[#e5e5e6] px-4 py-4 transition-colors last:border-b-0 hover:bg-[#f9fafb] md:grid-cols-[minmax(220px,2fr)_minmax(150px,1fr)_100px_110px_minmax(190px,auto)] md:items-center">
      <div className="min-w-0">
        <div className="flex items-start gap-2.5 md:items-center">
          <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${status === "Current" ? "bg-[#00b4b8]" : "bg-[#9ca3af]"}`} />
          <p className="whitespace-pre-wrap break-words text-[14px] font-semibold leading-6 text-[#10141a]">{reminder.message}</p>
        </div>
      </div>
      <div className="text-[14px] text-[#6b7280]">
        <span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Date</span>
        {formatDate(reminder)}
      </div>
      <div className="text-[14px] text-[#6b7280]">
        <span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Time</span>
        {formatTime(reminder)}
      </div>
      <div><StatusBadge status={status} /></div>
      <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
        <button
          type="button"
          onClick={() => onView(reminder)}
          className="rounded-full border border-[#00b4b8] px-4 py-1.5 text-[13px] font-medium text-[#00b4b8] transition-colors hover:bg-[#00b4b8] hover:text-white"
        >
          View
        </button>
        <button
          type="button"
          title="Edit"
          onClick={() => onEdit(reminder)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#6b7280] transition-colors hover:bg-[#f3f4f6] hover:text-[#10141a]"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Delete"
          onClick={() => onDelete(reminder)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#6b7280] transition-colors hover:bg-[#fff0f0] hover:text-[#ef4444]"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function RemindersPage() {
  const navigate = useNavigate();
  const currentUser = useSelector(selectUser);
  const storageKey = useMemo(
    () => `care-on-board:reminders:${currentUser?.agencyId ?? currentUser?.uid ?? "default"}`,
    [currentUser?.agencyId, currentUser?.uid],
  );

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loadedStorageKey, setLoadedStorageKey] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [viewingReminder, setViewingReminder] = useState<Reminder | null>(null);
  const [deletingReminder, setDeletingReminder] = useState<Reminder | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setReminders(loadReminders(storageKey));
    setLoadedStorageKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (loadedStorageKey !== storageKey) return;
    window.localStorage.setItem(storageKey, JSON.stringify(reminders));
  }, [loadedStorageKey, reminders, storageKey]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const visibleReminders = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return reminders.filter((reminder) => {
      const status = getStatus(reminder, now).toLowerCase();
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (dateFilter && reminder.date !== dateFilter) return false;
      if (normalizedSearch && !reminder.message.toLowerCase().includes(normalizedSearch)) return false;
      return true;
    });
  }, [dateFilter, now, reminders, searchQuery, statusFilter]);

  const currentReminders = useMemo(
    () => visibleReminders
      .filter((reminder) => getStatus(reminder, now) === "Current")
      .sort((a, b) => getReminderDateTime(a).getTime() - getReminderDateTime(b).getTime()),
    [now, visibleReminders],
  );

  const pastReminders = useMemo(
    () => visibleReminders
      .filter((reminder) => getStatus(reminder, now) === "Past")
      .sort((a, b) => getReminderDateTime(b).getTime() - getReminderDateTime(a).getTime()),
    [now, visibleReminders],
  );

  const groups = useMemo(() => {
    if (statusFilter === "current") {
      return [{ label: "Current reminders", status: "Current" as const, reminders: currentReminders }];
    }
    if (statusFilter === "past") {
      return [{ label: "Past reminders", status: "Past" as const, reminders: pastReminders }];
    }
    return [
      { label: "Current reminders", status: "Current" as const, reminders: currentReminders },
      { label: "Past reminders", status: "Past" as const, reminders: pastReminders },
    ];
  }, [currentReminders, pastReminders, statusFilter]);

  const openAddModal = () => {
    setEditingReminder(null);
    setModalOpen(true);
  };

  const openEditModal = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setModalOpen(true);
  };

  const deleteReminder = () => {
    if (!deletingReminder) return;
    setReminders((current) => current.filter((reminder) => reminder.id !== deletingReminder.id));
    if (viewingReminder?.id === deletingReminder.id) setViewingReminder(null);
    setDeletingReminder(null);
  };

  const saveReminder = (draft: ReminderDraft) => {
    const timestamp = new Date().toISOString();

    setReminders((current) => {
      if (editingReminder) {
        return current.map((reminder) =>
          reminder.id === editingReminder.id
            ? { ...reminder, ...draft, updatedAt: timestamp }
            : reminder
        );
      }

      return [
        {
          id: createReminderId(),
          ...draft,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        ...current,
      ];
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFilter("");
  };

  const hasFilters = Boolean(searchQuery || dateFilter || statusFilter !== "all");

  return (
    <div className="min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-0">
      <div className="flex flex-wrap items-center gap-2 mb-4 sm:mb-6">
        <Button type="button" variant="outline" onClick={() => navigate(Routes.agency.tasks)} className="cursor-pointer border-0 flex items-center justify-center rounded-full bg-white backdrop-blur-sm transition-colors hover:bg-[#f0fbfb]">
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
                Schedule reminders and update past reminders with new dates.
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
                onChange={(event) => setSearchQuery(event.target.value)}
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

            <div className="hidden h-5 w-px bg-[#e5e7eb] xl:block" />

            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-[190px] flex-1 sm:flex-none">
                <CustomDatePicker
                  date={fromDateInput(dateFilter)}
                  setDate={(selectedDate) => setDateFilter(selectedDate ? toDateInput(selectedDate) : "")}
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

        {visibleReminders.length === 0 ? (
          <div className="p-8 text-center sm:p-12">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f3f4f6]">
              <BellRing className="h-7 w-7 text-[#b2b2b3]" />
            </div>
            <p className="text-[14px] font-semibold text-[#10141a]">
              {reminders.length === 0 ? "No reminders yet" : "No reminders match your filters"}
            </p>
            <p className="mt-1 text-[13px] text-[#6b7280]">
              {reminders.length === 0 ? "Click Add Reminder to create your first reminder" : "Try changing your search, status, or date filter"}
            </p>
          </div>
        ) : (
          <div>
            <div className="hidden grid-cols-[minmax(220px,2fr)_minmax(150px,1fr)_100px_110px_minmax(190px,auto)] border-b border-[#e5e5e6] bg-[#f9fafb] px-4 py-3 md:grid">
              {[
                { label: "Reminder", align: "" },
                { label: "Date", align: "" },
                { label: "Time", align: "" },
                { label: "Status", align: "" },
                { label: "", align: "text-right" },
              ].map((header, index) => (
                <div key={`${header.label}-${index}`} className={`text-[12px] font-semibold uppercase text-[#808081] ${header.align}`}>
                  {header.label}
                </div>
              ))}
            </div>
            {groups.map((group) => group.reminders.length > 0 && (
              <div key={group.status}>
                <div className="border-b border-[#e5e7eb] bg-[#fcfcfd] px-4 py-2.5 text-[12px] font-bold uppercase text-[#6b7280]">
                  {group.label} ({group.reminders.length})
                </div>
                {group.reminders.map((reminder) => (
                  <ReminderRow
                    key={reminder.id}
                    reminder={reminder}
                    status={group.status}
                    onView={setViewingReminder}
                    onEdit={openEditModal}
                    onDelete={setDeletingReminder}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!viewingReminder} onOpenChange={(open) => { if (!open) setViewingReminder(null); }}>
        <DialogContent className="flex w-[min(520px,calc(100vw-32px))] flex-col gap-4 rounded-[30px] border border-[rgba(255,255,255,0.3)] bg-white p-5 backdrop-blur">
          {viewingReminder && (
            <>
              <DialogHeader className="items-start gap-2 text-left">
                <DialogTitle className="pr-6 text-[20px] font-bold leading-snug text-[#10141a]">
                  Reminder details
                </DialogTitle>
                <StatusBadge status={getStatus(viewingReminder, now)} />
              </DialogHeader>

              <div>
                <p className="mb-1 text-[12px] font-semibold uppercase text-[#808081]">Message</p>
                <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-[#10141a]">
                  {viewingReminder.message}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-0.5 text-[12px] font-semibold uppercase text-[#808081]">Date</p>
                  <p className="text-[14px] text-[#6b7280]">{formatDate(viewingReminder)}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-[12px] font-semibold uppercase text-[#808081]">Time</p>
                  <p className="text-[14px] text-[#6b7280]">{formatTime(viewingReminder)}</p>
                </div>
              </div>

              <DialogFooter className="flex flex-wrap justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setViewingReminder(null)}>Close</Button>
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
        onSave={saveReminder}
      />

      <Dialog open={!!deletingReminder} onOpenChange={(open) => { if (!open) setDeletingReminder(null); }}>
        <DialogContent className="flex w-[min(400px,calc(100vw-32px))] flex-col gap-4 rounded-[30px] border border-[rgba(255,255,255,0.3)] bg-white p-5 backdrop-blur">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold text-[#10141a]">Delete reminder?</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-[#6b7280]">
            This action cannot be undone. The reminder will be permanently removed.
          </p>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingReminder(null)}>Cancel</Button>
            <Button className="bg-[#ef4444] text-white hover:bg-[#dc2626]" onClick={deleteReminder}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
