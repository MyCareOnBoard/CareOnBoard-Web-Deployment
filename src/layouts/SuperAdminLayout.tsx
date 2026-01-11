import type {ReactNode} from "react";
import {useEffect} from "react";
import {Outlet, useNavigate} from "react-router";
import {useAuth} from "@/utils/auth";
import {Routes} from "@/routes/constants";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardSidebar, {NavItem} from "@/components/DashboardSidebar";
import {UserType} from "@/utils/auth/types/user.types";
import {
  Home,
  Building2,
  Users,
  Shield,
  FileText,
  DollarSign,
  HelpCircle,
  BarChart3,
  ChartGantt,
  Settings,
  UserLock
} from "lucide-react";

const navItems: NavItem[] = [
  {label: "Dashboard", path: Routes.superAdmin.dashboard, icon: Home},
  {label: "Agency directory", path: Routes.superAdmin.agencies, icon: Building2},
  {label: "User Access Control", path: Routes.superAdmin.userAccessControl, icon: Users},
  {label: "Compliance Monitor", path: Routes.superAdmin.complianceMonitor, icon: Shield},
  {label: "Global Notes Quality", path: Routes.superAdmin.globalNotesQuality, icon: FileText},
  {label: "Agency Billing Monitor", path: Routes.superAdmin.agencyBillingMonitor, icon: DollarSign},
  {label: "Corporate Support", path: Routes.superAdmin.corporateSupport, icon: HelpCircle},
  {label: "Oversight Center", path: Routes.superAdmin.oversightCenter, icon: BarChart3},
  {label: "Clients Directory", path: Routes.superAdmin.clientDirectory, icon: UserLock},
  {label: "Reports", path: Routes.superAdmin.reports, icon: ChartGantt},
  {label: "System Settings", path: Routes.superAdmin.systemSettings, icon: Settings},
];

export default function SuperAdminLayout({children}: { children?: ReactNode }) {
  const {user, logout} = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate(Routes.auth.login, {replace: true});
    } catch (error) {
      console.error('[SuperAdminLayout] Logout failed:', error);
    }
  };

  useEffect(() => {
    if (!user || (user?.userType !== UserType.SUPER_ADMIN)) {
      navigate(Routes.auth.login, {replace: true});
    }
  }, [user]);

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
