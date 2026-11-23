import {getComplianceSources, parseComplianceView} from '@/pages/agency/compliance-alerts/workspaceScope';
import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { Navigate, Outlet, useNavigate, useLocation, Link } from "react-router";
import { useDispatch } from "react-redux";
import { useAuth } from "@/utils/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Routes } from "@/routes/constants";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardSidebar, { NavItem, brandSidebarLogo } from "@/components/DashboardSidebar";
import { UserPanelAccountMenu, type AccountMenuLink } from "@/layouts/UserPanelAccountMenu";
import { AgencyProgramSwitch, AgencyTopBarDate } from "@/components/agency/AgencyShell";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { UserType } from "@/utils/auth/types/user.types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles } from "lucide-react";
import { staffLabels } from "@/lib/roleLabel";
import { cn } from "@/lib/utils";
import { canAccessBillingChild, type AgencyBillingScope } from "@/lib/agency/agency-billing-permissions";
import { getAgencyBillingRouteAccess } from "@/lib/agency/agency-billing-route-access";
import { resolveActiveNavItem } from "@/lib/nav-utils";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import { setAgencyMode, type AgencyMode } from "@/store/redux/agencyModeSlice";
import HomeIcon from "@/assets/icons/home.svg?react";
import AiIcon from "@/assets/icons/ai.svg?react";
import SupportIcon from "@/assets/icons/support.svg?react";
import AnalyticsIcon from "@/assets/icons/analytics.svg?react";
import ApplicantDirectoryIcon from "@/assets/icons/search-list.svg?react";
// import ReportIcon from "@/assets/icons/analysis-text-line.svg?react";
import IncidentIcon from "@/assets/icons/incident.svg?react";
import NotesIcon from "@/assets/icons/notes.svg?react";
import BillingIcon from "@/assets/icons/billing.svg?react";
import SchedulingIcon from "@/assets/icons/scheduling.svg?react";
import DSPManagementIcon from "@/assets/icons/dsp-management.svg?react";
import CommunityInclusionIcon from "@/assets/icons/community-inclusion.svg?react";
import GoaslAndDocumentsIcon from "@/assets/icons/goals-and-documents.svg?react";
import MileageIcon from "@/assets/icons/mileage.svg?react";
import {ScrollToTopButton} from "@/components/ScrollToTopButton";

import {
    UsersRound,
    Network,
    Settings,
    Sun,
    Megaphone,
    ClipboardList,
    ShieldAlert,
    CalendarClock,
    Brain,
    Heart,
    HelpCircle,
    Lock,
    UserRound,
} from "lucide-react";

// Same entries as the agency's previous account menu, in the user panel's menu.
const agencyAccountLinks: AccountMenuLink[] = [
    { label: "Profile", path: Routes.common.profile.replace(":userType", "agency"), icon: UserRound },
    { label: "Settings", path: Routes.agency.agencySettings, icon: Lock, activePaths: [Routes.agency.agencySettings, Routes.common.settings.replace(":userType", "agency")] },
    { label: "Help Center", path: Routes.common.helpCenter.replace(":userType", "agency"), icon: HelpCircle },
];

/** Canonical scope for the scheduling hub; legacy token "Scheduling" still honored in accessList. */
const SHIFT_MANAGEMENT_ACCESS_KEY = "Shift Management";

function hasAgencyStaffAccess(accessList: string[], accessKey: string | undefined): boolean {
    if (!accessKey) return true;
    if (!Array.isArray(accessList)) return false;
    if (accessList.includes(accessKey)) return true;
    if (accessKey === "Staff Management" && accessList.includes("User Levels")) return true;
    if (accessKey === SHIFT_MANAGEMENT_ACCESS_KEY && accessList.includes("Scheduling")) return true;
    return false;
}

/** Extended NavItem with an optional program-type restriction. */
type AgencyNavItem = NavItem & { programTypes?: AgencyMode[] };

