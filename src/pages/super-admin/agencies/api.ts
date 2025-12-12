import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";
import { Agency } from "@/lib/api/agencies";
import { ListAgenciesResponse } from "@/lib/api/agencies";

export interface CreateAgencyWithUserPayload {
  agency: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    website?: string;
    description?: string;
    taxId?: string;
    npi?: string;
    licenseNumber?: string;
  };
  user: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    userType: string;
  };
}

export interface CreateAgencyWithUserResponse {
  success: boolean;
  message: string;
  agency: Agency;
  user: {
    uid: string;
    email: string;
    displayName: string;
  };
}

export const superAdminApi = createApi({
  reducerPath: "superAdminApi",
  baseQuery: customBaseQuery,
  tagTypes: ['Agencies'],
  endpoints: (builder) => ({
    createAgencyWithUser: builder.mutation<CreateAgencyWithUserResponse, CreateAgencyWithUserPayload>({
      query: (data) => ({
        url: `/superAdmin/agencies`,
        method: "POST",
        data,
        requiresAuth: true
      }),
      invalidatesTags: ['Agencies']
    }),
    listAllAgencies: builder.query<ListAgenciesResponse, { limit?: number }>({
      query: ({ limit = 100 }) => ({
        url: `/agencies?limit=${limit}`,
        method: "GET",
        requiresAuth: true
      }),
      providesTags: ['Agencies']
    })
  }),
});

export const {
  useCreateAgencyWithUserMutation,
  useListAllAgenciesQuery,
} = superAdminApi;
