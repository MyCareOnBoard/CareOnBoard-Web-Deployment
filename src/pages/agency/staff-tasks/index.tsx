import React, { useMemo, useState } from "react";
import AddTaskModal from "@/components/tasks/AddTaskModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Department, StaffMember, StaffTask } from "@/components/tasks/types";
import {
  useGetTasksQuery,
  useCreateTaskMutation,
  useAddActivityMutation,
} from "./api";

const departments: Department[] = [
  { value: "hr", label: "HR" },
  { value: "compliance", label: "Compliance" },
  { value: "director", label: "Director" },
  { value: "coordinator", label: "Coordinator" },
  { value: "supervisor", label: "Supervisor" },
  { value: "finance", label: "Finance" },
  { value: "admin", label: "Admin" },
];

const staffMembers: StaffMember[] = [
  { id: "staff-1", name: "Avery Lane", department: "hr", role: "Coordinator" },
  { id: "staff-2", name: "Jordan Reese", department: "compliance", role: "Supervisor" },
  { id: "staff-3", name: "Morgan Tate", department: "director", role: "Director" },
  { id: "staff-4", name: "Riley Brooks", department: "coordinator", role: "Coordinator" },
  { id: "staff-5", name: "Taylor Kim", department: "supervisor", role: "Supervisor" },
  { id: "staff-6", name: "Jamie Cruz", department: "finance", role: "Finance" },
  { id: "staff-7", name: "Casey Morgan", department: "admin", role: "Admin" },
];

