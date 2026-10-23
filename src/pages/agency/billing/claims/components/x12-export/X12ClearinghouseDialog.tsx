import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import BillingCornerModalHeader from "@/pages/agency/billing/components/BillingCornerModalHeader";
import {
  BILLING_CHECKBOX_CLASS,
  BILLING_CORNER_MODAL_CLASS,
  BILLING_FIELD_CLASS,
  BILLING_FIELD_LABEL_CLASS,
  BILLING_PRIMARY_BUTTON_CLASS,
  BILLING_SECONDARY_BUTTON_CLASS,
} from "@/pages/agency/billing/components/billingModalStyles";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";
import {
  checkStediResponses,
  getX12ClearinghouseReport,
  saveBlob,
  submitX12BatchToClearinghouse,
  type ClearinghouseResult,
  type ClearinghouseVendor,
  type X12Batch,
} from "@/lib/api/claims";
import X12StatusBadge from "./X12StatusBadge";
import {
  CLAIM_RESULT_LABELS,
  CLEARINGHOUSE_NAMES,
  PAYER_ACK_LABELS,
  clearinghouseBadge,
  clearinghouseResultsCsv,
  payerAckReasons,
  remittanceAdjustments,
  remittanceLabel,
} from "./x12ExportUtils";

// Stedi is the only clearinghouse in use. Claim.MD is turned off on the server; a
// production file it already took still blocks a second send.
const VENDOR: ClearinghouseVendor = "stedi";
const OTHER_VENDORS: ClearinghouseVendor[] = ["claimmd"];
const PAYER_ID_PATTERN = /^[A-Za-z0-9-]*$/;

type X12ClearinghouseDialogProps = {
  batch: X12Batch;
  onClose: () => void;
  /** Called after a send, so the file list and claims reload. */
  onSent: () => void;
};

/** Claims whose payer 277CA or 835 is new or changed between two loads of the report. */
function newPayerResponses(before: ClearinghouseResult | null, after: ClearinghouseResult): number {
  const seen = new Map((before?.claims ?? []).map((claim) => [claim.claimNumber, claim]));
  return after.claims.filter((claim) => {
    const old = seen.get(claim.claimNumber);
    return (
      JSON.stringify(claim.payerAcknowledgment ?? null) !== JSON.stringify(old?.payerAcknowledgment ?? null) ||
      JSON.stringify(claim.remittance ?? null) !== JSON.stringify(old?.remittance ?? null)
    );
  }).length;
}

function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (message) return message;
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Send a ready 837P file to Stedi and show what each claim got back. The file's
 * test/production mode (from 837P settings) decides Stedi's mode: a test file goes
 * through Stedi's test mode and never reaches the payer.
 */
