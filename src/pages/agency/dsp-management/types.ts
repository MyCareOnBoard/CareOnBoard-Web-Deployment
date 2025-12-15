// Types
export interface DSP {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  bio: string;
  dateOfBirth: string;
  workAvailability: boolean;
  hireDate: string;
  profilePicture: string;
  tagId: string;
  role: string;
  address: string;
  phoneNumber: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  status?: "active" | "inactive" | "pending" | "suspended";
  createdAt?: string;
  updatedAt?: string;
  // Computed fields for UI
  age?: number;
  clients?: number;
  completedTrainings?: number;
  totalTrainings?: number;
}

export interface DSPShift {
  id: string;
  employeeId: string;
  clientId: string;
  clientName: string;
  clientImage?: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  duration: string;
  status: string;
  clockedInAt?: string;
  clockedOutAt?: string;
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
  employeeId?: string;
  service?: string;
  serviceCode?: string;
  schedulingType?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  clockInTime?: string;
  clockOutTime?: string;
  notes?: string;
  planOfCare: File | null;
}
