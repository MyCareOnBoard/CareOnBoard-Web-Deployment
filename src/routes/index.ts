import { createBrowserRouter } from "react-router";

import AppLayout from "@/layouts/AppLayout";
import ApplicationDashboard from "@/pages/application";
import DashboardPage from "@/pages/dashboard";
import DocumentsPage from "@/pages/documents";
import HelpCenterPage from "@/pages/help-center";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import OnboardingPage from "@/pages/onboarding";
import SplashScreen from "@/pages/splash";
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
