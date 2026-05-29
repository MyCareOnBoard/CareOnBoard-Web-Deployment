import { memo, useCallback, useRef, useState } from "react";
import { Printer, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DocumentDownloadIcon from "@/assets/icons/document-download.svg?react";
import CareOnboardLogo from "@/assets/icons/care-onboard.svg?react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  BILLING_CORNER_MODAL_SHELL_CLASS,
  BILLING_PRIMARY_BUTTON_CLASS,
  BILLING_SECONDARY_BUTTON_CLASS,
} from "../../components/billingModalStyles";
import type { DuePayrollEntry } from "../data/mockPayrollDashboardData";
import {
  buildPayrollInvoiceFromEntry,
  type PayrollInvoiceDocument,
  type PayrollInvoiceEarningLine,
  type PayrollInvoiceParty,
} from "../data/mockPayrollInvoiceData";
import { downloadPayrollInvoicePdf } from "../utils/payrollInvoicePrintUtils";
import "../utils/payrollInvoicePrint.css";

const PAYROLL_INVOICE_MODAL_CLASS =
  "fixed !left-auto !right-6 !top-6 !translate-x-0 !translate-y-0 w-[calc(100vw-32px)] max-w-[720px] rounded-[20px] border border-[#e5e5e6] bg-white p-0 shadow-lg sm:!right-6 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100";

type PayrollInvoiceModalProps = {
  open: boolean;
  entry: DuePayrollEntry;
  onClose: () => void;
};

const INVOICE_TEXT_CLASS = "text-[13px] text-[#10141a]";
const INVOICE_TEXT_MUTED_CLASS = "text-[13px] text-[#808081]";

function PartyBlock({
  label,
  party,
  uppercaseLabel = false,
}: {
  label: string;
  party: PayrollInvoiceParty;
  uppercaseLabel?: boolean;
}) {
  return (
    <div className="min-w-0 max-w-[48%]">
      <p
        className={cn(
          "mb-3 font-bold",
          INVOICE_TEXT_CLASS,
          uppercaseLabel && "uppercase tracking-[0.02em]",
        )}
      >
        {label}
      </p>
      <p className={cn("font-bold leading-tight", INVOICE_TEXT_CLASS)}>{party.name}</p>
      <div className={cn("mt-2 font-normal leading-[1.35]", INVOICE_TEXT_CLASS)}>
        {party.addressLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <p>{party.phone}</p>
      </div>
    </div>
  );
}

const EARNINGS_TABLE_HEAD_CELL =
  `pb-2 pt-0.5 pr-10 text-left font-bold ${INVOICE_TEXT_CLASS} last:pr-0`;

const EARNINGS_TABLE_BODY_CELL =
  `py-2 pr-10 text-left font-normal ${INVOICE_TEXT_CLASS} last:pr-0`;

const EarningsTableRow = memo(function EarningsTableRow({
  line,
}: {
  line: PayrollInvoiceEarningLine;
}) {
  return (
    <tr className="border-b border-[#e5e5e6]">
      <td className={EARNINGS_TABLE_BODY_CELL}>{line.description}</td>
      <td className={EARNINGS_TABLE_BODY_CELL}>{line.hours}</td>
      <td className={EARNINGS_TABLE_BODY_CELL}>{line.rate}</td>
      <td className={EARNINGS_TABLE_BODY_CELL}>{line.amount}</td>
    </tr>
  );
});

function PaymentInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[auto_auto] items-start gap-x-8 py-1.5">
      <span className={cn("font-normal", INVOICE_TEXT_CLASS)}>{label}</span>
      <span className={cn("font-bold", INVOICE_TEXT_CLASS)}>{value}</span>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className={cn(INVOICE_TEXT_CLASS, emphasis && "font-bold")}>{label}</span>
      <span
        className={cn(
          "text-right tabular-nums",
          INVOICE_TEXT_CLASS,
          emphasis && "font-bold",
        )}
      >
        {value}
      </span>
    </div>
  );
}

