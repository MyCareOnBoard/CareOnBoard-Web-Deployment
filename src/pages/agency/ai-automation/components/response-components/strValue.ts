/** Safely convert any value (including Firestore Timestamp shapes) to a display string. */
export function str(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v || "—";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    // Firestore Timestamp serialised as { _seconds, _nanoseconds }
    if (typeof o._seconds === "number") {
      try {
        return new Date(o._seconds * 1000).toLocaleDateString("en-US", {
          year: "numeric", month: "short", day: "numeric",
        });
      } catch { /* fall through */ }
    }
    // Firestore Timestamp with toDate()
    if (typeof (o as { toDate?: unknown }).toDate === "function") {
      try {
        return ((o as { toDate: () => Date }).toDate()).toLocaleDateString("en-US", {
          year: "numeric", month: "short", day: "numeric",
        });
      } catch { /* fall through */ }
    }
  }
  return String(v);
}
