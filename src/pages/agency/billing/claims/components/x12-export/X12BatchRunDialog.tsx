import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import CustomDatePicker from "@/components/ui/datePicker";
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
  checkX12Run,
  createX12Run,
  X12RunError,
  type BillingClaimListItem,
  type X12Run,
  type X12RunCheck,
  type X12RunFilter,
} from "@/lib/api/claims";
import { getExportableClaims, groupClaimIssues, runPreviewText } from "./x12ExportUtils";

type X12BatchRunDialogProps = {
  /** Claims on the page; used for "Claims on this page" and to link problems to claim reports. */
  claims: readonly BillingClaimListItem[];
  onClose: () => void;
  onOpenSettings: () => void;
  onCreated: (run: X12Run, queued: boolean) => void;
  onOpenReport?: (claim: BillingClaimListItem) => void;
};

type Scope = "all" | "page";

/** "2026-10-19" → a local Date (parseISO, so the day never shifts by time zone). */
function ymdToDate(ymd: string): Date | null {
  return ymd ? parseISO(ymd) : null;
}

function dateToYmd(date: Date | null): string {
  return date ? format(date, "yyyy-MM-dd") : "";
}

function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (message) return message;
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Create a .zip of NJMMIS-ready 837P files: every pending claim in a date range, or
 * the pending claims on this page. Big batches finish in the background.
 */
