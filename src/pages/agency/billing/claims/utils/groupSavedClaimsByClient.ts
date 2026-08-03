import type { BillingClaimListItem } from "@/lib/api/claims";

type AgencyIdentity = { agencyId?: string; agencyName?: string };

export type SavedClaimClientGroup<T extends BillingClaimListItem = BillingClaimListItem> = {
  clientKey: string;
  clientName: string;
  clientId?: string;
  agencyId?: string;
  agencyName?: string;
  claims: T[];
};

function getClientKey(claim: BillingClaimListItem & AgencyIdentity, showAgency: boolean) {
  const clientKey = claim.clientId?.trim() || claim.clientName?.trim() || "unknown";
  if (!showAgency) return clientKey;

  return `${claim.agencyId?.trim() || "unknown-agency"}:${clientKey}`;
}

export function groupSavedClaimsByClient<T extends BillingClaimListItem & AgencyIdentity>(
  claims: T[],
  { showAgency = false }: { showAgency?: boolean } = {},
): SavedClaimClientGroup<T>[] {
  const grouped = new Map<string, SavedClaimClientGroup<T>>();

  for (const claim of claims) {
    const clientKey = getClientKey(claim, showAgency);
    const existing = grouped.get(clientKey);

    if (existing) {
      existing.claims.push(claim);
      continue;
    }

    grouped.set(clientKey, {
      clientKey,
      clientName: claim.clientName?.trim() || "Unknown client",
      clientId: claim.clientId,
      agencyId: showAgency ? claim.agencyId : undefined,
      agencyName: showAgency ? claim.agencyName : undefined,
      claims: [claim],
    });
  }

  return [...grouped.values()].sort((left, right) =>
    left.clientName.localeCompare(right.clientName),
  );
}