function filterNavItemsByAccess(items: AgencyNavItem[], userType: UserType | undefined, accessList?: string[]): AgencyNavItem[] {
    if (userType === UserType.AGENCY) {
        return items.filter((item) => !item.staffOnly);
    }

    return items.flatMap((item) => {
        if (item.staffOnly) return userType === UserType.AGENCY_STAFF ? [item] : [];
        if (item.label === "Billing" && item.children) {
            const children = item.children.filter((child) =>
                !child.accessKey || canAccessBillingChild(userType, accessList ?? [], child.accessKey as AgencyBillingScope),
            );
            return children.length ? [{ ...item, path: children[0].path, children }] : [];
        }
        if (!item.accessKey) return [item];
        return hasAgencyStaffAccess(accessList ?? [], item.accessKey) ? [item] : [];
    });
}

function filterNavItemsByMode(items: AgencyNavItem[], mode: AgencyMode | null): NavItem[] {
    if (!mode) return items;
    return items.filter((item) => !item.programTypes || item.programTypes.includes(mode));
}

// Order, sections and labels follow the new agency design (Figma, Agency frames).
const allNavItems: AgencyNavItem[] = [
    { section: "Overview", label: "Dashboard", path: Routes.agency.dashboard, icon: HomeIcon },
    { section: "Overview", label: "Analytics", path: Routes.agency.analytics, icon: AnalyticsIcon, accessKey: "Analytics" },
    { section: "Overview", label: "AI automation", path: Routes.agency.aiAutomation, icon: AiIcon, accessKey: "AI Automation" },
    { section: "Operations", label: "Shift management", path: Routes.agency.scheduling, icon: SchedulingIcon, accessKey: SHIFT_MANAGEMENT_ACCESS_KEY, programTypes: ["ddd", "hha"] },
    { section: "Operations", label: "Task management", path: Routes.agency.tasks, icon: ClipboardList, accessKey: "DSP Management" },
    { section: "Operations", label: "Timesheet", path: Routes.agency.staffTimesheet, icon: CalendarClock },
    { section: "Operations", label: "Mileage", path: Routes.agency.mileage, icon: MileageIcon, accessKey: "Mileage" },
    { section: "Operations", label: "Community inclusion", path: Routes.agency.communityInclusions, icon: CommunityInclusionIcon, accessKey: "Community Inclusion", programTypes: ["ddd"] },
    { section: "Operations", label: "Day program", path: Routes.agency.dayProgram, icon: Sun, programTypes: ["ddd"] },
    { section: "People", label: "DSP management", path: Routes.agency.dspManagement, icon: DSPManagementIcon, accessKey: "DSP Management" },
    { section: "People", label: "Client management", path: Routes.agency.clients, icon: UsersRound, accessKey: "Client Management" },
    { section: "People", label: "Staff management", path: Routes.agency.staffManagement, icon: UsersRound, accessKey: "Staff Management" },
    { section: "People", label: "Applicants", path: Routes.agency.applicantDirectory, icon: ApplicantDirectoryIcon, accessKey: "Applicant Directory" },
    { section: "People", label: "Agency care", path: Routes.agencyCare.home, icon: Network },
    { section: "Care & compliance", label: "Compliance alerts", path: Routes.agency.complianceAlerts, icon: ShieldAlert, accessKey: "Compliance Alerts" },
    { section: "Care & compliance", label: "Notes", path: Routes.agency.notes, icon: NotesIcon, accessKey: "Notes", programTypes: ["ddd", "hha"] },
    { section: "Care & compliance", label: "Goals & documents", path: Routes.agency.goalsAndDocuments.index, icon: GoaslAndDocumentsIcon, accessKey: "Goals & Documents", programTypes: ["ddd"] },
    { section: "Care & compliance", label: "Trainings", path: Routes.agency.trainings, icon: Network, accessKey: "Trainings" },
    { section: "Care & compliance", label: "Incidents", path: Routes.agency.incident, icon: IncidentIcon, accessKey: "Incident" },
    {
        section: "Finance",
        label: "Billing",
        path: Routes.agency.billing.index,
        icon: BillingIcon,
        children: [
            { label: "Financial overview", path: Routes.agency.billing.financialOverview, accessKey: "Billing Overview" },
            { label: "Payroll management", path: Routes.agency.billing.payrollManagement, accessKey: "Payroll View" },
            { label: "Claims dashboard", path: Routes.agency.billing.claims, accessKey: "Claims View" },
            { label: "DSP expenses", path: Routes.agency.billing.expenses, accessKey: "Expenses View" },
            { label: "Submitted timesheets", path: Routes.agency.billing.staffTimesheets, accessKey: "Timesheets View" },
        ],
    },
    // { label: "Reports", path: Routes.agency.reports.index, icon: ReportIcon, accessKey: "Reports" },
    { section: "Finance", label: "My payroll", path: Routes.agency.myPayroll, icon: BillingIcon, staffOnly: true },
    { section: "Communication", label: "Support", path: Routes.agency.support, icon: SupportIcon, accessKey: "Support" },
    { section: "Communication", label: "Announcements", path: Routes.agency.announcements, icon: Megaphone },
    // Pinned to the bottom of the sidebar with Collapse menu.
    { label: "Settings", path: Routes.agency.agencySettings, icon: Settings },
];

