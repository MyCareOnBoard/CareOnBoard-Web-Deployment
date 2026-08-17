import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildCheckPayrollProfilePayload, CHECK_ENTITY_TYPES, CHECK_INDUSTRIES, CHECK_PAY_FREQUENCIES, type CheckAddress, type CheckPayrollProfileFormValues, type CheckPayrollProfileRead, type CheckPayrollProfileWrite } from "@/lib/agency/agency-profile-payload";
import { validateCompanySetup } from "@/features/payroll/forms/companySetupValidation";
import { useToast } from "@/hooks/use-toast";
import { AddressAutocompleteField } from "@/pages/shared/client-management/components/forms/AddressAutocompleteField";
import { DatePickerField } from "@/pages/shared/client-management/components/forms/formControls";

type Props = {
  open: boolean;
  values: CheckPayrollProfileRead;
  missingFieldCodes: string[];
  isSubmitting?: boolean;
  submissionError?: string | null;
  submissionFieldCodes?: string[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (profile: CheckPayrollProfileWrite) => Promise<void>;
};

const emptyAddress = (): CheckAddress => ({ line1: "", line2: "", city: "", state: "", postalCode: "", country: "US" });

function formValues(values: CheckPayrollProfileRead): CheckPayrollProfileFormValues {
  return {
    legalName: values.legalName ?? "",
    einPresent: values.einStatus?.present === true,
    entityType: values.entityType ?? "",
    industry: values.industry ?? "",
    legalAddress: values.legalAddress ?? emptyAddress(),
    officeName: values.officeWorkplace?.name ?? "",
    officeAddress: values.officeWorkplace?.address ?? emptyAddress(),
    actualWorkLocationAttested: values.officeWorkplace?.actualWorkLocationAttested === true,
    website: values.website ?? "",
    phone: values.phone ?? "",
    payrollContactName: values.payrollContact?.name ?? "",
    payrollContactEmail: values.payrollContact?.email ?? "",
    payrollContactPhone: values.payrollContact?.phone ?? "",
    payFrequency: values.paySchedule?.frequency ?? "",
    firstPayday: values.paySchedule?.firstPayday ?? "",
    secondPayday: values.paySchedule?.secondPayday ?? "",
    firstPeriodEnd: values.paySchedule?.firstPeriodEnd ?? "",
    payrollStartDate: values.paySchedule?.payrollStartDate ?? "",
    expectedW2Workers: values.expectedWorkerCounts?.w2 ?? "",
  };
}

export const buildAgencyPayrollBootstrapPayload = (values: CheckPayrollProfileRead) => buildCheckPayrollProfilePayload(formValues(values));

const GROUP_ORDER = ["identity", "ein", "business", "legalAddress", "workplace", "contact", "payrollContact", "schedule", "workers"] as const;
type FieldGroup = typeof GROUP_ORDER[number];
export const AGENCY_PAYROLL_REQUIRED_FIELD_CODES = [
  "legalName", "ein", "entityType", "industry",
  "legalAddress.line1", "legalAddress.city", "legalAddress.state", "legalAddress.postalCode", "legalAddress.country",
  "officeWorkplace.name", "officeWorkplace.actualWorkLocationAttested",
  "officeWorkplace.address.line1", "officeWorkplace.address.city", "officeWorkplace.address.state", "officeWorkplace.address.postalCode", "officeWorkplace.address.country",
  "website", "phone",
  "payrollContact.name", "payrollContact.email", "payrollContact.phone",
  "paySchedule.frequency", "paySchedule.firstPayday", "paySchedule.secondPayday", "paySchedule.firstPeriodEnd", "paySchedule.payrollStartDate",
  "expectedWorkerCounts.w2", "expectedWorkerCounts.contractor",
] as const;
type RequiredFieldCode = typeof AGENCY_PAYROLL_REQUIRED_FIELD_CODES[number];
type FormErrorTarget = keyof CheckPayrollProfileFormValues | "legalAddress" | "officeAddress";
type FieldSpec = { group: FieldGroup; target: FormErrorTarget; fixed?: true; satisfied: (form: CheckPayrollProfileFormValues) => boolean };
const present = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== "";
export const AGENCY_PAYROLL_REQUIRED_FIELD_MAP: Record<RequiredFieldCode, FieldSpec> = {
  legalName: { group: "identity", target: "legalName", satisfied: (f) => present(f.legalName) },
  ein: { group: "ein", target: "ein", satisfied: (f) => present(f.ein) || f.einPresent === true },
  entityType: { group: "business", target: "entityType", satisfied: (f) => CHECK_ENTITY_TYPES.includes(f.entityType as typeof CHECK_ENTITY_TYPES[number]) },
  industry: { group: "business", target: "industry", satisfied: (f) => CHECK_INDUSTRIES.includes(f.industry as typeof CHECK_INDUSTRIES[number]) },
  "legalAddress.line1": { group: "legalAddress", target: "legalAddress", satisfied: (f) => present(f.legalAddress?.line1) },
  "legalAddress.city": { group: "legalAddress", target: "legalAddress", satisfied: (f) => present(f.legalAddress?.city) },
  "legalAddress.state": { group: "legalAddress", target: "legalAddress", satisfied: (f) => /^[A-Z]{2}$/.test(f.legalAddress?.state ?? "") },
  "legalAddress.postalCode": { group: "legalAddress", target: "legalAddress", satisfied: (f) => /^\d{5}(?:-\d{4})?$/.test(f.legalAddress?.postalCode ?? "") },
  "legalAddress.country": { group: "legalAddress", target: "legalAddress", fixed: true, satisfied: () => true },
  "officeWorkplace.name": { group: "workplace", target: "officeName", satisfied: (f) => present(f.officeName) },
  "officeWorkplace.actualWorkLocationAttested": { group: "workplace", target: "actualWorkLocationAttested", satisfied: (f) => f.actualWorkLocationAttested === true },
  "officeWorkplace.address.line1": { group: "workplace", target: "officeAddress", satisfied: (f) => present(f.officeAddress?.line1) },
  "officeWorkplace.address.city": { group: "workplace", target: "officeAddress", satisfied: (f) => present(f.officeAddress?.city) },
  "officeWorkplace.address.state": { group: "workplace", target: "officeAddress", satisfied: (f) => /^[A-Z]{2}$/.test(f.officeAddress?.state ?? "") },
  "officeWorkplace.address.postalCode": { group: "workplace", target: "officeAddress", satisfied: (f) => /^\d{5}(?:-\d{4})?$/.test(f.officeAddress?.postalCode ?? "") },
  "officeWorkplace.address.country": { group: "workplace", target: "officeAddress", fixed: true, satisfied: () => true },
  website: { group: "contact", target: "website", satisfied: (f) => /^https?:\/\/\S+$/i.test(f.website ?? "") },
  phone: { group: "contact", target: "phone", satisfied: (f) => /^\+?[1-9]\d{7,14}$/.test(f.phone ?? "") },
  "payrollContact.name": { group: "payrollContact", target: "payrollContactName", satisfied: (f) => present(f.payrollContactName) },
  "payrollContact.email": { group: "payrollContact", target: "payrollContactEmail", satisfied: (f) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.payrollContactEmail ?? "") },
  "payrollContact.phone": { group: "payrollContact", target: "payrollContactPhone", satisfied: (f) => /^\+?[1-9]\d{7,14}$/.test(f.payrollContactPhone ?? "") },
  "paySchedule.frequency": { group: "schedule", target: "payFrequency", satisfied: (f) => CHECK_PAY_FREQUENCIES.includes(f.payFrequency as typeof CHECK_PAY_FREQUENCIES[number]) },
  "paySchedule.firstPayday": { group: "schedule", target: "firstPayday", satisfied: (f) => present(f.firstPayday) },
  "paySchedule.secondPayday": { group: "schedule", target: "secondPayday", satisfied: (f) => f.payFrequency !== "semimonthly" || present(f.secondPayday) },
  "paySchedule.firstPeriodEnd": { group: "schedule", target: "firstPeriodEnd", satisfied: (f) => present(f.firstPeriodEnd) && Boolean(f.firstPayday && f.firstPeriodEnd! < f.firstPayday) },
  "paySchedule.payrollStartDate": { group: "schedule", target: "payrollStartDate", satisfied: (f) => present(f.payrollStartDate) && Boolean(f.firstPeriodEnd && f.payrollStartDate! <= f.firstPeriodEnd) },
  "expectedWorkerCounts.w2": { group: "workers", target: "expectedW2Workers", satisfied: (f) => Number.isInteger(Number(f.expectedW2Workers)) && Number(f.expectedW2Workers) >= 0 && present(f.expectedW2Workers) },
  "expectedWorkerCounts.contractor": { group: "workers", target: "expectedW2Workers", fixed: true, satisfied: () => true },
};
const isRequiredFieldCode = (code: string): code is RequiredFieldCode => Object.hasOwn(AGENCY_PAYROLL_REQUIRED_FIELD_MAP, code);

