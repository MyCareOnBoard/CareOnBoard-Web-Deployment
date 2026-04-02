import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import {Provider} from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import {persistor, store} from "./store/redux/store";
import { AuthProvider } from "@/utils/auth";
import { MessagingProvider } from "@/contexts/MessagingContext";
import { GoogleMapsProvider } from "@/providers/GoogleMapsProvider";
import { Toaster } from "sonner";
import "@fontsource/urbanist";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthProvider>
          <GoogleMapsProvider>
            <MessagingProvider>
              <App/>
              <Toaster position="top-right" richColors />
            </MessagingProvider>
          </GoogleMapsProvider>
        </AuthProvider>
      </PersistGate>
    </Provider>
  </React.StrictMode>,
);
