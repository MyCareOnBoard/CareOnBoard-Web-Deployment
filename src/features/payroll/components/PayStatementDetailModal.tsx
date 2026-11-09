import { useRef, useState, type ReactNode } from "react";
import { Download, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CloseButton, SIDE_PANEL, SIDE_PANEL_OVERLAY, StatusPill } from "@/pages/userPanel/records/RecordsKit";
import { downloadEmployeePayStatementPdf } from "../api/employeePayrollEndpoints";
import { formatAmount, formatHours, formatPayDate, payPeriod, STATUS_LABEL, STATUS_TONE, statementHours } from "../model/payStatementView";
import type { PayStatement, PayStatementLine } from "../model/types";

type PayStatementDetailModalProps = {
  open: boolean;
  statement: PayStatement | null;
  currency: "USD";
  employmentId: string;
  /** Shown at the top of the panel; it is always the signed-in person's own statement. */
  employeeName?: string;
  onOpenChange: (open: boolean) => void;
};

function paymentMethod(method: PayStatement["paymentMethod"]) {
  return method === "direct_deposit" ? "Direct deposit" : method === "manual" ? "Manual payment" : "Payment method unavailable";
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

const SECTION_TITLE = "text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]";
const EMPTY_LINES = "py-2.5 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]";
const TOTAL = "border-t border-[#e3e8ea] dark:border-white/15";
const ROW = "flex items-start justify-between gap-4 border-b border-[#edf1f2] py-2.5 text-[13px] last:border-b-0 dark:border-white/10";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section><h3 className={SECTION_TITLE}>{title}</h3><dl className="mt-1">{children}</dl></section>;
}

function DetailLine({ label, children }: { label: string; children: ReactNode }) {
  return <div className={ROW}><dt className="text-[#34434c] dark:text-[#c9d3d6]">{label}</dt><dd className="text-right text-[#10141a] dark:text-[#f4f6f7]">{children}</dd></div>;
}

function MoneyLines({ lines, negative = false }: { lines: PayStatementLine[]; negative?: boolean }) {
  return <>{lines.map((line, index) => <div key={`${line.label}-${index}`} className={ROW}>
    <dt className="min-w-0 text-[#34434c] dark:text-[#c9d3d6]">
      <span className="block break-words">{line.label}</span>
      {line.hours !== null && <span className="mt-0.5 block text-[12px] text-[#4a6b7c] dark:text-[#9aa4a8]">{line.hours} h{line.rateCents !== null ? ` × ${formatAmount(line.rateCents)}` : ""}</span>}
    </dt>
    <dd className="shrink-0 tabular-nums text-[#10141a] dark:text-[#f4f6f7]">{negative ? "-" : ""}{formatAmount(line.amountCents)}</dd>
  </div>)}</>;
}

function TotalLine({ label, cents, negative = false }: { label: string; cents: number | null; negative?: boolean }) {
  return <div className="flex items-center justify-between gap-4 py-2.5 text-[13px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">
    <dt>{label}</dt><dd className="tabular-nums">{negative && cents ? "-" : ""}{formatAmount(cents)}</dd>
  </div>;
}

