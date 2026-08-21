import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadEmployeePayStatementPdf } from "../api/employeePayrollEndpoints";
import type { PayStatement, PayStatementLine, PayStatementStatus } from "../model/types";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const labels: Record<PayStatementStatus, string> = { processing: "Processing", paid: "Paid", needs_attention: "Needs attention" };
const colors: Record<PayStatementStatus, string> = { processing: "border-[#2b82ff] text-[#2b82ff]", paid: "border-[#0eaf52] text-[#0eaf52]", needs_attention: "border-[#ef4444] text-[#ef4444]" };

type PayStatementDetailModalProps = {
  open: boolean;
  statement: PayStatement | null;
  currency: "USD";
  employmentId: string;
  onOpenChange: (open: boolean) => void;
};

function money(value: number | null) { return value === null ? "—" : usd.format(value / 100); }
function date(value: string) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
function paymentMethod(method: PayStatement["paymentMethod"]) { return method === "direct_deposit" ? "Direct deposit" : method === "manual" ? "Manual payment" : "Payment method unavailable"; }

function Lines({ title, lines }: { title: string; lines: PayStatementLine[] }) {
  if (!lines.length) return null;
  return <section><h3 className="text-sm font-semibold text-[#10141a]">{title}</h3><dl className="mt-2 divide-y divide-[#e5e7eb] rounded-xl border border-[#e5e7eb] px-3"><div className="sr-only">{title}</div>{lines.map((line, index) => <div key={`${line.label}-${index}`} className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="min-w-0 text-[#5d626b]"><span className="font-medium text-[#10141a]">{line.label}</span>{line.hours !== null && <span className="ml-2 text-xs">{line.hours} hours{line.rateCents !== null ? ` at ${money(line.rateCents)}` : ""}</span>}</dt><dd className="shrink-0 font-semibold text-[#10141a]">{money(line.amountCents)}</dd></div>)}</dl></section>;
}

export function PayStatementDetailModal({ open, statement, employmentId, onOpenChange }: PayStatementDetailModalProps) {
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
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] w-[min(94vw,620px)] overflow-y-auto rounded-2xl border border-[#e5e7eb] bg-white p-6">
      <DialogHeader><DialogTitle className="pr-6 text-xl font-bold text-[#10141a]">Pay statement</DialogTitle><DialogDescription className="text-sm text-[#6b7280]">{date(statement.periodStart)} – {date(statement.periodEnd)} · Paid {date(statement.payDate)} · Statement {statement.statementId}</DialogDescription></DialogHeader>
      <div className="mt-2 flex flex-wrap items-center gap-2"><span className={`rounded-full border px-3 py-1 text-sm font-medium ${colors[statement.status]}`}>{labels[statement.status]}</span><span className="text-sm text-[#6b7280]">{paymentMethod(statement.paymentMethod)}</span></div>
      {statement.status === "processing" && <p className="mt-4 rounded-xl border border-[#b9d9ff] bg-[#f4f9ff] p-3 text-sm text-[#245a9c]">Finalizing payroll. Amounts may change until this statement is paid.</p>}
      {statement.status === "needs_attention" && <p className="mt-4 rounded-xl border border-[#f3c3c3] bg-[#fff7f7] p-3 text-sm text-[#a32727]">Your agency must resolve this payroll before it can be finalized.</p>}
      <dl className="mt-5 grid gap-3 rounded-xl bg-[#f9fafb] p-4 sm:grid-cols-3"><div><dt className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">Gross pay</dt><dd className="mt-1 text-lg font-bold text-[#10141a]">{money(statement.grossPayCents)}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">Deductions</dt><dd className="mt-1 text-lg font-bold text-[#10141a]">{money(statement.deductionsCents)}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">Net pay</dt><dd className="mt-1 text-lg font-bold text-[#10141a]">{money(statement.netPayCents)}</dd></div></dl>
      <div className="mt-5 space-y-5"><Lines title="Earnings" lines={statement.earnings} /><Lines title="Reimbursements" lines={statement.reimbursements} /><Lines title="Taxes" lines={statement.taxes} /><Lines title="Other deductions" lines={statement.otherDeductions} /></div>
      {downloadError && <p role="alert" className="mt-5 text-sm text-[#a32727]">{downloadError}</p>}
      {statement.downloadAvailable && <div className="mt-6 flex justify-end"><button type="button" disabled={isDownloading} onClick={() => void handleDownload()} className="inline-flex items-center gap-2 rounded-full bg-[#00b4b8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00a0a4] disabled:cursor-not-allowed disabled:opacity-60">{isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{isDownloading ? "Downloading…" : "Download statement"}</button></div>}
    </DialogContent>
  </Dialog>;
}
