import type { NavItem } from "@/components/DashboardSidebar";

export function matchesNavPath(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function resolveActiveNavItem(pathname: string, items: NavItem[]): NavItem | undefined {
  for (const item of items) {
    if (item.children?.length) {
      for (const child of item.children) {
        if (matchesNavPath(pathname, child.path)) {
          return item;
        }
      }

      if (item.path && matchesNavPath(pathname, item.path)) {
        return item;
      }
    }

    if (item.path && matchesNavPath(pathname, item.path)) {
      return item;
    }
  }

  return undefined;
}

export function resolveActiveNavPath(pathname: string, items: NavItem[]): string {
  for (const item of items) {
    if (item.children?.length) {
      for (const child of item.children) {
        if (matchesNavPath(pathname, child.path)) {
          return child.path;
        }
      }
    }

    if (item.path && matchesNavPath(pathname, item.path)) {
      return item.path;
    }
  }

  return "";
}

export function isNavGroupActive(pathname: string, item: NavItem): boolean {
  if (item.path && matchesNavPath(pathname, item.path)) {
    return true;
  }

  return item.children?.some((child) => matchesNavPath(pathname, child.path)) ?? false;
}
