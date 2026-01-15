import axiosClient from "../axios";

export type GlobalNotesQualityStatsResponse = {
  success: boolean;
  totalNotes: number;
  requiredField: number;
  goalProgress: number;
  aiValidation: number;
  repeatedMissingNotes: number;
};

export type GlobalNotesQualityAgency = {
  id: string;
  name: string;
  logo?: string;
  notesCount: number;
  missingRequiredFields: number;
  poorGoalDocumentation: number;
  aiValidation: number;
};

export type GlobalNotesQualityAgenciesResponse = {
  success: boolean;
  agencies: GlobalNotesQualityAgency[];
};

export type GlobalNotesQualityUser = {
  id: string;
  fullName?: string;
  profilePictureUrl?: string;
  notesCount: number;
  missingRequiredFields: number;
  poorGoalDocumentation: number;
  aiValidation: number;
};

export type GlobalNotesQualityUsersResponse = {
  success: boolean;
  employees: GlobalNotesQualityUser[];
};

export async function getGlobalNotesQualityStats(): Promise<GlobalNotesQualityStatsResponse> {
  const response = await axiosClient.get<GlobalNotesQualityStatsResponse>(
    "/agencyManagement/global-notes-quality/stats",
  );
  return response.data;
}

export async function listGlobalNotesQualityAgencies(): Promise<GlobalNotesQualityAgenciesResponse> {
  const response = await axiosClient.get<GlobalNotesQualityAgenciesResponse>(
    "/agencyManagement/global-notes-quality/agencies",
  );
  return response.data;
}

export async function listGlobalNotesQualityUsers(): Promise<GlobalNotesQualityUsersResponse> {
  const response = await axiosClient.get<GlobalNotesQualityUsersResponse>(
    "/agencyManagement/global-notes-quality/users",
  );
  return response.data;
}
