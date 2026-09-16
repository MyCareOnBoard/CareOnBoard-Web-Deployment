import { complianceAlertsApi } from '@/pages/agency/compliance-alerts/api';
import {createApi} from "@reduxjs/toolkit/query/react";
import {customBaseQuery} from "@/lib/baseQuery";
import {
    UploadDocumentPayload,
    UploadDocumentResponse
} from "@/pages/applicant/application/types";
import {
    GetEmployeeDocumentsResponse,
    GetEmployeeInfoResponse,
    SaveEmployeeDocumentPayload, SaveEmployeeDocumentResponse, UpdateEmployeeInfoPayload
} from "@/pages/userPanel/dashboard/types";
import {EmployeeTrainingQuery, TrainingPage} from "@/pages/agency/trainings/trainingApi";

export const userPanelDashboardApi = createApi({
    reducerPath: "userPanelDashboardApi",
    baseQuery: customBaseQuery,
    tagTypes: ['EmployeeDocuments', 'EmployeeInfo', 'EmployeeTrainings'],
    keepUnusedDataFor: 300,
    endpoints: (builder) => ({
        getEmployeeDocuments: builder.query<GetEmployeeDocumentsResponse[], void>({
            query: () => ({
                url: `/documents`,
                method: "GET",
                requiresAuth: true
            }),
            providesTags: ['EmployeeDocuments']
        }),
        uploadDocument: builder.mutation<UploadDocumentResponse, UploadDocumentPayload>({
            query: ({data}: UploadDocumentPayload) => ({
                url: `/uploads/others`,
                method: "POST",
                data: data,
                requiresAuth: true
            }),
        }),
        saveDocument: builder.mutation<SaveEmployeeDocumentResponse, SaveEmployeeDocumentPayload>({
            query: (data) => ({
                url: `/documents`,
                method: "PUT",
                requiresAuth: true,
                data
            }),
            invalidatesTags: ['EmployeeDocuments'],
            async onQueryStarted(_, {dispatch, queryFulfilled}) {
                try { await queryFulfilled; dispatch(complianceAlertsApi.util.invalidateTags(['DocumentCompliance'])); } catch { /* Save errors are shown by the upload form. */ }
            }
        }),
        getEmployeeInfo: builder.query<GetEmployeeInfoResponse, string>({
            query: (employeeId: string) => ({
                url: `/employees/${employeeId}`,
                method: "GET",
                requiresAuth: true,
            }),
            providesTags: ['EmployeeInfo']
        }),
        updateEmployeeInfo: builder.mutation<void, UpdateEmployeeInfoPayload>({
            query: (data) => ({
                url: `/employees`,
                method: "PATCH",
                requiresAuth: true,
                data
            }),
            invalidatesTags: ['EmployeeInfo']
        }),
        getEmployeeTrainings: builder.query<TrainingPage, EmployeeTrainingQuery>({
            query: (params) => ({
                url: `/employees/trainings`,
                method: "GET",
                params,
                requiresAuth: true,
            }),
            providesTags: [{type: 'EmployeeTrainings', id: 'SELF'}],
        }),
        completeTraining: builder.mutation<
            void,
            {isCompleted: boolean; trainingId: string;}
        >({
            query: ({isCompleted, trainingId}) => ({
                url: `/employees/trainings/${trainingId}/complete`,
                method: "PATCH",
                data: {isCompleted},
                requiresAuth: true,
            }),
            invalidatesTags: [{type: 'EmployeeTrainings', id: 'SELF'}],
        }),
    }),
});

export const {
    useGetEmployeeDocumentsQuery,
    useUploadDocumentMutation,
    useSaveDocumentMutation,
    useGetEmployeeInfoQuery,
    useUpdateEmployeeInfoMutation,
    useGetEmployeeTrainingsQuery,
    useCompleteTrainingMutation
} = userPanelDashboardApi;
