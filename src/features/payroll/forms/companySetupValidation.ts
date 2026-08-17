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
  if (values.entityType && !CHECK_ENTITY_TYPES.includes(values.entityType as typeof CHECK_ENTITY_TYPES[number])) errors.payrollEntityType = "Select a supported business structure.";
  if (values.industry && !CHECK_INDUSTRIES.includes(values.industry as typeof CHECK_INDUSTRIES[number])) errors.payrollIndustry = "Select a supported industry.";
  if (values.ein && !/^\d{2}-?\d{7}$/.test(values.ein)) errors.payrollEin = "Enter a nine-digit federal tax ID.";
  if (values.website && !/^https?:\/\/\S+$/i.test(values.website)) errors.websiteUrl = "Enter an http or https company website.";
  if (values.phone && !/^\+?[1-9]\d{7,14}$/.test(values.phone)) errors.mainPhone = "Enter an international company phone number.";
  const payrollContactParticipates = Boolean(values.payrollContactName?.trim() || values.payrollContactEmail?.trim() || values.payrollContactPhone?.trim());
  if (payrollContactParticipates && !values.payrollContactName?.trim()) errors.payrollContactName = "Enter the payroll contact’s full name.";
  if (payrollContactParticipates && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.payrollContactEmail ?? "")) errors.payrollContactEmail = "Enter a valid payroll contact’s email address.";
  if (payrollContactParticipates && !/^\+?[1-9]\d{7,14}$/.test(values.payrollContactPhone ?? "")) errors.payrollContactPhone = "Enter an international payroll contact’s phone number.";
  if (hasAddressContent(values.legalAddress) && !address(values.legalAddress)) errors.payrollLegalAddress = "Enter a complete U.S. legal business address.";
  if (hasAddressContent(values.officeAddress) || values.officeName?.trim() || values.actualWorkLocationAttested) {
    if (!values.officeName?.trim()) errors.payrollOfficeName = "Enter the primary workplace name.";
    if (!address(values.officeAddress)) errors.payrollOfficeAddress = "Provide a complete primary workplace address.";
    if (values.actualWorkLocationAttested !== true) errors.payrollActualWorkLocationAttested = "Confirm employees physically work at this location.";
  }
  if (values.expectedW2Workers !== undefined && (!Number.isInteger(Number(values.expectedW2Workers)) || Number(values.expectedW2Workers) < 0)) errors.expectedW2Workers = "Enter a whole number of W-2 employees, 0 or more.";
  if (values.payFrequency) {
    if (!CHECK_PAY_FREQUENCIES.includes(values.payFrequency as typeof CHECK_PAY_FREQUENCIES[number])) errors.payrollFrequency = "Select a supported pay frequency.";
    if (!isoDate(values.firstPayday)) errors.payrollFirstPayday = "Enter a valid first scheduled payday.";
    if (!isoDate(values.firstPeriodEnd)) errors.payrollFirstPeriodEnd = "Enter a valid first pay period end date.";
    if (!isoDate(values.payrollStartDate)) errors.payrollStartDate = "Enter a valid payroll tracking start date.";
    if (!errors.payrollFirstPayday && !errors.payrollFirstPeriodEnd && values.firstPeriodEnd! >= values.firstPayday!) errors.payrollFirstPeriodEnd = "The first pay period must end before the first scheduled payday.";
    if (!errors.payrollStartDate && !errors.payrollFirstPeriodEnd && values.payrollStartDate! > values.firstPeriodEnd!) errors.payrollStartDate = "The payroll tracking start date must be on or before the first pay period end date.";
    if (values.payFrequency === "semimonthly" && (!isoDate(values.secondPayday) || values.secondPayday! <= values.firstPayday! || new Date(`${values.secondPayday!}T00:00:00Z`) > addOneCalendarMonthClamped(values.firstPayday!))) errors.payrollSecondPayday = "The second scheduled payday must be later than the first and within one calendar month.";
    if (values.payFrequency !== "semimonthly" && values.secondPayday) errors.payrollSecondPayday = "Only semimonthly schedules have a second scheduled payday.";
  }
  const signerParticipates = Boolean(values.proposedSignerFirstName?.trim() || values.proposedSignerLastName?.trim() || values.proposedSignerTitle?.trim() || values.proposedSignerEmail?.trim());
  if (signerParticipates && !values.proposedSignerFirstName?.trim()) errors.proposedSignerFirstName = "Enter the proposed signer’s first name.";
  if (signerParticipates && !values.proposedSignerLastName?.trim()) errors.proposedSignerLastName = "Enter the proposed signer’s last name.";
  if (signerParticipates && !values.proposedSignerTitle?.trim()) errors.proposedSignerTitle = "Enter the proposed signer’s job title.";
  if (signerParticipates && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.proposedSignerEmail ?? "")) errors.proposedSignerEmail = "Enter a valid proposed signer’s email address.";
  return errors;
}

const present = (value?: string) => Boolean(value?.trim());

/** Mirrors the backend's completeProfile gate; this indicates local readiness only. */
export function isCompanySetupComplete(values: CheckPayrollProfileFormValues): boolean {
  const hasEin = present(values.ein) || values.einPresent === true;
  return Object.keys(validateCompanySetup(values)).length === 0
    && present(values.legalName)
    && hasEin
    && CHECK_ENTITY_TYPES.includes(values.entityType as typeof CHECK_ENTITY_TYPES[number])
    && CHECK_INDUSTRIES.includes(values.industry as typeof CHECK_INDUSTRIES[number])
    && address(values.legalAddress)
    && present(values.officeName)
    && address(values.officeAddress)
    && values.actualWorkLocationAttested === true
    && present(values.website)
    && present(values.phone)
    && present(values.payrollContactName)
    && present(values.payrollContactEmail)
    && present(values.payrollContactPhone)
    && CHECK_PAY_FREQUENCIES.includes(values.payFrequency as typeof CHECK_PAY_FREQUENCIES[number])
    && isoDate(values.firstPayday)
    && isoDate(values.firstPeriodEnd)
    && isoDate(values.payrollStartDate)
    && (values.payFrequency !== "semimonthly" || isoDate(values.secondPayday))
    && present(values.proposedSignerFirstName)
    && present(values.proposedSignerLastName)
    && present(values.proposedSignerTitle)
    && present(values.proposedSignerEmail)
    && values.expectedW2Workers !== undefined
    && Number.isInteger(Number(values.expectedW2Workers))
    && Number(values.expectedW2Workers) >= 0;
}
