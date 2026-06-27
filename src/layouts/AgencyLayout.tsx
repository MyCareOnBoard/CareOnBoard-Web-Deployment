import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router";
import { useDispatch } from "react-redux";
import { useAuth } from "@/utils/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Routes } from "@/routes/constants";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardSidebar, { NavItem } from "@/components/DashboardSidebar";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { UserType } from "@/utils/auth/types/user.types";
import { resolveActiveNavItem } from "@/lib/nav-utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles } from "lucide-react";
import { staffLabels } from "@/lib/roleLabel";
import { cn } from "@/lib/utils";
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
    Brain,
    Heart,
} from "lucide-react";

/** Canonical scope for the scheduling hub; legacy token "Scheduling" still honored in accessList. */
const SHIFT_MANAGEMENT_ACCESS_KEY = "Shift Management";

function hasAgencyStaffAccess(accessList: string[], accessKey: string | undefined): boolean {
    if (!accessKey) return true;
    if (accessList.includes(accessKey)) return true;
    if (accessKey === SHIFT_MANAGEMENT_ACCESS_KEY && accessList.includes("Scheduling")) return true;
    return false;
}

/** Extended NavItem with optional program-type restriction. */
type AgencyNavItem = NavItem & { programTypes?: AgencyMode[] };

function filterNavItemsByAccess(items: AgencyNavItem[], userType: UserType | undefined, accessList?: string[]): AgencyNavItem[] {
    if (userType === UserType.AGENCY) {
        return items;
    }

    if (!accessList) {
        return items.filter((item) => !item.accessKey);
    }

    return items.filter((item) => {
        if (!item.accessKey) return true;
        return hasAgencyStaffAccess(accessList, item.accessKey);
    });
}

function filterNavItemsByMode(items: AgencyNavItem[], mode: AgencyMode | null): NavItem[] {
    if (!mode) return items;
    return items.filter((item) => !item.programTypes || item.programTypes.includes(mode));
}

const allNavItems: AgencyNavItem[] = [
    { label: "Dashboard", path: Routes.agency.dashboard, icon: HomeIcon },
    { label: "Shift Management", path: Routes.agency.scheduling, icon: SchedulingIcon, accessKey: SHIFT_MANAGEMENT_ACCESS_KEY },
    {
        label: "DSP Management",
        path: Routes.agency.dspManagement,
        icon: DSPManagementIcon,
        accessKey: "DSP Management",
    },
    { label: "Staff Task Management", path: Routes.agency.tasks, icon: ClipboardList, accessKey: "DSP Management" },
    { label: "Client Management", path: Routes.agency.clients, icon: UsersRound, accessKey: "Client Management" },
    { label: "Applicants Directory", path: Routes.agency.applicantDirectory, icon: ApplicantDirectoryIcon, accessKey: "Applicant Directory" },
    { label: "AI Automation", path: Routes.agency.aiAutomation, icon: AiIcon, accessKey: "AI Automation" },
    { label: "Analytics", path: Routes.agency.analytics, icon: AnalyticsIcon, accessKey: "Analytics" },
    { label: "Notes", path: Routes.agency.notes, icon: NotesIcon, accessKey: "Notes" },
    { label: "Community Inclusion", path: Routes.agency.communityInclusions, icon: CommunityInclusionIcon, accessKey: "Community Inclusion", programTypes: ["ddd"] },
    { label: "Day Program", path: Routes.agency.dayProgram, icon: Sun, programTypes: ["ddd"] },
    {
        label: "Billing",
        path: Routes.agency.billing.index,
        icon: BillingIcon,
        accessKey: "Billing & Management",
        children: [
            { label: "Financial overview", path: Routes.agency.billing.financialOverview },
            { label: "Payroll management", path: Routes.agency.billing.payrollManagement },
            { label: "Claims dashboard", path: Routes.agency.billing.claims },
            { label: "DSP expenses", path: Routes.agency.billing.expenses },
        ],
    },
    // { label: "Reports", path: Routes.agency.reports.index, icon: ReportIcon, accessKey: "Reports" },
    { label: "Goals & Documents", path: Routes.agency.goalsAndDocuments.index, icon: GoaslAndDocumentsIcon, accessKey: "Goals & Documents", programTypes: ["ddd"] },
    { label: "Trainings", path: Routes.agency.trainings, icon: Network, accessKey: "Trainings" },
    { label: "Mileage", path: Routes.agency.mileage, icon: MileageIcon, accessKey: "Mileage" },
    { label: "Incident", path: Routes.agency.incident, icon: IncidentIcon, accessKey: "Incident" },
    { label: "Support", path: Routes.agency.support, icon: SupportIcon, accessKey: "Support" },
    { label: "Announcements", path: Routes.agency.announcements, icon: Megaphone },
    { label: "Settings", path: Routes.agency.agencySettings, icon: Settings },
];

// ─── Mode Toggle ──────────────────────────────────────────────────────────────

function AgencyModeToggle({ mode, onSelect }: { mode: AgencyMode; onSelect: (m: AgencyMode) => void }) {
    return (
        <div className="flex items-center gap-0.5 rounded-full bg-white/60 p-1 border border-white/40 backdrop-blur-sm shadow-sm">
            <button
                type="button"
                onClick={() => onSelect("ddd")}
                className={cn(
                    "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-200",
                    mode === "ddd"
                        ? "bg-[#00b4b8] text-white shadow-sm"
                        : "text-[#808081] hover:text-[#10141a]"
                )}
            >
                <Brain className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">DDD</span>
            </button>
            <button
                type="button"
                onClick={() => onSelect("hha")}
                className={cn(
                    "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-200",
                    mode === "hha"
                        ? "bg-[#00b4b8] text-white shadow-sm"
                        : "text-[#808081] hover:text-[#10141a]"
                )}
            >
                <Heart className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">HHA</span>
            </button>
        </div>
    );
}

