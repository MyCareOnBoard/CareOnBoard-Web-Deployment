import { type ComponentType, ReactNode, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavGroupActive, resolveActiveNavPath } from "@/lib/nav-utils";

export type NavSubItem = {
  label: string;
  path: string;
};

export type NavItem = {
  label: string;
  path?: string;
  icon: ComponentType<{ className?: string }>;
  accessKey?: string;
  children?: NavSubItem[];
};

const iconClassName = (isActive: boolean) =>
  cn(
    "h-5 w-5 shrink-0",
    isActive
      ? "[&_*]:stroke-white [&_*]:fill-transparent [&_path]:stroke-white [&_path]:fill-transparent [&_circle]:stroke-white [&_circle]:fill-transparent [&_rect]:stroke-white [&_rect]:fill-transparent"
      : "[&_*]:stroke-[#808081] [&_*]:fill-transparent [&_path]:stroke-[#808081] [&_path]:fill-transparent [&_circle]:stroke-[#808081] [&_circle]:fill-transparent [&_rect]:stroke-[#808081] [&_rect]:fill-transparent"
  );

function NavGroup({
  item,
  activePath,
  isExpanded,
  isGroupActive,
  onToggle,
}: {
  item: NavItem;
  activePath: string;
  isExpanded: boolean;
  isGroupActive: boolean;
  onToggle: () => void;
}) {
  const navigate = useNavigate();
  const { icon: Icon, label, children = [] } = item;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[20px] transition-colors",
        isGroupActive && "bg-[#00b4b8]"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex h-[52px] w-full items-center gap-3 rounded-[60px] px-4 text-sm font-semibold backdrop-blur-[22px] transition cursor-pointer",
          isGroupActive ? "font-medium text-white" : "font-medium text-[#808081] hover:bg-white/40"
        )}
      >
        <Icon className={iconClassName(isGroupActive)} />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            isGroupActive ? "text-white" : "text-[#808081]",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {isExpanded && (
        <div className="space-y-1 px-2 pb-2">
          {children.map((child) => {
            const isChildActive = activePath === child.path;

            return (
              <button
                key={child.path}
                type="button"
                onClick={() => navigate(child.path)}
                className={cn(
                  "flex h-[40px] w-full items-center gap-2 rounded-[12px] px-3 text-left text-[13px] font-medium transition cursor-pointer",
                  isChildActive
                    ? "bg-[#009a9e] text-white"
                    : isGroupActive
                      ? "text-white/90 hover:bg-white/15"
                      : "text-[#808081] hover:bg-white/40"
                )}
              >
                <span className="flex-1">{child.label}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-80" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavLinkButton({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  const navigate = useNavigate();
  const { icon: Icon, label, path } = item;

  if (!path) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => navigate(path)}
      className={cn(
        "flex h-[52px] w-full items-center gap-3 rounded-[60px] px-4 text-sm font-semibold backdrop-blur-[22px] transition cursor-pointer",
        isActive ? "bg-[#00b4b8] font-medium text-white" : "font-medium text-[#808081] hover:bg-white/40"
      )}
    >
      <Icon className={iconClassName(isActive)} />
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
}

export default function DashboardSidebar({
  navItems,
  footer,
}: {
  footer?: ReactNode;
  navItems: NavItem[];
}) {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const activePath = useMemo(
    () => resolveActiveNavPath(location.pathname, navItems),
    [location.pathname, navItems]
  );

  return (
    <aside className="fixed left-[42.5px] overflow-y-auto top-[130px] bottom-4 z-40 w-[200px] space-y-3 bg-[#eef4f5] scrollbar-hide">
      <nav className="space-y-1 pb-4">
        {navItems.map((item) => {
          if (item.children?.length) {
            const isOnGroupRoute = isNavGroupActive(location.pathname, item);
            const isExpanded = expandedGroups[item.label] ?? isOnGroupRoute;
            const isGroupActive = isOnGroupRoute;

            return (
              <NavGroup
                key={item.label}
                item={item}
                activePath={activePath}
                isExpanded={isExpanded}
                isGroupActive={isGroupActive}
                onToggle={() => {
                  setExpandedGroups((current) => ({
                    ...current,
                    [item.label]: !isExpanded,
                  }));
                }}
              />
            );
          }

          return (
            <NavLinkButton
              key={item.label}
              item={item}
              isActive={activePath === item.path}
            />
          );
        })}
      </nav>
      {footer}
    </aside>
  );
}
