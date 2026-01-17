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
import UserPanelCommunityInclusionPage from "@/pages/userPanel/community-inclusion";
import AgencyDashboardPage from "@/pages/agency/dashboard";
import DSPManagementPage from "@/pages/agency/dsp-management";
import ClientsPage from "@/pages/agency/clients-management";
import ClientDetailsPage from "@/pages/agency/client-details";
import AgencyAddClientPage from "@/pages/shared/client-management/wrappers/AgencyAddClientPage";
import AgencyEditClientPage from "@/pages/shared/client-management/wrappers/AgencyEditClientPage";
import AgencyCommunityInclusionsPage from "@/pages/agency/community-inclusion";
import AgencyCommunityInclusionHistoryPage from "@/pages/agency/community-inclusion/history";
import BillingAndApprovalsPage from "@/pages/agency/billing-and-approvals";
import ClientClaimsPage from "@/pages/agency/billing-and-approvals/client-claims";
import SchedulingPage from "@/pages/agency/scheduling";
import SupportPage from "@/pages/agency/support";
import AnalyticsPage from "@/pages/agency/analytics";
import ApplicantDirectoryPage from "@/pages/agency/applicant-directory";
import ClearanceHiring from "@/pages/agency/applicant-directory/ClearanceHiring";
import PendingApplicants from "@/pages/agency/applicant-directory/PendingApplicants";
import ApplicantProfilePage from "@/pages/agency/applicant-directory/ApplicantProfilePage";
import ComplianceAlertsPage from "@/pages/agency/compliance-alerts";
import ShiftsPage from "@/pages/agency/shifts";
import ShiftsListPage from "@/pages/agency/scheduling/shifts";
import ApprovalsPage from "@/pages/agency/scheduling/approvals";
import ActivityLogsPage from "@/pages/agency/scheduling/activity-logs";
import NotesPage from "@/pages/userPanel/notes";
import AgencyNotesPage from "@/pages/agency/notes";
import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import AgenciesPage from "@/pages/super-admin/agencies";
import AddAgencyWizard from "@/pages/super-admin/agencies/AddAgencyWizard";
import SavedAgencies from "@/pages/super-admin/agencies/SavedAgencies";
import AgencyView from "@/pages/super-admin/agencies/AgencyView";
import DSPClaimsPage from "@/pages/agency/billing-and-approvals/dsp-info";
import SuperAdminDashboard from "@/pages/super-admin/dashboard";
import ComplianceMonitor from "@/pages/super-admin/compliance-monitor";
import UserAccessControlPage from "@/pages/super-admin/user-access-control";
import ClientsDirectory from "@/pages/super-admin/clients-directory";
import AdminClientDetails from "@/pages/super-admin/clients-directory/client-details";
import SuperAdminAddClientPage from "@/pages/shared/client-management/wrappers/SuperAdminAddClientPage";
import SuperAdminEditClientPage from "@/pages/shared/client-management/wrappers/SuperAdminEditClientPage";
import CorporateSupportPage from "@/pages/super-admin/corporate-support";
import OversightCenterPage from "@/pages/super-admin/oversight-center";
import SuperAdminReports from "@/pages/super-admin/reports";
import SuperAdminClientReports from "@/pages/super-admin/reports/clientsReport";
import SuperAdminDSPReports from "@/pages/super-admin/reports/dspReports";
import SuperAdminTimesheetReports from "@/pages/super-admin/reports/timesheetReports";
import SuperAdminNoteReports from "@/pages/super-admin/reports/noteReports";
import SuperAdminSystemSettingsPage from "@/pages/super-admin/system-settings";
import AgencyTrainings from "@/pages/agency/trainings";
import GlobalNotesQualityPage from "@/pages/super-admin/global-notes-quality";
import AgencyBillingMonitorPage from "@/pages/super-admin/agency-billing-monitor";
import AIAutomationPage from "@/pages/agency/ai-automation";
import AgencyMileagePage from "@/pages/agency/mileage";
import AgencyIncidentPage from "@/pages/agency/incident";
import AgencyReports from "@/pages/agency/reports";
import AgencyClientReports from "@/pages/agency/reports/clientsReport";
import AgencyDSPReports from "@/pages/agency/reports/dspReports";
import AgencyTimesheetReports from "@/pages/agency/reports/timesheetReports";
import AgencyNoteReports from "@/pages/agency/reports/noteReports";


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
                path: Routes.agency.addClient,
                Component: AgencyAddClientPage,
            },
            {
                path: Routes.agency.editClient,
                Component: AgencyEditClientPage,
            },
            {
                path: Routes.agency.clientDetails,
                Component: ClientDetailsPage,
            },
            {
                path: Routes.agency.communityInclusions,
                Component: AgencyCommunityInclusionsPage,
            },
            {
                path: Routes.agency.communityInclusionHistory,
                Component: AgencyCommunityInclusionHistoryPage,
            },
            {
                path: Routes.agency.billingAndApprovals,
                Component: BillingAndApprovalsPage,
            },
            {
                path: Routes.agency.clientClaims,
                Component: ClientClaimsPage,
            },
            {
                path: Routes.agency.dspClaims,
                Component: DSPClaimsPage,
            },
            {
                path: Routes.agency.aiAutomation,
                Component: AIAutomationPage,
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
                path: Routes.agency.activityLogs,
                Component: ActivityLogsPage,
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
                path: Routes.agency.applicantClearanceHiring,
                Component: ClearanceHiring,
            },
            {
                path: Routes.agency.applicantPendingApplicants,
                Component: PendingApplicants,
            },
            {
                path: Routes.agency.applicantProfile,
                Component: ApplicantProfilePage,
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
                path: Routes.agency.trainings,
                Component: AgencyTrainings,
            },
            {
                path: Routes.agency.mileage,
                Component: AgencyMileagePage,
            },
            {
                path: Routes.agency.incident,
                Component: AgencyIncidentPage,
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
            {
                path: Routes.agency.reports.index,
                Component: AgencyReports,
            },
            {
                path: Routes.agency.reports.clients,
                Component: AgencyClientReports,
            },
            {
                path: Routes.agency.reports.dsp,
                Component: AgencyDSPReports,
            },
            {
                path: Routes.agency.reports.shifts,
                Component: AgencyTimesheetReports,
            },
            {
                path: Routes.agency.reports.notes,
                Component: AgencyNoteReports,
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
            {
                path: Routes.userPanel.communityInclusion,
                Component: UserPanelCommunityInclusionPage,
            },
        ],
    },
    {
        Component: SuperAdminLayout,
        children: [
            {
                path: Routes.superAdmin.dashboard,
                Component: SuperAdminDashboard,
            },
            {
                path: Routes.superAdmin.agencies,
                Component: AgenciesPage,
            },
            {
                path: Routes.superAdmin.addAgency,
                Component: AddAgencyWizard,
            },
            {
                path: Routes.superAdmin.savedAgencies,
                Component: SavedAgencies,
            },
            {
                path: Routes.superAdmin.agencyView,
                Component: AgencyView,
            },
            {
                path: Routes.superAdmin.complianceMonitor,
                Component: ComplianceMonitor,
            },
            {
                path: Routes.superAdmin.userAccessControl,
                Component: UserAccessControlPage,
            },
            {
                path: Routes.superAdmin.globalNotesQuality,
                Component: GlobalNotesQualityPage,
            },
            {
                path: Routes.superAdmin.agencyBillingMonitor,
                Component: AgencyBillingMonitorPage,
            },
            {
                path: Routes.superAdmin.reports.index,
                Component: SuperAdminReports,
            },
            {
                path: Routes.superAdmin.reports.clients,
                Component: SuperAdminClientReports,
            },
            {
                path: Routes.superAdmin.reports.dsp,
                Component: SuperAdminDSPReports,
            },
            {
                path: Routes.superAdmin.reports.shifts,
                Component: SuperAdminTimesheetReports,
            },
            {
                path: Routes.superAdmin.reports.notes,
                Component: SuperAdminNoteReports,
            },
            {
                path: Routes.superAdmin.clientDirectory,
                Component: ClientsDirectory,
            },
            {
                path: Routes.superAdmin.clientDetails,
                Component: AdminClientDetails,
            },
            {
                path: Routes.superAdmin.addClient,
                Component: SuperAdminAddClientPage,
            },
            {
                path: Routes.superAdmin.editClient,
                Component: SuperAdminEditClientPage,
            },
            {
                path: Routes.superAdmin.corporateSupport,
                Component: CorporateSupportPage,
            },
            {
                path: Routes.superAdmin.oversightCenter,
                Component: OversightCenterPage,
            },
            {
                path: Routes.superAdmin.systemSettings,
                Component: SuperAdminSystemSettingsPage,
            },
        ],
    },
]);
