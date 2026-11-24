import { EVV_STATE_LABELS, EVV_STATE_TONES, type EvvVisitState } from "@/lib/api/evv";

export const EVV_INPUT = "h-10 rounded-lg border border-[#e4e7ea] bg-white px-3 text-sm text-[#10141a] outline-none focus-visible:border-[#00b4b8] disabled:bg-[#f3f5f6] dark:border-white/10 dark:bg-[#141b21] dark:text-[#f4f6f7]";
export const EVV_BUTTON = "cursor-pointer rounded-full bg-[#00b4b8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#009da1] disabled:cursor-not-allowed disabled:opacity-50";
export const EVV_GHOST_BUTTON = "cursor-pointer rounded-full border border-[#d5dadf] bg-white px-4 py-1.5 text-sm font-medium text-[#10141a] hover:border-[#00b4b8] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7]";
export const EVV_DANGER_BUTTON = "cursor-pointer rounded-full border border-[#f1b5b0] bg-white px-4 py-1.5 text-sm font-medium text-[#b42318] hover:bg-[#fdecec] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-transparent";

export function EvvStateBadge({ state }: { state: EvvVisitState }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${EVV_STATE_TONES[state] ?? "bg-[#f3f5f6] text-[#5b636b]"}`}>
      {EVV_STATE_LABELS[state] ?? state}
    </span>
  );
}

export function isAbort(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; name?: string };
  return candidate.code === "ERR_CANCELED" || candidate.name === "CanceledError" || candidate.name === "AbortError";
}
