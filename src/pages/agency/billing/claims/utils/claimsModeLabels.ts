import type { AgencyMode } from "@/store/redux/agencyModeSlice";
import { staffLabels } from "@/lib/roleLabel";

export type ClaimsModeLabels = {
  /** Column/field label for the person who worked the shift or ride. */
  staff: string;
  /** Label for the authorization number column (DDD prior authorization vs HHA payer authorization). */
  authNumber: string;
};

/** Ready-to-bill wording for the active agency program. A null mode keeps the combined wording. */
export function claimsModeLabels(mode: AgencyMode | null | undefined): ClaimsModeLabels {
  return {
    staff: staffLabels(mode ? [mode] : undefined).noun,
    authNumber: mode === "hha" ? "Auth number" : mode === "ddd" || mode === "sc" ? "PA Number" : "PA / Auth number",
  };
}
