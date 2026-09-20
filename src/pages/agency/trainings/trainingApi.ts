import {createApi} from '@reduxjs/toolkit/query/react';
import {customBaseQuery} from '@/lib/baseQuery';

interface GetEmployeesNonPaginatedResponseItem { fullName: string; email: string; id: string; }
export interface TrainingCertificateSummary {id: string; fileName: string; completedOnDate: string; printedExpiryDate: string | null;}
export interface TrainingData {
    policyProgram?: 'ddd' | 'hha' | null; policyContextState?: 'current' | 'updating' | 'unsupported';
    deadlineType?: 'before_work' | 'days_from_hire' | null; deadlineDays?: number | null;
    policySource?: string | null; evidenceCriteria?: string | null;
    policyVersion?: number; requirementId?: string; reviewRevision?: number; reviewState?: string; reviewReason?: string | null;
    validityState?: string; deadlineState?: string; applicabilityState?: string; reasonCode?: string;
    dueDateKey?: string | null; effectiveExpiryDateKey?: string | null; renewalOpensDateKey?: string | null;
    acceptedCertificate?: TrainingCertificateSummary | null; latestCertificate?: TrainingCertificateSummary | null;
    evidenceStatus?: 'accepted' | 'legacy' | 'needs_review' | 'not_applicable';
    id?: string; name: string; timeFrame: string; assignedDsp: string; trainingType: string;
    completedAt: string | null; status: string; approved: boolean; source?: 'manual' | 'policy';
    requiresCertificate?: boolean; certificateId?: string | null; certificateName?: string | null;
}
export interface TrainingStaff { id: string; fullName: string; profilePictureUrl: string; status: string; assignedCount: number; }
export interface TrainingStaffPage { items: TrainingStaff[]; nextCursor: string | null; }
export interface TrainingSummary { assigned: number; manualCompleted: number; policyAwaitingReview: number; policyAccepted: number; policyAssessmentComplete?: boolean; }
export interface TrainingPage { evaluatedAt?: string; items: TrainingData[]; nextCursor: string | null; summary: TrainingSummary | null; localDate: string | null; }
export interface TrainingStaffQuery { scopeKey?: string; workspace?: boolean; agencyId: string; search?: string; limit?: number; cursor?: string; mode?: string; }
export interface EmployeeTrainingQuery { scopeKey?: string; workspace?: boolean; employeeId?: string; agencyId?: string; limit?: number; cursor?: string; mode?: string; }

export const employeeTrainingsApi = createApi({
    reducerPath: 'employeeTrainingsApi', baseQuery: customBaseQuery,
    tagTypes: ['TrainingStaff', 'EmployeeTrainings'], keepUnusedDataFor: 300,
    endpoints: builder => ({
        getEmployeesNonPaginated: builder.query<GetEmployeesNonPaginatedResponseItem[], string>({
            query: agencyId => ({url: `/employees/all?agencyId=${agencyId}`, method: 'GET', requiresAuth: true}),
        }),
        saveTraining: builder.mutation<void, {agencyId: string; trainingData: Pick<TrainingData, 'name' | 'timeFrame' | 'assignedDsp' | 'trainingType'>}>({
            query: ({trainingData, agencyId}) => ({url: '/agencies/trainings', method: 'POST', data: {...trainingData, agencyId}, requiresAuth: true}),
            invalidatesTags: (_result, _error, {trainingData}) => [{type: 'TrainingStaff', id: 'LIST'}, {type: 'EmployeeTrainings', id: trainingData.assignedDsp}],
        }),
        getTrainings: builder.query<TrainingStaffPage, TrainingStaffQuery>({
            query: ({scopeKey: _scopeKey, agencyId, ...params}) => ({url: '/agencies/trainings', method: 'GET', params: {...params, agencyId}, requiresAuth: true}),
            providesTags: [{type: 'TrainingStaff', id: 'LIST'}],
        }),
        getEmployeeTrainings: builder.query<TrainingPage, EmployeeTrainingQuery>({
            query: ({scopeKey: _scopeKey, ...params}) => ({url: '/employees/trainings', method: 'GET', params, requiresAuth: true}),
            providesTags: (_result, _error, {employeeId}) => [{type: 'EmployeeTrainings', id: employeeId ?? 'SELF'}],
        }),
        policyEvidence: builder.mutation<unknown, {trainingId: string; employeeId: string; action: 'review' | 'link-evidence' | 'revoke-evidence'; data: Record<string, unknown>}>({
            query: ({trainingId, action, data}) => ({url: '/agencies/trainings/' + trainingId + '/' + action, method: 'POST', data, requiresAuth: true}),
            invalidatesTags: (_result, _error, {employeeId}) => [{type: 'EmployeeTrainings', id: employeeId}, {type: 'TrainingStaff', id: 'LIST'}],
        }),
        approveTraining: builder.mutation<void, {agencyId: string; employeeId: string; trainingId: string; approved: boolean; certificateId?: string}>({
            query: ({trainingId, approved, certificateId}) => ({url: `/agencies/trainings/${trainingId}/approve`, method: 'PATCH', data: {approved, ...(certificateId ? {certificateId} : {})}, requiresAuth: true}),
            invalidatesTags: (_result, _error, {employeeId}) => [{type: 'EmployeeTrainings', id: employeeId}, {type: 'TrainingStaff', id: 'LIST'}],
        }),
    }),
});
export const {useGetEmployeesNonPaginatedQuery, useSaveTrainingMutation, useGetTrainingsQuery, useLazyGetEmployeeTrainingsQuery, useGetEmployeeTrainingsQuery, useApproveTrainingMutation, usePolicyEvidenceMutation} = employeeTrainingsApi;