// ─── Mode selection ───────────────────────────────────────────────────────────

const programCards = {
    ddd: { icon: Brain, title: "DDD Program", description: "Manage Direct Support Professionals for individuals with developmental disabilities", badge: "DSP Management" },
    hha: { icon: Heart, title: "HHA Program", description: "Manage Home Health Aides providing in-home care services to patients", badge: "Caregiver Management" },
    sc: { icon: Network, title: "Support Coordination", description: "Manage Support Coordinators helping individuals access services and supports", badge: "Coordinator Management" },
};

function ModeSelectionScreen({ modes, onSelect }: { modes: AgencyMode[]; onSelect: (mode: AgencyMode) => void }) {
    return <div className="flex min-h-[calc(100vh-98px)] items-center justify-center mt-[98px]">
        <div className={cn("w-full px-6 py-10 text-center sm:px-8", modes.length > 2 ? "max-w-5xl" : "max-w-2xl")}>
            <h1 className="text-[28px] font-bold text-[#10141a] mb-2">Select Your Care Program</h1>
            {modes.length ? <>
                <p className="text-[15px] text-[#808081] mb-10">
                    Choose how you'd like to manage your agency. You can switch between programs at any time.
                </p>
                <div className={cn("grid gap-6", modes.length > 2 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2")}>
                    {modes.map((mode) => {
                        const { icon: Icon, title, description, badge } = programCards[mode];
                        return <button key={mode} type="button" onClick={() => onSelect(mode)}
                            className="group flex flex-col items-center gap-4 rounded-2xl bg-white border-2 border-transparent p-8 shadow-sm transition-all duration-200 hover:border-[#00b4b8] hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e6f8f8] group-hover:bg-[#00b4b8] transition-colors duration-200">
                                <Icon aria-hidden="true" className="h-8 w-8 text-[#00b4b8] group-hover:text-white transition-colors duration-200" />
                            </div>
                            <div>
                                <h2 className="text-[18px] font-bold text-[#10141a] mb-1">{title}</h2>
                                <p className="text-[13px] text-[#808081] leading-relaxed">{description}</p>
                            </div>
                            <span className="mt-auto inline-flex items-center rounded-full bg-[#e6f8f8] px-3 py-1 text-[12px] font-semibold text-[#00b4b8] group-hover:bg-[#00b4b8] group-hover:text-white transition-colors duration-200">
                                {badge}
                            </span>
                        </button>;
                    })}
                </div>
            </> : <p>You do not have access to an agency program. Contact your agency administrator.</p>}
        </div>
    </div>;
}
// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AgencyDashboardLayout({ children }: { children?: ReactNode }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const [collapsed] = useSidebarCollapsed();

    const agencyId = user?.agencyId || user?.agency?.id || "";
    const supportedTypes = user?.agency?.supportedClientTypes ?? [];
    const supportsBoth = supportedTypes.length > 1;

    // Effective mode: stored toggle, or auto-derived from the agency's single
    // supported type. Shared with the applicant directory's data fetch.
    const effectiveMode = useEffectiveAgencyMode();

    // A permitted URL program must reach the page before its mode-store dispatch.
    const complianceView = location.pathname === Routes.agency.complianceAlerts
        ? parseComplianceView(new URLSearchParams(location.search)) : null;
    const requestedComplianceMode = complianceView?.ok ? complianceView.view.mode : undefined;
    const requestedSources = requestedComplianceMode ? getComplianceSources(user, requestedComplianceMode) : [];
    const complianceUrlMode = requestedComplianceMode && requestedSources.length &&
        (complianceView?.ok && (!complianceView.view.source || requestedSources.includes(complianceView.view.source)))
        ? requestedComplianceMode : undefined;
    const complianceEntryMode = complianceUrlMode ?? effectiveMode;
    const needsModeSelection = !effectiveMode && !complianceUrlMode;

    const handleModeSelect = (mode: AgencyMode) => {
        if (agencyId) dispatch(setAgencyMode({ agencyId, mode }));
    };

    const handleModeToggle = (mode: AgencyMode) => {
        if (/\/(add|edit|new)(\/|$)/.test(location.pathname) && !window.confirm("Switch program? Any unsaved changes on this page will be lost.")) return;
        if (agencyId) dispatch(setAgencyMode({ agencyId, mode }));
        // Redirect away from DDD-only pages when switching to HHA.
        const dddOnlyPaths = [
            Routes.agency.communityInclusions,
            Routes.agency.communityInclusionHistory,
            Routes.agency.dayProgram,
            Routes.agency.dayProgramHistory,
            Routes.agency.goalsAndDocuments.index,
        ];
        if (mode === "hha" && dddOnlyPaths.some((p) => location.pathname.startsWith(p.replace(/\/:[^/]+/, "")))) {
            navigate(Routes.agency.dashboard, { replace: true });
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate(Routes.auth.login, { replace: true });
        } catch (error) {
            console.error("[AgencyLayout] Logout failed:", error);
        }
    };

    // Staff-management label reflects the selected mode (or agency's types when mode is null).
    const dspManagementLabel = useMemo(() => {
        const typesForLabel = effectiveMode ? [effectiveMode] : supportedTypes;
        return `${staffLabels(typesForLabel).title} management`;
    }, [effectiveMode, supportedTypes]);

    // Build filtered nav items.
    const navItems = useMemo(() => {
        const accessFiltered = filterNavItemsByAccess(allNavItems, user?.userType, user?.profile?.accessList);
        const modeFiltered = filterNavItemsByMode(accessFiltered, effectiveMode).filter(item => item.path !== Routes.agency.complianceAlerts || getComplianceSources(user, complianceEntryMode).length > 0);
        const expensesLabel = effectiveMode === "sc" ? "Coordinator expenses" : effectiveMode === "hha" ? "Caregiver expenses" : "DSP expenses";
        return modeFiltered.map((item) => {
            if (item.path === Routes.agency.dspManagement) return { ...item, label: dspManagementLabel };
            if (item.children) {
                return {
                    ...item,
                    children: item.children.map((child) =>
                        child.path === Routes.agency.billing.expenses ? { ...child, label: expensesLabel } : child
                    ),
                };
            }
            return item;
        });
    }, [user, effectiveMode, complianceEntryMode, dspManagementLabel]);

    // Settings is pinned to the bottom of the sidebar, next to Collapse menu.
    const [mainNavItems, bottomNavItems] = useMemo(() => [
        navItems.filter((item) => item.path !== Routes.agency.agencySettings),
        navItems.filter((item) => item.path === Routes.agency.agencySettings),
    ], [navItems]);

    useEffect(() => {
        if (!user || (user?.userType !== UserType.AGENCY && user?.userType !== UserType.AGENCY_STAFF)) {
            navigate(Routes.auth.login, { replace: true });
        }
    }, [user]);

    const userRole = user?.userType === UserType.AGENCY ? "Agency Administrator" : (user as any)?.role || "Agency Staff";

    // The program switch sits at the top of the sidebar, under the logo, as in the new design.
    const programSwitch = (sidebarCollapsed: boolean) =>
        supportsBoth && effectiveMode ? (
            <AgencyProgramSwitch mode={effectiveMode} modes={supportedTypes} onSelect={handleModeToggle} collapsed={sidebarCollapsed} />
        ) : null;

    const billingRoute = getAgencyBillingRouteAccess(location.pathname);
    const mayAccessBillingRoute = !billingRoute || canAccessBillingChild(
        user?.userType,
        user?.profile?.accessList ?? [],
        billingRoute.required,
    );
    const currentNavItem = resolveActiveNavItem(location.pathname, allNavItems);
    const mayAccessNonBillingRoute = billingRoute ? true : (
        (currentNavItem?.staffOnly
            ? user?.userType === UserType.AGENCY_STAFF
            : user?.userType === UserType.AGENCY || !currentNavItem?.accessKey ||
        hasAgencyStaffAccess(user?.profile?.accessList ?? [], currentNavItem.accessKey)
        )
    );
    const currentProgramTypes = allNavItems.find((item) => item.path === currentNavItem?.path)?.programTypes;
    const mayAccessProgramRoute = !effectiveMode || !currentProgramTypes || currentProgramTypes.includes(effectiveMode);
    const canRenderCurrentRoute = mayAccessBillingRoute && mayAccessNonBillingRoute && mayAccessProgramRoute && (currentNavItem?.path !== Routes.agency.complianceAlerts || getComplianceSources(user, complianceEntryMode).length > 0 || (!effectiveMode && Array.isArray(supportedTypes) && supportedTypes.some(mode => getComplianceSources(user, mode).length > 0)));

    return (
        <ProtectedRoute>
            {!canRenderCurrentRoute ? <Navigate to={Routes.agency.dashboard} replace /> :
            <div className={cn("relative min-h-screen overflow-x-hidden", needsModeSelection ? "bg-[#eef4f5] dark:bg-[#10141a]" : "bg-[#003839] dark:bg-[#002c2d]")}>
                <DashboardHeader
                    userName={user?.fullName}
                    userImage={(user as any)?.profileImage || user?.photoURL}
                    userRole={userRole}
                    userType={user?.userType || UserType.APPLICANT}
                    onLogout={handleLogout}
                    sidebarInset={!needsModeSelection}
                    surface={needsModeSelection ? "page" : "card"}
                    leading={needsModeSelection ? undefined : <AgencyTopBarDate />}
                    showSettings={false}
                    variant="panel"
                    accountMenu={<UserPanelAccountMenu roleLabel={userRole} onLogout={handleLogout} links={agencyAccountLinks} fieldStaff={false} careConnectUserType={user?.userType ?? UserType.AGENCY} />}
                />

                {needsModeSelection ? (
                    <ModeSelectionScreen modes={supportedTypes} onSelect={handleModeSelect} />
                ) : (
                    <>
                        <DashboardSidebar navItems={mainNavItems} bottomNavItems={bottomNavItems} variant="brand" density="compact" collapseAtBottom logo={brandSidebarLogo} header={programSwitch} />
                        {/* The page sits in a white card on the teal background; the top bar is fixed over its first 76px. */}
                        <main className={cn(
                            "relative mx-4 mb-4 mt-4 min-h-[calc(100vh-32px)] rounded-[20px] bg-white pb-10 pt-[76px] transition-[margin] duration-200 dark:bg-[#151c22]",
                            collapsed ? "md:ml-[96px]" : "md:ml-[256px]",
                        )}>
                            <AnnouncementBanner endpoint="/agencyAnnouncements/announcements/mine" viewAllPath={Routes.agency.announcements} className="mx-4 mb-4 sm:mx-8" />
                            <div key={`${agencyId}:${effectiveMode}`} className="px-4 sm:px-8">{children ?? <Outlet />}</div>
                        </main>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        to={Routes.agency.tasks}
                                        className="
                                        fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40
                                        flex h-12 w-12 items-center justify-center
                                        rounded-full
                                        border border-[#12B5B0] bg-white
                                        shadow-[0_10px_30px_rgba(0,0,0,0.12)]
                                        transition-all duration-200
                                        hover:scale-105
                                        hover:shadow-[0_16px_40px_rgba(0,0,0,0.16)]
                                        "
                                    >
                                        <Sparkles className="h-7 w-7 text-[#12B5B0]" strokeWidth={2.5} />
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="left"
                                    className="
                                        rounded-4xl
                                        border border-[#12B5B0]
                                        bg-white
                                        px-3 py-2
                                        text-[13px]
                                        font-semibold
                                        text-black
                                    "
                                >
                                    Smart Manager
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        {/* Stacked above the Smart Manager button so the two don't overlap. */}
                        <ScrollToTopButton className="bottom-24 md:bottom-28" />
                    </>
                )}
            </div>}
        </ProtectedRoute>
    );
}
