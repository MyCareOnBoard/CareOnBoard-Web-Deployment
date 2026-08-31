import type { UpdateAgencyProfileRequest } from "@/lib/api/agencies";
import {
  hasOperationalDirtyFields,
  operationalFormToUpdatePayload,
  type OperationalFormSlice,
} from "./operational-settings";

export const CHECK_ENTITY_TYPES = ["sole_proprietorship", "partnership", "c_corporation", "s_corporation", "llc"] as const;
export const CHECK_INDUSTRIES = ["auto_or_machine_sales", "auto_or_machine_repair", "arts_or_entertainment_or_recreation", "cleaning_services", "consulting_services", "educational_services", "family_care_services", "financial_services", "food_and_beverage_retail_or_wholesale", "general_construction_or_general_contracting", "health_care", "hospitality_or_accommodation", "hvac_or_plumbing_or_electrical_contracting", "legal_services", "non_food_retail_or_wholesale", "other", "personal_care_services", "real_estate", "restaurant", "scientific_or_technical_services", "security_services", "tobacco_or_alcohol_sales", "transportation"] as const;
export const CHECK_PAY_FREQUENCIES = ["weekly", "biweekly", "semimonthly", "monthly", "quarterly", "annually"] as const;
export type CheckPayFrequency = typeof CHECK_PAY_FREQUENCIES[number];

export type CheckAddress = { line1: string; line2?: string | null; city: string; state: string; postalCode: string; country: "US" };
export type CheckPayrollProfileWrite = {
  legalName?: string; einChange?: { mode: "replace"; value: string } | { mode: "preserve" };
  entityType?: typeof CHECK_ENTITY_TYPES[number]; industry?: typeof CHECK_INDUSTRIES[number]; legalAddress?: CheckAddress;
  officeWorkplace?: { name: string; address: CheckAddress; actualWorkLocationAttested: true }; website?: string; phone?: string;
  payrollContact?: { name: string; email: string; phone: string };
  payrollIntent?: { frequency: CheckPayFrequency; firstPayday: string };
  expectedWorkerCounts?: { w2: number; contractor: 0 };
};
export type CheckPayrollProfileRead = Omit<CheckPayrollProfileWrite, "einChange"> & { einStatus?: { present: boolean; last4?: string } };

export type CheckPayrollProfileFormValues = {
  legalName?: string; ein?: string; einPresent?: boolean; entityType?: string; industry?: string; legalAddress?: CheckAddress;
  officeName?: string; officeAddress?: CheckAddress; actualWorkLocationAttested?: boolean; website?: string; phone?: string;
  payrollContactName?: string; payrollContactEmail?: string; payrollContactPhone?: string; payFrequency?: string;
  firstPayday?: string;
  expectedW2Workers?: string | number;
};

export type PayScheduleFormValues = {
  frequency: CheckPayFrequency | "";
  payrollStartDate: string;
  firstPeriodEnd: string;
  firstPayday: string;
  secondPayday: string;
};

const trim = (value: string | undefined) => value?.trim() ?? "";
const hasAddress = (value: CheckAddress | undefined) => Boolean(value && trim(value.line1) && trim(value.city) && trim(value.state) && trim(value.postalCode));
export const isUsTenDigitPayrollPhone = (value: string | undefined): value is string => /^\d{10}$/.test(value ?? "");
export const toCanonicalUsPayrollPhone = (value: string | undefined): string | undefined => isUsTenDigitPayrollPhone(value) ? `+1${value}` : undefined;

/** Maps the one onboarding form slice to the backend's exact, write-only contract. */
export function buildCheckPayrollProfilePayload(values: CheckPayrollProfileFormValues): CheckPayrollProfileWrite {
  const payload: CheckPayrollProfileWrite = {};
  const ein = trim(values.ein);
  if (ein) payload.einChange = { mode: "replace", value: ein };
  else if (values.einPresent) payload.einChange = { mode: "preserve" };
  if (trim(values.legalName)) payload.legalName = trim(values.legalName);
  if (CHECK_ENTITY_TYPES.includes(values.entityType as typeof CHECK_ENTITY_TYPES[number])) payload.entityType = values.entityType as typeof CHECK_ENTITY_TYPES[number];
  if (CHECK_INDUSTRIES.includes(values.industry as typeof CHECK_INDUSTRIES[number])) payload.industry = values.industry as typeof CHECK_INDUSTRIES[number];
  if (hasAddress(values.legalAddress)) payload.legalAddress = values.legalAddress!;
  if (trim(values.officeName) && hasAddress(values.officeAddress) && values.actualWorkLocationAttested) payload.officeWorkplace = { name: trim(values.officeName), address: values.officeAddress!, actualWorkLocationAttested: true };
  if (trim(values.website)) payload.website = trim(values.website);
  const phone = toCanonicalUsPayrollPhone(values.phone);
  const payrollContactPhone = toCanonicalUsPayrollPhone(values.payrollContactPhone);
  if (phone) payload.phone = phone;
  if (trim(values.payrollContactName) && trim(values.payrollContactEmail) && payrollContactPhone) payload.payrollContact = { name: trim(values.payrollContactName), email: trim(values.payrollContactEmail), phone: payrollContactPhone };
  if (CHECK_PAY_FREQUENCIES.includes(values.payFrequency as CheckPayFrequency) && trim(values.firstPayday)) payload.payrollIntent = { frequency: values.payFrequency as CheckPayFrequency, firstPayday: trim(values.firstPayday) };
  if (values.expectedW2Workers !== undefined && trim(String(values.expectedW2Workers)) !== "") payload.expectedWorkerCounts = { w2: Number(values.expectedW2Workers), contractor: 0 };
  return payload;
}

