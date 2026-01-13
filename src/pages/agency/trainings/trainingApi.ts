import {createApi} from "@reduxjs/toolkit/query/react";
import {customBaseQuery} from "@/lib/baseQuery";


interface GetEmployeesNonPaginatedResponseItem {
    fullName: string;
    email: string;
    id: string;
}

interface TrainingData {
    name: string;
    timeFrame: string;
    assignedDsp: string;
    trainingType: string;
    completedAt: string | null;
    status: string;
    approved: boolean;
}

interface TrainingDataResponse {
    id: string;
    fullName: string;
    profilePictureUrl: string;
    status: string;
    trainings: TrainingData[];
}

export const employeeTrainingsApi = createApi({
    reducerPath: "employeeTrainingsApi",
    baseQuery: customBaseQuery,
    tagTypes: ["Trainings"],
    endpoints: (builder) => ({
        getEmployeesNonPaginated: builder.query<GetEmployeesNonPaginatedResponseItem[], string>({
            query: (agencyId) => ({
                url: `/employees/all?agencyId=${agencyId}`,
                method: "GET",
                requiresAuth: true
            })
        }),
        saveTraining: builder.mutation<
            void,
            { agencyId: string; trainingData: TrainingData }
        >({
            query: ({agencyId, trainingData}) => ({
                url: `/agencies/${agencyId}/trainings`,
                method: "POST",
                data: trainingData,
                requiresAuth: true
            }),
            invalidatesTags: ["Trainings"]
        }),
        getTrainings: builder.query<TrainingDataResponse[], string>({
            query: (agencyId) => ({
                url: `/agencies/${agencyId}/trainings`,
                method: "GET",
                requiresAuth: true
            }),
            providesTags: ["Trainings"]
        }),
        approveTraining: builder.mutation<
            TrainingDataResponse[],
            {agencyId: string, trainingId: string, approved: boolean}
        >({
            query: ({agencyId, trainingId, approved}) => ({
                url: `/agencies/${agencyId}/trainings/${trainingId}/approve`,
                method: "PATCH",
                data: {approved},
                requiresAuth: true
            }),
            providesTags: ["Trainings"]
        }),
    }),
});

export const {
    useGetEmployeesNonPaginatedQuery,
    useSaveTrainingMutation,
    useGetTrainingsQuery,
    useApproveTrainingMutation
} = employeeTrainingsApi;
