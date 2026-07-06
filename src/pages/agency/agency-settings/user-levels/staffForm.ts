import type { EmploymentType, StaffBillingType } from "@/lib/api/agency-staff";

/** Default job-title options; "Other (custom)" lets an admin type a free-text role. */
export const STAFF_ROLE_OPTIONS: string[] = [
  "Administrator",
  "Coordinator",
  "Supervisor",
  "Human Resource",
  "Account Manager",
];

export const EMPLOYMENT_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
];

export const STAFF_BILLING_TYPE_OPTIONS: { value: StaffBillingType; label: string }[] = [
  { value: "hourly", label: "Hourly" },
  { value: "monthly", label: "Monthly" },
];

/** A stored role that isn't one of the defaults — i.e. entered via "Other". */
export function isCustomRole(role: string): boolean {
  return !!role.trim() && !STAFF_ROLE_OPTIONS.includes(role);
}

/** A non-empty, non-negative numeric string. */
export function isBillingRateValid(raw: string): boolean {
  const n = Number(raw);
  return raw.trim() !== "" && !Number.isNaN(n) && n >= 0;
}

/** Round a rate string to 2 decimals so what's stored matches what's shown. */
export function roundRate(raw: string): string {
  const n = Number(raw);
  if (raw.trim() === "" || Number.isNaN(n)) return raw;
  return (Math.round(n * 100) / 100).toString();
}

/** Billing type + rate must be both set or both empty. */
export function isBillingPairComplete(billingType: string, billingRate: string): boolean {
  const rateSet = billingRate.trim() !== "";
  return (billingType === "" && !rateSet) || (!!billingType && isBillingRateValid(billingRate));
}

/**
 * Whether the HR fields (role/employment/billing) permit saving.
 * Create requires all of them; edit treats them as optional (opportunistic
 * backfill) but still enforces billing as both-or-neither.
 */
export function staffHrFieldsValid(args: {
  mode: "create" | "edit";
  role: string;
  employmentType: EmploymentType | "";
  billingType: StaffBillingType | "";
  billingRate: string;
}): boolean {
  const { mode, role, employmentType, billingType, billingRate } = args;
  if (mode === "create") {
    return (
      !!role.trim() && !!employmentType && !!billingType && isBillingRateValid(billingRate)
    );
  }
  return isBillingPairComplete(billingType, billingRate);
}
