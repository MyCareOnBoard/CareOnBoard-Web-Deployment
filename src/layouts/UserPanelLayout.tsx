import type {ReactNode} from "react";
import {useEffect} from "react";
import {Outlet, useNavigate} from "react-router";
import {useAuth} from "@/utils/auth";
import {Routes} from "@/routes/constants";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardSidebar, {NavItem} from "@/components/DashboardSidebar";
import {UserType} from "@/utils/auth/types/user.types";
import QuestionIcon from "@/assets/icons/question-mark-circle.svg?react";
import CogIcon from "@/assets/icons/cog.svg?react";
import HomeIcon from "@/assets/icons/home.svg?react";
import ExchangeIcon from "@/assets/icons/exchange-01.svg?react";
import ShareKnowledgeIcon from "@/assets/icons/share-knowledge.svg?react";
import ServiceIcon from "@/assets/icons/service.svg?react";
import NoteIcon from "@/assets/icons/note-01.svg?react";
import InvoiceIcon from "@/assets/icons/invoice-01.svg?react";
import UserRoadsideIcon from "@/assets/icons/user-roadside.svg?react";


const navItems: NavItem[] = [
  {label: "Dashboard", path: Routes.userPanel.dashboard, icon: HomeIcon},
  {label: "Shift Management", path: Routes.userPanel.shiftManagement, icon: ExchangeIcon},
  {label: "Clients & Services", path: Routes.userPanel.clientsAndServices, icon: ShareKnowledgeIcon},
  {label: "Plan of Care", path: Routes.userPanel.planOfCare, icon: ServiceIcon},
  {label: "Notes", path: Routes.userPanel.notes.index, icon: NoteIcon},
  {label: "Mileage", path: Routes.userPanel.mileage, icon: UserRoadsideIcon},
  {label: "Expenses", path: Routes.userPanel.expenses, icon: InvoiceIcon},
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


export default function UserPanelDashboardLayout({children}: { children?: ReactNode }) {
  const {user, logout} = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate(Routes.auth.login, {replace: true});
    } catch (error) {    }
  };

  useEffect(() => {
    if (!user || (user?.userType !== UserType.EMPLOYEE)) {
      navigate(Routes.auth.login, {replace: true});
    }
  }, [user]);

  return (
    <div className="relative min-h-screen bg-[#eef4f5] overflow-x-hidden">
      <DashboardHeader
        userName={user?.fullName}
        userImage={(user as any)?.profileImage || user?.photoURL}
        userRole={(user as any)?.role || 'DSP'}
        userType={user?.userType || UserType.APPLICANT}
        onLogout={handleLogout}
      />
      <DashboardSidebar navItems={navItems}/>
      <main className="ml-[240px] pt-[130px] pb-10">
        <div className="px-8">{children ?? <Outlet/>}</div>
      </main>
    </div>
  );
}

