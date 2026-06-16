import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DepartmentSelect from "./DepartmentSelect";
import StaffSelect from "./StaffSelect";
import type { Department, StaffMember, StaffTask } from "./types";

interface EditTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: StaffTask | null;
  departments: Department[];
  staff: StaffMember[];
  onUpdateTask: (
    taskId: string,
    data: Partial<Omit<StaffTask, "id" | "activities">>
  ) => Promise<void>;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  open,
  onOpenChange,
  task,
  departments,
  staff,
  onUpdateTask,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [staffMember, setStaffMember] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [status, setStatus] = useState<"Open" | "In Progress" | "Completed">("Open");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setDepartment(task.department);
      setStaffMember(task.staffMember);
      setDueDate(task.dueDate);
      setPriority(task.priority);
      setStatus(task.status);
    }
  }, [task]);

  const handleSave = async () => {
    if (!task || !title.trim()) return;
    setIsSaving(true);
    try {
      await onUpdateTask(task.id, {
        title: title.trim(),
        description: description.trim(),
        department,
        staffMember,
        dueDate,
        priority,
        status,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[720px] p-[20px] backdrop-blur bg-white border border-[rgba(255,255,255,0.3)] rounded-[30px] flex flex-col gap-[18px]"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between w-full h-[44px] shrink-0">
          <DialogTitle className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
            Edit Task
            <p className="text-sm text-slate-600">Update the task details below.</p>
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="flex items-center justify-center p-[8px] rounded-[200px] bg-[#eff2f3] backdrop-blur-sm border border-[rgba(255,255,255,0.3)] hover:bg-[#e0e3e4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4 text-[#10141a]" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <StaffSelect value={staffMember} onChange={setStaffMember} staff={staff} />
            </div>
            <div className="space-y-2">
              <DepartmentSelect value={department} onChange={setDepartment} departments={departments} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Task title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short title" />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Due date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Priority</label>
              <select
                className="flex h-11 w-full min-w-0 rounded-xl border border-[#cccccd] bg-white px-4 py-0 text-sm font-normal leading-[1.4] text-[#10141a] outline-none transition-colors duration-200 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25"
                value={priority}
                onChange={(e) => setPriority(e.target.value as "High" | "Medium" | "Low")}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Status</label>
              <select
                className="flex h-11 w-full min-w-0 rounded-xl border border-[#cccccd] bg-white px-4 py-0 text-sm font-normal leading-[1.4] text-[#10141a] outline-none transition-colors duration-200 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25"
                value={status}
                onChange={(e) => setStatus(e.target.value as "Open" | "In Progress" | "Completed")}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditTaskModal;
