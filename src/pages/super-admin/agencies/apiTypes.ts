import {
  CreateAgencyWithUserPayloadAgency,
  CreateAgencyWithUserPayloadUser
} from "@/pages/super-admin/agencies/api";


export interface ListDraftAgenciesResponse {
  success: boolean;
  data: {
    id: string;
    draftName: string;
    createdAt: string;
    updatedAt: string;
  }[];
}

export interface GetDraftAgencyResponse {
  name?: string;
  agencyData: CreateAgencyWithUserPayloadAgency;
  user: CreateAgencyWithUserPayloadUser;
  createdAt: string;
  updatedAt: string;
}

export interface GetSummaryAgencyInfoResponse {
  user: CreateAgencyWithUserPayloadUser;
  agencyData: {
    name: string;
    id: string;
    logo: string;
    primaryColor: string;
    status: string;
  };
}

export interface GetSingleAgencyUsersItem {
  id: string;
  employees?: number;
  createdAt?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  status?: string;
  clients?: number;
  hireDate?: string;
  profilePictureUrl?: string;
  training?: {
    total?: string;
    completed?: string;
  }
}