import { useMemo, type ReactNode } from "react";
import { Link, Navigate, Outlet, useNavigate, useLocation } from "react-router";
import { useAuth } from "@/utils/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Routes } from "@/routes/constants";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardSidebar, { NavItem, brandSidebarLogo } from "@/components/DashboardSidebar";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { UserType } from "@/utils/auth/types/user.types";
import {
  CalendarClock, Car, CircleHelp, HandHeart, HeartPulse, Headset, LayoutDashboard, Megaphone,
  NotebookPen, Receipt, Settings, TriangleAlert, Users, Wallet,
} from "lucide-react";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import { roleLabel } from "@/lib/roleLabel";
import { UserPanelAccountMenu } from "@/layouts/UserPanelAccountMenu";
import { CiAttendancePanel } from "@/components/ci/CiAttendancePanel";
import { useCarePanel } from "@/components/ci/carePanel";

// Incidents, community inclusion and day program sit together under "Care & support".
// Incidents is a page; the two programs open as panels over the current page.
const CARE_GROUP = "Care & support";

const navItems: NavItem[] = [
  { label: "Dashboard", path: Routes.userPanel.dashboard, icon: LayoutDashboard },
  { label: "Shift Management", path: Routes.userPanel.shiftManagement, icon: CalendarClock },
  { label: "Clients & Services", path: Routes.userPanel.clientsAndServices, icon: Users },
  { label: "Plan of Care", path: Routes.userPanel.planOfCare, icon: HeartPulse },
  { label: "Notes", path: Routes.userPanel.notes.index, icon: NotebookPen },
  { label: "Mileage", path: Routes.userPanel.mileage, icon: Car },
  { label: "Expenses", path: Routes.userPanel.expenses, icon: Receipt },
  {
    label: CARE_GROUP, path: Routes.userPanel.incident, icon: HandHeart,
    children: [
      { label: "Incidents", path: Routes.userPanel.incident },
      { label: "Community inclusion", path: Routes.userPanel.communityInclusion },
      { label: "Day program", path: Routes.userPanel.dayProgram },
    ],
  },
  { label: "Announcements", path: Routes.userPanel.announcements, icon: Megaphone },
  { label: "Support", path: Routes.userPanel.messages, icon: Headset },
  { label: "Help Center", path: Routes.userPanel.helpCenter, icon: CircleHelp },
  { label: "My Payroll", path: Routes.userPanel.payroll, icon: Wallet },
  { label: "Settings", path: Routes.userPanel.profile, icon: Settings },
];

// Faint diagonal lines on the help card, as in the design.
const helpCardPattern = {
  backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 32px)",
};

export function SidebarHelpCard({ to = Routes.userPanel.messages }: { to?: string }) {
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
        to={to}
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
  const carePanel = useCarePanel();
  const openCare = carePanel.open;
  const visibleNavItems = useMemo(() => isSc
    // Support coordinators don't run outings: Incident stays a plain menu item.
    ? navItems.filter((item) => !item.path || ![Routes.userPanel.notes.index, Routes.userPanel.planOfCare].includes(item.path))
      .map((item) => item.label === CARE_GROUP ? { label: "Incident", path: Routes.userPanel.incident, icon: TriangleAlert }
        : item.path === Routes.userPanel.shiftManagement ? { ...item, label: "Timesheets", path: Routes.userPanel.manualShiftManagement }
        : item.path === Routes.userPanel.clientsAndServices ? { ...item, label: "My Clients" } : item)
    : navItems.map((item) => item.label === CARE_GROUP ? {
      ...item,
      children: item.children?.map((child) =>
        child.path === Routes.userPanel.communityInclusion ? { ...child, onSelect: () => openCare("ci") }
        : child.path === Routes.userPanel.dayProgram ? { ...child, onSelect: () => openCare("day") } : child),
    } : item), [isSc, openCare]);
  const [collapsed] = useSidebarCollapsed();
  const userRole = roleLabel({ applicantType: user?.applicantType, role: user?.profile?.role || user?.role });

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
        userRole={userRole}
        userType={user?.userType || UserType.APPLICANT}
        onLogout={handleLogout}
        sidebarInset
        showSettings={false}
        variant="panel"
        accountMenu={<UserPanelAccountMenu roleLabel={userRole} onLogout={handleLogout} />}
      />
      <DashboardSidebar navItems={visibleNavItems} variant="brand" logo={brandSidebarLogo} footer={<SidebarHelpCard />} />
      <main className={`ml-0 ${collapsed ? "md:ml-[88px]" : "md:ml-[248px]"} pt-[98px] pb-10 transition-[margin] duration-200`}>
        <AnnouncementBanner endpoint="/employeePortal/announcements" viewAllPath={Routes.userPanel.announcements} className="mx-4 mb-4 sm:mx-8" />
        <div className="px-4 sm:px-8">{excludedPage ? <Navigate to={Routes.userPanel.dashboard} replace /> : isSc && location.pathname === Routes.userPanel.shiftManagement ? <Navigate to={Routes.userPanel.manualShiftManagement} replace /> : children ?? <Outlet />}</div>
      </main>
      {!isSc && <CiAttendancePanel program={carePanel.program} date={carePanel.date} view={carePanel.view} onClose={carePanel.close} />}
      <ScrollToTopButton />
    </div>}
    </ProtectedRoute>
  );
}

