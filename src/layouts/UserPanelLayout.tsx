import type { ReactNode } from "react";
import { Link, Navigate, Outlet, useNavigate, useLocation } from "react-router";
import { useAuth } from "@/utils/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Routes } from "@/routes/constants";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardSidebar, { NavItem } from "@/components/DashboardSidebar";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { UserType } from "@/utils/auth/types/user.types";
import {
  CalendarClock, Car, CircleHelp, HeartPulse, Headset, LayoutDashboard, MapPin, Megaphone,
  NotebookPen, Receipt, Settings, Sun, TriangleAlert, Users, Wallet,
} from "lucide-react";
import LogoNameIcon from "@/assets/icons/green-green-logo.svg?react";
import LogoMarkIcon from "@/assets/icons/logo.svg?react";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import { roleLabel } from "@/lib/roleLabel";

const navItems: NavItem[] = [
  { label: "Dashboard", path: Routes.userPanel.dashboard, icon: LayoutDashboard },
  { label: "Shift Management", path: Routes.userPanel.shiftManagement, icon: CalendarClock },
  { label: "Clients & Services", path: Routes.userPanel.clientsAndServices, icon: Users },
  { label: "Plan of Care", path: Routes.userPanel.planOfCare, icon: HeartPulse },
  { label: "Notes", path: Routes.userPanel.notes.index, icon: NotebookPen },
  { label: "Mileage", path: Routes.userPanel.mileage, icon: Car },
  { label: "Expenses", path: Routes.userPanel.expenses, icon: Receipt },
  { label: "Incident", path: Routes.userPanel.incident, icon: TriangleAlert },
  { label: "Announcements", path: Routes.userPanel.announcements, icon: Megaphone },
  { label: "Support", path: Routes.userPanel.messages, icon: Headset },
  { label: "Community Inclusion", path: Routes.userPanel.communityInclusion, icon: MapPin },
  { label: "Day Program", path: Routes.userPanel.dayProgram, icon: Sun },
  { label: "Help Center", path: Routes.userPanel.helpCenter, icon: CircleHelp },
  { label: "My Payroll", path: Routes.userPanel.payroll, icon: Wallet },
  { label: "Settings", path: Routes.userPanel.profile, icon: Settings },
];

const sidebarLogo = (collapsed: boolean) => collapsed
  ? <LogoMarkIcon aria-label="Care on Board" role="img" className="h-9 w-auto" />
  : <LogoNameIcon aria-label="Care on Board" role="img" className="h-auto w-[196px]" />;

// Faint diagonal lines on the help card, as in the design.
const helpCardPattern = {
  backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 32px)",
};

function SidebarHelpCard() {
  return (
    <div className="flex flex-col gap-3 rounded-[14px] bg-[#012829] p-4 text-white" style={helpCardPattern}>
      <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-[#033f40]">
        <Headset className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-lg font-semibold">Need help?</p>
        <p className="mt-1 text-sm text-white/85">Contact the agency</p>
      </div>
      <Link
        to={Routes.userPanel.messages}
        className="flex min-h-11 items-center justify-center rounded-[12px] bg-[#018b8e] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#019da0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Contact us
      </Link>
    </div>
  );
}


export default function UserPanelDashboardLayout({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSc = user?.applicantType === "support_coordinator" || user?.profile?.role === "support_coordinator" || user?.role === "support_coordinator";
  const excludedPaths = [Routes.userPanel.communityInclusion, Routes.userPanel.dayProgram];
  const excludedPage = isSc && excludedPaths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
  const visibleNavItems = isSc ? navItems.filter((item) => !item.path || ![...excludedPaths, Routes.userPanel.notes.index, Routes.userPanel.planOfCare].includes(item.path)).map((item) => item.path === Routes.userPanel.shiftManagement ? { ...item, label: "Timesheets", path: Routes.userPanel.manualShiftManagement } : item.path === Routes.userPanel.clientsAndServices ? { ...item, label: "My Clients" } : item) : navItems;
  const [collapsed] = useSidebarCollapsed();

  const handleLogout = async () => {
    try {
      await logout();
      navigate(Routes.auth.login, { replace: true });
    } catch (error) {
      console.error('[DashboardLayout] Logout failed:', error);
    }
  };

  return (
    <ProtectedRoute>
    {user?.userType !== UserType.EMPLOYEE ? <Navigate to={Routes.auth.login} replace /> : <div className="relative min-h-screen bg-[#eef4f5] dark:bg-[#10141a] overflow-x-hidden">
      <DashboardHeader
        userName={user?.fullName}
        userImage={(user as any)?.profileImage || user?.photoURL}
        userRole={roleLabel({ applicantType: user?.applicantType, role: user?.profile?.role || user?.role })}
        userType={user?.userType || UserType.APPLICANT}
        onLogout={handleLogout}
        sidebarInset
        showSettings={false}
      />
      <DashboardSidebar navItems={visibleNavItems} variant="brand" logo={sidebarLogo} footer={<SidebarHelpCard />} />
      <main className={`ml-0 ${collapsed ? "md:ml-[88px]" : "md:ml-[248px]"} pt-[98px] pb-10 transition-[margin] duration-200`}>
        <AnnouncementBanner endpoint="/employeePortal/announcements" viewAllPath={Routes.userPanel.announcements} className="mx-4 mb-4 sm:mx-8" />
        <div className="px-4 sm:px-8">{excludedPage ? <Navigate to={Routes.userPanel.dashboard} replace /> : isSc && location.pathname === Routes.userPanel.shiftManagement ? <Navigate to={Routes.userPanel.manualShiftManagement} replace /> : children ?? <Outlet />}</div>
      </main>
      <ScrollToTopButton />
    </div>}
    </ProtectedRoute>
  );
}

