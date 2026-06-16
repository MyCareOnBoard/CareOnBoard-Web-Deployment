import { ClipboardList } from "lucide-react";

interface TaskRow {
  id: string;
  title: string;
  description?: string;
  staffName: string;
  department: string;
  dueDate: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Completed";
  activityCount: number;
  overdue?: boolean;
}

function statusClass(status: string) {
  if (status === "In Progress") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "Completed")   return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

function priorityClass(priority: string) {
  if (priority === "High")   return "text-red-600";
  if (priority === "Medium") return "text-amber-600";
  return "text-slate-500";
}

function priorityDot(priority: string) {
  if (priority === "High")   return "bg-red-500";
  if (priority === "Medium") return "bg-amber-400";
  return "bg-slate-300";
}

export default function TaskListCard({ data }: { data: unknown }) {
  const tasks = Array.isArray(data) ? (data as TaskRow[]) : [];

  return (
    <div className="rounded-[18px] border border-[#e5e7eb] bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e7eb] bg-[#f3fafa]">
        <ClipboardList className="h-4 w-4 text-[#00b4b8]" />
        <span className="text-[13px] font-semibold text-[#10141a]">Tasks</span>
        <span className="ml-auto text-[12px] text-[#6b7280]">{tasks.length}</span>
      </div>

      {tasks.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-[#6b7280]">No tasks found.</p>
      ) : (
        <div className="divide-y divide-[#f3f4f6]">
          {tasks.map((task, i) => (
            <div key={task.id || i} className="px-4 py-3 text-[12px] sm:text-[13px]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${priorityDot(task.priority)}`} />
                  <div className="min-w-0">
                    <p className="font-medium text-[#10141a] truncate">
                      {task.title}
                      {task.overdue && (
                        <span className="ml-2 text-[11px] text-red-500 font-normal">overdue</span>
                      )}
                    </p>
                    {task.description && (
                      <p className="text-[#6b7280] truncate mt-0.5">{task.description}</p>
                    )}
                    <p className="text-[#9ca3af] mt-0.5">
                      {task.staffName} · {task.department}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:block text-[#9ca3af]">{task.dueDate}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusClass(task.status)}`}>
                    {task.status}
                  </span>
                </div>
              </div>
              {task.activityCount > 0 && (
                <p className="mt-1.5 pl-4 text-[11px] text-[#9ca3af]">
                  {task.activityCount} activity note{task.activityCount !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
