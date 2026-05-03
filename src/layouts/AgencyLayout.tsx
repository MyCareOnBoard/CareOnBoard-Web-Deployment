import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { useAuth } from "@/utils/auth";
import { Routes } from "@/routes/constants";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardSidebar, { NavItem } from "@/components/DashboardSidebar";
import { UserType } from "@/utils/auth/types/user.types";
import HomeIcon from "@/assets/icons/home.svg?react";
import AiIcon from "@/assets/icons/ai.svg?react";
import SupportIcon from "@/assets/icons/support.svg?react";
import AnalyticsIcon from "@/assets/icons/analytics.svg?react";
import ApplicantDirectoryIcon from "@/assets/icons/search-list.svg?react";
import ReportIcon from "@/assets/icons/analysis-text-line.svg?react";
import IncidentIcon from "@/assets/icons/incident.svg?react";
import NotesIcon from "@/assets/icons/notes.svg?react";
import SchedulingIcon from "@/assets/icons/scheduling.svg?react";
import DSPManagementIcon from "@/assets/icons/dsp-management.svg?react";
import CommunityInclusionIcon from "@/assets/icons/community-inclusion.svg?react";
import GoaslAndDocumentsIcon from "@/assets/icons/goals-and-documents.svg?react";
import MileageIcon from "@/assets/icons/mileage.svg?react";

import {
    UsersRound,
    Network,
    Settings,
    Sun
} from "lucide-react";

/** Canonical scope for the scheduling hub; legacy token "Scheduling" still honored in accessList. */
const SHIFT_MANAGEMENT_ACCESS_KEY = "Shift Management";

function hasAgencyStaffAccess(accessList: string[], accessKey: string | undefined): boolean {
    if (!accessKey) return true;
    if (accessList.includes(accessKey)) return true;
    if (accessKey === SHIFT_MANAGEMENT_ACCESS_KEY && accessList.includes("Scheduling")) return true;
    return false;
}

const allNavItems: NavItem[] = [
    { label: "Dashboard", path: Routes.agency.dashboard, icon: HomeIcon }, // Always accessible
    { label: "Shift Management", path: Routes.agency.scheduling, icon: SchedulingIcon, accessKey: SHIFT_MANAGEMENT_ACCESS_KEY },
    { label: "DSP Management", path: Routes.agency.dspManagement, icon: DSPManagementIcon, accessKey: "DSP Management" },
    { label: "Client Management", path: Routes.agency.clients, icon: UsersRound, accessKey: "Client Management" },
    { label: "Applicants Directory", path: Routes.agency.applicantDirectory, icon: ApplicantDirectoryIcon, accessKey: "Applicant Directory" },
    { label: "Notes", path: Routes.agency.notes, icon: NotesIcon, accessKey: "Notes" },
    { label: "Community Inclusion", path: Routes.agency.communityInclusions, icon: CommunityInclusionIcon, accessKey: "Community Inclusion" },
    { label: "Day Program", path: Routes.agency.dayProgram, icon: Sun, accessKey: "Day Program" },
    // { label: "Billing & Management", path: Routes.agency.billingAndApprovals, icon: ReceiptText, accessKey: "Billing & Management" },
    { label: "AI Automation", path: Routes.agency.aiAutomation, icon: AiIcon, accessKey: "AI Automation" },
    { label: "Support", path: Routes.agency.support, icon: SupportIcon, accessKey: "Support" },
    { label: "Analytics", path: Routes.agency.analytics, icon: AnalyticsIcon, accessKey: "Analytics" },
    { label: "Reports", path: Routes.agency.reports.index, icon: ReportIcon, accessKey: "Reports" },
    { label: "Goals & Documents", path: Routes.agency.goalsAndDocuments.index, icon: GoaslAndDocumentsIcon, accessKey: "Goals & Documents" },
    { label: "Trainings", path: Routes.agency.trainings, icon: Network, accessKey: "Trainings" },
    { label: "Mileage", path: Routes.agency.mileage, icon: MileageIcon, accessKey: "Mileage" },
    { label: "Incident", path: Routes.agency.incident, icon: IncidentIcon, accessKey: "Incident" },
    { label: "Settings", path: Routes.agency.agencySettings, icon: Settings },
];


export default function AgencyDashboardLayout({ children }: { children?: ReactNode }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await logout();
            navigate(Routes.auth.login, { replace: true });
        } catch (error) {
            console.error('[AgencyLayout] Logout failed:', error);
        }
    };

    // Filter navigation items based on user access
    const navItems = useMemo(() => {
        // Agency owners have full access
        if (user?.userType === UserType.AGENCY) {
            return allNavItems;
        }

        // Agency staff have filtered access based on accessList
        if (!user?.profile?.accessList) {
            return allNavItems.filter(item => !item.accessKey);
        }

        const accessList = user.profile.accessList;

        return allNavItems.filter(item => {
            if (!item.accessKey) return true; // Always show items without accessKey (Dashboard, Incident, Mileage)
            return hasAgencyStaffAccess(accessList, item.accessKey);
        });
    }, [user?.userType, user?.profile?.accessList]);

    // Protect routes - redirect if user tries to access unauthorized page
    useEffect(() => {
        if (!user) return;

        // Agency owners have full access, no need to check
        if (user.userType === UserType.AGENCY) return;

        const currentPath = location.pathname;

        // Find the nav item that matches the current path
        const currentNavItem = allNavItems.find(item => currentPath.includes(item.path));

        // If no nav item found or no access key required, allow access
        if (!currentNavItem || !currentNavItem.accessKey) {
            return;
        }

        // Check if user has access to this page
        const userAccessList = user.profile?.accessList || [];
        const hasAccess = hasAgencyStaffAccess(userAccessList, currentNavItem.accessKey);

        if (!hasAccess) {
            console.warn(`[AgencyLayout] Access denied to ${currentNavItem.label}. Redirecting to dashboard.`);
            navigate(Routes.agency.dashboard, { replace: true });
        }
    }, [user, location.pathname, navigate]);

    useEffect(() => {
        if (!user || (user?.userType !== UserType.AGENCY && user?.userType !== UserType.AGENCY_STAFF)) {
            navigate(Routes.auth.login, { replace: true });
        }
    }, [user]);

    return (
        <div className="relative min-h-screen bg-[#eef4f5] overflow-x-hidden">
            <DashboardHeader
                userName={user?.fullName}
                userImage={(user as any)?.profileImage || user?.photoURL}
                userRole={(user as any)?.role || 'Agency Staff'}
                userType={user?.userType || UserType.APPLICANT}
                onLogout={handleLogout}
            />
            <DashboardSidebar navItems={navItems} />
            <main className="ml-[240px] pt-[130px] pb-10">
                <div className="px-8">{children ?? <Outlet />}</div>
            </main>
        </div>
    );
}
