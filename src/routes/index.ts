import { createBrowserRouter, RouteObject } from "react-router";
import { lazy } from "react";
import MainLayout from "@/layouts/mainLayout";
import { Routes } from "@/routes/constants";

// Lazy load pages for better code splitting
const SplashScreen = lazy(() => import("@/features/splash"));
const SignUpPage = lazy(() => import("@/layouts/signup/page"));
const LoginPage = lazy(() => import("@/layouts/login/page"));
const ForgotPasswordPage = lazy(() => import("@/layouts/forgot-password/page"));
const OnboardingPage = lazy(() => import("@/layouts/onboarding/page"));
const DashboardPage = lazy(() => import("@/layouts/dashboard/page"));

const routerRoutes: RouteObject[] = [
  {
    path: "/",
    Component: MainLayout,
    children: [
      {
        index: true,
        Component: SignUpPage // Default to signup page
      },
      {
        path: Routes.splash,
        Component: SplashScreen
      },
      {
        path: "signup",
        Component: SignUpPage
      },
      {
        path: "login",
        Component: LoginPage
      },
      {
        path: "forgot-password",
        Component: ForgotPasswordPage
      },
      {
        path: "onboarding",
        Component: OnboardingPage
      },
      {
        path: "dashboard",
        Component: DashboardPage
      }
    ]
  },
]

export const router = createBrowserRouter(routerRoutes);
