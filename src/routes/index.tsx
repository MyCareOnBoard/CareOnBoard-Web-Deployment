import { createBrowserRouter, Navigate, RouteObject } from "react-router";
import SplashScreen from "@/features/splash";
import LoginPage from "@/layouts/login/page";
import SignUpPage from "@/layouts/signup/page";
import ForgotPasswordPage from "@/layouts/forgot-password/page";
import DashboardPage from "@/layouts/dashboard/page";
import MainLayout from "@/layouts/mainLayout";
import {Routes} from "@/routes/constants";

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
        element: <DashboardPage />
      },
    ]
  },
]

export const router = createBrowserRouter(routerRoutes);
