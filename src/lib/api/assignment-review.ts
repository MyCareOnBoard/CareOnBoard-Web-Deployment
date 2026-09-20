import axiosClient from '@/lib/axios';

export type ReviewCoverage = 'complete' | 'partial' | 'restricted' | 'unavailable';
export type AssignmentReviewInput = {
  program: 'ddd' | 'hha'; kind: 'shift' | 'caregiver_link' | 'service_roster'; employeeId: string;
  serviceRowKey?: string; date?: string; startTime?: string; endTime?: string;
  serviceCode?: string; serviceAuthorizationId?: string; serviceAuthStartDate?: string; serviceAuthEndDate?: string;
  startDate?: string; assignmentEndDate?: string; cprRequired?: boolean | null;
};
export type AssignmentReview = {
  version: 1; evaluatedAt: string; agencyDate: string | null; timezone: string | null;
  context: {
    agencyId: string; clientId: string; employeeId: string; program: 'ddd' | 'hha';
    cprRequired?: boolean | null;
    kind: AssignmentReviewInput['kind']; serviceRowKey: string | null;
    startDate: string | null; endDate: string | null; startTime: string | null; endTime: string | null;
    dateCoverage: 'period' | 'start_only' | 'as_of_today' | 'unavailable';
  };
  cpr?: {state:string;reasonCode:string;validUntilDate:string|null;coverage:string};
  state: 'information' | 'attention' | 'unavailable';
  coverage: {clientDocuments: ReviewCoverage; employeeTraining: ReviewCoverage};
  findings: Array<{code: string; category: 'client_document' | 'training' | 'coverage'; severity: 'advisory' | 'info'; reasonCode: string; subjectId?: string; evidence?: {kind: 'client_documents' | 'employee_training'; id: string}; dates?: {expiryDate?: string; serviceDate?: string}}>;
  documents?: Array<{key: string; status: string; count: number; expiredCount: number; dateReviewCount: number; futureExpiryCount: number}>;
  training?: {reviewedCount: number; hasMore: boolean; countsByDisplayedState: Record<string, number>; attentionItems: Array<{id: string; name: string; state: string}>};
  retryable: boolean;
};
export type AssignmentReviewEnvelope = {
  assignmentReviews: Record<string, AssignmentReview>; reviewedPairCount: number; unreviewedPairCount: number;
  assignmentReviewCoverage: 'complete' | 'partial' | 'unavailable';
};
export type ReviewSelection = {agencyId: string; clientId: string; input: AssignmentReviewInput; requestServiceRowKey?: string; expectedDates?: {startDate: string | null; endDate: string | null}};

export async function getAssignmentReview(selection: ReviewSelection, signal?: AbortSignal): Promise<AssignmentReview> {
  const response = await axiosClient.post<{success: boolean; data: AssignmentReview}>(
    `/clients/${encodeURIComponent(selection.clientId)}/assignment-review`, {...selection.input, ...(selection.requestServiceRowKey ? {serviceRowKey: selection.requestServiceRowKey} : {})},
    {params: {agencyId: selection.agencyId}, signal},
  );
  if (!response.data.success || !isAssignmentReview(response.data.data)) throw new Error('Assignment review unavailable');
  return response.data.data;
}

