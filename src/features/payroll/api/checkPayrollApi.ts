import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";
import { payrollTagTypes } from "./cacheTags";

export const checkPayrollApi = createApi({
  reducerPath: "checkPayrollApi",
  baseQuery: customBaseQuery,
  tagTypes: payrollTagTypes,
  endpoints: () => ({}),
});
