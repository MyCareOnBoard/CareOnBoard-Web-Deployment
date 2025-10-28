import { lazy } from "react";
import { createBrowserRouter } from "react-router";
import { Routes } from "@/routes/constants";

// Lazy load all components for better performance and code splitting
const SplashScreen = lazy(() => import("@/pages/splash"));
const AuthLayout = lazy(() => import("@/layouts/AuthLayout"));
const LoginPage = lazy(() => import("@/pages/login"));
const SignupPage = lazy(() => import("@/pages/signup"));
const OnboardingPage = lazy(() => import("@/pages/onboarding"));
const AppLayout = lazy(() => import("@/layouts/AppLayout"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const ApplicationDashboard = lazy(() => import("@/pages/application"));
const DocumentsPage = lazy(() => import("@/pages/documents"));
const HelpCenterPage = lazy(() => import("@/pages/help-center"));

export const router = createBrowserRouter([
  {
    path: Routes.splash,
    index: true,
    Component: SplashScreen,
  },
  {
    path: Routes.auth,
    Component: AuthLayout,
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
        path: Routes.onboarding,
        Component: OnboardingPage,
      },
    ],
  },
  {
    path: Routes.app,
    Component: AppLayout,
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
