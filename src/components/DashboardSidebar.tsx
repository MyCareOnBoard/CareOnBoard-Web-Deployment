import { type ComponentType, Fragment, ReactNode, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavGroupActive, resolveActiveNavPath } from "@/lib/nav-utils";
import { useSidebarCollapsed } from "@/hooks/useSidebarCollapsed";
import { closeDrawer, useSidebarDrawer } from "@/hooks/useSidebarDrawer";
import { useIsMobile } from "@/hooks/use-mobile";
import LogoNameIcon from "@/assets/icons/green-green-logo.svg?react";
import LogoMarkIcon from "@/assets/icons/logo.svg?react";

/** Logo for the brand sidebar: the mark when collapsed, the full name otherwise. */
export const brandSidebarLogo = (collapsed: boolean) => collapsed
  ? <LogoMarkIcon aria-label="Care on Board" role="img" className="h-9 w-auto" />
  : <LogoNameIcon aria-label="Care on Board" role="img" className="h-auto w-[196px]" />;

export type NavSubItem = {
  label: string;
  path: string;
  accessKey?: string;
  /** Opens something over the current page (e.g. a side panel) instead of navigating to `path`. */
  onSelect?: () => void;
};

/** "brand": full-height teal panel used by the employee (user) panel. */
// Faint vertical lines over the brand sidebar's dark teal, as in the design.
const brandPattern = {
  backgroundImage: "repeating-linear-gradient(90deg, transparent 0 77px, rgba(255,255,255,0.035) 77px 78px)",
};

export type SidebarVariant = "default" | "brand";

export type NavItem = {
  label: string;
  path?: string;
  icon: ComponentType<{ className?: string }>;
  accessKey?: string;
  staffOnly?: boolean;
  children?: NavSubItem[];
  /** Brand variant: a heading is shown above the first item of each section (e.g. "Operations"). */
  section?: string;
  /** Brand variant: a count shown at the end of the row (e.g. open compliance alerts). Hidden when 0. */
  badge?: number;
};

/** Brand variant row height: "compact" fits the agency's longer menu. */
export type SidebarDensity = "regular" | "compact";

/** Brand variant active row: "soft" is a translucent white wash (user panel), "solid" a teal fill (agency design). */
export type SidebarActiveStyle = "soft" | "solid";

const SOLID_ACTIVE = "bg-[#0f7e7d] font-semibold text-white";

/** Brand row colours for a plain link or a group's collapsed icon. */
const brandRowTone = (isActive: boolean, activeStyle: SidebarActiveStyle) => activeStyle === "solid"
  ? isActive ? SOLID_ACTIVE : "font-medium text-white hover:bg-white/10"
  : isActive ? "bg-white/15 font-semibold text-white" : "font-medium text-white/85 hover:bg-white/10 hover:text-white";

function formatBadge(count: number) {
  return count > 99 ? "99+" : String(count);
}

/** Red count at the end of a brand row; a dot on the icon when the sidebar is collapsed. */
function NavBadge({ count, collapsed }: { count?: number; collapsed: boolean }) {
  if (!count || count < 1) return null;
  if (collapsed) {
    return <span aria-hidden="true" className="absolute right-[18px] top-[5px] h-2 w-2 rounded-full bg-[#e5484d] ring-2 ring-[#003839] dark:ring-[#002c2d]" />;
  }
  return (
    <span aria-hidden="true" className="grid h-[18px] min-w-[20px] shrink-0 place-items-center rounded-full bg-[#e5484d] px-1.5 text-[11px] font-semibold leading-none text-white tabular-nums">
      {formatBadge(count)}
    </span>
  );
}

const labelWithBadge = (label: string, count?: number) => count && count > 0 ? `${label}, ${formatBadge(count)} new` : label;

