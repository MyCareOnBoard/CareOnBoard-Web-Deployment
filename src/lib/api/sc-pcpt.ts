import axiosClient from "@/lib/axios";

export type PcptContent = {
  relationships: { role: string; name: string; notes: string }[];
  achievements: string; likesAboutSelf: string; othersLike: string; doesWell: string;
  dislikes: string; people: string; routines: string; pets: string;
  longTermHopes: string; shortTermHopes: string;
  idealSupporter: string; communityInteraction: string; communityExperience: string;
  employmentStatus: string; hasResume: boolean; appliedForJobs: boolean; hasSkills: boolean; knowsJobType: boolean;
  employmentNotes: string; communicationStyles: string; ideas: string;
};

export type PcptPlan = { content: PcptContent; status: "draft" | "submitted" | "approved" | "changes_requested"; updatedAt: string; submittedBy?: string; reviewedAt?: string; reviewNote?: string };

export async function getPcpt(clientId: string, signal?: AbortSignal) {
  const response = await axiosClient.get<{ data: { plan: PcptPlan | null; canEdit: boolean; canReview: boolean } }>(`/clientManagement/${encodeURIComponent(clientId)}/pcpt`, { signal });
  return response.data.data;
}
export async function savePcpt(clientId: string, content: PcptContent, submit = false) {
  const path = `/clientManagement/${encodeURIComponent(clientId)}/pcpt`;
  const response = submit
    ? await axiosClient.post<{ data: PcptPlan }>(`${path}/submit`, { content })
    : await axiosClient.put<{ data: PcptPlan }>(path, { content });
  return response.data.data;
}
export async function reviewPcpt(clientId: string, decision: "approved" | "changes_requested", note: string) {
  const response = await axiosClient.post<{ data: PcptPlan }>(`/clientManagement/${encodeURIComponent(clientId)}/pcpt/review`, { decision, note });
  return response.data.data;
}
