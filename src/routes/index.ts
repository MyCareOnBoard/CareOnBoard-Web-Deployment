import { createBrowserRouter } from "react-router";
import { Routes } from "@/routes/constants";
import SplashScreen from "@/pages/splash";
import VerifyOTP from "@/pages/onboarding/components/VerifyOTP";
import VerifyEmail from "@/pages/onboarding/components/VerifyEmail";
import SuccessMessage from "@/pages/onboarding/components/SuccessMessage";
import AppLayout from "@/layouts/AppLayout";
import LoginPage from "@/pages/login";
import SignUpPage from "@/pages/signup";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import DashboardLayout from "@/layouts/DashboardLayout";
import DashboardPage from "@/pages/dashboard";
import DocumentsPage from "@/pages/documents";
import HelpCenterPage from "@/pages/help-center";
import SettingsPage from "@/pages/settings";
import ProfilePage from "@/pages/profile";
import ApplicationStepper from "@/pages/application";
import OnboardingSlider from "@/pages/onboarding/components/OnboardingSlider";


export const router = createBrowserRouter([
  {
    path: Routes.splash,
    index: true,
    Component: SplashScreen,
  },
  {
    path: Routes.onboarding,
    children: [
      {
        path: Routes.onboarding,
        Component: OnboardingSlider,
      },
      {
        path: Routes.onboardingEmail,
        Component: VerifyEmail,
      },
      {
        path: Routes.onboardingOTP,
        Component: VerifyOTP,
      },
      {
        path: Routes.onboardingSuccess,
        Component: SuccessMessage,
      },
    ],
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
        Component: SignUpPage,
      },
      {
        path: Routes.forgotPassword,
        Component: ForgotPasswordPage,
      },
      {
        path: Routes.resetPassword,
        Component: ResetPasswordPage,
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
        Component: ApplicationStepper,
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
      {
        path: Routes.settings,
        Component: SettingsPage,
      },
      {
        path: Routes.profile,
        Component: ProfilePage,
      },
    ],
  },
]);
