import { cloneElement, isValidElement, useCallback, useEffect, useState, type ReactElement, type ReactNode } from "react";
import { Check, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import BillingCornerModalHeader from "@/pages/agency/billing/components/BillingCornerModalHeader";
import {
  BILLING_CHECKBOX_CLASS,
  BILLING_CORNER_MODAL_CLASS,
  BILLING_FIELD_CLASS,
  BILLING_FIELD_LABEL_CLASS,
  BILLING_PRIMARY_BUTTON_CLASS,
  BILLING_SECONDARY_BUTTON_CLASS,
} from "@/pages/agency/billing/components/billingModalStyles";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";
import {
  answerStediEnrollmentTask,
  getStediEnrollment,
  refreshStediEnrollment,
  startStediEnrollment,
  submitStediEnrollmentDrafts,
  type StediEnrollment,
  type StediEnrollmentOverview,
  type StediEnrollmentResult,
  type StediEnrollmentTask,
  type StediEnrollmentTransaction,
} from "@/lib/api/stediEnrollment";
import X12StatusBadge from "../x12-export/X12StatusBadge";
import {
  WIZARD_STEPS,
  formFromOverview,
  formatDate,
  overallStatusInfo,
  taskPrefill,
  toEnrollmentInput,
  transactionStatusBadge,
  validateStep,
  type EnrollmentForm,
} from "./stediEnrollmentUtils";

type StediEnrollmentWizardProps = {
  open: boolean;
  onClose: () => void;
  /** Called after anything that may change the agency's enrollment status. */
  onChanged?: (enrollment: StediEnrollment) => void;
  /** Staff with Claims View only can see the status but not change it. */
  canManage?: boolean;
};

type View = "status" | "wizard";

const STEP_KEYS = WIZARD_STEPS.map((step) => step.key);

function errorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: string; details?: { fieldErrors?: Array<{ path: string; message: string }> } } } })
    ?.response?.data;
  const fields = data?.details?.fieldErrors?.map((item) => `${item.path.replace(/^\//, "")}: ${item.message}`) ?? [];
  if (data?.message) return [data.message, ...fields].join(" ");
  return error instanceof Error && error.message ? error.message : fallback;
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={BILLING_FIELD_LABEL_CLASS}>
        {label}
      </label>
      {/* Point the input at its error or hint so screen readers read it. */}
      {isValidElement(children)
        ? cloneElement(children as ReactElement<{ "aria-describedby"?: string }>, {
            "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
          })
        : children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-[12px] text-[#b42318]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-[12px] text-[#808081]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Stepper({ index }: { index: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Enrollment steps">
      {WIZARD_STEPS.map((step, position) => {
        const done = position < index;
        const current = position === index;
        return (
          <li key={step.key} className="flex min-w-0 flex-1 items-center gap-2" aria-current={current ? "step" : undefined}>
            <span
              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                done || current ? "bg-[#00b4b8] text-white" : "bg-[#f2f4f7] text-[#808081]"
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : position + 1}
            </span>
            <span className={`truncate text-[12px] ${current ? "font-semibold text-[#10141a]" : "text-[#808081]"}`}>
              {step.title}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function TaskCard({
  task,
  medicaidProviderId,
  disabled,
  onSave,
}: {
  task: StediEnrollmentTask;
  medicaidProviderId: string;
  disabled: boolean;
  onSave: (task: StediEnrollmentTask, values: Record<string, string>, completed: boolean) => Promise<void>;
}) {
  const [values, setValues] = useState(() => taskPrefill(task, medicaidProviderId));
  const textFields = task.fields.filter((field) => field.fieldType === "TEXT");
  const needsDocument = task.fields.some((field) => field.fieldType === "DOCUMENT");
  const canComplete = !needsDocument && textFields.every((field) => values[field.key]?.trim());
  const ours = task.responsibleParty === "PROVIDER";

  return (
    <div className="rounded-[12px] border border-[#e5e5e6] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="whitespace-pre-line text-[14px] text-[#10141a]">{task.instructions || "Task from Stedi"}</p>
        <X12StatusBadge
          label={task.isComplete ? "Done" : ours ? "For you" : "Stedi"}
          tone={task.isComplete ? "success" : ours ? "danger" : "neutral"}
        />
      </div>
      {task.links.length ? (
        <ul className="mt-2 space-y-1">
          {task.links.map((link) => (
            <li key={link.url}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-[#00898c] hover:underline"
              >
                {link.label}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {ours && !task.isComplete ? (
        <div className="mt-3 space-y-3">
          {textFields.map((field) => (
            <Field key={field.key} id={`task-${task.id}-${field.key}`} label={field.label}>
              <Input
                id={`task-${task.id}-${field.key}`}
                value={values[field.key] ?? ""}
                disabled={disabled}
                onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
                className={`${BILLING_FIELD_CLASS} w-full`}
              />
            </Field>
          ))}
          {needsDocument ? (
            <p className="text-[12px] text-[#808081]">
              This task needs a document. Upload it in the Stedi portal, or send it to Stedi support.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {textFields.length ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => void onSave(task, values, false)}
                className={`${BILLING_SECONDARY_BUTTON_CLASS} h-[44px] px-4 text-[14px]`}
              >
                Save answers
              </button>
            ) : null}
            {!needsDocument ? (
              <button
                type="button"
                disabled={disabled || !canComplete}
                onClick={() => void onSave(task, values, true)}
                className={`${BILLING_PRIMARY_BUTTON_CLASS} h-[44px] px-4 text-[14px]`}
              >
                Mark as done
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TransactionCard({
  transaction,
  medicaidProviderId,
  busy,
  canManage,
  onSaveTask,
}: {
  transaction: StediEnrollmentTransaction;
  medicaidProviderId: string;
  busy: boolean;
  canManage: boolean;
  onSaveTask: (task: StediEnrollmentTask, values: Record<string, string>, completed: boolean) => Promise<void>;
}) {
  const badge = transactionStatusBadge(transaction.status);
  const tasks = [...transaction.tasks].sort((a, b) => a.rank - b.rank);
  return (
    <section className="rounded-[16px] border border-[#e5e5e6] p-4" aria-label={transaction.label}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-[15px] font-semibold text-[#10141a]">{transaction.label}</h4>
          <p className="text-[12px] text-[#808081]">
            Replaces NJ form {transaction.njForm}
            {transaction.submittedAt ? ` · Submitted ${formatDate(transaction.submittedAt)}` : ""}
            {transaction.lastEraReceivedAt ? ` · Last ERA ${formatDate(transaction.lastEraReceivedAt)}` : ""}
          </p>
        </div>
        <X12StatusBadge label={badge.label} tone={badge.tone} />
      </div>
      {transaction.reason ? (
        <p className="mt-3 rounded-[10px] bg-[#fffaeb] px-3 py-2 text-[13px] text-[#7a4a06]">{transaction.reason}</p>
      ) : null}
      {transaction.error ? (
        <p role="alert" className="mt-3 rounded-[10px] bg-[#fef3f2] px-3 py-2 text-[13px] text-[#b42318]">
          {transaction.error.message}
        </p>
      ) : null}
      {tasks.length ? (
        <div className="mt-3 space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              medicaidProviderId={medicaidProviderId}
              disabled={busy || !canManage}
              onSave={onSaveTask}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

/**
 * Modal wizard that enrolls the agency with NJ Medicaid through Stedi (837P
 * claims and 835 ERAs), then shows the enrollment's status and Stedi's tasks.
 * Self-contained so any page can open it.
 */
export default function StediEnrollmentWizard({ open, onClose, onChanged, canManage = true }: StediEnrollmentWizardProps) {
  const { agencyId } = useOperationalAgency();
  const [overview, setOverview] = useState<StediEnrollmentOverview | null>(null);
  const [form, setForm] = useState<EnrollmentForm | null>(null);
  const [view, setView] = useState<View>("wizard");
  const [stepIndex, setStepIndex] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [busy, setBusy] = useState<"" | "draft" | "submit" | "refresh" | "task">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open || !agencyId) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    setError("");
    setNotice("");
    getStediEnrollment({ context: { agencyId }, refresh: true, signal: controller.signal })
      .then((loaded) => {
        if (controller.signal.aborted) return;
        setOverview(loaded);
        setForm(formFromOverview(loaded));
        setView(loaded.enrollment.status === "not_started" ? "wizard" : "status");
        setStepIndex(0);
        setFieldErrors({});
      })
      .catch((loadFailure: unknown) => {
        if (!controller.signal.aborted) setLoadError(errorMessage(loadFailure, "Couldn't load the Stedi enrollment."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [agencyId, open, loadAttempt]);

  const applyResult = useCallback(
    (result: StediEnrollmentResult) => {
      setOverview((prev) => (prev ? { ...prev, enrollment: result.enrollment } : prev));
      onChanged?.(result.enrollment);
    },
    [onChanged],
  );

  const step = WIZARD_STEPS[stepIndex];
  const savedTaxIdLast4 = overview?.defaults.taxIdLast4 || overview?.enrollment.provider?.taxIdLast4 || "";

  const update = <K extends keyof EnrollmentForm>(key: K, value: EnrollmentForm[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setFieldErrors((prev) => {
      if (!prev[key as string]) return prev;
      const { [key as string]: _cleared, ...rest } = prev;
      return rest;
    });
  };
  const updateContact = (key: keyof EnrollmentForm["contact"], value: string) => {
    setForm((prev) => (prev ? { ...prev, contact: { ...prev.contact, [key]: value } } : prev));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const { [key]: _cleared, ...rest } = prev;
      return rest;
    });
  };

  const goNext = () => {
    if (!form) return;
    const errors = validateStep(step.key, form, savedTaxIdLast4);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setStepIndex((index) => Math.min(index + 1, STEP_KEYS.length - 1));
  };

  const goBack = () => {
    setFieldErrors({});
    setError("");
    setStepIndex((index) => Math.max(index - 1, 0));
  };

  const save = async (submit: boolean) => {
    if (!form || !agencyId) return;
    // Every step again, in case an earlier one was skipped by going back and editing.
    for (const [index, key] of STEP_KEYS.entries()) {
      const errors = validateStep(key, form, savedTaxIdLast4);
      if (Object.keys(errors).length) {
        setStepIndex(index);
        setFieldErrors(errors);
        return;
      }
    }
    setBusy(submit ? "submit" : "draft");
    setError("");
    try {
      const result = await startStediEnrollment({ context: { agencyId }, enrollment: toEnrollmentInput(form, submit) });
      applyResult(result);
      setView("status");
      setForm((prev) => (prev ? { ...prev, taxId: "" } : prev));
      if (result.failed?.length) setNotice("Some enrollments could not be created. See the details below.");
      else setNotice(submit ? "Sent to Stedi. You'll get status emails at the notification address." : "Saved as a draft. Nothing was sent to NJ Medicaid.");
    } catch (saveError) {
      setError(errorMessage(saveError, "Couldn't save the enrollment."));
    } finally {
      setBusy("");
    }
  };

  const submitDrafts = async () => {
    if (!agencyId) return;
    setBusy("submit");
    setError("");
    setNotice("");
    try {
      const result = await submitStediEnrollmentDrafts({ context: { agencyId } });
      applyResult(result);
      setNotice(result.failed?.length ? "Some drafts could not be submitted. See the details below." : "Sent to Stedi.");
    } catch (submitError) {
      setError(errorMessage(submitError, "Couldn't submit the enrollment."));
    } finally {
      setBusy("");
    }
  };

  const refresh = async () => {
    if (!agencyId) return;
    setBusy("refresh");
    setError("");
    setNotice("");
    try {
      applyResult(await refreshStediEnrollment({ context: { agencyId } }));
    } catch (refreshError) {
      setError(errorMessage(refreshError, "Couldn't refresh the enrollment."));
    } finally {
      setBusy("");
    }
  };

  const saveTask = async (task: StediEnrollmentTask, values: Record<string, string>, completed: boolean) => {
    if (!agencyId) return;
    setBusy("task");
    setError("");
    setNotice("");
    try {
      const answers = Object.entries(values)
        .filter(([, text]) => text.trim())
        .map(([key, text]) => ({ key, text: text.trim() }));
      applyResult(await answerStediEnrollmentTask({ context: { agencyId }, taskId: task.id, values: answers, completed }));
      setNotice(completed ? "Task marked as done." : "Answers saved.");
    } catch (taskError) {
      setError(errorMessage(taskError, "Couldn't save the task."));
    } finally {
      setBusy("");
    }
  };

  const enrollment = overview?.enrollment;
  const status = enrollment ? overallStatusInfo(enrollment.status) : null;
  const hasDrafts = Boolean(enrollment?.transactions.some((item) => item.status === "DRAFT"));
  const canEnrollAgain = Boolean(
    enrollment?.transactions.some((item) => !item.status || item.status === "DRAFT" || item.status === "REJECTED" || item.status === "CANCELED"),
  );
  const working = busy !== "";
  const disabled = working || !canManage || !overview?.configured;

  const description =
    view === "wizard"
      ? "Link your agency to NJ Medicaid through Stedi so your 837P claims are accepted and 835 payment files come back. This replaces NJ forms EDI-201 and EDI-801."
      : "Where your NJ Medicaid enrollment through Stedi stands.";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !working && onClose()}>
      <DialogContent showCloseButton={false} className={`${BILLING_CORNER_MODAL_CLASS} flex max-h-[90dvh] flex-col`}>
        <BillingCornerModalHeader title="Stedi enrollment" description={description} onClose={onClose} closeDisabled={working} />

        <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-2 pt-6">
          {loading ? (
            <p className="flex items-center gap-2 text-[14px] text-[#808081]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
            </p>
          ) : null}

          {loadError ? (
            <div role="alert" className="space-y-3 rounded-[12px] bg-[#fef3f2] p-4 text-[14px] text-[#b42318]">
              <p>{loadError}</p>
              <button type="button" onClick={() => setLoadAttempt((n) => n + 1)} className={`${BILLING_SECONDARY_BUTTON_CLASS} h-[40px] px-4 text-[14px]`}>
                Try again
              </button>
            </div>
          ) : null}

          {overview && !overview.configured ? (
            <p className="rounded-[12px] bg-[#fffaeb] p-4 text-[14px] text-[#7a4a06]">
              Stedi isn't connected on the server yet, so enrollments can't be sent. Ask your CareOnboard admin to add the Stedi API key.
            </p>
          ) : null}
          {overview && !canManage ? (
            <p className="text-[13px] text-[#808081]">You can view this enrollment. Claims Management access is needed to change it.</p>
          ) : null}

          {notice ? <p role="status" className="rounded-[12px] bg-[#ecfdf3] p-3 text-[14px] text-[#027a48]">{notice}</p> : null}
          {error ? <p role="alert" className="rounded-[12px] bg-[#fef3f2] p-3 text-[14px] text-[#b42318]">{error}</p> : null}

          {!loading && overview && form && view === "wizard" ? (
            <>
              <Stepper index={stepIndex} />

              {step.key === "agency" ? (
                <div className="space-y-4">
                  <Field id="stedi-providerName" label="Legal name" error={fieldErrors.providerName} hint="As NJ Medicaid has it on file.">
                    <Input
                      id="stedi-providerName"
                      value={form.providerName}
                      disabled={disabled}
                      aria-invalid={Boolean(fieldErrors.providerName)}
                      onChange={(event) => update("providerName", event.target.value)}
                      className={`${BILLING_FIELD_CLASS} w-full`}
                    />
                  </Field>
                  <Field id="stedi-npi" label="NPI" error={fieldErrors.npi}>
                    <Input
                      id="stedi-npi"
                      inputMode="numeric"
                      value={form.npi}
                      disabled={disabled}
                      aria-invalid={Boolean(fieldErrors.npi)}
                      onChange={(event) => update("npi", event.target.value.replace(/\D/g, "").slice(0, 10))}
                      className={`${BILLING_FIELD_CLASS} w-full`}
                    />
                  </Field>
                  <Field
                    id="stedi-taxId"
                    label="EIN"
                    error={fieldErrors.taxId}
                    hint={savedTaxIdLast4 ? `Leave blank to use the saved EIN ending in ${savedTaxIdLast4}.` : "No EIN is saved yet. Enter it here."}
                  >
                    <Input
                      id="stedi-taxId"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder={savedTaxIdLast4 ? `•••••${savedTaxIdLast4}` : "12-3456789"}
                      value={form.taxId}
                      disabled={disabled}
                      aria-invalid={Boolean(fieldErrors.taxId)}
                      onChange={(event) => update("taxId", event.target.value.replace(/[^\d-]/g, "").slice(0, 10))}
                      className={`${BILLING_FIELD_CLASS} w-full`}
                    />
                  </Field>
                  <Field id="stedi-medicaid" label="NJ Medicaid provider ID" error={fieldErrors.medicaidProviderId}>
                    <Input
                      id="stedi-medicaid"
                      value={form.medicaidProviderId}
                      disabled={disabled}
                      aria-invalid={Boolean(fieldErrors.medicaidProviderId)}
                      onChange={(event) => update("medicaidProviderId", event.target.value)}
                      className={`${BILLING_FIELD_CLASS} w-full`}
                    />
                  </Field>
                </div>
              ) : null}

              {step.key === "contact" ? (
                <div className="space-y-4">
                  <p className="text-[13px] text-[#808081]">
                    NJ Medicaid sends enrollment questions here. The name and address should match their records exactly.
                  </p>
                  <Field id="stedi-organizationName" label="Organization name" error={fieldErrors.organizationName}>
                    <Input id="stedi-organizationName" value={form.contact.organizationName} disabled={disabled}
                      aria-invalid={Boolean(fieldErrors.organizationName)}
                      onChange={(event) => updateContact("organizationName", event.target.value)} className={`${BILLING_FIELD_CLASS} w-full`} />
                  </Field>
                  <Field id="stedi-street1" label="Street address" error={fieldErrors.streetAddress1}>
                    <Input id="stedi-street1" value={form.contact.streetAddress1} disabled={disabled}
                      aria-invalid={Boolean(fieldErrors.streetAddress1)}
                      onChange={(event) => updateContact("streetAddress1", event.target.value)} className={`${BILLING_FIELD_CLASS} w-full`} />
                  </Field>
                  <Field id="stedi-street2" label="Suite or unit (optional)">
                    <Input id="stedi-street2" value={form.contact.streetAddress2} disabled={disabled}
                      onChange={(event) => updateContact("streetAddress2", event.target.value)} className={`${BILLING_FIELD_CLASS} w-full`} />
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_88px_132px]">
                    <Field id="stedi-city" label="City" error={fieldErrors.city}>
                      <Input id="stedi-city" value={form.contact.city} disabled={disabled}
                        aria-invalid={Boolean(fieldErrors.city)}
                        onChange={(event) => updateContact("city", event.target.value)} className={`${BILLING_FIELD_CLASS} w-full`} />
                    </Field>
                    <Field id="stedi-state" label="State" error={fieldErrors.state}>
                      <Input id="stedi-state" maxLength={2} value={form.contact.state} disabled={disabled}
                        aria-invalid={Boolean(fieldErrors.state)}
                        onChange={(event) => updateContact("state", event.target.value.toUpperCase())} className={`${BILLING_FIELD_CLASS} w-full`} />
                    </Field>
                    <Field id="stedi-zip" label="ZIP" error={fieldErrors.zipCode}>
                      <Input id="stedi-zip" inputMode="numeric" value={form.contact.zipCode} disabled={disabled}
                        aria-invalid={Boolean(fieldErrors.zipCode)}
                        onChange={(event) => updateContact("zipCode", event.target.value)} className={`${BILLING_FIELD_CLASS} w-full`} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field id="stedi-email" label="Contact email" error={fieldErrors.email}>
                      <Input id="stedi-email" type="email" value={form.contact.email} disabled={disabled}
                        aria-invalid={Boolean(fieldErrors.email)}
                        onChange={(event) => updateContact("email", event.target.value)} className={`${BILLING_FIELD_CLASS} w-full`} />
                    </Field>
                    <Field id="stedi-phone" label="Contact phone" error={fieldErrors.phone}>
                      <Input id="stedi-phone" type="tel" value={form.contact.phone} disabled={disabled}
                        aria-invalid={Boolean(fieldErrors.phone)}
                        onChange={(event) => updateContact("phone", event.target.value)} className={`${BILLING_FIELD_CLASS} w-full`} />
                    </Field>
                  </div>
                  <Field id="stedi-userEmail" label="Send status updates to" error={fieldErrors.userEmail}
                    hint="Stedi emails this address when the enrollment moves forward or needs something.">
                    <Input id="stedi-userEmail" type="email" value={form.userEmail} disabled={disabled}
                      aria-invalid={Boolean(fieldErrors.userEmail)}
                      onChange={(event) => update("userEmail", event.target.value)} className={`${BILLING_FIELD_CLASS} w-full`} />
                  </Field>
                </div>
              ) : null}

              {step.key === "transactions" ? (
                <div className="space-y-4">
                  <fieldset className="space-y-3">
                    <legend className={BILLING_FIELD_LABEL_CLASS}>Enroll for</legend>
                    {overview.transactionTypes.map((type) => (
                      <div key={type.key} className="rounded-[12px] border border-[#e5e5e6] p-3">
                        <Checkbox
                          id={`stedi-tx-${type.key}`}
                          checked={form.transactions.includes(type.key)}
                          disabled={disabled}
                          className={BILLING_CHECKBOX_CLASS}
                          label={`${type.label} (replaces NJ ${type.njForm})`}
                          labelClassName="text-[14px] text-[#10141a]"
                          onChange={(event) =>
                            update(
                              "transactions",
                              event.target.checked
                                ? overview.transactionTypes.map((t) => t.key).filter((key) => key === type.key || form.transactions.includes(key))
                                : form.transactions.filter((key) => key !== type.key),
                            )
                          }
                        />
                      </div>
                    ))}
                    {fieldErrors.transactions ? <p className="text-[12px] text-[#b42318]">{fieldErrors.transactions}</p> : null}
                  </fieldset>
                  <Field id="stedi-payerId" label="Payer" error={fieldErrors.payerId}
                    hint={`Stedi payer ID. ${overview.payer.name} is ${overview.payer.id}.`}>
                    <Input id="stedi-payerId" value={form.payerId} disabled={disabled}
                      aria-invalid={Boolean(fieldErrors.payerId)}
                      onChange={(event) => update("payerId", event.target.value)} className={`${BILLING_FIELD_CLASS} w-full`} />
                  </Field>
                </div>
              ) : null}

              {step.key === "review" ? (
                <div className="space-y-4 text-[14px] text-[#10141a]">
                  <dl className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-2">
                    <dt className="text-[#808081]">Agency</dt>
                    <dd>{form.providerName}</dd>
                    <dt className="text-[#808081]">NPI</dt>
                    <dd>{form.npi}</dd>
                    <dt className="text-[#808081]">EIN</dt>
                    <dd>{form.taxId ? `ending in ${form.taxId.replace(/\D/g, "").slice(-4)}` : `saved, ending in ${savedTaxIdLast4}`}</dd>
                    <dt className="text-[#808081]">NJ Medicaid ID</dt>
                    <dd>{form.medicaidProviderId}</dd>
                    <dt className="text-[#808081]">Contact</dt>
                    <dd>
                      {form.contact.organizationName}, {form.contact.streetAddress1}
                      {form.contact.streetAddress2 ? `, ${form.contact.streetAddress2}` : ""}, {form.contact.city}, {form.contact.state}{" "}
                      {form.contact.zipCode}
                      <br />
                      {form.contact.email} · {form.contact.phone}
                    </dd>
                    <dt className="text-[#808081]">Updates to</dt>
                    <dd>{form.userEmail}</dd>
                    <dt className="text-[#808081]">Enrolling</dt>
                    <dd>
                      {overview.transactionTypes.filter((type) => form.transactions.includes(type.key)).map((type) => type.label).join(", ")} with
                      payer {form.payerId}
                    </dd>
                  </dl>
                  <p className="rounded-[12px] bg-[#f2f4f7] p-3 text-[13px] text-[#344054]">
                    <strong>Save as draft</strong> keeps it in Stedi without sending anything. <strong>Submit to Stedi</strong> starts the
                    enrollment with NJ Medicaid; it usually takes a few weeks and can only be canceled through Stedi support.
                  </p>
                </div>
              ) : null}
            </>
          ) : null}

          {!loading && overview && enrollment && view === "status" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {status ? <X12StatusBadge label={status.label} tone={status.tone} /> : null}
                  {enrollment.lastSyncedAt ? (
                    <span className="text-[12px] text-[#808081]">Checked {new Date(enrollment.lastSyncedAt).toLocaleString()}</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  disabled={working || !overview.configured}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-[14px] font-medium text-[#00898c] hover:bg-[#eef4f5] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${busy === "refresh" ? "animate-spin" : ""}`} aria-hidden />
                  Refresh
                </button>
              </div>
              {status ? <p className="text-[14px] text-[#344054]">{status.banner}</p> : null}
              {enrollment.provider ? (
                <p className="text-[13px] text-[#808081]">
                  {enrollment.provider.name} · NPI {enrollment.provider.npi} · NJ Medicaid ID {enrollment.provider.medicaidProviderId} · payer{" "}
                  {enrollment.payerId}
                </p>
              ) : null}
              {enrollment.transactions.map((transaction) => (
                <TransactionCard
                  key={transaction.key}
                  transaction={transaction}
                  medicaidProviderId={enrollment.provider?.medicaidProviderId || form?.medicaidProviderId || ""}
                  busy={working}
                  canManage={canManage}
                  onSaveTask={saveTask}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-[#e5e5e6] px-6 py-4">
          {view === "wizard" && overview && form && !loading ? (
            <>
              {stepIndex > 0 ? (
                <button type="button" onClick={goBack} disabled={working} className={BILLING_SECONDARY_BUTTON_CLASS}>
                  Back
                </button>
              ) : enrollment && enrollment.status !== "not_started" ? (
                <button type="button" onClick={() => setView("status")} disabled={working} className={BILLING_SECONDARY_BUTTON_CLASS}>
                  Back to status
                </button>
              ) : (
                <button type="button" onClick={onClose} disabled={working} className={BILLING_SECONDARY_BUTTON_CLASS}>
                  Cancel
                </button>
              )}
              {step.key !== "review" ? (
                <button type="button" onClick={goNext} disabled={working} className={BILLING_PRIMARY_BUTTON_CLASS}>
                  Next
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => void save(false)} disabled={disabled} className={BILLING_SECONDARY_BUTTON_CLASS}>
                    {busy === "draft" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                    Save as draft
                  </button>
                  <button type="button" onClick={() => void save(true)} disabled={disabled} className={BILLING_PRIMARY_BUTTON_CLASS}>
                    {busy === "submit" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                    Submit to Stedi
                  </button>
                </>
              )}
            </>
          ) : null}
          {view === "status" && overview && !loading ? (
            <>
              {canEnrollAgain && canManage ? (
                <button
                  type="button"
                  onClick={() => {
                    setStepIndex(0);
                    setFieldErrors({});
                    setNotice("");
                    setView("wizard");
                  }}
                  disabled={working}
                  className={BILLING_SECONDARY_BUTTON_CLASS}
                >
                  {hasDrafts ? "Edit draft" : "Enroll again"}
                </button>
              ) : null}
              {hasDrafts && canManage ? (
                <button type="button" onClick={() => void submitDrafts()} disabled={disabled} className={BILLING_PRIMARY_BUTTON_CLASS}>
                  {busy === "submit" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                  Submit to Stedi
                </button>
              ) : (
                <button type="button" onClick={onClose} disabled={working} className={BILLING_PRIMARY_BUTTON_CLASS}>
                  Done
                </button>
              )}
            </>
          ) : null}
          {(loadError || loading) && !overview ? (
            <button type="button" onClick={onClose} className={BILLING_SECONDARY_BUTTON_CLASS}>
              Close
            </button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