const StaffTasksPage: React.FC = () => {
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStaffMember, setSelectedStaffMember] = useState<StaffMember | null>(null);
  const [showStaffDetails, setShowStaffDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Pending" | "Inactive">("All");

  const { data: tasksResponse, isLoading } = useGetTasksQuery();
  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const [addActivity] = useAddActivityMutation();

  const tasks: StaffTask[] = useMemo(
    () => (tasksResponse?.data ?? []) as StaffTask[],
    [tasksResponse]
  );

  const getStaffTasks = (staffId: string) =>
    tasks.filter((t) => t.staffMember === staffId);

  const getStaffStatus = (staffId: string) => {
    const staffTasks = getStaffTasks(staffId);
    if (staffTasks.length === 0) return "Inactive";
    return staffTasks.some((t) => t.status === "In Progress") ? "Active" : "Pending";
  };

  const getActivitySummary = (staffId: string) => {
    const total = getStaffTasks(staffId).reduce((sum, t) => sum + t.activities.length, 0);
    return total > 0 ? `${total} activity note${total !== 1 ? "s" : ""}` : "No activities";
  };

  const filteredAndSearchedStaff = useMemo(() => {
    return staffMembers.filter((staff) => {
      if (searchQuery && !staff.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter !== "All" && getStaffStatus(staff.id) !== statusFilter) return false;
      return true;
    });
  }, [searchQuery, statusFilter, tasks]);

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

  const handleAddActivity = async (taskId: string, description: string) => {
    await addActivity({ taskId, description });
  };

  return (
    <div className="max-w-6xl p-6 mx-auto">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Smart Manager</h1>
          <p className="text-sm text-slate-600">Manage and assign tasks to staff</p>
        </div>
        <div>
          <button
            className="px-4 py-2 rounded-full bg-[#00b4b8] text-white cursor-pointer hover:bg-[#0099a0] transition-colors"
            onClick={() => setShowAddModal(true)}
          >
            Add Task
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 mb-6 bg-white shadow-sm rounded-xl">
        <div>
          <div className="text-sm font-medium">Staff</div>
          <div className="text-xs text-slate-500">Staff overview and task distribution</div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="text-2xl font-semibold">{tasks.filter((t) => t.status === "In Progress").length}</div>
            <div className="flex items-center gap-2 text-xs text-slate-500"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500"/>Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold">{tasks.filter((t) => t.status === "Open").length}</div>
            <div className="flex items-center gap-2 text-xs text-slate-500"><span className="inline-block w-2 h-2 bg-yellow-400 rounded-full"/>Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold">{tasks.length}</div>
            <div className="flex items-center gap-2 text-xs text-slate-500"><span className="inline-block w-2 h-2 rounded-full bg-slate-400"/>Total</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <div className="p-4 bg-white rounded shadow">
            <div className="flex items-center gap-3 mb-6">
              <input
                type="text"
                placeholder="Search staff name"
                className="flex-1 h-10 px-4 rounded-lg border border-slate-300 text-sm outline-none focus:border-[#00b4b8] focus:ring-1 focus:ring-[#00b4b8]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {(["Active", "Pending", "Inactive", "All"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                    statusFilter === s
                      ? "bg-[#00b4b8] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="py-8 text-sm text-center text-slate-500">Loading tasks…</div>
            ) : (
              <div className="space-y-3">
                {filteredAndSearchedStaff.map((staff) => (
                  <div key={staff.id} className="flex items-center justify-between p-4 border rounded-lg border-slate-200 hover:bg-slate-50">
                    <div className="flex items-center flex-1 gap-4">
                      <div className="flex items-center justify-center w-10 h-10 text-sm font-semibold rounded-full bg-slate-200 text-slate-700">
                        {staff.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{staff.name}</p>
                        <p className="text-xs text-slate-500">{staff.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          getStaffStatus(staff.id) === "Active"
                            ? "bg-emerald-100 text-emerald-700"
                            : getStaffStatus(staff.id) === "Pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-slate-100 text-slate-700"
                        }`}>
                          {getStaffStatus(staff.id)}
                        </div>
                      </div>

                      <div className="text-center min-w-[100px]">
                        <p className="text-sm text-slate-600">{getActivitySummary(staff.id)}</p>
                      </div>

                      <button
                        className="px-4 py-2 rounded-full bg-[#00b4b8] text-white text-sm font-medium hover:bg-[#0099a0]"
                        onClick={() => {
                          setSelectedStaffMember(staff);
                          setShowStaffDetails(true);
                        }}
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <AddTaskModal
              open={showAddModal}
              onClose={() => setShowAddModal(false)}
              onOpenChange={setShowAddModal}
              departments={departments}
              staff={staffMembers}
              onCreateTask={handleCreateTask}
            />
          </div>
        </div>
      </div>

      {/* Staff Details Modal */}
      <Dialog open={showStaffDetails} onOpenChange={setShowStaffDetails}>
        <DialogContent className="w-[500px] p-[20px] backdrop-blur bg-white border border-[rgba(255,255,255,0.3)] rounded-[30px] flex flex-col gap-[18px]">
          {selectedStaffMember && (
            <>
              <DialogHeader>
                <div className="space-y-1">
                  <DialogTitle className="text-2xl">{selectedStaffMember.name}</DialogTitle>
                  <p className="text-sm text-slate-600">
                    {selectedStaffMember.role} •{" "}
                    {departments.find((d) => d.value === selectedStaffMember.department)?.label || "-"}
                  </p>
                </div>
              </DialogHeader>

              <div className="py-4 space-y-6">
                <div>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    getStaffStatus(selectedStaffMember.id) === "Active"
                      ? "bg-emerald-100 text-emerald-700"
                      : getStaffStatus(selectedStaffMember.id) === "Pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-slate-100 text-slate-700"
                  }`}>
                    {getStaffStatus(selectedStaffMember.id)}
                  </div>
                </div>

                <div>
                  <h4 className="mb-4 text-base font-semibold">Assigned Tasks</h4>
                  {getStaffTasks(selectedStaffMember.id).length > 0 ? (
                    <div className="space-y-3 overflow-y-auto max-h-80">
                      {getStaffTasks(selectedStaffMember.id).map((task) => (
                        <div key={task.id} className="p-4 border rounded-lg border-slate-200 bg-slate-50">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <p className="mb-1 font-medium text-slate-900">{task.title}</p>
                              <p className="text-sm text-slate-600">{task.description}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
                              task.status === "In Progress" ? "bg-blue-100 text-blue-700" :
                              task.status === "Open" ? "bg-yellow-100 text-yellow-700" :
                              "bg-green-100 text-green-700"
                            }`}>
                              {task.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mb-3 text-sm text-slate-700">
                            <div><span className="font-medium text-slate-600">Due Date:</span> {task.dueDate}</div>
                            <div><span className="font-medium text-slate-600">Priority:</span> {task.priority}</div>
                            <div className="col-span-2">
                              <span className="font-medium text-slate-600">Department:</span>{" "}
                              {departments.find((d) => d.value === task.department)?.label || "-"}
                            </div>
                          </div>
                          {task.activities.length > 0 && (
                            <div className="pt-3 border-t border-slate-200">
                              <p className="mb-2 text-xs font-medium text-slate-700">Activity Log:</p>
                              <ul className="space-y-1">
                                {task.activities.map((activity) => (
                                  <li key={activity.id} className="text-xs text-slate-600">
                                    {activity.createdAt} — {activity.description}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No tasks assigned to this staff member.</p>
                  )}
                </div>
              </div>

              <DialogFooter className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowStaffDetails(false)}>
                  Close
                </Button>
                <Button
                  className="bg-[#00b4b8] hover:bg-[#0099a0]"
                  onClick={() => {
                    setShowStaffDetails(false);
                    setShowAddModal(true);
                  }}
                >
                  Assign Task
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffTasksPage;
