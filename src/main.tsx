import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import {Provider} from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import {persistor, store} from "./store/redux/store";
import { AuthProvider } from "@/features/auth";
import { Toaster } from "sonner";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthProvider>
          <App/>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </PersistGate>
    </Provider>
  </React.StrictMode>,
);
