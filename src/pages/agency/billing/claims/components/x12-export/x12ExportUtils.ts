import type { BillingClaimListItem, EdiSettings, X12ExportCheck, X12ValidationIssue } from "@/lib/api/claims";

export const EMPTY_EDI_SETTINGS: EdiSettings = {
  submitterId: "",
  submitterName: "",
  submitterContactName: "",
  submitterContactPhone: "",
  receiverId: "",
  receiverName: "NJMMIS",
  payerId: "",
  payerName: "NEW JERSEY MEDICAID",
  billingProviderName: "",
  billingTaxId: "",
  taxonomyCode: "",
  billingStreet: "",
  billingCity: "",
  billingState: "NJ",
  billingZip: "",
  usageIndicator: "T",
};

/** Pending claims that can go in an 837P file. Already exported claims need `resubmit`. */
export function getExportableClaims(
  claims: readonly BillingClaimListItem[],
  { resubmit = false }: { resubmit?: boolean } = {},
): BillingClaimListItem[] {
  return claims.filter(
    (claim) => claim.status === "pending" && (resubmit || !claim.ediExport?.batchId),
  );
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    (Number.isFinite(cents) ? cents : 0) / 100,
  );
}

export function formatDollars(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number.isFinite(amount) ? amount : 0,
  );
}

/** Settings fields the user must fill in before any file can be made. */
export const EDI_SETTINGS_FIELDS: Array<{
  key: Exclude<keyof EdiSettings, "usageIndicator">;
  label: string;
  hint?: string;
  section: "submitter" | "payer" | "provider";
}> = [
  { key: "submitterId", label: "Submitter ID (ETIN)", hint: "From your NJMMIS trading partner agreement", section: "submitter" },
  { key: "submitterName", label: "Submitter name", section: "submitter" },
  { key: "submitterContactName", label: "Contact name", section: "submitter" },
  { key: "submitterContactPhone", label: "Contact phone", hint: "10 digits", section: "submitter" },
  { key: "receiverId", label: "Receiver ID", hint: "From the NJ 837P companion guide", section: "payer" },
  { key: "receiverName", label: "Receiver name", section: "payer" },
  { key: "payerId", label: "Payer ID", hint: "From the NJ 837P companion guide", section: "payer" },
  { key: "payerName", label: "Payer name", section: "payer" },
  { key: "billingProviderName", label: "Billing provider name", hint: "Leave blank to use the agency's legal name", section: "provider" },
  { key: "billingTaxId", label: "Tax ID (EIN)", hint: "9 digits, kept only for billing", section: "provider" },
  { key: "taxonomyCode", label: "Taxonomy code", hint: "10 characters ending in X, e.g. 251C00000X", section: "provider" },
  { key: "billingStreet", label: "Street address", hint: "Physical address, not a PO box", section: "provider" },
  { key: "billingCity", label: "City", section: "provider" },
  { key: "billingState", label: "State", section: "provider" },
  { key: "billingZip", label: "ZIP+4", hint: "9 digits, e.g. 08608-1234", section: "provider" },
];

export type GroupedClaimIssues = Array<{
  claimId: string;
  claimNumber: string;
  messages: string[];
}>;

/** Groups claim errors by claim so each claim shows once with all its problems. */
export function groupClaimIssues(issues: readonly X12ValidationIssue[]): GroupedClaimIssues {
  const byClaim = new Map<string, { claimId: string; claimNumber: string; messages: string[] }>();
  for (const issue of issues) {
    const claimId = issue.claimId ?? "";
    const entry = byClaim.get(claimId) ?? {
      claimId,
      claimNumber: issue.claimNumber ?? claimId,
      messages: [],
    };
    entry.messages.push(issue.message);
    byClaim.set(claimId, entry);
  }
  return [...byClaim.values()];
}

export function countIssues(check: X12ExportCheck | null): number {
  if (!check) return 0;
  return check.settingsErrors.length + check.claimErrors.length;
}
