import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { selectUser } from "@/utils/auth/store/authSelectors";
import AddTaskModal from "@/components/tasks/AddTaskModal";
import EditTaskModal from "@/components/tasks/EditTaskModal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DotGridIcon, menuItemClassName } from "@/components/ui/dot-grid-menu";
import { Plus, Pencil, Trash2, Search, ClipboardList, BellRing, Eye } from "lucide-react";
import { Routes } from "@/routes/constants";
import type { Department, StaffMember, StaffTask } from "@/components/tasks/types";
import {
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} from "./api";
import { useListAgencyStaffQuery } from "@/lib/api/agency-staff";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";

const departments: Department[] = [
  { value: "hr", label: "HR" },
  { value: "compliance", label: "Compliance" },
  { value: "director", label: "Director" },
  { value: "coordinator", label: "Coordinator" },
  { value: "supervisor", label: "Supervisor" },
  { value: "finance", label: "Finance" },
  { value: "admin", label: "Admin" },
];

const STATUS_META: Record<string, { border: string; dot: string }> = {
  "Open":        { border: "border-[#FF6C10] text-[#FF6C10]",  dot: "bg-[#FF6C10]" },
  "In Progress": { border: "border-[#2b82ff] text-[#2b82ff]",  dot: "bg-[#2b82ff]" },
  "Completed":   { border: "border-[#0eaf52] text-[#0eaf52]",  dot: "bg-[#0eaf52]" },
};

const PRIORITY_META: Record<string, { border: string; dot: string }> = {
  "High":   { border: "border-[#ef4444] text-[#ef4444]",  dot: "bg-[#ef4444]" },
  "Medium": { border: "border-[#FF6C10] text-[#FF6C10]",  dot: "bg-[#FF6C10]" },
  "Low":    { border: "border-[#b2b2b3] text-[#b2b2b3]",  dot: "bg-[#b2b2b3]" },
};

type StatusFilter = "All" | "Open" | "In Progress" | "Completed";

// Shared column template (header/rows/skeleton) — must stay a full, literal
// class string (incl. the md: prefix) so Tailwind's JIT detects it.
// All tracks are fixed or fr (no content-based `auto`) so the separate header and
// row grids resolve to identical column widths and stay aligned.
const TASK_GRID = "gap-2 md:grid-cols-[minmax(150px,2fr)_minmax(72px,0.9fr)_100px_95px_85px_100px_72px]";

function SkeletonRow() {
  return (
    <div className={`grid grid-cols-1 border-b border-[#e5e5e6] px-4 py-4 md:items-center ${TASK_GRID}`}>
      <div className="flex items-center gap-2.5">
        <Skeleton className="w-2 h-2 rounded-full shrink-0" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-36 max-w-full" />
          <Skeleton className="w-24 h-3" />
        </div>
      </div>
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="w-20 h-6 rounded-full" />
      <Skeleton className="h-3.5 w-16" />
      <Skeleton className="w-16 h-6 rounded-full" />
      <Skeleton className="w-20 h-6 rounded-full" />
      <div className="flex items-center md:justify-self-start">
        <Skeleton className="rounded-md h-8 w-8" />
      </div>
    </div>
  );
}