// ─── Mode Selection Overlay ───────────────────────────────────────────────────

function ModeSelectionScreen({ onSelect }: { onSelect: (mode: AgencyMode) => void }) {
    return (
        <div className="flex min-h-[calc(100vh-98px)] items-center justify-center mt-[98px]">
            <div className="w-full max-w-2xl px-8 text-center">
                <h1 className="text-[28px] font-bold text-[#10141a] mb-2">Select Your Care Program</h1>
                <p className="text-[15px] text-[#808081] mb-10">
                    Choose how you'd like to manage your agency. You can switch between programs at any time.
                </p>
                <div className="grid grid-cols-2 gap-6">
                    {/* DDD Card */}
                    <button
                        type="button"
                        onClick={() => onSelect("ddd")}
                        className="group flex flex-col items-center gap-4 rounded-2xl bg-white border-2 border-transparent p-8 text-left shadow-sm transition-all duration-200 hover:border-[#00b4b8] hover:shadow-md cursor-pointer"
                    >
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e6f8f8] group-hover:bg-[#00b4b8] transition-colors duration-200">
                            <Brain className="h-8 w-8 text-[#00b4b8] group-hover:text-white transition-colors duration-200" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-[18px] font-bold text-[#10141a] mb-1">DDD Program</h2>
                            <p className="text-[13px] text-[#808081] leading-relaxed">
                                Manage Direct Support Professionals for individuals with developmental disabilities
                            </p>
                        </div>
                        <span className="mt-1 inline-flex items-center rounded-full bg-[#e6f8f8] px-3 py-1 text-[12px] font-semibold text-[#00b4b8] group-hover:bg-[#00b4b8] group-hover:text-white transition-colors duration-200">
                            DSP Management
                        </span>
                    </button>

                    {/* HHA Card */}
                    <button
                        type="button"
                        onClick={() => onSelect("hha")}
                        className="group flex flex-col items-center gap-4 rounded-2xl bg-white border-2 border-transparent p-8 text-left shadow-sm transition-all duration-200 hover:border-[#00b4b8] hover:shadow-md cursor-pointer"
                    >
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e6f8f8] group-hover:bg-[#00b4b8] transition-colors duration-200">
                            <Heart className="h-8 w-8 text-[#00b4b8] group-hover:text-white transition-colors duration-200" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-[18px] font-bold text-[#10141a] mb-1">HHA Program</h2>
                            <p className="text-[13px] text-[#808081] leading-relaxed">
                                Manage Home Health Aides providing in-home care services to patients
                            </p>
                        </div>
                        <span className="mt-1 inline-flex items-center rounded-full bg-[#e6f8f8] px-3 py-1 text-[12px] font-semibold text-[#00b4b8] group-hover:bg-[#00b4b8] group-hover:text-white transition-colors duration-200">
                            Caregiver Management
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
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
    const supportsBoth = supportedTypes.includes("ddd") && supportedTypes.includes("hha");

    // Effective mode: stored toggle, or auto-derived from the agency's single
    // supported type. Shared with the applicant directory's data fetch.
    const effectiveMode = useEffectiveAgencyMode();

    const needsModeSelection = supportsBoth && !effectiveMode;

    const handleModeSelect = (mode: AgencyMode) => {
        if (agencyId) dispatch(setAgencyMode({ agencyId, mode }));
    };

    const handleModeToggle = (mode: AgencyMode) => {
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
        return modeFiltered.map((item) =>
            item.path === Routes.agency.dspManagement ? { ...item, label: dspManagementLabel } : item
        );
    }, [user?.userType, user?.profile?.accessList, effectiveMode, dspManagementLabel]);

    // Protect routes - redirect if user tries to access unauthorized page.
    useEffect(() => {
        if (!user) return;
        if (user.userType === UserType.AGENCY) return;

        const currentNavItem = resolveActiveNavItem(location.pathname, allNavItems);
        if (!currentNavItem || !currentNavItem.accessKey) return;

        const userAccessList = user.profile?.accessList || [];
        const hasAccess = hasAgencyStaffAccess(userAccessList, currentNavItem.accessKey);
        if (!hasAccess) {
            navigate(Routes.agency.dashboard, { replace: true });
        }
    }, [user, location.pathname, navigate]);

    useEffect(() => {
        if (!user || (user?.userType !== UserType.AGENCY && user?.userType !== UserType.AGENCY_STAFF)) {
            navigate(Routes.auth.login, { replace: true });
        }
    }, [user]);

    const modeToggle =
        supportsBoth && effectiveMode ? (
            <AgencyModeToggle mode={effectiveMode} onSelect={handleModeToggle} />
        ) : null;

    return (
        <ProtectedRoute>
            <div className="relative min-h-screen bg-[#eef4f5] overflow-x-hidden">
                <DashboardHeader
                    userName={user?.fullName}
                    userImage={(user as any)?.profileImage || user?.photoURL}
                    userRole={(user as any)?.role || "Agency Staff"}
                    userType={user?.userType || UserType.APPLICANT}
                    onLogout={handleLogout}
                    centerContent={modeToggle}
                />

                {needsModeSelection ? (
                    <ModeSelectionScreen onSelect={handleModeSelect} />
                ) : (
                    <>
                        <DashboardSidebar navItems={navItems} />
                        <main className={`ml-0 ${collapsed ? "md:ml-[112px]" : "md:ml-[240px]"} pt-[130px] pb-10 transition-[margin] duration-200`}>
                            <div className="px-8">{children ?? <Outlet />}</div>
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
            </div>
        </ProtectedRoute>
    );
}
