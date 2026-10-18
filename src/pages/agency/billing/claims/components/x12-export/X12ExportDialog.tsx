import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import BillingCornerModalHeader from "@/pages/agency/billing/components/BillingCornerModalHeader";
import {
  BILLING_CHECKBOX_CLASS,
  BILLING_CORNER_MODAL_CLASS,
  BILLING_PRIMARY_BUTTON_CLASS,
  BILLING_SECONDARY_BUTTON_CLASS,
} from "@/pages/agency/billing/components/billingModalStyles";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";
import {
  checkX12Export,
  exportClaimsX12,
  X12ExportError,
  type BillingClaimListItem,
  type X12Batch,
  type X12ExportCheck,
} from "@/lib/api/claims";
import { countIssues, formatDollars, getExportableClaims, groupClaimIssues } from "./x12ExportUtils";

type X12ExportDialogProps = {
  open: boolean;
  claims: readonly BillingClaimListItem[];
  onClose: () => void;
  onOpenSettings: () => void;
  onExported: (batch: X12Batch) => void;
};

function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (message) return message;
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function X12ExportDialog({
  open,
  claims,
  onClose,
  onOpenSettings,
  onExported,
}: X12ExportDialogProps) {
  const { agencyId } = useOperationalAgency();
  const [resubmit, setResubmit] = useState(false);
  const exportable = useMemo(() => getExportableClaims(claims, { resubmit }), [claims, resubmit]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [check, setCheck] = useState<X12ExportCheck | null>(null);
  const [busy, setBusy] = useState<"checking" | "exporting" | null>(null);
  const [error, setError] = useState("");

  const exportableKey = exportable.map((claim) => claim.id).join(",");

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(exportable.map((claim) => claim.id)));
    setCheck(null);
    setError("");
    // Only reset when the dialog opens or the list of exportable claims changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, exportableKey]);

  const selectedIds = exportable.filter((claim) => selected.has(claim.id)).map((claim) => claim.id);
  const selectedTotal = exportable
    .filter((claim) => selected.has(claim.id))
    .reduce((sum, claim) => sum + (Number(claim.amount) || 0), 0);
  const allSelected = exportable.length > 0 && selectedIds.length === exportable.length;

  const toggle = (claimId: string) => {
    setCheck(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(claimId)) next.delete(claimId);
      else next.add(claimId);
      return next;
    });
  };

  const toggleAll = () => {
    setCheck(null);
    setSelected(allSelected ? new Set() : new Set(exportable.map((claim) => claim.id)));
  };

  const runCheck = async () => {
    if (!agencyId || selectedIds.length === 0) return;
    setBusy("checking");
    setError("");
    try {
      setCheck(await checkX12Export({ context: { agencyId }, claimIds: selectedIds, resubmit }));
    } catch (checkError) {
      setError(errorMessage(checkError, "Couldn't check these claims."));
    } finally {
      setBusy(null);
    }
  };

  const runExport = async () => {
    if (!agencyId || selectedIds.length === 0) return;
    setBusy("exporting");
    setError("");
    try {
      const { batch } = await exportClaimsX12({ context: { agencyId }, claimIds: selectedIds, resubmit });
      onExported(batch);
      onClose();
    } catch (exportError) {
      if (exportError instanceof X12ExportError && exportError.details) {
        // The details list every problem; the generic message would only repeat them.
        setCheck(exportError.details);
        setError("");
      } else {
        setError(errorMessage(exportError, "Couldn't create the 837P file."));
      }
    } finally {
      setBusy(null);
    }
  };

  const issueCount = countIssues(check);
  const claimIssues = groupClaimIssues(check?.claimErrors ?? []);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent showCloseButton={false} className={`${BILLING_CORNER_MODAL_CLASS} flex max-h-[90dvh] flex-col`}>
        <BillingCornerModalHeader
          title="Create 837P file"
          description="Pick the pending claims to send to NJ Medicaid. Each claim needs its onset date and both signatures saved on the claim report."
          onClose={onClose}
          closeDisabled={Boolean(busy)}
        />

        <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-2 pt-6">
          <div className="flex items-center justify-between gap-3">
            <Checkbox
              checked={allSelected}
              onChange={toggleAll}
              disabled={exportable.length === 0 || Boolean(busy)}
              className={BILLING_CHECKBOX_CLASS}
              label={`Select all (${exportable.length})`}
            />
            <Checkbox
              checked={resubmit}
              onChange={(event) => {
                setResubmit(event.target.checked);
                setCheck(null);
              }}
              disabled={Boolean(busy)}
              className={BILLING_CHECKBOX_CLASS}
              label="Include claims already in a file"
            />
          </div>

          {exportable.length === 0 ? (
            <p className="text-[14px] text-[#808081]">
              No pending claims to export in this date range.
            </p>
          ) : (
            <ul className="divide-y divide-[#e5e5e6] rounded-[12px] border border-[#e5e5e6]">
              {exportable.map((claim) => (
                <li key={claim.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <Checkbox
                    checked={selected.has(claim.id)}
                    onChange={() => toggle(claim.id)}
                    disabled={Boolean(busy)}
                    className={BILLING_CHECKBOX_CLASS}
                    label={`${claim.claimNumber} · ${claim.clientName ?? "Unknown client"}`}
                  />
                  <span className="shrink-0 text-[14px] text-[#10141a]">
                    {formatDollars(claim.amount)}
                    {claim.ediExport?.batchId ? (
                      <span className="ml-2 text-[12px] text-[#808081]">in a file</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="text-[14px] text-[#10141a]">
            {selectedIds.length} selected · {formatDollars(selectedTotal)}
          </p>

          {check && issueCount === 0 ? (
            <p role="status" className="rounded-[10px] bg-[#ecfdf3] px-4 py-3 text-[14px] text-[#027a48]">
              All {check.claimCount} claims are ready for the 837P file.
            </p>
          ) : null}

          {check && check.settingsErrors.length > 0 ? (
            <div role="alert" className="space-y-2 rounded-[10px] bg-[#fef3f2] px-4 py-3 text-[14px] text-[#b42318]">
              <p className="font-medium">837P settings need attention</p>
              <ul className="list-disc space-y-1 pl-5">
                {check.settingsErrors.map((issue, index) => (
                  <li key={`${issue.field ?? "settings"}-${index}`}>{issue.message}</li>
                ))}
              </ul>
              <button type="button" onClick={onOpenSettings} className="font-medium underline">
                Open 837P settings
              </button>
            </div>
          ) : null}

          {claimIssues.length > 0 ? (
            <div role="alert" className="space-y-3 rounded-[10px] bg-[#fef3f2] px-4 py-3 text-[14px] text-[#b42318]">
              <p className="font-medium">
                {claimIssues.length === 1 ? "1 claim needs" : `${claimIssues.length} claims need`} fixing
              </p>
              {claimIssues.map((entry) => (
                <div key={entry.claimId}>
                  <p className="font-medium">{entry.claimNumber}</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {entry.messages.map((message, index) => (
                      <li key={index}>{message}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}

          {check && check.warnings.length > 0 ? (
            <div className="space-y-1 rounded-[10px] bg-[#fffaeb] px-4 py-3 text-[14px] text-[#b54708]">
              <p className="font-medium">Warnings</p>
              <ul className="list-disc space-y-1 pl-5">
                {check.warnings.map((issue, index) => (
                  <li key={index}>
                    {issue.claimNumber ? `${issue.claimNumber}: ` : ""}
                    {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-[14px] text-[#d92d20]">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 pb-8 pt-4">
          <button
            type="button"
            onClick={() => void runCheck()}
            disabled={Boolean(busy) || selectedIds.length === 0}
            className={BILLING_SECONDARY_BUTTON_CLASS}
          >
            {busy === "checking" ? "Checking…" : "Check claims"}
          </button>
          <button
            type="button"
            onClick={() => void runExport()}
            disabled={Boolean(busy) || selectedIds.length === 0 || (check !== null && issueCount > 0)}
            className={BILLING_PRIMARY_BUTTON_CLASS}
          >
            {busy === "exporting" ? "Creating…" : "Create file"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
