import {createApi} from "@reduxjs/toolkit/query/react";
import {customBaseQuery} from "@/lib/baseQuery";
import {
  UploadDocumentPayload,
  UploadDocumentResponse
} from "@/pages/applicant/application/types";
import {
  GetEmployeeDocumentsResponse,
  GetEmployeeInfoResponse, GetEmployeeTrainingsResponse,
  SaveEmployeeDocumentPayload, UpdateEmployeeInfoPayload
} from "@/pages/userPanel/dashboard/types";

export const userPanelDashboardApi = createApi({
  reducerPath: "userPanelDashboardApi",
  baseQuery: customBaseQuery,
  tagTypes: ['EmployeeDocuments', 'EmployeeInfo'],
  endpoints: (builder) => ({
    getEmployeeDocuments: builder.query<GetEmployeeDocumentsResponse[], void>({
      query: () => ({
        url: `/employeeDocuments`,
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
    saveDocument: builder.mutation<void, SaveEmployeeDocumentPayload>({
      query: (data) => ({
        url: `/employeeDocuments`,
        method: "PUT",
        requiresAuth: true,
        data
      }),
      invalidatesTags: ['EmployeeDocuments']
    }),
    getEmployeeInfo: builder.query<GetEmployeeInfoResponse, void>({
      query: () => ({
        url: `/employees/me`,
        method: "GET",
        requiresAuth: true,
      }),
      providesTags: ['EmployeeInfo']
    }),
    updateEmployeeInfo: builder.mutation<void, UpdateEmployeeInfoPayload>({
      query: (data) => ({
        url: `/employees/employee`,
        method: "PATCH",
        requiresAuth: true,
        data
      }),
      invalidatesTags: ['EmployeeInfo']
    }),
    getEmployeeTrainings: builder.query<GetEmployeeTrainingsResponse[], void>({
      query: () => ({
        url: `/employees/employee/trainings`,
        method: "GET",
        requiresAuth: true,
      }),
    })
  }),
});

export const {
  useGetEmployeeDocumentsQuery,
  useUploadDocumentMutation,
  useSaveDocumentMutation,
  useGetEmployeeInfoQuery,
  useUpdateEmployeeInfoMutation,
  useGetEmployeeTrainingsQuery
} = userPanelDashboardApi;
