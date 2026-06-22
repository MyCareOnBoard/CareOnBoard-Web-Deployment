import { useSyncExternalStore } from "react";

// ponytail: one localStorage flag shared by the sidebar and every layout's <main>
// margin via useSyncExternalStore — no context/prop drilling needed.
const KEY = "sidebar-collapsed";
const EVENT = "sidebar-collapsed-change";

const getSnapshot = () => localStorage.getItem(KEY) === "1";

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useSidebarCollapsed() {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const toggle = () => {
    localStorage.setItem(KEY, collapsed ? "0" : "1");
    window.dispatchEvent(new Event(EVENT));
  };

  return [collapsed, toggle] as const;
}
