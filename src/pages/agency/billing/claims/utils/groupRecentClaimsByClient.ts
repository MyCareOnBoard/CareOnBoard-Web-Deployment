import type { RecentClaim } from "../data/mockClaimsDashboardData";

export type RecentClaimClientGroup = {
  clientKey: string;
  clientName: string;
  clientId?: string;
  claims: RecentClaim[];
  /** A client is wholly claims or out-of-pocket; drives the badge + generate action. */
  billingDirection: "claims" | "out-of-pocket";
};

function getClientKey(claim: RecentClaim) {
  return claim.clientId?.trim() || claim.client.trim() || "unknown";
}

export function groupRecentClaimsByClient(claims: RecentClaim[]): RecentClaimClientGroup[] {
  const grouped = new Map<string, RecentClaimClientGroup>();

  for (const claim of claims) {
    const clientKey = getClientKey(claim);
    const existing = grouped.get(clientKey);

    if (existing) {
      existing.claims.push(claim);
      continue;
    }

    grouped.set(clientKey, {
      clientKey,
      clientName: claim.client,
      clientId: claim.clientId,
      claims: [claim],
      billingDirection: claim.billingDirection === "out-of-pocket" ? "out-of-pocket" : "claims",
    });
  }

  return [...grouped.values()].sort((left, right) =>
    left.clientName.localeCompare(right.clientName),
  );
}
