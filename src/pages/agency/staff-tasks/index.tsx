import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "@/utils/auth/store/authSelectors";
import AddTaskModal from "@/components/tasks/AddTaskModal";
import EditTaskModal from "@/components/tasks/EditTaskModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ClipboardList } from "lucide-react";
import type { Department, StaffMember, StaffTask } from "@/components/tasks/types";
import {
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} from "./api";
import { useListAgencyStaffQuery } from "@/lib/api/agency-staff";

const departments: Department[] = [
  { value: "hr", label: "HR" },
  { value: "compliance", label: "Compliance" },
  { value: "director", label: "Director" },
  { value: "coordinator", label: "Coordinator" },
  { value: "supervisor", label: "Supervisor" },
  { value: "finance", label: "Finance" },
  { value: "admin", label: "Admin" },
];

const PRIORITY_DOT: Record<string, string> = {
  High: "bg-red-500",
  Medium: "bg-amber-400",
  Low: "bg-slate-300",
};

const PRIORITY_TEXT: Record<string, string> = {
  High: "text-red-600 bg-red-50 border-red-200",
  Medium: "text-amber-600 bg-amber-50 border-amber-200",
  Low: "text-slate-500 bg-slate-50 border-slate-200",
};

const STATUS_STYLE: Record<string, string> = {
  "In Progress": "text-blue-700 bg-blue-50 border-blue-200",
  Open: "text-yellow-700 bg-yellow-50 border-yellow-200",
  Completed: "text-emerald-700 bg-emerald-50 border-emerald-200",
};

