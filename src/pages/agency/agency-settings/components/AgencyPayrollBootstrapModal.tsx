import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildCheckPayrollProfilePayload, CHECK_ENTITY_TYPES, CHECK_INDUSTRIES, CHECK_PAY_FREQUENCIES, type CheckAddress, type CheckPayrollProfileFormValues, type CheckPayrollProfileRead, type CheckPayrollProfileWrite } from "@/lib/agency/agency-profile-payload";
import { validateCompanySetup } from "@/features/payroll/forms/companySetupValidation";

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
    proposedSignerFirstName: values.proposedSignerContact?.firstName ?? "",
    proposedSignerLastName: values.proposedSignerContact?.lastName ?? "",
    proposedSignerTitle: values.proposedSignerContact?.title ?? "",
    proposedSignerEmail: values.proposedSignerContact?.email ?? "",
    expectedW2Workers: values.expectedWorkerCounts?.w2 ?? "",
  };
}

export const buildAgencyPayrollBootstrapPayload = (values: CheckPayrollProfileRead) => buildCheckPayrollProfilePayload(formValues(values));

const GROUP_ORDER = ["identity", "ein", "business", "legalAddress", "workplace", "contact", "payrollContact", "schedule", "signer", "workers"] as const;
type FieldGroup = typeof GROUP_ORDER[number];
export const AGENCY_PAYROLL_REQUIRED_FIELD_CODES = [
  "legalName", "ein", "entityType", "industry",
  "legalAddress.line1", "legalAddress.city", "legalAddress.state", "legalAddress.postalCode", "legalAddress.country",
  "officeWorkplace.name", "officeWorkplace.actualWorkLocationAttested",
  "officeWorkplace.address.line1", "officeWorkplace.address.city", "officeWorkplace.address.state", "officeWorkplace.address.postalCode", "officeWorkplace.address.country",
  "website", "phone",
  "payrollContact.name", "payrollContact.email", "payrollContact.phone",
  "proposedSignerContact.firstName", "proposedSignerContact.lastName", "proposedSignerContact.title", "proposedSignerContact.email",
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
  "proposedSignerContact.firstName": { group: "signer", target: "proposedSignerFirstName", satisfied: (f) => present(f.proposedSignerFirstName) },
  "proposedSignerContact.lastName": { group: "signer", target: "proposedSignerLastName", satisfied: (f) => present(f.proposedSignerLastName) },
  "proposedSignerContact.title": { group: "signer", target: "proposedSignerTitle", satisfied: (f) => present(f.proposedSignerTitle) },
  "proposedSignerContact.email": { group: "signer", target: "proposedSignerEmail", satisfied: (f) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.proposedSignerEmail ?? "") },
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

