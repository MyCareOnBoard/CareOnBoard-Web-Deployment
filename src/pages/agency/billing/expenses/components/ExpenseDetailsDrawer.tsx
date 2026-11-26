import { useEffect, useId, useState, type ReactNode } from "react";
import { AlertTriangle, CalendarClock, CalendarDays, CircleCheck, CircleDot, Coins, FileText, LayoutGrid, Loader2, MessageSquareText, ReceiptText, UserRound, Wallet, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AgencyPill, type AgencyTone } from "@/components/agency/AgencyListKit";
import { useGetExpenseReviewQuery, type AgencyExpenseListItem, type ExpenseReview } from "@/lib/api/billing-expenses";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import { cn } from "@/lib/utils";
import { MIN_REJECTION_REASON_LENGTH } from "../utils/expensesDashboardUtils";

type ExpenseDetailsDrawerProps = {
  expense: AgencyExpenseListItem | null;
  /** Loads the shift, client, receipt check and limit for the expense. */
  agencyId?: string;
  /** Agency of the expense, shown on the network (super-admin) pages. */
  agencyName?: string;
  /** Approve and Decline show only for pending expenses when both handlers are given. */
  onApprove?: (expense: AgencyExpenseListItem) => void;
  onDecline?: (expense: AgencyExpenseListItem, reviewerNotes: string) => void;
  approving?: boolean;
  declining?: boolean;
  onClose: () => void;
  noun?: string;
};

const STATUS: Record<AgencyExpenseListItem["status"], { label: string; tone: AgencyTone }> = {
  pending: { label: "Awaiting review", tone: "amber" },
  approved: { label: "Approved", tone: "green" },
  rejected: { label: "Declined", tone: "red" },
};

const IMAGE_FILE = /\.(png|jpe?g|gif|webp|heic|avif)$/i;

/** "newark_museum_receipt.jpg" from a storage download URL. */
export function receiptFileName(url: string): string {
  try {
    const path = decodeURIComponent(new URL(url).pathname);
    const name = path.split("/").filter(Boolean).pop();
    return name || "Receipt";
  } catch {
    return "Receipt";
  }
}

function formatDateTime(value: string | null, withTime: boolean) {
  if (!value) return null;
  // A bare "2026-11-21" is a calendar day; read it as local midnight so it doesn't slip a day west of UTC.
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", timeZoneName: "short" } : {}),
  });
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="rounded-[6px] bg-[#f4f5f6] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5b636b] dark:bg-white/5 dark:text-[#9aa4a8]">
      {children}
    </h3>
  );
}

function DetailRow({ icon: Icon, label, children }: { icon: typeof UserRound; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-[14px]">
      <dt className="flex shrink-0 items-center gap-2 text-[#5b636b] dark:text-[#9aa4a8]">
        <Icon aria-hidden="true" className="h-4 w-4" />
        {label}
      </dt>
      <dd className="min-w-0 text-right font-medium text-[#10141a] [overflow-wrap:anywhere] dark:text-[#f4f6f7]">{children}</dd>
    </div>
  );
}

