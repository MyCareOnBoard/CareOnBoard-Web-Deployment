import {createApi} from "@reduxjs/toolkit/query/react";
import {customBaseQuery} from "@/lib/baseQuery";
import {ExpiredDocumentsResponse, UnsignedForm485Response} from "./apiTypes";

export const complianceAlertsApi = createApi({
    reducerPath: "complianceAlertsApi",
    baseQuery: customBaseQuery,
    tagTypes: ['ExpiredDocuments', 'UnsignedForm485'],
    keepUnusedDataFor: 300,
    endpoints: (builder) => ({
        getExpiredDocuments: builder.query<ExpiredDocumentsResponse, { agencyId: string; mode?: string }>({
            query: ({ agencyId, mode }) => ({
                url: "/documents/expired",
                method: "GET",
                params: { agencyId, ...(mode ? { mode } : {}) },
                requiresAuth: true
            }),
            providesTags: ['ExpiredDocuments']
        }),

        getUnsignedForm485Clients: builder.query<UnsignedForm485Response, { agencyId: string; mode?: string }>({
            query: ({ agencyId, mode }) => ({
                url: "/clients/compliance/unsigned-form485",
                method: "GET",
                params: { agencyId, ...(mode ? { mode } : {}) },
                requiresAuth: true
            }),
            providesTags: ['UnsignedForm485']
        }),

    }),
});

export const {
    useGetExpiredDocumentsQuery,
    useGetUnsignedForm485ClientsQuery,
} = complianceAlertsApi;
