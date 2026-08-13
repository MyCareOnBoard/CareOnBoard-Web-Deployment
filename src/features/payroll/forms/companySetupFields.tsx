import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHECK_ENTITY_TYPES, CHECK_INDUSTRIES, CHECK_PAY_FREQUENCIES } from "@/lib/agency/agency-profile-payload";

type Props = { formData: any; onChange: (field: string, value: unknown) => void; fieldsWithErrors?: string[] };
const friendly = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const field = (label: string, id: string, formData: any, onChange: Props["onChange"], type = "text") => <div><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={formData[id] ?? ""} onChange={(event) => onChange(id, event.target.value)} /></div>;
const addressField = (prefix: "payrollLegalAddress" | "payrollOfficeAddress", label: string, formData: any, onChange: Props["onChange"]) => <div className="grid grid-cols-1 gap-3 md:col-span-3 md:grid-cols-4"><p className="md:col-span-4 text-sm font-medium">{label}</p>{(["line1", "city", "state", "postalCode"] as const).map((key) => <div key={key}><Label htmlFor={`${prefix}-${key}`}>{friendly(key)}</Label><Input id={`${prefix}-${key}`} value={formData[prefix]?.[key] ?? ""} onChange={(event) => onChange(prefix, { ...formData[prefix], [key]: event.target.value, country: "US" })} /></div>)}</div>;

/** Payroll prerequisites are optional during agency onboarding; the provider setup flow owns later editing. */
export function CompanySetupFields({ formData, onChange, fieldsWithErrors = [] }: Props) {
  return <fieldset className="mt-10 space-y-5 border-t pt-6"><legend className="text-base font-semibold">Payroll prerequisites</legend>
    <p className="text-sm text-muted-foreground">You can save this information later. Incomplete information is marked as needs information and is not queued for payroll setup.</p>
    {fieldsWithErrors.some((fieldName) => fieldName.startsWith("payroll")) && <p id="payroll-prerequisites-error" role="alert" className="text-sm text-red-600">Review the highlighted payroll prerequisite fields.</p>}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {field("Legal name", "payrollLegalName", formData, onChange)}
      <div><Label htmlFor="payrollEin">EIN</Label><Input id="payrollEin" value={formData.payrollEin ?? ""} autoComplete="off" inputMode="numeric" onChange={(event) => onChange("payrollEin", event.target.value)} placeholder={formData.payrollEinPresent ? "EIN on file" : "12-3456789"} /><p className="mt-1 text-xs text-muted-foreground">Leave blank to preserve the EIN already on file.</p></div>
      <div><Label htmlFor="payrollEntityType">Entity type</Label><Select value={formData.payrollEntityType} onValueChange={(value) => onChange("payrollEntityType", value)}><SelectTrigger id="payrollEntityType"><SelectValue placeholder="Select entity type" /></SelectTrigger><SelectContent>{CHECK_ENTITY_TYPES.map((value) => <SelectItem key={value} value={value}>{friendly(value)}</SelectItem>)}</SelectContent></Select></div>
      <div><Label htmlFor="payrollIndustry">Industry</Label><Select value={formData.payrollIndustry} onValueChange={(value) => onChange("payrollIndustry", value)}><SelectTrigger id="payrollIndustry"><SelectValue placeholder="Select industry" /></SelectTrigger><SelectContent>{CHECK_INDUSTRIES.map((value) => <SelectItem key={value} value={value}>{friendly(value)}</SelectItem>)}</SelectContent></Select></div>
      {addressField("payrollLegalAddress", "Legal address", formData, onChange)}
      {field("Actual workplace name", "payrollOfficeName", formData, onChange)}
      <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={formData.payrollActualWorkLocationAttested} onChange={(event) => onChange("payrollActualWorkLocationAttested", event.target.checked)} /> This is the actual work location.</label>
      {addressField("payrollOfficeAddress", "Actual workplace address", formData, onChange)}
      {field("Payroll contact name", "payrollContactName", formData, onChange)}{field("Payroll contact email", "payrollContactEmail", formData, onChange, "email")}{field("Payroll contact phone", "payrollContactPhone", formData, onChange, "tel")}
      <div><Label htmlFor="payrollFrequency">Pay frequency</Label><Select value={formData.payrollFrequency} onValueChange={(value) => onChange("payrollFrequency", value)}><SelectTrigger id="payrollFrequency"><SelectValue placeholder="Select frequency" /></SelectTrigger><SelectContent>{CHECK_PAY_FREQUENCIES.map((value) => <SelectItem key={value} value={value}>{friendly(value)}</SelectItem>)}</SelectContent></Select></div>
      {field("First payday", "payrollFirstPayday", formData, onChange, "date")}{formData.payrollFrequency === "semimonthly" && field("Second payday", "payrollSecondPayday", formData, onChange, "date")}{field("First period end", "payrollFirstPeriodEnd", formData, onChange, "date")}{field("Local payroll start date", "payrollStartDate", formData, onChange, "date")}{field("Expected W-2 workers", "expectedW2Workers", formData, onChange, "number")}
      {field("Proposed signer first name", "proposedSignerFirstName", formData, onChange)}{field("Proposed signer last name", "proposedSignerLastName", formData, onChange)}{field("Proposed signer title", "proposedSignerTitle", formData, onChange)}{field("Proposed signer email", "proposedSignerEmail", formData, onChange, "email")}
    </div>
    <p className="text-sm text-muted-foreground">Proposed signer details are informational only and do not grant signer authority. Local agency creation is not rolled back if later payroll setup is asynchronous.</p>
  </fieldset>;
}
