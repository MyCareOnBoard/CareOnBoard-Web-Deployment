import { useSyncExternalStore } from "react";

// ponytail: ephemeral module store shared by the header (toggle) and the
// sidebar (render + dismiss). No persistence — the mobile drawer resets per load.
let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const openDrawer = () => {
  open = true;
  emit();
};
export const closeDrawer = () => {
  open = false;
  emit();
};
export const toggleDrawer = () => {
  open = !open;
  emit();
};

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function useSidebarDrawer() {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => false
  );
}
