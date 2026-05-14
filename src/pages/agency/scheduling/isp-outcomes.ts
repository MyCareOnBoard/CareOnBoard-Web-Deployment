/** Round-trip ISP outcomes for shift payloads (`ispOutcome` is a single string on the API). */

export function parseIspOutcomesFromShift(stored: string | undefined | null): string[] {
  if (!stored?.trim()) return [];
  const t = stored.trim();
  if (t.startsWith("[")) {
    try {
      const parsed = JSON.parse(t) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map(String).map((s) => s.trim()).filter(Boolean);
      }
    } catch {
      /* treat as plain text */
    }
  }
  if (t.includes(" | ")) {
    return t.split(" | ").map((s) => s.trim()).filter(Boolean);
  }
  return [t];
}

export function ispOutcomesToDisplayText(outcomes: string[]): string {
  return outcomes.map((s) => s.trim()).filter(Boolean).join("\n");
}

/** Lines from the schedule modal ISP outcome textarea. */
export function parseIspOutcomesFromDisplayText(text: string): string[] {
  return text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

export function serializeIspOutcomesForShift(outcomes: string[]): string | undefined {
  const filtered = outcomes.map((s) => s.trim()).filter(Boolean);
  if (!filtered.length) return undefined;
  return JSON.stringify(filtered);
}

/** For read-only UI (shift details, lists) when `ispOutcome` may be JSON or legacy `a | b`. */
export function formatIspOutcomeForDisplay(stored: string | undefined | null): string {
  const parts = parseIspOutcomesFromShift(stored);
  if (!parts.length) return "";
  return parts.join("; ");
}
