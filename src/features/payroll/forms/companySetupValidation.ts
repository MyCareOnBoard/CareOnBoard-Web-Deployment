import { CHECK_ENTITY_TYPES, CHECK_INDUSTRIES, CHECK_PAY_FREQUENCIES, type CheckPayrollProfileFormValues } from "@/lib/agency/agency-profile-payload";

const isoDate = (value?: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value);
const address = (value: CheckPayrollProfileFormValues["legalAddress"]) => Boolean(value?.line1.trim() && value.city.trim() && /^[A-Z]{2}$/.test(value.state) && /^\d{5}(?:-\d{4})?$/.test(value.postalCode) && value.country === "US");

/** Returns client-side errors only for supplied payroll prerequisites; drafts remain intentionally partial. */
export function validateCompanySetup(values: CheckPayrollProfileFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (values.entityType && !CHECK_ENTITY_TYPES.includes(values.entityType as typeof CHECK_ENTITY_TYPES[number])) errors.entityType = "Select a supported entity type.";
  if (values.industry && !CHECK_INDUSTRIES.includes(values.industry as typeof CHECK_INDUSTRIES[number])) errors.industry = "Select a supported industry.";
  if (values.ein && !/^\d{2}-?\d{7}$/.test(values.ein)) errors.ein = "Enter a 9-digit EIN.";
  if (values.website && !/^https?:\/\/\S+$/i.test(values.website)) errors.website = "Enter an http or https website.";
  if (values.phone && !/^\+?[1-9]\d{7,14}$/.test(values.phone)) errors.phone = "Enter an international phone number.";
  if (values.payrollContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.payrollContactEmail)) errors.payrollContactEmail = "Enter a valid payroll contact email.";
  if (values.payrollContactPhone && !/^\+?[1-9]\d{7,14}$/.test(values.payrollContactPhone)) errors.payrollContactPhone = "Enter an international payroll contact phone number.";
  if (values.legalAddress && !address(values.legalAddress)) errors.legalAddress = "Enter a complete US legal address.";
  if (values.officeAddress && (!values.officeName?.trim() || !address(values.officeAddress) || values.actualWorkLocationAttested !== true)) errors.officeWorkplace = "Provide an attested actual workplace address.";
  if (values.expectedW2Workers !== undefined && (!Number.isInteger(Number(values.expectedW2Workers)) || Number(values.expectedW2Workers) < 0)) errors.expectedW2Workers = "Worker count must be a non-negative whole number.";
  if (values.payFrequency) {
    if (!CHECK_PAY_FREQUENCIES.includes(values.payFrequency as typeof CHECK_PAY_FREQUENCIES[number])) errors.payFrequency = "Select a supported pay frequency.";
    if (!isoDate(values.firstPayday) || !isoDate(values.firstPeriodEnd) || !isoDate(values.payrollStartDate)) errors.paySchedule = "Use valid ISO dates.";
    else if (values.firstPeriodEnd! >= values.firstPayday! || values.payrollStartDate! > values.firstPeriodEnd!) errors.paySchedule = "The first period must end before payday and after the payroll start date.";
    if (values.payFrequency === "semimonthly" && (!isoDate(values.secondPayday) || values.secondPayday! <= values.firstPayday! || new Date(`${values.secondPayday!}T00:00:00Z`) > new Date(Date.UTC(new Date(`${values.firstPayday!}T00:00:00Z`).getUTCFullYear(), new Date(`${values.firstPayday!}T00:00:00Z`).getUTCMonth() + 2, 0)))) errors.secondPayday = "The second semimonthly payday must be later than the first and within one calendar month.";
    if (values.payFrequency !== "semimonthly" && values.secondPayday) errors.secondPayday = "Only semimonthly schedules have a second payday.";
  }
  return errors;
}
