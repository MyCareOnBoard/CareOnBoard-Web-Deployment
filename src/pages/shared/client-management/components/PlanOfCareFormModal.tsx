import React, { lazy, Suspense, useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { Download, FileCheck2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { AddClientFormData } from "../types/formData";
import {
  POC_TASKS,
  createEmptyPlanOfCareForm,
  buildPlanOfCareFileName,
  type PlanOfCareFormData,
  type PocSignatureType,
} from "../types/planOfCare";
import { generateFormPdfBlob } from "../utils/generateFormPdfBlob";
import { downloadPocPdfFromBlob } from "../utils/generatePocPdf";
import { attachImportFileToDoc } from "../utils/attachImportFileToDoc";
import PlanOfCarePrintTemplate from "./PlanOfCarePrintTemplate";
import {
  CheckTile,
  DatePickerField,
  FieldLabel,
  FormSection,
  LineInput,
  SegmentedToggle,
  SignatureField,
} from "./forms/formControls";
import { normalizeSignaturePayload } from "@/pages/agency/billing/claims/utils/claimReportSignatureUtils";

const DigitalSignatureModal = lazy(
  () => import("@/pages/applicant/application/components/DigitalSignature"),
);

function clientNameFromWizard(fd: AddClientFormData): string {
  return [fd.stage1.firstName, fd.stage1.middleName, fd.stage1.lastName]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

export default function PlanOfCareFormModal({
  open,
  onOpenChange,
  formData,
  setFormData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
}) {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const [poc, setPoc] = useState<PlanOfCareFormData>(() =>
    createEmptyPlanOfCareForm(),
  );
  const [busy, setBusy] = useState<null | "download" | "apply">(null);
  const [signatureTarget, setSignatureTarget] = useState<"rn" | "clientRep" | null>(null);
  const [signatureModalEverOpened, setSignatureModalEverOpened] = useState(false);

  // The off-screen print template only needs to be current at export time. Defer it
  // so typing in the form doesn't reconcile the heavy paper template on every keystroke.
  const deferredPoc = useDeferredValue(poc);

  // Prefill empty identity fields from the wizard each time the modal opens,
  // without clobbering anything the user already typed.
  useEffect(() => {
    if (!open) return;
    const fd = formDataRef.current;
    setPoc((prev) => ({
      ...prev,
      clientName: prev.clientName || clientNameFromWizard(fd),
      medicalNursingDx: prev.medicalNursingDx || (fd.stage3.diagnosis ?? ""),
      allergies: prev.allergies || (fd.stage3.allergies ?? []).join(", "),
    }));
  }, [open]);

  const setField = useCallback(
    <K extends keyof PlanOfCareFormData>(key: K, value: PlanOfCareFormData[K]) =>
      setPoc((prev) => ({ ...prev, [key]: value })),
    [],
  );
  const setTaskFrequency = useCallback(
    (id: string, frequency: string) =>
      setPoc((prev) => ({
        ...prev,
        tasks: { ...prev.tasks, [id]: { ...prev.tasks[id], frequency } },
      })),
    [],
  );
  const toggleTaskOption = useCallback(
    (id: string, key: string, next: boolean) =>
      setPoc((prev) => ({
        ...prev,
        tasks: {
          ...prev.tasks,
          [id]: {
            ...prev.tasks[id],
            options: { ...prev.tasks[id].options, [key]: next },
          },
        },
      })),
    [],
  );
  const setGroupField = useCallback(
    <G extends "shortTermGoals" | "longTermGoals" | "dischargePlan">(
      group: G,
      patch: Partial<PlanOfCareFormData[G]>,
    ) => setPoc((prev) => ({ ...prev, [group]: { ...prev[group], ...patch } })),
    [],
  );

  const generate = useCallback(
    async (mode: "download" | "apply") => {
      if (!printRef.current) return;
      // Downloading a blank form to fill by hand is fine; only require a client
      // name when attaching it to the client's record.
      if (mode === "apply" && !poc.clientName.trim()) {
        toast({
          title: "Client name required",
          description: "Add the client's name before saving the Plan of Care to the client.",
          variant: "destructive",
        });
        return;
      }
      setBusy(mode);
      try {
        const blob = await generateFormPdfBlob(printRef.current);
        const fileName = buildPlanOfCareFileName(poc.clientName);
        if (mode === "download") {
          downloadPocPdfFromBlob(blob, fileName);
          toast({
            title: "Plan of Care downloaded",
            description: fileName,
            variant: "success",
          });
        } else {
          const file = new File([blob], fileName, { type: "application/pdf" });
          setFormData((prev) => attachImportFileToDoc(prev, "poc", file));
          toast({
            title: "Saved to client",
            description: "Attached as the Plan of Care (POC) document in step 3.",
            variant: "success",
          });
          onOpenChange(false);
        }
      } catch {
        toast({
          title: "Couldn't generate the PDF",
          description: "Please try again.",
          variant: "destructive",
        });
      } finally {
        setBusy(null);
      }
    },
    [poc.clientName, setFormData, toast, onOpenChange],
  );

  const advChecks: Array<{
    key: "advanceDirectiveCopyObtained" | "advanceDirectiveInfoGiven" | "advanceDirectiveInfoRefused";
    label: string;
  }> = [
    { key: "advanceDirectiveCopyObtained", label: "Copy Obtained" },
    { key: "advanceDirectiveInfoGiven", label: "Info Given" },
    { key: "advanceDirectiveInfoRefused", label: "Info Refused" },
  ];

  const openSignature = useCallback((target: "rn" | "clientRep") => {
    setSignatureModalEverOpened(true);
    setSignatureTarget(target);
  }, []);

  const handleSignatureSave = useCallback(
    async (payload: { signatureType: string; signatureData: string }) => {
      const sigType = payload.signatureType as PocSignatureType;
      const normalized = await normalizeSignaturePayload({
        signatureType: sigType,
        signatureData: payload.signatureData,
      });
      setPoc((prev) => ({
        ...prev,
        ...(signatureTarget === "rn"
          ? { rnSignature: normalized.signatureData, rnSignatureType: sigType }
          : { clientRepSignature: normalized.signatureData, clientRepSignatureType: sigType }),
      }));
      setSignatureTarget(null);
    },
    [signatureTarget],
  );

  // Interacting with the signature modal must not close the Plan of Care dialog.
  const blockCloseWhileSigning = useCallback((event: Event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("[data-signature-modal]")) {
      event.preventDefault();
    }
  }, []);

  return (
    <>
      <Dialog
        open={open}
        modal={signatureTarget === null}
        onOpenChange={(value) => {
          // Keep open while the signature sub-modal is up, and don't allow closing
          // mid-export (an in-flight "apply" would otherwise still attach the PDF).
          if (!value && (signatureTarget !== null || busy)) return;
          onOpenChange(value);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[94vh] w-[min(98vw,960px)] flex-col overflow-hidden p-0"
          onPointerDownOutside={blockCloseWhileSigning}
          onInteractOutside={blockCloseWhileSigning}
        >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#e6e7e8] px-5 py-4">
          <div className="min-w-0 text-left">
            <DialogTitle className="text-lg font-semibold leading-snug text-[#10141a]">
              Plan of Care / Personal Care Services
            </DialogTitle>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Fill in on site, then download as a PDF or attach it as the client's Plan of Care.
            </p>
          </div>
          <DialogClose
            aria-label="Close"
            className="-mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#5c6368] transition-colors hover:bg-[#e6e7e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8]/40"
          >
            <X className="h-5 w-5" aria-hidden />
          </DialogClose>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="space-y-5 bg-white">
            {/* Header / client details */}
            <FormSection title="Client details">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <FieldLabel htmlFor="poc-client-name">Client Name</FieldLabel>
                  <LineInput
                    id="poc-client-name"
                    value={poc.clientName}
                    onChange={(e) => setField("clientName", e.target.value)}
                    placeholder="Client full name"
                  />
                </div>
                <DatePickerField
                  id="poc-initial-date"
                  label="Date of Initial Plan of Care"
                  value={poc.dateOfInitialPoc}
                  onChange={(d) => setField("dateOfInitialPoc", d)}
                />
                <DatePickerField
                  id="poc-start-care"
                  label="Start of Care"
                  value={poc.startOfCare}
                  onChange={(d) => setField("startOfCare", d)}
                />
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor="poc-dx">Medical / Nursing DX</FieldLabel>
                  <LineInput
                    id="poc-dx"
                    value={poc.medicalNursingDx}
                    onChange={(e) => setField("medicalNursingDx", e.target.value)}
                    placeholder="Diagnosis"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor="poc-allergies">Allergies</FieldLabel>
                  <LineInput
                    id="poc-allergies"
                    value={poc.allergies}
                    onChange={(e) => setField("allergies", e.target.value)}
                    placeholder="Known allergies"
                  />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <FieldLabel htmlFor="poc-days-hours">Days / Hours of Service</FieldLabel>
                  <LineInput
                    id="poc-days-hours"
                    value={poc.daysHoursOfService}
                    onChange={(e) => setField("daysHoursOfService", e.target.value)}
                    placeholder="e.g. Mon–Fri, 9am–1pm"
                  />
                </div>
              </div>

              <div className="mt-4 border-t border-[#ececed] pt-4">
                <p className="mb-2 text-[13px] font-semibold text-[#10141a]">
                  Does the client have an Advance Directive?
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <SegmentedToggle
                    ariaLabel="Advance directive"
                    value={poc.advanceDirective}
                    options={[
                      { value: "no", label: "No" },
                      { value: "yes", label: "Yes" },
                    ]}
                    onChange={(v) => setField("advanceDirective", v)}
                  />
                  {advChecks.map((c) => (
                    <CheckTile
                      key={c.key}
                      label={c.label}
                      checked={poc[c.key]}
                      onChange={(next) => setField(c.key, next)}
                    />
                  ))}
                </div>
              </div>
            </FormSection>

            {/* Tasks */}
            <FormSection title="Tasks to be performed by CHHA">
              <div className="space-y-3">
                {POC_TASKS.map((task) => {
                  const state = poc.tasks[task.id];
                  return (
                    <div
                      key={task.id}
                      className="rounded-[10px] border border-[#ececed] p-3"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="mb-2 text-[13px] font-semibold text-[#10141a]">
                            {task.label}
                          </p>
                          {task.options.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {task.options.map((opt) => (
                                <CheckTile
                                  key={opt.key}
                                  label={opt.label}
                                  checked={!!state?.options[opt.key]}
                                  onChange={(next) =>
                                    toggleTaskOption(task.id, opt.key, next)
                                  }
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col gap-1 lg:w-56">
                          <FieldLabel htmlFor={`poc-freq-${task.id}`}>Frequency</FieldLabel>
                          <LineInput
                            id={`poc-freq-${task.id}`}
                            value={state?.frequency ?? ""}
                            onChange={(e) => setTaskFrequency(task.id, e.target.value)}
                            placeholder="e.g. Daily, 3x/week"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </FormSection>

            {/* Goals */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <FormSection title="Short term goals">
                <div className="flex flex-col gap-2">
                  <CheckTile
                    label="Personal Care needs will be met"
                    checked={poc.shortTermGoals.personalCareMet}
                    onChange={(v) => setGroupField("shortTermGoals", { personalCareMet: v })}
                  />
                  <CheckTile
                    label="Client will remain free from injury"
                    checked={poc.shortTermGoals.freeFromInjury}
                    onChange={(v) => setGroupField("shortTermGoals", { freeFromInjury: v })}
                  />
                  <LineInput
                    value={poc.shortTermGoals.other}
                    onChange={(e) => setGroupField("shortTermGoals", { other: e.target.value })}
                    placeholder="Other"
                  />
                </div>
              </FormSection>

              <FormSection title="Long term goals">
                <div className="flex flex-col gap-2">
                  <CheckTile
                    label="Client will reach maximum level of independence"
                    checked={poc.longTermGoals.maxIndependence}
                    onChange={(v) => setGroupField("longTermGoals", { maxIndependence: v })}
                  />
                  <CheckTile
                    label="Client will be maintained in a safe environment"
                    checked={poc.longTermGoals.safeEnvironment}
                    onChange={(v) => setGroupField("longTermGoals", { safeEnvironment: v })}
                  />
                  <LineInput
                    value={poc.longTermGoals.other}
                    onChange={(e) => setGroupField("longTermGoals", { other: e.target.value })}
                    placeholder="Other"
                  />
                </div>
              </FormSection>

              <FormSection title="Discharge plan / goals">
                <div className="flex flex-col gap-2">
                  <CheckTile
                    label="Adequate level of functioning in the home"
                    checked={poc.dischargePlan.adequateFunctioning}
                    onChange={(v) => setGroupField("dischargePlan", { adequateFunctioning: v })}
                  />
                  <CheckTile
                    label="Independent management of care"
                    checked={poc.dischargePlan.independentManagement}
                    onChange={(v) => setGroupField("dischargePlan", { independentManagement: v })}
                  />
                  <LineInput
                    value={poc.dischargePlan.other}
                    onChange={(e) => setGroupField("dischargePlan", { other: e.target.value })}
                    placeholder="Other"
                  />
                </div>
              </FormSection>
            </div>

            <FormSection title="Changes in client status to be reported to RN">
              <div className="flex flex-col gap-3">
                {[0, 1].map((i) => (
                  <LineInput
                    key={i}
                    value={poc.changesToReportToRn[i]}
                    onChange={(e) =>
                      setPoc((p) => {
                        const next: [string, string] = [...p.changesToReportToRn];
                        next[i] = e.target.value;
                        return { ...p, changesToReportToRn: next };
                      })
                    }
                    placeholder={`${i + 1}.`}
                  />
                ))}
              </div>
            </FormSection>

            {/* Signatures */}
            <FormSection title="Review &amp; signatures">
              <p className="mb-4 text-[12px] italic leading-relaxed text-[#5c6368]">
                This Plan of Care was developed by the RN with client/family input. It will be
                reviewed at least every 30 days to determine its appropriateness to the needs of
                the client. The Plan of Care is maintained in the office and a copy at the patient's
                residence and available to client, family, and pertinent agency health care
                providers as needed.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor="poc-rn-name">RN Name (print)</FieldLabel>
                  <LineInput
                    id="poc-rn-name"
                    value={poc.rnName}
                    onChange={(e) => setField("rnName", e.target.value)}
                  />
                </div>
                <DatePickerField
                  id="poc-rn-date"
                  label="RN Date"
                  value={poc.rnDate}
                  onChange={(d) => setField("rnDate", d)}
                />
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <FieldLabel>RN Signature</FieldLabel>
                  <SignatureField
                    value={poc.rnSignature}
                    onOpen={() => openSignature("rn")}
                    onClear={() => setField("rnSignature", "")}
                    ariaLabel="RN signature"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor="poc-rep-name">Client / Rep Name (print)</FieldLabel>
                  <LineInput
                    id="poc-rep-name"
                    value={poc.clientRepName}
                    onChange={(e) => setField("clientRepName", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor="poc-rep-rel">Relationship</FieldLabel>
                  <LineInput
                    id="poc-rep-rel"
                    value={poc.clientRepRelationship}
                    onChange={(e) => setField("clientRepRelationship", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <FieldLabel>Client / Rep Signature</FieldLabel>
                  <SignatureField
                    value={poc.clientRepSignature}
                    onOpen={() => openSignature("clientRep")}
                    onClear={() => setField("clientRepSignature", "")}
                    ariaLabel="Client or representative signature"
                  />
                </div>
                <DatePickerField
                  id="poc-rep-date"
                  label="Client / Rep Date"
                  value={poc.clientRepDate}
                  onChange={(d) => setField("clientRepDate", d)}
                />
              </div>
            </FormSection>
          </div>
        </div>

        {/* Off-screen paper-faithful template snapshotted for the PDF export. */}
        <div aria-hidden className="pointer-events-none fixed left-[-10000px] top-0 w-[800px]">
          <div ref={printRef}>
            <PlanOfCarePrintTemplate poc={deferredPoc} />
          </div>
        </div>

        <DialogFooter className="shrink-0 flex flex-col gap-2 border-t border-[#e6e7e8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="h-11 min-h-[44px] w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={!!busy}
          >
            Cancel
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-[44px] w-full border-[#00b4b8] text-[#00b4b8] hover:bg-[#e6fafa] sm:w-auto"
              onClick={() => void generate("download")}
              disabled={!!busy}
            >
              {busy === "download" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Download className="mr-2 h-4 w-4" aria-hidden />
              )}
              Download PDF
            </Button>
            <Button
              type="button"
              className="h-11 min-h-[44px] w-full shrink-0 bg-[#00b4b8] hover:bg-[#009ea1] sm:w-auto"
              onClick={() => void generate("apply")}
              disabled={!!busy}
            >
              {busy === "apply" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <FileCheck2 className="mr-2 h-4 w-4" aria-hidden />
              )}
              Use as Plan of Care
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      {signatureModalEverOpened ? (
        <Suspense fallback={null}>
          <DigitalSignatureModal
            key={signatureTarget ?? "none"}
            isOpen={signatureTarget !== null}
            setIsOpen={(value) => {
              if (!value) setSignatureTarget(null);
            }}
            skipBackend
            nested
            useCase="plan-of-care"
            onSave={handleSignatureSave}
          />
        </Suspense>
      ) : null}
    </>
  );
}
