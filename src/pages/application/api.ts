import {createApi} from "@reduxjs/toolkit/query/react";
import {customBaseQuery} from "@/lib/baseQuery";
import {
  DocumentUploadAndEligibilityPayload, DocumentUploadAndEligibilityResponse,
  UploadDocumentPayload,
  UploadDocumentResponse
} from "@/pages/application/types";

export const applicationApi = createApi({
  reducerPath: "applicationApi",
  baseQuery: customBaseQuery,
  endpoints: (builder) => ({
    uploadDocument: builder.mutation<UploadDocumentResponse, UploadDocumentPayload>({
      query: ({documentType, data}: UploadDocumentPayload) => ({
        url: `/uploads/${documentType}`,
        method: "POST",
        data: data,
        requiresAuth: true
      }),
    }),
    submitDocumentUploadAndEligibilityVerification: builder.mutation<
      DocumentUploadAndEligibilityResponse,
      {data: DocumentUploadAndEligibilityPayload; method: "POST" | "PUT"}
    >({
      query: ({data, method}) => ({
        url: `/jobApplication/eligibility-verification`,
        method: method,
        data: data,
        requiresAuth: true
      }),
    }),
    getEligibilityVerification: builder.query<DocumentUploadAndEligibilityResponse, void>({
      query: () => ({
        url: `/jobApplication/eligibility-verification`,
        method: "GET",
        requiresAuth: true
      })
    })
  }),
});

export const {
  useUploadDocumentMutation,
  useSubmitDocumentUploadAndEligibilityVerificationMutation,
  useGetEligibilityVerificationQuery
} = applicationApi;
