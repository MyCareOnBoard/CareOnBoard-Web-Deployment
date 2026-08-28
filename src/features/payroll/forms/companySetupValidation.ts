import { CHECK_ENTITY_TYPES, CHECK_INDUSTRIES, CHECK_PAY_FREQUENCIES, isUsTenDigitPayrollPhone, type CheckPayrollProfileFormValues } from "@/lib/agency/agency-profile-payload";

const isoDate = (value?: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value);
const iso = (date: Date) => date.toISOString().slice(0, 10);
const nthWeekday = (year: number, month: number, weekday: number, occurrence: number) => {
  const first = new Date(Date.UTC(year, month, 1));
  return iso(new Date(Date.UTC(year, month, 1 + ((weekday - first.getUTCDay() + 7) % 7) + (occurrence - 1) * 7)));
};
const lastWeekday = (year: number, month: number, weekday: number) => {
  const last = new Date(Date.UTC(year, month + 1, 0));
  return iso(new Date(Date.UTC(year, month, last.getUTCDate() - ((last.getUTCDay() - weekday + 7) % 7))));
};
const observedFixedHoliday = (year: number, month: number, day: number) => {
  const holiday = new Date(Date.UTC(year, month, day));
  if (holiday.getUTCDay() === 0) holiday.setUTCDate(holiday.getUTCDate() + 1);
  return iso(holiday);
};

/** Federal Reserve closure dates used by Check payday validation. */
export function isUsBankingDay(value?: string): boolean {
  if (!isoDate(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if ([0, 6].includes(date.getUTCDay())) return false;
  const year = date.getUTCFullYear();
  const holidays = new Set([
    observedFixedHoliday(year, 0, 1),
    nthWeekday(year, 0, 1, 3),
    nthWeekday(year, 1, 1, 3),
    lastWeekday(year, 4, 1),
    ...(year >= 2021 ? [observedFixedHoliday(year, 5, 19)] : []),
    observedFixedHoliday(year, 6, 4),
    nthWeekday(year, 8, 1, 1),
    nthWeekday(year, 9, 1, 2),
    observedFixedHoliday(year, 10, 11),
    nthWeekday(year, 10, 4, 4),
    observedFixedHoliday(year, 11, 25),
  ]);
  return !holidays.has(value!);
}

const BANKING_DAY_ERROR = "Choose a U.S. banking day. Weekends and Federal Reserve holidays are not accepted.";
const FUTURE_BANKING_DAY_ERROR = "Choose a future U.S. banking day. Today, weekends, and Federal Reserve holidays are not accepted.";
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
  if (values.phone && !isUsTenDigitPayrollPhone(values.phone)) errors.mainPhone = "Enter a valid US ten-digit company phone number.";
  const payrollContactParticipates = Boolean(values.payrollContactName?.trim() || values.payrollContactEmail?.trim() || values.payrollContactPhone?.trim());
  if (payrollContactParticipates && !values.payrollContactName?.trim()) errors.payrollContactName = "Enter the payroll contact’s full name.";
  if (payrollContactParticipates && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.payrollContactEmail ?? "")) errors.payrollContactEmail = "Enter a valid payroll contact’s email address.";
  if (payrollContactParticipates && !isUsTenDigitPayrollPhone(values.payrollContactPhone)) errors.payrollContactPhone = "Enter a valid US ten-digit payroll contact phone number.";
  if (hasAddressContent(values.legalAddress) && !address(values.legalAddress)) errors.payrollLegalAddress = "Enter a complete U.S. legal business address.";
  if (hasAddressContent(values.officeAddress) || values.officeName?.trim() || values.actualWorkLocationAttested) {
    if (!values.officeName?.trim()) errors.payrollOfficeName = "Enter the primary workplace name.";
    if (!address(values.officeAddress)) errors.payrollOfficeAddress = "Provide a complete primary workplace address.";
    if (values.actualWorkLocationAttested !== true) errors.payrollActualWorkLocationAttested = "Confirm employees physically work at this location.";
  }
  if (values.expectedW2Workers !== undefined && (!Number.isInteger(Number(values.expectedW2Workers)) || Number(values.expectedW2Workers) < 0)) errors.expectedW2Workers = "Enter a whole number of W-2 employees, 0 or more.";
  if (values.payFrequency && !CHECK_PAY_FREQUENCIES.includes(values.payFrequency as typeof CHECK_PAY_FREQUENCIES[number])) errors.payrollFrequency = "Select a supported pay frequency.";

  const firstPaydayValid = isoDate(values.firstPayday);
  const firstPeriodEndValid = isoDate(values.firstPeriodEnd);
  const payrollStartDateValid = isoDate(values.payrollStartDate);
  if (values.payFrequency || values.firstPayday) {
    if (!firstPaydayValid) errors.payrollFirstPayday = "Enter a valid first scheduled payday.";
    else if (values.firstPayday! <= new Date().toISOString().slice(0, 10)) errors.payrollFirstPayday = FUTURE_BANKING_DAY_ERROR;
    else if (!isUsBankingDay(values.firstPayday)) errors.payrollFirstPayday = BANKING_DAY_ERROR;
  }
  if ((values.payFrequency || values.firstPeriodEnd) && !firstPeriodEndValid) errors.payrollFirstPeriodEnd = "Enter a valid first pay period end date.";
  if ((values.payFrequency || values.payrollStartDate) && !payrollStartDateValid) errors.payrollStartDate = "Enter a valid payroll tracking start date.";
  if (firstPaydayValid && firstPeriodEndValid && values.firstPeriodEnd! >= values.firstPayday!) errors.payrollFirstPeriodEnd = "The first pay period must end before the first scheduled payday.";
  if (payrollStartDateValid && firstPeriodEndValid && values.payrollStartDate! > values.firstPeriodEnd!) errors.payrollStartDate = "The payroll tracking start date must be on or before the first pay period end date.";

  const secondPaydayValid = isoDate(values.secondPayday);
  if (values.payFrequency === "semimonthly" || values.secondPayday) {
    if (!secondPaydayValid) errors.payrollSecondPayday = "Enter a valid second scheduled payday.";
    else if (!isUsBankingDay(values.secondPayday)) errors.payrollSecondPayday = BANKING_DAY_ERROR;
    else if (values.payFrequency !== "semimonthly") errors.payrollSecondPayday = "Only semimonthly schedules have a second scheduled payday.";
    else if (firstPaydayValid && (values.secondPayday! <= values.firstPayday! || new Date(`${values.secondPayday!}T00:00:00Z`) > addOneCalendarMonthClamped(values.firstPayday!))) errors.payrollSecondPayday = "The second scheduled payday must be later than the first and within one calendar month.";
  }
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
    && values.expectedW2Workers !== undefined
    && Number.isInteger(Number(values.expectedW2Workers))
    && Number(values.expectedW2Workers) >= 0;
}
