import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";

export interface TaskActivity {
  id: string;
  description: string;
  createdAt: string;
  createdBy?: string;
}

export interface StaffTaskData {
  id: string;
  title: string;
  description: string;
  department: string;
  staffMember: string;
  dueDate: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Completed";
  activities: TaskActivity[];
  /** Program view the task was created in; absent = shows in both views. */
  mode?: "ddd" | "hha";
}

interface TasksResponse {
  success: boolean;
  data: StaffTaskData[];
}

interface TaskResponse {
  success: boolean;
  data: StaffTaskData;
}

interface CreateTaskInput {
  title: string;
  description: string;
  department: string;
  staffMember: string;
  dueDate: string;
  priority: "High" | "Medium" | "Low";
  mode?: "ddd" | "hha" | null;
}

interface UpdateTaskInput {
  taskId: string;
  data: Partial<Omit<StaffTaskData, "id" | "activities">>;
}

interface AddActivityInput {
  taskId: string;
  description: string;
}

export const agencyStaffTasksApi = createApi({
  reducerPath: "agencyStaffTasksApi",
  baseQuery: customBaseQuery,
  tagTypes: ["StaffTasks"],
  endpoints: (builder) => ({
    getTasks: builder.query<TasksResponse, { mode?: string }>({
      query: ({ mode } = {}) => ({
        url: "/agencyStaffTasks/tasks",
        method: "GET",
        params: { ...(mode ? { mode } : {}) },
        requiresAuth: true,
      }),
      providesTags: ["StaffTasks"],
    }),
    createTask: builder.mutation<TaskResponse, CreateTaskInput>({
      query: (data) => ({
        url: "/agencyStaffTasks/tasks",
        method: "POST",
        data,
        requiresAuth: true,
      }),
      invalidatesTags: ["StaffTasks"],
    }),
    updateTask: builder.mutation<TaskResponse, UpdateTaskInput>({
      query: ({ taskId, data }) => ({
        url: `/agencyStaffTasks/tasks/${taskId}`,
        method: "PATCH",
        data,
        requiresAuth: true,
      }),
      invalidatesTags: ["StaffTasks"],
    }),
    deleteTask: builder.mutation<{ success: boolean; message: string }, string>({
      query: (taskId) => ({
        url: `/agencyStaffTasks/tasks/${taskId}`,
        method: "DELETE",
        requiresAuth: true,
      }),
      invalidatesTags: ["StaffTasks"],
    }),
    addActivity: builder.mutation<{ success: boolean; data: TaskActivity }, AddActivityInput>({
      query: ({ taskId, description }) => ({
        url: `/agencyStaffTasks/tasks/${taskId}/activities`,
        method: "POST",
        data: { description },
        requiresAuth: true,
      }),
      invalidatesTags: ["StaffTasks"],
    }),
  }),
});

export const {
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useAddActivityMutation,
} = agencyStaffTasksApi;