const COMPANY_ERROR_TARGETS: Readonly<Record<string, FormErrorTarget>> = {
  payrollEntityType: "entityType", payrollIndustry: "industry", payrollEin: "ein", websiteUrl: "website", mainPhone: "phone",
  payrollLegalAddress: "legalAddress", payrollOfficeName: "officeName", payrollOfficeAddress: "officeAddress",
  payrollActualWorkLocationAttested: "actualWorkLocationAttested", payrollFrequency: "payFrequency",
  payrollFirstPayday: "firstPayday", payrollSecondPayday: "secondPayday", payrollFirstPeriodEnd: "firstPeriodEnd",
};

const localizeCompanyErrors = (errors: Record<string, string>) => Object.fromEntries(Object.entries(errors).map(([target, message]) => [COMPANY_ERROR_TARGETS[target] ?? target, message]));

export function validateAgencyPayrollBootstrapForm(form: CheckPayrollProfileFormValues, fieldCodes: readonly string[]): Record<string, string> {
  const validationErrors = localizeCompanyErrors(validateCompanySetup(form));
  const missingErrors = Object.fromEntries(fieldCodes
    .filter(isRequiredFieldCode)
    .filter((code) => !AGENCY_PAYROLL_REQUIRED_FIELD_MAP[code].fixed && !AGENCY_PAYROLL_REQUIRED_FIELD_MAP[code].satisfied(form))
    .map((code) => [AGENCY_PAYROLL_REQUIRED_FIELD_MAP[code].target, "This required payroll field is missing."]));
  return { ...validationErrors, ...missingErrors };
}

