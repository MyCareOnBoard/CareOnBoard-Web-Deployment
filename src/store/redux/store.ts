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

// TODO: Import and add your slice reducers here
// import authReducer from "@/features/auth/authSlice";
// import userReducer from "@/features/user/userSlice";

const rootReducer = combineReducers({
  // auth: authReducer,
  // user: userReducer,
});

const persistConfig = {
  key: "care-on-board-root",
  version: 1,
  storage,
  whitelist: [], // Add reducer keys to persist (e.g., ['auth', 'user'])
  blacklist: [], // Add reducer keys to exclude from persistence
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: process.env.NODE_ENV !== "production",
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
