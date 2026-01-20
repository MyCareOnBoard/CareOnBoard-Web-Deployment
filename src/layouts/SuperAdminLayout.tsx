import type {ReactNode} from "react";
import {useEffect, useMemo} from "react";
import {Outlet, useNavigate, useLocation} from "react-router";
import {useAuth} from "@/utils/auth";
import {Routes} from "@/routes/constants";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardSidebar, {NavItem} from "@/components/DashboardSidebar";
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
} from "lucide-react";

const allNavItems: NavItem[] = [
  {label: "Dashboard", path: Routes.superAdmin.dashboard, icon: Home}, // Always accessible
  {label: "Agency directory", path: Routes.superAdmin.agencies, icon: Building2, accessKey: "Agency Directory"},
  {label: "User Access Control", path: Routes.superAdmin.userAccessControl, icon: Users, accessKey: "User Access Control"},
  {label: "Compliance Monitor", path: Routes.superAdmin.complianceMonitor, icon: Shield, accessKey: "Compliance Monitor"},
  {label: "Global Notes Quality", path: Routes.superAdmin.globalNotesQuality, icon: FileText, accessKey: "Global Notes Quality"},
  {label: "Agency Billing Monitor", path: Routes.superAdmin.agencyBillingMonitor, icon: DollarSign, accessKey: "Agency Billing Monitor"},
  {label: "Corporate Support", path: Routes.superAdmin.corporateSupport, icon: HelpCircle, accessKey: "Corporate Support"},
  {label: "Oversight Center", path: Routes.superAdmin.oversightCenter, icon: BarChart3, accessKey: "Oversight Center"},
  {label: "Clients Directory", path: Routes.superAdmin.clientDirectory, icon: UserLock, accessKey: "Clients Directory"},
  {label: "Reports", path: Routes.superAdmin.reports.index, icon: ChartGantt, accessKey: "Reports"},
  {label: "System Settings", path: Routes.superAdmin.systemSettings, icon: Settings, accessKey: "System Settings"},
];

export default function SuperAdminLayout({children}: { children?: ReactNode }) {
  const {user, logout} = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate(Routes.auth.login, {replace: true});
    } catch (error) {
      console.error('[SuperAdminLayout] Logout failed:', error);
    }
  };

  const navItems = useMemo(() => {
    if (!user?.profile?.accessList) {
      return allNavItems.filter(item => !item.accessKey);
    }

    const accessList = user.profile.accessList;
    
    return allNavItems.filter(item => {
      if (!item.accessKey) return true;
      
      return accessList.includes(item.accessKey);
    });
  }, [user?.profile?.accessList]);

  useEffect(() => {
    if (!user || (user?.userType !== UserType.SUPER_ADMIN)) {
      navigate(Routes.auth.login, {replace: true});
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const currentPath = location.pathname;
    
    const currentNavItem = allNavItems.find(item => currentPath.includes(item.path));
    
    if (!currentNavItem || !currentNavItem.accessKey) {
      return;
    }

    const userAccessList = user.profile?.accessList || [];
    const hasAccess = userAccessList.includes(currentNavItem.accessKey);

    if (!hasAccess) {
      console.warn(`[SuperAdminLayout] Access denied to ${currentNavItem.label}. Redirecting to dashboard.`);
      navigate(Routes.superAdmin.dashboard, {replace: true});
    }
  }, [user, location.pathname, navigate]);

  return (
    <div className="relative min-h-screen bg-[#eef4f5] overflow-x-hidden">
      <DashboardHeader
        userName={user?.fullName}
        userImage={(user as any)?.profileImage || user?.photoURL}
        userRole="Super Admin"
        userType={user?.userType || UserType.SUPER_ADMIN}
        onLogout={handleLogout}
      />
      <DashboardSidebar navItems={navItems}/>
      <main className="ml-[240px] pt-[130px] pb-10">
        <div className="px-8">{children ?? <Outlet/>}</div>
      </main>
    </div>
  );
}
