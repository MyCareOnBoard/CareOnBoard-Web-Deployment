import { usePresenceManager } from "@/lib/hooks/usePresence";

/** Keeps authenticated users' heartbeat lifecycle active without loading messaging. */
export function GlobalPresenceManager() {
  usePresenceManager();
  return null;
}
