import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";
import type { Reminder, ReminderDraft } from "./types";

interface RemindersResponse {
  success: boolean;
  data: Reminder[];
}

interface ReminderResponse {
  success: boolean;
  data: Reminder;
}

interface UpdateReminderInput {
  reminderId: string;
  data: Partial<ReminderDraft>;
}

export const remindersApi = createApi({
  reducerPath: "remindersApi",
  baseQuery: customBaseQuery,
  tagTypes: ["Reminders"],
  endpoints: (builder) => ({
    getReminders: builder.query<RemindersResponse, void>({
      query: () => ({
        url: "/agencyReminders/reminders",
        method: "GET",
        requiresAuth: true,
      }),
      providesTags: ["Reminders"],
    }),
    createReminder: builder.mutation<ReminderResponse, ReminderDraft>({
      query: (data) => ({
        url: "/agencyReminders/reminders",
        method: "POST",
        data,
        requiresAuth: true,
      }),
      invalidatesTags: ["Reminders"],
    }),
    updateReminder: builder.mutation<ReminderResponse, UpdateReminderInput>({
      query: ({ reminderId, data }) => ({
        url: `/agencyReminders/reminders/${reminderId}`,
        method: "PATCH",
        data,
        requiresAuth: true,
      }),
      invalidatesTags: ["Reminders"],
    }),
    deleteReminder: builder.mutation<{ success: boolean; message: string }, string>({
      query: (reminderId) => ({
        url: `/agencyReminders/reminders/${reminderId}`,
        method: "DELETE",
        requiresAuth: true,
      }),
      invalidatesTags: ["Reminders"],
    }),
  }),
});

export const {
  useGetRemindersQuery,
  useCreateReminderMutation,
  useUpdateReminderMutation,
  useDeleteReminderMutation,
} = remindersApi;
