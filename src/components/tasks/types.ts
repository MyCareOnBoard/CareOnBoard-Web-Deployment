export type Department = {
  value: string;
  label: string;
};

export type StaffMember = {
  id: string;
  name: string;
  department: string;
  role: string;
};

export type TaskActivity = {
  id: string;
  description: string;
  createdAt: string;
};

export type StaffTask = {
  id: string;
  title: string;
  description: string;
  department: string;
  staffMember: string;
  dueDate: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Completed";
  activities: TaskActivity[];
};
