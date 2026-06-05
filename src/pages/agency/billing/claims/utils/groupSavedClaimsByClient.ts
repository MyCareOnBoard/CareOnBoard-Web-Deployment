import type { BillingClaimListItem } from "@/lib/api/claims";

export type SavedClaimClientGroup = {
  clientKey: string;
  clientName: string;
  clientId?: string;
  claims: BillingClaimListItem[];
};

function getClientKey(claim: BillingClaimListItem) {
  return claim.clientId?.trim() || claim.clientName?.trim() || "unknown";
}

export function groupSavedClaimsByClient(claims: BillingClaimListItem[]): SavedClaimClientGroup[] {
  const grouped = new Map<string, SavedClaimClientGroup>();

  for (const claim of claims) {
    const clientKey = getClientKey(claim);
    const existing = grouped.get(clientKey);

    if (existing) {
      existing.claims.push(claim);
      continue;
    }

    grouped.set(clientKey, {
      clientKey,
      clientName: claim.clientName?.trim() || "Unknown client",
      clientId: claim.clientId,
      claims: [claim],
    });
  }

  return [...grouped.values()].sort((left, right) =>
    left.clientName.localeCompare(right.clientName),
  );
}
