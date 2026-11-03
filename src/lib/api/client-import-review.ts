import axiosClient from "../axios";

/** Sent with POST /clients when the client was created straight from a folder upload. */
export type ClientImportReviewInput = { source: "folder_upload"; folderName?: string; notes?: string[] };

export type ClientImportReviewRow = {
  id: string;
  name: string;
  type: "ddd" | "hha" | null;
  servicePrograms: Array<"ddd" | "hha" | "sc">;
  status: string;
  folderName: string;
  notes: string[];
  importedAt: string | null;
};

type Envelope<T> = { success: boolean; data: T };

/** Folder-imported clients of the caller's agency that nobody has reviewed yet. */
export async function listClientImportReviews(signal?: AbortSignal): Promise<{ clients: ClientImportReviewRow[]; truncated: boolean }> {
  const response = await axiosClient.get<Envelope<{ clients: ClientImportReviewRow[]; truncated: boolean }>>("/clientManagement/import-reviews", { signal });
  return response.data.data;
}

/** One in-app notification asking the caller to review the batch. */
export async function notifyClientImportReview(clientIds: string[], folderName?: string): Promise<{ notified: boolean; count: number }> {
  const response = await axiosClient.post<Envelope<{ notified: boolean; count: number }>>("/clientManagement/import-reviews/notify", { clientIds, folderName });
  return response.data.data;
}

export async function completeClientImportReview(clientId: string): Promise<void> {
  await axiosClient.post(`/clientManagement/${encodeURIComponent(clientId)}/import-review/complete`);
}
