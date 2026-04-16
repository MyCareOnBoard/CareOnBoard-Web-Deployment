import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { Routes } from "@/routes/constants";

const SplashScreen = lazy(() => import("@/pages/splash"));
const VerifyOTP = lazy(() => import("@/pages/onboarding/VerifyOTP"));
const VerifyEmail = lazy(() => import("@/pages/onboarding/VerifyEmail"));
const LoginPage = lazy(() => import("@/pages/auth/login"));
const SignUpPage = lazy(() => import("@/pages/auth/signup"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/reset-password"));
const ApplicantDashboardPage = lazy(() => import("@/pages/applicant/dashboard"));
const DocumentsPage = lazy(() => import("@/pages/applicant/documents"));
const HelpCenterPage = lazy(() => import("@/pages/help-center"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const AgencySettingsPage = lazy(() => import("@/pages/agency/agency-settings"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const ApplicationStepper = lazy(() => import("@/pages/applicant/application"));
const OnboardingSlider = lazy(() => import("@/pages/onboarding/components/OnboardingSlider"));
const SuccessScreen = lazy(() => import("@/pages/onboarding/SuccessScreen"));
const AuthLayout = lazy(() => import("@/layouts/AuthLayout"));
const ApplicantDashboardLayout = lazy(() => import("@/layouts/ApplicantDashboardLayout"));
const OnboardingLayout = lazy(() => import("@/layouts/OnboardingLayout"));
const UserPanelDashboardLayout = lazy(() => import("@/layouts/UserPanelLayout"));
const AgencyDashboardLayout = lazy(() => import("@/layouts/AgencyLayout"));
const UserPanelDashboard = lazy(() => import("@/pages/userPanel/dashboard"));
const UserPanelMileage = lazy(() => import("@/pages/userPanel/mileage"));
const UserPanelIncidentPage = lazy(() => import("@/pages/userPanel/incident"));
const UserPanelMessagesPage = lazy(() => import("@/pages/userPanel/messages"));
const ShiftManagementPage = lazy(() => import("@/pages/userPanel/shiftManagement"));
const ManualShiftManagementPage = lazy(() => import("@/pages/userPanel/manualShiftManagement"));
const ClientsAndServicesPage = lazy(() => import("@/pages/userPanel/clientsAndServices"));
const PlanOfCarePage = lazy(() => import("@/pages/userPanel/planOfCare"));
const CommunityBasedPage = lazy(() => import("@/pages/userPanel/notes/community-based"));
const CommunityInclusionPage = lazy(() => import("@/pages/userPanel/notes/community-inclusion"));
const DayHabilitationPage = lazy(() => import("@/pages/userPanel/notes/day-habilitation"));
const PrevocationalTrainingPage = lazy(() => import("@/pages/userPanel/notes/prevocational-training"));
const RespiteLogPage = lazy(() => import("@/pages/userPanel/notes/respite-log"));
const SupportedEmploymentInterventionPage = lazy(() => import("@/pages/userPanel/notes/supported-employment-intervention"));
const SupportedEmploymentPrePage = lazy(() => import("@/pages/userPanel/notes/supported-employment-pre"));
const Expenses = lazy(() => import("@/pages/userPanel/expenses"));
const UserPanelCommunityInclusionPage = lazy(() => import("@/pages/userPanel/community-inclusion"));
const AgencyDashboardPage = lazy(() => import("@/pages/agency/dashboard"));
const DSPManagementPage = lazy(() => import("@/pages/agency/dsp-management"));
const DSPProfilePage = lazy(() => import("@/pages/agency/dsp-management/DSPProfilePage"));
const ClientsPage = lazy(() => import("@/pages/agency/clients-management"));
const ClientDetailsPage = lazy(() => import("@/pages/agency/client-details"));
const AgencyAddClientPage = lazy(() => import("@/pages/shared/client-management/wrappers/AgencyAddClientPage"));
const AgencyEditClientPage = lazy(() => import("@/pages/shared/client-management/wrappers/AgencyEditClientPage"));
const AgencyCommunityInclusionsPage = lazy(() => import("@/pages/agency/community-inclusion"));
const AgencyCommunityInclusionHistoryPage = lazy(() => import("@/pages/agency/community-inclusion/history"));
const AgencyDayProgramPage = lazy(() => import("@/pages/agency/day-program"));
const AgencyDayProgramHistoryPage = lazy(() => import("@/pages/agency/day-program/history"));
const BillingAndApprovalsPage = lazy(() => import("@/pages/agency/billing-and-approvals"));
const ClientClaimsPage = lazy(() => import("@/pages/agency/billing-and-approvals/client-claims"));
const SchedulingPage = lazy(() => import("@/pages/agency/scheduling"));
const SupportPage = lazy(() => import("@/pages/agency/support"));
const AnalyticsPage = lazy(() => import("@/pages/agency/analytics"));
const ApplicantDirectoryPage = lazy(() => import("@/pages/agency/applicant-directory"));
const AllApplicants = lazy(() => import("@/pages/agency/applicant-directory/AllApplicants"));
const ClearanceHiring = lazy(() => import("@/pages/agency/applicant-directory/ClearanceHiring"));
const PendingApplicants = lazy(() => import("@/pages/agency/applicant-directory/PendingApplicants"));
const ApplicantProfilePage = lazy(() => import("@/pages/agency/applicant-directory/ApplicantProfilePage"));
const ComplianceAlertsPage = lazy(() => import("@/pages/agency/compliance-alerts"));
const ShiftsPage = lazy(() => import("@/pages/agency/shifts"));
const ShiftsListPage = lazy(() => import("@/pages/agency/scheduling/shifts"));
const ApprovalsPage = lazy(() => import("@/pages/agency/scheduling/approvals"));
const ActivityLogsPage = lazy(() => import("@/pages/agency/scheduling/activity-logs"));
const AgencyShiftMaintenancePage = lazy(() => import("@/pages/agency/shift-maintenance"));
const AgencyShiftDetailsPage = lazy(() => import("@/pages/agency/shift-details"));
const NotesPage = lazy(() => import("@/pages/userPanel/notes"));
const AgencyNotesPage = lazy(() => import("@/pages/agency/notes"));
const SuperAdminLayout = lazy(() => import("@/layouts/SuperAdminLayout"));
const AgenciesPage = lazy(() => import("@/pages/super-admin/agencies"));
const AddAgencyWizard = lazy(() => import("@/pages/super-admin/agencies/AddAgencyWizard"));
const SavedAgencies = lazy(() => import("@/pages/super-admin/agencies/SavedAgencies"));
const AgencyView = lazy(() => import("@/pages/super-admin/agencies/AgencyView"));
const DSPClaimsPage = lazy(() => import("@/pages/agency/billing-and-approvals/dsp-info"));
const SuperAdminDashboard = lazy(() => import("@/pages/super-admin/dashboard"));
const ComplianceMonitor = lazy(() => import("@/pages/super-admin/compliance-monitor"));
const UserAccessControlPage = lazy(() => import("@/pages/super-admin/user-access-control"));
const ClientsDirectory = lazy(() => import("@/pages/super-admin/clients-directory"));
const AdminClientDetails = lazy(() => import("@/pages/super-admin/clients-directory/client-details"));
const SuperAdminAddClientPage = lazy(() => import("@/pages/shared/client-management/wrappers/SuperAdminAddClientPage"));
const SuperAdminEditClientPage = lazy(() => import("@/pages/shared/client-management/wrappers/SuperAdminEditClientPage"));
const CorporateSupportPage = lazy(() => import("@/pages/super-admin/corporate-support"));
const OversightCenterPage = lazy(() => import("@/pages/super-admin/oversight-center"));
const SuperAdminReports = lazy(() => import("@/pages/super-admin/reports"));
const SuperAdminClientReports = lazy(() => import("@/pages/super-admin/reports/clientsReport"));
const SuperAdminDSPReports = lazy(() => import("@/pages/super-admin/reports/dspReports"));
const SuperAdminTimesheetReports = lazy(() => import("@/pages/super-admin/reports/timesheetReports"));
const SuperAdminNoteReports = lazy(() => import("@/pages/super-admin/reports/noteReports"));
const SuperAdminMileageReports = lazy(() => import("@/components/report/mileageReports"));
const SuperAdminExpenseReports = lazy(() => import("@/components/report/expenseReports"));
const SuperAdminBillingReports = lazy(() => import("@/components/report/billingReports"));
const SuperAdminIncidentReports = lazy(() => import("@/components/report/incidentReports"));
const SuperAdminCommunityInclusionReports = lazy(() => import("@/components/report/communityInclusionReports"));
const SuperAdminSystemSettingsPage = lazy(() => import("@/pages/super-admin/system-settings"));
const ServicesManagementPage = lazy(() => import("@/pages/super-admin/services"));
const AgencyTrainings = lazy(() => import("@/pages/agency/trainings"));
const GlobalNotesQualityPage = lazy(() => import("@/pages/super-admin/global-notes-quality"));
const SuperAdminShiftMaintenancePage = lazy(() => import("@/pages/super-admin/shift-maintenance"));
const AgencyBillingMonitorPage = lazy(() => import("@/pages/super-admin/agency-billing-monitor"));
const AIAutomationPage = lazy(() => import("@/pages/agency/ai-automation"));
const AgencyMileagePage = lazy(() => import("@/pages/agency/mileage"));
const AgencyIncidentPage = lazy(() => import("@/pages/agency/incident"));
const AgencyReports = lazy(() => import("@/pages/agency/reports"));
const AgencyClientReports = lazy(() => import("@/pages/agency/reports/clientsReport"));
const AgencyDSPReports = lazy(() => import("@/pages/agency/reports/dspReports"));
const AgencyTimesheetReports = lazy(() => import("@/pages/agency/reports/timesheetReports"));
const AgencyNoteReports = lazy(() => import("@/pages/agency/reports/noteReports"));
const AgencyMileageReports = lazy(() => import("@/components/report/mileageReports"));
const AgencyExpenseReports = lazy(() => import("@/components/report/expenseReports"));
const AgencyBillingReports = lazy(() => import("@/components/report/billingReports"));
const AgencyIncidentReports = lazy(() => import("@/components/report/incidentReports"));
const AgencyCommunityInclusionReports = lazy(() => import("@/components/report/communityInclusionReports"));
const GoalsAndDocumentsPage = lazy(() => import("@/pages/agency/goalsAndDocuments"));
const GoalsAndDocumentsList = lazy(() => import("@/pages/agency/goalsAndDocuments/GoalsAndDocumentsList"));
const NaturalSupportsTraining = lazy(() => import("@/pages/agency/goalsAndDocuments/NaturalSupportsTraining"));
const CommunityInclusionServices = lazy(() => import("@/pages/agency/goalsAndDocuments/CommunityInclusionServices"));
const CommunityInclusionIndividualizedGoals = lazy(() => import("@/pages/agency/goalsAndDocuments/CommunityInclusionIndividualizedGoals"));
const DayHabilitationServices = lazy(() => import("@/pages/agency/goalsAndDocuments/DayHabilitationServices"));
const PrevocationalTrainingServices = lazy(() => import("@/pages/agency/goalsAndDocuments/PrevocationalTrainingServices"));
const DayHabilitationIndividualizedGoals = lazy(() => import("@/pages/agency/goalsAndDocuments/DayHabilitationIndividualizedGoals"));
const PrevocationalTrainingIndividualizedGoals = lazy(() => import("@/pages/agency/goalsAndDocuments/PrevocationalTrainingIndividualizedGoals"));
const InternalUsersPage = lazy(() => import("@/pages/agency/agency-settings/user-levels/InternalUsersPage"));
const DSPDirectoryPage = lazy(() => import("@/pages/agency/agency-settings/user-levels/DSPDirectoryPage"));
const ClientDirectoryPage = lazy(() => import("@/pages/agency/agency-settings/user-levels/ClientDirectoryPage"));
const MobileAppRedirect = lazy(() => import("@/pages/app/MobileAppRedirect"));


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
        path: Routes.mobileAppRedirect,
        Component: MobileAppRedirect,
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
                path: Routes.agency.dspProfile,
                Component: DSPProfilePage,
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
                path: Routes.agency.dayProgram,
                Component: AgencyDayProgramPage,
            },
            {
                path: Routes.agency.dayProgramHistory,
                Component: AgencyDayProgramHistoryPage,
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
                path: Routes.agency.supportConversation,
                Component: SupportPage,
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
                path: Routes.agency.shiftMaintenance,
                Component: AgencyShiftMaintenancePage,
            },
            {
                path: Routes.agency.shiftDetails,
                Component: AgencyShiftDetailsPage,
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
                path: Routes.agency.applicantAllApplicants,
                Component: AllApplicants,
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
                path: Routes.agency.agencySettings,
                Component: AgencySettingsPage,
            },
            {
                path: Routes.agency.agencySettingsInternalUsers,
                Component: InternalUsersPage,
            },
            {
                path: Routes.agency.agencySettingsDSP,
                Component: DSPDirectoryPage,
            },
            {
                path: Routes.agency.agencySettingsClients,
                Component: ClientDirectoryPage,
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
            {
                path: Routes.agency.reports.mileage,
                Component: AgencyMileageReports,
            },
            {
                path: Routes.agency.reports.expense,
                Component: AgencyExpenseReports,
            },
            {
                path: Routes.agency.reports.billing,
                Component: AgencyBillingReports,
            },
            {
                path: Routes.agency.reports.incidents,
                Component: AgencyIncidentReports,
            },
            {
                path: Routes.agency.reports.community_inclusions,
                Component: AgencyCommunityInclusionReports,
            },
            {
                path: Routes.agency.goalsAndDocuments.index,
                Component: GoalsAndDocumentsPage,
            },
            {
                path: `${Routes.agency.goalsAndDocuments.index}/list`,
                Component: GoalsAndDocumentsList,
            },
            {
                path: Routes.agency.goalsAndDocuments.naturalSupportsTraining,
                Component: NaturalSupportsTraining,
            },
            {
                path: Routes.agency.goalsAndDocuments.communityInclusionServices,
                Component: CommunityInclusionServices,
            },
            {
                path: Routes.agency.goalsAndDocuments.communityInclusionIndividualizedGoals,
                Component: CommunityInclusionIndividualizedGoals,
            },
            {
                path: Routes.agency.goalsAndDocuments.dayHabilitationIndividualizedGoals,
                Component: DayHabilitationIndividualizedGoals,
            },
            {
                path: Routes.agency.goalsAndDocuments.prevocationalTrainingIndividualizedGoals,
                Component: PrevocationalTrainingIndividualizedGoals,
            },
            {
                path: Routes.agency.goalsAndDocuments.dayHabilitationServices,
                Component: DayHabilitationServices,
            },
            {
                path: Routes.agency.goalsAndDocuments.prevocationalTrainingServices,
                Component: PrevocationalTrainingServices,
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
                path: Routes.userPanel.incident,
                Component: UserPanelIncidentPage,
            },
            {
                path: Routes.userPanel.messagesConversation,
                Component: UserPanelMessagesPage,
            },
            {
                path: Routes.userPanel.messages,
                Component: UserPanelMessagesPage,
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
            {
                path: Routes.userPanel.goalsAndDocuments.naturalSupportsTraining,
                Component: NaturalSupportsTraining,
            },
            {
                path: Routes.userPanel.goalsAndDocuments.communityInclusionServices,
                Component: CommunityInclusionServices,
            },
            {
                path: Routes.userPanel.goalsAndDocuments.communityInclusionIndividualizedGoals,
                Component: CommunityInclusionIndividualizedGoals,
            },
            {
                path: Routes.userPanel.goalsAndDocuments.dayHabilitationServices,
                Component: DayHabilitationServices,
            },
            {
                path: Routes.userPanel.goalsAndDocuments.dayHabilitationIndividualizedGoals,
                Component: DayHabilitationIndividualizedGoals,
            },
            {
                path: Routes.userPanel.goalsAndDocuments.prevocationalTrainingServices,
                Component: PrevocationalTrainingServices,
            },
            {
                path: Routes.userPanel.goalsAndDocuments.prevocationalTrainingIndividualizedGoals,
                Component: PrevocationalTrainingIndividualizedGoals,
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
                path: Routes.superAdmin.shiftMaintenance,
                Component: SuperAdminShiftMaintenancePage,
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
                path: Routes.superAdmin.reports.mileage,
                Component: SuperAdminMileageReports,
            },
            {
                path: Routes.superAdmin.reports.expense,
                Component: SuperAdminExpenseReports,
            },
            {
                path: Routes.superAdmin.reports.billing,
                Component: SuperAdminBillingReports,
            },
            {
                path: Routes.superAdmin.reports.incidents,
                Component: SuperAdminIncidentReports,
            },
            {
                path: Routes.superAdmin.reports.community_inclusions,
                Component: SuperAdminCommunityInclusionReports,
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
                path: Routes.superAdmin.corporateSupportConversation,
                Component: CorporateSupportPage,
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
            {
                path: Routes.superAdmin.services,
                Component: ServicesManagementPage,
            },
        ],
    },
]);
