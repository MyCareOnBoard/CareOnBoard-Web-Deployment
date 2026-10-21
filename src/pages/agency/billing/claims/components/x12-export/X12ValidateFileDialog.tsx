import { useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import BillingCornerModalHeader from "@/pages/agency/billing/components/BillingCornerModalHeader";
import {
  BILLING_CORNER_MODAL_CLASS,
  BILLING_PRIMARY_BUTTON_CLASS,
  BILLING_SECONDARY_BUTTON_CLASS,
} from "@/pages/agency/billing/components/billingModalStyles";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";
import { validateX12File, type X12FileValidation } from "@/lib/api/claims";
import X12StatusBadge from "./X12StatusBadge";
import { VALIDATION_LABELS, formatCents, readFileBytes } from "./x12ExportUtils";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const SHOWN_ISSUES = 50;

type X12ValidateFileDialogProps = {
  onClose: () => void;
  onOpenReport: (html: string, fileName: string) => void;
};

/** Check an 837P file from this computer (one made elsewhere, or edited by hand). Nothing is saved. */
export default function X12ValidateFileDialog({ onClose, onOpenReport }: X12ValidateFileDialogProps) {
  const { agencyId } = useOperationalAgency();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<X12FileValidation | null>(null);

  const tooBig = Boolean(file && file.size > MAX_FILE_BYTES);

  const validate = async () => {
    if (!agencyId || !file || tooBig) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const content = new TextDecoder("latin1").decode(await readFileBytes(file));
      setResult(await validateX12File({ context: { agencyId }, fileName: file.name, content }));
    } catch (validateError) {
      const message = (validateError as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || "Couldn't check the file. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const issues = result ? [...result.errors, ...result.warnings] : [];

  return (
    <Dialog open onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent showCloseButton={false} className={`${BILLING_CORNER_MODAL_CLASS} flex max-h-[90dvh] flex-col`}>
        <BillingCornerModalHeader
          title="Validate an 837P file"
          description="Checks the file against the 837P guide and NJMMIS rules. The file isn't saved."
          onClose={onClose}
          closeDisabled={busy}
        />

        <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-2 pt-6">
          <input
            ref={inputRef}
            type="file"
            accept=".edi,.x12,.txt,.837,.dat"
            className="sr-only"
            aria-label="837P file"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setResult(null);
              setError("");
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className={`${BILLING_SECONDARY_BUTTON_CLASS} w-full`}
          >
            {file ? file.name : "Choose a file"}
          </button>
          {tooBig ? (
            <p role="alert" className="text-[13px] text-[#d92d20]">
              Files over 10 MB can't be checked.
            </p>
          ) : null}

          {result ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[14px] text-[#10141a]">
                <X12StatusBadge {...VALIDATION_LABELS[result.status]} />
                <span>
                  {result.file.claims} {result.file.claims === 1 ? "claim" : "claims"} · {result.file.lines} lines ·{" "}
                  {formatCents(result.file.totalChargeCents)} · {result.summary.errors} errors · {result.summary.warnings} warnings
                </span>
              </div>
              {issues.length ? (
                <ul className="max-h-[320px] divide-y divide-[#e5e5e6] overflow-y-auto rounded-[12px] border border-[#e5e5e6]">
                  {issues.slice(0, SHOWN_ISSUES).map((issue, index) => (
                    <li key={`${issue.code}-${index}`} className="px-4 py-2 text-[13px]">
                      <span className={issue.level === "error" ? "font-medium text-[#b42318]" : "font-medium text-[#b54708]"}>
                        {issue.claimNumber ? `Claim ${issue.claimNumber}` : "File"}
                      </span>
                      <span className="text-[#10141a]">: {issue.message}</span>
                      {issue.line ? <span className="text-[#808081]"> (line {issue.line})</span> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {issues.length > SHOWN_ISSUES ? (
                <p className="text-[13px] text-[#808081]">The report lists all {issues.length} issues.</p>
              ) : null}
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
            onClick={() => result?.reportHtml && onOpenReport(result.reportHtml, `${(file?.name ?? "837P").replace(/\.[^.]+$/, "")}-validation.html`)}
            disabled={!result?.reportHtml}
            className={BILLING_SECONDARY_BUTTON_CLASS}
          >
            View report
          </button>
          <button
            type="button"
            onClick={() => void validate()}
            disabled={busy || !file || tooBig}
            className={BILLING_PRIMARY_BUTTON_CLASS}
          >
            {busy ? "Checking…" : "Check file"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
