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
import { employeeTrainingsApi } from "@/pages/agency/trainings/trainingApi";
import { complianceApi } from "@/pages/super-admin/compliance-monitor/complianceApi";
import { servicesApi } from "@/lib/api/services";

const rootReducer = combineReducers({
    auth: authReducer,
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
    [employeeTrainingsApi.reducerPath]: employeeTrainingsApi.reducer,
    [complianceApi.reducerPath]: complianceApi.reducer,
    [servicesApi.reducerPath]: servicesApi.reducer,
});

const persistConfig = {
    key: "root",
    storage,
    whitelist: ['auth']
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
            .concat(complianceApi.middleware)
            .concat(servicesApi.middleware),
    devTools: process.env.VITE_ENVIRONMENT !== 'production',
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