export default function X12BatchRunDialog({ claims, onClose, onOpenSettings, onCreated, onOpenReport }: X12BatchRunDialogProps) {
  const { agencyId, mode } = useOperationalAgency();
  const [scope, setScope] = useState<Scope>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [skipInvalid, setSkipInvalid] = useState(false);
  const [check, setCheck] = useState<X12RunCheck | null>(null);
  const [busy, setBusy] = useState<"checking" | "creating" | null>(null);
  const [error, setError] = useState("");

  const pageClaims = useMemo(() => getExportableClaims(claims), [claims]);
  const rangeInvalid = Boolean(from && to && from > to);

  const request = () => {
    if (scope === "page") return { claimIds: pageClaims.map((claim) => claim.id) };
    const filter: X12RunFilter = {};
    if (from) filter.from = from;
    if (to) filter.to = to;
    if (mode === "ddd" || mode === "hha") filter.program = mode;
    return { filter };
  };

  const reset = () => {
    setCheck(null);
    setError("");
  };

  const runCheck = async () => {
    if (!agencyId || rangeInvalid) return;
    setBusy("checking");
    setError("");
    try {
      setCheck(await checkX12Run({ context: { agencyId }, ...request() }));
    } catch (checkError) {
      setError(errorMessage(checkError, "Couldn't check the claims."));
    } finally {
      setBusy(null);
    }
  };

  const runCreate = async () => {
    if (!agencyId || rangeInvalid) return;
    setBusy("creating");
    setError("");
    try {
      const { run, queued } = await createX12Run({ context: { agencyId }, ...request(), skipInvalid });
      onCreated(run, queued);
      onClose();
    } catch (createError) {
      if (createError instanceof X12RunError && createError.details) {
        setCheck((current) => ({
          claimCount: current?.claimCount ?? 0,
          validClaimCount: current?.validClaimCount ?? 0,
          fileCount: current?.fileCount ?? 0,
          totalChargeCents: current?.totalChargeCents ?? 0,
          warnings: current?.warnings ?? [],
          settingsErrors: createError.details?.settingsErrors ?? [],
          claimErrors: createError.details?.claimErrors ?? [],
        }));
        setError(createError.message);
      } else {
        setError(errorMessage(createError, "Couldn't create the 837P batch."));
      }
    } finally {
      setBusy(null);
    }
  };

  const claimIssues = groupClaimIssues(check?.claimErrors ?? []);
  const blocked =
    Boolean(busy) ||
    rangeInvalid ||
    (scope === "page" && pageClaims.length === 0) ||
    (check !== null && (check.settingsErrors.length > 0 || check.validClaimCount === 0 || (claimIssues.length > 0 && !skipInvalid)));

  return (
    <Dialog open onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent showCloseButton={false} className={`${BILLING_CORNER_MODAL_CLASS} flex max-h-[90dvh] flex-col`}>
        <BillingCornerModalHeader
          title="Create 837P batch (.zip)"
          description="NJMMIS-ready files with a claim list, validation report and 999 for each file."
          onClose={onClose}
          closeDisabled={Boolean(busy)}
        />

        <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-2 pt-6">
          <fieldset className="space-y-3">
            <legend className={BILLING_FIELD_LABEL_CLASS}>Claims</legend>
            <label className="flex cursor-pointer items-center gap-3 text-[14px] text-[#10141a]">
              <input
                type="radio"
                name="x12-run-scope"
                checked={scope === "all"}
                onChange={() => {
                  setScope("all");
                  reset();
                }}
                disabled={Boolean(busy)}
                className="h-4 w-4 accent-[#00b4b8]"
              />
              All pending claims not yet in a file
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-[14px] text-[#10141a]">
              <input
                type="radio"
                name="x12-run-scope"
                checked={scope === "page"}
                onChange={() => {
                  setScope("page");
                  reset();
                }}
                disabled={Boolean(busy)}
                className="h-4 w-4 accent-[#00b4b8]"
              />
              Pending claims on this page ({pageClaims.length})
            </label>
          </fieldset>

          {scope === "all" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <span className={BILLING_FIELD_LABEL_CLASS}>Service date from</span>
                <CustomDatePicker
                  align="start"
                  ariaLabel="Service date from"
                  placeholder="Any date"
                  date={ymdToDate(from)}
                  setDate={(date) => {
                    setFrom(dateToYmd(date));
                    reset();
                  }}
                  disabled={Boolean(busy)}
                  className={BILLING_FIELD_CLASS}
                />
              </div>
              <div>
                <span className={BILLING_FIELD_LABEL_CLASS}>Service date to</span>
                <CustomDatePicker
                  align="end"
                  ariaLabel="Service date to"
                  placeholder="Any date"
                  date={ymdToDate(to)}
                  setDate={(date) => {
                    setTo(dateToYmd(date));
                    reset();
                  }}
                  disabled={Boolean(busy)}
                  className={BILLING_FIELD_CLASS}
                />
              </div>
              {rangeInvalid ? (
                <p role="alert" className="text-[13px] text-[#d92d20] sm:col-span-2">
                  The start date must be on or before the end date.
                </p>
              ) : (
                <p className="text-[13px] text-[#808081] sm:col-span-2">
                  Leave the dates blank for every pending claim. At most 5,000 claims per batch.
                  {from || to ? (
                    <button
                      type="button"
                      onClick={() => {
                        setFrom("");
                        setTo("");
                        reset();
                      }}
                      disabled={Boolean(busy)}
                      className="ml-2 font-medium text-[#00b4b8] underline disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Clear dates
                    </button>
                  ) : null}
                </p>
              )}
            </div>
          ) : null}

          <Checkbox
            checked={skipInvalid}
            onChange={(event) => setSkipInvalid(event.target.checked)}
            disabled={Boolean(busy)}
            className={BILLING_CHECKBOX_CLASS}
            label="Leave out claims that need fixing"
          />

          {check ? (
            <p
              role="status"
              className={`rounded-[10px] px-4 py-3 text-[14px] ${
                check.validClaimCount > 0 ? "bg-[#ecfdf3] text-[#027a48]" : "bg-[#f2f4f7] text-[#344054]"
              }`}
            >
              {check.claimCount === 0
                ? "No pending claims match."
                : `${runPreviewText({ claims: check.validClaimCount, files: check.fileCount, totalChargeCents: check.totalChargeCents })}${
                    claimIssues.length > 0 ? ` (${claimIssues.length} more need fixing)` : ""
                  }`}
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
                {skipInvalid ? " and will be left out" : ""}
              </p>
              {claimIssues.slice(0, 50).map((entry) => {
                const claim = onOpenReport ? claims.find((item) => item.id === entry.claimId) : undefined;
                return (
                  <div key={entry.claimId}>
                    <p className="font-medium">
                      {entry.claimNumber}
                      {claim ? (
                        <button
                          type="button"
                          onClick={() => onOpenReport?.(claim)}
                          disabled={Boolean(busy)}
                          className="ml-3 font-normal underline disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Open claim report
                        </button>
                      ) : null}
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                      {entry.messages.map((message, index) => (
                        <li key={index}>{message}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
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
            disabled={Boolean(busy) || rangeInvalid || (scope === "page" && pageClaims.length === 0)}
            aria-busy={busy === "checking"}
            className={`${BILLING_SECONDARY_BUTTON_CLASS} gap-2`}
          >
            {busy === "checking" ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
            {busy === "checking" ? "Checking…" : "Check claims"}
          </button>
          <button
            type="button"
            onClick={() => void runCreate()}
            disabled={blocked}
            aria-busy={busy === "creating"}
            className={`${BILLING_PRIMARY_BUTTON_CLASS} gap-2`}
          >
            {busy === "creating" ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
            {busy === "creating" ? "Creating…" : "Create zip"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
