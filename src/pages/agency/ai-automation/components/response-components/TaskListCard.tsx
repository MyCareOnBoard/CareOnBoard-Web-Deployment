import { ClipboardList } from "lucide-react";
import ListPager, { listCountLabel, readListMeta, usePagedRows } from "./ListPager";

// Fixed column widths: task, assigned to and due date (hidden on phones), status.
const TASK_COLUMNS = "grid items-start gap-3 px-4 py-2.5 grid-cols-[minmax(0,1fr)_96px] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_96px_104px]";

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

export default function TaskListCard({ data, meta: rawMeta, onSendMessage }: { data: unknown; meta?: unknown; onSendMessage?: (text: string) => void }) {
  const meta = readListMeta(rawMeta);
  const tasks = Array.isArray(data) ? (data as TaskRow[]) : [];
  const paging = usePagedRows(tasks);

  return (
    <div className="rounded-[18px] border border-[#e5e7eb] bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e7eb] bg-[#f3fafa]">
        <ClipboardList className="h-4 w-4 text-[#00b4b8]" />
        <span className="text-[13px] font-semibold text-[#10141a]">Tasks</span>
        <span className="ml-auto text-[12px] text-[#6b7280]">{listCountLabel(tasks.length, meta)}</span>
      </div>

      {tasks.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-[#6b7280]">No tasks found.</p>
      ) : (
        <div className="divide-y divide-[#f3f4f6]">
          <div className={`${TASK_COLUMNS} bg-[#fafafa] text-[11px] font-medium uppercase tracking-wide text-[#9ca3af]`}>
            <span>Task</span>
            <span className="hidden sm:block">Assigned to</span>
            <span className="hidden sm:block">Due</span>
            <span>Status</span>
          </div>
          {paging.pageRows.map((task, i) => (
            <div key={task.id || i} className={`${TASK_COLUMNS} text-[12px] sm:text-[13px]`}>
              <div className="flex min-w-0 items-start gap-2">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${priorityDot(task.priority)}`} title={`${task.priority} priority`} />
                <div className="min-w-0">
                  <p className="font-medium text-[#10141a] truncate" title={task.title}>
                    {task.title}
                    {task.overdue && (
                      <span className="ml-2 text-[11px] text-red-500 font-normal">overdue</span>
                    )}
                  </p>
                  {task.description && (
                    <p className="text-[#6b7280] truncate mt-0.5">{task.description}</p>
                  )}
                  {task.activityCount > 0 && (
                    <p className="mt-0.5 text-[11px] text-[#9ca3af]">
                      {task.activityCount} activity note{task.activityCount !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-[#374151]" title={task.staffName}>{task.staffName || "—"}</p>
                {task.department && <p className="truncate text-[11px] text-[#9ca3af]">{task.department}</p>}
              </div>
              <span className={`hidden truncate sm:block ${task.overdue ? "text-red-500" : "text-[#6b7280]"}`}>{task.dueDate || "—"}</span>
              <span>
                <span className={`inline-block max-w-full truncate rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusClass(task.status)}`}>
                  {task.status}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
      <ListPager loaded={tasks.length} meta={meta} paging={paging} noun="tasks" onSendMessage={onSendMessage} />
    </div>
  );
}