const StaffTasksPage: React.FC = () => {
  const currentUser = useSelector(selectUser);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [staffFilter, setStaffFilter] = useState(""); // uid or "" for all
  const [statusFilter, setStatusFilter] = useState<"All" | "Open" | "In Progress" | "Completed">("All");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingTask, setViewingTask] = useState<StaffTask | null>(null);
  const [editingTask, setEditingTask] = useState<StaffTask | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: tasksResponse, isLoading } = useGetTasksQuery();
  const [createTask] = useCreateTaskMutation();
  const [updateTask] = useUpdateTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const { data: staffResponse, isLoading: staffLoading } = useListAgencyStaffQuery({ limit: 200 });

  const tasks: StaffTask[] = useMemo(
    () => (tasksResponse?.data ?? []) as StaffTask[],
    [tasksResponse]
  );

  // Sorted staff list for the filter dropdown
  const staffList: StaffMember[] = useMemo(
    () =>
      (staffResponse?.data ?? [])
        .filter((s) => s.isActive)
        .map((s) => ({ id: s.uid, name: s.name, department: "", role: s.accessList[0] ?? "Team Member" }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [staffResponse]
  );

  // uid → name lookup for task rows
  const staffMap = useMemo(
    () => Object.fromEntries(staffList.map((s) => [s.id, s.name])),
    [staffList]
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (staffFilter && t.staffMember !== staffFilter) return false;
      if (statusFilter !== "All" && t.status !== statusFilter) return false;
      return true;
    });
  }, [tasks, searchQuery, staffFilter, statusFilter]);

  const handleCreateTask = async (task: {
    title: string;
    description: string;
    department: string;
    staffMember: string;
    dueDate: string;
    priority: "High" | "Medium" | "Low";
  }) => {
    await createTask(task);
  };

  const handleUpdateTask = async (
    taskId: string,
    data: Partial<Omit<StaffTask, "id" | "activities">>
  ) => {
    await updateTask({ taskId, data }).unwrap();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTaskId) return;
    setIsDeleting(true);
    try {
      await deleteTask(deletingTaskId).unwrap();
      setDeletingTaskId(null);
      // Close detail modal if viewing the deleted task
      if (viewingTask?.id === deletingTaskId) setViewingTask(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const openEdit = (task: StaffTask) => {
    setEditingTask(task);
    setShowEditModal(true);
  };

  return (
    <div className="max-w-6xl p-6 mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Smart Manager</h1>
          <p className="text-sm text-slate-500">Manage and assign tasks to staff</p>
        </div>
        <button
          className="px-4 py-2 rounded-full bg-[#00b4b8] text-white text-sm font-medium hover:bg-[#0099a0] transition-colors"
          onClick={() => setShowAddModal(true)}
        >
          + Add Task
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 p-4 mb-6 bg-white shadow-sm rounded-xl">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-700">Tasks overview</p>
          <p className="text-xs text-slate-400">All tasks across the agency</p>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-2xl font-semibold text-blue-600">{tasks.filter((t) => t.status === "In Progress").length}</p>
            <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />In Progress
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-yellow-600">{tasks.filter((t) => t.status === "Open").length}</p>
            <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />Open
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-emerald-600">{tasks.filter((t) => t.status === "Completed").length}</p>
            <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />Completed
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-slate-700">{tasks.length}</p>
            <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-slate-400" />Total
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <input
          type="text"
          placeholder="Search task title…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 flex-1 min-w-[180px] px-4 rounded-lg border border-slate-200 text-sm outline-none focus:border-[#00b4b8] focus:ring-1 focus:ring-[#00b4b8] bg-white"
        />

        {/* Staff filter */}
        <select
          value={staffFilter}
          onChange={(e) => setStaffFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-slate-200 text-sm outline-none focus:border-[#00b4b8] bg-white text-slate-700 min-w-[160px]"
        >
          <option value="">All Staff</option>
          {staffList.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {/* Status tabs */}
        <div className="flex items-center gap-1">
          {(["All", "Open", "In Progress", "Completed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-[#00b4b8] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading || staffLoading ? (
          <div className="py-16 text-center text-sm text-slate-400">Loading…</div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
            <ClipboardList className="w-8 h-8 opacity-40" />
            <p className="text-sm">No tasks match your filters</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Task</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Assigned to</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Department</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Due</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTasks.map((task) => {
                const isCreator = task.createdBy === currentUser?.uid;
                const deptLabel = departments.find((d) => d.value === task.department)?.label ?? "-";
                const staffName = staffMap[task.staffMember] ?? "—";
                return (
                  <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                    {/* Title + description */}
                    <td className="px-5 py-3.5 max-w-[260px]">
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] ?? "bg-slate-300"}`} />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-slate-400 truncate mt-0.5">{task.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Assigned to */}
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{staffName}</td>
                    {/* Department */}
                    <td className="px-4 py-3.5">
                      {task.department ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{deptLabel}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    {/* Due date */}
                    <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{task.dueDate || "—"}</td>
                    {/* Priority */}
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${PRIORITY_TEXT[task.priority] ?? ""}`}>
                        {task.priority}
                      </span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${STATUS_STYLE[task.status] ?? ""}`}>
                        {task.status}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingTask(task)}
                          className="px-3 py-1 rounded-full text-xs font-medium text-[#00b4b8] border border-[#00b4b8] hover:bg-[#00b4b8] hover:text-white transition-colors"
                        >
                          View
                        </button>
                        {isCreator && (
                          <>
                            <button
                              title="Edit"
                              onClick={() => openEdit(task)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-[#00b4b8] hover:bg-slate-100 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Delete"
                              onClick={() => setDeletingTaskId(task.id)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Task detail modal ── */}
      <Dialog open={!!viewingTask} onOpenChange={(open) => { if (!open) setViewingTask(null); }}>
        <DialogContent className="w-[520px] p-[20px] backdrop-blur bg-white border border-[rgba(255,255,255,0.3)] rounded-[30px] flex flex-col gap-[16px]">
          {viewingTask && (() => {
            const deptLabel = departments.find((d) => d.value === viewingTask.department)?.label ?? "-";
            const staffName = staffMap[viewingTask.staffMember] ?? "—";
            const isCreator = viewingTask.createdBy === currentUser?.uid;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl leading-snug pr-6">{viewingTask.title}</DialogTitle>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${STATUS_STYLE[viewingTask.status]}`}>
                      {viewingTask.status}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${PRIORITY_TEXT[viewingTask.priority]}`}>
                      {viewingTask.priority} priority
                    </span>
                  </div>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">Assigned to</p>
                    <p className="text-slate-800 font-medium">{staffName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">Department</p>
                    <p className="text-slate-700">{deptLabel}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">Due date</p>
                    <p className="text-slate-700">{viewingTask.dueDate || "—"}</p>
                  </div>
                </div>

                {viewingTask.description && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Description</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{viewingTask.description}</p>
                  </div>
                )}

                {viewingTask.activities.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Activity log</p>
                    <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                      {viewingTask.activities.map((a) => (
                        <li key={a.id} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="shrink-0 text-slate-300 mt-0.5">{a.createdAt}</span>
                          <span>— {a.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <DialogFooter className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setViewingTask(null)}>Close</Button>
                  {isCreator && (
                    <>
                      <Button
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => {
                          openEdit(viewingTask);
                          setViewingTask(null);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />Edit
                      </Button>
                      <Button
                        className="bg-red-500 hover:bg-red-600 text-white gap-1.5"
                        onClick={() => {
                          setDeletingTaskId(viewingTask.id);
                          setViewingTask(null);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />Delete
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
            <DialogTitle>Delete task?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            This action cannot be undone. The task and all its activity notes will be permanently removed.
          </p>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingTaskId(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
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
};

export default StaffTasksPage;
