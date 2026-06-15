import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Department, StaffMember, StaffTask } from "./types";

interface TaskListProps {
  tasks: StaffTask[];
  departments: Department[];
  staff: StaffMember[];
  selectedDepartment: string;
  selectedStaff: string;
  onAddActivity: (taskId: string, description: string) => void;
}

const statusClassMap: Record<StaffTask["status"], string> = {
  Open: "bg-slate-100 text-slate-900",
  "In Progress": "bg-blue-100 text-blue-900",
  Completed: "bg-green-100 text-green-900",
};

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  departments,
  staff,
  selectedDepartment,
  selectedStaff,
  onAddActivity,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | StaffTask["status"] | "All">("All");
  const [activityInputs, setActivityInputs] = useState<Record<string, string>>({});
  const [selectedTask, setSelectedTask] = useState<StaffTask | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const counts = useMemo(() => {
    return {
      all: tasks.length,
      open: tasks.filter((t) => t.status === "Open").length,
      inProgress: tasks.filter((t) => t.status === "In Progress").length,
      completed: tasks.filter((t) => t.status === "Completed").length,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedDepartment && selectedDepartment !== "" && selectedDepartment !== "__all__" && t.department !== selectedDepartment) return false;
      if (selectedStaff && selectedStaff !== "" && selectedStaff !== "__all__" && t.staffMember !== selectedStaff) return false;
      if (statusFilter !== "All" && statusFilter !== t.status) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const staffName = (staff.find((s) => s.id === t.staffMember)?.name || "").toLowerCase();
        return t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || staffName.includes(q);
      }
      return true;
    });
  }, [tasks, selectedDepartment, selectedStaff, statusFilter, searchQuery, staff]);

  function getDepartmentLabel(id: string) {
    return departments.find((d) => d.value === id)?.label || "-";
  }

  function getStaffName(id: string) {
    return staff.find((s) => s.id === id)?.name || "-";
  }

  function handleActivityChange(taskId: string, value: string) {
    setActivityInputs((prev) => ({ ...prev, [taskId]: value }));
  }

  function handleSubmitActivity(taskId: string) {
    const text = (activityInputs[taskId] || "").trim();
    if (!text) return;
    onAddActivity(taskId, text);
    setActivityInputs((prev) => ({ ...prev, [taskId]: "" }));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <input
            className="h-11 w-64 rounded-xl border border-[#cccccd] bg-white px-4 text-sm text-slate-900 outline-none"
            placeholder="Search staff or task"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            className={`px-3 py-1 rounded-full text-sm ${statusFilter === "All" ? "bg-[#00b4b8] text-white" : "bg-white text-[#808081] border"}`}
            onClick={() => setStatusFilter("All")}
          >
            All ({counts.all})
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm ${statusFilter === "Open" ? "bg-[#00b4b8] text-white" : "bg-white text-[#808081] border"}`}
            onClick={() => setStatusFilter("Open")}
          >
            Pending ({counts.open})
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm ${statusFilter === "In Progress" ? "bg-[#00b4b8] text-white" : "bg-white text-[#808081] border"}`}
            onClick={() => setStatusFilter("In Progress")}
          >
            Active ({counts.inProgress})
          </button>
          <button
            className={`px-3 py-1 rounded-full text-sm ${statusFilter === "Completed" ? "bg-[#00b4b8] text-white" : "bg-white text-[#808081] border"}`}
            onClick={() => setStatusFilter("Completed")}
          >
            Completed ({counts.completed})
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredTasks.map((task) => (
          <div key={task.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-sm font-semibold text-slate-700 shadow-sm">
                  {(
                    (staff.find((s) => s.id === task.staffMember)?.name || "")
                      .split(" ")
                      .map((n) => n[0] || "")
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                  <p className="text-sm text-slate-600">{task.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassMap[task.status]}`}>
                  {task.status}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-700 shadow-sm">
                  {task.priority}
                </span>
                <button
                  className="px-3 py-1 rounded-full bg-white text-[#008f93] border"
                  onClick={() => { setSelectedTask(task); setShowDetails(true); }}
                >
                  Details
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-white p-3 text-sm text-slate-700 shadow-sm">
                <span className="block text-[11px] uppercase tracking-[0.2em] text-slate-500">Department</span>
                {getDepartmentLabel(task.department)}
              </div>
              <div className="rounded-xl bg-white p-3 text-sm text-slate-700 shadow-sm">
                <span className="block text-[11px] uppercase tracking-[0.2em] text-slate-500">Staff</span>
                {getStaffName(task.staffMember)}
              </div>
              <div className="rounded-xl bg-white p-3 text-sm text-slate-700 shadow-sm">
                <span className="block text-[11px] uppercase tracking-[0.2em] text-slate-500">Due</span>
                {task.dueDate}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="mb-2 text-sm font-medium text-slate-800">Activity log</p>
                {task.activities.length ? (
                  <ul className="space-y-2">
                    {task.activities.map((activity) => (
                      <li key={activity.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        <div className="flex justify-between gap-3">
                          <span>{activity.description}</span>
                          <span className="text-xs text-slate-500">{activity.createdAt}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No activities added yet.</p>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  className="h-11 w-full rounded-xl border border-[#cccccd] bg-white px-4 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25"
                  placeholder="Add activity note"
                  value={activityInputs[task.id] ?? ""}
                  onChange={(event) => handleActivityChange(task.id, event.target.value)}
                />
                <Button type="button" onClick={() => handleSubmitActivity(task.id)}>
                  Add
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Details modal */}
      {selectedTask && showDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowDetails(false)} />
          <div className="relative w-[680px] bg-white rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">{selectedTask.title}</h3>
            <p className="text-sm text-slate-600 mb-4">{selectedTask.description}</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs text-slate-500">Assigned</div>
                <div className="font-medium">{getStaffName(selectedTask.staffMember)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Department</div>
                <div className="font-medium">{getDepartmentLabel(selectedTask.department)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Due Date</div>
                <div className="font-medium">{selectedTask.dueDate}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Status</div>
                <div className="font-medium">{selectedTask.status}</div>
              </div>
            </div>
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Activity log</div>
              {selectedTask.activities.length ? (
                <ul className="space-y-2">
                  {selectedTask.activities.map((a) => (
                    <li key={a.id} className="text-sm text-slate-700">{a.createdAt} — {a.description}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-slate-500">No activities yet.</div>
              )}
            </div>
            <div className="flex justify-end">
              <button className="px-4 py-2 rounded-full bg-[#00b4b8] text-white" onClick={() => setShowDetails(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;
