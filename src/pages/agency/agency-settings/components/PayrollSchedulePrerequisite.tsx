import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, CircleHelp, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLazyGetAgencyPayrollScheduleQuery } from "@/features/payroll/api/agencyPayrollEndpoints";
import { localIsoDate, validatePaySchedule } from "@/features/payroll/forms/companySetupValidation";
import type { AgencyPayrollSetupProjection, PayrollScope } from "@/features/payroll/model/types";
import { CHECK_PAY_FREQUENCIES, type PayScheduleFormValues } from "@/lib/agency/agency-profile-payload";
import { DatePickerField, FieldLabel } from "@/pages/shared/client-management/components/forms/formControls";

export type PayrollSchedulePrerequisiteCommand =
  | { command: "create_pay_schedule"; schedule: PayScheduleFormValues }
  | { command: "correct_pay_schedule"; selectedFirstPayday: string };

type Props = {
  scope: PayrollScope;
  projection: AgencyPayrollSetupProjection;
  disabled: boolean;
  correctionPending?: boolean;
  correctionError?: string | null;
  onCommand: (command: PayrollSchedulePrerequisiteCommand) => Promise<unknown> | unknown;
  onReviewOptions?: () => Promise<boolean>;
};

const INCOMPATIBLE_DEADLINE = "Check's approval deadline must be after payroll period close.";
const unavailableOptionsReview = async () => false;
const fieldClass = "mt-1 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm aria-invalid:border-[#d53411] aria-invalid:ring-1 aria-invalid:ring-[#d53411] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8]";
const emptySchedule = (frequency: PayScheduleFormValues["frequency"]): PayScheduleFormValues => ({ frequency, payrollStartDate: "", firstPeriodEnd: "", firstPayday: "", secondPayday: "" });
const titleFrequency = (value: string | null) => value ? value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()) : "Schedule";
const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : "Date unavailable";
const shortDateLabel = (value: string | null) => value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : "unavailable";
const deadlineLabel = (value: string | null, timeZone: string | null) => {
  if (!value) return "Unavailable";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return dateLabel(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: timeZone ?? "UTC", timeZoneName: "short",
  }).format(new Date(value));
};

const scheduleDateFields = [
  {
    field: "payrollStartDate",
    label: "Payroll tracking start date",
    tooltip: "The first date CareOnBoard includes approved work and reimbursements in payroll.",
  },
  {
    field: "firstPeriodEnd",
    label: "First pay period end date",
    tooltip: "The last work date included in the first payroll period. It must be on or after the tracking start date.",
  },
  {
    field: "firstPayday",
    label: "First scheduled payday",
    tooltip: "The banking day employees receive the first payroll through Check. It must be after the period end.",
  },
] as const;

function parseScheduleDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    ? date
    : undefined;
}

function formatScheduleDate(date: Date | undefined): string {
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} role="alert" className="mt-1 text-xs text-[#8b2d2d]">{message}</p> : null;
}