// Brand: force strokes to currentColor so SVG icons with baked-in colours read on the dark panel.
const iconClassName = (isActive: boolean, variant: SidebarVariant = "default") =>
  variant === "brand" ? "h-5 w-5 shrink-0 text-current [&_*]:stroke-current [&_*]:fill-transparent" : cn(
    "h-5 w-5 shrink-0",
    isActive
      ? "[&_*]:stroke-white [&_*]:fill-transparent [&_path]:stroke-white [&_path]:fill-transparent [&_circle]:stroke-white [&_circle]:fill-transparent [&_rect]:stroke-white [&_rect]:fill-transparent"
      : "[&_*]:stroke-[#808081] [&_*]:fill-transparent [&_path]:stroke-[#808081] [&_path]:fill-transparent [&_circle]:stroke-[#808081] [&_circle]:fill-transparent [&_rect]:stroke-[#808081] [&_rect]:fill-transparent dark:[&_*]:stroke-[#9aa4a8] dark:[&_path]:stroke-[#9aa4a8] dark:[&_circle]:stroke-[#9aa4a8] dark:[&_rect]:stroke-[#9aa4a8]"
  );

function NavGroup({
  item,
  activePath,
  isExpanded,
  isGroupActive,
  collapsed,
  onToggle,
  variant,
  density = "regular",
  activeStyle = "soft",
}: {
  item: NavItem;
  activePath: string;
  isExpanded: boolean;
  isGroupActive: boolean;
  collapsed: boolean;
  onToggle: () => void;
  variant: SidebarVariant;
  density?: SidebarDensity;
  activeStyle?: SidebarActiveStyle;
}) {
  const brand = variant === "brand";
  const solid = brand && activeStyle === "solid";
  const brandRow = density === "compact" ? "h-[34px]" : "h-[44px]";
  const navigate = useNavigate();
  const { icon: Icon, label, path, children = [], badge } = item;

  // Collapsed: no room for the submenu — the icon just jumps to the group's landing route.
  if (collapsed) {
    return (
      <button
        type="button"
        title={label}
        aria-label={brand ? labelWithBadge(label, badge) : undefined}
        onClick={() => path && navigate(path)}
        className={cn(
          "relative flex w-full items-center justify-center transition cursor-pointer",
          brand ? cn(brandRow, "rounded-[12px] text-white") : "h-[52px] rounded-[60px]",
          brand
            ? brandRowTone(isGroupActive, activeStyle)
            : isGroupActive ? "bg-[#00b4b8]" : "text-[#808081] hover:bg-white/40 dark:text-[#9aa4a8] dark:hover:bg-white/5"
        )}
      >
        <Icon className={iconClassName(isGroupActive, variant)} />
        {brand && <NavBadge count={badge} collapsed />}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden transition-colors",
        brand ? "rounded-[14px]" : "rounded-[20px]",
        isGroupActive && (brand ? solid ? "bg-white/[0.07]" : "bg-white/15" : "bg-[#00b4b8]")
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 text-sm transition cursor-pointer",
          brand ? cn(brandRow, "rounded-[12px] px-3") : "h-[52px] rounded-[60px] px-4 font-semibold backdrop-blur-[22px]",
          brand
            ? isGroupActive ? "font-semibold text-white" : solid ? "font-medium text-white hover:bg-white/10" : "font-medium text-white/85 hover:bg-white/10 hover:text-white"
            : isGroupActive ? "font-medium text-white" : "font-medium text-[#808081] hover:bg-white/40 dark:text-[#9aa4a8] dark:hover:bg-white/5"
        )}
      >
        <Icon className={iconClassName(isGroupActive, variant)} />
        <span className="flex-1 whitespace-nowrap text-left">{label}</span>
        {brand && <NavBadge count={badge} collapsed={false} />}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            isGroupActive || brand ? "text-white" : "text-[#808081] dark:text-[#9aa4a8]",
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
                onClick={() => {
                  if (child.onSelect) {
                    child.onSelect();
                    closeDrawer();
                  } else navigate(child.path);
                }}
                className={cn(
                  "flex h-[40px] w-full items-center gap-2 rounded-[12px] px-3 text-left text-[13px] font-medium transition cursor-pointer",
                  isChildActive
                    ? brand ? solid ? SOLID_ACTIVE : "bg-white/20 text-white" : "bg-[#009a9e] text-white"
                    : isGroupActive || brand
                      ? "text-white/90 hover:bg-white/15"
                      : "text-[#808081] hover:bg-white/40 dark:text-[#9aa4a8] dark:hover:bg-white/5"
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
  collapsed,
  variant,
  density = "regular",
  activeStyle = "soft",
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  variant: SidebarVariant;
  density?: SidebarDensity;
  activeStyle?: SidebarActiveStyle;
}) {
  const brand = variant === "brand";
  const brandRow = density === "compact" ? "h-[34px]" : "h-[44px]";
  const navigate = useNavigate();
  const { icon: Icon, label, path, badge } = item;

  if (!path) {
    return null;
  }

  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      aria-label={brand ? labelWithBadge(label, badge) : label}
      aria-current={isActive ? "page" : undefined}
      onClick={() => navigate(path)}
      className={cn(
        "relative flex w-full items-center text-sm transition cursor-pointer",
        brand ? cn(brandRow, "rounded-[12px]") : "h-[52px] rounded-[60px] font-semibold backdrop-blur-[22px]",
        collapsed ? "justify-center" : brand ? "gap-3 px-3" : "gap-3 px-4",
        brand
          ? brandRowTone(isActive, activeStyle)
          : isActive ? "bg-[#00b4b8] font-medium text-white" : "font-medium text-[#808081] hover:bg-white/40 dark:text-[#9aa4a8] dark:hover:bg-white/5"
      )}
    >
      <Icon className={iconClassName(isActive, variant)} />
      {!collapsed && <span className="flex-1 whitespace-nowrap text-left">{label}</span>}
      {brand && <NavBadge count={badge} collapsed={collapsed} />}
    </button>
  );
}

