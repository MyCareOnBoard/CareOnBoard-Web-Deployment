import { useSelector } from "react-redux";
import { useAuth } from "@/utils/auth";
import type { RootState } from "@/store/redux/store";
import type { AgencyMode } from "@/store/redux/agencyModeSlice";

/**
 * The agency's active program mode: the stored toggle when the agency supports
 * both DDD and HHA, otherwise auto-derived from its single supported type.
 * Returns null only when a dual-type agency hasn't picked a mode yet.
 */
export function useEffectiveAgencyMode(): AgencyMode | null {
  const { user } = useAuth();
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const supportedTypes = user?.agency?.supportedClientTypes ?? [];
  const storedMode = useSelector(
    (state: RootState) => state.agencyMode.modeByAgency[agencyId]
  );

  const supportsBoth =
    supportedTypes.includes("ddd") && supportedTypes.includes("hha");
  if (supportsBoth) return storedMode ?? null;
  if (supportedTypes.includes("hha")) return "hha";
  return "ddd";
}

/** Whether the agency supports both DDD and HHA and can toggle between them. */
export function useAgencySupportsBothPrograms(): boolean {
  const { user } = useAuth();
  const supportedTypes = user?.agency?.supportedClientTypes ?? [];
  return supportedTypes.includes("ddd") && supportedTypes.includes("hha");
}

/** Maps an agency mode to the applicant program type stored on user docs. */
export function agencyModeToApplicantType(
  mode: AgencyMode | null
): "dsp" | "hha" | undefined {
  if (mode === "hha") return "hha";
  if (mode === "ddd") return "dsp";
  return undefined;
}