/** Only web links are opened or shown; anything else (e.g. a javascript: URL) is treated as missing. */
function safeReceiptUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function Receipt({ url: rawUrl, summary }: { url: string | null; summary: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const url = safeReceiptUrl(rawUrl);
  if (!url) {
    return (
      <div className="flex flex-col items-center rounded-[12px] border border-dashed border-[#dcdfe2] px-4 py-6 text-center dark:border-white/15">
        <ReceiptText aria-hidden="true" className="h-6 w-6 text-[#9aa1a7]" />
        <p className="mt-2 text-[13px] text-[#5b636b] dark:text-[#9aa4a8]">
          {rawUrl ? "The receipt link can't be opened." : "No receipt was attached."}
        </p>
      </div>
    );
  }
  const name = receiptFileName(url);
  const showImage = IMAGE_FILE.test(name) && !imageFailed;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open receipt ${name} in a new tab`}
      className="group block overflow-hidden rounded-[12px] border border-[#e4e7ea] bg-[#f8f9fa] transition-colors hover:border-[#b8c4c6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:border-white/10 dark:bg-white/5"
    >
      {showImage ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          onError={() => setImageFailed(true)}
          className="max-h-[220px] w-full bg-white object-contain dark:bg-transparent"
        />
      ) : (
        <span className="flex justify-center pt-6">
          <FileText aria-hidden="true" className="h-7 w-7 text-[#4b535b] dark:text-[#c9d1d4]" />
        </span>
      )}
      <span className="block px-4 pb-4 pt-3 text-center">
        <span className="block truncate text-[13px] font-semibold text-[#10141a] group-hover:underline dark:text-[#f4f6f7]">{name}</span>
        <span className="mt-0.5 block truncate text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">{summary}</span>
      </span>
    </a>
  );
}

function formatShift(shift: NonNullable<ExpenseReview["shift"]>) {
  const day = shift.date ? formatDateTime(shift.date, false)?.replace(/, \d{4}$/, "") : null;
  const times = [shift.startTime, shift.endTime].filter(Boolean).join(" – ");
  return [day, times].filter(Boolean).join(" · ") || "Shift";
}

function ShiftValue({ review, loading }: { review: ExpenseReview | undefined; loading: boolean }) {
  if (loading) return <span className="inline-block h-4 w-28 animate-pulse rounded bg-[#e9ecee] dark:bg-white/10" aria-label="Loading" />;
  if (!review) return <>—</>;
  if (review.shift) {
    return (
      <>
        {formatShift(review.shift)}
        {review.shiftMatchedBy === "date" ? (
          <span className="block text-[12px] font-normal text-[#6b737a] dark:text-[#9aa4a8]">Their only shift that day</span>
        ) : null}
      </>
    );
  }
  return (
    <span className="font-normal text-[#6b737a] dark:text-[#9aa4a8]">
      {review.sameDayShiftCount > 1 ? `${review.sameDayShiftCount} shifts that day` : "No shift that day"}
    </span>
  );
}

type CheckLine = { tone: "good" | "warn" | "muted"; title: string; detail?: string };

/** The receipt and limit lines under the receipt, worst tone first. */
export function reviewCheckLines(review: ExpenseReview | undefined, amount: number): CheckLine[] {
  if (!review) return [];
  const lines: CheckLine[] = [];
  const { receipt, limit } = review;
  const receiptDetail = [receipt.merchant, receipt.summary].filter(Boolean).join(" · ") || undefined;
  if (receipt.status === "match") {
    lines.push({ tone: "good", title: "Amount matches the receipt", detail: receiptDetail });
  } else if (receipt.status === "mismatch" && receipt.total != null) {
    lines.push({
      tone: "warn",
      title: `Receipt shows ${formatCurrency(receipt.total)}, not ${formatCurrency(amount)}`,
      detail: receiptDetail,
    });
  } else if (receipt.status === "unreadable") {
    lines.push({ tone: "muted", title: "Couldn't read the total on the receipt", detail: "Check the amount against the receipt yourself." });
  }
  if (limit) {
    const label = `${formatCurrency(limit.limit)} per-shift ${limit.category.toLowerCase()} limit`;
    const where = limit.scope === "shift" ? "on this shift" : "that day (no shift linked)";
    const spent = limit.otherExpenseCount
      ? `${formatCurrency(limit.spent)} spent ${where}, with ${limit.otherExpenseCount} other ${limit.otherExpenseCount === 1 ? "expense" : "expenses"}.`
      : undefined;
    lines.push(
      limit.withinLimit
        ? { tone: "good", title: `Inside the ${label}`, detail: spent }
        : { tone: "warn", title: `Over the ${label}`, detail: spent ?? `${formatCurrency(limit.spent)} spent ${where}.` },
    );
  }
  return lines.sort((left, right) => (left.tone === "warn" ? -1 : 0) - (right.tone === "warn" ? -1 : 0));
}

const CHECK_TONE: Record<CheckLine["tone"], string> = {
  good: "bg-[#ecfdf3] text-[#05603a] dark:bg-[#0eaf52]/10 dark:text-[#7fe0a7]",
  warn: "bg-[#fffaeb] text-[#93370d] dark:bg-[#f59e0b]/10 dark:text-[#fcd34d]",
  muted: "bg-[#f4f5f6] text-[#4b535b] dark:bg-white/5 dark:text-[#c9d1d4]",
};

function ReviewChecks({ lines }: { lines: CheckLine[] }) {
  if (!lines.length) return null;
  return (
    <ul className="space-y-2" aria-label="Checks">
      {lines.map((line) => {
        const Icon = line.tone === "good" ? CircleCheck : AlertTriangle;
        return (
          <li key={line.title} className={cn("flex gap-2.5 rounded-[12px] px-3 py-2.5 text-[13px]", CHECK_TONE[line.tone])}>
            <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="block font-semibold">{line.title}</span>
              {line.detail ? <span className="block opacity-90">{line.detail}</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Side drawer with an expense's details and receipt, where a pending expense can be approved or declined. */
export default function ExpenseDetailsDrawer({
  expense,
  agencyId,
  agencyName,
  onApprove,
  onDecline,
  approving = false,
  declining = false,
  onClose,
  noun = "DSP",
}: ExpenseDetailsDrawerProps) {
  const noteId = useId();
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const expenseId = expense?.id;
  const reviewQuery = useGetExpenseReviewQuery(
    { agencyId: agencyId ?? "", expenseId: expenseId ?? "" },
    { skip: !agencyId || !expenseId },
  );
  const review = reviewQuery.currentData;
  const reviewLoading = Boolean(agencyId) && reviewQuery.isFetching && !review;

  useEffect(() => {
    setNote("");
    setNoteError(null);
  }, [expenseId]);

  if (!expense) return null;

  const busy = approving || declining;
  const canReview = expense.status === "pending" && Boolean(onApprove && onDecline);
  const status = STATUS[expense.status] ?? STATUS.pending;
  const amount = formatCurrency(expense.amount);
  const submitted = formatDateTime(expense.submittedAt, true);
  const reviewed = formatDateTime(expense.reviewedAt, true);

  const decline = () => {
    const trimmed = note.trim();
    if (trimmed.length < MIN_REJECTION_REASON_LENGTH) {
      setNoteError(`Add at least ${MIN_REJECTION_REASON_LENGTH} characters so the ${noun} understands why.`);
      return;
    }
    setNoteError(null);
    onDecline?.(expense, trimmed);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(event) => busy && event.preventDefault()}
        onEscapeKeyDown={(event) => busy && event.preventDefault()}
        className="top-2 right-2 bottom-2 left-auto flex w-[calc(100vw-16px)] max-w-[440px] translate-x-0 translate-y-0 flex-col overflow-hidden rounded-[20px] p-0 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 data-[state=closed]:slide-out-to-right-8 data-[state=open]:slide-in-from-right-8 sm:top-3 sm:right-3 sm:bottom-3 dark:bg-[#141b21]"
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-[#eceef0] px-5 pb-4 pt-5 dark:border-white/10">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#dcdfe2] text-[#0b5c5d] dark:border-white/15 dark:text-[#7fd3d3]">
            <Wallet aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-[18px] font-medium leading-tight text-[#10141a] dark:text-[#f4f6f7]">
              Expense from {expense.employeeName || `this ${noun}`}
            </DialogTitle>
            <DialogDescription className="mt-1 text-[12px] text-[#5b636b] dark:text-[#9aa4a8]">
              {submitted ? `Submitted ${submitted}` : "Submission time not recorded"}
            </DialogDescription>
          </div>
          <button
            type="button"
            aria-label="Close expense details"
            onClick={onClose}
            disabled={busy}
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-[#dcdfe2] text-[#10141a] transition-colors hover:bg-[#f4f5f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-[#f4f6f7]"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <section aria-label="Details" className="space-y-2">
            <SectionTitle>Details</SectionTitle>
            <dl className="rounded-[12px] bg-[#f8f9fa] px-3 py-1 dark:bg-white/5">
              {agencyName ? <DetailRow icon={UserRound} label="Agency">{agencyName}</DetailRow> : null}
              <DetailRow icon={UserRound} label={noun}>{expense.employeeName || "—"}</DetailRow>
              {agencyId ? (
                <>
                  <DetailRow icon={UserRound} label="Client">
                    {reviewLoading ? <ShiftValue review={undefined} loading /> : review?.shift?.clientName || "—"}
                  </DetailRow>
                  <DetailRow icon={CalendarClock} label="Shift"><ShiftValue review={review} loading={reviewLoading} /></DetailRow>
                </>
              ) : null}
              <DetailRow icon={CalendarDays} label="Expense date">{formatDateTime(expense.date, false) ?? "—"}</DetailRow>
              <DetailRow icon={LayoutGrid} label="Category">{expense.category || "—"}</DetailRow>
              <DetailRow icon={Coins} label="Amount"><span className="tabular-nums">{amount}</span></DetailRow>
              <DetailRow icon={CircleDot} label="Status"><AgencyPill tone={status.tone}>{status.label}</AgencyPill></DetailRow>
            </dl>
            {expense.message ? (
              <div className="rounded-[12px] border border-[#eceef0] px-3 py-2.5 dark:border-white/10">
                <p className="flex items-center gap-2 text-[12px] font-medium text-[#5b636b] dark:text-[#9aa4a8]">
                  <MessageSquareText aria-hidden="true" className="h-3.5 w-3.5" />
                  {noun}&apos;s note
                </p>
                <p className="mt-1 whitespace-pre-line text-[14px] text-[#10141a] [overflow-wrap:anywhere] dark:text-[#f4f6f7]">{expense.message}</p>
              </div>
            ) : null}
          </section>

          <section aria-label="Receipt" className="space-y-2">
            <SectionTitle>Receipt</SectionTitle>
            <Receipt url={expense.receiptUrl} summary={[expense.category, amount].filter(Boolean).join(" · ")} />
            {reviewLoading ? (
              <p className="flex items-center gap-2 text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">
                <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                Checking the receipt…
              </p>
            ) : (
              <ReviewChecks lines={reviewCheckLines(review, expense.amount)} />
            )}
            {reviewQuery.isError && !review ? (
              <p className="text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">Couldn&apos;t load the shift and receipt check.</p>
            ) : null}
          </section>

          {expense.status !== "pending" ? (
            <section aria-label="Review" className="space-y-2">
              <SectionTitle>Review</SectionTitle>
              <div
                className={cn(
                  "rounded-[12px] px-3 py-2.5 text-[13px]",
                  expense.status === "approved"
                    ? "bg-[#ecfdf3] text-[#05603a] dark:bg-[#0eaf52]/10 dark:text-[#7fe0a7]"
                    : "bg-[#fef3f2] text-[#912018] dark:bg-[#ef4444]/10 dark:text-[#f8a1a1]",
                )}
              >
                <p className="font-semibold">
                  {expense.status === "approved" ? "Approved" : "Declined"}{reviewed ? ` ${reviewed}` : ""}
                </p>
                {expense.reviewerNotes ? <p className="mt-1 whitespace-pre-line [overflow-wrap:anywhere]">{expense.reviewerNotes}</p> : null}
                {expense.status === "approved" ? (
                  <p className="mt-1">{expense.payrollInvoiceId ? "Paid in a payroll run." : "Joins the next pay run."}</p>
                ) : null}
              </div>
            </section>
          ) : null}

          {canReview ? (
            <div className="space-y-1.5">
              <label htmlFor={noteId} className="text-[13px] font-medium text-[#2a3138] dark:text-[#c9d1d4]">
                Note to {noun} <span className="font-normal text-[#6b737a]">(needed to decline)</span>
              </label>
              <textarea
                id={noteId}
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  if (noteError) setNoteError(null);
                }}
                rows={3}
                maxLength={1000}
                disabled={busy}
                aria-invalid={noteError ? true : undefined}
                aria-describedby={noteError ? `${noteId}-error` : undefined}
                placeholder="Add a note if you decline this expense"
                className="w-full resize-none rounded-[10px] border border-[#dcdfe2] bg-white px-3.5 py-2.5 text-[14px] text-[#10141a] outline-none transition-colors placeholder:text-[#9aa1a7] focus-visible:border-[#0b8a8c] focus-visible:ring-2 focus-visible:ring-[#0b8a8c]/20 disabled:cursor-not-allowed disabled:bg-[#f4f5f6] aria-[invalid=true]:border-[#b42318] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7]"
              />
              {noteError ? (
                <p id={`${noteId}-error`} role="alert" className="text-[12px] text-[#b42318] dark:text-[#ffb4a9]">{noteError}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {canReview ? (
          <div className="flex shrink-0 gap-3 border-t border-[#eceef0] px-5 py-4 dark:border-white/10">
            <button
              type="button"
              onClick={decline}
              disabled={busy}
              className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#dcdfe2] bg-white px-4 text-[14px] font-semibold text-[#10141a] transition-colors hover:bg-[#f4f5f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7]"
            >
              {declining ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
              Decline
            </button>
            <button
              type="button"
              onClick={() => onApprove?.(expense)}
              disabled={busy}
              className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[#003839] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#00494a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#00a3a7] dark:text-[#06292a]"
            >
              {approving ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
              Approve {amount}
            </button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
