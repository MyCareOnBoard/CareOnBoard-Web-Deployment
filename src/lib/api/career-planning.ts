export type CareerPlanContent = {
  periodStart: string;
  periodEnd: string;
  interests: string;
  strengthsAndSupportNeeds: string;
  goals: Array<{
    id: string;
    statement: string;
    steps: string;
    staffSupport: string;
    progressDescription: string;
  }>;
  contributors: Array<{ name: string; role: string }>;
  individualInvolvement: string;
  sourceReferences: Array<{ kind: 'isp' | 'pcpt'; reference: string }>;
  outcomeId: string | null;
};
export type CareerPlanDraft = Partial<Omit<CareerPlanContent, 'goals' | 'contributors'>> & {
  goals?: Array<{ id: string } & Partial<CareerPlanContent['goals'][number]>>;
  contributors?: Array<Partial<CareerPlanContent['contributors'][number]>>;
};
export type CareerSource = { kind: 'isp' | 'pcpt'; reference: string; label: string; available?: boolean };
export type CareerRevisionSummary = {
  id: string;
  revisionNumber: number;
  periodStart: string;
  periodEnd: string;
  publishedAt: string;
  changeReason?: string;
};
export type CareerRevision = Omit<CareerRevisionSummary, 'periodStart' | 'periodEnd'> & {
  content: CareerPlanContent;
  sources?: CareerSource[];
  publishedByName?: string;
};
export type CareerPlanSummary = {
  id: string;
  agencyId: string;
  clientId: string;
  serviceAuthorizationId: string;
  version: number;
  hasDraft: boolean;
  publishedRevisionId: string | null;
  revisionNumber: number;
  publishedSummary?: null | { periodStart: string; periodEnd: string; publishedAt: string };
  clientName?: string;
};
export type CareerPlanDetail = CareerPlanSummary & {
  draft?: CareerPlanDraft | null;
  publishedRevision?: CareerRevision | null;
  canManage?: boolean;
};
export type CareerPlanScope = {
  agencyId?: string;
  clientId?: string;
  serviceAuthorizationId?: string;
  cursor?: string;
  limit?: number;
};
export type CareerPlanList = {
  items: CareerPlanSummary[];
  nextCursor: string | null;
  authorizationChoices?: Array<{
    id: string;
    label: string;
    startDate?: string;
    endDate?: string;
    outcomeId?: string;
  }>;
  sourceChoices?: CareerSource[];
  outcomeChoices?: Array<{ id: string; label: string }>;
  canManage?: boolean;
};
export type CareerRowMetadata = {
  serviceDate: string;
  goalIds: string[];
  location: string;
  supportProvided: string;
  responseAndProgress: string;
  recordedUnits: number;
};
export type CareerRow = {
  id: string;
  contentVersion: number;
  startDate: string;
  endDate: string;
  metadata: Partial<CareerRowMetadata>;
  status?: 'active' | 'submitted' | 'approved';
};
export type CareerSelection = {
  careerPlanId: string;
  careerPlanRevisionId: string;
  planSelectionVersion: number;
};
export type CareerContext = {
  selection:
    | (Omit<CareerSelection, 'careerPlanId' | 'careerPlanRevisionId'> & {
        careerPlanId: string | null;
        careerPlanRevisionId: string | null;
      })
    | null;
  suggestedRevisionId?: string | null;
  revision?: CareerRevision | null;
  canChangeRevision: boolean;
  reasonCode?: string | null;
  serviceDates: string[];
  timezone: string;
  revisionChoices?: CareerPage<CareerRevisionSummary>;
};
export type CareerContent = {
  context: {
    clientName: string;
    employeeName: string;
    serviceCode: string;
    serviceAuthorizationId: string;
    agencyId: string;
    clientId: string;
    employeeId: string;
    activityLogId: string;
    shiftId: string;
  };
  selection: CareerSelection;
  rows: CareerRow[];
};
export type CareerSnapshot = CareerContent & { revision: CareerRevision };
export type CareerPreview = {
  revision: CareerRevision;
  content: CareerContent;
  attestation: string;
  previewHash: string;
  rowVersions: Array<{ id: string; contentVersion: number }>;
  planSelectionVersion: number;
  attestationVersion: 1;
};
export type CareerSignIntent = Omit<CareerPreview, 'content' | 'attestation' | 'revision'> & {
  attested: true;
};
export type CareerSignatureHeader = {
  id: string;
  signedAt: string;
  employeeName: string;
  selection: CareerSelection;
  actorId: string;
  attestationVersion: 1;
  attestation: string;
  context: CareerContent['context'];
  activityLogId: string;
};
export type CareerSignatureSummary = Pick<
  CareerSignatureHeader,
  'id' | 'signedAt' | 'employeeName' | 'selection' | 'actorId' | 'attestationVersion' | 'activityLogId'
>;
export type CareerSignature = { id: string; signature: CareerSignatureHeader; snapshot: CareerSnapshot };
export type CareerPage<T> = { items: T[]; nextCursor: string | null };
export type CareerEnvelope<T> = { success: true; data: T };
export function careerError(error: unknown): {
  status?: number | string;
  message: string;
  fieldErrors?: Array<{ field?: string; path?: string; message?: string; noteId?: string; code?: string }>;
} {
  const e = error as {
    status?: number | string;
    data?: {
      error?: string;
      message?: string;
      fieldErrors?: Array<{
        field?: string;
        path?: string;
        message?: string;
        noteId?: string;
        code?: string;
      }>;
    };
  };
  return {
    status: e?.status,
    message:
      e?.data?.message ??
      e?.data?.error ??
      'Unable to complete this action. Your text is still here. Please try again.',
    fieldErrors: e?.data?.fieldErrors,
  };
}
export function careerUncertain(error: unknown) {
  const { status } = careerError(error);
  return typeof status !== 'number' || status >= 500 || status === 408 || status === 429;
}
