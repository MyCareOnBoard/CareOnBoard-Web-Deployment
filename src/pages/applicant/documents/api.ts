import {createApi} from "@reduxjs/toolkit/query/react";
import {customBaseQuery} from "@/lib/baseQuery";
import {UserDocsResponse} from "@/pages/applicant/documents/types";

export const documentsApi = createApi({
  reducerPath: "documentsApi",
  baseQuery: customBaseQuery,
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    getDocuments: builder.query<UserDocsResponse, void>({
      query: () => ({
        url: `/userDocs/all`,
        method: "GET",
        requiresAuth: true
      })
    })
  }),
});

export const {
  useGetDocumentsQuery
} = documentsApi;
