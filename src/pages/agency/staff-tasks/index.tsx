import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { Bell, CircleCheck, Ellipsis, Eye, Hourglass, ListChecks, ListTodo, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { selectUser } from "@/utils/auth/store/authSelectors";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog, ConfirmDialogContent } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AgencyPageHeader, AgencyProgressBar, AgencyStatCard } from "@/components/agency/AgencyShell";
import {
  AgencyFilterSelect, AgencyListCard, AgencyPagination, AgencyPerson, AgencyPill, AgencySearchField, AgencySegmented,
  agencyMenuContent, agencyMenuItem, agencyOutlineButton, agencyPrimaryButton, agencyRowMenuButton,
  agencyTd, agencyTh, agencyTheadRow, agencyTr, type AgencyTone,
} from "@/components/agency/AgencyListKit";
import { Routes } from "@/routes/constants";
import { cn } from "@/lib/utils";
import type { Department, StaffMember, StaffTask } from "@/components/tasks/types";
import { useGetTasksQuery, useCreateTaskMutation, useUpdateTaskMutation, useDeleteTaskMutation } from "./api";
import { useListAgencyStaffQuery } from "@/lib/api/agency-staff";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import TaskFormDialog, { type TaskFormValues } from "./TaskFormDialog";

const departments: Department[] = [
  { value: "hr", label: "HR" },
  { value: "compliance", label: "Compliance" },
  { value: "director", label: "Director" },
  { value: "coordinator", label: "Coordinator" },
  { value: "supervisor", label: "Supervisor" },
  { value: "finance", label: "Finance" },
  { value: "admin", label: "Admin" },
];

type StatusFilter = "All" | StaffTask["status"];
type SortKey = "listed" | "due" | "priority" | "title";

const PAGE_SIZE = 10;
const DAY = 86_400_000;

const STATUS_TONE: Record<StaffTask["status"], AgencyTone> = { "Open": "grey", "In Progress": "slate", "Completed": "green" };
const STATUS_LABEL: Record<StaffTask["status"], string> = { "Open": "Open", "In Progress": "In progress", "Completed": "Completed" };
const PRIORITY_TONE: Record<StaffTask["priority"], AgencyTone> = { High: "red", Medium: "amber", Low: "grey" };
const PRIORITY_RANK: Record<StaffTask["priority"], number> = { High: 0, Medium: 1, Low: 2 };

/** "2026-11-25" is that local day; anything else goes through Date. */
function parseDay(value?: string) {
  if (!value) return null;
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = plain ? new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3])) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/** Days from today to the due date (negative when late), or null without a date. */
function daysUntil(task: StaffTask) {
  const due = parseDay(task.dueDate);
  return due ? Math.round((due.getTime() - startOfToday()) / DAY) : null;
}

const isOverdue = (task: StaffTask) => task.status !== "Completed" && (daysUntil(task) ?? 0) < 0;

function dueText(task: StaffTask) {
  const due = parseDay(task.dueDate);
  if (!due) return { date: task.dueDate || "No due date", note: null as string | null, late: false };
  const date = due.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  if (task.status === "Completed") return { date, note: null, late: false };
  const days = daysUntil(task)!;
  if (days < 0) return { date, note: `${-days} day${days === -1 ? "" : "s"} overdue`, late: true };
  if (days === 0) return { date, note: "Due today", late: false };
  return { date, note: `In ${days} day${days === 1 ? "" : "s"}`, late: false };
}

function formatActivityDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function StaffTasksPage() {
  const navigate = useNavigate();
  const currentUser = useSelector(selectUser);
  const mode = useEffectiveAgencyMode();

  const [searchQuery, setSearchQuery] = useState("");
  const [staffFilter, setStaffFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [sortKey, setSortKey] = useState<SortKey>("listed");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StaffTask | null>(null);
  const [viewingTask, setViewingTask] = useState<StaffTask | null>(null);
  const [deletingTask, setDeletingTask] = useState<StaffTask | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // refetchOnMountOrArgChange + isFetching keep the skeleton showing on every
  // DDD/HHA toggle, even when that view's data is already cached.
  const { data: tasksResponse, isFetching: tasksLoading } = useGetTasksQuery(
    { mode: mode ?? undefined },
    { refetchOnMountOrArgChange: true },
  );
  const { data: staffResponse, isLoading: staffLoading } = useListAgencyStaffQuery({ limit: 200 });
  const [createTask] = useCreateTaskMutation();
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();

  const tasks: StaffTask[] = useMemo(() => (tasksResponse?.data ?? []) as StaffTask[], [tasksResponse]);

  const staffList: StaffMember[] = useMemo(
    () =>
      (staffResponse?.data ?? [])
        .filter((s) => s.isActive)
        .map((s) => ({ id: s.uid, name: s.name, department: "", role: s.accessList[0] ?? "Team Member" }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [staffResponse],
  );
  const staffById = useMemo(() => new Map(staffList.map((s) => [s.id, s])), [staffList]);
  const departmentLabel = (value: string) => departments.find((d) => d.value === value)?.label;

  const counts = useMemo(() => ({
    All: tasks.length,
    Open: tasks.filter((t) => t.status === "Open").length,
    "In Progress": tasks.filter((t) => t.status === "In Progress").length,
    Completed: tasks.filter((t) => t.status === "Completed").length,
    overdue: tasks.filter(isOverdue).length,
  }), [tasks]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = tasks.filter((t) => {
      if (query && ![t.title, t.description].some((text) => text?.toLowerCase().includes(query))) return false;
      if (staffFilter && t.staffMember !== staffFilter) return false;
      if (statusFilter !== "All" && t.status !== statusFilter) return false;
      return true;
    });
    if (sortKey === "title") return [...list].sort((a, b) => a.title.localeCompare(b.title));
    if (sortKey === "priority") return [...list].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    if (sortKey === "due") {
      return [...list].sort((a, b) => (parseDay(a.dueDate)?.getTime() ?? Infinity) - (parseDay(b.dueDate)?.getTime() ?? Infinity));
    }
    return list;
  }, [tasks, searchQuery, staffFilter, statusFilter, sortKey]);

  // Back to the first page whenever the list changes shape.
  useEffect(() => { setPage(1); }, [searchQuery, staffFilter, statusFilter, sortKey, mode]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice((Math.min(page, pages) - 1) * PAGE_SIZE, Math.min(page, pages) * PAGE_SIZE);

  const isLoading = tasksLoading || staffLoading;
  const completedShare = counts.All ? Math.round((counts.Completed / counts.All) * 100) : 0;

  const openAdd = () => { setEditingTask(null); setFormOpen(true); };
  const openEdit = (task: StaffTask) => { setViewingTask(null); setEditingTask(task); setFormOpen(true); };

  const handleSubmit = async (values: TaskFormValues) => {
    if (editingTask) {
      await updateTask({ taskId: editingTask.id, data: values }).unwrap();
      toast.success("Task updated.");
    } else {
      const { status: _status, ...create } = values;
      await createTask({ ...create, ...(mode ? { mode } : {}) }).unwrap();
      toast.success("Task created.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTask) return;
    setIsDeleting(true);
    try {
      await deleteTask(deletingTask.id).unwrap();
      if (viewingTask?.id === deletingTask.id) setViewingTask(null);
      setDeletingTask(null);
      toast.success("Task deleted.");
    } catch {
      toast.error("The task could not be deleted. Try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (task: StaffTask, status: StaffTask["status"]) => {
    setUpdatingStatusId(task.id);
    try {
      await updateTask({ taskId: task.id, data: { status } }).unwrap();
      setViewingTask((prev) => (prev && prev.id === task.id ? { ...prev, status } : prev));
    } catch {
      toast.error("The status could not be updated. Try again.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const filtersOn = !!searchQuery.trim() || !!staffFilter || statusFilter !== "All";

  return (
    <div className="pb-6">
      <AgencyPageHeader
        icon={ListChecks}
        title="Task management"
        description="Assign follow-ups to staff, set priority and track them to done."
        actions={<>
          <button type="button" onClick={() => navigate(Routes.agency.reminders)} className={agencyOutlineButton}>
            <Bell aria-hidden="true" className="h-4 w-4" />Reminders
          </button>
          <button type="button" onClick={openAdd} className={agencyPrimaryButton}>
            <Plus aria-hidden="true" className="h-4 w-4" />Add task
          </button>
        </>}
      />

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AgencyStatCard icon={ListTodo} label="Open" value={isLoading ? "—" : counts.Open} footnote="Not started yet." />
        <AgencyStatCard icon={Hourglass} label="In progress" value={isLoading ? "—" : counts["In Progress"]} footnote="Being worked on." />
        <AgencyStatCard icon={TriangleAlert} label="Overdue" value={isLoading ? "—" : counts.overdue}
          extra={!isLoading && counts.overdue > 0 ? <AgencyPill tone="red">Act today</AgencyPill> : null}
          footnote="Past their due date." />
        <AgencyStatCard icon={CircleCheck} label="Completed" value={isLoading ? "—" : counts.Completed}
          footnote={isLoading ? undefined : counts.All ? `Of ${counts.All} task${counts.All === 1 ? "" : "s"} (${completedShare}%).` : "No tasks yet."}>
          {!isLoading && counts.All > 0 && <AgencyProgressBar value={completedShare} label="Tasks completed" />}
        </AgencyStatCard>
      </div>

      <AgencyListCard label="Tasks" className="mt-5">
        <div className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center">
          <AgencySegmented label="Status" value={statusFilter} onChange={setStatusFilter}
            options={(["All", "Open", "In Progress", "Completed"] as const).map((value) => ({
              value, label: value === "All" ? "All" : STATUS_LABEL[value], count: isLoading ? undefined : counts[value],
            }))} />
          <div className="flex flex-wrap items-center gap-2.5 xl:ml-auto">
            <AgencySearchField label="Search tasks" placeholder="Search tasks" value={searchQuery} onChange={setSearchQuery} className="min-w-[200px] flex-1 xl:w-[220px] xl:flex-none" />
            <AgencyFilterSelect label="Staff" value={staffFilter} onChange={setStaffFilter}
              options={[{ value: "", label: "All" }, ...staffList.map((s) => ({ value: s.id, label: s.name }))]} className="max-w-[240px]" />
            <AgencyFilterSelect label="Sort by" value={sortKey} onChange={(value) => setSortKey(value as SortKey)}
              options={[
                { value: "listed", label: "Default" },
                { value: "due", label: "Due date" },
                { value: "priority", label: "Priority" },
                { value: "title", label: "Title" },
              ]} />
          </div>
        </div>

        {isLoading ? (
          <div aria-hidden="true" className="space-y-px border-t border-[#eceef0] dark:border-white/10">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-[66px] animate-pulse bg-[#f8f9fa] dark:bg-white/5" />)}
            <span role="status" className="sr-only">Loading tasks</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="border-t border-[#eceef0] px-6 py-14 text-center dark:border-white/10">
            <p className="text-[16px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{tasks.length === 0 ? "No tasks yet" : "No tasks match"}</p>
            <p className="mt-1 text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">
              {tasks.length === 0 ? "Add a task to assign a follow-up to someone on your team." : "Try another search, staff member or status."}
            </p>
            {tasks.length === 0 ? (
              <button type="button" onClick={openAdd} className={cn(agencyPrimaryButton, "mt-5")}><Plus aria-hidden="true" className="h-4 w-4" />Add task</button>
            ) : filtersOn && (
              <button type="button" onClick={() => { setSearchQuery(""); setStaffFilter(""); setStatusFilter("All"); }} className={cn(agencyOutlineButton, "mt-5")}>Clear filters</button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className={agencyTheadRow}>
                  <th scope="col" className={agencyTh}>Task</th>
                  <th scope="col" className={agencyTh}>Assigned to</th>
                  <th scope="col" className={agencyTh}>Department</th>
                  <th scope="col" className={agencyTh}>Due date</th>
                  <th scope="col" className={agencyTh}>Priority</th>
                  <th scope="col" className={agencyTh}>Status</th>
                  <th scope="col" className={agencyTh}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((task) => {
                  const isCreator = task.createdBy === currentUser?.uid;
                  const assignee = staffById.get(task.staffMember);
                  const due = dueText(task);
                  return (
                    <tr key={task.id} className={agencyTr}>
                      <td className={cn(agencyTd, "max-w-[320px]")}>
                        <button type="button" onClick={() => setViewingTask(task)}
                          className="block max-w-full cursor-pointer truncate rounded text-left font-medium text-[#10141a] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:text-[#f4f6f7]">
                          {task.title}
                        </button>
                        {task.description && <span className="mt-0.5 block truncate text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">{task.description}</span>}
                      </td>
                      <td className={agencyTd}>
                        {assignee ? <AgencyPerson name={assignee.name} detail={assignee.role} /> : <span className="text-[#6b737a]">Not assigned</span>}
                      </td>
                      <td className={agencyTd}>{departmentLabel(task.department) ?? <span className="text-[#6b737a]">—</span>}</td>
                      <td className={cn(agencyTd, "whitespace-nowrap")}>
                        <span className={cn("block", due.late && "text-[#c4262e] dark:text-[#ff9d94]")}>{due.date}</span>
                        {due.note && <span className="mt-0.5 block text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">{due.note}</span>}
                      </td>
                      <td className={agencyTd}><AgencyPill tone={PRIORITY_TONE[task.priority] ?? "grey"}>{task.priority}</AgencyPill></td>
                      <td className={agencyTd}><AgencyPill tone={STATUS_TONE[task.status] ?? "grey"}>{STATUS_LABEL[task.status] ?? task.status}</AgencyPill></td>
                      <td className={cn(agencyTd, "w-12 text-right")}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" aria-label={`Actions for ${task.title}`} className={agencyRowMenuButton}>
                              <Ellipsis aria-hidden="true" className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={6} className={agencyMenuContent}>
                            <DropdownMenuItem className={agencyMenuItem} onSelect={() => setViewingTask(task)}>
                              <Eye aria-hidden="true" className="h-4 w-4 text-[#007679] dark:text-[#7fd3d3]" />View
                            </DropdownMenuItem>
                            {isCreator && <>
                              <DropdownMenuItem className={agencyMenuItem} onSelect={() => openEdit(task)}>
                                <Pencil aria-hidden="true" className="h-4 w-4 text-[#007679] dark:text-[#7fd3d3]" />Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className={cn(agencyMenuItem, "text-[#b42318] dark:text-[#f8a1a1]")} onSelect={() => setDeletingTask(task)}>
                                <Trash2 aria-hidden="true" className="h-4 w-4" />Delete
                              </DropdownMenuItem>
                            </>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <AgencyPagination summary={`Showing ${shown.length} of ${filtered.length} task${filtered.length === 1 ? "" : "s"}`}
            page={Math.min(page, pages)} pages={pages} onPage={setPage} />
        )}
      </AgencyListCard>

      {/* Task details */}
      <Dialog open={!!viewingTask} onOpenChange={(open) => { if (!open) setViewingTask(null); }}>
        <DialogContent className="w-[calc(100vw-32px)] max-w-[560px] gap-0 rounded-[20px] p-0">
          {viewingTask && (() => {
            const isCreator = viewingTask.createdBy === currentUser?.uid;
            const isAssigned = viewingTask.staffMember === currentUser?.uid;
            const assignee = staffById.get(viewingTask.staffMember);
            const due = dueText(viewingTask);
            return (
              <>
                <div className="border-b border-[#eceef0] px-5 py-4 pr-12 dark:border-white/10">
                  <DialogTitle className="text-[20px] font-medium leading-snug">{viewingTask.title}</DialogTitle>
                  <DialogDescription className="sr-only">Task details</DialogDescription>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <AgencyPill tone={STATUS_TONE[viewingTask.status] ?? "grey"}>{STATUS_LABEL[viewingTask.status] ?? viewingTask.status}</AgencyPill>
                    <AgencyPill tone={PRIORITY_TONE[viewingTask.priority] ?? "grey"}>{viewingTask.priority} priority</AgencyPill>
                  </div>
                </div>
                <div className="max-h-[calc(100vh-240px)] space-y-4 overflow-y-auto px-5 py-4 text-[14px]">
                  <dl className="grid gap-x-6 gap-y-3 rounded-[12px] bg-[#f8f9fa] p-4 sm:grid-cols-3 dark:bg-white/5">
                    <div><dt className="text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">Assigned to</dt><dd className="mt-0.5 font-medium text-[#10141a] dark:text-[#f4f6f7]">{assignee?.name ?? "Not assigned"}</dd></div>
                    <div><dt className="text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">Department</dt><dd className="mt-0.5 text-[#10141a] dark:text-[#f4f6f7]">{departmentLabel(viewingTask.department) ?? "—"}</dd></div>
                    <div>
                      <dt className="text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">Due date</dt>
                      <dd className={cn("mt-0.5 text-[#10141a] dark:text-[#f4f6f7]", due.late && "text-[#c4262e] dark:text-[#ff9d94]")}>{due.date}{due.note ? ` · ${due.note}` : ""}</dd>
                    </div>
                  </dl>
                  {viewingTask.description && (
                    <div>
                      <h3 className="mb-1 text-[13px] font-medium text-[#4b535b] dark:text-[#9aa4a8]">Description</h3>
                      <p className="whitespace-pre-wrap leading-6 text-[#10141a] dark:text-[#e6eaec]">{viewingTask.description}</p>
                    </div>
                  )}
                  {viewingTask.activities.length > 0 && (
                    <div>
                      <h3 className="mb-1.5 text-[13px] font-medium text-[#4b535b] dark:text-[#9aa4a8]">Activity</h3>
                      <ul className="max-h-40 space-y-1.5 overflow-y-auto">
                        {viewingTask.activities.map((a) => (
                          <li key={a.id} className="flex gap-2 text-[13px] text-[#2a3138] dark:text-[#c9d1d4]">
                            <span className="shrink-0 text-[#6b737a] dark:text-[#9aa4a8]">{formatActivityDate(a.createdAt)}</span>
                            <span>{a.description}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {isAssigned && !isCreator && (
                    <div>
                      <h3 className="mb-1.5 text-[13px] font-medium text-[#4b535b] dark:text-[#9aa4a8]">Update status</h3>
                      <AgencySegmented label="Update status" value={viewingTask.status}
                        onChange={(status) => { if (status !== viewingTask.status && updatingStatusId !== viewingTask.id) void handleStatusChange(viewingTask, status); }}
                        options={(["Open", "In Progress", "Completed"] as const).map((value) => ({ value, label: STATUS_LABEL[value] }))}
                        className={cn("w-fit", updatingStatusId === viewingTask.id && "pointer-events-none opacity-60")} />
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap justify-end gap-2.5 border-t border-[#eceef0] px-5 py-4 dark:border-white/10">
                  {isCreator && <>
                    <button type="button" onClick={() => { setDeletingTask(viewingTask); setViewingTask(null); }}
                      className={cn(agencyOutlineButton, "text-[#b42318] dark:text-[#f8a1a1]")}><Trash2 aria-hidden="true" className="h-4 w-4" />Delete</button>
                    <button type="button" onClick={() => openEdit(viewingTask)} className={agencyOutlineButton}><Pencil aria-hidden="true" className="h-4 w-4" />Edit</button>
                  </>}
                  <button type="button" onClick={() => setViewingTask(null)} className={agencyPrimaryButton}>Close</button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} task={editingTask} departments={departments} staff={staffList} onSubmit={handleSubmit} />

      <ConfirmDialog open={!!deletingTask} onOpenChange={(open) => { if (!open && !isDeleting) setDeletingTask(null); }}>
        <ConfirmDialogContent
          title="Delete task?"
          description="This cannot be undone. The task and all its activity notes will be permanently removed."
          confirmText="Delete"
          loadingText="Deleting…"
          isLoading={isDeleting}
          onConfirm={() => void handleDeleteConfirm()}
          onCancel={() => setDeletingTask(null)}
        />
      </ConfirmDialog>
    </div>
  );
}