export function PayStatementDetailModal({ open, statement, employmentId, employeeName, onOpenChange }: PayStatementDetailModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const downloading = useRef(false);
  if (!statement) return null;
  const handleDownload = async () => {
    if (downloading.current || !statement.downloadAvailable) return;
    downloading.current = true;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const blob = await downloadEmployeePayStatementPdf({ employmentId, statementId: statement.statementId });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      try {
        anchor.href = url;
        anchor.download = "pay-statement.pdf";
        document.body.appendChild(anchor);
        anchor.click();
      } finally {
        anchor.remove();
        URL.revokeObjectURL(url);
      }
    } catch {
      setDownloadError("We couldn't download this statement. Please try again.");
    } finally {
      downloading.current = false;
      setIsDownloading(false);
    }
  };
  const deductions = [...statement.taxes, ...statement.otherDeductions];
  const name = employeeName?.trim();
  const showFooter = statement.downloadAvailable || downloadError;

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent showCloseButton={false} overlayClassName={SIDE_PANEL_OVERLAY} className={cn(SIDE_PANEL, "max-w-[460px] bg-white")}>
      <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <DialogTitle className="text-[18px] font-bold text-[#10141a] dark:text-[#f4f6f7]">Pay statement</DialogTitle>
          <DialogDescription className="mt-0.5 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">Pay date {formatPayDate(statement.payDate)} · Pay period {payPeriod(statement)}</DialogDescription>
        </div>
        <CloseButton label="Close pay statement" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-5 [&>*]:shrink-0">
        <div className="flex items-center justify-between gap-3">
          {name ? <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e5484d] text-[13px] font-semibold text-white">{initials(name)}</span>
            <div className="min-w-0"><p className="truncate text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{name}</p><p className="text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">Your statement</p></div>
          </div> : <p className={SECTION_TITLE}>Status</p>}
          <StatusPill label={STATUS_LABEL[statement.status]} tone={STATUS_TONE[statement.status]} />
        </div>

        {statement.status === "processing" && <p className="rounded-[8px] bg-[#eaf2ff] px-3 py-2.5 text-[13px] text-[#1e4fa3] dark:bg-[#3b82f6]/15 dark:text-[#9cc1ff]">Finalizing payroll. Amounts may change until this statement is paid.</p>}
        {statement.status === "needs_attention" && <p className="rounded-[8px] bg-[#fdeae5] px-3 py-2.5 text-[13px] text-[#a62b20] dark:bg-[#d53411]/15 dark:text-[#f3a08c]">Your agency must resolve this payroll before it can be finalized.</p>}

        <Section title="Details">
          <DetailLine label={statement.status === "paid" ? "Paid on" : "Pay date"}>{formatPayDate(statement.payDate)}</DetailLine>
          <DetailLine label="Payment method">{paymentMethod(statement.paymentMethod)}</DetailLine>
          <DetailLine label="Hours worked">{formatHours(statementHours(statement))}</DetailLine>
        </Section>

        <section>
          <h3 className={SECTION_TITLE}>Earnings</h3>
          {statement.earnings.length || statement.reimbursements.length
            ? <dl className="mt-1"><MoneyLines lines={statement.earnings} /><MoneyLines lines={statement.reimbursements} /></dl>
            : <p className={EMPTY_LINES}>No earning lines on this statement.</p>}
          <dl className={TOTAL}><TotalLine label="Gross pay" cents={statement.grossPayCents} /></dl>
        </section>

        <section>
          <h3 className={SECTION_TITLE}>Deductions</h3>
          {deductions.length
            ? <dl className="mt-1"><MoneyLines lines={deductions} negative /></dl>
            : <p className={EMPTY_LINES}>No deduction lines on this statement.</p>}
          <dl className={TOTAL}><TotalLine label="Total deductions" cents={statement.deductionsCents} negative /></dl>
        </section>

        <div className="flex items-center justify-between gap-4 border-b-2 border-[#003839] bg-[#e3f6f6] px-4 py-4 dark:border-[#7fe0e2] dark:bg-[#00a3a7]/15">
          <span className="text-[14px] font-semibold text-[#003839] dark:text-[#7fe0e2]">Net pay</span>
          <span className="text-[24px] font-bold tabular-nums text-[#003839] dark:text-[#7fe0e2]">{formatAmount(statement.netPayCents)}</span>
        </div>
      </div>

      {showFooter && <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-[#edf1f2] px-5 py-4 dark:border-white/10">
        {downloadError && <p role="alert" className="mr-auto text-[13px] text-[#b3371c] dark:text-[#f3a08c]">{downloadError}</p>}
        {statement.downloadAvailable && <button type="button" disabled={isDownloading} onClick={() => void handleDownload()} aria-label="Download PDF statement"
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[6px] border border-[#e3e8ea] bg-white px-4 text-[14px] font-semibold text-[#10141a] transition-colors hover:bg-[#f3f5f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5">
          {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
          {isDownloading ? "Downloading…" : "Download PDF"}
        </button>}
      </div>}
    </DialogContent>
  </Dialog>;
}
