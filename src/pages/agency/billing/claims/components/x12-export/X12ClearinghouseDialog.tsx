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
  getX12ClearinghouseReport,
  saveBlob,
  submitX12BatchToClearinghouse,
  type ClearinghouseResult,
  type ClearinghouseVendor,
  type X12Batch,
} from "@/lib/api/claims";
import X12StatusBadge from "./X12StatusBadge";
import { CLAIM_RESULT_LABELS, CLEARINGHOUSE_NAMES, clearinghouseBadge, clearinghouseResultsCsv } from "./x12ExportUtils";

const VENDOR_DETAILS: Record<ClearinghouseVendor, string> = {
  stedi: "Sends each claim on its own and returns Stedi's 277CA acknowledgment for it.",
  claimmd: "Uploads the whole file and returns Claim.MD's answer for each claim.",
};
const VENDORS: ClearinghouseVendor[] = ["stedi", "claimmd"];
const PAYER_ID_PATTERN = /^[A-Za-z0-9-]*$/;

type X12ClearinghouseDialogProps = {
  batch: X12Batch;
  onClose: () => void;
  /** Called after a send, so the file list and claims reload. */
  onSent: () => void;
};

function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (message) return message;
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Send a ready 837P file to Stedi or Claim.MD and show what each claim got back. */
export default function X12ClearinghouseDialog({ batch, onClose, onSent }: X12ClearinghouseDialogProps) {
  const { agencyId } = useOperationalAgency();
  const [vendor, setVendor] = useState<ClearinghouseVendor>("stedi");
  const [payerId, setPayerId] = useState("");
  const [productionConfirmed, setProductionConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingResult, setLoadingResult] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<Partial<Record<ClearinghouseVendor, ClearinghouseResult>>>({});

  const production = batch.usageIndicator === "P";
  const previous = results[vendor]?.submission ?? batch.clearinghouse?.[vendor] ?? null;
  const result = results[vendor] ?? null;
  const otherSent = VENDORS.find(
    (other) => other !== vendor && ["submitted", "partial", "submitting"].includes((results[other]?.submission ?? batch.clearinghouse?.[other])?.status ?? ""),
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
          title="Send to a clearinghouse"
          description={`${batch.fileName} · ${batch.claimCount} ${batch.claimCount === 1 ? "claim" : "claims"} · ${
            production ? "Production" : "Test"
          }. The clearinghouse checks every claim and says whether it was accepted.`}
          onClose={onClose}
          closeDisabled={sending}
        />

        <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-2 pt-6">
          <fieldset className="space-y-2" disabled={sending}>
            <legend className={BILLING_FIELD_LABEL_CLASS}>Clearinghouse</legend>
            {VENDORS.map((option) => {
              const summary = results[option]?.submission ?? batch.clearinghouse?.[option] ?? null;
              const selected = option === vendor;
              return (
                <label
                  key={option}
                  className={`flex cursor-pointer gap-3 rounded-[12px] border p-4 transition-colors focus-within:ring-2 focus-within:ring-[#00b4b8] ${
                    selected ? "border-[#00b4b8] bg-[#eef9f9]" : "border-[#e5e5e6] hover:bg-[#f7f9fa]"
                  }`}
                >
                  <input
                    type="radio"
                    name="clearinghouse"
                    value={option}
                    checked={selected}
                    onChange={() => {
                      setVendor(option);
                      setError("");
                    }}
                    className="mt-1 h-4 w-4 accent-[#00b4b8]"
                  />
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-[#10141a]">
                      {CLEARINGHOUSE_NAMES[option]}
                      {summary ? <X12StatusBadge {...clearinghouseBadge(option, summary)} /> : null}
                    </span>
                    <span className="block text-[13px] text-[#808081]">{VENDOR_DETAILS[option]}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>

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
                This is a production file. Accepted claims go on to NJ Medicaid for payment, and a production file can only go through one
                clearinghouse.
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
                      {claim.ack277 ? (
                        <details className="text-[#344054]">
                          <summary className="cursor-pointer text-[#00807f]">277CA acknowledgment</summary>
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
