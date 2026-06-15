import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DepartmentSelect from "./DepartmentSelect";
import StaffSelect from "./StaffSelect";
import type { Department, StaffMember } from "./types";

interface TaskAssignmentFormProps {
  departments: Department[];
  staff: StaffMember[];
  onAssign: (task: {
    title: string;
    description: string;
    department: string;
    staffMember: string;
    dueDate: string;
    priority: "High" | "Medium" | "Low";
  }) => void;
}

const TaskAssignmentForm: React.FC<TaskAssignmentFormProps> = ({
  departments,
  staff,
  onAssign,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [staffMember, setStaffMember] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium");

  const availableStaff = useMemo(
    () =>
      department
        ? staff.filter((member) => member.department === department)
        : staff,
    [department, staff]
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title.trim() || !department || !staffMember || !dueDate) {
      return;
    }

    onAssign({
      title: title.trim(),
      description: description.trim(),
      department,
      staffMember,
      dueDate,
      priority,
    });

    setTitle("");
    setDescription("");
    setDepartment("");
    setStaffMember("");
    setDueDate("");
    setPriority("Medium");
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Task title</label>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Enter task title"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Description</label>
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Add a short description"
          rows={4}
        />
      </div>

      <DepartmentSelect
        value={department}
        onChange={setDepartment}
        departments={departments}
        placeholder="Select department"
      />

      <StaffSelect
        value={staffMember}
        onChange={setStaffMember}
        staff={availableStaff}
        placeholder="Select staff member"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Due date</label>
          <Input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Priority</label>
          <select
            className="flex h-11 w-full min-w-0 rounded-xl border border-[#cccccd] bg-white px-4 py-0 text-sm font-normal leading-[1.4] text-[#10141a] outline-none transition-colors duration-200 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25"
            value={priority}
            onChange={(event) => setPriority(event.target.value as "High" | "Medium" | "Low")}
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      <Button type="submit" className="w-full">
        Assign task
      </Button>
    </form>
  );
};

export default TaskAssignmentForm;
