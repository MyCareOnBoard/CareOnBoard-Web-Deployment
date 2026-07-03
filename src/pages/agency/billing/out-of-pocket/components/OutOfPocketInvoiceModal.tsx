import { useCallback, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DocumentDownloadIcon from "@/assets/icons/document-download.svg?react";
import CareOnboardLogo from "@/assets/icons/care-onboard.svg?react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  BILLING_CORNER_MODAL_SHELL_CLASS,
  BILLING_PRIMARY_BUTTON_CLASS,
  BILLING_SECONDARY_BUTTON_CLASS,
} from "../../components/billingModalStyles";
import { downloadPayrollInvoicePdf } from "../../payroll/utils/payrollInvoicePrintUtils";
import { sendOutOfPocketInvoice, type OutOfPocketInvoiceDetail } from "@/lib/api/out-of-pocket";

const MODAL_CLASS =
  "fixed !left-auto !right-6 !top-6 !translate-x-0 !translate-y-0 w-[calc(100vw-32px)] max-w-[720px] rounded-[20px] border border-[#e5e5e6] bg-white p-0 shadow-lg sm:!right-6";

const TEXT = "text-[13px] text-[#10141a]";
const MUTED = "text-[13px] text-[#808081]";

type Props = {
  open: boolean;
  invoice: OutOfPocketInvoiceDetail;
  onClose: () => void;
  /** Called after a successful send so the parent can refresh its list. */
  onSent?: (invoiceId: string, emailedTo: string) => void;
};

