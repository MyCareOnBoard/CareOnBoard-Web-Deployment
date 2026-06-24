import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
    persistStore,
    persistReducer,
    FLUSH,
    REHYDRATE,
    PAUSE,
    PERSIST,
    PURGE,
    REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import authReducer from "@/utils/auth/store/authSlice";
import agencyModeReducer from "@/store/redux/agencyModeSlice";
import { applicationApi } from "@/pages/applicant/application/api";
import { documentsApi } from "@/pages/applicant/documents/api";
import { userPanelDashboardApi } from "@/pages/userPanel/dashboard/api";
import { userPanelNotesApi } from "@/pages/userPanel/notes/api";
import { agencyNotesApi } from "@/pages/agency/notes/api";
import { complianceAlertsApi } from "@/pages/agency/compliance-alerts/api";
import { agencyDashboardApi } from "@/pages/agency/dashboard/api";
import { superAdminApi } from "@/pages/super-admin/agencies/api";
import { superAdminDashboardApi } from "@/pages/super-admin/dashboard/api";
import { billingApi } from "@/pages/agency/billing-and-approvals/api";
import { billingExpensesApi } from "@/lib/api/billing-expenses";
import { employeeTrainingsApi } from "@/pages/agency/trainings/trainingApi";
import { complianceApi } from "@/pages/super-admin/compliance-monitor/complianceApi";
import { servicesApi } from "@/lib/api/services";
import { clientsApi } from "@/lib/api/clients";
import { billingMonitorApi } from "@/pages/super-admin/agency-billing-monitor/api";
import { goalsAndDocumentsApi } from "@/pages/agency/goalsAndDocuments/api";
import { reportsApi } from "@/lib/api/reports";
import { agencyStaffApi } from "@/lib/api/agency-staff";
import { planOfCareApi } from "@/pages/userPanel/planOfCare/api";
import { userMessagingApi } from "@/lib/api/userMessaging";
import { aiAutomationApi } from "@/pages/agency/ai-automation/api";
import { agencyStaffTasksApi } from "@/pages/agency/staff-tasks/api";
import { remindersApi } from "@/pages/agency/reminders/api";

const rootReducer = combineReducers({
    auth: authReducer,
    agencyMode: agencyModeReducer,
    [applicationApi.reducerPath]: applicationApi.reducer,
    [documentsApi.reducerPath]: documentsApi.reducer,
    [userPanelDashboardApi.reducerPath]: userPanelDashboardApi.reducer,
    [userPanelNotesApi.reducerPath]: userPanelNotesApi.reducer,
    [agencyNotesApi.reducerPath]: agencyNotesApi.reducer,
    [agencyDashboardApi.reducerPath]: agencyDashboardApi.reducer,
    [complianceAlertsApi.reducerPath]: complianceAlertsApi.reducer,
    [superAdminApi.reducerPath]: superAdminApi.reducer,
    [superAdminDashboardApi.reducerPath]: superAdminDashboardApi.reducer,
    [billingApi.reducerPath]: billingApi.reducer,
    [billingExpensesApi.reducerPath]: billingExpensesApi.reducer,
    [employeeTrainingsApi.reducerPath]: employeeTrainingsApi.reducer,
    [complianceApi.reducerPath]: complianceApi.reducer,
    [servicesApi.reducerPath]: servicesApi.reducer,
    [billingMonitorApi.reducerPath]: billingMonitorApi.reducer,
    [clientsApi.reducerPath]: clientsApi.reducer,
    [goalsAndDocumentsApi.reducerPath]: goalsAndDocumentsApi.reducer,
    [reportsApi.reducerPath]: reportsApi.reducer,
    [agencyStaffApi.reducerPath]: agencyStaffApi.reducer,
    [planOfCareApi.reducerPath]: planOfCareApi.reducer,
    [userMessagingApi.reducerPath]: userMessagingApi.reducer,
    [aiAutomationApi.reducerPath]: aiAutomationApi.reducer,
    [agencyStaffTasksApi.reducerPath]: agencyStaffTasksApi.reducer,
    [remindersApi.reducerPath]: remindersApi.reducer,
});

const persistConfig = {
    key: "root",
    storage,
    whitelist: ['auth', 'agencyMode']
};

// @ts-ignore - persistReducer type mismatch with transforms
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
            },
        }).concat(applicationApi.middleware)
            .concat(documentsApi.middleware)
            .concat(userPanelDashboardApi.middleware)
            .concat(userPanelNotesApi.middleware)
            .concat(agencyNotesApi.middleware)
            .concat(agencyDashboardApi.middleware)
            .concat(complianceAlertsApi.middleware)
            .concat(superAdminApi.middleware)
            .concat(superAdminDashboardApi.middleware)
            .concat(employeeTrainingsApi.middleware)
            .concat(billingApi.middleware)
            .concat(billingExpensesApi.middleware)
            .concat(complianceApi.middleware)
            .concat(servicesApi.middleware)
            .concat(billingMonitorApi.middleware)
            .concat(clientsApi.middleware)
            .concat(goalsAndDocumentsApi.middleware)
            .concat(reportsApi.middleware)
            .concat(agencyStaffApi.middleware)
            .concat(planOfCareApi.middleware)
            .concat(userMessagingApi.middleware)
            .concat(aiAutomationApi.middleware)
            .concat(agencyStaffTasksApi.middleware)
            .concat(remindersApi.middleware),
    devTools: process.env.VITE_ENVIRONMENT !== 'production',
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
