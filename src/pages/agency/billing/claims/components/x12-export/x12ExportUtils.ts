import type {
  BillingClaimEdiExport,
  BillingClaimListItem,
  BillingClaimStatus,
  ClearinghouseClaimResult,
  ClearinghouseResult,
  ClearinghouseSubmission,
  ClearinghouseVendor,
  EdiAgencyDefaults,
  EdiSettings,
  X12Batch,
  X12ExportCheck,
  X12SubmissionStatus,
  X12ValidationIssue,
  X12ValidationStatus,
} from "@/lib/api/claims";

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
  // Blank falls back to the agency profile.
  billingState: "",
  billingZip: "",
  usageIndicator: "T",
  billingPeriod: "weekly",
  billingPeriodAnchor: "",
  defaultPlaceOfService: "12",
  stediPayerId: "",
  claimMdPayerId: "",
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
  section: "submitter" | "payer" | "provider" | "clearinghouse";
}> = [
  { key: "submitterId", label: "Submitter ID (ETIN)", hint: "From your NJMMIS trading partner agreement", section: "submitter" },
  { key: "submitterName", label: "Submitter name", section: "submitter" },
  { key: "submitterContactName", label: "Contact name", section: "submitter" },
  { key: "submitterContactPhone", label: "Contact phone", hint: "10 digits", section: "submitter" },
  { key: "receiverId", label: "Receiver ID", hint: "From the NJ 837P companion guide", section: "payer" },
  { key: "receiverName", label: "Receiver name", section: "payer" },
  { key: "payerId", label: "Payer ID", hint: "From the NJ 837P companion guide", section: "payer" },
  { key: "payerName", label: "Payer name", section: "payer" },
  { key: "billingProviderName", label: "Billing provider name", section: "provider" },
  { key: "billingTaxId", label: "Tax ID (EIN)", hint: "9 digits. Leave blank to use the agency EIN", section: "provider" },
  { key: "taxonomyCode", label: "Taxonomy code", hint: "10 characters ending in X, e.g. 251C00000X", section: "provider" },
  { key: "billingStreet", label: "Street address", hint: "Physical address, not a PO box", section: "provider" },
  { key: "billingCity", label: "City", section: "provider" },
  { key: "billingState", label: "State", section: "provider" },
  { key: "billingZip", label: "ZIP+4", hint: "9 digits, e.g. 08608-1234", section: "provider" },
  {
    key: "stediPayerId",
    label: "Stedi payer ID",
    hint: "NJ Medicaid on Stedi's payer list is 100229. Blank uses the payer ID above",
    section: "clearinghouse",
  },
];

/** Placeholder for a settings field that falls back to the agency profile when left blank. */
export function agencyDefaultPlaceholder(
  key: keyof EdiSettings,
  defaults: EdiAgencyDefaults,
): string | undefined {
  if (key === "billingTaxId") {
    return defaults.taxIdLast4 ? `From agency EIN: ••${defaults.taxIdLast4}` : undefined;
  }
  const value = defaults[key as keyof EdiAgencyDefaults]?.trim();
  if (!value) return undefined;
  // 837P needs ZIP+4; a 5-digit profile ZIP can't be used as is.
  if (key === "billingZip" && value.replace(/\D/g, "").length !== 9) {
    return `Agency profile has ${value}. Enter the full ZIP+4`;
  }
  return `From agency profile: ${value}`;
}

/**
 * What the claim report's 837P button does: download the file the claim is
 * already in, create one for a pending claim, or nothing.
 */
export function getClaimX12Action({
  canManage,
  status,
  ediExport,
}: {
  canManage: boolean;
  status: BillingClaimStatus;
  ediExport?: Pick<BillingClaimEdiExport, "batchId"> | null;
}): "download" | "export" | null {
  if (!canManage) return null;
  if (ediExport?.batchId) return "download";
  return status === "pending" ? "export" : null;
}

/** Label and file description for the claim report's 837P button. */
export function claimX12ButtonText({
  mode,
  busy = false,
  ediExport,
}: {
  mode: "download" | "export";
  busy?: boolean;
  ediExport?: Pick<BillingClaimEdiExport, "fileName" | "controlNumber"> | null;
}): { label: string; detail: string } {
  if (mode === "export") {
    return {
      label: busy ? "Creating 837P file…" : "Create & download 837P file",
      detail: "Electronic claim for NJMMIS. Locks this report",
    };
  }
  return {
    label: busy ? "Downloading 837P file…" : "Download 837P file",
    detail: ediExport?.fileName || (ediExport?.controlNumber ? `Control #${ediExport.controlNumber}` : "Electronic claim for NJMMIS"),
  };
}

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

export type BadgeTone = "success" | "warning" | "danger" | "neutral";