export default function OutOfPocketInvoiceModal({ open, invoice, onClose, onSent }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState(invoice.emailStatus);
  const [emailedTo, setEmailedTo] = useState(invoice.emailedTo);

  const doc = invoice.invoice;
  const periodLabel =
    doc.periodStart && doc.periodEnd
      ? `${doc.periodStart} → ${doc.periodEnd}`
      : doc.periodStart || doc.periodEnd || "";

  const handleDownload = useCallback(async () => {
    if (!printRef.current || downloading) return;
    setDownloading(true);
    try {
      await downloadPayrollInvoicePdf(printRef.current, invoice.invoiceNumber, "invoice");
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      toast({ title: "Couldn't download this invoice. Try Print instead.", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  }, [downloading, invoice.invoiceNumber, toast]);

  const handleSend = useCallback(async () => {
    if (sending) return;
    if (!doc.payerEmail) {
      toast({ title: "No payer email on record for this client.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const result = await sendOutOfPocketInvoice(invoice.id);
      setEmailStatus(result.emailStatus);
      setEmailedTo(result.emailedTo);
      toast({ title: `Invoice sent to ${result.emailedTo}.` });
      onSent?.(invoice.id, result.emailedTo);
    } catch (error) {
      setEmailStatus("failed");
      toast({
        title: "Couldn't send the invoice",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }, [doc.payerEmail, invoice.id, onSent, sending, toast]);

  const sendLabel = sending
    ? "Sending…"
    : emailStatus === "sent"
      ? "Resend to payer"
      : "Send to payer";

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent showCloseButton={false} className={`${MODAL_CLASS} ${BILLING_CORNER_MODAL_SHELL_CLASS}`}>
        <div ref={printRef} className="flex min-h-0 flex-1 flex-col overflow-y-hidden px-4 pb-6 sm:px-6">
          <DialogHeader className="w-full shrink-0 items-start space-y-0 pt-4 text-left">
            <div className="flex w-full items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <CareOnboardLogo className="h-8 w-auto shrink-0" role="img" aria-label="CareOnboard" />
                <DialogTitle className={cn("mt-3 text-left font-bold", TEXT)}>
                  Invoice {invoice.invoiceNumber}
                </DialogTitle>
                <p className={cn("mt-1 font-medium", MUTED)}>
                  {doc.agencyName}
                  {periodLabel ? ` · ${periodLabel}` : ""}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close invoice"
                onClick={onClose}
                className="payroll-invoice-no-print inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e5e5e6] bg-[#f5f5f5] text-[#808081] hover:bg-[#eef4f5]">
                  <X className="h-4 w-4" />
                </span>
              </button>
            </div>
          </DialogHeader>

          <div className="payroll-invoice-modal-body flex-1 overflow-y-auto pb-4 pt-4">
            {(doc.unratedLineCount ?? 0) > 0 && (
              <div className="payroll-invoice-no-print mb-3 rounded-[10px] border border-[#F5A623] bg-[#FFF7E6] px-3 py-2 text-[12px] text-[#8A5A00]">
                {doc.unratedLineCount} line{doc.unratedLineCount === 1 ? "" : "s"} bill $0 — no client rate is
                set on the service. Set a client rate on the client&apos;s service to bill them.
              </div>
            )}
            <div className="mb-4 flex items-start justify-between gap-6 rounded-[12px] bg-[#f3f4f6] px-4 py-3">
              <div className="min-w-0">
                <p className={cn("mb-1 font-bold uppercase tracking-[0.02em]", TEXT)}>Bill to</p>
                <p className={cn("font-bold leading-tight", TEXT)}>{doc.payerName}</p>
                {doc.payerEmail ? <p className={cn("mt-1", MUTED)}>{doc.payerEmail}</p> : null}
                {doc.payerAddress ? <p className={cn("mt-1", MUTED)}>{doc.payerAddress}</p> : null}
              </div>
              <div className="min-w-0 text-right">
                <p className={cn("mb-1 font-bold", TEXT)}>For</p>
                <p className={cn("font-bold leading-tight", TEXT)}>{doc.clientName}</p>
                {doc.clientAddress ? <p className={cn("mt-1", MUTED)}>{doc.clientAddress}</p> : null}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#e5e5e6]">
                    <th className={cn("pb-2 pr-6 text-left font-bold", TEXT)}>Service</th>
                    <th className={cn("pb-2 pr-6 text-right font-bold", TEXT)}>Qty</th>
                    <th className={cn("pb-2 pr-6 text-right font-bold", TEXT)}>Rate</th>
                    <th className={cn("pb-2 text-right font-bold", TEXT)}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.lines.map((line, index) => (
                    <tr key={`${line.description}-${index}`} className="border-b border-[#e5e5e6]">
                      <td className={cn("py-2 pr-6 text-left", TEXT)}>{line.description}</td>
                      <td className={cn("py-2 pr-6 text-right tabular-nums", TEXT)}>{line.quantity}</td>
                      <td className={cn("py-2 pr-6 text-right tabular-nums", TEXT)}>{line.rate}</td>
                      <td className={cn("py-2 text-right tabular-nums", TEXT)}>{line.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-[#e5e5e6] pt-3">
              <span className={cn("font-bold", TEXT)}>Amount due</span>
              <span className={cn("text-right font-bold tabular-nums", TEXT)}>{doc.totalLabel}</span>
            </div>

            <p className={cn("mt-3", MUTED)}>
              Email status:{" "}
              <span className={emailStatus === "sent" ? "text-[#12B84F]" : emailStatus === "failed" ? "text-[#E5484D]" : ""}>
                {emailStatus === "sent"
                  ? `Sent${emailedTo ? ` to ${emailedTo}` : ""}`
                  : emailStatus === "failed"
                    ? "Failed — try again"
                    : "Not sent yet"}
              </span>
            </p>
          </div>

          <div className="payroll-invoice-no-print flex shrink-0 flex-col gap-3 border-t border-[#e5e5e6] pb-2 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={downloading}
              onClick={() => void handleDownload()}
              className={cn(BILLING_SECONDARY_BUTTON_CLASS, "w-full gap-2 rounded-[10px] text-[14px] sm:mr-auto sm:w-auto")}
            >
              {downloading ? "Preparing PDF…" : "Download PDF"}
              <DocumentDownloadIcon className="h-5 w-5 shrink-0" aria-hidden />
            </button>
            <button
              type="button"
              disabled={sending || !doc.payerEmail}
              onClick={() => void handleSend()}
              className={cn(BILLING_PRIMARY_BUTTON_CLASS, "w-full gap-2 rounded-[10px] text-[14px] sm:w-auto")}
            >
              {sendLabel}
              <Send className="h-5 w-5 shrink-0 text-white" aria-hidden />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
