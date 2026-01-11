import {type ComponentType, ReactNode, useMemo} from "react";
import {useLocation, useNavigate} from "react-router";
import {cn} from "@/lib/utils";

export type NavItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  accessKey?: string; // Access scope key for permission checking (optional)
};

export default function DashboardSidebar(
  { navItems, footer }: { footer?: ReactNode, navItems: NavItem[] }
) {
  const location = useLocation();
  const navigate = useNavigate();

  const activePath = useMemo(() => {
    const match = navItems.find(({ path }) => location.pathname.includes(path));
    return match?.path ?? '';
  }, [location.pathname]);

  return (
    <aside className="fixed left-[42.5px] overflow-y-auto top-[130px] bottom-4 z-40 w-[200px] space-y-3 bg-[#eef4f5] scrollbar-hide">
      <nav className="space-y-1 pb-4">
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