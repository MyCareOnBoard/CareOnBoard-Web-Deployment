import type { DuePayrollEntry } from "./mockPayrollDashboardData";

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
  taxWithheld: string;
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
};

const MOCK_INVOICE_TO: PayrollInvoiceParty = {
  name: "Esther Howard",
  addressLines: ["3891 Ranchview Dr.", "Richardson, California", "62639"],
  phone: "(302) 555-0107",
};

const MOCK_STAFF_ADDRESS: Omit<PayrollInvoiceParty, "name" | "phone"> = {
  addressLines: ["4140 Parker Rd. Allentown,", "New Mexico 31134"],
};

const MOCK_STAFF_PHONE = "(480) 555-0103";

const MOCK_EARNINGS: PayrollInvoiceEarningLine[] = [
  { description: "Regular hours", hours: "17hrs", rate: "$87.60", amount: "$854.08" },
  { description: "Overtime hours", hours: "15hrs", rate: "$72.41", amount: "$202.87" },
  { description: "Holidays hours", hours: "12hrs", rate: "$74.12", amount: "$406.27" },
  { description: "On-call pay", hours: "20hrs", rate: "$64.48", amount: "$446.61" },
];

const MOCK_TOTALS: PayrollInvoiceTotals = {
  totalHours: "64",
  grossPay: "$1,650",
  taxWithheld: "$150.00",
  netPay: "$1,650",
};

const MOCK_PAYMENT: PayrollInvoicePaymentInfo = {
  bankName: "Chase Bank",
  accountName: "Cameron Williamson",
  accountNumberMasked: "****** *** *** **** 4567",
};

export const PAYROLL_INVOICE_TERMS_SNIPPET =
  "This payroll invoice is generated from approved hours and verified attendance records.";

const MOCK_SUPPORT: PayrollInvoiceSupportInfo = {
  email: "info@mycareonboard.com",
  phone: "862-772-5153",
  addressLines: ["80 Cottontail Ln", "Somerset, NJ 08873"],
};

const MOCK_ACCOUNT_MANAGER = "Fred Fafa";

export function buildPayrollInvoiceFromEntry(entry: DuePayrollEntry): PayrollInvoiceDocument {
  return {
    invoiceTo: MOCK_INVOICE_TO,
    staffMember: {
      name: entry.staffName,
      addressLines: MOCK_STAFF_ADDRESS.addressLines,
      phone: MOCK_STAFF_PHONE,
    },
    earnings: MOCK_EARNINGS,
    totals: MOCK_TOTALS,
    payment: {
      ...MOCK_PAYMENT,
      accountName: entry.staffName,
    },
    termsSnippet: PAYROLL_INVOICE_TERMS_SNIPPET,
    support: MOCK_SUPPORT,
    accountManagerName: MOCK_ACCOUNT_MANAGER,
    dateRangeLabel: `${entry.dateRangeStart}–${entry.dateRangeEnd}`,
  };
}