export default function StaffTasksPage() {
  const navigate = useNavigate();
  const currentUser = useSelector(selectUser);
  const mode = useEffectiveAgencyMode();

  const [searchQuery,    setSearchQuery]   = useState("");
  const [staffFilter,    setStaffFilter]   = useState("");
  const [statusFilter,   setStatusFilter]  = useState<StatusFilter>("All");
  const [showAddModal,   setShowAddModal]  = useState(false);
  const [viewingTask,    setViewingTask]   = useState<StaffTask | null>(null);
  const [editingTask,    setEditingTask]   = useState<StaffTask | null>(null);
  const [showEditModal,  setShowEditModal] = useState(false);
  const [deletingTaskId,   setDeletingTaskId]   = useState<string | null>(null);
  const [isDeleting,       setIsDeleting]       = useState(false);
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

  const tasks: StaffTask[] = useMemo(
    () => (tasksResponse?.data ?? []) as StaffTask[],
    [tasksResponse],
  );

  const staffList: StaffMember[] = useMemo(
    () =>
      (staffResponse?.data ?? [])
        .filter((s) => s.isActive)
        .map((s) => ({ id: s.uid, name: s.name, department: "", role: s.accessList[0] ?? "Team Member" }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [staffResponse],
  );

  const staffMap = useMemo(
    () => Object.fromEntries(staffList.map((s) => [s.id, s.name])),
    [staffList],
  );

  const filtered = useMemo(() =>
    tasks.filter((t) => {
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (staffFilter && t.staffMember !== staffFilter) return false;
      if (statusFilter !== "All" && t.status !== statusFilter) return false;
      return true;
    }),
    [tasks, searchQuery, staffFilter, statusFilter],
  );

  const isLoading = tasksLoading || staffLoading;

  const handleCreateTask = async (task: {
    title: string; description: string; department: string;
    staffMember: string; dueDate: string; priority: "High" | "Medium" | "Low";
  }) => { await createTask({ ...task, ...(mode ? { mode } : {}) }); };

  const handleUpdateTask = async (
    taskId: string,
    data: Partial<Omit<StaffTask, "id" | "activities">>,
  ) => { await updateTask({ taskId, data }).unwrap(); };

  const handleDeleteConfirm = async () => {
    if (!deletingTaskId) return;
    setIsDeleting(true);
    try {
      await deleteTask(deletingTaskId).unwrap();
      if (viewingTask?.id === deletingTaskId) setViewingTask(null);
      setDeletingTaskId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (taskId: string, status: StaffTask["status"]) => {
    setUpdatingStatusId(taskId);
    try {
      await updateTask({ taskId, data: { status } }).unwrap();
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const openEdit = (task: StaffTask) => {
    setEditingTask(task);
    setShowEditModal(true);
  };

  const tableHead = (
    <div className={`hidden border-b border-[#e5e5e6] bg-[#f9fafb] px-4 py-3 md:grid ${TASK_GRID}`}>
      {["Task", "Assigned to", "Department", "Due date", "Priority", "Status", "Actions"].map((h) => (
        <span key={h} className="text-left text-[12px] font-semibold text-[#808081] uppercase tracking-wide">
          {h}
        </span>
      ))}
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-0">
      {/* Page header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-[28px] sm:text-[32px] lg:text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Task Manager
        </h1>
      </div>

      {/* Main card */}
      <div className="min-w-0 overflow-hidden bg-white shadow-sm rounded-xl sm:rounded-2xl">

        {/* Card header */}
        <div className="p-4 sm:p-6 border-b border-[#e5e7eb]">
          <div className="flex flex-col gap-4 mb-1 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div>
              <h2 className="text-[20px] sm:text-[22px] font-bold text-[#10141a]">All Tasks</h2>
              <p className="mt-0.5 text-[13px] sm:text-[14px] text-[#6b7280]">
                Create and assign tasks to agency staff members
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => navigate(Routes.agency.reminders)}
                className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-[#00b4b8] bg-white text-[#008f93] text-[14px] font-semibold hover:bg-[#f0fbfb] transition-colors cursor-pointer"
              >
                <BellRing className="w-4 h-4" />
                Reminders
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#00b4b8] text-white text-[14px] font-semibold hover:bg-[#00a0a4] transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {/* Search */}
            <div className="relative flex items-center gap-2 border border-[#e5e7eb] rounded-full px-3 h-9 min-w-[200px]">
              <Search className="h-3.5 w-3.5 text-[#808081] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks…"
                className="h-full border-0 bg-transparent px-0 py-0 text-[13px] text-[#10141a] placeholder:text-[#808081] outline-none focus:ring-0 min-w-0 w-full"
              />
            </div>

            {/* Staff filter */}
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="h-9 px-3 rounded-full border border-[#e5e7eb] text-[13px] text-[#6b7280] outline-none focus:border-[#00b4b8] bg-white transition-colors cursor-pointer"
            >
              <option value="">All Staff</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <div className="h-5 w-px bg-[#e5e7eb]" />

            {/* Status pills */}
            <div className="flex flex-wrap items-center gap-1">
              {(["All", "Open", "In Progress", "Completed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-[13px] font-medium border transition-colors ${
                    statusFilter === s
                      ? "bg-[#00b4b8] border-[#00b4b8] text-white"
                      : "border-[#e5e7eb] text-[#6b7280] hover:border-[#cccccd]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {!isLoading && (
              <span className="ml-auto text-[13px] text-[#6b7280]">
                {filtered.length} of {tasks.length}
              </span>
            )}
          </div>
        </div>

        {/* Table body */}
        {isLoading ? (
          <div className="overflow-x-auto">
            {tableHead}
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center sm:p-12">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f3f4f6]">
              <ClipboardList className="h-7 w-7 text-[#b2b2b3]" />
            </div>
            <p className="text-[14px] font-semibold text-[#10141a]">
              {tasks.length === 0 ? "No tasks yet" : "No tasks match your filters"}
            </p>
            <p className="mt-1 text-[13px] text-[#6b7280]">
              {tasks.length === 0
                ? "Click \"Add Task\" to create your first task"
                : "Try adjusting your search, staff, or status filter"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {tableHead}
            {filtered.map((task) => {
              const isCreator  = task.createdBy === currentUser?.uid;
              const deptLabel  = departments.find((d) => d.value === task.department)?.label ?? "—";
              const staffName  = staffMap[task.staffMember] ?? "—";
              const statusMeta = STATUS_META[task.status];
              const priMeta    = PRIORITY_META[task.priority];

              return (
                <div
                  key={task.id}
                  className={`grid grid-cols-1 border-b border-[#e5e5e6] px-4 py-4 transition-colors last:border-b-0 hover:bg-[#f9fafb] md:items-center ${TASK_GRID}`}
                >
                  {/* Title + description */}
                  <div className="min-w-0">
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${priMeta?.dot ?? "bg-[#b2b2b3]"}`} />
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#10141a] truncate">{task.title}</p>
                        {task.description && (
                          <p className="text-[13px] text-[#6b7280] truncate mt-0.5">{task.description}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-[14px] text-[#10141a]">
                    <span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Assigned to</span>
                    {staffName}
                  </div>

                  <div>
                    <span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Department</span>
                    {task.department ? (
                      <span className="rounded-full border border-[#e5e7eb] bg-transparent px-3 py-1 text-[13px] font-medium text-[#6b7280]">
                        {deptLabel}
                      </span>
                    ) : (
                      <span className="text-[13px] text-[#b2b2b3]">—</span>
                    )}
                  </div>

                  <div className="text-[14px] text-[#6b7280]">
                    <span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Due date</span>
                    {task.dueDate || <span className="text-[#b2b2b3]">—</span>}
                  </div>

                  <div>
                    <span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Priority</span>
                    <span className={`rounded-full border bg-transparent px-3 py-1 text-[13px] font-medium ${priMeta?.border ?? ""}`}>
                      {task.priority}
                    </span>
                  </div>

                  <div>
                    <span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Status</span>
                    <span className={`rounded-full border bg-transparent px-3 py-1 text-[13px] font-medium ${statusMeta?.border ?? ""}`}>
                      {task.status}
                    </span>
                  </div>

                  <div className="flex items-center md:justify-self-start">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label="Task actions"
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-white transition-colors hover:bg-[#e5e5e6] active:bg-[#e5e5e6]"
                        >
                          <DotGridIcon />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-[100] min-w-[160px] rounded-xl border-0 bg-white p-0 shadow-lg">
                        <DropdownMenuItem className={menuItemClassName} onClick={() => setViewingTask(task)}>
                          <Eye className="mr-2 h-3.5 w-3.5" />
                          View
                        </DropdownMenuItem>
                        {isCreator && (
                          <>
                            <DropdownMenuItem className={menuItemClassName} onClick={() => openEdit(task)}>
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className={`${menuItemClassName} text-[#ef4444] hover:bg-[#fef2f2] focus:bg-[#fef2f2] focus:text-[#ef4444]`}
                              onClick={() => setDeletingTaskId(task.id)}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Task detail modal ── */}
      <Dialog open={!!viewingTask} onOpenChange={(open) => { if (!open) setViewingTask(null); }}>
        <DialogContent className="w-[520px] p-[20px] backdrop-blur bg-white border border-[rgba(255,255,255,0.3)] rounded-[30px] flex flex-col gap-[16px]">
          {viewingTask && (() => {
            const deptLabel  = departments.find((d) => d.value === viewingTask.department)?.label ?? "—";
            const staffName  = staffMap[viewingTask.staffMember] ?? "—";
            const isCreator  = viewingTask.createdBy  === currentUser?.uid;
            const isAssigned = viewingTask.staffMember === currentUser?.uid;
            const statusMeta = STATUS_META[viewingTask.status];
            const priMeta    = PRIORITY_META[viewingTask.priority];
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-[20px] font-bold text-[#10141a] leading-snug pr-6">
                    {viewingTask.title}
                  </DialogTitle>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`px-3 py-1 rounded-full text-[13px] font-medium border bg-transparent ${statusMeta?.border ?? ""}`}>
                      {viewingTask.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[13px] font-medium border bg-transparent ${priMeta?.border ?? ""}`}>
                      {viewingTask.priority} priority
                    </span>
                  </div>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <div>
                    <p className="mb-0.5 text-[12px] font-semibold text-[#808081] uppercase tracking-wide">Assigned to</p>
                    <p className="text-[14px] font-semibold text-[#10141a]">{staffName}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-[12px] font-semibold text-[#808081] uppercase tracking-wide">Department</p>
                    <p className="text-[14px] text-[#6b7280]">{deptLabel}</p>
                  </div>
                  <div>
                    <p className="mb-0.5 text-[12px] font-semibold text-[#808081] uppercase tracking-wide">Due date</p>
                    <p className="text-[14px] text-[#6b7280]">{viewingTask.dueDate || "—"}</p>
                  </div>
                </div>

                {viewingTask.description && (
                  <div>
                    <p className="mb-1 text-[12px] font-semibold text-[#808081] uppercase tracking-wide">Description</p>
                    <p className="text-[14px] text-[#6b7280] leading-relaxed">{viewingTask.description}</p>
                  </div>
                )}

                {viewingTask.activities.length > 0 && (
                  <div>
                    <p className="mb-2 text-[12px] font-semibold text-[#808081] uppercase tracking-wide">Activity log</p>
                    <ul className="space-y-1.5 max-h-36 overflow-y-auto">
                      {viewingTask.activities.map((a) => (
                        <li key={a.id} className="flex items-start gap-2 text-[13px] text-[#6b7280]">
                          <span className="shrink-0 text-[#b2b2b3]">{a.createdAt}</span>
                          <span>— {a.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {isAssigned && !isCreator && (
                  <div>
                    <p className="mb-2 text-[12px] font-semibold text-[#808081] uppercase tracking-wide">Update status</p>
                    <div className="flex items-center gap-2">
                      {(["Open", "In Progress", "Completed"] as const).map((s) => {
                        const m = STATUS_META[s];
                        return (
                          <button
                            key={s}
                            disabled={updatingStatusId === viewingTask.id}
                            onClick={async () => {
                              await handleStatusChange(viewingTask.id, s);
                              setViewingTask((prev) => prev ? { ...prev, status: s } : prev);
                            }}
                            className={`px-3 py-1 rounded-full text-[13px] font-medium border transition-colors ${
                              viewingTask.status === s
                                ? `${m.border} font-semibold`
                                : "border-[#e5e7eb] text-[#6b7280] hover:border-[#cccccd]"
                            } disabled:opacity-50`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <DialogFooter className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setViewingTask(null)}>Close</Button>
                  {isCreator && (
                    <>
                      <Button
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => { openEdit(viewingTask); setViewingTask(null); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />Edit
                      </Button>
                      <Button
                        className="bg-[#ef4444] hover:bg-[#dc2626] text-white gap-1.5"
                        onClick={() => { setDeletingTaskId(viewingTask.id); setViewingTask(null); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />Delete
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Add Task modal ── */}
      <AddTaskModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onOpenChange={setShowAddModal}
        departments={departments}
        staff={staffList}
        onCreateTask={handleCreateTask}
      />

      {/* ── Edit Task modal ── */}
      <EditTaskModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        task={editingTask}
        departments={departments}
        staff={staffList}
        onUpdateTask={handleUpdateTask}
      />

      {/* ── Delete confirmation ── */}
      <Dialog open={!!deletingTaskId} onOpenChange={(open) => { if (!open) setDeletingTaskId(null); }}>
        <DialogContent className="w-[400px] p-[20px] backdrop-blur bg-white border border-[rgba(255,255,255,0.3)] rounded-[30px] flex flex-col gap-[16px]">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold text-[#10141a]">Delete task?</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-[#6b7280]">
            This action cannot be undone. The task and all its activity notes will be permanently removed.
          </p>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingTaskId(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              className="bg-[#ef4444] hover:bg-[#dc2626] text-white"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
