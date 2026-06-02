export type PayrollInvoiceParty = {
  name: string;
  addressLines: string[];
  phone: string;
};

export type PayrollInvoiceEarningLine = {
  description: string;
  hours: string;
  rate: string;
  amount: string;
};

export type PayrollInvoiceTotals = {
  totalHours: string;
  grossPay: string;
  taxWithheld: string | null;
  netPay: string;
};

export type PayrollInvoicePaymentInfo = {
  bankName: string;
  accountName: string;
  accountNumberMasked: string;
};

export type PayrollInvoiceSupportInfo = {
  email: string;
  phone: string;
  addressLines: string[];
};

export type PayrollInvoiceDocument = {
  invoiceTo: PayrollInvoiceParty;
  staffMember: PayrollInvoiceParty;
  earnings: PayrollInvoiceEarningLine[];
  totals: PayrollInvoiceTotals;
  payment: PayrollInvoicePaymentInfo;
  termsSnippet: string;
  support: PayrollInvoiceSupportInfo;
  accountManagerName: string;
  dateRangeLabel: string;
  invoiceId?: string;
  invoiceNumber?: string;
  status?: "pending" | "paid";
};

export type { DuePayrollEntry } from "@/lib/api/payroll";

export type OvertimeAlert = {
  id: string;
  staffName: string;
  overtimeHours: string;
};
