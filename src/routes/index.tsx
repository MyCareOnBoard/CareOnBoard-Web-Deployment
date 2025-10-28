import { createBrowserRouter, Navigate, RouteObject } from "react-router";
import { lazy } from "react";
import MainLayout from "../layouts/mainLayout";
import { ProtectedRoute } from "../components/ProtectedRoute";

// Lazy load all pages for better performance
const SplashScreen = lazy(() => import("../features/splash"));
const LoginPage = lazy(() => import("../layouts/login/page"));
const SignUpPage = lazy(() => import("../layouts/signup/page"));
const ForgotPasswordPage = lazy(() => import("../layouts/forgot-password/page"));
const DashboardPage = lazy(() => import("../layouts/dashboard/page"));

const routerRoutes: RouteObject[] = [
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/splash" replace />
      },
      {
        path: "splash",
        element: <SplashScreen />
      },
      {
        path: "login",
        element: <LoginPage />
      },
      {
        path: "signup",
        element: <SignUpPage />
      },
      {
        path: "forgot-password",
        element: <ForgotPasswordPage />
      },
      {
        path: "dashboard",
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        )
      },
    ]
  },
]

export const router = createBrowserRouter(routerRoutes);
