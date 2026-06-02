export type PlanOfCareStatus = "active" | "inactive" | "archived" | string;

export interface Plan {
  autoReminder: boolean;
  fileName: string;
  title: string;
  url: string;
  issuedOnDate?: string | null;
  expiryDate?: string | null;
}

export interface PlanOfCare {
  id: string;
  agencyId: string;
  clientId: string;
  clientName: string;
  clientFirstName?: string | null;
  clientLastName?: string | null;
  clientImage?: string | null;
  date?: string | null;
  location?: string | null;
  service?: string | null;
  serviceCode?: string | null;
  serviceName?: string | null;
  ispOutcome?: string | null;
  goalsAndDocumentId?: string | null;
  goalsType?: string | null;
  planOfCare?: Plan | null;
  caregiverId?: string;
  content?: string;
  status?: PlanOfCareStatus;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanOfCareListResponse {
  success: boolean;
  data: PlanOfCare[];
  pagination?: {
    limit: number;
    offset: number;
    count: number;
    total?: number;
  };
}

export interface PlanOfCareResponse {
  success: boolean;
  data: PlanOfCare;
}