export default function X12ClearinghouseDialog({ batch, onClose, onSent }: X12ClearinghouseDialogProps) {
  const { agencyId } = useOperationalAgency();
  const vendor = VENDOR;
  const [payerId, setPayerId] = useState("");
  const [productionConfirmed, setProductionConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingResult, setLoadingResult] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Partial<Record<ClearinghouseVendor, ClearinghouseResult>>>({});
  const [checking, setChecking] = useState(false);
  const [checkNote, setCheckNote] = useState("");

  const production = batch.usageIndicator === "P";
  const previous = results[vendor]?.submission ?? batch.clearinghouse?.[vendor] ?? null;
  const result = results[vendor] ?? null;
  const otherSent = OTHER_VENDORS.find((other) =>
    ["submitted", "partial", "submitting"].includes(batch.clearinghouse?.[other]?.status ?? ""),
  );
  const blockedByOther = production && Boolean(otherSent);
  const alreadySent = previous?.status === "submitted";
  const payerIdInvalid = !PAYER_ID_PATTERN.test(payerId.trim());
  const canSend =
    !sending && !alreadySent && !blockedByOther && !payerIdInvalid && previous?.status !== "submitting" && (!production || productionConfirmed);

  // A file sent before shows its saved results.
  useEffect(() => {
    if (!agencyId || results[vendor] || !batch.clearinghouse?.[vendor]) return undefined;
    const controller = new AbortController();
    setLoadingResult(true);
    getX12ClearinghouseReport({ context: { agencyId }, batchId: batch.id, vendor, signal: controller.signal })
      .then((loaded) => {
        if (!controller.signal.aborted) setResults((current) => ({ ...current, [vendor]: loaded }));
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(loadError, "Couldn't load the earlier results."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingResult(false);
      });
    return () => controller.abort();
  }, [agencyId, batch.clearinghouse, batch.id, results, vendor]);

  const send = async () => {
    if (!agencyId || !canSend) return;
    setSending(true);
    setError("");
    try {
      const sent = await submitX12BatchToClearinghouse({
        context: { agencyId },
        batchId: batch.id,
        vendor,
        payerId: payerId.trim() || undefined,
      });
      setResults((current) => ({ ...current, [vendor]: sent }));
      onSent();
    } catch (sendError) {
      setError(errorMessage(sendError, `Couldn't send the file to ${CLEARINGHOUSE_NAMES[vendor]}. Try again.`));
    } finally {
      setSending(false);
    }
  };

  // Payer 277CA / 835 responses arrive every 15 minutes on their own; this checks now.
  const checkResponses = async () => {
    if (!agencyId || checking) return;
    setChecking(true);
    setError("");
    setCheckNote("");
    try {
      const checked = await checkStediResponses({ context: { agencyId } });
      const reloaded = await getX12ClearinghouseReport({ context: { agencyId }, batchId: batch.id, vendor });
      setResults((current) => ({ ...current, [vendor]: reloaded }));
      const found = newPayerResponses(result, reloaded);
      setCheckNote(
        checked.reason === "running"
          ? "A check is already running. Results show here when it finishes."
          : checked.hadErrors
            ? "Couldn't read every response from Stedi. It tries again in a few minutes."
            : found
              ? `Found ${found} new ${found === 1 ? "response" : "responses"} from NJ Medicaid.`
              : "No new responses from NJ Medicaid yet.",
      );
      if (found) onSent();
    } catch (checkError) {
      setError(errorMessage(checkError, "Couldn't check for NJ Medicaid responses. Try again."));
    } finally {
      setChecking(false);
    }
  };

  const downloadResults = () => {
    if (!result) return;
    saveBlob(
      new Blob([clearinghouseResultsCsv(result)], { type: "text/csv;charset=utf-8" }),
      `${batch.fileName.replace(/\.[^.]+$/, "")}-${vendor}-results.csv`,
    );
  };

  const name = CLEARINGHOUSE_NAMES[vendor];
  const sendLabel = sending
    ? "Sending…"
    : alreadySent
      ? `Sent to ${name}`
      : previous?.status === "submitting"
        ? "Being sent…"
      : previous?.status === "partial"
        ? "Send the rest"
        : previous?.status === "failed"
          ? "Try again"
          : `Send to ${name}`;

  return (
    <Dialog open onOpenChange={(next) => !next && !sending && onClose()}>
      <DialogContent showCloseButton={false} className={`${BILLING_CORNER_MODAL_CLASS} flex max-h-[90dvh] flex-col`}>
        <BillingCornerModalHeader
          title="Send to Stedi"
          description={`${batch.fileName} · ${batch.claimCount} ${batch.claimCount === 1 ? "claim" : "claims"} · ${
            production ? "Production" : "Test"
          }. Stedi checks every claim and returns its 277CA acknowledgment.`}
          onClose={onClose}
          closeDisabled={sending}
        />

        <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-2 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <X12StatusBadge label={production ? "Production mode" : "Test mode"} tone={production ? "warning" : "neutral"} />
            {/* Once results load, their section shows this badge. */}
            {previous && !result ? <X12StatusBadge {...clearinghouseBadge(vendor, previous)} /> : null}
          </div>
          {!production ? (
            <p className="rounded-[12px] bg-[#eef9f9] p-4 text-[13px] text-[#344054]">
              This is a test file, so it goes through Stedi&apos;s test mode. Stedi checks each claim and returns a test 277CA, and nothing is
              sent to NJ Medicaid. To bill, set 837P settings to Production and create a new file.
            </p>
          ) : null}

          {!alreadySent ? (
            <div>
              <label htmlFor="clearinghouse-payer-id" className={BILLING_FIELD_LABEL_CLASS}>
                Payer ID for this send (optional)
              </label>
              <Input
                id="clearinghouse-payer-id"
                value={payerId}
                disabled={sending}
                placeholder={`Uses the ${name} payer ID in 837P settings`}
                aria-invalid={payerIdInvalid}
                onChange={(event) => setPayerId(event.target.value)}
                className={`${BILLING_FIELD_CLASS} w-full`}
              />
              <p className={`mt-1 text-[12px] ${payerIdInvalid ? "text-[#d92d20]" : "text-[#808081]"}`}>
                {payerIdInvalid ? "Letters, digits and dashes only." : `NJ Medicaid's ID on ${name}'s payer list, e.g. 100229 on Stedi.`}
              </p>
            </div>
          ) : null}

          {production && !alreadySent && !blockedByOther ? (
            <div className="space-y-3 rounded-[12px] bg-[#fffaeb] p-4">
              <p className="text-[13px] text-[#b54708]">
                This is a production file. Stedi sends accepted claims on to NJ Medicaid for payment.
              </p>
              <Checkbox
                checked={productionConfirmed}
                onChange={(event) => setProductionConfirmed(event.target.checked)}
                disabled={sending}
                className={BILLING_CHECKBOX_CLASS}
                label="Send this production file"
              />
            </div>
          ) : null}

          {blockedByOther && otherSent ? (
            <p role="status" className="rounded-[12px] bg-[#f2f4f7] p-4 text-[13px] text-[#344054]">
              This production file already went through {CLEARINGHOUSE_NAMES[otherSent]}. Sending it again would bill every claim twice.
            </p>
          ) : null}

          {loadingResult ? <p className="text-[13px] text-[#808081]">Loading earlier results…</p> : null}

          {result ? (
            <section className="space-y-3" aria-label={`${name} results`}>
              <div className="flex flex-wrap items-center gap-2">
                <X12StatusBadge {...clearinghouseBadge(vendor, result.submission)} />
                {result.submission.submittedAt ? (
                  <span className="text-[12px] text-[#808081]">
                    {new Date(result.submission.submittedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    {result.submission.payerId ? ` · payer ${result.submission.payerId}` : ""}
                  </span>
                ) : null}
              </div>
              {result.submission.message && result.submission.status !== "submitted" ? (
                <p className="text-[13px] text-[#b54708]">{result.submission.message}</p>
              ) : null}
              {result.claims.some((claim) => claim.status === "accepted") ? (
                <div className="flex flex-wrap items-center gap-3 rounded-[12px] bg-[#f7f9fa] p-3 text-[13px] text-[#344054]">
                  <span className="min-w-0 flex-1">
                    {production
                      ? "NJ Medicaid's acceptance (277CA) and payments (835) are checked every 15 minutes and show on each claim."
                      : "Test claims don't reach NJ Medicaid, so no payer answer comes back. Test responses from Stedi still show here."}
                  </span>
                  <button
                    type="button"
                    onClick={() => void checkResponses()}
                    disabled={checking || sending}
                    aria-busy={checking}
                    className={`${BILLING_SECONDARY_BUTTON_CLASS} gap-2`}
                  >
                    {checking ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
                    {checking ? "Checking…" : "Check now"}
                  </button>
                  {checkNote ? (
                    <p role="status" className="basis-full text-[#344054]">
                      {checkNote}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {result.claims.length ? (
                <ul className="max-h-[320px] divide-y divide-[#e5e5e6] overflow-y-auto rounded-[12px] border border-[#e5e5e6]">
                  {result.claims.map((claim) => (
                    <li key={claim.claimNumber} className="space-y-1 px-4 py-3 text-[13px]">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-[#10141a]">{claim.claimNumber}</span>
                        <X12StatusBadge {...CLAIM_RESULT_LABELS[claim.status]} />
                        {claim.reference ? <span className="text-[#808081]">Ref {claim.reference}</span> : null}
                      </p>
                      {claim.errors.length ? (
                        <ul className="list-disc space-y-0.5 pl-5 text-[#b42318]">
                          {claim.errors.map((issue, index) => (
                            <li key={`${issue.code}-${index}`}>
                              {issue.message || issue.code}
                              {issue.field ? <span className="text-[#808081]"> ({issue.field})</span> : null}
                            </li>
                          ))}
                        </ul>
                      ) : claim.status === "error" || claim.status === "pending" ? (
                        <p className="text-[#808081]">{claim.message}</p>
                      ) : null}
                      {claim.payerAcknowledgment ? (
                        <div className="space-y-0.5">
                          <p className="flex flex-wrap items-center gap-2">
                            <X12StatusBadge {...PAYER_ACK_LABELS[claim.payerAcknowledgment.outcome]} />
                            {claim.payerAcknowledgment.payerClaimNumber ? (
                              <span className="text-[#808081]">Payer claim {claim.payerAcknowledgment.payerClaimNumber}</span>
                            ) : null}
                          </p>
                          {claim.payerAcknowledgment.outcome === "rejected" ? (
                            <ul className="list-disc space-y-0.5 pl-5 text-[#b42318]">
                              {payerAckReasons(claim.payerAcknowledgment).map((reason) => (
                                <li key={reason}>{reason}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ) : null}
                      {claim.remittance ? (
                        <div className="space-y-0.5">
                          <p className="flex flex-wrap items-center gap-2">
                            <X12StatusBadge {...remittanceLabel(claim.remittance)} />
                            <span className="text-[#808081]">
                              {[
                                claim.remittance.paymentDate
                                  ? new Date(`${claim.remittance.paymentDate}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "medium" })
                                  : "",
                                claim.remittance.traceNumber ? `EFT/check ${claim.remittance.traceNumber}` : "",
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </p>
                          {claim.remittance.adjustments.length ? (
                            <ul className="list-disc space-y-0.5 pl-5 text-[#344054]">
                              {remittanceAdjustments(claim.remittance).map((line, index) => (
                                <li key={`${line}-${index}`}>{line}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ) : null}
                      {claim.ack277 ? (
                        <details className="text-[#344054]">
                          <summary className="cursor-pointer text-[#00807f]">Stedi 277CA acknowledgment</summary>
                          <pre className="mt-1 max-h-[160px] overflow-auto whitespace-pre-wrap break-all rounded-[8px] bg-[#f7f9fa] p-2 text-[11px]">
                            {claim.ack277.replace(/~/g, "~\n")}
                          </pre>
                        </details>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
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
            onClick={downloadResults}
            disabled={!result?.claims.length}
            className={BILLING_SECONDARY_BUTTON_CLASS}
          >
            Download results
          </button>
          <button
            type="button"
            onClick={() => void send()}
            disabled={!canSend}
            aria-busy={sending}
            className={`${BILLING_PRIMARY_BUTTON_CLASS} gap-2`}
          >
            {sending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
            {sendLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
