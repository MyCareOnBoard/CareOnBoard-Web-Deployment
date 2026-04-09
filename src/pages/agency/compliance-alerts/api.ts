import {createApi} from "@reduxjs/toolkit/query/react";
import {customBaseQuery} from "@/lib/baseQuery";
import {ExpiredDocumentsResponse} from "./apiTypes";

export const complianceAlertsApi = createApi({
    reducerPath: "complianceAlertsApi",
    baseQuery: customBaseQuery,
    tagTypes: ['ExpiredDocuments'],
    endpoints: (builder) => ({
        getExpiredDocuments: builder.query<ExpiredDocumentsResponse, string>({
            query: (agencyId) => ({
                url: `/documents/expired?agencyId=${agencyId}`,
                method: "GET",
                requiresAuth: true
            }),
            providesTags: ['ExpiredDocuments']
        }),

    }),
});

export const {
    useGetExpiredDocumentsQuery,
} = complianceAlertsApi;