function Field({ label, value, onChange, type = "text", inputRef, readOnly = false, error, ein = false, id: explicitId, helperText, placeholder }: { label: string; value: string | number | undefined; onChange: (value: string) => void; type?: string; inputRef?: React.RefObject<HTMLInputElement | null>; readOnly?: boolean; error?: string; ein?: boolean; id?: string; helperText?: string; placeholder?: string }) {
  const id = explicitId ?? `payroll-bootstrap-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  const describedBy = [helperText && `${id}-help`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return <div><Label htmlFor={id}>{label}</Label><Input ref={inputRef} id={id} type={type} value={value ?? ""} readOnly={readOnly} autoComplete={ein ? "off" : undefined} inputMode={ein ? "numeric" : undefined} placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={describedBy} className="mt-1 min-h-11" onChange={(event) => onChange(event.target.value)} />{helperText && <p id={`${id}-help`} className="mt-1 text-xs text-[#5d626b]">{helperText}</p>}{error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-[#8b2d2d]">{error}</p>}</div>;
}

function EnumField({ label, value, options, onChange, inputRef, error, id: explicitId, placeholder }: { label: string; value: string | undefined; options: readonly string[]; onChange: (value: string) => void; inputRef?: React.RefObject<HTMLButtonElement | null>; error?: string; id?: string; placeholder?: string }) {
  const id = explicitId ?? `payroll-bootstrap-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  return <div><Label htmlFor={id}>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger ref={inputRef} id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="mt-1 min-h-11"><SelectValue placeholder={placeholder ?? `Select ${label.toLowerCase()}`} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select>{error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-[#8b2d2d]">{error}</p>}</div>;
}

function parsePayrollDate(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}

function formatPayrollDate(date: Date | undefined): string {
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function PayrollDateField({ label, value, onChange, error }: { label: string; value: string | undefined; onChange: (value: string) => void; error?: string }) {
  const id = `payroll-bootstrap-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  return <div><DatePickerField id={id} label={label} value={parsePayrollDate(value)} onChange={(date) => onChange(formatPayrollDate(date))} placeholder="Select date" required ariaInvalid={Boolean(error)} ariaDescribedBy={error ? `${id}-error` : undefined} />{error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-[#8b2d2d]">{error}</p>}</div>;
}

function addressSearchValue(address: CheckAddress): string {
  return [address.line1, address.line2, address.city, address.state, address.postalCode].filter(Boolean).join(", ");
}

function AddressFields({ label, value, onChange, searchValue, onSearchChange, autocompleteId, autocompleteLabel, autocompletePlaceholder, idPrefix, firstRef, error }: { label: string; value: CheckAddress; onChange: (value: CheckAddress) => void; searchValue: string; onSearchChange: (value: string) => void; autocompleteId: string; autocompleteLabel: string; autocompletePlaceholder: string; idPrefix: string; firstRef?: React.RefObject<HTMLInputElement | null>; error?: string }) {
  const { toast } = useToast();
  return <fieldset className="rounded-2xl border border-[#dce8e8] bg-[#f7fbfb] p-4"><legend className="px-1 text-sm font-semibold text-[#10141a]">{label}</legend><div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><AddressAutocompleteField label={autocompleteLabel} id={autocompleteId} value={searchValue} onChange={onSearchChange} placeholder={autocompletePlaceholder} onSelectDetails={(details) => { if (details.countryCode?.toUpperCase() !== "US") { onSearchChange(addressSearchValue(value)); toast({ title: "Choose a U.S. address", description: "Payroll setup supports U.S. addresses.", variant: "destructive" }); return; } onChange({ line1: details.line1, line2: details.line2 ?? "", city: details.city, state: (details.stateCode || details.state).toUpperCase(), postalCode: details.zipCode, country: "US" }); }} />{error && <p role="alert" className="mt-1 text-xs text-[#8b2d2d]">{error}</p>}</div><Field label="Street address" id={`${idPrefix}-street-address`} value={value.line1} inputRef={firstRef} error={error} onChange={(line1) => onChange({ ...value, line1 })} /><Field label="City" id={`${idPrefix}-city`} value={value.city} error={error} onChange={(city) => onChange({ ...value, city })} /><Field label="State abbreviation" id={`${idPrefix}-state`} value={value.state} error={error} onChange={(state) => onChange({ ...value, state: state.toUpperCase() })} /><Field label="ZIP code" id={`${idPrefix}-zip-code`} value={value.postalCode} error={error} onChange={(postalCode) => onChange({ ...value, postalCode })} /></div></fieldset>;
}

export default function AgencyPayrollBootstrapModal({ open, values, missingFieldCodes, isSubmitting = false, submissionError = null, submissionFieldCodes = [], onOpenChange, onSubmit }: Props) {
  const [form, setForm] = useState<CheckPayrollProfileFormValues>(() => formValues(values));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [legalAddressSearch, setLegalAddressSearch] = useState("");
  const [officeAddressSearch, setOfficeAddressSearch] = useState("");
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const firstSelectRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const allFieldCodes = useMemo(() => [...new Set([...missingFieldCodes, ...submissionFieldCodes])].filter(isRequiredFieldCode), [missingFieldCodes, submissionFieldCodes]);
  const groups = useMemo(() => new Set(allFieldCodes.filter((code) => !AGENCY_PAYROLL_REQUIRED_FIELD_MAP[code].fixed).map((code) => AGENCY_PAYROLL_REQUIRED_FIELD_MAP[code].group)), [allFieldCodes]);
  const firstGroup = GROUP_ORDER.find((group) => groups.has(group));
  const validationErrors = useMemo(() => validateAgencyPayrollBootstrapForm(form, allFieldCodes), [form, allFieldCodes]);
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  useEffect(() => {
    if (open && !wasOpen.current) {
      setForm(formValues(values));
      setError(null);
      setFieldErrors({});
      setLegalAddressSearch(addressSearchValue(values.legalAddress ?? emptyAddress()));
      setOfficeAddressSearch(addressSearchValue(values.officeWorkplace?.address ?? emptyAddress()));
      requestAnimationFrame(() => (firstFieldRef.current ?? firstSelectRef.current)?.focus());
    }
    wasOpen.current = open;
  }, [open, values]);
  useEffect(() => {
    if (!submissionFieldCodes.length) return;
    const submissionErrors = Object.fromEntries(submissionFieldCodes
      .filter(isRequiredFieldCode)
      .filter((code) => !AGENCY_PAYROLL_REQUIRED_FIELD_MAP[code].fixed)
      .map((code) => [AGENCY_PAYROLL_REQUIRED_FIELD_MAP[code].target, "This required payroll field is missing."]));
    setFieldErrors((current) => ({ ...current, ...submissionErrors }));
  }, [submissionFieldCodes]);

  const update = <K extends keyof CheckPayrollProfileFormValues>(key: K, value: CheckPayrollProfileFormValues[K]) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (Object.keys(validationErrors).length) { setFieldErrors(validationErrors); setError("Review the highlighted payroll details."); return; }
    setError(null);
    setFieldErrors({});
    try {
      await onSubmit(buildCheckPayrollProfilePayload(form));
    } catch {
      // The parent owns the request error message; retain the user's form values for retry.
    }
  };

  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!isSubmitting) onOpenChange(nextOpen); }}>
    <DialogContent showCloseButton={false} className="flex max-h-[90vh] w-[min(94vw,760px)] flex-col overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.3)] bg-white p-0 backdrop-blur">
      <DialogHeader className="flex shrink-0 flex-row items-start justify-between gap-4 border-b border-[#e2e8e8] px-5 py-4 text-left sm:px-6">
        <div className="min-w-0 space-y-1"><DialogTitle className="text-[20px] font-medium leading-[1.35] text-[#10141a]">Complete payroll setup</DialogTitle><DialogDescription className="text-sm leading-5 text-[#5d626b]">We prefilled the agency details on file. Complete only the required payroll information below.</DialogDescription></div>
        <button type="button" aria-label="Close payroll setup" disabled={isSubmitting} onClick={() => onOpenChange(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(255,255,255,0.3)] bg-[#eff2f3] text-[#10141a] transition-colors hover:bg-[#e0e3e4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8]/30 disabled:cursor-not-allowed disabled:opacity-50"><X className="h-4 w-4" aria-hidden="true" /></button>
      </DialogHeader>
      <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col overflow-hidden"><div tabIndex={0} role="region" aria-label="Payroll setup form" className="min-h-0 flex-1 overflow-y-auto px-5 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00b4b8]/30 sm:px-6"><fieldset disabled={isSubmitting} className="space-y-5 disabled:opacity-70">
        {groups.has("identity") && <Field label="Legal business name" value={form.legalName} inputRef={firstGroup === "identity" ? firstFieldRef : undefined} error={fieldErrors.legalName} onChange={(legalName) => update("legalName", legalName)} />}
        {groups.has("ein") && <Field label="Employer Identification Number (EIN)" ein value={form.ein} error={fieldErrors.ein} inputRef={firstGroup === "ein" ? firstFieldRef : undefined} helperText="Enter your nine-digit federal tax ID. For security, we won’t display it again after you save." onChange={(ein) => update("ein", ein)} />}
        {groups.has("business") && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><EnumField label="Business structure" value={form.entityType} options={CHECK_ENTITY_TYPES} inputRef={firstGroup === "business" ? firstSelectRef : undefined} error={fieldErrors.entityType} onChange={(entityType) => update("entityType", entityType)} /><EnumField label="Industry" value={form.industry} options={CHECK_INDUSTRIES} error={fieldErrors.industry} onChange={(industry) => update("industry", industry)} /></div>}
        {groups.has("legalAddress") && <AddressFields label="Legal business address" value={form.legalAddress ?? emptyAddress()} searchValue={legalAddressSearch} onSearchChange={setLegalAddressSearch} autocompleteId="payroll-bootstrap-legal-business-address-search" autocompleteLabel="Find legal business address" autocompletePlaceholder="Find legal business address" idPrefix="payroll-bootstrap-legal-business-address" firstRef={firstGroup === "legalAddress" ? firstFieldRef : undefined} error={fieldErrors.legalAddress} onChange={(legalAddress) => update("legalAddress", legalAddress)} />}
        {groups.has("workplace") && <><Field label="Primary workplace name" value={form.officeName} inputRef={firstGroup === "workplace" ? firstFieldRef : undefined} error={fieldErrors.officeName} onChange={(officeName) => update("officeName", officeName)} /><AddressFields label="Primary workplace address" value={form.officeAddress ?? emptyAddress()} searchValue={officeAddressSearch} onSearchChange={setOfficeAddressSearch} autocompleteId="payroll-bootstrap-primary-workplace-address-search" autocompleteLabel="Find primary workplace address" autocompletePlaceholder="Find primary workplace address" idPrefix="payroll-bootstrap-primary-workplace-address" error={fieldErrors.officeAddress} onChange={(officeAddress) => update("officeAddress", officeAddress)} /><div><label className="flex min-h-11 items-center gap-2 text-sm text-[#10141a]"><input type="checkbox" aria-invalid={Boolean(fieldErrors.actualWorkLocationAttested)} aria-describedby={fieldErrors.actualWorkLocationAttested ? "payroll-bootstrap-workplace-attestation-error" : undefined} checked={form.actualWorkLocationAttested === true} onChange={(event) => update("actualWorkLocationAttested", event.target.checked)} /> I confirm employees physically work at this location.</label>{fieldErrors.actualWorkLocationAttested && <p id="payroll-bootstrap-workplace-attestation-error" role="alert" className="mt-1 text-xs text-[#8b2d2d]">{fieldErrors.actualWorkLocationAttested}</p>}</div></>}
        {groups.has("contact") && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Company website" value={form.website} inputRef={firstGroup === "contact" ? firstFieldRef : undefined} error={fieldErrors.website} onChange={(website) => update("website", website)} /><Field label="Company phone number" value={form.phone} error={fieldErrors.phone} onChange={(phone) => update("phone", phone)} /></div>}
        {groups.has("payrollContact") && <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Field label="Payroll contact’s full name" value={form.payrollContactName} inputRef={firstGroup === "payrollContact" ? firstFieldRef : undefined} error={fieldErrors.payrollContactName} onChange={(payrollContactName) => update("payrollContactName", payrollContactName)} /><Field label="Payroll contact’s email address" value={form.payrollContactEmail} type="email" error={fieldErrors.payrollContactEmail} onChange={(payrollContactEmail) => update("payrollContactEmail", payrollContactEmail)} /><Field label="Payroll contact’s phone number" value={form.payrollContactPhone} type="tel" error={fieldErrors.payrollContactPhone} onChange={(payrollContactPhone) => update("payrollContactPhone", payrollContactPhone)} /></div>}
        {groups.has("schedule") && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><EnumField label="How often employees are paid" placeholder="Select pay frequency" value={form.payFrequency} options={CHECK_PAY_FREQUENCIES} inputRef={firstGroup === "schedule" ? firstSelectRef : undefined} error={fieldErrors.payFrequency} onChange={(payFrequency) => setForm((current) => ({ ...current, payFrequency, secondPayday: payFrequency === "semimonthly" ? current.secondPayday : "" }))} /><PayrollDateField label="First scheduled payday" value={form.firstPayday} error={fieldErrors.firstPayday} onChange={(firstPayday) => update("firstPayday", firstPayday)} />{form.payFrequency === "semimonthly" && <PayrollDateField label="Second scheduled payday" value={form.secondPayday} error={fieldErrors.secondPayday} onChange={(secondPayday) => update("secondPayday", secondPayday)} />}<PayrollDateField label="First pay period end date" value={form.firstPeriodEnd} error={fieldErrors.firstPeriodEnd} onChange={(firstPeriodEnd) => update("firstPeriodEnd", firstPeriodEnd)} /><PayrollDateField label="Payroll tracking start date" value={form.payrollStartDate} error={fieldErrors.payrollStartDate} onChange={(payrollStartDate) => update("payrollStartDate", payrollStartDate)} /></div>}
        {groups.has("workers") && <Field label="Estimated number of W-2 employees" value={form.expectedW2Workers} type="number" inputRef={firstGroup === "workers" ? firstFieldRef : undefined} error={fieldErrors.expectedW2Workers} helperText="Include employees you expect to pay through payroll. Do not include independent contractors." onChange={(expectedW2Workers) => update("expectedW2Workers", expectedW2Workers)} />}
        {(error || submissionError) && <p role="alert" className="text-sm text-[#8b2d2d]">{error ?? submissionError}</p>}</fieldset></div>
        <DialogFooter className="shrink-0 border-t border-[#e2e8e8] bg-[#fbfcfc] px-5 py-4 sm:px-6"><div className="space-y-3">{hasValidationErrors && <p id="payroll-bootstrap-validation-help" className="text-xs text-[#5d626b]">Complete all required fields with valid information to continue.</p>}<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={isSubmitting} className="min-h-11 rounded-[10px] border border-[#b2b2b3] px-4 text-sm font-semibold text-[#353535] transition-colors hover:bg-[#f2f4f4] disabled:cursor-not-allowed disabled:opacity-60" onClick={() => onOpenChange(false)}>Cancel</button><button type="submit" disabled={isSubmitting || hasValidationErrors} aria-busy={isSubmitting} aria-describedby={hasValidationErrors ? "payroll-bootstrap-validation-help" : undefined} className="inline-flex min-h-11 min-w-full items-center justify-center rounded-[10px] bg-[#006f73] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#005f63] disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[14rem]">{isSubmitting ? <span role="status" className="inline-flex items-center gap-2"><Loader2 data-testid="agency-payroll-modal-create-spinner" aria-hidden="true" className="h-4 w-4 shrink-0 motion-safe:animate-spin" />Creating payroll setup…</span> : "Create payroll setup"}</button></div></div></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
