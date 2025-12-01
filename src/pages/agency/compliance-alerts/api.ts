import {createApi} from "@reduxjs/toolkit/query/react";
import {customBaseQuery} from "@/lib/baseQuery";
import {ExpiredDocumentsResponse} from "./apiTypes";

export const complianceAlertsApi = createApi({
    reducerPath: "complianceAlertsApi",
    baseQuery: customBaseQuery,
    tagTypes: ['ExpiredDocuments'],
    endpoints: (builder) => ({
        getExpiredDocuments: builder.query<ExpiredDocumentsResponse, void>({
            query: () => ({
                url: `/documents/expired`,
                method: "GET",
                requiresAuth: true
            }),
            providesTags: ['ExpiredDocuments']
        }),
        getDSPStats: builder.query<any, string>({
            query: (agencyId) => ({
                url: `/employees/stats?agencyId=${agencyId}`,
                method: "GET",
                requiresAuth: true
            })
        }),
        getShiftStats: builder.query<any, string>({
            query: (agencyId) => ({
                url: `/shifts/stats?agencyId=${agencyId}`,
                method: "GET",
                requiresAuth: true
            })
        }),
        getClientStats: builder.query<any, string>({
            query: (agencyId) => ({
                url: `/clients/stats?agencyId=${agencyId}`,
                method: "GET",
                requiresAuth: true
            })
        })
    }),
});

export const {
    useGetExpiredDocumentsQuery,
    useGetDSPStatsQuery,
    useGetShiftStatsQuery,
    useGetClientStatsQuery,
} = complianceAlertsApi;
