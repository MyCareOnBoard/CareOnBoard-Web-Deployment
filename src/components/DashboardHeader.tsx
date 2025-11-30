import {ReactNode, useState, ComponentType} from "react";
import {useLocation, useNavigate} from "react-router";
import {Routes} from "@/routes/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BellIcon from "@/assets/icons/bell.svg?react";
import CogIcon from "@/assets/icons/cog.svg?react";
import LogoNameIcon from "@/assets/icons/green-black-logo.svg?react";
import { ChevronDown, ChevronUp, User, LogOut, Lock, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {UserType} from "@/lib/api/users";


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
  const [imageError, setImageError] = useState(false);
  
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Show initials if no image or image failed to load
  if (!userImage || imageError) {
    return (
      <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-white text-xs font-semibold">
        {getInitials(userName)}
      </div>
    );
  }

  return (
    <img
      src={userImage}
      alt="User profile"
      className="h-[34px] w-[34px] rounded-full object-cover"
      onError={() => {
        console.warn('⚠️ Failed to load profile image:', userImage);
        setImageError(true);
      }}
    />
  );
}

export default function DashboardHeader(
  { actions, userName, userImage, onLogout, userType }: {
    actions?: ReactNode;
    userName?: string;
    userImage?: string;
    userRole?: string;
    userType?: string;
    onLogout?: () => void
  }) {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const makeCommonRoute = (route: string) => {
    const userTypeKeys = {
      [UserType.APPLICANT]: "applicant",
      [UserType.USER]: "user-panel",
      [UserType.AGENCY]: "agency",
    }
    return route.replace(':userType', userTypeKeys[userType as UserType] || 'applicant');
  }
  
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
              onClick={() => navigate(makeCommonRoute(Routes.common.settings))}
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
                <div className="py-0">
                  <DropdownMenuItem 
                    className={cn(
                      "cursor-pointer px-4 py-2 rounded-none gap-3",
                      location.pathname === makeCommonRoute(Routes.common.profile)
                        ? "bg-[#e5effa] text-[#00b4b8] hover:bg-[#e5effa] hover:text-[#00b4b8] focus:bg-[#e5effa] focus:text-[#00b4b8]"
                        : "hover:bg-white/50 focus:bg-white/50"
                    )}
                    onClick={() => navigate(makeCommonRoute(Routes.common.profile))}
                  >
                    <User className={cn("w-4 h-4", location.pathname === makeCommonRoute(Routes.common.profile) ? "text-[#00b4b8]" : "text-[#808081]")} />
                    <span className={cn(
                      "text-[14px]",
                      location.pathname === makeCommonRoute(Routes.common.profile) ? "font-semibold text-[#00b4b8]" : "font-medium text-[#808081]"
                    )}>Profile</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    className={cn(
                      "cursor-pointer px-4 py-2 rounded-none gap-3",
                      location.pathname === makeCommonRoute(Routes.common.settings)
                        ? "bg-[#e5effa] text-[#00b4b8] hover:bg-[#e5effa] hover:text-[#00b4b8] focus:bg-[#e5effa] focus:text-[#00b4b8]"
                        : "hover:bg-white/50 focus:bg-white/50"
                    )}
                    onClick={() => navigate(makeCommonRoute(Routes.common.settings))}
                  >
                    <Lock className={cn("w-4 h-4", location.pathname === makeCommonRoute(Routes.common.settings) ? "text-[#00b4b8]" : "text-[#808081]")} />
                    <span className={cn(
                      "text-[14px]",
                      location.pathname === makeCommonRoute(Routes.common.settings) ? "font-semibold text-[#00b4b8]" : "font-medium text-[#808081]"
                    )}>Settings</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    className={cn(
                      "cursor-pointer px-4 py-2 rounded-none gap-3",
                      location.pathname === makeCommonRoute(Routes.common.helpCenter)
                        ? "bg-[#e5effa] text-[#00b4b8] hover:bg-[#e5effa] hover:text-[#00b4b8] focus:bg-[#e5effa] focus:text-[#00b4b8]"
                        : "hover:bg-white/50 focus:bg-white/50"
                    )}
                    onClick={() => navigate(makeCommonRoute(Routes.common.helpCenter))}
                  >
                    <HelpCircle className={cn("w-4 h-4", location.pathname === makeCommonRoute(Routes.common.helpCenter) ? "text-[#00b4b8]" : "text-[#808081]")} />
                    <span className={cn(
                      "text-[14px]",
                      location.pathname === makeCommonRoute(Routes.common.helpCenter) ? "font-semibold text-[#00b4b8]" : "font-medium text-[#808081]"
                    )}>Help Center</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="gap-3 px-4 py-2 rounded-none cursor-pointer hover:bg-white/50 focus:bg-white/50"
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