import { createBrowserRouter } from "react-router";
import { Routes } from "@/routes/constants";
import SplashScreen from "@/pages/splash";
import VerifyOTP from "@/pages/onboarding/VerifyOTP";
import VerifyEmail from "@/pages/onboarding/VerifyEmail";
import LoginPage from "@/pages/auth/login";
import SignUpPage from "@/pages/auth/signup";
import ForgotPasswordPage from "@/pages/auth/forgot-password";
import ResetPasswordPage from "@/pages/auth/reset-password";
import ApplicantDashboardPage from "@/pages/applicant/dashboard";
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
import UserPanelDashboardLayout from "@/layouts/UserPanelLayout";
import AgencyDashboardLayout from "@/layouts/AgencyLayout";
import UserPanelDashboard from "@/pages/userPanel/dashboard";
import UserPanelMileage from "@/pages/userPanel/mileage";
import ShiftManagementPage from "@/pages/userPanel/shiftManagement";
import ManualShiftManagementPage from "@/pages/userPanel/manualShiftManagement";
import ClientsAndServicesPage from "@/pages/userPanel/clientsAndServices";
import PlanOfCarePage from "@/pages/userPanel/planOfCare";
import CommunityBasedPage from "@/pages/userPanel/notes/community-based";
import CommunityInclusionPage from "@/pages/userPanel/notes/community-inclusion";
import DayHabilitationPage from "@/pages/userPanel/notes/day-habilitation";
import PrevocationalTrainingPage from "@/pages/userPanel/notes/prevocational-training";
import RespiteLogPage from "@/pages/userPanel/notes/respite-log";
import SupportedEmploymentInterventionPage from "@/pages/userPanel/notes/supported-employment-intervention";
import SupportedEmploymentPrePage from "@/pages/userPanel/notes/supported-employment-pre";
import Expenses from "@/pages/userPanel/expenses";
import AgencyDashboardPage from "@/pages/agency/dashboard";
import DSPManagementPage from "@/pages/agency/dsp-management";
import ClientsPage from "@/pages/agency/clients";
import BillingAndApprovalsPage from "@/pages/agency/billing-and-approvals";
import SchedulingPage from "@/pages/agency/scheduling";
import SupportPage from "@/pages/agency/support";
import AnalyticsPage from "@/pages/agency/analytics";
import ApplicantDirectoryPage from "@/pages/agency/applicant-directory";
import ReportsPage from "@/pages/agency/reports";
import ComplianceAlertsPage from "@/pages/agency/compliance-alerts";
import ShiftsPage from "@/pages/agency/shifts";
import ShiftsListPage from "@/pages/agency/scheduling/shifts";
import ApprovalsPage from "@/pages/agency/scheduling/approvals";
import NotesPage from "@/pages/userPanel/notes";
import AgencyNotesPage from "@/pages/agency/notes";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import AgenciesPage from "@/pages/super-admin/agencies";


export const router = createBrowserRouter([
  {
    path: Routes.root,
    Component: SplashScreen,
  },
  {
    path: Routes.agencySplash,
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
        Component: ApplicantDashboardPage,
      },
      {
        path: Routes.applicant.documents,
        Component: DocumentsPage,
      },
      {
        path: Routes.applicant.helpCenter,
        Component: HelpCenterPage,
      },
      {
        path: Routes.applicant.settings,
        Component: SettingsPage,
      },
      {
        path: Routes.applicant.profile,
        Component: ProfilePage,
      },
    ],
  },
  {
    Component: AgencyDashboardLayout,
    children: [
      {
        path: Routes.agency.dashboard,
        Component: AgencyDashboardPage,
      },
      {
        path: Routes.agency.dspManagement,
        Component: DSPManagementPage,
      },
      {
        path: Routes.agency.clients,
        Component: ClientsPage,
      },
      {
        path: Routes.agency.billingAndApprovals,
        Component: BillingAndApprovalsPage,
      },
      {
        path: Routes.agency.scheduling,
        Component: SchedulingPage,
      },
      {
        path: Routes.agency.shiftsList,
        Component: ShiftsListPage,
      },
      {
        path: Routes.agency.support,
        Component: SupportPage,
      },
      {
      path: Routes.agency.approvals,
        Component: ApprovalsPage,
      },
      {
        path: Routes.agency.support,
        Component: SupportPage,
      },
      {
        path: Routes.agency.analytics,
        Component: AnalyticsPage,
      },
      {
        path: Routes.agency.applicantDirectory,
        Component: ApplicantDirectoryPage,
      },
      {
        path: Routes.agency.reports,
        Component: ReportsPage,
      },
      {
        path: Routes.agency.complianceAlerts,
        Component: ComplianceAlertsPage,
      },
      {
        path: Routes.agency.shifts,
        Component: ShiftsPage,
      },
      {
        path: Routes.agency.notes,
        Component: AgencyNotesPage,
      },
      {
        path: Routes.agency.helpCenter,
        Component: HelpCenterPage,
      },
      {
        path: Routes.agency.settings,
        Component: SettingsPage,
      },
      {
        path: Routes.agency.profile,
        Component: ProfilePage,
      },
    ],
  },
  {
    Component: UserPanelDashboardLayout,
    children: [
      {
        path: Routes.userPanel.dashboard,
        Component: UserPanelDashboard,
      },
      {
        path: Routes.userPanel.shiftManagement,
        Component: ShiftManagementPage,
      },
      {
        path: Routes.userPanel.manualShiftManagement,
        Component: ManualShiftManagementPage,
      },
      {
        path: Routes.userPanel.clientsAndServices,
        Component: ClientsAndServicesPage,
      },
      {
        path: Routes.userPanel.planOfCare,
        Component: PlanOfCarePage,
      },
      {
        path: Routes.userPanel.helpCenter,
        Component: HelpCenterPage,
      },
      {
        path: Routes.userPanel.settings,
        Component: SettingsPage,
      },
      {
        path: Routes.userPanel.profile,
        Component: ProfilePage,
      },
      {
        path: Routes.userPanel.mileage,
        Component: UserPanelMileage,
      },
      {
        path: Routes.userPanel.notes.index,
        Component: NotesPage,
      },
      {
        path: Routes.userPanel.notes.communityBased,
        Component: CommunityBasedPage,
      },
      {
        path: Routes.userPanel.notes.communityInclusion,
        Component: CommunityInclusionPage,
      },
      {
        path: Routes.userPanel.notes.dayHabilitation,
        Component: DayHabilitationPage,
      },
      {
        path: Routes.userPanel.notes.preVocationalTraining,
        Component: PrevocationalTrainingPage,
      },
      {
        path: Routes.userPanel.notes.respiteLog,
        Component: RespiteLogPage,
      },
      {
        path: Routes.userPanel.notes.supportedEmploymentIntervention,
        Component: SupportedEmploymentInterventionPage,
      },
      {
        path: Routes.userPanel.notes.supportedEmploymentPre,
        Component: SupportedEmploymentPrePage,
      },
      {
        path: Routes.userPanel.expenses,
        Component: Expenses,
      },
    ],
  },
  {
    Component: SuperAdminLayout,
    children: [
      {
        path: Routes.superAdmin.agencies,
        Component: AgenciesPage,
      },
    ],
  },
]);
