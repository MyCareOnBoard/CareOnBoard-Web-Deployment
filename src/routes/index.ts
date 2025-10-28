import { lazy } from "react";
import { createBrowserRouter, RouteObject } from "react-router";
import SplashScreen from "@/features/splash";
import {Routes} from "@/routes/constants";

// Lazy load pages for better performance
const LoginPage = lazy(() => import("@/layouts/login/page"));
const SignUpPage = lazy(() => import("@/layouts/signup/page"));
const ForgotPasswordPage = lazy(() => import("@/layouts/forgot-password/page"));
const DashboardPage = lazy(() => import("@/layouts/dashboard/page"));

const routerRoutes: RouteObject[] = [
  {
    path: Routes.splash,
    Component: SplashScreen
  },
  {
    path: "/login",
    Component: LoginPage
  },
  {
    path: "/signup",
    Component: SignUpPage
  },
  {
    path: "/forgot-password",
    Component: ForgotPasswordPage
  },
  {
    path: "/dashboard",
    Component: DashboardPage
  },
]

export const router = createBrowserRouter(routerRoutes);
