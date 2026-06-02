import type {
  PayrollInvoiceDetail,
  PayrollInvoicePrefill,
} from "@/lib/api/payroll";
import type { DuePayrollEntry } from "@/lib/api/payroll";
import type {
  PayrollInvoiceDocument,
  PayrollInvoiceParty,
} from "../types";

function buildParty(name: string, addressLines: string[] = [], phone = ""): PayrollInvoiceParty {
  return { name, addressLines, phone };
}

export function buildPayrollInvoiceDocument(
  invoice: PayrollInvoiceDetail | null,
  prefill: PayrollInvoicePrefill | null,
  agencyFallback?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  },
): PayrollInvoiceDocument | null {
  if (!prefill && !invoice) {
    return null;
  }

  const snapshot = prefill ?? invoice?.invoicePrefill;
  if (!snapshot) {
    return null;
  }

  const agencyAddressLines = snapshot.support?.addressLines?.length
    ? snapshot.support.addressLines
    : [agencyFallback?.address, agencyFallback?.city, agencyFallback?.state, agencyFallback?.zipCode].filter(
        Boolean,
      ) as string[];

  return {
    invoiceTo: buildParty(
      snapshot.agencyName || agencyFallback?.name || "Agency",
      agencyAddressLines,
      snapshot.support?.phone || agencyFallback?.phone || "",
    ),
    staffMember: buildParty(snapshot.employeeName || invoice?.employeeName || "Staff member"),
    earnings: snapshot.earnings ?? [],
    totals: {
      totalHours: snapshot.totals?.totalHours ?? "0",
      grossPay: snapshot.totals?.grossPay ?? "$0.00",
      taxWithheld: snapshot.totals?.taxWithheld ?? null,
      netPay: snapshot.totals?.netPay ?? snapshot.totals?.grossPay ?? "$0.00",
    },
    payment: {
      bankName: "",
      accountName: snapshot.employeeName || invoice?.employeeName || "",
      accountNumberMasked: snapshot.payment?.summary || "Payment method not set",
    },
    termsSnippet:
      "This payroll invoice is generated from approved hours and verified attendance records.",
    support: {
      email: snapshot.support?.email || agencyFallback?.email || "",
      phone: snapshot.support?.phone || agencyFallback?.phone || "",
      addressLines: agencyAddressLines,
    },
    accountManagerName: snapshot.agencyName || agencyFallback?.name || "",
    dateRangeLabel: snapshot.dateRangeLabel || "",
    invoiceId: invoice?.id,
    invoiceNumber: invoice?.invoiceNumber,
    status: invoice?.status,
  };
}

export function needsAgencyFallback(prefill: PayrollInvoicePrefill | null | undefined): boolean {
  if (!prefill?.support) {
    return true;
  }

  const hasEmail = Boolean(prefill.support.email?.trim());
  const hasPhone = Boolean(prefill.support.phone?.trim());
  const hasAddress = Boolean(prefill.support.addressLines?.some((line) => line.trim()));

  return !(hasEmail && hasPhone && hasAddress);
}

export function dueEntryToCreatePayload(
  entry: DuePayrollEntry,
  agencyId: string,
) {
  return {
    agencyId,
    employeeId: entry.employeeId,
    periodStart: entry.dateRangeStart,
    periodEnd: entry.dateRangeEnd,
    ...(entry.shiftIds?.length ? { shiftIds: entry.shiftIds } : {}),
  };
}
