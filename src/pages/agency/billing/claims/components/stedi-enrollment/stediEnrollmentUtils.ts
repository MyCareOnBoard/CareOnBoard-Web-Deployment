import type {
  StediContact,
  StediEnrollmentInput,
  StediEnrollmentOverallStatus,
  StediEnrollmentOverview,
  StediEnrollmentStatus,
  StediEnrollmentTask,
  StediTransactionKey,
} from "@/lib/api/stediEnrollment";
import type { BadgeTone } from "../x12-export/x12ExportUtils";

export type EnrollmentForm = {
  providerName: string;
  npi: string;
  taxId: string;
  medicaidProviderId: string;
  contact: Required<StediContact>;
  userEmail: string;
  payerId: string;
  transactions: StediTransactionKey[];
};

export const WIZARD_STEPS = [
  { key: "agency", title: "Agency" },
  { key: "contact", title: "Contact" },
  { key: "transactions", title: "What to enroll" },
  { key: "review", title: "Review" },
] as const;

export type WizardStepKey = (typeof WIZARD_STEPS)[number]["key"];

const STATUS_LABELS: Record<StediEnrollmentStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  SUBMITTED: { label: "With Stedi", tone: "warning" },
  STEDI_ACTION_REQUIRED: { label: "With Stedi", tone: "warning" },
  PROVIDER_ACTION_REQUIRED: { label: "Needs your action", tone: "danger" },
  PROVISIONING: { label: "With NJ Medicaid", tone: "warning" },
  LIVE: { label: "Live", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  CANCELED: { label: "Canceled", tone: "neutral" },
};

export function transactionStatusBadge(status: StediEnrollmentStatus | null): { label: string; tone: BadgeTone } {
  return status ? STATUS_LABELS[status] ?? { label: status, tone: "neutral" } : { label: "Not started", tone: "neutral" };
}

const OVERALL: Record<StediEnrollmentOverallStatus, { label: string; tone: BadgeTone; banner: string; action: string }> = {
  not_started: {
    label: "Not enrolled",
    tone: "neutral",
    banner: "Enroll your agency with Stedi so your 837P claims can reach NJ Medicaid and payments (835 ERAs) come back to you.",
    action: "Start enrollment",
  },
  draft: {
    label: "Draft",
    tone: "neutral",
    banner: "Your Stedi enrollment is saved as a draft. Submit it so Stedi can enroll you with NJ Medicaid.",
    action: "Continue enrollment",
  },
  submitted: {
    label: "In progress",
    tone: "warning",
    banner: "Stedi is enrolling your agency with NJ Medicaid. This usually takes a few weeks.",
    action: "View status",
  },
  action_required: {
    label: "Needs your action",
    tone: "danger",
    banner: "Stedi needs something from you to finish your NJ Medicaid enrollment.",
    action: "See what's needed",
  },
  rejected: {
    label: "Rejected",
    tone: "danger",
    banner: "Part of your Stedi enrollment was rejected or canceled. Review the reason and enroll again.",
    action: "Review enrollment",
  },
  live: {
    label: "Live",
    tone: "success",
    banner: "Your agency is enrolled with NJ Medicaid through Stedi.",
    action: "View enrollment",
  },
};

export function overallStatusInfo(status: StediEnrollmentOverallStatus) {
  return OVERALL[status] ?? OVERALL.not_started;
}

const EMPTY_CONTACT: Required<StediContact> = {
  organizationName: "",
  streetAddress1: "",
  streetAddress2: "",
  city: "",
  state: "",
  zipCode: "",
  email: "",
  phone: "",
};

