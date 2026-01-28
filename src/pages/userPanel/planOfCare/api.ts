import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";
import type { PlanOfCareListResponse, PlanOfCareResponse } from "./types";

export const planOfCareApi = createApi({
  reducerPath: "planOfCareApi",
  baseQuery: customBaseQuery,
  tagTypes: ["PlanOfCare", "PlanOfCareItem"],
  endpoints: (builder) => ({
    getPlanOfCareList: builder.query<PlanOfCareListResponse, void>({
      query: () => ({
        url: "/planOfCare",
        method: "GET",
        requiresAuth: true,
      }),
      providesTags: ["PlanOfCare"],
    }),
    getPlanOfCareById: builder.query<PlanOfCareResponse, string>({
      query: (id) => ({
        url: `/planOfCare/${id}`,
        method: "GET",
        params: { id },
        requiresAuth: true,
      }),
      providesTags: (_result, _error, id) => [{ type: "PlanOfCareItem", id }],
    }),
  }),
});

export const { useGetPlanOfCareListQuery, useGetPlanOfCareByIdQuery } = planOfCareApi;
