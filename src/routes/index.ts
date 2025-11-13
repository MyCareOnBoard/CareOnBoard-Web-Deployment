import {createBrowserRouter} from "react-router";
import {Routes} from "@/routes/constants";
import SplashScreen from "@/pages/splash";
import VerifyOTP from "@/pages/onboarding/VerifyOTP";
import VerifyEmail from "@/pages/onboarding/VerifyEmail";
import LoginPage from "@/pages/auth/login";
import SignUpPage from "@/pages/auth/signup";
import ForgotPasswordPage from "@/pages/auth/forgot-password";
import ResetPasswordPage from "@/pages/auth/reset-password";
import DashboardPage from "@/pages/applicant/dashboard";
import DocumentsPage from "@/pages/applicant/documents";
import HelpCenterPage from "@/pages/help-center";
import SettingsPage from "@/pages/settings";
import ProfilePage from "@/pages/profile";
import ApplicationStepper from "@/pages/applicant/application";
import OnboardingSlider from "@/pages/onboarding/components/OnboardingSlider";
import SuccessScreen from "@/pages/onboarding/SuccessScreen";
import AuthLayout from "@/layouts/AuthLayout";
import ApplicantDashboardLayout from "@/layouts/ApplicantDashboardLayout";
import OnboardingLayout from "@/layouts/OnboardingLayout";
import AuthenticatedLayout from "@/layouts/AuthenticatedLayout";


export const router = createBrowserRouter([
  {
    path: Routes.root,
    Component: SplashScreen,
  },
  {
    Component: OnboardingLayout,
    children: [
      {
        path: Routes.onboarding.index,
        Component: OnboardingSlider,
      },
      {
        path: Routes.onboarding.email,
        Component: VerifyEmail,
      },
      {
        path: Routes.onboarding.otp,
        Component: VerifyOTP,
      },
      {
        path: Routes.onboarding.success,
        Component: SuccessScreen,
      },
    ]
  },
  {
    Component: AuthLayout,
    children: [
      {
        path: Routes.auth.login,
        Component: LoginPage,
      },
      {
        path: Routes.auth.signup,
        Component: SignUpPage,
      },
      {
        path: Routes.auth.forgotPassword,
        Component: ForgotPasswordPage,
      },
      {
        path: Routes.auth.resetPassword,
        Component: ResetPasswordPage,
      },
    ],
  },
  {
    Component: ApplicantDashboardLayout,
    children: [
      {
        path: Routes.applicant.application,
        Component: ApplicationStepper,
      },
      {
        path: Routes.applicant.dashboard,
        Component: DashboardPage,
      },
      {
        path: Routes.applicant.documents,
        Component: DocumentsPage,
      },
    ],
  },
  {
    Component: AuthenticatedLayout,
    children: [
      {
        path: Routes.common.helpCenter,
        Component: HelpCenterPage,
      },
      {
        path: Routes.common.settings,
        Component: SettingsPage,
      },
      {
        path: Routes.common.profile,
        Component: ProfilePage,
      },
    ]
  },
]);
