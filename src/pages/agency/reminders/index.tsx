import { Fragment, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Bell, BellRing, BrainCircuit, ChevronRight, CircleAlert, CircleCheck, Clock3, Ellipsis, ExternalLink, Pencil, Plus, Repeat, Trash2,
} from "lucide-react";

import CustomDatePicker from "@/components/ui/datePicker";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog, ConfirmDialogContent } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AgencyPageHeader, AgencyStatCard } from "@/components/agency/AgencyShell";
import {
  AgencyListCard, AgencyPill, AgencySearchField, AgencySegmented,
  agencyMenuContent, agencyMenuItem, agencyOutlineButton, agencyPrimaryButton, agencyRowLink, agencyRowMenuButton,
  agencyTd, agencyTh, agencyTheadRow, agencyTr, type AgencyTone,
} from "@/components/agency/AgencyListKit";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import { Routes } from "@/routes/constants";
import { cn } from "@/lib/utils";

import ReminderModal from "./components/ReminderModal";
import { getReminderDateTime, RECURRENCE_LABELS, type Reminder, type ReminderDraft, type ReminderStatus } from "./types";
import { useGetRemindersQuery, useCreateReminderMutation, useUpdateReminderMutation, useDeleteReminderMutation } from "./api";

type StatusFilter = "all" | ReminderStatus;

const STATUS_META: Record<ReminderStatus, { label: string; tone: AgencyTone }> = {
  pending: { label: "Upcoming", tone: "teal" },
  sent: { label: "Sent", tone: "green" },
  failed: { label: "Failed", tone: "red" },
};

/** Upcoming soonest first; sent and failed most recent first. */
const GROUPS: ReminderStatus[] = ["pending", "sent", "failed"];

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

function TypePill({ type }: { type: Reminder["type"] }) {
  const ai = type === "ai_prompt";
  return (
    <span className={cn(
      "inline-flex h-6 w-fit items-center gap-1.5 whitespace-nowrap rounded-[6px] px-2 text-[12px] font-medium",
      ai ? "bg-[#f1ecfb] text-[#5b3a9e] dark:bg-[#8e4ec6]/20 dark:text-[#d4b8f5]" : "bg-[#eef0f2] text-[#2a3138] dark:bg-white/10 dark:text-[#c9d1d4]",
    )}>
      {ai ? <BrainCircuit aria-hidden="true" className="h-3.5 w-3.5" /> : <Bell aria-hidden="true" className="h-3.5 w-3.5" />}
      {ai ? "AI prompt" : "Reminder"}
    </span>
  );
}

/** Program view a reminder is scoped to; nothing for agency-wide reminders. */
function ModeTag({ mode }: { mode?: Reminder["mode"] }) {
  if (!mode) return null;
  return <span className="w-fit rounded-[6px] border border-[#e4e7ea] px-1.5 py-0.5 text-[11px] font-medium uppercase text-[#4b535b] dark:border-white/15 dark:text-[#9aa4a8]">{mode}</span>;
}