export const VALIDATION_LABELS: Record<X12ValidationStatus, { label: string; tone: BadgeTone }> = {
  passed: { label: "Passed", tone: "success" },
  warnings: { label: "Warnings", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
  skipped: { label: "Not checked", tone: "neutral" },
  error: { label: "Check didn't run", tone: "neutral" },
};

export const SUBMISSION_LABELS: Record<X12SubmissionStatus, { label: string; tone: BadgeTone }> = {
  accepted: { label: "Accepted", tone: "success" },
  accepted_with_errors: { label: "Accepted with errors", tone: "warning" },
  partially_accepted: { label: "Partly accepted", tone: "warning" },
  rejected: { label: "Rejected", tone: "danger" },
};

/** Where a file stands with NJMMIS: a response wins over "Sent", which wins over "Not sent". */
export function submissionLabel(
  batch: Pick<X12Batch, "status" | "submission" | "uploadedAt">,
): { label: string; tone: BadgeTone } | null {
  const status = batch.submission?.status;
  if (status && SUBMISSION_LABELS[status]) return SUBMISSION_LABELS[status];
  if (batch.status !== "ready") return null;
  return batch.uploadedAt ? { label: "Sent", tone: "neutral" } : { label: "Not sent", tone: "warning" };
}

export const CLEARINGHOUSE_NAMES: Record<ClearinghouseVendor, string> = { stedi: "Stedi", claimmd: "Claim.MD" };

export const CLAIM_RESULT_LABELS: Record<ClearinghouseClaimResult["status"], { label: string; tone: BadgeTone }> = {
  accepted: { label: "Accepted", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  pending: { label: "Waiting", tone: "neutral" },
  error: { label: "Not sent", tone: "warning" },
};

/** "Stedi: 3 accepted, 1 rejected" for the file list. */
export function clearinghouseBadge(
  vendor: ClearinghouseVendor,
  submission: ClearinghouseSubmission,
): { label: string; tone: BadgeTone; title?: string } {
  const name = CLEARINGHOUSE_NAMES[vendor];
  if (submission.status === "submitting") return { label: `${name}: sending…`, tone: "neutral" };
  if (submission.status === "failed") return { label: `${name}: not sent`, tone: "danger", title: submission.message || undefined };
  const parts = [
    submission.acceptedClaims ? `${submission.acceptedClaims} accepted` : "",
    submission.rejectedClaims ? `${submission.rejectedClaims} rejected` : "",
    submission.pendingClaims ? `${submission.pendingClaims} waiting` : "",
    submission.errorClaims ? `${submission.errorClaims} not sent` : "",
  ].filter(Boolean);
  const tone: BadgeTone = submission.rejectedClaims || submission.errorClaims ? "warning" : submission.pendingClaims ? "neutral" : "success";
  return { label: `${name}: ${parts.join(", ") || "sent"}`, tone, title: submission.message || undefined };
}

function csvCell(value: string): string {
  // A leading = + - @ would run as a formula in Excel.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** One row per claim: what the clearinghouse said, for keeping with the claims. */
export function clearinghouseResultsCsv(result: ClearinghouseResult): string {
  const header = ["Clearinghouse", "Claim number", "Result", "Reference", "Messages", "Sent at", "Payer ID"];
  const rows = result.claims.map((claim) => [
    CLEARINGHOUSE_NAMES[result.vendor],
    claim.claimNumber,
    CLAIM_RESULT_LABELS[claim.status].label,
    claim.reference,
    (claim.errors.length ? claim.errors.map((issue) => issue.message || issue.code) : [claim.message]).filter(Boolean).join("; "),
    result.submission.submittedAt ?? "",
    result.submission.payerId,
  ]);
  return [header, ...rows].map((row) => row.map((cell) => csvCell(String(cell ?? ""))).join(",")).join("\r\n");
}

/** "312 claims in 1 file, $48,210.00" */
export function runPreviewText({ claims, files, totalChargeCents }: { claims: number; files: number; totalChargeCents: number }): string {
  return `${claims} ${claims === 1 ? "claim" : "claims"} in ${files} ${files === 1 ? "file" : "files"}, ${formatCents(totalChargeCents)}`;
}

/** Reads a file's bytes (FileReader fallback for browsers and test DOMs without Blob.arrayBuffer). */
export function readFileBytes(file: Blob): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === "function") return file.arrayBuffer().then((data) => new Uint8Array(data));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read the file."));
    reader.readAsArrayBuffer(file);
  });
}

/** Reads an uploaded file for the API: zips as base64, everything else as text. */
export async function readUploadFile(file: File): Promise<{ fileName: string; content: string; encoding: "utf8" | "base64" }> {
  const buffer = await readFileBytes(file);
  const isZip = buffer.length > 3 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  if (!isZip) return { fileName: file.name, content: new TextDecoder("latin1").decode(buffer), encoding: "utf8" };
  let binary = "";
  for (let index = 0; index < buffer.length; index += 0x8000) {
    binary += String.fromCharCode(...buffer.subarray(index, index + 0x8000));
  }
  return { fileName: file.name, content: btoa(binary), encoding: "base64" };
}
