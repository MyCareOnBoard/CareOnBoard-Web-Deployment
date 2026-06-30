import type { ReactNode } from "react";
import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import { useAuth } from "@/utils/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Routes } from "@/routes/constants";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardSidebar, { NavItem } from "@/components/DashboardSidebar";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { UserType } from "@/utils/auth/types/user.types";
import QuestionIcon from "@/assets/icons/question-mark-circle.svg?react";
import CogIcon from "@/assets/icons/cog.svg?react";
import HomeIcon from "@/assets/icons/home.svg?react";
import ExchangeIcon from "@/assets/icons/exchange-01.svg?react";
import ShareKnowledgeIcon from "@/assets/icons/share-knowledge.svg?react";
import ServiceIcon from "@/assets/icons/service.svg?react";
import NoteIcon from "@/assets/icons/note-01.svg?react";
import InvoiceIcon from "@/assets/icons/invoice-01.svg?react";
import UserRoadsideIcon from "@/assets/icons/user-roadside.svg?react";
import BellIcon from "@/assets/icons/bell.svg?react";
import SupportIcon from "@/assets/icons/support.svg?react";
import CommunityInclusionIcon from "@/assets/icons/community-inclusion.svg?react";
import { Sun, Megaphone } from "lucide-react"
import AnnouncementBanner from "@/components/AnnouncementBanner";

const navItems: NavItem[] = [
  { label: "Dashboard", path: Routes.userPanel.dashboard, icon: HomeIcon },
  { label: "Shift Management", path: Routes.userPanel.shiftManagement, icon: ExchangeIcon },
  { label: "Clients & Services", path: Routes.userPanel.clientsAndServices, icon: ShareKnowledgeIcon },
  { label: "Plan of Care", path: Routes.userPanel.planOfCare, icon: ServiceIcon },
  { label: "Notes", path: Routes.userPanel.notes.index, icon: NoteIcon },
  { label: "Mileage", path: Routes.userPanel.mileage, icon: UserRoadsideIcon },
  { label: "Expenses", path: Routes.userPanel.expenses, icon: InvoiceIcon },
  { label: "Incident", path: Routes.userPanel.incident, icon: BellIcon },
  { label: "Announcements", path: Routes.userPanel.announcements, icon: Megaphone },
  { label: "Support", path: Routes.userPanel.messages, icon: SupportIcon },
  {
    label: "Community Inclusion",
    path: Routes.userPanel.communityInclusion,
    icon: CommunityInclusionIcon
  },
  { label: "Day Program", path: Routes.userPanel.dayProgram, icon: Sun },
  {
    label: "Help Center",
    path: Routes.userPanel.helpCenter,
    icon: QuestionIcon
  },
  {
    label: "Settings",
    path: Routes.userPanel.settings,
    icon: CogIcon
  },
];


export default function UserPanelDashboardLayout({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed] = useSidebarCollapsed();

  const handleLogout = async () => {
    try {
      await logout();
      navigate(Routes.auth.login, { replace: true });
    } catch (error) {
      console.error('[DashboardLayout] Logout failed:', error);
    }
  };

  useEffect(() => {
    if (!user || (user?.userType !== UserType.EMPLOYEE)) {
      navigate(Routes.auth.login, { replace: true });
    }
  }, [user]);

  return (
    <ProtectedRoute>
    <div className="relative min-h-screen bg-[#eef4f5] overflow-x-hidden">
      <DashboardHeader
        userName={user?.fullName}
        userImage={(user as any)?.profileImage || user?.photoURL}
        userRole={(user as any)?.role || 'DSP'}
        userType={user?.userType || UserType.APPLICANT}
        onLogout={handleLogout}
      />
      <DashboardSidebar navItems={navItems} />
      <main className={`ml-0 ${collapsed ? "md:ml-[112px]" : "md:ml-[240px]"} pt-[130px] pb-10 transition-[margin] duration-200`}>
        <AnnouncementBanner endpoint="/employeePortal/announcements" viewAllPath={Routes.userPanel.announcements} />
        <div className="px-8">{children ?? <Outlet />}</div>
      </main>
    </div>
    </ProtectedRoute>
  );
}

