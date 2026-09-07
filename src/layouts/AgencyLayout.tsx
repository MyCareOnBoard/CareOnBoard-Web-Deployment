import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { Navigate, Outlet, useNavigate, useLocation, Link } from "react-router";
import { useDispatch } from "react-redux";
import { useAuth } from "@/utils/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Routes } from "@/routes/constants";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardSidebar, { NavItem } from "@/components/DashboardSidebar";
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

import {
    UsersRound,
    Network,
    Settings,
    Sun,
    Megaphone,
    ClipboardList,
    ShieldAlert,
    CalendarClock,
} from "lucide-react";

/** Canonical scope for the scheduling hub; legacy token "Scheduling" still honored in accessList. */
const SHIFT_MANAGEMENT_ACCESS_KEY = "Shift Management";

function hasAgencyStaffAccess(accessList: string[], accessKey: string | undefined): boolean {
    if (!accessKey) return true;
    if (accessList.includes(accessKey)) return true;
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

const allNavItems: AgencyNavItem[] = [
    { label: "Dashboard", path: Routes.agency.dashboard, icon: HomeIcon },
    { label: "Shift Management", path: Routes.agency.scheduling, icon: SchedulingIcon, accessKey: SHIFT_MANAGEMENT_ACCESS_KEY, programTypes: ["ddd", "hha"] },
    {
        label: "DSP Management",
        path: Routes.agency.dspManagement,
        icon: DSPManagementIcon,
        accessKey: "DSP Management",
    },
    { label: "Task Management", path: Routes.agency.tasks, icon: ClipboardList, accessKey: "DSP Management" },
    { label: "Client Management", path: Routes.agency.clients, icon: UsersRound, accessKey: "Client Management" },
    { label: "Applicants Directory", path: Routes.agency.applicantDirectory, icon: ApplicantDirectoryIcon, accessKey: "Applicant Directory" },
    { label: "AI Automation", path: Routes.agency.aiAutomation, icon: AiIcon, accessKey: "AI Automation" },
    { label: "Compliance Alerts", path: Routes.agency.complianceAlerts, icon: ShieldAlert, accessKey: "Compliance Alerts" },
    { label: "Analytics", path: Routes.agency.analytics, icon: AnalyticsIcon, accessKey: "Analytics" },
    { label: "Notes", path: Routes.agency.notes, icon: NotesIcon, accessKey: "Notes" },
    { label: "Timesheet", path: Routes.agency.staffTimesheet, icon: CalendarClock },
    { label: "Community Inclusion", path: Routes.agency.communityInclusions, icon: CommunityInclusionIcon, accessKey: "Community Inclusion", programTypes: ["ddd"] },
    { label: "Day Program", path: Routes.agency.dayProgram, icon: Sun, programTypes: ["ddd"] },
    {
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
    { label: "Goals & Documents", path: Routes.agency.goalsAndDocuments.index, icon: GoaslAndDocumentsIcon, accessKey: "Goals & Documents", programTypes: ["ddd", "sc"] },
    { label: "Trainings", path: Routes.agency.trainings, icon: Network, accessKey: "Trainings" },
    { label: "Mileage", path: Routes.agency.mileage, icon: MileageIcon, accessKey: "Mileage" },
    { label: "Incident", path: Routes.agency.incident, icon: IncidentIcon, accessKey: "Incident" },
    { label: "Support", path: Routes.agency.support, icon: SupportIcon, accessKey: "Support" },
    { label: "Announcements", path: Routes.agency.announcements, icon: Megaphone },
    { label: "My Payroll", path: Routes.agency.myPayroll, icon: BillingIcon, staffOnly: true },
    { label: "Settings", path: Routes.agency.agencySettings, icon: Settings },
];

// ─── Mode Toggle ──────────────────────────────────────────────────────────────

const programLabels: Record<AgencyMode, string> = { ddd: "DDD", hha: "HHA", sc: "Support Coordination" };

function AgencyModeToggle({ mode, modes, onSelect }: { mode: AgencyMode; modes: AgencyMode[]; onSelect: (mode: AgencyMode) => void }) {
    return <div className="flex flex-wrap gap-1 rounded-full bg-white/60 p-1" aria-label="Agency program">
        {modes.map((value) => <button key={value} type="button" aria-pressed={mode === value}
            onClick={() => onSelect(value)} className={cn("rounded-full px-4 py-2 text-sm font-semibold", mode === value ? "bg-[#00b4b8] text-white" : "text-[#808081]")}>
            {programLabels[value]}
        </button>)}
    </div>;
}

function ModeSelectionScreen({ modes, onSelect }: { modes: AgencyMode[]; onSelect: (mode: AgencyMode) => void }) {
    return <div className="flex min-h-[calc(100vh-98px)] items-center justify-center mt-[98px]">
        <div className="w-full max-w-2xl px-8 text-center">
            <h1 className="text-[28px] font-bold mb-2">Select Your Care Program</h1>
            {modes.length ? <div className="mt-8 flex flex-wrap justify-center gap-4">
                {modes.map((mode) => <button key={mode} type="button" onClick={() => onSelect(mode)}
                    className="rounded-2xl bg-white p-8 font-semibold shadow-sm focus-visible:ring-2 focus-visible:ring-[#00b4b8]">
                    {programLabels[mode]}
                </button>)}
            </div> : <p>You do not have access to an agency program. Contact your agency administrator.</p>}
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

    const needsModeSelection = !effectiveMode;

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
        return `${staffLabels(typesForLabel).title} Management`;
    }, [effectiveMode, supportedTypes]);

    // Build filtered nav items.
    const navItems = useMemo(() => {
        const accessFiltered = filterNavItemsByAccess(allNavItems, user?.userType, user?.profile?.accessList);
        const modeFiltered = filterNavItemsByMode(accessFiltered, effectiveMode);
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
    }, [user?.userType, user?.profile?.accessList, effectiveMode, dspManagementLabel]);

    useEffect(() => {
        if (!user || (user?.userType !== UserType.AGENCY && user?.userType !== UserType.AGENCY_STAFF)) {
            navigate(Routes.auth.login, { replace: true });
        }
    }, [user]);

    const modeToggle =
        supportsBoth && effectiveMode ? (
            <AgencyModeToggle mode={effectiveMode} modes={supportedTypes} onSelect={handleModeToggle} />
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
    const canRenderCurrentRoute = mayAccessBillingRoute && mayAccessNonBillingRoute && mayAccessProgramRoute;

    return (
        <ProtectedRoute>
            {!canRenderCurrentRoute ? <Navigate to={Routes.agency.dashboard} replace /> :
            <div className="relative min-h-screen bg-[#eef4f5] overflow-x-hidden">
                <DashboardHeader
                    userName={user?.fullName}
                    userImage={(user as any)?.profileImage || user?.photoURL}
                    userRole={user?.userType === UserType.AGENCY ? "Agency Administrator" : (user as any)?.role || "Agency Staff"}
                    userType={user?.userType || UserType.APPLICANT}
                    onLogout={handleLogout}
                    centerContent={modeToggle}
                />

                {needsModeSelection ? (
                    <ModeSelectionScreen modes={supportedTypes} onSelect={handleModeSelect} />
                ) : (
                    <>
                        <DashboardSidebar navItems={navItems} />
                        <main className={`ml-0 ${collapsed ? "md:ml-[112px]" : "md:ml-[240px]"} pt-[130px] pb-10 transition-[margin] duration-200`}>
                            <AnnouncementBanner endpoint="/agencyAnnouncements/announcements/mine" viewAllPath={Routes.agency.announcements} className="mx-8 mb-4" />
                            <div key={`${agencyId}:${effectiveMode}`} className="px-8">{children ?? <Outlet />}</div>
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
                    </>
                )}
            </div>}
        </ProtectedRoute>
    );
}
