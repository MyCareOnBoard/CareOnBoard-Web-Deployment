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

  return resolveEffectiveAgencyMode(supportedTypes, storedMode);
}

/** Resolves a mode from an explicitly supplied agency summary and stored toggle. */
export function resolveEffectiveAgencyMode(
  supportedTypes: readonly AgencyMode[],
  storedMode: AgencyMode | null | undefined,
): AgencyMode | null {
  const modes = [...new Set(supportedTypes)].filter((mode) => ["ddd", "hha", "sc"].includes(mode));
  if (modes.length === 1) return modes[0];
  return storedMode && modes.includes(storedMode) ? storedMode : null;
}

/** Maps an agency mode to the applicant program type stored on user docs. */
export function agencyModeToApplicantType(
  mode: AgencyMode | null
): "dsp" | "hha" | "support_coordinator" | undefined {
  if (mode === "sc") return "support_coordinator";
  if (mode === "hha") return "hha";
  if (mode === "ddd") return "dsp";
  return undefined;
}