export default function RemindersPage() {
  const navigate = useNavigate();
  const mode = useEffectiveAgencyMode();

  // refetchOnMountOrArgChange + isFetching keep the skeleton showing on every
  // DDD/HHA toggle, even when that view's data is already cached.
  const { data, isFetching: isLoading, isError, refetch } = useGetRemindersQuery(
    { mode: mode ?? undefined },
    { refetchOnMountOrArgChange: true },
  );
  const [createReminder, { isLoading: isCreating }] = useCreateReminderMutation();
  const [updateReminder, { isLoading: isUpdating }] = useUpdateReminderMutation();
  const [deleteReminder, { isLoading: isDeleting }] = useDeleteReminderMutation();

  const reminders = useMemo(() => data?.data ?? [], [data]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [viewingReminder, setViewingReminder] = useState<Reminder | null>(null);
  const [deletingReminder, setDeletingReminder] = useState<Reminder | null>(null);

  const counts = useMemo(() => ({
    all: reminders.length,
    pending: reminders.filter((r) => r.status === "pending").length,
    sent: reminders.filter((r) => r.status === "sent").length,
    failed: reminders.filter((r) => r.status === "failed").length,
    repeating: reminders.filter((r) => r.recurrence && r.recurrence !== "none").length,
  }), [reminders]);

  const groups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const visible = reminders.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (dateFilter && r.scheduledDate !== dateFilter) return false;
      if (q && !r.message.toLowerCase().includes(q)) return false;
      return true;
    });
    return GROUPS
      .filter((status) => statusFilter === "all" || status === statusFilter)
      .map((status) => ({
        status,
        reminders: visible
          .filter((r) => r.status === status)
          .sort((a, b) => {
            const diff = getReminderDateTime(a).getTime() - getReminderDateTime(b).getTime();
            return status === "pending" ? diff : -diff;
          }),
      }))
      .filter((group) => group.reminders.length > 0);
  }, [reminders, searchQuery, statusFilter, dateFilter]);

  const visibleCount = groups.reduce((sum, group) => sum + group.reminders.length, 0);

  const openConversation = (conversationId: string) => navigate(`/agency/automations/${conversationId}`);
  const openAddModal = () => { setEditingReminder(null); setModalOpen(true); };
  const openEditModal = (reminder: Reminder) => { setEditingReminder(reminder); setModalOpen(true); };

  const handleSave = async (draft: ReminderDraft) => {
    // Stamp the active program view on create AND edit (an edit re-stamps the
    // editor's current view); no mode = agency-wide, shows in both views.
    const payload = mode ? { ...draft, mode } : draft;
    try {
      if (editingReminder) {
        await updateReminder({ reminderId: editingReminder.id, data: payload }).unwrap();
      } else {
        await createReminder(payload).unwrap();
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

  const clearFilters = () => { setSearchQuery(""); setStatusFilter("all"); setDateFilter(""); };
  const hasFilters = Boolean(searchQuery || dateFilter || statusFilter !== "all");

  /** The main row action: the conversation or result for AI prompts, otherwise the details. */
  const rowAction = (reminder: Reminder) => {
    if (reminder.type === "ai_prompt" && reminder.conversationId) {
      return { label: "Conversation", run: () => openConversation(reminder.conversationId!) };
    }
    return { label: reminder.type === "ai_prompt" && reminder.result ? "Result" : "View", run: () => setViewingReminder(reminder) };
  };

  return (
    <div className="pb-6">
      <AgencyPageHeader
        icon={BellRing}
        title="Reminders"
        description="Schedule reminders for yourself, or AI prompts that send you the result."
        actions={<>
          <button type="button" onClick={() => navigate(Routes.agency.tasks)} className={agencyOutlineButton}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />Task management
          </button>
          <button type="button" onClick={openAddModal} className={agencyPrimaryButton}>
            <Plus aria-hidden="true" className="h-4 w-4" />Add reminder
          </button>
        </>}
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AgencyStatCard icon={Clock3} label="Upcoming" value={isLoading ? "—" : counts.pending} footnote="Waiting to be sent." />
        <AgencyStatCard icon={CircleCheck} label="Sent" value={isLoading ? "—" : counts.sent} footnote="Delivered as notifications." />
        <AgencyStatCard icon={CircleAlert} label="Failed" value={isLoading ? "—" : counts.failed}
          extra={!isLoading && counts.failed > 0 ? <AgencyPill tone="red">Check</AgencyPill> : null}
          footnote="Could not be sent." />
        <AgencyStatCard icon={Repeat} label="Repeating" value={isLoading ? "—" : counts.repeating} footnote="Daily, weekly, bi-weekly or monthly." />
      </div>

      <AgencyListCard label="Reminders" className="mt-5">
        <div className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center">
          <AgencySegmented label="Status" value={statusFilter} onChange={setStatusFilter}
            options={[
              { value: "all", label: "All", count: isLoading ? undefined : counts.all },
              { value: "pending", label: "Upcoming", count: isLoading ? undefined : counts.pending },
              { value: "sent", label: "Sent", count: isLoading ? undefined : counts.sent },
              { value: "failed", label: "Failed", count: isLoading ? undefined : counts.failed },
            ]} />
          <div className="flex flex-wrap items-center gap-2.5 xl:ml-auto">
            <AgencySearchField label="Search reminders" placeholder="Search reminders" value={searchQuery} onChange={setSearchQuery} className="min-w-[200px] flex-1 xl:w-[220px] xl:flex-none" />
            <div className="w-[190px]">
              <CustomDatePicker
                date={fromDateInput(dateFilter)}
                setDate={(d) => setDateFilter(d ? toDateInput(d) : "")}
                placeholder="Filter by date"
                startMonth={new Date(2000, 0)}
                endMonth={new Date(2100, 11)}
                className="h-10 min-h-10 rounded-[10px] px-3 [--cr-field-height:40px]"
                inputClassName="text-[14px]"
              />
            </div>
            {hasFilters && <button type="button" onClick={clearFilters} className={agencyRowLink}>Clear filters</button>}
          </div>
        </div>

        {isLoading ? (
          <div aria-hidden="true" className="space-y-px border-t border-[#eceef0] dark:border-white/10">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-[62px] animate-pulse bg-[#f8f9fa] dark:bg-white/5" />)}
            <span role="status" className="sr-only">Loading reminders</span>
          </div>
        ) : isError ? (
          <div role="alert" className="border-t border-[#eceef0] px-6 py-12 text-center dark:border-white/10">
            <p className="text-[16px] font-medium text-[#b42318] dark:text-[#f8a1a1]">Reminders could not be loaded</p>
            <button type="button" onClick={() => refetch()} className={cn(agencyRowLink, "mt-2")}>Try again</button>
          </div>
        ) : visibleCount === 0 ? (
          <div className="border-t border-[#eceef0] px-6 py-14 text-center dark:border-white/10">
            <p className="text-[16px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{reminders.length === 0 ? "No reminders yet" : "No reminders match"}</p>
            <p className="mt-1 text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">
              {reminders.length === 0 ? "Add a reminder or an AI prompt to get a notification at the time you choose." : "Try another search, status or date."}
            </p>
            {reminders.length === 0 ? (
              <button type="button" onClick={openAddModal} className={cn(agencyPrimaryButton, "mt-5")}><Plus aria-hidden="true" className="h-4 w-4" />Add reminder</button>
            ) : (
              <button type="button" onClick={clearFilters} className={cn(agencyOutlineButton, "mt-5")}>Clear filters</button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className={agencyTheadRow}>
                  <th scope="col" className={agencyTh}>Reminder</th>
                  <th scope="col" className={agencyTh}>Type</th>
                  <th scope="col" className={agencyTh}>Scheduled</th>
                  <th scope="col" className={agencyTh}>Status</th>
                  <th scope="col" className={agencyTh}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <Fragment key={group.status}>
                    {statusFilter === "all" && (
                      <tr className="border-b border-[#eceef0] bg-[#fbfbfc] dark:border-white/10 dark:bg-white/[0.03]">
                        <th scope="colgroup" colSpan={5} className="px-4 py-2 text-left text-[12px] font-medium uppercase tracking-[0.08em] text-[#4b535b] dark:text-[#9aa4a8]">
                          {STATUS_META[group.status].label} ({group.reminders.length})
                        </th>
                      </tr>
                    )}
                    {group.reminders.map((reminder) => {
                      const action = rowAction(reminder);
                      const repeats = reminder.recurrence && reminder.recurrence !== "none";
                      return (
                        <tr key={reminder.id} className={agencyTr}>
                          <td className={cn(agencyTd, "max-w-[380px]")}>
                            <p className="line-clamp-2 whitespace-pre-wrap break-words font-medium">{reminder.message}</p>
                            {repeats && (
                              <span className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">
                                <Repeat aria-hidden="true" className="h-3 w-3" />Repeats {RECURRENCE_LABELS[reminder.recurrence].toLowerCase()}
                              </span>
                            )}
                          </td>
                          <td className={agencyTd}>
                            <div className="flex flex-col items-start gap-1"><TypePill type={reminder.type} /><ModeTag mode={reminder.mode} /></div>
                          </td>
                          <td className={cn(agencyTd, "whitespace-nowrap")}>
                            <span className="block">{formatDate(reminder)}</span>
                            <span className="mt-0.5 block text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">{formatTime(reminder)}</span>
                          </td>
                          <td className={agencyTd}><AgencyPill tone={STATUS_META[reminder.status]?.tone ?? "grey"}>{STATUS_META[reminder.status]?.label ?? reminder.status}</AgencyPill></td>
                          <td className={cn(agencyTd, "whitespace-nowrap")}>
                            <div className="flex items-center justify-end gap-3">
                              <button type="button" onClick={action.run} className={agencyRowLink}>
                                {action.label}<ChevronRight aria-hidden="true" className="h-4 w-4" />
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button type="button" aria-label="Reminder actions" className={agencyRowMenuButton}>
                                    <Ellipsis aria-hidden="true" className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" sideOffset={6} className={agencyMenuContent}>
                                  <DropdownMenuItem className={agencyMenuItem} onSelect={() => setViewingReminder(reminder)}>
                                    <Bell aria-hidden="true" className="h-4 w-4 text-[#007679] dark:text-[#7fd3d3]" />Details
                                  </DropdownMenuItem>
                                  {reminder.status === "pending" && (
                                    <DropdownMenuItem className={agencyMenuItem} onSelect={() => openEditModal(reminder)}>
                                      <Pencil aria-hidden="true" className="h-4 w-4 text-[#007679] dark:text-[#7fd3d3]" />Edit
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem className={cn(agencyMenuItem, "text-[#b42318] dark:text-[#f8a1a1]")} onSelect={() => setDeletingReminder(reminder)}>
                                    <Trash2 aria-hidden="true" className="h-4 w-4" />Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !isError && visibleCount > 0 && (
          <div className="border-t border-[#eceef0] px-4 py-3 text-[13px] text-[#4b535b] dark:border-white/10 dark:text-[#9aa4a8]">
            Showing {visibleCount} of {reminders.length} reminder{reminders.length === 1 ? "" : "s"}
          </div>
        )}
      </AgencyListCard>

      {/* Details / AI result */}
      <Dialog open={!!viewingReminder} onOpenChange={(open) => { if (!open) setViewingReminder(null); }}>
        <DialogContent className="w-[calc(100vw-32px)] max-w-[560px] gap-0 rounded-[20px] p-0">
          {viewingReminder && (
            <>
              <div className="border-b border-[#eceef0] px-5 py-4 pr-12 dark:border-white/10">
                <DialogTitle className="text-[20px] font-medium leading-snug">
                  {viewingReminder.type === "ai_prompt" && viewingReminder.status === "sent" ? "AI prompt result" : "Reminder details"}
                </DialogTitle>
                <DialogDescription className="sr-only">Reminder details</DialogDescription>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <AgencyPill tone={STATUS_META[viewingReminder.status]?.tone ?? "grey"}>{STATUS_META[viewingReminder.status]?.label ?? viewingReminder.status}</AgencyPill>
                  <TypePill type={viewingReminder.type} />
                  <ModeTag mode={viewingReminder.mode} />
                  {viewingReminder.recurrence && viewingReminder.recurrence !== "none" && (
                    <span className="inline-flex h-6 items-center gap-1 rounded-[6px] border border-[#e4e7ea] px-2 text-[12px] text-[#4b535b] dark:border-white/15 dark:text-[#9aa4a8]">
                      <Repeat aria-hidden="true" className="h-3 w-3" />{RECURRENCE_LABELS[viewingReminder.recurrence]}
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-[calc(100vh-240px)] space-y-4 overflow-y-auto px-5 py-4 text-[14px]">
                <div>
                  <h3 className="mb-1 text-[13px] font-medium text-[#4b535b] dark:text-[#9aa4a8]">{viewingReminder.type === "ai_prompt" ? "Prompt" : "Message"}</h3>
                  <p className="whitespace-pre-wrap break-words leading-6 text-[#10141a] dark:text-[#e6eaec]">{viewingReminder.message}</p>
                </div>

                {viewingReminder.type === "ai_prompt" && viewingReminder.result && (
                  <div>
                    <h3 className="mb-1 text-[13px] font-medium text-[#5b3a9e] dark:text-[#d4b8f5]">AI result</h3>
                    <div className="max-h-60 overflow-y-auto rounded-[12px] bg-[#f6f2fd] p-3 dark:bg-[#8e4ec6]/10">
                      <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[#2a1a4a] dark:text-[#e6dcf7]">{viewingReminder.result}</p>
                    </div>
                  </div>
                )}

                <dl className="grid gap-x-6 gap-y-3 rounded-[12px] bg-[#f8f9fa] p-4 sm:grid-cols-2 dark:bg-white/5">
                  <div>
                    <dt className="text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">{viewingReminder.recurrence !== "none" && viewingReminder.status === "pending" ? "Next date" : "Date"}</dt>
                    <dd className="mt-0.5 text-[#10141a] dark:text-[#f4f6f7]">{formatDate(viewingReminder)}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">Time</dt>
                    <dd className="mt-0.5 text-[#10141a] dark:text-[#f4f6f7]">{formatTime(viewingReminder)}</dd>
                  </div>
                  {viewingReminder.lastSentAt && (
                    <div>
                      <dt className="text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">Last sent</dt>
                      <dd className="mt-0.5 text-[#10141a] dark:text-[#f4f6f7]">
                        {new Intl.DateTimeFormat(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(new Date(viewingReminder.lastSentAt))}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="flex flex-wrap justify-end gap-2.5 border-t border-[#eceef0] px-5 py-4 dark:border-white/10">
                <button type="button" onClick={() => { setDeletingReminder(viewingReminder); setViewingReminder(null); }}
                  className={cn(agencyOutlineButton, "text-[#b42318] dark:text-[#f8a1a1]")}><Trash2 aria-hidden="true" className="h-4 w-4" />Delete</button>
                {viewingReminder.status === "pending" && (
                  <button type="button" onClick={() => { openEditModal(viewingReminder); setViewingReminder(null); }} className={agencyOutlineButton}>
                    <Pencil aria-hidden="true" className="h-4 w-4" />Edit
                  </button>
                )}
                {viewingReminder.conversationId ? (
                  <button type="button" onClick={() => { const id = viewingReminder.conversationId!; setViewingReminder(null); openConversation(id); }} className={agencyPrimaryButton}>
                    <ExternalLink aria-hidden="true" className="h-4 w-4" />View conversation
                  </button>
                ) : (
                  <button type="button" onClick={() => setViewingReminder(null)} className={agencyPrimaryButton}>Close</button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ReminderModal
        open={modalOpen}
        reminder={editingReminder}
        onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingReminder(null); }}
        onSave={handleSave}
        isSaving={isCreating || isUpdating}
      />

      <ConfirmDialog open={!!deletingReminder} onOpenChange={(open) => { if (!open && !isDeleting) setDeletingReminder(null); }}>
        <ConfirmDialogContent
          title="Delete reminder?"
          description="This cannot be undone. The reminder will be permanently removed."
          confirmText="Delete"
          loadingText="Deleting…"
          isLoading={isDeleting}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeletingReminder(null)}
        />
      </ConfirmDialog>
    </div>
  );
}
