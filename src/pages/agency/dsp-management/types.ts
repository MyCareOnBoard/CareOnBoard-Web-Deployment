// Types
export interface DSP {
  id: string;
  fullName: string;
  role: string;
  age?: number;
  status: "Active" | "Deactivated";
  email: string;
  phone?: string;
  address?: string;
  joiningDate: string;
  professionalSummary: string;
  profileImage?: string;
  gender?: "Male" | "Female" | "Other" | string;
}

export interface Shift {
  id: string;
  clientName: string;
  clientImage?: string;
  date: string;
  location: string;
  clockIn: string;
  clockOut: string;
  duration: string;
}

export interface Document {
  id: string;
  name: string;
  status: "Available" | "Draft" | "Pending";
}

export interface Client {
  id: string;
  name: string;
  profileImage?: string;
}

export interface ScheduleForm {
  client: Client | null;
  service: string;
  serviceCode: string;
  schedulingType: "One time" | "Recurring";
  date: string;
  clockInTime: string;
  clockOutTime: string;
  planOfCare: File | null;
}

export interface DSPListItem extends DSP {
  clients: number;
  training: string;
}