const count = (value: unknown) => Number.isInteger(value) && Number(value) >= 0;
export function isAssignmentReview(value: unknown): value is AssignmentReview {
  if (!value || typeof value !== 'object') return false;
  const review = value as AssignmentReview;
  const context = review.context;
  return review.version === 1 && typeof review.evaluatedAt === 'string' && Number.isFinite(Date.parse(review.evaluatedAt))
    && !!context && ['agencyId', 'clientId', 'employeeId'].every(key => typeof context[key as keyof typeof context] === 'string')
    && ['ddd', 'hha'].includes(context.program) && ['shift', 'caregiver_link', 'service_roster'].includes(context.kind)
    && ['startDate', 'endDate', 'startTime', 'endTime', 'serviceRowKey'].every(key => context[key as keyof typeof context] === null || typeof context[key as keyof typeof context] === 'string')
    && ['period', 'start_only', 'as_of_today', 'unavailable'].includes(context.dateCoverage)
    && ['information', 'attention', 'unavailable'].includes(review.state) && typeof review.retryable === 'boolean'
    && !!review.coverage && [review.coverage.clientDocuments, review.coverage.employeeTraining].every(item => ['complete', 'partial', 'restricted', 'unavailable'].includes(item))
    && Array.isArray(review.findings) && review.findings.every(item => item && typeof item.code === 'string' && typeof item.reasonCode === 'string' && ['client_document', 'training', 'coverage'].includes(item.category) && ['advisory', 'info'].includes(item.severity) && (item.subjectId === undefined || typeof item.subjectId === 'string'))
    && (review.documents === undefined || (Array.isArray(review.documents) && review.documents.length <= 7 && review.documents.every(item => item && typeof item.key === 'string' && typeof item.status === 'string' && [item.count, item.expiredCount, item.dateReviewCount, item.futureExpiryCount].every(count))))
    && (review.training === undefined || (!!review.training && count(review.training.reviewedCount) && review.training.reviewedCount <= 25 && typeof review.training.hasMore === 'boolean'
      && !!review.training.countsByDisplayedState && typeof review.training.countsByDisplayedState === 'object' && !Array.isArray(review.training.countsByDisplayedState) && Object.values(review.training.countsByDisplayedState).every(count)
      && Array.isArray(review.training.attentionItems) && review.training.attentionItems.length <= 5 && review.training.attentionItems.every(item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.state === 'string')));
}

/** Optional response metadata must never turn an already committed save into an error. */
export function assignmentReviewMetadata(value: Partial<AssignmentReviewEnvelope>): AssignmentReviewEnvelope | undefined {
  if (!value.assignmentReviews || typeof value.assignmentReviews !== 'object' || Array.isArray(value.assignmentReviews)
    || !Number.isInteger(value.reviewedPairCount) || !Number.isInteger(value.unreviewedPairCount)
    || (value.reviewedPairCount ?? -1) < 0 || (value.unreviewedPairCount ?? -1) < 0
    || !['complete', 'partial', 'unavailable'].includes(value.assignmentReviewCoverage ?? '')
    || Object.values(value.assignmentReviews).some(review => !isAssignmentReview(review))) return undefined;
  return {assignmentReviews: value.assignmentReviews, reviewedPairCount: value.reviewedPairCount!, unreviewedPairCount: value.unreviewedPairCount!, assignmentReviewCoverage: value.assignmentReviewCoverage!};
}

export function assignmentSaveMessage(metadata: AssignmentReviewEnvelope | undefined, assignmentChanged: boolean, client = false): string | undefined {
  if (!assignmentChanged) return undefined;
  const subject = client ? 'Client saved.' : 'Assignment saved.';
  if (!metadata || metadata.assignmentReviewCoverage === 'unavailable') return `${subject} Some records could not be checked.`;
  if (metadata.unreviewedPairCount > 0) return `${client ? 'Client' : 'Assignments'} saved. Some assignments were not reviewed.`;
  if (Object.values(metadata.assignmentReviews).some(review => review.retryable || Object.values(review.coverage).includes('unavailable'))) return `${subject} Some records could not be checked.`;
  if (Object.values(metadata.assignmentReviews).some(review => Object.values(review.coverage).includes('restricted'))) return `${subject} Ask your agency administrator to review restricted records.`;
  if (Object.values(metadata.assignmentReviews).some(review => review.training?.hasMore)) return `${subject} More training records are available to review.`;
  if (Object.values(metadata.assignmentReviews).some(review => review.state === 'attention')) return `${subject} Review recommended for the records on file.`;
  return undefined;
}

export function assignmentServiceRowKey(row: {id?: string; code?: string; serviceCode?: string; startAuthDate?: unknown; endAuthDate?: unknown; sdrStartDate?: unknown; sdrEndDate?: unknown; startDate?: unknown; endDate?: unknown}, program: 'ddd' | 'hha'): string | null {
  if (row.id?.trim()) return row.id.trim();
  const civil = (value: unknown): string | null | undefined => !value ? null : value instanceof Date && Number.isFinite(value.getTime()) ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}` : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value) ? value.slice(0, 10) : undefined;
  const dates = program === 'hha' ? [row.startDate, row.endDate] : row.startAuthDate ? [row.startAuthDate, row.endAuthDate] : [row.sdrStartDate, row.sdrEndDate];
  const normalized = dates.map(civil);
  if (normalized.includes(undefined)) return null;
  return JSON.stringify([program, (row.code || row.serviceCode)?.trim().toLowerCase() || null, ...normalized]);
}
