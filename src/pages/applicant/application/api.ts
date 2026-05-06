import {createApi} from "@reduxjs/toolkit/query/react";
import {customBaseQuery} from "@/lib/baseQuery";
import {
  CheckOfficialSignatureStatusResponse,
  CheckSignatureStatusResponse,
  DocumentUploadAndEligibilityPayload, DocumentUploadAndEligibilityResponse, SignDocumentPayload,
  UploadDocumentPayload,
  UploadDocumentResponse
} from "@/pages/applicant/application/types";

export const applicationApi = createApi({
    reducerPath: "applicationApi",
    baseQuery: customBaseQuery,
    keepUnusedDataFor: 300,
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
            { data: DocumentUploadAndEligibilityPayload; method: "POST" | "PUT" }
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
        }),
        checkSignatureStatus: builder.query<CheckSignatureStatusResponse, string>({
            query: (context) => ({
                url: `/signature?context=${context}`,
                method: "GET",
                requiresAuth: true
            })
        }),
        signDocument: builder.mutation<CheckSignatureStatusResponse, SignDocumentPayload>({
            query: ({context, data}) => ({
                url: `/signature?context=${context}`,
                method: "POST",
                data: data,
                requiresAuth: true
            })
        }),
        submitOfficialHire: builder.mutation<void, void>({
            query: () => ({
                url: `/officialHire/submit`,
                method: "POST",
                requiresAuth: true
            })
        }),
        getOfficialHireStatus: builder.query<CheckOfficialSignatureStatusResponse, void>({
            query: () => ({
                url: '/officialHire/status',
                method: "GET",
                requiresAuth: true
            })
        }),
        submitConditionalHire: builder.mutation<void, void>({
            query: (data) => ({
                url: `/conditionalHire/submit`,
                method: "POST",
                data: data,
                requiresAuth: true
            })
        }),
        finalizeConditionalHire: builder.mutation<void, {
            authorizations: {
                drugTest: boolean;
                fingerprint: boolean;
                centralRegistry: boolean;
                cariCheck: boolean;
                sexOffenderRegistry: boolean;
                oigExclusion: boolean;
                healthTbScreening: boolean;
                referenceChecks: boolean;
            };
            termsAcceptance: {
                abuseNeglectExploitation: boolean;
                hipaaConfidentiality: boolean;
                developmentalDisabilities: boolean;
            };
            informationCorrect: boolean;
        }>({
            query: (data) => ({
                url: `/conditionalHire/finalize`,
                method: "POST",
                data: data,
                requiresAuth: true
            })
        })
    }),
});

export const {
    useUploadDocumentMutation,
    useSubmitDocumentUploadAndEligibilityVerificationMutation,
    useGetEligibilityVerificationQuery,
    useCheckSignatureStatusQuery,
    useSignDocumentMutation,
    useSubmitOfficialHireMutation,
    useSubmitConditionalHireMutation,
    useFinalizeConditionalHireMutation,
    useGetOfficialHireStatusQuery
} = applicationApi;
