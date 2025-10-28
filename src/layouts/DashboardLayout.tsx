import type { ComponentType, ReactNode } from "react";
import { useMemo, useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate, Navigate } from "react-router";
import { ChevronDown, ChevronUp, User, Settings, LogOut } from "lucide-react";
import { useSelector } from "react-redux";

import { cn } from "@/lib/utils";
import { useAuth } from "@/utils/auth";
import type { RootState } from "@/store/redux/store";
import { PageLoader } from "@/components/ui/loader";

import BellIcon from "@/assets/icons/bell.svg?react";
import CogIcon from "@/assets/icons/cog.svg?react";
import FileIcon from "@/assets/icons/file.svg?react";
import HomeIcon from "@/assets/icons/home.svg?react";
import LogoNameIcon from "@/assets/icons/logo-name.svg?react";
import QuestionIcon from "@/assets/icons/question-mark-circle.svg?react";
import UserIcon from "@/assets/icons/user.svg?react";
import { Routes } from "@/routes/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { label: "Dashboard", path: Routes.dashboard, icon: HomeIcon },
  { label: "Application", path: Routes.application, icon: UserIcon },
  { label: "Documents", path: Routes.documents, icon: FileIcon },
  { label: "Help Center", path: Routes.helpCenter, icon: QuestionIcon },
];

function HeaderActionButton({ icon: Icon, ariaLabel }: { icon: ComponentType<{ className?: string }>; ariaLabel: string }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="grid h-[42px] w-[42px] place-items-center rounded-[50px] border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.5)] text-[#808081] backdrop-blur-[22px] cursor-pointer hover:bg-[rgba(255,255,255,0.7)] hover:border-[rgba(255,255,255,0.5)] transition-all duration-200"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

export function Header({ actions }: { actions?: ReactNode }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 h-[98px] bg-[#eef4f5]">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <LogoNameIcon className="w-[226px]" />
        </div>

        {actions ?? (
          <div className="flex items-center gap-[10px]">
            <HeaderActionButton icon={CogIcon} ariaLabel="Settings" />
            <div className="relative">
              <HeaderActionButton icon={BellIcon} ariaLabel="Notifications" />
              {/* <span className="absolute right-[9px] top-[9px] block h-[10px] w-[10px] rounded-full bg-[#d53411]" /> */}
            </div>
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 rounded-[60px] border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.5)] px-[5px] py-[5px] backdrop-blur-[22px] hover:bg-[rgba(255,255,255,0.6)] transition-colors cursor-pointer">
                  <img src="/src/assets/icons/images/user-profile-image.png" alt="User profile" className="h-[34px] w-[34px] rounded-full object-cover" />
                  <p className="pr-[12px] text-sm font-medium leading-[1.4] text-[#10141a]">Nola Hawkins</p>
                  {isDropdownOpen ? (
                    <ChevronUp className="h-4 w-4 text-[#808081] mr-2" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[#808081] mr-2" />
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 z-[100] bg-white">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </header>
  );
}

export function Sidebar({ footer }: { footer?: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const activePath = useMemo(() => {
    const match = navItems.find(({ path }) => location.pathname === path);
    return match?.path ?? Routes.dashboard;
  }, [location.pathname]);

  return (
    <aside className="fixed left-[42.5px] top-[130px] z-40 w-[156px] space-y-3 bg-[#eef4f5]">
      <nav className="space-y-1">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = activePath === path;
          return (
            <button
              key={label}
              type="button"
              onClick={() => navigate(path)}
              className={cn(
                "flex h-[52px] w-full items-center gap-3 rounded-[60px] px-4 text-sm font-semibold backdrop-blur-[22px] transition cursor-pointer",
                isActive ? "bg-[#00b4b8] font-medium text-white" : "font-medium text-[#808081] hover:bg-white/40"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5",
                  isActive
                    ? "[&_*]:stroke-white [&_*]:fill-transparent [&_path]:stroke-white [&_path]:fill-transparent [&_circle]:stroke-white [&_circle]:fill-transparent [&_rect]:stroke-white [&_rect]:fill-transparent"
                    : "[&_*]:stroke-[#808081] [&_*]:fill-transparent [&_path]:stroke-[#808081] [&_path]:fill-transparent [&_circle]:stroke-[#808081] [&_circle]:fill-transparent [&_rect]:stroke-[#808081] [&_rect]:fill-transparent"
                )}
              />
              {label}
            </button>
          );
        })}
      </nav>
      {footer}
    </aside>
  );
}

export default function DashboardLayout({ children }: { children?: ReactNode }) {
  const { user, loading } = useAuth();
  const reduxUser = useSelector((state: RootState) => state.auth?.user);

  useEffect(() => {
    console.log('[DashboardLayout] Auth check:', { 
      user: user?.email, 
      loading,
      reduxUser: reduxUser?.email 
    });
  }, [user, loading, reduxUser]);

  if (loading) {
    console.log('[DashboardLayout] Still loading...');
    return <PageLoader text="Checking authentication..." />;
  }

  // if (!user) {
  //   console.log('[DashboardLayout] No user, redirecting to login');
  //   return <Navigate to={Routes.login} replace />;
  // }

  console.log('[DashboardLayout] User authenticated, rendering dashboard layout');
  return (
    <div className="relative min-h-screen bg-[#eef4f5] overflow-x-hidden">
      <Header />
      <Sidebar />
      <main className="ml-[240px] pt-[130px] pb-10">
        <div className="px-8">{children ?? <Outlet />}</div>
      </main>
    </div>
  );
}

