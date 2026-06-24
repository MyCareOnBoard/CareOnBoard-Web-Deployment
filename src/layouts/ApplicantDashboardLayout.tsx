import type {ReactNode} from "react";
import {useEffect} from "react";
import {Outlet, useNavigate} from "react-router";
import {useAuth} from "@/utils/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardSidebar, {NavItem} from "@/components/DashboardSidebar";
import {useSidebarCollapsed} from "@/hooks/useSidebarCollapsed";
import {UserType} from "@/utils/auth/types/user.types";
import {Routes} from "@/routes/constants";
import QuestionIcon from "@/assets/icons/question-mark-circle.svg?react";
import UserIcon from "@/assets/icons/user.svg?react";
import FileIcon from "@/assets/icons/file.svg?react";
import CogIcon from "@/assets/icons/cog.svg?react";
import HomeIcon from "@/assets/icons/home.svg?react";
import { Megaphone } from "lucide-react";


export default function ApplicantDashboardLayout({children}: { children?: ReactNode }) {
  const {user, logout} = useAuth();
  const navigate = useNavigate();
  const [collapsed] = useSidebarCollapsed();

  const handleLogout = async () => {
    try {
      await logout();
      navigate(Routes.auth.login, {replace: true});
    } catch (error) {
      console.error('[DashboardLayout] Logout failed:', error);
    }
  };

  const navItems: NavItem[] = [
    {label: "Dashboard", path: Routes.applicant.dashboard, icon: HomeIcon},
    {label: "Application", path: Routes.applicant.application, icon: UserIcon},
    {label: "Documents", path: Routes.applicant.documents, icon: FileIcon},
    {label: "Announcements", path: Routes.applicant.announcements, icon: Megaphone},
    {
      label: "Help Center",
      path: Routes.applicant.helpCenter,
      icon: QuestionIcon
    },
    {
      label: "Settings",
      path: Routes.applicant.settings,
      icon: CogIcon
    },
  ];

  useEffect(() => {
    if (!user || (user?.userType !== UserType.APPLICANT)) {
      navigate(Routes.auth.login, {replace: true});
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
      <DashboardSidebar navItems={navItems}/>
      <main className={`ml-0 ${collapsed ? "md:ml-[112px]" : "md:ml-[240px]"} pt-[130px] pb-10 transition-[margin] duration-200`}>
        <div className="px-8">{children ?? <Outlet/>}</div>
      </main>
    </div>
    </ProtectedRoute>
  );
}