const InvoiceDocument = memo(function InvoiceDocument({
  invoice,
}: {
  invoice: PayrollInvoiceDocument;
}) {
  return (
    <>
      <div className="bg-[#f3f4f6] px-6 py-3">
        <div className="flex items-start justify-between gap-6">
          <PartyBlock label="Invoice to" party={invoice.invoiceTo} uppercaseLabel />
          <PartyBlock label="Staff information" party={invoice.staffMember} />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#e5e5e6]">
              <th scope="col" className={EARNINGS_TABLE_HEAD_CELL}>
                Description
              </th>
              <th scope="col" className={EARNINGS_TABLE_HEAD_CELL}>
                Hours
              </th>
              <th scope="col" className={EARNINGS_TABLE_HEAD_CELL}>
                Rate
              </th>
              <th scope="col" className={EARNINGS_TABLE_HEAD_CELL}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.earnings.map((line) => (
              <EarningsTableRow key={line.description} line={line} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-0 border-b border-[#e5e5e6] py-3">
        <p className={cn("mb-2 font-bold", INVOICE_TEXT_CLASS)}>Total earnings</p>
        <div className="space-y-0">
          <SummaryRow label="Total hours" value={invoice.totals.totalHours} />
          <SummaryRow label="Total" value={invoice.totals.grossPay} />
          <SummaryRow label="Tax" value={invoice.totals.taxWithheld} />
          <SummaryRow label="Net total" value={invoice.totals.netPay} emphasis />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-6 pt-0 sm:flex-row sm:justify-between sm:gap-12">
        <div className="min-w-0 flex-1">
          <p className={cn("mb-3 font-bold", INVOICE_TEXT_CLASS)}>Payment info:</p>
          <div className="w-fit">
            <PaymentInfoRow label="Bank name" value={invoice.payment.bankName} />
            <PaymentInfoRow label="Account name" value={invoice.payment.accountName} />
            <PaymentInfoRow label="Account number" value={invoice.payment.accountNumberMasked} />
          </div>
        </div>
        <div className="max-w-[220px] shrink-0">
          <p className={cn("mb-3 font-bold", INVOICE_TEXT_CLASS)}>Terms and conditions</p>
          <p className={cn("leading-relaxed", INVOICE_TEXT_CLASS)}>
            {invoice.termsSnippet}{" "}
            <button
              type="button"
              className="cursor-pointer font-normal text-[#00b4b8] hover:underline"
            >
              Read more
            </button>
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-[#e5e5e6] pt-4 sm:grid-cols-2">
        <div>
          <p className={cn("mb-3 font-bold", INVOICE_TEXT_CLASS)}>Need help?</p>
          <div className={cn("space-y-1", INVOICE_TEXT_CLASS)}>
            <p>{invoice.support.email}</p>
            <p>{invoice.support.phone}</p>
            {invoice.support.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end">
          <p className={cn("mb-3 font-bold", INVOICE_TEXT_CLASS)}>Account manager</p>
          <p
            className={cn("mb-2 leading-none", INVOICE_TEXT_CLASS)}
            style={{ fontFamily: "cursive" }}
            aria-hidden="true"
          >
            {invoice.accountManagerName.split(" ")[0]}
          </p>
          <p className="text-[15px] font-medium text-[#10141a]">{invoice.accountManagerName}</p>
        </div>
      </div>
    </>
  );
});

export default function PayrollInvoiceModal({ open, entry, onClose }: PayrollInvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const invoice = buildPayrollInvoiceFromEntry(entry);

  const handlePrint = useCallback(async () => {
    await document.fonts.ready;
    window.print();
  }, []);

  const handleDownload = useCallback(async () => {
    if (!printRef.current || isDownloading) return;

    setIsDownloading(true);
    try {
      await downloadPayrollInvoicePdf(printRef.current, entry.staffName);
    } catch (error) {
      console.error("Error generating payroll invoice PDF:", error);
      toast({
        title: "Couldn't download this invoice. Try again or use Print.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  }, [entry.staffName, isDownloading, toast]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={`${PAYROLL_INVOICE_MODAL_CLASS} ${BILLING_CORNER_MODAL_SHELL_CLASS}`}
      >
        <div
          ref={printRef}
          className="payroll-invoice-print-root flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden px-4 pb-6 sm:px-6"
        >
          <DialogHeader className="w-full shrink-0 items-start space-y-0 pt-4 text-left">
            <div className="flex w-full items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <CareOnboardLogo
                  className="h-8 w-auto shrink-0"
                  role="img"
                  aria-label="CareOnboard"
                />
                <DialogTitle className={cn("mt-3 text-left font-bold", INVOICE_TEXT_CLASS)}>
                  Payroll invoice
                </DialogTitle>
                <p className={cn("mt-1 font-medium", INVOICE_TEXT_MUTED_CLASS)}>
                  {entry.staffName} · {invoice.dateRangeLabel}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close payroll invoice"
                onClick={onClose}
                className="payroll-invoice-no-print inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center transition-colors"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e5e5e6] bg-[#f5f5f5] text-[#808081] hover:bg-[#eef4f5] active:bg-[#eef4f5]">
                  <X className="h-4 w-4" />
                </span>
              </button>
            </div>
          </DialogHeader>

          <div className="payroll-invoice-modal-body flex-1 overflow-x-hidden overflow-y-auto pb-4 pt-4">
            <InvoiceDocument invoice={invoice} />
          </div>

          <div className="payroll-invoice-no-print flex shrink-0 flex-col gap-3 border-t border-[#e5e5e6] pb-2 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => void handlePrint()}
              className={cn(
                BILLING_SECONDARY_BUTTON_CLASS,
                "w-full rounded-[10px] text-[14px] sm:w-auto",
              )}
            >
              <span className="inline-flex items-center gap-2">
                Print invoice
                <Printer className="h-5 w-5 shrink-0" aria-hidden />
              </span>
            </button>
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => void handleDownload()}
              className={cn(
                BILLING_PRIMARY_BUTTON_CLASS,
                "w-full gap-2 rounded-[10px] text-[14px] sm:w-auto",
              )}
            >
              {isDownloading ? "Preparing PDF…" : "Download PDF"}
              <DocumentDownloadIcon className="h-5 w-5 shrink-0 text-white" aria-hidden />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
