import axiosClient from '@/lib/axios';

export type DocumentReviewItem = {
  reference: string; title: string; fileName: string | null; url: string | null;
  category: 'ISP' | 'Assessment' | 'Tier' | 'SDR' | 'PA' | 'Enrollment' | 'Other';
  intervalDays: number | null;
  status: 'disabled' | 'needs_first_review' | 'upcoming' | 'due_today' | 'overdue' | 'unavailable';
  lastReviewedAt: string | null; reviewedByName: string | null; nextReviewDueDate: string | null; revision: number;
};
export type DocumentReviewOverview = { enabled: boolean; remindersEnabled: boolean; timezone: string | null; items: DocumentReviewItem[] };
export type DocumentReviewEventPage = { items: Array<{ eventId: string; reviewedAt: string; reviewerName: string; revision: number }>; nextCursor: string | null };
type Envelope<T> = { success: boolean; data: T; error?: string };
const unwrap = <T>(response: Envelope<T>) => {
  if (!response.success) throw new Error(response.error || 'Document reviews are unavailable.');
  return response.data;
};
const path = (clientId: string, agencyView: boolean) => agencyView
  ? `/clientManagement/${encodeURIComponent(clientId)}/monitoring/document-reviews`
  : `/employeePortal/sc-monitoring/clients/${encodeURIComponent(clientId)}/document-reviews`;

export async function getDocumentReviews(clientId: string, agencyView = false, signal?: AbortSignal) {
  return unwrap((await axiosClient.get<Envelope<DocumentReviewOverview>>(path(clientId, agencyView), { signal })).data);
}
export async function markDocumentReviewed(clientId: string, reference: string, expectedRevision: number, signal?: AbortSignal) {
  return unwrap((await axiosClient.post<Envelope<DocumentReviewItem>>(`${path(clientId, false)}/${encodeURIComponent(reference)}/review`, { expectedRevision }, { signal })).data);
}
export async function getDocumentReviewEvents(clientId: string, reference: string, agencyView = false, cursor?: string, signal?: AbortSignal) {
  return unwrap((await axiosClient.get<Envelope<DocumentReviewEventPage>>(`${path(clientId, agencyView)}/${encodeURIComponent(reference)}/events`, { params: cursor ? { cursor } : undefined, signal })).data);
}
