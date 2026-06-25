import type { OutOfPocketInvoiceListItem } from "@/lib/api/out-of-pocket";

export type InvoiceClientGroup = {
  clientKey: string;
  clientName: string;
  clientId?: string;
  invoices: OutOfPocketInvoiceListItem[];
};

export function groupInvoicesByClient(
  invoices: OutOfPocketInvoiceListItem[],
): InvoiceClientGroup[] {
  const grouped = new Map<string, InvoiceClientGroup>();

  for (const invoice of invoices) {
    const clientName = invoice.clientName?.trim() || "Unknown client";
    // Key by id so same-named clients don't merge; fall back to name for legacy rows.
    const clientKey = invoice.clientId?.trim() || clientName.toLowerCase();
    const existing = grouped.get(clientKey);
    if (existing) {
      existing.invoices.push(invoice);
      continue;
    }
    grouped.set(clientKey, {
      clientKey,
      clientName,
      clientId: invoice.clientId ?? undefined,
      invoices: [invoice],
    });
  }

  return [...grouped.values()].sort((a, b) => a.clientName.localeCompare(b.clientName));
}
