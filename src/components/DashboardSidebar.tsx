import {type ComponentType, ReactNode, useMemo} from "react";
import {useLocation, useNavigate} from "react-router";
import {Routes} from "@/routes/constants";
import QuestionIcon from "@/assets/icons/question-mark-circle.svg?react";
import UserIcon from "@/assets/icons/user.svg?react";
import FileIcon from "@/assets/icons/file.svg?react";
import CogIcon from "@/assets/icons/cog.svg?react";
import HomeIcon from "@/assets/icons/home.svg?react";
import {cn} from "@/lib/utils";

type NavItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { label: "Dashboard", path: Routes.applicant.dashboard, icon: HomeIcon },
  { label: "Application", path: Routes.applicant.application, icon: UserIcon },
  { label: "Documents", path: Routes.applicant.documents, icon: FileIcon },
  {
    label: "Help Center",
    path: Routes.common.helpCenter,
    icon: QuestionIcon
  },
  {
    label: "Settings",
    path: Routes.common.settings, icon: CogIcon
  },
];

export default function DashboardSidebar({ footer }: { footer?: ReactNode }) {
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