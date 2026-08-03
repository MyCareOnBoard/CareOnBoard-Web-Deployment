import type { OutOfPocketInvoiceListItem } from "@/lib/api/out-of-pocket";

type AgencyIdentity = { agencyId?: string; agencyName?: string };

export type InvoiceClientGroup<T extends OutOfPocketInvoiceListItem = OutOfPocketInvoiceListItem> = {
  clientKey: string;
  clientName: string;
  clientId?: string;
  agencyId?: string;
  agencyName?: string;
  invoices: T[];
};

export function groupInvoicesByClient<T extends OutOfPocketInvoiceListItem & AgencyIdentity>(
  invoices: T[],
  { showAgency = false }: { showAgency?: boolean } = {},
): InvoiceClientGroup<T>[] {
  const grouped = new Map<string, InvoiceClientGroup<T>>();

  for (const invoice of invoices) {
    const clientName = invoice.clientName?.trim() || "Unknown client";
    // Key by id so same-named clients don't merge; fall back to name for legacy rows.
    const clientKey = invoice.clientId?.trim() || clientName.toLowerCase();
    const agencyAwareClientKey = showAgency
      ? `${invoice.agencyId?.trim() || "unknown-agency"}:${clientKey}`
      : clientKey;
    const existing = grouped.get(agencyAwareClientKey);
    if (existing) {
      existing.invoices.push(invoice);
      continue;
    }
    grouped.set(agencyAwareClientKey, {
      clientKey: agencyAwareClientKey,
      clientName,
      clientId: invoice.clientId ?? undefined,
      agencyId: showAgency ? invoice.agencyId : undefined,
      agencyName: showAgency ? invoice.agencyName : undefined,
      invoices: [invoice],
    });
  }

  return [...grouped.values()].sort((a, b) => a.clientName.localeCompare(b.clientName));
}
