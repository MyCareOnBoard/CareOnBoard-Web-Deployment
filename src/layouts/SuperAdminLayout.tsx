import type {ReactNode} from "react";
import {useEffect, useMemo} from "react";
import {matchPath, Outlet, useNavigate, useLocation} from "react-router";
import {useAuth} from "@/utils/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {Routes} from "@/routes/constants";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardSidebar, {NavItem} from "@/components/DashboardSidebar";
import {useSidebarCollapsed} from "@/hooks/useSidebarCollapsed";
import {UserType} from "@/utils/auth/types/user.types";
import {
  Home,
  Building2,
  Users,
  UsersRound,
  Shield,
  FileText,
  DollarSign,
  HelpCircle,
  BarChart3,
  ChartGantt,
  Settings,
  UserLock,
  Contact,
  Briefcase,
  CalendarRange,
} from "lucide-react";

const allNavItems: NavItem[] = [
  {label: "Dashboard", path: Routes.superAdmin.dashboard, icon: Home}, // Always accessible
  {label: "Agency directory", path: Routes.superAdmin.agencies, icon: Building2, accessKey: "Agency Directory"},
  {label: "Clients Directory", path: Routes.superAdmin.clientDirectory, icon: UserLock, accessKey: "Clients Directory"},
  {label: "Staff Directory", path: Routes.superAdmin.staffDirectory, icon: Contact, accessKey: "Staff Directory"},
  {label: "Shift Management", path: Routes.superAdmin.shifts.index, icon: CalendarRange, accessKey: "Shift Management"},
  {label: "User Access Control", path: Routes.superAdmin.userAccessControl, icon: Users, accessKey: "User Access Control"},
  {label: "Compliance Monitor", path: Routes.superAdmin.complianceMonitor, icon: Shield, accessKey: "Compliance Monitor"},
  {label: "Billing Management", path: Routes.superAdmin.billing.index, icon: DollarSign, accessKey: "Billing Management"},
  {label: "Global Notes Quality", path: Routes.superAdmin.globalNotesQuality, icon: FileText, accessKey: "Global Notes Quality"},
  {label: "Agency Billing Monitor", path: Routes.superAdmin.agencyBillingMonitor, icon: DollarSign, accessKey: "Agency Billing Monitor"},
  {label: "Corporate Support", path: Routes.superAdmin.corporateSupport, icon: HelpCircle, accessKey: "Corporate Support"},
  {label: "Oversight Center", path: Routes.superAdmin.oversightCenter, icon: BarChart3, accessKey: "Oversight Center"},
  {label: "Reports", path: Routes.superAdmin.reports.index, icon: ChartGantt, accessKey: "Reports"},
  {label: "Services", path: Routes.superAdmin.services, icon: Briefcase, accessKey: "Services"},
  {label: "System Settings", path: Routes.superAdmin.systemSettings, icon: Settings, accessKey: "System Settings"},
];

function withCurrentSearch(path: string, search: string): string {
  return search ? `${path}${search}` : path;
}

function getNavItemsWithBillingChildren(search: string): NavItem[] {
  return allNavItems.map((item) => {
    if (item.path !== Routes.superAdmin.billing.index) return item;

    return {
      ...item,
      children: [
        {label: "Financial overview", path: withCurrentSearch(Routes.superAdmin.billing.financialOverview, search)},
        {label: "Payroll management", path: withCurrentSearch(Routes.superAdmin.billing.payrollManagement, search)},
        {label: "Claims dashboard", path: withCurrentSearch(Routes.superAdmin.billing.claims, search)},
        {label: "Expenses", path: withCurrentSearch(Routes.superAdmin.billing.expenses, search)},
        {label: "Submitted timesheets", path: withCurrentSearch(Routes.superAdmin.billing.staffTimesheets, search)},
      ],
    };
  });
}

function mostSpecificNavItem(pathname: string): NavItem | undefined {
  if (pathname === Routes.superAdmin.shifts.maintenance) {
    return {
      label: "Shift Management",
      path: Routes.superAdmin.shifts.maintenance,
      icon: CalendarRange,
      accessKey: "Shift Maintenance",
    };
  }

  return allNavItems
    .filter((item) => item.path && matchPath({ path: item.path, end: false }, pathname))
    .sort((left, right) => (right.path?.length ?? 0) - (left.path?.length ?? 0))[0];
}

export default function SuperAdminLayout({children}: { children?: ReactNode }) {
  const {user, logout} = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed] = useSidebarCollapsed();
  const currentNavItem = mostSpecificNavItem(location.pathname);
  const canRenderCurrentRoute = !currentNavItem?.accessKey
    || Boolean(user?.profile?.accessList?.includes(currentNavItem.accessKey));

  const handleLogout = async () => {
    try {
      await logout();
      navigate(Routes.auth.login, {replace: true});
    } catch (error) {
      console.error('[SuperAdminLayout] Logout failed:', error);
    }
  };

  const navItems = useMemo(() => {
    const items = getNavItemsWithBillingChildren(location.search);
    if (!user?.profile?.accessList) {
      return items.filter(item => !item.accessKey);
    }

    const accessList = user.profile.accessList;
    const canManageShifts = accessList.includes("Shift Management");
    const canMaintainShifts = accessList.includes("Shift Maintenance");
    
    return items.flatMap(item => {
      if (!item.accessKey) return [item];

      if (item.path === Routes.superAdmin.shifts.index) {
        if (!canManageShifts && !canMaintainShifts) return [];
        return [{
          ...item,
          path: canManageShifts
            ? Routes.superAdmin.shifts.index
            : Routes.superAdmin.shifts.maintenance,
        }];
      }
      
      return accessList.includes(item.accessKey) ? [item] : [];
    });
  }, [location.search, user?.profile?.accessList]);

  useEffect(() => {
    if (!user || (user?.userType !== UserType.SUPER_ADMIN)) {
      navigate(Routes.auth.login, {replace: true});
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    if (!currentNavItem || !currentNavItem.accessKey) {
      return;
    }

    const userAccessList = user.profile?.accessList || [];
    const hasAccess = userAccessList.includes(currentNavItem.accessKey);

    if (!hasAccess) {
      console.warn(`[SuperAdminLayout] Access denied to ${currentNavItem.label}. Redirecting to dashboard.`);
      navigate(Routes.superAdmin.dashboard, {replace: true});
    }
  }, [user, currentNavItem, navigate]);

  return (
    <ProtectedRoute>
    <div className="relative min-h-screen bg-[#eef4f5] overflow-x-hidden">
      <DashboardHeader
        userName={user?.fullName}
        userImage={user?.profilePicture || user?.photo || user?.photoURL || user?.profile?.profilePicture}
        userRole={user?.profile?.role || "Super Admin"}
        userType={user?.userType || UserType.SUPER_ADMIN}
        onLogout={handleLogout}
      />
      <DashboardSidebar navItems={navItems}/>
      <main className={`ml-0 ${collapsed ? "md:ml-[112px]" : "md:ml-[240px]"} pt-[130px] pb-10 transition-[margin] duration-200`}>
        <div className="px-8">{canRenderCurrentRoute ? (children ?? <Outlet/>) : null}</div>
      </main>
    </div>
    </ProtectedRoute>
  );
}