function Field({ label, value, onChange, type = "text", inputRef, readOnly = false, error, ein = false }: { label: string; value: string | number | undefined; onChange: (value: string) => void; type?: string; inputRef?: React.RefObject<HTMLInputElement | null>; readOnly?: boolean; error?: string; ein?: boolean }) {
  const id = `payroll-bootstrap-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  return <div><Label htmlFor={id}>{label}</Label><Input ref={inputRef} id={id} type={type} value={value ?? ""} readOnly={readOnly} autoComplete={ein ? "off" : undefined} inputMode={ein ? "numeric" : undefined} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="mt-1 min-h-11" onChange={(event) => onChange(event.target.value)} />{error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-[#8b2d2d]">{error}</p>}</div>;
}

function EnumField({ label, value, options, onChange, inputRef, error }: { label: string; value: string | undefined; options: readonly string[]; onChange: (value: string) => void; inputRef?: React.RefObject<HTMLButtonElement | null>; error?: string }) {
  const id = `payroll-bootstrap-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  return <div><Label htmlFor={id}>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger ref={inputRef} id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="mt-1 min-h-11"><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select>{error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-[#8b2d2d]">{error}</p>}</div>;
}

function AddressFields({ label, value, onChange, firstRef, error }: { label: string; value: CheckAddress; onChange: (value: CheckAddress) => void; firstRef?: React.RefObject<HTMLInputElement | null>; error?: string }) {
  return <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2"><legend className="text-sm font-medium text-[#10141a] sm:col-span-2">{label}</legend><Field label={`${label} line 1`} value={value.line1} inputRef={firstRef} error={error} onChange={(line1) => onChange({ ...value, line1 })} /><Field label={`${label} city`} value={value.city} error={error} onChange={(city) => onChange({ ...value, city })} /><Field label={`${label} state`} value={value.state} error={error} onChange={(state) => onChange({ ...value, state: state.toUpperCase() })} /><Field label={`${label} postal code`} value={value.postalCode} error={error} onChange={(postalCode) => onChange({ ...value, postalCode })} /></fieldset>;
}

export default function AgencyPayrollBootstrapModal({ open, values, missingFieldCodes, isSubmitting = false, submissionError = null, submissionFieldCodes = [], onOpenChange, onSubmit }: Props) {
  const [form, setForm] = useState<CheckPayrollProfileFormValues>(() => formValues(values));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const firstSelectRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const allFieldCodes = useMemo(() => [...new Set([...missingFieldCodes, ...submissionFieldCodes])].filter(isRequiredFieldCode), [missingFieldCodes, submissionFieldCodes]);
  const groups = useMemo(() => new Set(allFieldCodes.filter((code) => !AGENCY_PAYROLL_REQUIRED_FIELD_MAP[code].fixed).map((code) => AGENCY_PAYROLL_REQUIRED_FIELD_MAP[code].group)), [allFieldCodes]);
  const firstGroup = GROUP_ORDER.find((group) => groups.has(group));

  useEffect(() => {
    if (open && !wasOpen.current) {
      setForm(formValues(values));
      setError(null);
      setFieldErrors({});
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
    const errors = validateAgencyPayrollBootstrapForm(form, allFieldCodes);
    if (Object.keys(errors).length) { setFieldErrors(errors); setError("Review the highlighted payroll details."); return; }
    setError(null);
    setFieldErrors({});
    try {
      await onSubmit(buildCheckPayrollProfilePayload(form));
    } catch {
      // The parent owns the request error message; retain the user's form values for retry.
    }
  };

  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!isSubmitting) onOpenChange(nextOpen); }}>
    <DialogContent showCloseButton={!isSubmitting} className="flex max-h-[90vh] w-[min(94vw,720px)] flex-col gap-4 overflow-y-auto p-6">
      <DialogHeader className="items-start gap-2 text-left"><DialogTitle>Complete payroll setup</DialogTitle><DialogDescription>We prefilled the agency details on file. Complete only the required payroll information below.</DialogDescription></DialogHeader>
      <form onSubmit={(event) => void submit(event)} className="space-y-5"><fieldset disabled={isSubmitting} className="space-y-5 disabled:opacity-70">
        {groups.has("identity") && <Field label="Legal name" value={form.legalName} inputRef={firstGroup === "identity" ? firstFieldRef : undefined} error={fieldErrors.legalName} onChange={(legalName) => update("legalName", legalName)} />}
        {groups.has("ein") && <div><Field label="EIN" ein value={form.ein} error={fieldErrors.ein} inputRef={firstGroup === "ein" ? firstFieldRef : undefined} onChange={(ein) => update("ein", ein)} /><p className="mt-1 text-xs text-[#5d626b]">This value is protected and is never displayed after you save it.</p></div>}
        {groups.has("business") && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><EnumField label="Entity type" value={form.entityType} options={CHECK_ENTITY_TYPES} inputRef={firstGroup === "business" ? firstSelectRef : undefined} error={fieldErrors.entityType} onChange={(entityType) => update("entityType", entityType)} /><EnumField label="Industry" value={form.industry} options={CHECK_INDUSTRIES} error={fieldErrors.industry} onChange={(industry) => update("industry", industry)} /></div>}
        {groups.has("legalAddress") && <AddressFields label="Legal address" value={form.legalAddress ?? emptyAddress()} firstRef={firstGroup === "legalAddress" ? firstFieldRef : undefined} error={fieldErrors.legalAddress} onChange={(legalAddress) => update("legalAddress", legalAddress)} />}
        {groups.has("workplace") && <><Field label="Actual workplace name" value={form.officeName} inputRef={firstGroup === "workplace" ? firstFieldRef : undefined} error={fieldErrors.officeName} onChange={(officeName) => update("officeName", officeName)} /><AddressFields label="Actual workplace address" value={form.officeAddress ?? emptyAddress()} error={fieldErrors.officeAddress} onChange={(officeAddress) => update("officeAddress", officeAddress)} /><div><label className="flex min-h-11 items-center gap-2 text-sm text-[#10141a]"><input type="checkbox" aria-invalid={Boolean(fieldErrors.actualWorkLocationAttested)} aria-describedby={fieldErrors.actualWorkLocationAttested ? "payroll-bootstrap-workplace-attestation-error" : undefined} checked={form.actualWorkLocationAttested === true} onChange={(event) => update("actualWorkLocationAttested", event.target.checked)} /> This is an actual work location.</label>{fieldErrors.actualWorkLocationAttested && <p id="payroll-bootstrap-workplace-attestation-error" role="alert" className="mt-1 text-xs text-[#8b2d2d]">{fieldErrors.actualWorkLocationAttested}</p>}</div></>}
        {groups.has("contact") && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Website" value={form.website} inputRef={firstGroup === "contact" ? firstFieldRef : undefined} error={fieldErrors.website} onChange={(website) => update("website", website)} /><Field label="Phone" value={form.phone} error={fieldErrors.phone} onChange={(phone) => update("phone", phone)} /></div>}
        {groups.has("payrollContact") && <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Field label="Payroll contact name" value={form.payrollContactName} inputRef={firstGroup === "payrollContact" ? firstFieldRef : undefined} error={fieldErrors.payrollContactName} onChange={(payrollContactName) => update("payrollContactName", payrollContactName)} /><Field label="Payroll contact email" value={form.payrollContactEmail} type="email" error={fieldErrors.payrollContactEmail} onChange={(payrollContactEmail) => update("payrollContactEmail", payrollContactEmail)} /><Field label="Payroll contact phone" value={form.payrollContactPhone} type="tel" error={fieldErrors.payrollContactPhone} onChange={(payrollContactPhone) => update("payrollContactPhone", payrollContactPhone)} /></div>}
        {groups.has("schedule") && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><EnumField label="Pay frequency" value={form.payFrequency} options={CHECK_PAY_FREQUENCIES} inputRef={firstGroup === "schedule" ? firstSelectRef : undefined} error={fieldErrors.payFrequency} onChange={(payFrequency) => update("payFrequency", payFrequency)} /><Field label="First payday" type="date" value={form.firstPayday} error={fieldErrors.firstPayday} onChange={(firstPayday) => update("firstPayday", firstPayday)} />{form.payFrequency === "semimonthly" && <Field label="Second payday" type="date" value={form.secondPayday} error={fieldErrors.secondPayday} onChange={(secondPayday) => update("secondPayday", secondPayday)} />}<Field label="First period end" type="date" value={form.firstPeriodEnd} error={fieldErrors.firstPeriodEnd} onChange={(firstPeriodEnd) => update("firstPeriodEnd", firstPeriodEnd)} /><Field label="Local payroll start date" type="date" value={form.payrollStartDate} error={fieldErrors.payrollStartDate} onChange={(payrollStartDate) => update("payrollStartDate", payrollStartDate)} /></div>}
        {groups.has("signer") && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Proposed signer first name" value={form.proposedSignerFirstName} inputRef={firstGroup === "signer" ? firstFieldRef : undefined} error={fieldErrors.proposedSignerFirstName} onChange={(proposedSignerFirstName) => update("proposedSignerFirstName", proposedSignerFirstName)} /><Field label="Proposed signer last name" value={form.proposedSignerLastName} error={fieldErrors.proposedSignerLastName} onChange={(proposedSignerLastName) => update("proposedSignerLastName", proposedSignerLastName)} /><Field label="Proposed signer title" value={form.proposedSignerTitle} error={fieldErrors.proposedSignerTitle} onChange={(proposedSignerTitle) => update("proposedSignerTitle", proposedSignerTitle)} /><Field label="Proposed signer email" value={form.proposedSignerEmail} type="email" error={fieldErrors.proposedSignerEmail} onChange={(proposedSignerEmail) => update("proposedSignerEmail", proposedSignerEmail)} /></div>}
        {groups.has("workers") && <Field label="Expected W-2 workers" value={form.expectedW2Workers} type="number" inputRef={firstGroup === "workers" ? firstFieldRef : undefined} error={fieldErrors.expectedW2Workers} onChange={(expectedW2Workers) => update("expectedW2Workers", expectedW2Workers)} />}
        {(error || submissionError) && <p role="alert" className="text-sm text-[#8b2d2d]">{error ?? submissionError}</p>}</fieldset>
        <DialogFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={isSubmitting} className="min-h-11 rounded-md border border-[#b2b2b3] px-4 text-sm font-semibold text-[#353535] disabled:opacity-60" onClick={() => onOpenChange(false)}>Cancel</button><button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="inline-flex min-h-11 min-w-[14rem] items-center justify-center rounded-md bg-[#006f73] px-4 text-sm font-semibold text-white disabled:opacity-60">{isSubmitting ? <span role="status" className="inline-flex items-center gap-2"><Loader2 data-testid="agency-payroll-modal-create-spinner" aria-hidden="true" className="h-4 w-4 shrink-0 motion-safe:animate-spin" />Creating payroll setup…</span> : "Create payroll setup"}</button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
