import { CHECK_ENTITY_TYPES, CHECK_INDUSTRIES, CHECK_PAY_FREQUENCIES, type CheckPayrollProfileFormValues } from "@/lib/agency/agency-profile-payload";

const isoDate = (value?: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value);
const address = (value: CheckPayrollProfileFormValues["legalAddress"]) => Boolean(value?.line1.trim() && value.city.trim() && /^[A-Z]{2}$/.test(value.state) && /^\d{5}(?:-\d{4})?$/.test(value.postalCode) && value.country === "US");
const hasAddressContent = (value: CheckPayrollProfileFormValues["legalAddress"]) => Boolean(value && [value.line1, value.line2, value.city, value.state, value.postalCode].some((part) => part?.trim()));
const addOneCalendarMonthClamped = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  const nextMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  const lastDay = new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth(), Math.min(date.getUTCDate(), lastDay)));
};

/** Returns client-side errors only for supplied payroll prerequisites; drafts remain intentionally partial. */
export function validateCompanySetup(values: CheckPayrollProfileFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (values.entityType && !CHECK_ENTITY_TYPES.includes(values.entityType as typeof CHECK_ENTITY_TYPES[number])) errors.payrollEntityType = "Select a supported entity type.";
  if (values.industry && !CHECK_INDUSTRIES.includes(values.industry as typeof CHECK_INDUSTRIES[number])) errors.payrollIndustry = "Select a supported industry.";
  if (values.ein && !/^\d{2}-?\d{7}$/.test(values.ein)) errors.payrollEin = "Enter a 9-digit EIN.";
  if (values.website && !/^https?:\/\/\S+$/i.test(values.website)) errors.websiteUrl = "Enter an http or https website.";
  if (values.phone && !/^\+?[1-9]\d{7,14}$/.test(values.phone)) errors.mainPhone = "Enter an international phone number.";
  const payrollContactParticipates = Boolean(values.payrollContactName?.trim() || values.payrollContactEmail?.trim() || values.payrollContactPhone?.trim());
  if (payrollContactParticipates && !values.payrollContactName?.trim()) errors.payrollContactName = "Enter the payroll contact name.";
  if (payrollContactParticipates && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.payrollContactEmail ?? "")) errors.payrollContactEmail = "Enter a valid payroll contact email.";
  if (payrollContactParticipates && !/^\+?[1-9]\d{7,14}$/.test(values.payrollContactPhone ?? "")) errors.payrollContactPhone = "Enter an international payroll contact phone number.";
  if (hasAddressContent(values.legalAddress) && !address(values.legalAddress)) errors.payrollLegalAddress = "Enter a complete US legal address.";
  if (hasAddressContent(values.officeAddress) || values.officeName?.trim() || values.actualWorkLocationAttested) {
    if (!values.officeName?.trim()) errors.payrollOfficeName = "Enter the actual workplace name.";
    if (!address(values.officeAddress)) errors.payrollOfficeAddress = "Provide a complete actual workplace address.";
    if (values.actualWorkLocationAttested !== true) errors.payrollActualWorkLocationAttested = "Attest that this is an actual work location.";
  }
  if (values.expectedW2Workers !== undefined && (!Number.isInteger(Number(values.expectedW2Workers)) || Number(values.expectedW2Workers) < 0)) errors.expectedW2Workers = "Worker count must be a non-negative whole number.";
  if (values.payFrequency) {
    if (!CHECK_PAY_FREQUENCIES.includes(values.payFrequency as typeof CHECK_PAY_FREQUENCIES[number])) errors.payrollFrequency = "Select a supported pay frequency.";
    if (!isoDate(values.firstPayday)) errors.payrollFirstPayday = "Enter a valid first payday.";
    if (!isoDate(values.firstPeriodEnd)) errors.payrollFirstPeriodEnd = "Enter a valid first period end date.";
    if (!isoDate(values.payrollStartDate)) errors.payrollStartDate = "Enter a valid local payroll start date.";
    if (!errors.payrollFirstPayday && !errors.payrollFirstPeriodEnd && values.firstPeriodEnd! >= values.firstPayday!) errors.payrollFirstPeriodEnd = "The first period must end before payday.";
    if (!errors.payrollStartDate && !errors.payrollFirstPeriodEnd && values.payrollStartDate! > values.firstPeriodEnd!) errors.payrollStartDate = "The payroll start date must be on or before the first period end.";
    if (values.payFrequency === "semimonthly" && (!isoDate(values.secondPayday) || values.secondPayday! <= values.firstPayday! || new Date(`${values.secondPayday!}T00:00:00Z`) > addOneCalendarMonthClamped(values.firstPayday!))) errors.payrollSecondPayday = "The second semimonthly payday must be later than the first and within one calendar month.";
    if (values.payFrequency !== "semimonthly" && values.secondPayday) errors.payrollSecondPayday = "Only semimonthly schedules have a second payday.";
  }
  const signerParticipates = Boolean(values.proposedSignerFirstName?.trim() || values.proposedSignerLastName?.trim() || values.proposedSignerTitle?.trim() || values.proposedSignerEmail?.trim());
  if (signerParticipates && !values.proposedSignerFirstName?.trim()) errors.proposedSignerFirstName = "Enter the proposed signer's first name.";
  if (signerParticipates && !values.proposedSignerLastName?.trim()) errors.proposedSignerLastName = "Enter the proposed signer's last name.";
  if (signerParticipates && !values.proposedSignerTitle?.trim()) errors.proposedSignerTitle = "Enter the proposed signer's title.";
  if (signerParticipates && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.proposedSignerEmail ?? "")) errors.proposedSignerEmail = "Enter a valid proposed signer email.";
  return errors;
}
