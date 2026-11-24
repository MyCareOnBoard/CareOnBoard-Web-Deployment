import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown, ListChecks, Loader2, UserRound, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AgencySegmented, agencyField, agencyOutlineButton, agencyPrimaryButton } from "@/components/agency/AgencyListKit";
import { cn } from "@/lib/utils";
import type { Department, StaffMember, StaffTask } from "@/components/tasks/types";

export type TaskFormValues = {
  title: string;
  description: string;
  department: string;
  staffMember: string;
  dueDate: string;
  priority: StaffTask["priority"];
  status: StaffTask["status"];
};

const EMPTY: TaskFormValues = { title: "", description: "", department: "", staffMember: "", dueDate: "", priority: "Medium", status: "Open" };

const label = "mb-1.5 block text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]";

/**
 * Add or edit a task. Editing also shows the status. Errors from the server keep the dialog
 * open with the message, so nothing typed is lost.
 */
export default function TaskFormDialog({ open, onOpenChange, task, departments, staff, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The task being edited; null to add a new one. */
  task: StaffTask | null;
  departments: Department[];
  staff: StaffMember[];
  onSubmit: (values: TaskFormValues) => Promise<void>;
}) {
  const editing = !!task;
  const [values, setValues] = useState<TaskFormValues>(EMPTY);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValues(task ? {
      title: task.title, description: task.description, department: task.department, staffMember: task.staffMember,
      dueDate: task.dueDate, priority: task.priority, status: task.status,
    } : EMPTY);
    setTriedSubmit(false);
    setError(null);
  }, [open, task]);

  const set = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) => setValues((prev) => ({ ...prev, [key]: value }));
  const titleMissing = !values.title.trim();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTriedSubmit(true);
    if (titleMissing) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ ...values, title: values.title.trim(), description: values.description.trim() });
      onOpenChange(false);
    } catch (err: unknown) {
      const message = (err as { data?: { message?: string }; message?: string })?.data?.message || (err as Error)?.message;
      setError(message || `The task could not be ${editing ? "saved" : "created"}. Try again.`);
    } finally {
      setSaving(false);
    }
  };

  const close = () => { if (!saving) onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-32px)] max-w-[600px] gap-0 rounded-[20px] p-0">
        <form onSubmit={(e) => void submit(e)} noValidate>
          <div className="flex items-start gap-3.5 border-b border-[#eceef0] px-5 py-4 dark:border-white/10">
            <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#dcdfe2] text-[#007679] dark:border-white/15 dark:text-[#7fd3d3]">
              <ListChecks className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-[22px] font-medium leading-tight">{editing ? "Edit task" : "Add task"}</DialogTitle>
              <DialogDescription className="mt-0.5 text-[14px] leading-normal text-[#4b535b]">
                {editing ? "Change the details, assignee or status." : "Assign a follow-up to a staff member."}
              </DialogDescription>
            </div>
            <button type="button" onClick={close} disabled={saving} aria-label="Close"
              className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border border-[#dcdfe2] text-[#4b535b] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:opacity-50 dark:border-white/15 dark:text-[#c9d1d4]">
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[calc(100vh-220px)] space-y-4 overflow-y-auto px-5 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="task-assignee" className={label}>Assign to</label>
                <div className="relative">
                  <UserRound aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4b535b]" />
                  <select id="task-assignee" value={values.staffMember} onChange={(e) => set("staffMember", e.target.value)}
                    className={cn(agencyField, "h-11 cursor-pointer appearance-none pl-10 pr-9")}>
                    <option value="">Not assigned</option>
                    {staff.map((member) => <option key={member.id} value={member.id}>{member.name}{member.role ? ` · ${member.role}` : ""}</option>)}
                  </select>
                  <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4b535b]" />
                </div>
              </div>
              <div>
                <label htmlFor="task-department" className={label}>Department</label>
                <div className="relative">
                  <select id="task-department" value={values.department} onChange={(e) => set("department", e.target.value)}
                    className={cn(agencyField, "h-11 cursor-pointer appearance-none pr-9")}>
                    <option value="">No department</option>
                    {departments.map((department) => <option key={department.value} value={department.value}>{department.label}</option>)}
                  </select>
                  <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4b535b]" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="task-title" className={label}>Title</label>
              <input id="task-title" value={values.title} onChange={(e) => set("title", e.target.value)} maxLength={160}
                placeholder="e.g. Renew CPR card for James Taylor"
                aria-invalid={triedSubmit && titleMissing} aria-describedby={triedSubmit && titleMissing ? "task-title-error" : undefined}
                className={cn(agencyField, "h-11", triedSubmit && titleMissing && "border-[#e5484d] focus:border-[#e5484d] focus:ring-[#e5484d]/15")} />
              {triedSubmit && titleMissing && (
                <p id="task-title-error" className="mt-1.5 text-[13px] text-[#b42318] dark:text-[#f8a1a1]">Add a title so the assignee knows what to do.</p>
              )}
            </div>

            <div>
              <label htmlFor="task-description" className={label}>Description</label>
              <textarea id="task-description" rows={3} value={values.description} onChange={(e) => set("description", e.target.value)}
                className={cn(agencyField, "resize-y py-2.5")} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="task-due" className={label}>Due date</label>
                <input id="task-due" type="date" value={values.dueDate} onChange={(e) => set("dueDate", e.target.value)} className={cn(agencyField, "h-11")} />
              </div>
              <div>
                <span id="task-priority" className={label}>Priority</span>
                <AgencySegmented label="Priority" value={values.priority} onChange={(value) => set("priority", value)}
                  options={[{ value: "High", label: "High" }, { value: "Medium", label: "Medium" }, { value: "Low", label: "Low" }]}
                  className="w-fit" />
              </div>
            </div>

            {editing && (
              <div>
                <span className={label}>Status</span>
                <AgencySegmented label="Status" value={values.status} onChange={(value) => set("status", value)}
                  options={[{ value: "Open", label: "Open" }, { value: "In Progress", label: "In progress" }, { value: "Completed", label: "Completed" }]}
                  className="w-fit" />
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-[10px] border border-[#f5c2bd] bg-[#fdf3f2] px-3.5 py-2.5 text-[13px] text-[#b42318] dark:border-[#ef4444]/30 dark:bg-[#ef4444]/10 dark:text-[#f8a1a1]">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-2.5 border-t border-[#eceef0] px-5 py-4 dark:border-white/10">
            <button type="button" onClick={close} disabled={saving} className={agencyOutlineButton}>Cancel</button>
            <button type="submit" disabled={saving} className={agencyPrimaryButton}>
              {saving && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Create task"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
