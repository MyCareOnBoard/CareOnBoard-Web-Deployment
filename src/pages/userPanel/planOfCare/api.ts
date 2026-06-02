import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";
import type { PlanOfCareListResponse, PlanOfCareResponse } from "./types";

export type PlanOfCareListParams = {
  limit: number;
  offset: number;
};

export const planOfCareApi = createApi({
  reducerPath: "planOfCareApi",
  baseQuery: customBaseQuery,
  tagTypes: ["PlanOfCare", "PlanOfCareItem"],
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    getPlanOfCareList: builder.query<
      PlanOfCareListResponse,
      PlanOfCareListParams
    >({
      query: ({ limit, offset }) => ({
        url: "/planOfCare",
        method: "GET",
        params: { limit, offset },
        requiresAuth: true,
      }),
      providesTags: ["PlanOfCare"],
    }),
    getPlanOfCareById: builder.query<PlanOfCareResponse, string>({
      query: (id) => ({
        url: `/planOfCare/${id}`,
        method: "GET",
        requiresAuth: true,
      }),
      providesTags: (_result, _error, id) => [{ type: "PlanOfCareItem", id }],
    }),
  }),
});

export const { useGetPlanOfCareListQuery, useGetPlanOfCareByIdQuery } = planOfCareApi;
