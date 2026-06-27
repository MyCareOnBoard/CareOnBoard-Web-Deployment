import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import { staffLabels } from "@/lib/roleLabel";

/**
 * The active agency mode plus its terminology labels, in one call.
 * Wraps `useEffectiveAgencyMode` + `staffLabels` so pages don't re-derive both inline.
 */
export function useStaffLabels() {
  const mode = useEffectiveAgencyMode();
  return { mode, labels: staffLabels(mode ? [mode] : undefined) };
}