const NO_ITEMS: NavItem[] = [];

export default function DashboardSidebar({
  navItems,
  footer,
  activePath: activePathOverride,
  variant = "default",
  logo,
  header,
  bottomNavItems = NO_ITEMS,
  collapseAtBottom = false,
  density = "regular",
  activeStyle = "soft",
}: {
  footer?: ReactNode;
  navItems: NavItem[];
  activePath?: string;
  variant?: SidebarVariant;
  /** Brand variant only: the logo shown at the top of the panel, given the collapsed state. */
  logo?: (collapsed: boolean) => ReactNode;
  /** Brand variant only: shown under the logo (the agency's program switch), given the collapsed state. */
  header?: (collapsed: boolean) => ReactNode;
  /** Brand variant only: links pinned to the bottom of the panel, above Collapse menu (agency Settings). */
  bottomNavItems?: NavItem[];
  /** Brand variant only: put Collapse menu at the bottom of the panel instead of above the menu. */
  collapseAtBottom?: boolean;
  density?: SidebarDensity;
  /** Brand variant only: how the current page's row is highlighted. */
  activeStyle?: SidebarActiveStyle;
}) {
  const brand = variant === "brand";
  const location = useLocation();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  const isMobile = useIsMobile();
  const drawerOpen = useSidebarDrawer();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Icons-only collapse is a desktop affordance; the mobile drawer always shows full labels.
  const effectiveCollapsed = collapsed && !isMobile;

  // Dismiss the drawer after navigating and whenever we leave the mobile breakpoint.
  useEffect(() => {
    closeDrawer();
  }, [location.pathname, isMobile]);

  const allItems = useMemo(() => [...navItems, ...bottomNavItems], [navItems, bottomNavItems]);
  const activePath = useMemo(
    () => activePathOverride ?? resolveActiveNavPath(location.pathname, allItems),
    [activePathOverride, location.pathname, allItems]
  );
  const collapseBottom = brand && collapseAtBottom;
  const headerContent = header?.(effectiveCollapsed);

  const collapseButton = (
    <button
      type="button"
      onClick={toggleCollapsed}
      title={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-label={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      className={cn(
        "hidden h-[44px] w-full shrink-0 items-center text-[13px] font-medium transition cursor-pointer md:flex",
        brand
          ? cn("rounded-[12px] hover:bg-white/10 hover:text-white", activeStyle === "solid" ? "text-white" : "text-white/85")
          : "rounded-[60px] text-[#808081] dark:text-[#9aa4a8] hover:bg-white/40 dark:hover:bg-white/5",
        effectiveCollapsed ? "justify-center" : brand ? "gap-3 px-3" : "gap-3 px-4"
      )}
    >
      {effectiveCollapsed ? <PanelLeftOpen className="h-5 w-5 shrink-0" /> : <PanelLeftClose className="h-5 w-5 shrink-0" />}
      {!effectiveCollapsed && <span className="flex-1 whitespace-nowrap text-left">Collapse menu</span>}
    </button>
  );

  const renderItem = (item: NavItem) => {
    if (item.children?.length) {
      const isOnGroupRoute = isNavGroupActive(location.pathname, item);
      const isExpanded = expandedGroups[item.label] ?? isOnGroupRoute;
      return (
        <NavGroup
          key={item.label}
          item={item}
          activePath={activePath}
          isExpanded={isExpanded}
          isGroupActive={isOnGroupRoute}
          collapsed={effectiveCollapsed}
          variant={variant}
          density={density}
          activeStyle={activeStyle}
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
        collapsed={effectiveCollapsed}
        variant={variant}
        density={density}
        activeStyle={activeStyle}
      />
    );
  };

  return (
    <>
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}
      <aside
        inert={isMobile && !drawerOpen}
        style={brand ? brandPattern : undefined}
        className={cn(
          brand
            ? "fixed inset-y-0 left-0 z-[60] flex flex-col gap-3 overflow-hidden bg-[#003839] px-3 pb-4 pt-5 text-white scrollbar-hide shadow-xl dark:bg-[#002c2d]"
            : "fixed top-[98px] bottom-0 left-0 z-50 overflow-y-auto overflow-x-hidden space-y-3 pr-3 bg-[#eef4f5] dark:bg-[#10141a] scrollbar-hide shadow-xl",
          brand
            ? "transition-transform duration-200 md:z-40 md:translate-x-0 md:shadow-none md:transition-[width]"
            : "transition-transform duration-200 md:top-[130px] md:bottom-4 md:pr-0 md:left-[42.5px] md:z-40 md:translate-x-0 md:shadow-none md:transition-[width]",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
          brand
            ? effectiveCollapsed ? "w-[256px] md:w-[88px]" : "w-[256px] md:w-[248px]"
            : effectiveCollapsed ? "w-[64px]" : "w-[256px] md:w-[200px]"
        )}
      >
        {brand && logo && <div className={cn("flex shrink-0 items-center pb-2", effectiveCollapsed ? "justify-center" : "px-2")}>{logo(effectiveCollapsed)}</div>}
        {brand && headerContent && <div className="shrink-0">{headerContent}</div>}
        {/* Brand: the logo stays put; the menu and help card scroll together below it. */}
        <div className={cn(brand ? "-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-1 scrollbar-hide" : "space-y-3")}>
        {!collapseBottom && collapseButton}
        <nav aria-label="Main" className={cn("space-y-1", brand ? "pb-2" : "pb-4")}>
          {navItems.map((item, index) => {
            // Brand: a section heading (or a divider when collapsed) where a new section starts.
            const startsSection = brand && item.section && item.section !== navItems[index - 1]?.section;
            if (!startsSection) return renderItem(item);
            return (
              <Fragment key={`section:${item.section}:${item.label}`}>
                {effectiveCollapsed
                  ? index > 0 && <div aria-hidden="true" className="mx-3 my-2 h-px bg-white/10" />
                  : <p className={cn("px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.1em]", activeStyle === "solid" ? "text-[#8fbcbb]" : "text-white/55", index > 0 ? "pt-3" : "pt-1")}>{item.section}</p>}
                {renderItem(item)}
              </Fragment>
            );
          })}
        </nav>
        {!effectiveCollapsed && (brand ? footer && <div className="mt-auto shrink-0 pt-2">{footer}</div> : footer)}
        </div>
        {collapseBottom && (
          <div className="shrink-0 space-y-1 border-t border-white/10 pt-2">
            {bottomNavItems.map(renderItem)}
            {collapseButton}
          </div>
        )}
      </aside>
    </>
  );
}
