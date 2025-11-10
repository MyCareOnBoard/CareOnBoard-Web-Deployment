import type { ComponentType, ReactNode } from "react";
import { useMemo, useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate, Navigate } from "react-router";
import { ChevronDown, ChevronUp, User, Settings, LogOut, Lock, HelpCircle } from "lucide-react";
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
import { getUserProfile, UserProfile } from "@/lib/api/users";

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
  { label: "Settings", path: Routes.settings, icon: CogIcon },
];

function HeaderActionButton({ icon: Icon, ariaLabel, onClick }: { icon: ComponentType<{ className?: string }>; ariaLabel: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="grid h-[42px] w-[42px] place-items-center rounded-[50px] border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.5)] text-[#808081] backdrop-blur-[22px] cursor-pointer hover:bg-[rgba(255,255,255,0.7)] hover:border-[rgba(255,255,255,0.5)] transition-all duration-200"
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}

function UserAvatar({ userName, userImage }: { userName?: string; userImage?: string }) {
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (userImage) {
    return (
      <img 
        src={userImage} 
        alt="User profile" 
        className="h-[34px] w-[34px] rounded-full object-cover"
        onError={(e) => {
          // Hide the image and show initials if image fails to load
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  return (
    <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-white text-xs font-semibold">
      {getInitials(userName)}
    </div>
  );
}

export function Header({ actions, userName, userImage, userRole, onLogout }: { actions?: ReactNode; userName?: string; userImage?: string; userRole?: string; onLogout?: () => void }) {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  return (
    <header className="fixed left-0 right-0 top-0 z-50 h-[98px] bg-[#eef4f5]">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <LogoNameIcon className="w-[226px]" />
        </div>

        {actions ?? (
          <div className="flex items-center gap-[10px]">
            <HeaderActionButton 
              icon={CogIcon} 
              ariaLabel="Settings" 
              onClick={() => navigate(Routes.settings)}
            />
            <DropdownMenu open={isNotificationDropdownOpen} onOpenChange={setIsNotificationDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Notifications"
                    className="grid h-[42px] w-[42px] place-items-center rounded-[50px] border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.5)] text-[#808081] backdrop-blur-[22px] cursor-pointer hover:bg-[rgba(255,255,255,0.7)] hover:border-[rgba(255,255,255,0.5)] transition-all duration-200"
                  >
                    <BellIcon className="w-5 h-5" />
                  </button>
                  {/* <span className="absolute right-[9px] top-[9px] block h-[10px] w-[10px] rounded-full bg-[#d53411]" /> */}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[320px] z-[100] bg-[#f3f6f7] border-[#e5e5e6] rounded-[12px] p-0 backdrop-blur-sm">
                {/* Notifications Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(239,239,239,0.08)]">
                  <h3 className="text-[16px] font-semibold text-[#10141a]">Notifications</h3>
                  <span className="text-[12px] font-medium text-[#00b4b8] cursor-pointer hover:underline">
                    Mark all as read
                  </span>
                </div>
                
                {/* Empty State */}
                <div className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/50">
                      <BellIcon className="w-8 h-8 text-[#b2b2b3]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[14px] font-semibold text-[#10141a]">No notifications yet</p>
                      <p className="text-[12px] font-medium text-[#808081]">You'll see updates here when there's activity</p>
                    </div>
                  </div>
                </div>
                
                {/* Footer */}
                <div className="border-t border-[rgba(239,239,239,0.08)]">
                  <button
                    className="w-full px-4 py-3 text-[14px] font-semibold text-[#00b4b8] hover:bg-white/30 transition-colors"
                    onClick={() => {
                      setIsNotificationDropdownOpen(false);
                      // Navigate to notifications page when implemented
                    }}
                  >
                    View all notifications
                  </button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu open={isUserDropdownOpen} onOpenChange={setIsUserDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 rounded-[60px] border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.5)] px-[5px] py-[5px] backdrop-blur-[22px] hover:bg-[rgba(255,255,255,0.6)] transition-colors cursor-pointer">
                  <UserAvatar userName={userName} userImage={userImage} />
                  <p className="pr-[12px] text-sm font-medium leading-[1.4] text-[#10141a]">{userName || 'User'}</p>
                  {isUserDropdownOpen ? (
                    <ChevronUp className="h-4 w-4 text-[#808081] mr-2" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[#808081] mr-2" />
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[214px] z-[100] bg-[#f3f6f7] border-[#e5e5e6] rounded-[12px] p-0 backdrop-blur-sm">
                {/* <div className="flex items-center gap-3 p-3 border-b border-[rgba(239,239,239,0.08)]">
                  <UserAvatar userName={userName} userImage={userImage} />
                  <div className="flex flex-col gap-1 flex-1">
                    <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
                      {userName || 'User'}
                    </p>
                    <p className="text-[12px] font-medium leading-[normal] text-[#808081]">
                      {userRole || 'DSP'}
                    </p>
                  </div>
                </div> */}
                <div className="py-0">
                  <DropdownMenuItem 
                    className={cn(
                      "cursor-pointer px-4 py-2 rounded-none gap-3",
                      location.pathname === Routes.profile
                        ? "bg-[#e5effa] text-[#00b4b8] hover:bg-[#e5effa] hover:text-[#00b4b8] focus:bg-[#e5effa] focus:text-[#00b4b8]"
                        : "hover:bg-white/50 focus:bg-white/50"
                    )}
                    onClick={() => navigate(Routes.profile)}
                  >
                    <User className={cn("w-4 h-4", location.pathname === Routes.profile ? "text-[#00b4b8]" : "text-[#808081]")} />
                    <span className={cn(
                      "text-[14px]",
                      location.pathname === Routes.profile ? "font-semibold text-[#00b4b8]" : "font-medium text-[#808081]"
                    )}>Profile</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    className={cn(
                      "cursor-pointer px-4 py-2 rounded-none gap-3",
                      location.pathname === Routes.settings
                        ? "bg-[#e5effa] text-[#00b4b8] hover:bg-[#e5effa] hover:text-[#00b4b8] focus:bg-[#e5effa] focus:text-[#00b4b8]"
                        : "hover:bg-white/50 focus:bg-white/50"
                    )}
                    onClick={() => navigate(Routes.settings)}
                  >
                    <Lock className={cn("w-4 h-4", location.pathname === Routes.settings ? "text-[#00b4b8]" : "text-[#808081]")} />
                    <span className={cn(
                      "text-[14px]",
                      location.pathname === Routes.settings ? "font-semibold text-[#00b4b8]" : "font-medium text-[#808081]"
                    )}>Settings</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    className={cn(
                      "cursor-pointer px-4 py-2 rounded-none gap-3",
                      location.pathname === Routes.helpCenter
                        ? "bg-[#e5effa] text-[#00b4b8] hover:bg-[#e5effa] hover:text-[#00b4b8] focus:bg-[#e5effa] focus:text-[#00b4b8]"
                        : "hover:bg-white/50 focus:bg-white/50"
                    )}
                    onClick={() => navigate(Routes.helpCenter)}
                  >
                    <HelpCircle className={cn("w-4 h-4", location.pathname === Routes.helpCenter ? "text-[#00b4b8]" : "text-[#808081]")} />
                    <span className={cn(
                      "text-[14px]",
                      location.pathname === Routes.helpCenter ? "font-semibold text-[#00b4b8]" : "font-medium text-[#808081]"
                    )}>Help Center</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="cursor-pointer hover:bg-white/50 focus:bg-white/50 px-4 py-2 rounded-none gap-3"
                  >
                    <LogOut className="w-4 h-4 text-[#d53411]" />
                    <span className="font-medium text-[14px] text-[#d53411]">Logout</span>
                  </DropdownMenuItem>
                </div>
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
    return match?.path ?? '';
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
  const { user, logout } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate(Routes.login, { replace: true });
    } catch (error) {
      console.error('[DashboardLayout] Logout failed:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate(Routes.login, { replace: true });
    }
    const fetchUserProfile = async () => {
      try {
        const userInfo = await getUserProfile();
        console.log("🚀 User Profile:", userInfo);
        setUserProfile(userInfo);
      } catch (error) {
        console.error("🚨 Error fetching user profile:", error);
      }
    };
    fetchUserProfile();
  }, [user]);

  return (
    <div className="relative min-h-screen bg-[#eef4f5] overflow-x-hidden">
      <Header 
        userName={user?.fullName} 
        userImage={(user as any)?.profileImage || user?.photoURL}
        userRole={(user as any)?.role || 'DSP'}
        onLogout={handleLogout} 
      />
      <Sidebar />
      <main className="ml-[240px] pt-[130px] pb-10">
        <div className="px-8">{children ?? <Outlet />}</div>
      </main>
    </div>
  );
}

