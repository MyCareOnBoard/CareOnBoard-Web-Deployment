import { usePresenceManager } from "@/lib/hooks/usePresenceManager";

/** Keeps authenticated users' heartbeat lifecycle active without loading messaging. */
export function GlobalPresenceManager() {
  usePresenceManager();
  return null;
}
