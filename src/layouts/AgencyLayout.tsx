import type { ReactNode } from "react";
import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
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
import {
  UserRoundPlus,
  UsersRound,
  CalendarDays,
  NotepadText,
  ReceiptText,
  Network,
  MapPin,
  Settings,
  AlertTriangle,
  FileText,
} from "lucide-react";
import MessageIcon from "@/assets/icons/message-outline.svg?react";


const navItems: NavItem[] = [
    { label: "Dashboard", path: Routes.agency.dashboard, icon: HomeIcon },
    { label: "DSP Management", path: Routes.agency.dspManagement, icon: UserRoundPlus },
    { label: "Client Management", path: Routes.agency.clients, icon: UsersRound },
    { label: "Community Inclusion", path: Routes.agency.communityInclusions, icon: FileText },
    { label: "Scheduling", path: Routes.agency.scheduling, icon: NotepadText },
    { label: "Notes", path: Routes.agency.notes, icon: CalendarDays },
    { label: "Billing & Management", path: Routes.agency.billingAndApprovals, icon: ReceiptText },
    { label: "AI Automation", path: Routes.agency.aiAutomation, icon: AiIcon },
    { label: "Support", path: Routes.agency.support, icon: SupportIcon },
    { label: "Analytics", path: Routes.agency.analytics, icon: AnalyticsIcon },
    { label: "Applicant Directory", path: Routes.agency.applicantDirectory, icon: ApplicantDirectoryIcon },
    { label: "Reports", path: Routes.agency.reports.index, icon: ReportIcon },
    { label: "Goals & Documents", path: Routes.agency.goalsAndDocuments.index, icon: FileText },
    { label: "Trainings", path: Routes.agency.trainings, icon: Network },
    { label: "Mileage", path: Routes.agency.mileage, icon: MapPin },
    { label: "Incident", path: Routes.agency.incident, icon: AlertTriangle },
    { label: "Messages", path: Routes.agency.messages, icon: MessageIcon },
    { label: "Settings", path: Routes.agency.settings, icon: Settings },
];


export default function AgencyDashboardLayout({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate(Routes.auth.login, { replace: true });
    } catch (error) {
      console.error("[DashboardLayout] Logout failed:", error);
    }
  };

  useEffect(() => {
    if (!user || user?.userType !== UserType.AGENCY) {
      navigate(Routes.auth.login, { replace: true });
    }
  }, [user]);

  return (
    <div className="relative min-h-screen bg-[#eef4f5] overflow-x-hidden">
      <DashboardHeader
        userName={user?.fullName}
        userImage={(user as any)?.profileImage || user?.photoURL}
        userRole={(user as any)?.role || "DSP"}
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

