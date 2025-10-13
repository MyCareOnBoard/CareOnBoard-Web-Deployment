import { createBrowserRouter } from "react-router";

import AppLayout from "@/layouts/AppLayout";
import ApplicationDashboard from "@/features/application";
import DashboardPage from "@/features/dashboard";
import DocumentsPage from "@/features/documents";
import HelpCenterPage from "@/features/help-center";
import LoginPage from "@/features/login";
import SignupPage from "@/features/signup";
import OnboardingPage from "@/features/onboarding";
import SplashScreen from "@/features/splash";
import { Routes } from "@/routes/constants";
import AuthLayout from "@/layouts/AuthLayout";

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
