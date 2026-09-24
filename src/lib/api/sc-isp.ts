import axiosClient from "@/lib/axios";

export type IspNarratives = { serviceDeliveryNotes: string; employmentNarrative: string; healthNotes: string };
export type IspPlan = { content: IspNarratives; status: "draft" | "submitted" | "approved" | "changes_requested"; updatedAt: string; submittedBy?: string; reviewedAt?: string; reviewNote?: string };

const path = (clientId: string) => `/clientManagement/${encodeURIComponent(clientId)}/isp`;

export async function getIsp(clientId: string, signal?: AbortSignal) {
  const response = await axiosClient.get<{ data: { plan: IspPlan | null; canEdit: boolean; canReview: boolean } }>(path(clientId), { signal });
  return response.data.data;
}
export async function saveIsp(clientId: string, content: IspNarratives, submit = false) {
  const response = submit
    ? await axiosClient.post<{ data: IspPlan }>(`${path(clientId)}/submit`, { content })
    : await axiosClient.put<{ data: IspPlan }>(path(clientId), { content });
  return response.data.data;
}
export async function reviewIsp(clientId: string, decision: "approved" | "changes_requested", note: string) {
  const response = await axiosClient.post<{ data: IspPlan }>(`${path(clientId)}/review`, { decision, note });
  return response.data.data;
}
