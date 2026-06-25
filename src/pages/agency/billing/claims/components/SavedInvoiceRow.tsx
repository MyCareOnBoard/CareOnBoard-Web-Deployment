import { memo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import { cn } from "@/lib/utils";
import type { OutOfPocketInvoiceListItem } from "@/lib/api/out-of-pocket";
import { GROUPED_SAVED_CLAIMS_TABLE_ROW_CLASS } from "./tableColumns";

const menuItemClassName =
  "cursor-pointer rounded-none px-4 py-2.5 text-[14px] font-medium text-[#10141a] hover:bg-[#eef4f5] focus:bg-[#eef4f5]";

type Props = {
  invoice: OutOfPocketInvoiceListItem;
  variant: "desktop" | "mobile";
  onViewInvoice: (invoice: OutOfPocketInvoiceListItem) => void;
  onCancelInvoice: (invoice: OutOfPocketInvoiceListItem) => void;
  actionsDisabled?: boolean;
};

function DotGridIcon() {
  return (
    <span className="grid grid-cols-2 gap-[3px]" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <span key={index} className="h-[4px] w-[4px] rounded-full bg-[#808081]" />
      ))}
    </span>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function EmailStatusBadge({ status }: { status: OutOfPocketInvoiceListItem["emailStatus"] }) {
  const label = status === "sent" ? "Sent" : status === "failed" ? "Failed" : "Not sent";
  const color =
    status === "sent"
      ? "bg-[#E7F7EE] text-[#12B84F]"
      : status === "failed"
        ? "bg-[#FDECEC] text-[#E5484D]"
        : "bg-[#F0F0F0] text-[#808081]";
  return <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-medium", color)}>{label}</span>;
}

function InvoiceActions({ invoice, onViewInvoice, onCancelInvoice, actionsDisabled = false }: Omit<Props, "variant">) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={actionsDisabled}
          className={cn(
            "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-white transition-colors hover:bg-[#e5e5e6] active:bg-[#e5e5e6]",
            actionsDisabled && "cursor-not-allowed opacity-50",
          )}
          aria-label={`Actions for invoice ${invoice.invoiceNumber}`}
        >
          <DotGridIcon />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[100] min-w-[160px] rounded-xl border-0 bg-white p-0 shadow-lg">
        <DropdownMenuItem className={menuItemClassName} onClick={() => onViewInvoice(invoice)}>
          View invoice
        </DropdownMenuItem>
        <DropdownMenuItem
          className={`${menuItemClassName} text-[#ef4444] hover:bg-[#fef2f2] focus:bg-[#fef2f2] focus:text-[#ef4444]`}
          onClick={() => onCancelInvoice(invoice)}
        >
          Cancel invoice
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SavedInvoiceRow({ invoice, variant, onViewInvoice, onCancelInvoice, actionsDisabled = false }: Props) {
  if (variant === "mobile") {
    return (
      <div className="rounded-[16px] border border-[#e5e5e6] bg-white px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[15px] font-semibold text-[#10141a]">{invoice.invoiceNumber}</p>
          <InvoiceActions
            invoice={invoice}
            onViewInvoice={onViewInvoice}
            onCancelInvoice={onCancelInvoice}
            actionsDisabled={actionsDisabled}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <p className="text-[#808081]">Service code</p>
            <p className="mt-1 font-medium text-[#10141a]">{invoice.serviceCode}</p>
          </div>
          <div>
            <p className="text-[#808081]">Service date</p>
            <p className="mt-1 font-medium text-[#10141a]">{invoice.serviceDate ?? "—"}</p>
          </div>
          <div>
            <p className="text-[#808081]">Amount</p>
            <p className="mt-1 font-medium text-[#10141a]">{formatCurrency(invoice.amount)}</p>
          </div>
          <div>
            <p className="text-[#808081]">Created</p>
            <p className="mt-1 font-medium text-[#10141a]">{formatDate(invoice.createdAt)}</p>
          </div>
        </div>
        <div className="mt-4">
          <EmailStatusBadge status={invoice.emailStatus} />
        </div>
      </div>
    );
  }

  return (
    <div className={GROUPED_SAVED_CLAIMS_TABLE_ROW_CLASS}>
      <span className="text-[13px] font-medium text-[#10141a]">{invoice.invoiceNumber}</span>
      <span className="text-[13px] text-[#10141a]">{invoice.serviceCode}</span>
      <span className="text-[13px] text-[#10141a]">{invoice.serviceDate ?? "—"}</span>
      <span className="text-[13px] font-medium tabular-nums text-[#10141a]">{formatCurrency(invoice.amount)}</span>
      <span>
        <EmailStatusBadge status={invoice.emailStatus} />
      </span>
      <span className="text-[13px] text-[#10141a]">{formatDate(invoice.createdAt)}</span>
      <span className="flex justify-end">
        <InvoiceActions
          invoice={invoice}
          onViewInvoice={onViewInvoice}
          onCancelInvoice={onCancelInvoice}
          actionsDisabled={actionsDisabled}
        />
      </span>
    </div>
  );
}

export default memo(SavedInvoiceRow);