function ScheduleDateField({ field, label, tooltip, value, update, error }: {
  field: "payrollStartDate" | "firstPeriodEnd" | "firstPayday" | "secondPayday";
  label: string;
  tooltip: string;
  value: string;
  update: (value: string) => void;
  error?: string;
}) {
  const id = `schedule-${field}`;
  return <div><div className="flex items-center gap-1.5"><FieldLabel htmlFor={id} required>{label}</FieldLabel><Tooltip><TooltipTrigger asChild><button type="button" aria-label={`About ${label.toLowerCase()}`} className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[#5d626b] hover:text-[#006f73] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8]/30"><CircleHelp aria-hidden="true" className="h-3.5 w-3.5" /></button></TooltipTrigger><TooltipContent side="top" sideOffset={6} className="max-w-72 border border-[#dce8e8] bg-white leading-relaxed text-[#10141a] shadow-lg [&>span]:hidden">{tooltip}</TooltipContent></Tooltip></div><DatePickerField id={id} value={parseScheduleDate(value)} onChange={(date) => update(formatScheduleDate(date))} placeholder="Select date" required ariaInvalid={Boolean(error)} ariaDescribedBy={error ? `${id}-error` : undefined} /><FieldError id={`${id}-error`} message={error} /></div>;
}

export default function PayrollSchedulePrerequisite({ scope, projection, disabled, correctionPending = false, correctionError = null, onCommand, onReviewOptions = unavailableOptionsReview }: Props) {
  const prerequisite = projection.schedulePrerequisite;
  const [expanded, setExpanded] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedPayday, setSelectedPayday] = useState("");
  const [form, setForm] = useState<PayScheduleFormValues>(() => emptySchedule(prerequisite.frequency ?? ""));
  const [showErrors, setShowErrors] = useState(false);
  const [validationToday, setValidationToday] = useState(localIsoDate);
  const [busy, setBusy] = useState(false);
  const handledCorrectionError = useRef<string | null>(null);
  const [loadSchedule, scheduleQuery] = useLazyGetAgencyPayrollScheduleQuery();
  const validationErrors = useMemo(() => validatePaySchedule(form, validationToday), [form, validationToday]);
  const scheduleData = scheduleQuery.data;
  const showSetupForm = prerequisite.state === "setup_required"
    || (prerequisite.state === "needs_attention" && prerequisite.recoveryAction === "create_pay_schedule");

  useEffect(() => {
    if (disabled || !expanded || prerequisite.state !== "complete"
      || (scheduleData?.view === "details" && scheduleData.projectionRevision === projection.projectionRevision)) return;
    void loadSchedule({ ...scope, projectionRevision: projection.projectionRevision, view: "details" }, true);
  }, [disabled, expanded, loadSchedule, prerequisite.state, projection.projectionRevision, scheduleData, scope]);

  useEffect(() => {
    if (!showOptions || prerequisite.state !== "needs_attention"
      || prerequisite.recoveryAction !== "correct_pay_schedule"
      || (scheduleData?.view === "options" && scheduleData.projectionRevision === projection.projectionRevision)) return;
    void loadSchedule({ ...scope, projectionRevision: projection.projectionRevision, view: "options" }, true);
  }, [loadSchedule, prerequisite.recoveryAction, prerequisite.state, projection.projectionRevision, scheduleData, scope, showOptions]);

  useEffect(() => { setSelectedPayday(""); }, [projection.projectionRevision]);

  useEffect(() => {
    if (!correctionError) {
      handledCorrectionError.current = null;
      return;
    }
    if (!showOptions || handledCorrectionError.current === correctionError) return;
    handledCorrectionError.current = correctionError;
    setSelectedPayday("");
    void loadSchedule({ ...scope, projectionRevision: projection.projectionRevision, view: "options" }, false);
  }, [correctionError, loadSchedule, projection.projectionRevision, scope, showOptions]);

  useEffect(() => {
    if (prerequisite.state === "needs_attention" && prerequisite.recoveryAction === "create_pay_schedule") {
      setForm({
        frequency: prerequisite.frequency ?? "",
        payrollStartDate: prerequisite.payrollStartDate ?? "",
        firstPeriodEnd: prerequisite.firstPeriodEnd ?? "",
        firstPayday: prerequisite.firstPayday ?? "",
        secondPayday: prerequisite.secondPayday ?? "",
      });
      return;
    }
    if (prerequisite.state === "setup_required" && prerequisite.frequency) {
      setForm((current) => current.frequency ? current : { ...current, frequency: prerequisite.frequency! });
    }
  }, [prerequisite.firstPayday, prerequisite.firstPeriodEnd, prerequisite.frequency, prerequisite.payrollStartDate, prerequisite.recoveryAction, prerequisite.secondPayday, prerequisite.state]);

  const update = <K extends keyof PayScheduleFormValues>(key: K, value: PayScheduleFormValues[K]) => setForm((current) => ({ ...current, [key]: value }));
  const run = async (command: PayrollSchedulePrerequisiteCommand) => {
    setBusy(true);
    try { await onCommand(command); } finally { setBusy(false); }
  };
  const submitSchedule = (event: React.FormEvent) => {
    event.preventDefault();
    const today = localIsoDate();
    const freshErrors = validatePaySchedule(form, today);
    setValidationToday(today);
    setShowErrors(true);
    if (Object.keys(freshErrors).length) return;
    void run({ command: "create_pay_schedule", schedule: form });
  };
  const reviewOptions = async () => {
    setBusy(true);
    try {
      if (await onReviewOptions()) setShowOptions(true);
    } finally {
      setBusy(false);
    }
  };

  const incompatibleDetails = prerequisite.compatibilityCode === "approval_deadline_incompatible"
    ? `${INCOMPATIBLE_DEADLINE} Current period end ${dateLabel(prerequisite.firstPeriodEnd)}; Check approval deadline ${deadlineLabel(prerequisite.nextApprovalDeadline, prerequisite.timeZone)}.`
    : prerequisite.compatibilityMessage;

  return <section role="region" aria-label="Payroll schedule prerequisite" className="mt-5 border-t border-[#dce8e8] pt-5">
    {prerequisite.state === "waiting_for_company" ? <div role="status"><h4 className="text-sm font-semibold text-[#10141a]">Waiting for company connection</h4><p className="mt-1 text-sm leading-6 text-[#5d626b]">Your payroll schedule can be created after Check finishes connecting the company.</p></div> : null}

    {showSetupForm ? <div>
      <h4 className="text-sm font-semibold text-[#10141a]">{prerequisite.state === "needs_attention" ? "Payroll schedule needs attention" : "Set up payroll schedule"}</h4>
      {prerequisite.state === "needs_attention" ? <p role="alert" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">{incompatibleDetails}</p> : <p className="mt-1 text-sm leading-6 text-[#5d626b]">Confirm the first payroll period and paydays before payroll can begin.</p>}
      <form className="mt-4" onSubmit={submitSchedule} noValidate><fieldset disabled={disabled || busy} className="grid grid-cols-1 gap-4 sm:grid-cols-2 disabled:opacity-60">
        <div><label htmlFor="schedule-frequency" className="text-sm font-medium text-[#10141a]">Pay frequency</label><select id="schedule-frequency" value={form.frequency} aria-invalid={showErrors && Boolean(validationErrors.frequency)} aria-describedby={showErrors && validationErrors.frequency ? "schedule-frequency-error" : undefined} onChange={(event) => update("frequency", event.target.value as PayScheduleFormValues["frequency"])} className={fieldClass}><option value="">Select pay frequency</option>{CHECK_PAY_FREQUENCIES.map((frequency) => <option key={frequency} value={frequency}>{frequency.replaceAll("_", " ")}</option>)}</select><FieldError id="schedule-frequency-error" message={showErrors ? validationErrors.frequency : undefined} /></div>
        {scheduleDateFields.map(({ field, label, tooltip }) => <ScheduleDateField key={field} field={field} label={label} tooltip={tooltip} value={form[field]} update={(value) => update(field, value)} error={showErrors ? validationErrors[field] : undefined} />)}
        {form.frequency === "semimonthly" ? <ScheduleDateField field="secondPayday" label="Second scheduled payday" tooltip="For semimonthly payroll, the banking day employees receive the second payroll. It must follow the first payday and be within one calendar month." value={form.secondPayday} update={(value) => update("secondPayday", value)} error={showErrors ? validationErrors.secondPayday : undefined} /> : null}
        <div className="sm:col-span-2"><button type="submit" disabled={disabled || busy} aria-busy={busy} className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#006f73] px-4 text-sm font-semibold text-white hover:bg-[#005b5e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2 disabled:opacity-60 sm:w-auto">{busy ? <span role="status" className="inline-flex items-center gap-2"><Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />Creating payroll schedule…</span> : "Create payroll schedule"}</button></div>
      </fieldset></form>
    </div> : null}

    {prerequisite.state === "needs_attention" && prerequisite.recoveryAction === "correct_pay_schedule" ? <div>
      <h4 className="text-sm font-semibold text-[#10141a]">Payroll schedule needs attention</h4>
      <p role="alert" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">{incompatibleDetails}</p>
      <button type="button" disabled={disabled || busy} aria-busy={busy} onClick={() => void reviewOptions()} className="mt-3 min-h-11 rounded-md border border-[#b8dfe0] px-4 text-sm font-semibold text-[#006f73] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2 disabled:opacity-60">{busy ? "Refreshing compatible paydays…" : "Review compatible paydays"}</button>
      {showOptions ? <div className="mt-4">
        {scheduleQuery.isFetching ? <p role="status" className="flex min-h-11 items-center gap-2 text-sm text-[#5d626b]"><Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />Loading compatible paydays…</p> : null}
        {scheduleQuery.error ? <div><p role="alert" className="text-sm text-[#8b2d2d]">Compatible paydays could not be loaded.</p><button type="button" disabled={disabled || busy || scheduleQuery.isFetching} onClick={() => void loadSchedule({ ...scope, projectionRevision: projection.projectionRevision, view: "options" }, false)} className="mt-2 min-h-11 rounded-md border border-[#b8dfe0] px-4 text-sm font-semibold text-[#006f73] disabled:opacity-60">Try loading compatible paydays again</button></div> : null}
        {!scheduleQuery.isFetching && !scheduleQuery.error && scheduleData?.view === "options" && scheduleData.projectionRevision === projection.projectionRevision ? <fieldset>
          <div className="rounded-lg border border-[#dce8e8] bg-[#f8fbfb] p-3 text-sm text-[#3f4650]"><p className="font-semibold text-[#10141a]">Current schedule</p><p className="mt-1">{titleFrequency(scheduleData.current.frequency)} · Tracking starts {dateLabel(scheduleData.current.payrollStartDate)} · Period ends {dateLabel(scheduleData.current.firstPeriodEnd)} · Payday {dateLabel(scheduleData.current.firstPayday)}</p></div>
          <legend className="mt-4 text-sm font-semibold text-[#10141a]">Choose a compatible payday</legend>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#5d626b]">
            <li>This updates the existing linked Check schedule; it does not create a second schedule.</li>
            <li>Future inactive payroll period jobs regenerate.</li>
            <li>Existing payroll runs remain unchanged.</li>
            <li>Filing authorization may be required if the company start-date month changes.</li>
          </ul>
          {scheduleData.choices.length === 0 ? <p role="status" aria-label="No compatible paydays" className="mt-3 rounded-lg border border-[#dce8e8] bg-[#f8fbfb] p-3 text-sm leading-6 text-[#5d626b]">Check did not return a payday with an approval deadline after {dateLabel(scheduleData.current.firstPeriodEnd)}. Retry after Check updates the payday calendar.</p> : <div className="mt-2 divide-y divide-[#edf0f1] border-y border-[#edf0f1]">{scheduleData.choices.map((choice) => choice.firstPayday ? <label key={choice.firstPayday} className="flex min-h-14 cursor-pointer items-center gap-3 py-3"><input type="radio" name="payroll-schedule-choice" value={choice.firstPayday} checked={selectedPayday === choice.firstPayday} onChange={() => setSelectedPayday(choice.firstPayday!)} /><span className="min-w-0"><span className="block text-base font-semibold text-[#10141a]">{dateLabel(choice.firstPayday)}{choice.recommended ? " · Recommended" : ""}</span><span className="block text-xs text-[#5d626b]">Approval deadline: {deadlineLabel(choice.approvalDeadline, prerequisite.timeZone)}</span></span></label> : null)}</div>}
          <button type="button" disabled={disabled || busy || correctionPending || !selectedPayday} aria-busy={correctionPending} onClick={() => void run({ command: "correct_pay_schedule", selectedFirstPayday: selectedPayday })} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#006f73] px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto">{correctionPending ? <span className="inline-flex items-center gap-2"><Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />Applying payroll schedule correction…</span> : "Confirm payroll schedule correction"}</button>
          {correctionError ? <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-[#8b2d2d]">{correctionError}</p> : null}
        </fieldset> : null}
      </div> : null}
    </div> : null}

    {prerequisite.state === "complete" ? <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div role="status"><h4 className="text-sm font-semibold text-[#10141a]">Payroll schedule ready</h4><p className="mt-1 text-sm text-[#5d626b]">{titleFrequency(prerequisite.frequency)} · Active · Next period {shortDateLabel(prerequisite.nextPeriodStart)}–{shortDateLabel(prerequisite.nextPeriodEnd)} · Payday {shortDateLabel(prerequisite.nextPayday)}</p></div>{!disabled ? <button type="button" aria-expanded={expanded} aria-controls="payroll-schedule-periods" onClick={() => setExpanded((current) => !current)} className="inline-flex min-h-11 items-center gap-2 self-start rounded-md px-2 text-sm font-semibold text-[#006f73]">View upcoming payroll dates<ChevronDown aria-hidden="true" className={`h-4 w-4 ${expanded ? "rotate-180" : ""}`} /></button> : null}</div>
      {expanded && !disabled ? <div id="payroll-schedule-periods" className="mt-4">
        {scheduleQuery.isFetching ? <p role="status" className="flex min-h-11 items-center gap-2 text-sm text-[#5d626b]"><Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />Loading upcoming payroll dates…</p> : null}
        {scheduleQuery.error ? <p role="alert" className="text-sm text-[#8b2d2d]">Upcoming payroll dates could not be loaded. Collapse and try again.</p> : null}
        {scheduleData?.view === "details" && scheduleData.projectionRevision === projection.projectionRevision ? <>
          <dl className="mb-4 grid gap-3 rounded-lg border border-[#dce8e8] bg-[#f8fbfb] p-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-[#6b7280]">Frequency</dt><dd className="font-semibold text-[#10141a]">{titleFrequency(scheduleData.current.frequency)}</dd></div><div><dt className="text-xs text-[#6b7280]">Status</dt><dd className="font-semibold text-[#10141a]">Active</dd></div><div><dt className="text-xs text-[#6b7280]">Payroll tracking start</dt><dd className="font-semibold text-[#10141a]">{dateLabel(scheduleData.current.payrollStartDate)}</dd></div><div><dt className="text-xs text-[#6b7280]">Schedule check</dt><dd className="font-semibold text-[#10141a]">Compatible</dd></div><div className="sm:col-span-2"><dt className="text-xs text-[#6b7280]">Last reconciled</dt><dd className="font-semibold text-[#10141a]">{deadlineLabel(prerequisite.lastReconciledAt, prerequisite.timeZone)}</dd></div></dl>
          <ol className="divide-y divide-[#edf0f1] border-y border-[#edf0f1]">{scheduleData.periods.map((period, index) => <li key={`${period.periodStart}-${period.payday}-${index}`} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center"><div><p className="text-xs uppercase tracking-wide text-[#6b7280]">Payday</p><p className="font-semibold text-[#10141a]">{dateLabel(period.payday)}</p></div><div className="sm:text-right"><p className="text-xs text-[#5d626b]">Approval deadline: {deadlineLabel(period.approvalDeadline, prerequisite.timeZone)}</p><p className="mt-1 text-xs text-[#6b7280]">Period {dateLabel(period.periodStart)} – {dateLabel(period.periodEnd)}</p></div></li>)}</ol>
        </> : null}
      </div> : null}
    </div> : null}
  </section>;
}
