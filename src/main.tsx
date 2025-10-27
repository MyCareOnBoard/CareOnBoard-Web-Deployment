import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import {Provider} from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import {persistor, store} from "./store/redux/store";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/toaster";
import { validateEnv } from "@/lib/env";

// Validate environment variables before rendering
// Comment out in development if you haven't set up env vars yet
try {
  validateEnv();
} catch (error) {
  console.error("Environment validation failed:", error);
  // Uncomment in production to prevent app from starting with missing env vars
  // throw error;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate 
        loading={
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <div className="mb-4 inline-block size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        } 
        persistor={persistor}
      >
        <AuthProvider>
          <App/>
          <Toaster />
        </AuthProvider>
      </PersistGate>
    </Provider>
  </React.StrictMode>,
);
