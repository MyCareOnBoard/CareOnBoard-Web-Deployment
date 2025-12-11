import type {ReactNode} from "react";
import {useEffect} from "react";
import {Outlet, useNavigate} from "react-router";
import {useAuth} from "@/utils/auth";
import {Routes} from "@/routes/constants";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardSidebar, {NavItem} from "@/components/DashboardSidebar";
import {UserType} from "@/utils/auth/types/user.types";
import {Building2} from "lucide-react";

const navItems: NavItem[] = [
  {label: "Agency Management", path: Routes.superAdmin.agencies, icon: Building2},
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
