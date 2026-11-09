import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";
import type { PlanOfCare, PlanOfCareListResponse } from "./types";

/** The list endpoint allows up to 100 per page; stop after 10 pages (1,000 clients). */
const ALL_PAGE_LIMIT = 100;
const ALL_MAX_PAGES = 10;

export const planOfCareApi = createApi({
  reducerPath: "planOfCareApi",
  baseQuery: customBaseQuery,
  tagTypes: ["PlanOfCare"],
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    /** Every client's plan, so the overview counts and search cover the whole caseload. */
    getAllPlansOfCare: builder.query<PlanOfCare[], void>({
      async queryFn(_arg, _api, _extraOptions, baseQuery) {
        const plans: PlanOfCare[] = [];
        for (let page = 0; page < ALL_MAX_PAGES; page++) {
          const result = await baseQuery({
            url: "/planOfCare",
            method: "GET",
            params: { limit: ALL_PAGE_LIMIT, offset: page * ALL_PAGE_LIMIT },
            requiresAuth: true,
          });
          if (result.error) return { error: result.error };
          const body = result.data as PlanOfCareListResponse;
          const batch = body?.data ?? [];
          plans.push(...batch);
          const total = body?.pagination?.total;
          if (!batch.length || (typeof total === "number" ? (page + 1) * ALL_PAGE_LIMIT >= total : batch.length < ALL_PAGE_LIMIT)) break;
        }
        return { data: plans };
      },
      providesTags: ["PlanOfCare"],
    }),
  }),
});

export const { useGetAllPlansOfCareQuery } = planOfCareApi;
