import { useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import BillingCornerModalHeader from "@/pages/agency/billing/components/BillingCornerModalHeader";
import {
  BILLING_CORNER_MODAL_CLASS,
  BILLING_PRIMARY_BUTTON_CLASS,
  BILLING_SECONDARY_BUTTON_CLASS,
} from "@/pages/agency/billing/components/billingModalStyles";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";
import { importX12Responses, type X12Response } from "@/lib/api/claims";
import X12StatusBadge from "./X12StatusBadge";
import { readUploadFile, SUBMISSION_LABELS } from "./x12ExportUtils";

const MAX_FILES = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

type X12ResponseUploadDialogProps = {
  onClose: () => void;
  /** Called after an import so the file list and claims reload. */
  onImported: (responses: X12Response[]) => void;
};

function responseSummary(response: X12Response): string {
  if (response.status === "unrecognized") return "Not a TA1, 999 or 824 file.";
  const noAccess = response.unmatched.filter((item) => item.reason === "no_access").length;
  const noAccessText = noAccess
    ? ` ${noAccess === 1 ? "1 file holds" : `${noAccess} files hold`} claims from a program you can't manage, so ${noAccess === 1 ? "it was" : "they were"} left alone.`
    : "";
  if (response.status === "unmatched") {
    const numbers = response.unmatched
      .filter((item) => item.reason !== "no_access")
      .map((item) => item.controlNumber)
      .filter(Boolean)
      .join(", ");
    if (noAccess && !numbers) return noAccessText.trim();
    return `Didn't match any of your files${numbers ? ` (control numbers ${numbers})` : ""}.${noAccessText}`;
  }
  const parts = [];
  if (response.acceptedClaims) parts.push(`${response.acceptedClaims} ${response.acceptedClaims === 1 ? "claim" : "claims"} accepted`);
  if (response.rejectedClaims) parts.push(`${response.rejectedClaims} rejected and unlocked for fixing`);
  return `${parts.length ? `${parts.join(", ")}.` : "Matched your file."}${noAccessText}`;
}

/** Upload what NJMMIS sent back (TA1, 999, 824 or a zip of them) to mark files and claims. */
export default function X12ResponseUploadDialog({ onClose, onImported }: X12ResponseUploadDialogProps) {
  const { agencyId } = useOperationalAgency();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<X12Response[] | null>(null);

  const tooBig = files.find((file) => file.size > MAX_FILE_BYTES);

  const upload = async () => {
    if (!agencyId || files.length === 0 || tooBig) return;
    setBusy(true);
    setError("");
    try {
      const payload = await Promise.all(files.map(readUploadFile));
      const imported = await importX12Responses({ context: { agencyId }, files: payload });
      setResults(imported);
      onImported(imported);
    } catch (uploadError) {
      const message = (uploadError as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || "Couldn't import the response files. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent showCloseButton={false} className={`${BILLING_CORNER_MODAL_CLASS} flex max-h-[90dvh] flex-col`}>
        <BillingCornerModalHeader
          title="Upload NJMMIS response"
          description="TA1, 999 or 824 files (or a zip of them). Matching files and claims are updated."
          onClose={onClose}
          closeDisabled={busy}
        />

        <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-2 pt-6">
          {results ? (
            <ul className="divide-y divide-[#e5e5e6] rounded-[12px] border border-[#e5e5e6]">
              {results.map((response) => (
                <li key={response.id} className="space-y-1 px-4 py-3">
                  <p className="text-[14px] font-medium text-[#10141a]">
                    {response.fileName || "Response file"}
                    {response.types.length ? <span className="ml-2 text-[12px] text-[#808081]">{response.types.join(", ")}</span> : null}
                  </p>
                  <p className="text-[13px] text-[#808081]">{responseSummary(response)}</p>
                  {response.matched.map((match) => (
                    <p key={match.batchId} className="flex flex-wrap items-center gap-2 text-[13px] text-[#10141a]">
                      {match.fileName || match.interchangeControlNumber || match.batchId}
                      {SUBMISSION_LABELS[match.status] ? <X12StatusBadge {...SUBMISSION_LABELS[match.status]} /> : null}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          ) : (
            <>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".999,.ta1,.824,.txt,.x12,.edi,.dat,.zip"
                className="sr-only"
                aria-label="Response files"
                onChange={(event) => {
                  setFiles(Array.from(event.target.files ?? []).slice(0, MAX_FILES));
                  setError("");
                }}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className={`${BILLING_SECONDARY_BUTTON_CLASS} w-full`}
              >
                {files.length ? "Choose different files" : "Choose files"}
              </button>
              {files.length ? (
                <ul className="space-y-1 text-[14px] text-[#10141a]">
                  {files.map((file) => (
                    <li key={`${file.name}-${file.size}`}>
                      {file.name}
                      {file.size > MAX_FILE_BYTES ? <span className="ml-2 text-[#d92d20]">over 5 MB</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-[#808081]">Up to {MAX_FILES} files, 5 MB each.</p>
              )}
            </>
          )}

          {error ? (
            <p role="alert" className="text-[14px] text-[#d92d20]">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 pb-8 pt-4">
          {results ? (
            <button type="button" onClick={onClose} className={BILLING_PRIMARY_BUTTON_CLASS}>
              Done
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void upload()}
              disabled={busy || files.length === 0 || Boolean(tooBig)}
              className={BILLING_PRIMARY_BUTTON_CLASS}
            >
              {busy ? "Importing…" : "Import"}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