export type AgencyProfileFormValues = {
  name: string;
  legalBusinessName: string;
  dba: string;
  agencyType: string;
  npi: string;
  providerId: string;
  medicaidProviderId: string;
  email: string;
  phone: string;
  address: string;
  county: string;
  city: string;
  state: string;
  zipCode: string;
  website: string;
  primaryColor: string;
  billingFormat: string;
  invoiceName: string;
  invoiceEmail: string;
  timezone: string;
} & OperationalFormSlice;

type DirtyFields = Partial<Record<keyof AgencyProfileFormValues, boolean | boolean[]>>;

const IDENTITY_KEYS = [
  "name",
  "legalBusinessName",
  "dba",
  "agencyType",
  "npi",
  "providerId",
  "medicaidProviderId",
] as const satisfies readonly (keyof AgencyProfileFormValues)[];

const CONTACT_KEYS = [
  "email",
  "phone",
  "address",
  "county",
  "city",
  "state",
  "zipCode",
  "website",
] as const satisfies readonly (keyof AgencyProfileFormValues)[];

const BRANDING_KEYS = ["primaryColor"] as const satisfies readonly (keyof AgencyProfileFormValues)[];

const BILLING_KEYS = [
  "billingFormat",
  "invoiceName",
  "invoiceEmail",
] as const satisfies readonly (keyof AgencyProfileFormValues)[];

export function isFieldDirty(
  dirtyFields: DirtyFields | undefined,
  key: keyof AgencyProfileFormValues,
): boolean {
  if (!dirtyFields) return false;
  const flag = dirtyFields[key];
  return flag === true || (Array.isArray(flag) && flag.some(Boolean));
}

export function hasAnyDirty(
  dirtyFields: DirtyFields | undefined,
  keys: readonly (keyof AgencyProfileFormValues)[],
): boolean {
  return keys.some((key) => isFieldDirty(dirtyFields, key));
}

export function buildAgencyProfileUpdatePayload(
  values: AgencyProfileFormValues,
  dirtyFields?: DirtyFields,
): UpdateAgencyProfileRequest {
  const trim = (value: string) => value.trim();
  const nullable = (value: string) => {
    const trimmed = trim(value);
    return trimmed === "" ? null : trimmed;
  };

  const payload: UpdateAgencyProfileRequest = {};

  if (hasAnyDirty(dirtyFields, IDENTITY_KEYS)) {
    payload.name = trim(values.name);
    payload.legalBusinessName = nullable(values.legalBusinessName);
    payload.dba = nullable(values.dba);
    payload.agencyType = nullable(values.agencyType);
    payload.npi = nullable(values.npi);
    payload.providerId = nullable(values.providerId);
    payload.medicaidProviderId = nullable(values.medicaidProviderId);
  }

  if (hasAnyDirty(dirtyFields, CONTACT_KEYS)) {
    payload.email = trim(values.email);
    payload.phone = nullable(values.phone);
    payload.address = nullable(values.address);
    payload.county = nullable(values.county);
    payload.city = nullable(values.city);
    payload.state = nullable(values.state);
    payload.zipCode = nullable(values.zipCode);
    payload.website = nullable(values.website);
  }

  if (isFieldDirty(dirtyFields, "timezone")) {
    payload.timezone = trim(values.timezone);
  }

  if (hasAnyDirty(dirtyFields, BRANDING_KEYS)) {
    payload.primaryColor = nullable(values.primaryColor);
  }

  if (hasAnyDirty(dirtyFields, BILLING_KEYS)) {
    payload.billingFormat = nullable(values.billingFormat);
    payload.invoiceName = nullable(values.invoiceName);
    payload.invoiceEmail = nullable(values.invoiceEmail);
  }

  if (hasOperationalDirtyFields(dirtyFields)) {
    Object.assign(payload, operationalFormToUpdatePayload(values));
  }

  return payload;
}
