import axiosClient from '@/lib/axios';

export type NeedsScope = {clientId: string; agencyId: string; program: 'ddd' | 'hha'};
export type NeedsAnswer = 'yes' | 'no' | 'unknown';
export type NeedsAnswers = {
  medicationSupport: NeedsAnswer; medicationSupportDescription: string | null;
  medicalAcuity: NeedsAnswer; behavioralAcuity: NeedsAnswer;
  aenfApplicability: 'required' | 'not_required' | 'unknown'; aenfBasis: string | null;
};
export type AenfReview = {revision: number; needsRevision: number; fingerprint: string; result: 'verified' | 'not_verified'; basis: string; reviewerUid: string; reviewedAt: string | null};
export type NeedsDTO = {state: 'unavailable'; canEdit: false} | {
  state: 'ready'; answers: NeedsAnswers; revision: number; updatedBy: string | null; updatedAt: string | null; canEdit: boolean;
  aenf: {acuityFingerprint?: string; state: 'applicability_not_recorded' | 'not_required' | 'missing' | 'on_file' | 'verified' | 'not_verified' | 'needs_review'; count: number; reviewRevision: number; reasonCode?: string; review?: AenfReview};
};
export type NeedsInput = NeedsAnswers & {expectedRevision: number};
export type AenfReviewInput = {expectedAcuityFingerprint?: string | null; expectedNeedsRevision: number; expectedReviewRevision: number; result: 'verified' | 'not_verified'; basis: string; document: {url: string; issuedOnDate: string | null; expiryDate: string | null}};
const path = (scope: NeedsScope) => `/clients/${encodeURIComponent(scope.clientId)}/assignment-needs`;
const params = ({agencyId, program}: NeedsScope) => ({agencyId, program});
export async function getClientNeeds(scope: NeedsScope, signal?: AbortSignal): Promise<NeedsDTO> {
  const response = await axiosClient.get<{success: boolean; data: NeedsDTO}>(path(scope), {params: params(scope), signal});
  if (!response.data.success) throw new Error('Records unavailable.');
  return response.data.data;
}
export async function saveClientNeeds(scope: NeedsScope, input: NeedsInput): Promise<NeedsDTO> {
  const response = await axiosClient.put<{success: boolean; data: NeedsDTO}>(path(scope), input, {params: params(scope)});
  if (!response.data.success) throw new Error('Needs could not be saved.');
  return response.data.data;
}
export async function reviewClientAenf(scope: NeedsScope, input: AenfReviewInput): Promise<NeedsDTO> {
  const response = await axiosClient.put<{success: boolean; data: NeedsDTO}>(`${path(scope)}/aenf-review`, input, {params: params(scope)});
  if (!response.data.success) throw new Error('Review could not be saved.');
  return response.data.data;
}

export type CompetencyKey = 'medication_support' | 'medical_acuity' | 'behavioral_acuity';
export type CompetencyReview = {revision: number; needsRevision: number; result: 'verified' | 'not_verified'; basis: string; reviewerUid: string; reviewedAt: string | null; trainingId?: string | null; certificateId?: string | null; validUntil?: string | null};
export type CompetencyItem = {requirementKey: CompetencyKey; state: 'needs_not_recorded' | 'not_required' | 'not_recorded' | 'verified' | 'not_verified' | 'needs_review'; reviewRevision: number; reasonCode?: string; review?: CompetencyReview};
export type CompetencyDTO = {coverage: 'restricted' | 'unavailable'; canVerify: false} | {coverage: 'complete'; canVerify: boolean; needsRevision: number; items: CompetencyItem[]};
export type CompetencyInput = {expectedNeedsRevision: number; expectedReviewRevision: number; result: 'verified' | 'not_verified'; basis: string; trainingId?: string; certificateId?: string; validUntil?: string};
const competencyPath = (scope: NeedsScope, employeeId: string) => `/clients/${encodeURIComponent(scope.clientId)}/competency-reviews/${encodeURIComponent(employeeId)}`;
export async function getClientCompetencies(scope: NeedsScope, employeeId: string, signal?: AbortSignal): Promise<CompetencyDTO> {
  const response = await axiosClient.get<{success: boolean; data: CompetencyDTO}>(competencyPath(scope, employeeId), {params: params(scope), signal});
  if (!response.data.success) throw new Error('Competency records unavailable.');
  return response.data.data;
}
export async function saveClientCompetency(scope: NeedsScope, employeeId: string, key: CompetencyKey, input: CompetencyInput): Promise<{needsRevision: number; item: CompetencyItem}> {
  const response = await axiosClient.put<{success: boolean; data: {needsRevision: number; item: CompetencyItem}}>(`${competencyPath(scope, employeeId)}/${key}`, input, {params: params(scope)});
  if (!response.data.success) throw new Error('Verification could not be saved.');
  return response.data.data;
}
