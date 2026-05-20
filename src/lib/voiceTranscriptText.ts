/** Join finalized STT segments with single spaces. */
export function joinCommittedSegments(segments: string[]): string {
  return segments
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
}

/** Append a new committed segment to existing text. */
export function appendToBaseline(baseline: string, segment: string): string {
  const next = segment.trim();
  if (!next) return baseline;
  const base = baseline.trimEnd();
  if (!base) return next;
  return `${base} ${next}`;
}

/** Baseline field value plus all committed segments (minimal-mode editor content). */
export function buildTranscriptFromBaseline(
  baseline: string,
  segments: string[]
): string {
  const joined = joinCommittedSegments(segments);
  if (!joined) return baseline;
  if (!baseline.trim()) return joined;
  return `${baseline.trimEnd()} ${joined}`;
}
