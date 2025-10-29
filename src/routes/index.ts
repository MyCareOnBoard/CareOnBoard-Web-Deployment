import { Component, lazy } from "react";
import { createBrowserRouter } from "react-router";
import { Routes } from "@/routes/constants";
import path from "path/win32";

// Lazy load all components for better performance and code splitting
const SplashScreen = lazy(() => import("@/pages/splash"));
const AppLayout = lazy(() => import("@/layouts/AppLayout"));
const LoginPage = lazy(() => import("@/pages/login"));
const SignupPage = lazy(() => import("@/pages/signup"));
const OnboardingPage = lazy(() => import("@/pages/onboarding"));
const DashboardLayout = lazy(() => import("@/layouts/DashboardLayout"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const ApplicationDashboard = lazy(() => import("@/pages/application"));
const DocumentsPage = lazy(() => import("@/pages/documents"));
const HelpCenterPage = lazy(() => import("@/pages/help-center"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"));

export const router = createBrowserRouter([
  {
    path: Routes.splash,
    index: true,
    Component: SplashScreen,
  },
  {
    path: Routes.onboarding,
    Component: OnboardingPage,
  },
  {
    path: Routes.root,
    Component: AppLayout,
    children: [
      {
        path: Routes.login,
        Component: LoginPage,
      },
      {
        path: Routes.signup,
        Component: SignupPage,
      },
      {
        path: Routes.forgotPassword,
        Component: ForgotPasswordPage,
      },
    ],
  },
  {
    path: Routes.app,
    Component: DashboardLayout,
    children: [
      {
        index: true,
        Component: DashboardPage,
      },
      {
        path: Routes.application,
        Component: ApplicationDashboard,
      },
      {
        path: Routes.dashboard,
        Component: DashboardPage,
      },
      {
        path: Routes.documents,
        Component: DocumentsPage,
      },
      {
        path: Routes.helpCenter,
        Component: HelpCenterPage,
      },
    ],
  },
]);
