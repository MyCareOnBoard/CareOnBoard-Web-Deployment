export type PlanOfCareStatus = "active" | "inactive" | "archived" | string;

export interface PlanOfCare {
  id: string;
  agencyId: string;
  caregiverId: string;
  clientId: string;
  clientName: string;
  date: string;
  location: string;
  service: string;
  content: string;
  status: PlanOfCareStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanOfCareListResponse {
  success: boolean;
  data: PlanOfCare[];
  pagination?: {
    limit: number;
    offset: number;
    count: number;
  };
}

export interface PlanOfCareResponse {
  success: boolean;
  data: PlanOfCare;
}
