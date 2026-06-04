import type { UpdateAgencyProfileRequest } from "@/lib/api/agencies";
import {
  hasOperationalDirtyFields,
  operationalFormToUpdatePayload,
  type OperationalFormSlice,
} from "./operational-settings";

export type AgencyProfileFormValues = {
  name: string;
  legalBusinessName: string;
  dba: string;
  agencyType: string;
  ein: string;
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
  payrollScheduleFrequency: string;
  payrollScheduleNextPayoutDate: string;
} & OperationalFormSlice;

type DirtyFields = Partial<Record<keyof AgencyProfileFormValues, boolean | boolean[]>>;

const IDENTITY_KEYS = [
  "name",
  "legalBusinessName",
  "dba",
  "agencyType",
  "ein",
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
  "payrollScheduleFrequency",
  "payrollScheduleNextPayoutDate",
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

function parsePayrollFrequency(value: string): "weekly" | "biweekly" | "monthly" {
  if (value === "weekly" || value === "biweekly" || value === "monthly") {
    return value;
  }
  return "biweekly";
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
    payload.ein = nullable(values.ein);
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

  if (hasAnyDirty(dirtyFields, BRANDING_KEYS)) {
    payload.primaryColor = nullable(values.primaryColor);
  }

  if (hasAnyDirty(dirtyFields, BILLING_KEYS)) {
    payload.billingFormat = nullable(values.billingFormat);
    payload.invoiceName = nullable(values.invoiceName);
    payload.invoiceEmail = nullable(values.invoiceEmail);
    if (
      isFieldDirty(dirtyFields, "payrollScheduleFrequency") ||
      isFieldDirty(dirtyFields, "payrollScheduleNextPayoutDate")
    ) {
      payload.payrollSchedule = {
        frequency: parsePayrollFrequency(values.payrollScheduleFrequency),
        nextPayoutDate: nullable(values.payrollScheduleNextPayoutDate),
      };
    }
  }

  if (hasOperationalDirtyFields(dirtyFields)) {
    Object.assign(payload, operationalFormToUpdatePayload(values));
  }

  return payload;
}
