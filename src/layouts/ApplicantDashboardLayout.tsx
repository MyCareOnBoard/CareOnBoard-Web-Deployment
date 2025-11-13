import type { ReactNode } from "react";
import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import { useAuth } from "@/utils/auth";
import { Routes } from "@/routes/constants";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardSidebar from "@/components/DashboardSidebar";


export default function ApplicantDashboardLayout({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate(Routes.auth.login, { replace: true });
    } catch (error) {
      console.error('[DashboardLayout] Logout failed:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate(Routes.auth.login, { replace: true });
    }
  }, [user]);

  return (
    <div className="relative min-h-screen bg-[#eef4f5] overflow-x-hidden">
      <DashboardHeader
        userName={user?.fullName} 
        userImage={(user as any)?.profileImage || user?.photoURL}
        userRole={(user as any)?.role || 'DSP'}
        onLogout={handleLogout} 
      />
      <DashboardSidebar />
      <main className="ml-[240px] pt-[130px] pb-10">
        <div className="px-8">{children ?? <Outlet />}</div>
      </main>
    </div>
  );
}