/** Start from what was sent last time, else the agency profile. */
export function formFromOverview(overview: StediEnrollmentOverview): EnrollmentForm {
  const { enrollment, defaults } = overview;
  const saved = enrollment.provider;
  return {
    providerName: saved?.name || defaults.providerName,
    npi: saved?.npi || defaults.npi,
    taxId: "",
    medicaidProviderId: saved?.medicaidProviderId || defaults.medicaidProviderId,
    contact: { ...EMPTY_CONTACT, ...defaults.contact, ...(enrollment.contact ?? {}) },
    userEmail: enrollment.userEmail || defaults.userEmail,
    payerId: enrollment.payerId || defaults.payerId || overview.payer.id,
    transactions: overview.transactionTypes.map((type) => type.key),
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Field errors for one step, keyed by field name. Mirrors the server's checks. */
export function validateStep(step: WizardStepKey, form: EnrollmentForm, savedTaxIdLast4: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step === "agency") {
    if (!form.providerName.trim()) errors.providerName = "Enter the agency's legal name";
    if (!/^\d{10}$/.test(form.npi.trim())) errors.npi = "NPI must be 10 digits";
    const ein = form.taxId.replace(/\D/g, "");
    if (ein && ein.length !== 9) errors.taxId = "EIN must be 9 digits";
    if (!ein && !savedTaxIdLast4) errors.taxId = "Enter the agency EIN";
    if (!/^[A-Za-z0-9-]{1,20}$/.test(form.medicaidProviderId.trim())) {
      errors.medicaidProviderId = "Enter the NJ Medicaid provider ID (letters, digits and dashes)";
    }
  }
  if (step === "contact") {
    const c = form.contact;
    if (!c.organizationName.trim()) errors.organizationName = "Enter the organization name";
    if (!c.streetAddress1.trim()) errors.streetAddress1 = "Enter the street address";
    if (!c.city.trim()) errors.city = "Enter the city";
    if (!/^[A-Za-z]{2}$/.test(c.state.trim())) errors.state = "Use the 2-letter state code";
    if (!/^\d{5}(-\d{4})?$/.test(c.zipCode.trim())) errors.zipCode = "ZIP must be 12345 or 12345-6789";
    if (!EMAIL.test(c.email.trim())) errors.email = "Enter a valid email";
    if (c.phone.replace(/\D/g, "").length !== 10) errors.phone = "Phone must be 10 digits";
    if (!EMAIL.test(form.userEmail.trim())) errors.userEmail = "Enter a valid email";
  }
  if (step === "transactions") {
    if (!form.transactions.length) errors.transactions = "Choose at least one";
    if (!/^[A-Za-z0-9-]{1,80}$/.test(form.payerId.trim())) errors.payerId = "Payer ID can only hold letters, digits and dashes";
  }
  return errors;
}

export function toEnrollmentInput(form: EnrollmentForm, submit: boolean): StediEnrollmentInput {
  const { streetAddress2, ...contact } = form.contact;
  return {
    providerName: form.providerName.trim(),
    npi: form.npi.trim(),
    ...(form.taxId.replace(/\D/g, "") ? { taxId: form.taxId.replace(/\D/g, "") } : {}),
    medicaidProviderId: form.medicaidProviderId.trim(),
    contact: {
      ...Object.fromEntries(Object.entries(contact).map(([key, value]) => [key, value.trim()])),
      ...(streetAddress2.trim() ? { streetAddress2: streetAddress2.trim() } : {}),
      state: contact.state.trim().toUpperCase(),
    } as StediContact,
    userEmail: form.userEmail.trim(),
    payerId: form.payerId.trim(),
    transactions: form.transactions,
    submit,
  };
}

/** Prefill answers we already know, e.g. the Medicaid ID when Stedi asks for it. */
export function taskPrefill(task: StediEnrollmentTask, medicaidProviderId: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of task.fields) {
    if (field.fieldType !== "TEXT") continue;
    const saved = task.values.find((value) => value.key === field.key)?.text;
    if (saved) values[field.key] = saved;
    else if (medicaidProviderId && /medicaid/i.test(field.label)) values[field.key] = medicaidProviderId;
    else values[field.key] = "";
  }
  return values;
}

export function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}
