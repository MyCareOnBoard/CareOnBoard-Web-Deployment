import type { User } from "@/utils/auth/types/user.types";

type MessagingAuthUser = Pick<User, "uid" | "userType" | "agencyId" | "profile">;

function sortedUniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean))]
    .sort();
}

function canonicalAgencyScope(profile: User["profile"]): {
  mode: "all" | "selected";
  agencyIds: string[];
} {
  const agencyIds = sortedUniqueStrings(profile?.agencyIds);
  const rawMode = typeof profile?.agencyScope === "string"
    ? profile.agencyScope.trim().toLowerCase()
    : "";

  if (rawMode === "selected") return { mode: "selected", agencyIds };
  if (rawMode === "all") return { mode: "all", agencyIds: [] };
  if (rawMode) return { mode: "selected", agencyIds: [] };
  if (agencyIds.length > 0) return { mode: "selected", agencyIds };
  return { mode: "all", agencyIds: [] };
}

export function buildMessagingAuthScopeKey(
  user: MessagingAuthUser | null | undefined,
): string {
  const agencyScope = canonicalAgencyScope(user?.profile);
  return JSON.stringify({
    uid: user?.uid || "",
    userType: user?.userType || "",
    agencyId: typeof user?.agencyId === "string" ? user.agencyId.trim() : "",
    accessList: sortedUniqueStrings(user?.profile?.accessList),
    agencyScope: agencyScope.mode,
    agencyIds: agencyScope.agencyIds,
  });
}
