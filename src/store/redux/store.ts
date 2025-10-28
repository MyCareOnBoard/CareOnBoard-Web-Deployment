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
  createTransform,
} from "redux-persist";
import storage from "redux-persist/lib/storage";
import authReducer from "@/utils/auth/store/authSlice";
import type { User } from "@/utils/auth/types";

// Transform to handle Date serialization
const dateTransform = createTransform(
  // Transform state on its way to being serialized and persisted
  (inboundState: any) => {
    if (inboundState && inboundState.user) {
      return {
        ...inboundState,
        user: inboundState.user ? {
          ...inboundState.user,
          createdAt: inboundState.user.createdAt instanceof Date
            ? inboundState.user.createdAt.toISOString()
            : inboundState.user.createdAt,
          updatedAt: inboundState.user.updatedAt instanceof Date
            ? inboundState.user.updatedAt.toISOString()
            : inboundState.user.updatedAt,
        } : null,
      }
    }
    return inboundState
  },
  // Transform state being rehydrated
  (outboundState: any) => {
    if (outboundState && outboundState.user) {
      return {
        ...outboundState,
        user: outboundState.user ? {
          ...outboundState.user,
          createdAt: new Date(outboundState.user.createdAt),
          updatedAt: new Date(outboundState.user.updatedAt),
        } : null,
      }
    }
    return outboundState
  },
  { whitelist: ['auth'] }
)

const rootReducer = combineReducers({
  auth: authReducer,
});

const persistConfig = {
  key: "root",
  storage,
  transforms: [dateTransform],
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
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
