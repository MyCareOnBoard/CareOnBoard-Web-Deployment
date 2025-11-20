import {combineReducers, configureStore} from "@reduxjs/toolkit";
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
import {applicationApi} from "@/pages/applicant/application/api";
import {documentsApi} from "@/pages/applicant/documents/api";
import {userPanelDashboardApi} from "@/pages/userPanel/dashboard/api";

const rootReducer = combineReducers({
  auth: authReducer,
  [applicationApi.reducerPath]: applicationApi.reducer,
  [documentsApi.reducerPath]: documentsApi.reducer,
  [userPanelDashboardApi.reducerPath]: userPanelDashboardApi.reducer,
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
      .concat(userPanelDashboardApi.middleware),
  devTools: process.env.VITE_ENVIRONMENT !== 'production',
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
