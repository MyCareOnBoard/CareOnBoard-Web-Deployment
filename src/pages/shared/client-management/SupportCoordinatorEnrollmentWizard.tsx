import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { format, parseISO } from "date-fns";
import { Eye, EyeOff, Info, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog, ConfirmDialogContent } from "@/components/ui/confirm-dialog";
import { FileUpload } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import MonitoringPolicyFields from "@/components/sc-monitoring/MonitoringPolicyFields";
import { normalizeSignaturePayload } from "@/pages/agency/billing/claims/utils/claimReportSignatureUtils";
import { AddressAutocompleteField } from "./components/forms/AddressAutocompleteField";
import { DatePickerField, SignatureField } from "./components/forms/formControls";
import type { AddressDetails } from "@/hooks/useGooglePlacesAutocomplete";
import { createClient, getAgencyClientById, updateClient, uploadClientDocument, type Client, type ClientDocument, type ClientOutcome, type CreateClientRequest, type ScEnrollment } from "@/lib/api/clients";
import ScImportFromFilePanel, { type ScImportReview } from "./components/ScImportFromFilePanel";
import ScEnrollmentDocumentsStep from "./components/ScEnrollmentDocumentsStep";
import { mergeScExtractionBatch } from "./utils/mergeScExtractionBatch";
import { createScPendingDocument, mergeScPendingDocuments, scPendingDocumentsError, toScClientDocument, type ScPendingDocument } from "./utils/scEnrollmentDocuments";
import { useToast } from "@/hooks/use-toast";
import { useAssignmentReviewScope } from "@/hooks/useAssignmentReview";
import { getAgencyById } from "@/lib/api/agencies";
import { documentReviewTypes, getScMonitoringPolicy, saveScMonitoringPolicy, type MonitoringPolicyResponse } from "@/lib/api/sc-monitoring-policy";
import { createMonitoringDraft, monitoringSettingsEqual, monitoringValidationError, type MonitoringPolicyDraft } from "@/lib/sc-monitoring-policy-draft";
import { useAuth } from "@/utils/auth";
import { Routes } from "@/routes/constants";
import "./support-coordinator-enrollment.css";

const steps = ["Program selection", "Participant information", "Guardian / representative", "Medicaid & eligibility", "Documents", "Monitoring settings", "Enrollment agreement", "Review & sign"] as const;
const documentsStep = 4, monitoringStep = 5, agreementStep = 6, reviewStep = 7;
const DigitalSignatureModal = lazy(() => import("@/pages/applicant/application/components/DigitalSignature"));
const eligibilityItems = [
  { key: "medicaid", title: "Active NJ Medicaid (NJ FamilyCare) eligibility confirmed", detail: "Required for all DDD waiver programs." },
  { key: "functional", title: "DDD functional eligibility determination completed", detail: "Confirm the individual's DDD eligibility determination is on file." },
  { key: "financial", title: "Required financial eligibility met" },
  { key: "njResident", title: "Current New Jersey resident" },
  { key: "documents", title: "Required enrollment documents collected and submitted", detail: "Include the enrollment agreement, rights and responsibilities, HIPAA authorization, and emergency contact forms." },
  { key: "requirements", title: "Additional program requirements reviewed", detail: "Confirm any program-specific requirements before services begin." },
] as const;
type EligibilityKey = typeof eligibilityItems[number]["key"];

const agreementTerms = [
  "Participation in the program is administered by the NJ Division of Developmental Disabilities (DDD) and approved by the Centers for Medicare and Medicaid Services (CMS).",
  "Participation is voluntary. Services are provided by willing providers who meet the State's provider qualifications and are identified in the Individualized Service Plan (ISP).",
  "The participant agrees to follow applicable State policies and procedures for program participation.",
  "Services must meet assessed needs and be authorized in the approved ISP before they are provided.",
  "Approved providers and self-directed employees are paid for authorized services. The participant does not receive direct payment for those services.",
];

type Form = {
  program: "SP" | "CCP" | "";
  firstName: string; middleName: string; lastName: string; dob: string; gender: string; ssn: string;
  periodStartDate: string; periodEndDate: string;
  addressSearch: string; address: string; city: string; county: string; state: string; zip: string; phone: string; email: string; medicaidId: string; dddId: string;
  hasGuardian: boolean; guardianName: string; guardianRelationship: string; guardianPhone: string; guardianEmail: string; guardianAddress: string;
  familyMemberParticipates: boolean; familyMemberName: string; familyMemberRelationship: string;
  outcomes: ClientOutcome[];
  eligibility: Record<EligibilityKey, boolean>; agreementSummaryReviewed: boolean; participantSignature: string; guardianSignature: string; familySignature: string; participantSignatureImage: string; guardianSignatureImage: string; familySignatureImage: string; signedOn: string;
};

const initialForm: Form = {
  program: "", firstName: "", middleName: "", lastName: "", dob: "", gender: "", ssn: "",
  periodStartDate: "", periodEndDate: "",
  addressSearch: "", address: "", city: "", county: "", state: "", zip: "", phone: "", email: "", medicaidId: "", dddId: "",
  hasGuardian: false, guardianName: "", guardianRelationship: "", guardianPhone: "", guardianEmail: "", guardianAddress: "",
  familyMemberParticipates: false, familyMemberName: "", familyMemberRelationship: "",
  outcomes: [],
  eligibility: { medicaid: false, functional: false, financial: false, njResident: false, documents: false, requirements: false },
  agreementSummaryReviewed: false, participantSignature: "", guardianSignature: "", familySignature: "", participantSignatureImage: "", guardianSignatureImage: "", familySignatureImage: "", signedOn: "",
};

function Field({ label, children, required = false, className = "" }: { label: string; children: ReactNode; required?: boolean; className?: string }) {
  return <label className={`sc-enrollment-field ${className}`}><span>{label}{required && <span aria-hidden="true"> *</span>}</span>{children}</label>;
}

function MonitoringSummary({ draft }: { draft: MonitoringPolicyDraft }) {
  const documents = documentReviewTypes.filter(type => draft.documentReviewIntervals[type] !== null).map(type => `${type}: every ${draft.documentReviewIntervals[type]} days`).join(" · ");
  return <dl className="grid gap-2 text-sm">
    <div><dt className="font-medium">Contact schedule</dt><dd className="text-[#617579]">{draft.enabled ? `Every ${draft.intervalDays} days · ${draft.qualifyingMethods.map(method => method.replaceAll("_", " ")).join(", ")}${draft.requireDirectContact ? " · Direct client contact required" : ""}` : "Off"}</dd></div>
    <div><dt className="font-medium">Client document monitoring</dt><dd className="text-[#617579]">{draft.documentReviewsEnabled ? documents || "Choose a document interval" : "Off"}</dd></div>
    <div><dt className="font-medium">SC reminders</dt><dd className="text-[#617579]">Contact: {draft.remindersEnabled ? "On" : "Off"} · Documents: {draft.documentRemindersEnabled ? "On" : "Off"}</dd></div>
  </dl>;
}

export function SupportCoordinatorEnrollmentWizard({ isEditMode = false }: { isEditMode?: boolean }) {
  const scope = useAssignmentReviewScope();
  const { user } = useAuth();
  const { clientId } = useParams<{ clientId: string }>();
  return <EnrollmentWizard key={JSON.stringify([scope, user?.agency?.id, isEditMode, clientId || "new"])} isEditMode={isEditMode} />;
}

function EnrollmentWizard({ isEditMode }: { isEditMode: boolean }) {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const agencyId = user?.agencyId || user?.agency?.id || (user?.userType === "agency" ? user.uid : "");
  const alive = useRef(true);
  const submitting = useRef(false);
  const savedRecord = useRef<{ id: string; attachmentErrors: string[] } | null>(null);
  const [form, setForm] = useState<Form>(initialForm);
  const [existingClient, setExistingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [pendingDocuments, setPendingDocuments] = useState<ScPendingDocument[]>([]);
  const [pendingOutcomeId, setPendingOutcomeId] = useState<string | null>(null);
  const [showSSN, setShowSSN] = useState(false);
  const [signatureTarget, setSignatureTarget] = useState<"participant" | "guardian" | "family" | null>(null);
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<boolean[]>(Array(steps.length).fill(false));
  const [visited, setVisited] = useState<boolean[]>(steps.map((_, index) => index === 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [monitoringDraft, setMonitoringDraft] = useState(createMonitoringDraft);
  const [monitoringBaseline, setMonitoringBaseline] = useState<MonitoringPolicyDraft | null>(null);
  const [monitoringContext, setMonitoringContext] = useState<Pick<MonitoringPolicyResponse, "timezone" | "canEditPolicy"> | null>(null);
  const [monitoringLoading, setMonitoringLoading] = useState(true);
  const [monitoringLoadError, setMonitoringLoadError] = useState(false);
  const [monitoringLoadAttempt, setMonitoringLoadAttempt] = useState(0);
  const [policyConflict, setPolicyConflict] = useState<MonitoringPolicyResponse | null>(null);
  const [savedClientId, setSavedClientId] = useState<string | null>(null);
  const [policySaveFailed, setPolicySaveFailed] = useState(false);
  const [createResultUnknown, setCreateResultUnknown] = useState(false);
  const monitoringChanged = Boolean(monitoringBaseline && !monitoringSettingsEqual(monitoringDraft, monitoringBaseline));
  let validTimezone = false;
  try { if (monitoringContext?.timezone) { new Intl.DateTimeFormat("en-US", { timeZone: monitoringContext.timezone }); validTimezone = true; } } catch { /* Allow schedules to remain off. */ }
  const completedCount = completed.filter(Boolean).length;
  const progress = Math.round(completedCount / steps.length * 100);
  const pendingOutcome = form.outcomes.find(outcome => outcome.id === pendingOutcomeId);
  const name = form.firstName.trim() ? `${isEditMode ? "Editing" : "Enrolling"} ${form.firstName.trim()} ${form.lastName.trim()}`.trim() : isEditMode ? "Edit client" : "New client enrollment";
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setMonitoringLoading(true);
    setMonitoringLoadError(false);
    const load = async () => {
      try {
        let context: Pick<MonitoringPolicyResponse, "timezone" | "canEditPolicy">;
        let draft: MonitoringPolicyDraft;
        if (isEditMode) {
          if (!clientId) throw new Error("Missing client");
          const response = await getScMonitoringPolicy(clientId, controller.signal);
          context = response;
          draft = createMonitoringDraft(response.policy);
        } else {
          if (!agencyId) throw new Error("Missing agency");
          const agency = await getAgencyById(agencyId);
          context = { timezone: agency.timezone || null, canEditPolicy: user?.userType === "agency" && agency.uid === user.uid };
          draft = createMonitoringDraft();
        }
        if (controller.signal.aborted) return;
        setMonitoringContext(context);
        setMonitoringBaseline(draft);
        setMonitoringDraft(draft);
      } catch {
        if (!controller.signal.aborted) setMonitoringLoadError(true);
      } finally {
        if (!controller.signal.aborted) setMonitoringLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [agencyId, clientId, isEditMode, monitoringLoadAttempt, user?.uid, user?.userType]);
  useEffect(() => {
    if (!isEditMode) return;
    if (!clientId) { setLoadError(true); setLoading(false); return; }
    const controller = new AbortController();
    getAgencyClientById(clientId, { mode: "sc", signal: controller.signal }).then(client => {
      if (controller.signal.aborted) return;
      const enrollment = client.scEnrollment;
      if (!enrollment) { setLoadError(true); return; }
      const dob = client.dateOfBirth;
      setExistingClient(client);
      setForm({
        program: enrollment.program, firstName: client.firstName || "", middleName: client.middleName || "", lastName: client.lastName || "",
        dob: typeof dob === "string" ? dob.slice(0, 10) : dob instanceof Date ? format(dob, "yyyy-MM-dd") : dob?._seconds ? format(new Date(dob._seconds * 1000), "yyyy-MM-dd") : "",
        gender: client.gender || "", ssn: client.ssn || "", addressSearch: client.primaryAddress?.address || "", address: client.primaryAddress?.line1 || "",
        city: client.primaryAddress?.city || "", county: client.countyState || client.primaryAddress?.countyState || "", state: client.primaryAddress?.state || "", zip: client.primaryAddress?.postalCode || client.primaryAddress?.zipCode || "",
        phone: client.phone || "", email: client.email || "", medicaidId: client.medicaidId || "", dddId: client.dddId || "",
        periodStartDate: client.ispPeriod?.startDate || "", periodEndDate: client.ispPeriod?.endDate || "",
        hasGuardian: enrollment.hasGuardian, guardianName: client.guardianName || "", guardianRelationship: client.guardianRelationship || "", guardianPhone: client.guardianPhone || "", guardianEmail: client.guardianEmail || "", guardianAddress: client.guardianAddress || "",
        familyMemberParticipates: enrollment.familyMemberParticipates, familyMemberName: enrollment.familyMemberName || "", familyMemberRelationship: enrollment.familyMemberRelationship || "",
        outcomes: client.scOutcomes || [], eligibility: enrollment.eligibility, agreementSummaryReviewed: enrollment.agreementSummaryReviewed,
        participantSignature: enrollment.participantSignature, guardianSignature: enrollment.guardianSignature || "", familySignature: enrollment.familySignature || "",
        participantSignatureImage: enrollment.participantSignatureImage, guardianSignatureImage: enrollment.guardianSignatureImage || "", familySignatureImage: enrollment.familySignatureImage || "", signedOn: enrollment.signedOn,
      });
      setCompleted(Array(steps.length).fill(true));
      setVisited(Array(steps.length).fill(true));
    }).catch(() => { if (!controller.signal.aborted) setLoadError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [clientId, isEditMode]);
  useEffect(() => {
    if (!photoFile) { setPhotoPreview(""); return; }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);
  const update = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm(previous => {
      const next = { ...previous, [key]: value };
      if (key === "firstName" || key === "lastName") { next.participantSignature = ""; next.participantSignatureImage = ""; }
      if (key === "guardianName") { next.guardianSignature = ""; next.guardianSignatureImage = ""; }
      if (key === "familyMemberName") { next.familySignature = ""; next.familySignatureImage = ""; }
      if (key === "participantSignature") next.participantSignatureImage = "";
      if (key === "guardianSignature" || key === "hasGuardian") next.guardianSignatureImage = "";
      if (key === "familySignature" || key === "familyMemberParticipates") next.familySignatureImage = "";
      if (key === "program") { next.agreementSummaryReviewed = false; next.participantSignatureImage = ""; next.guardianSignatureImage = ""; next.familySignatureImage = ""; }
      return next;
    });
    if (!isEditMode || key === "program" || key === "agreementSummaryReviewed") setCompleted(previous => previous.map((done, index) => index >= step ? false : done));
    setError("");
  };
  const goTo = (target: number) => { setStep(target); setVisited(previous => previous.map((value, index) => value || index === target)); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const applyImport = (extraction: ScImportReview, { overwrite, files }: { overwrite: boolean; files: Record<string, File> }) => {
    if (saving || createResultUnknown || savedRecord.current) return;
    const merged = mergeScExtractionBatch(form, extraction.documents, { overwrite });
    if (merged.blocked) return;
    if (merged.changedFields.length) {
      setForm({ ...merged.form, agreementSummaryReviewed: false, participantSignature: "", guardianSignature: "", familySignature: "", participantSignatureImage: "", guardianSignatureImage: "", familySignatureImage: "", signedOn: "" });
      setCompleted(previous => previous.map((done, index) => index === monitoringStep ? done : false));
    }
    setPendingDocuments(previous => mergeScPendingDocuments(previous, Object.entries(files).map(([key, file]) => ({ file, documentType: extraction.documents.find(document => document.fileKey === key)?.extraction.detectedDocumentType ?? "other" }))));
    setCompleted(previous => previous.map((done, index) => index === documentsStep ? false : done));
    setError("");
  };
  const documentDraftChanged = () => {
    setCompleted(previous => previous.map((done, index) => index === documentsStep ? false : done));
    setError("");
  };
  const addDocumentFiles = (files: File[]) => {
    if (saving || createResultUnknown || savedRecord.current) return;
    const validFiles: File[] = [];
    const errors: string[] = [];
    for (const file of files) {
      const invalid = scPendingDocumentsError([createScPendingDocument(file)]);
      if (invalid) errors.push(invalid); else validFiles.push(file);
    }
    if (validFiles.length) {
      setPendingDocuments(previous => mergeScPendingDocuments(previous, validFiles.map(file => ({ file }))));
      documentDraftChanged();
    }
    setError([...new Set(errors)].join(" "));
  };
  const changeDocument = (file: File, patch: Partial<Omit<ScPendingDocument, "file" | "documentType">>) => {
    if (saving || createResultUnknown || savedRecord.current) return;
    setPendingDocuments(previous => previous.map(document => document.file === file ? { ...document, ...patch } : document));
    documentDraftChanged();
  };
  const removeDocument = (file: File) => {
    if (saving || createResultUnknown || savedRecord.current) return;
    setPendingDocuments(previous => previous.filter(document => document.file !== file));
    documentDraftChanged();
  };
  const selectPhoto = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024) {
      setPhotoError("Choose a JPG or PNG photo up to 5 MB.");
      return;
    }
    setPhotoFile(file);
    setPhotoError("");
  };
  const selectAddress = (details: AddressDetails) => {
    setForm(previous => ({ ...previous, addressSearch: details.formattedAddress, address: details.line1 || details.street, city: details.city, county: details.county, state: details.stateCode || details.state, zip: details.zipCode }));
    setError("");
  };
  const saveSignature = async (payload: { signatureType: string; signatureData: string }) => {
    const target = signatureTarget;
    if (!target) return;
    try {
      const normalized = await normalizeSignaturePayload(payload as Parameters<typeof normalizeSignaturePayload>[0]);
      if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(normalized.signatureData) || normalized.signatureData.length > 100000) {
        setError("This signature could not be saved. Please try a smaller signature.");
        return;
      }
      update(`${target}SignatureImage` as keyof Pick<Form, "participantSignatureImage" | "guardianSignatureImage" | "familySignatureImage">, normalized.signatureData);
    } catch {
      setError("This signature could not be saved. Please try again.");
    }
  };

  const monitoringError = () => {
    if (monitoringLoading || monitoringLoadError || !monitoringContext || !monitoringBaseline) return "Load monitoring settings before saving the client.";
    const invalid = monitoringChanged ? monitoringValidationError(monitoringDraft, monitoringContext.timezone) : null;
    if (invalid) return invalid;
    if (monitoringChanged && !monitoringContext.canEditPolicy) return "Only the agency owner can change monitoring rules.";
    if (isEditMode && monitoringChanged && !monitoringDraft.changeReason.trim()) return "Add a reason for this policy change.";
    return null;
  };
  const policyInput = () => ({ ...monitoringDraft, changeReason: isEditMode ? monitoringDraft.changeReason.trim() : "Initial monitoring setup during enrollment" });
  const finishSave = (savedId: string) => {
    const missing = savedRecord.current?.attachmentErrors || [];
    toast(missing.length ? { title: "Client saved with missing attachments", description: `The ${missing.join(" and ")} could not be attached. Add it from the client record.`, variant: "destructive" } : { title: isEditMode ? "Client updated" : "Enrollment saved", description: isEditMode ? "Client changes were saved." : "A pending client record was created.", variant: "success" });
    navigate(Routes.agency.clientDetails.replace(":clientId", savedId));
  };
  const policyFailure = (cause: unknown) => {
    const response = cause as { response?: { data?: { error?: string; message?: string } } };
    setPolicySaveFailed(true);
    goTo(monitoringStep);
    setError(response.response?.data?.error || response.response?.data?.message || "Monitoring settings could not be saved. Retry to check the latest policy and save your draft.");
    toast({ title: "Client saved; monitoring settings were not saved.", description: "Your settings are still here. Retry monitoring settings for the saved client.", variant: "destructive" });
  };
  const retryMonitoring = async () => {
    const record = savedRecord.current;
    if (!record || submitting.current || createResultUnknown || policyConflict) return;
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      // Reconcile an uncertain previous PUT before sending another mutation.
      const latest = await getScMonitoringPolicy(record.id);
      if (!alive.current) return;
      setMonitoringContext(latest);
      const latestDraft = createMonitoringDraft(latest.policy);
      if (monitoringSettingsEqual(monitoringDraft, latestDraft)) { finishSave(record.id); return; }
      if (!latest.canEditPolicy) { setError("Only the agency owner can change monitoring rules. The client is saved. Retry after your policy access is restored, or open the saved client."); return; }
      if (latest.policy.revision !== monitoringDraft.expectedRevision) {
        setPolicyConflict(latest);
        setError("Monitoring settings changed since you loaded them. Review the latest settings before reapplying your draft.");
        return;
      }
      const invalidLatest = monitoringValidationError(monitoringDraft, latest.timezone);
      if (invalidLatest) { setError(invalidLatest); return; }
      if (isEditMode && !monitoringDraft.changeReason.trim()) { setError("Add a reason for this policy change."); return; }
      await saveScMonitoringPolicy(record.id, policyInput());
      if (alive.current) finishSave(record.id);
    } catch (cause) {
      if (alive.current) policyFailure(cause);
    } finally {
      submitting.current = false;
      if (alive.current) setSaving(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current || createResultUnknown) return;
    if (savedRecord.current) { await retryMonitoring(); return; }
    if ((step === 1 || step === reviewStep) && (Boolean(form.periodStartDate) !== Boolean(form.periodEndDate) || (form.periodStartDate && form.periodEndDate < form.periodStartDate))) {
      if (step !== 1) goTo(1);
      setError("Enter both ISP period dates, with the end date on or after the start date.");
      return;
    }
    if (step === 1 && !form.dob) { setError("Select the participant's date of birth to continue."); return; }
    if (step === 1 && (!form.address || !form.city || !form.state || !form.zip)) { setError("Select an address from the suggestions to fill the address fields."); return; }
    if (step === documentsStep || step === reviewStep) {
      const invalid = scPendingDocumentsError(pendingDocuments);
      if (invalid) { goTo(documentsStep); setError(invalid); return; }
    }
    if (step === monitoringStep || step === reviewStep) {
      const invalid = monitoringError();
      if (invalid) { goTo(monitoringStep); setError(invalid); return; }
    }
    if (step === agreementStep && !form.agreementSummaryReviewed) { setError("Review the agreement overview to continue."); return; }
    if (step < reviewStep) {
      setCompleted(previous => previous.map((value, index) => index === step ? true : value));
      goTo(step + 1);
      return;
    }
    const firstIncomplete = completed.slice(0, reviewStep).findIndex(value => !value);
    if (firstIncomplete !== -1) { goTo(firstIncomplete); setError(`Complete ${steps[firstIncomplete]} before submitting.`); return; }
    if (!form.program) { goTo(0); return; }
    if (!form.agreementSummaryReviewed) { goTo(agreementStep); setError("Review the agreement overview before saving."); return; }
    if (form.outcomes.some(outcome => outcome.services.length > 0 && !outcome.statement.trim())) { goTo(2); setError("An outcome with attached services needs a statement."); return; }
    if (!form.participantSignatureImage || (form.hasGuardian && !form.guardianSignatureImage) || (form.familyMemberParticipates && !form.familySignatureImage)) { setError("Capture each required signature before submitting."); return; }
    if (!form.signedOn) { setError("Select the date of signature before submitting."); return; }
    submitting.current = true;
    setSaving(true);
    setError("");
    const enrollment: ScEnrollment = {
      program: form.program,
      hasGuardian: form.hasGuardian,
      familyMemberParticipates: form.familyMemberParticipates,
      ...(form.familyMemberParticipates ? { familyMemberName: form.familyMemberName.trim(), familyMemberRelationship: form.familyMemberRelationship } : {}),
      eligibility: form.eligibility,
      agreementSummaryReviewed: true,
      participantSignature: form.participantSignature.trim(),
      participantSignatureImage: form.participantSignatureImage,
      ...(form.hasGuardian ? { guardianSignature: form.guardianSignature.trim() } : {}),
      ...(form.hasGuardian ? { guardianSignatureImage: form.guardianSignatureImage } : {}),
      ...(form.familyMemberParticipates ? { familySignature: form.familySignature.trim() } : {}),
      ...(form.familyMemberParticipates ? { familySignatureImage: form.familySignatureImage } : {}),
      signedOn: form.signedOn,
    };
    const payload: CreateClientRequest = {
      type: "ddd", servicePrograms: ["sc"], status: "pending", scEnrollment: enrollment,
      firstName: form.firstName.trim(), middleName: form.middleName.trim() || (isEditMode ? "" : undefined), lastName: form.lastName.trim(),
      dateOfBirth: form.dob || undefined, gender: form.gender || (isEditMode ? "" : undefined), ssn: form.ssn.trim() || (isEditMode ? "" : undefined),
      phone: form.phone.trim() || (isEditMode ? "" : undefined), email: form.email.trim() || (isEditMode ? "" : undefined),
      medicaidId: form.medicaidId.trim() || (isEditMode ? "" : undefined), dddId: form.dddId.trim() || (isEditMode ? "" : undefined),
      countyState: form.county.trim() || (isEditMode ? "" : undefined),
      primaryAddress: { address: form.addressSearch.trim(), line1: form.address.trim(), city: form.city.trim(), state: form.state.trim(), postalCode: form.zip.trim(), zipCode: form.zip.trim(), countyState: form.county.trim() || undefined, country: "US" },
      guardianName: form.hasGuardian ? form.guardianName.trim() : isEditMode ? "" : undefined,
      guardianRelationship: form.hasGuardian ? form.guardianRelationship : isEditMode ? "" : undefined,
      guardianPhone: form.hasGuardian ? form.guardianPhone.trim() : isEditMode ? "" : undefined,
      guardianEmail: form.hasGuardian ? form.guardianEmail.trim() : isEditMode ? "" : undefined,
      guardianAddress: form.hasGuardian ? form.guardianAddress.trim() : isEditMode ? "" : undefined,
      ispPeriod: form.periodStartDate && form.periodEndDate
        ? { startDate: form.periodStartDate, endDate: form.periodEndDate }
        : isEditMode && existingClient?.ispPeriod ? null : undefined,
      scOutcomes: form.outcomes.map(outcome => ({ ...outcome, statement: outcome.statement.trim() })).filter(outcome => outcome.statement),
    };
    try {
      let savedId: string;
      if (isEditMode) {
        savedId = clientId!;
        const { type: _type, servicePrograms: _servicePrograms, status: _status, ...changes } = payload;
        await updateClient(savedId, changes);
      } else {
        const created = await createClient(payload);
        if (!created?.id || typeof created.id !== "string") throw new Error("Client create result unavailable");
        savedId = created.id;
      }
      if (!alive.current) return;
      const attachmentErrors: string[] = [];
      // Retain the acknowledged ID before any attachment or policy request can fail.
      savedRecord.current = { id: savedId, attachmentErrors };
      setSavedClientId(savedId);
      if (photoFile) {
        try {
          const uploaded = await uploadClientDocument(savedId, "client-photo", photoFile);
          if (!alive.current) return;
          await updateClient(savedId, { profileImage: uploaded.url });
        } catch {
          attachmentErrors.push("photo");
        }
      }
      if (!alive.current) return;
      if (pendingDocuments.length) {
        const documents: ClientDocument[] = [...(existingClient?.documents || [])];
        let uploadedCount = 0;
        for (const item of pendingDocuments) {
          try {
            const uploaded = await uploadClientDocument(savedId, "support-coordination", item.file);
            if (!alive.current) return;
            documents.push(toScClientDocument(item, uploaded));
            uploadedCount++;
          } catch {
            attachmentErrors.push(item.file.name);
          }
          if (!alive.current) return;
        }
        if (uploadedCount) {
          try { await updateClient(savedId, { documents }); }
          catch { attachmentErrors.push("document links"); }
        }
      }
      if (!alive.current) return;
      if (monitoringChanged) await saveScMonitoringPolicy(savedId, policyInput());
      if (alive.current) finishSave(savedId);
    } catch (cause: unknown) {
      if (!alive.current) return;
      if (savedRecord.current) { policyFailure(cause); return; }
      const response = cause as { response?: { status?: number; data?: { error?: string; message?: string } } };
      if (!isEditMode && (!response.response?.status || response.response.status >= 500 || response.response.status === 408)) {
        setCreateResultUnknown(true);
        setError("The client save could not be confirmed. Check the client list before starting another enrollment to avoid creating a duplicate.");
        return;
      }
      const message = response.response?.data?.error || response.response?.data?.message || "Enrollment could not be saved. Please try again.";
      setError(message);
      toast({ title: isEditMode ? "Could not update client" : "Could not save enrollment", description: message, variant: "destructive" });
    } finally { submitting.current = false; if (alive.current) setSaving(false); }
  };

  if (loading) return <div role="status" aria-label="Loading client enrollment" className="sc-enrollment-layout">
    <aside className="sc-enrollment-sidebar space-y-4 p-4" aria-hidden="true">
      <Skeleton className="h-28 rounded-lg" />
      <Skeleton className="h-4 w-36" />
      {steps.map(stepLabel => <Skeleton key={stepLabel} className="h-10 w-full" />)}
      <Skeleton className="h-16 rounded-lg" />
    </aside>
    <main className="sc-enrollment-main" aria-hidden="true">
      <div className="sc-enrollment-heading"><div className="space-y-3"><Skeleton className="h-7 w-52" /><Skeleton className="h-4 w-72 max-w-full" /></div><Skeleton className="h-7 w-20 rounded-full" /></div>
      <div className="sc-enrollment-card space-y-5"><Skeleton className="h-4 w-3/4" /><div className="sc-enrollment-programs"><Skeleton className="h-32 rounded-lg" /><Skeleton className="h-32 rounded-lg" /></div><Skeleton className="h-16 rounded-lg" /></div>
      <div className="mt-auto flex justify-end gap-3 pt-6"><Skeleton className="h-10 w-20 rounded-lg" /><Skeleton className="h-10 w-32 rounded-lg" /></div>
    </main>
    <span className="sr-only">Loading client enrollment…</span>
  </div>;
  if (loadError) return <div className="rounded-2xl bg-white p-8 text-center"><p className="mb-4 text-[#10141a]">Client enrollment could not be loaded.</p><Button variant="outline" onClick={() => navigate(Routes.agency.clients)}>Back to clients</Button></div>;

  return <div className="sc-enrollment-layout">
    <aside className="sc-enrollment-sidebar" aria-label="Enrollment progress">
      <div className="sc-enrollment-welcome">
        <div><p className="sc-enrollment-welcome-title">{name} <span aria-hidden="true">👋</span></p><p className="sc-enrollment-welcome-subtitle">{isEditMode ? "Review and update the client enrollment." : "Follow the steps to complete enrollment."}</p></div>
        <div className="sc-enrollment-ring" style={{ "--progress": `${progress}%` } as CSSProperties} aria-label={`${completedCount} of ${steps.length} steps completed, ${progress}%`}><span>{progress}%</span></div>
      </div>
      <p className="sc-enrollment-count">{completedCount} of {steps.length} steps completed</p>
      <nav aria-label="Enrollment steps">{steps.map((label, index) => {
        const status = completed[index] ? "Completed" : index === step ? "In progress" : visited[index] ? "Needs attention" : "Not started";
        return <button key={label} type="button" className="sc-enrollment-step" aria-current={index === step ? "step" : undefined} disabled={saving || Boolean(savedClientId) || createResultUnknown || index > step && !completed[index]} onClick={() => goTo(index)}>
          <span className={index === step ? "current" : completed[index] ? "done" : ""}>{label}</span><span className={`sc-enrollment-status ${status.toLowerCase().replace(" ", "-")}`}>{status}</span>
        </button>;
      })}</nav>
      <div className="sc-enrollment-help"><Info size={16} aria-hidden="true" /><p>{isEditMode ? "Review each section, then save changes from Review & sign." : "Complete each section to prepare the enrollment record. You can return to earlier steps."}</p></div>
    </aside>

    <main className="sc-enrollment-main">
      <div className="sc-enrollment-heading"><div><h1>{steps[step]}</h1><p>{[
        "Choose the program for this participant.",
        "Enter the participant's identity, contact details, and program IDs.",
        "Add a guardian or family member who will take part in the enrollment agreement.",
        "Review Medicaid and waiver readiness before services begin.",
        "Add client documents now or continue without them. Unknown dates can stay blank.",
        "Choose contact schedules, document review intervals, and reminders. Monitoring can stay off.",
        "Review the program terms with the participant before signing.",
        "Confirm the participant's signature and submit the enrollment.",
      ][step]}</p></div><span className="sc-enrollment-step-number">Step {step + 1} of {steps.length}</span></div>
      <form onSubmit={submit} className="sc-enrollment-form">
        <fieldset className="contents" disabled={saving || createResultUnknown || Boolean(savedClientId) && step !== monitoringStep}>
        {step === 0 && <div className="sc-enrollment-card">
          <p className="sc-enrollment-intro">Select the program for this participant. Both programs are administered by the NJ Division of Developmental Disabilities.</p>
          <div className="sc-enrollment-programs">{([
            { value: "SP", title: "Supports Program", description: "Home and community-based services for individuals with developmental disabilities who live in the community, typically with family or independently." },
            { value: "CCP", title: "Community Care Program", description: "For individuals with more intensive support needs, including residential support when authorized." },
          ] as const).map(option => <button key={option.value} type="button" className={`sc-enrollment-program ${form.program === option.value ? "selected" : ""}`} aria-pressed={form.program === option.value} onClick={() => update("program", option.value)}>
            <span className="sc-enrollment-program-title">{option.title} <small>{option.value}</small></span><span>{option.description}</span>
          </button>)}</div>
          <div className="sc-enrollment-note"><strong>Important</strong><span>Active Medicaid eligibility and DDD functional eligibility are required before waiver services can begin.</span></div>
        </div>}

        {step === 1 && <div className="sc-enrollment-card sc-enrollment-sections">
          <section><h2>1. Personal information</h2>
          <div className="sc-enrollment-photo"><span className="sc-enrollment-photo-label">Client photo</span>
            <FileUpload aria-label="Client photo" aria-invalid={photoError ? true : undefined} aria-describedby={`sc-photo-help${photoError ? " sc-photo-error" : ""}`} accept="image/jpeg,image/png" onFilesSelected={selectPhoto} className={`sc-enrollment-photo-upload ${photoError ? "invalid" : ""}`} icon={photoPreview || existingClient?.profileImage ? <img src={photoPreview || existingClient?.profileImage} alt="" className="sc-enrollment-photo-preview" /> : <span className="sc-enrollment-photo-icon"><UploadCloud size={23} /></span>} label={<span className="sc-enrollment-photo-copy"><strong>{photoFile ? "Photo ready" : existingClient?.profileImage ? "Current photo" : "Click to upload or drag and drop"}</strong><small id="sc-photo-help">{photoFile ? `${photoFile.name} · Click or drop to replace` : "JPG or PNG · Up to 5 MB"}</small></span>} />
            {photoError && <p id="sc-photo-error" className="sc-enrollment-photo-error" role="alert">{photoError}</p>}
          </div><div className="sc-enrollment-grid three">
            <Field label="First name" required><Input value={form.firstName} onChange={event => update("firstName", event.target.value)} placeholder="Enter first name" required /></Field>
            <Field label="Middle name"><Input value={form.middleName} onChange={event => update("middleName", event.target.value)} placeholder="Enter middle name" /></Field>
            <Field label="Last name" required><Input value={form.lastName} onChange={event => update("lastName", event.target.value)} placeholder="Enter last name" required /></Field>
            <DatePickerField id="sc-date-of-birth" label="Date of birth" required ariaInvalid={!form.dob && error.includes("date of birth")} maxDate={new Date()} value={form.dob ? parseISO(form.dob) : undefined} onChange={date => update("dob", date ? format(date, "yyyy-MM-dd") : "")} />
            <Field label="Gender"><select value={form.gender} onChange={event => update("gender", event.target.value)}><option value="">Select gender</option><option value="female">Female</option><option value="male">Male</option><option value="non-binary">Non-binary</option><option value="other">Other</option><option value="prefer-not-to-say">Prefer not to say</option></select></Field>
            <div className="sc-enrollment-field"><label htmlFor="sc-ssn">SSN</label><div className="sc-enrollment-ssn"><Input id="sc-ssn" type={showSSN ? "text" : "password"} value={form.ssn} onChange={event => { const digits = event.target.value.replace(/\D/g, "").slice(0, 9); update("ssn", digits.length > 5 ? `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}` : digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits); }} placeholder="XXX-XX-XXXX" autoComplete="off" inputMode="numeric" pattern="[0-9]{3}-[0-9]{2}-[0-9]{4}" maxLength={11} className="pr-10" /><button type="button" aria-label={showSSN ? "Hide SSN" : "Show SSN"} onClick={() => setShowSSN(value => !value)}>{showSSN ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
          </div></section>
          <section><h2>2. Contact & address</h2><div className="sc-enrollment-grid three">
            <div className="span-three"><AddressAutocompleteField label="Primary address search" id="sc-primary-address-search" value={form.addressSearch} onChange={addressSearch => { update("addressSearch", addressSearch); setForm(previous => ({ ...previous, address: "", city: "", county: "", state: "", zip: "" })); }} onSelectDetails={selectAddress} placeholder="Search for the primary address" required ariaInvalid={error.includes("Select an address")} /><p className="sc-enrollment-address-help">Select an address to fill the fields below.</p></div>
            <Field label="Street address" className="span-three"><Input value={form.address} placeholder="Filled from address selection" readOnly /></Field>
            <Field label="City" required><Input value={form.city} placeholder="Filled from address selection" readOnly /></Field>
            <Field label="State" required><Input value={form.state} placeholder="Filled from address selection" readOnly /></Field>
            <Field label="ZIP code" required><Input value={form.zip} placeholder="Filled from address selection" readOnly /></Field>
            <Field label="County" className="span-three"><Input value={form.county} onChange={event => update("county", event.target.value)} placeholder="Filled from address selection or enter county" /></Field>
            <Field label="Phone"><Input type="tel" value={form.phone} onChange={event => update("phone", event.target.value)} placeholder="Enter phone number" /></Field>
            <Field label="Email address" className="span-two"><Input type="email" value={form.email} onChange={event => update("email", event.target.value)} placeholder="name@example.com" /></Field>
          </div></section>
          <section><h2>3. Program identifiers</h2><div className="sc-enrollment-grid two">
            <Field label="Medicaid ID"><Input value={form.medicaidId} onChange={event => update("medicaidId", event.target.value)} placeholder="Enter Medicaid ID" /></Field>
            <Field label="DDD client ID (if known)"><Input value={form.dddId} onChange={event => update("dddId", event.target.value)} placeholder="Enter DDD client ID" /></Field>
          </div></section>
          <section><h2>4. ISP plan period</h2><div className="sc-enrollment-grid two">
            <DatePickerField id="sc-isp-period-start" label="ISP start date" value={form.periodStartDate ? parseISO(form.periodStartDate) : undefined} onChange={date => update("periodStartDate", date ? format(date, "yyyy-MM-dd") : "")} ariaInvalid={error.includes("ISP period dates")} />
            <DatePickerField id="sc-isp-period-end" label="ISP end date" value={form.periodEndDate ? parseISO(form.periodEndDate) : undefined} onChange={date => update("periodEndDate", date ? format(date, "yyyy-MM-dd") : "")} ariaInvalid={error.includes("ISP period dates")} />
          </div></section>
        </div>}

        {step === 2 && <div className="sc-enrollment-card sc-enrollment-sections">
          <section><div className="sc-enrollment-toggle-row"><label htmlFor="sc-has-guardian">This participant has a legal guardian or authorized representative</label><Checkbox id="sc-has-guardian" checked={form.hasGuardian} onChange={event => update("hasGuardian", event.target.checked)} /></div>
            {form.hasGuardian && <><h2>Guardian / legal representative</h2><div className="sc-enrollment-grid two">
              <Field label="Full name" required><Input value={form.guardianName} onChange={event => update("guardianName", event.target.value)} placeholder="Enter guardian's full name" required /></Field>
              <Field label="Relationship to participant" required><select value={form.guardianRelationship} onChange={event => update("guardianRelationship", event.target.value)} required><option value="">Select relationship</option><option value="relative">Family member</option><option value="guardian">Legal guardian</option><option value="advocate">Advocate</option><option value="other">Other</option></select></Field>
              <Field label="Phone number"><Input type="tel" value={form.guardianPhone} onChange={event => update("guardianPhone", event.target.value)} placeholder="Enter phone number" /></Field>
              <Field label="Email"><Input type="email" value={form.guardianEmail} onChange={event => update("guardianEmail", event.target.value)} placeholder="name@example.com" /></Field>
              <div className="span-two"><AddressAutocompleteField label="Guardian address" id="sc-guardian-address" value={form.guardianAddress} onChange={value => update("guardianAddress", value)} placeholder="Search for the guardian address" /></div>
            </div></>}
          </section>
          <section><div className="sc-enrollment-toggle-row"><label htmlFor="sc-family-participates">A family member will also be party to this enrollment agreement</label><Checkbox id="sc-family-participates" checked={form.familyMemberParticipates} onChange={event => update("familyMemberParticipates", event.target.checked)} /></div>
            {form.familyMemberParticipates && <><h2>Family member</h2><div className="sc-enrollment-grid two">
              <Field label="Full name" required><Input value={form.familyMemberName} onChange={event => update("familyMemberName", event.target.value)} placeholder="Enter family member's full name" required /></Field>
              <Field label="Relationship to participant" required><select value={form.familyMemberRelationship} onChange={event => update("familyMemberRelationship", event.target.value)} required><option value="">Select relationship</option><option value="parent">Parent</option><option value="sibling">Sibling</option><option value="spouse">Spouse</option><option value="other">Other</option></select></Field>
            </div></>}
          </section>
          <section><h2>ISP outcomes</h2><p className="mb-3 text-sm text-[#6b7280]">Add outcomes now. Services can be attached to each outcome from the client's Services tab.</p>
            {form.outcomes.map((outcome, index) => <div key={outcome.id} className="mb-3 flex items-end gap-2"><Field label={`Outcome ${index + 1}`} className="flex-1"><Input value={outcome.statement} maxLength={1000} onChange={event => update("outcomes", form.outcomes.map(item => item.id === outcome.id ? { ...item, statement: event.target.value } : item))} placeholder="Describe the desired outcome" /></Field><Button type="button" variant="outline" aria-label={`Remove outcome ${index + 1}`} onClick={() => setPendingOutcomeId(outcome.id)}>Remove</Button></div>)}
            <Button type="button" variant="outline" onClick={() => update("outcomes", [...form.outcomes, { id: crypto.randomUUID(), statement: "", services: [] }])}>Add outcome</Button>
          </section>
        </div>}

        {step === 3 && <div className="sc-enrollment-card sc-enrollment-checklist">{eligibilityItems.map(item => <div key={item.key} className={`sc-enrollment-check ${form.eligibility[item.key] ? "checked" : ""}`}>
          <span><strong>{item.title}</strong>{"detail" in item && <small>{item.detail}</small>}</span><Checkbox checked={form.eligibility[item.key]} onChange={event => update("eligibility", { ...form.eligibility, [item.key]: event.target.checked })} aria-label={item.title} />
        </div>)}<div className="sc-enrollment-note"><strong>Readiness check</strong><span>Unchecked items will remain outstanding. The client record will be saved as pending until eligibility and documents are confirmed.</span></div></div>}

        {step === documentsStep && <ScEnrollmentDocumentsStep documents={pendingDocuments} existingDocuments={existingClient?.documents ?? []} disabled={saving || createResultUnknown || Boolean(savedClientId)} onAddFiles={addDocumentFiles} onChangeDocument={changeDocument} onRemoveDocument={removeDocument} renderAutofillAction={document => <ScImportFromFilePanel form={form} onApply={applyImport} pendingDocuments={[]} onRemoveDocument={removeDocument} initialFiles={{ "pending-file": document.file }} triggerLabel="Use for autofill" triggerAriaLabel={`Use ${document.file.name} for autofill`} triggerClassName="h-10 rounded-lg border-[#dce6e7] px-3 text-[12px] text-[#087b80] hover:bg-[#eaf6f6]" disabled={saving || createResultUnknown || Boolean(savedClientId)} />} />}

        {step === monitoringStep && <div className="sc-enrollment-card space-y-5 text-sm">
          {monitoringLoading ? <div role="status" aria-label="Loading monitoring settings" className="space-y-6">
            <span className="sr-only">Loading monitoring settings…</span>
            <Skeleton className="h-9 w-full" />
            {[0, 1, 2].map(section => <div key={section} className="space-y-3" aria-hidden="true"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-3/4" /><Skeleton className={section === 1 ? "h-72 w-full rounded-lg" : "h-28 w-full rounded-lg"} /></div>)}
          </div> : monitoringLoadError || !monitoringContext ? <div className="space-y-3">
            <p role="alert">Monitoring policy could not be loaded. Reload before continuing.</p>
            <Button type="button" variant="outline" onClick={() => setMonitoringLoadAttempt(value => value + 1)}>Reload policy</Button>
          </div> : <>
            <p className="flex flex-wrap items-center justify-between gap-2 text-[#617579]"><span>Agency time zone</span><span className="rounded-full bg-[#eff6f6] px-2.5 py-1 font-medium text-[#335d61]">{monitoringContext.timezone || "Not configured"}</span></p>
            {!monitoringContext.canEditPolicy && <p className="rounded-lg bg-[#f7fbfb] px-3 py-2 text-[#617579]">Only the agency owner can change monitoring rules.</p>}
            {!validTimezone && <p className="rounded-lg bg-[#fff8e9] px-3 py-2 text-[#795510]">Set a valid agency time zone before enabling schedules, document reviews, or reminders. <Link to={`${Routes.agency.agencySettings}?tab=agencyInfo#agency-timezone`} className="font-medium underline">View agency time zone</Link></p>}
            {policyConflict && <div role="alert" className="space-y-3 rounded-lg border border-[#e5c58a] bg-[#fff8e9] p-3 text-[#795510]">
              <p className="font-medium">The latest policy is revision {policyConflict.policy.revision}.</p>
              <MonitoringSummary draft={createMonitoringDraft(policyConflict.policy)} />
              <p>Your draft is retained below. Reapplying it will replace the latest settings when you retry.</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={saving} onClick={() => {
                  setMonitoringBaseline(createMonitoringDraft(policyConflict.policy));
                  setMonitoringDraft(current => ({ ...current, expectedRevision: policyConflict.policy.revision }));
                  setPolicyConflict(null);
                  setError("");
                }}>Reapply my draft</Button>
                <Button type="button" variant="outline" disabled={saving} onClick={() => { if (savedClientId) finishSave(savedClientId); }}>Use latest settings</Button>
              </div>
            </div>}
            <MonitoringPolicyFields draft={monitoringDraft} timezone={monitoringContext.timezone} disabled={saving || !monitoringContext.canEditPolicy || Boolean(policyConflict)} onChange={draft => {
              setMonitoringDraft(draft);
              if (!isEditMode && !savedClientId) setCompleted(previous => previous.map((done, index) => index >= monitoringStep ? false : done));
              setError("");
            }} />
            {isEditMode && monitoringContext.canEditPolicy && <div className="space-y-2 border-t border-[#e6eeee] pt-5">
              <label htmlFor="sc-enrollment-monitoring-reason" className="font-medium">Reason for this change{monitoringChanged && <span aria-hidden="true"> *</span>}</label>
              <Textarea id="sc-enrollment-monitoring-reason" aria-label="Reason for this change" rows={3} maxLength={2000} placeholder="Explain why these rules are changing" disabled={saving || Boolean(policyConflict)} value={monitoringDraft.changeReason} onChange={event => { setMonitoringDraft(current => ({ ...current, changeReason: event.target.value })); setError(""); }} />
            </div>}
            {!savedClientId && <p className="text-xs text-[#617579]">These settings will be saved with your final enrollment submission. Contact schedules apply when the client is active.</p>}
          </>}
        </div>}

        {step === agreementStep && <div className="sc-enrollment-card sc-enrollment-agreement">
          <div className="sc-enrollment-agreement-header"><small>DDD · NJ FamilyCare Comprehensive Demonstration</small><h2>Participant enrollment agreement overview</h2><span>{form.program === "CCP" ? "Community Care Program" : "Supports Program"} · NJ Division of Developmental Disabilities</span></div>
          <ol>{agreementTerms.map(term => <li key={term}>{term}</li>)}</ol>
          <div className="sc-enrollment-accept"><Checkbox checked={form.agreementSummaryReviewed} onChange={event => update("agreementSummaryReviewed", event.target.checked)} aria-label="I have reviewed the enrollment overview" /><span>I have reviewed this overview with the participant. The formal agreement must be completed separately.</span></div>
        </div>}

        {step === reviewStep && <div className="sc-enrollment-card sc-enrollment-sections">
          <div className="sc-enrollment-agreement-header">Enter each full name and capture each signature to acknowledge this enrollment overview.</div>
          <section aria-label="Documents summary"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="!mb-0">Documents</h2><Button type="button" variant="ghost" className="h-9 px-3 text-[12px] text-[#087b80]" onClick={() => goTo(documentsStep)}>Review documents</Button></div><p className="text-sm text-[#617579]">{pendingDocuments.length ? `${pendingDocuments.length} document${pendingDocuments.length === 1 ? "" : "s"} ready to attach` : "No new documents added. Documents can be added later from the client record."}{Boolean(existingClient?.documents?.length) && ` ${existingClient!.documents!.length} existing document${existingClient!.documents!.length === 1 ? "" : "s"} retained.`}</p>{pendingDocuments.length > 0 && <ul className="mt-3 divide-y divide-[#e6edee]">{pendingDocuments.map((document, index) => <li key={index} className="flex flex-wrap items-start justify-between gap-2 py-2 text-sm"><span className="min-w-0 flex-1 break-words">{document.title || document.file.name}</span><span className="rounded-md bg-[#eaf6f6] px-2 py-0.5 text-[11px] text-[#087b80]">{document.category}</span></li>)}</ul>}</section>
          <section><h2>Monitoring settings</h2>{monitoringLoading || monitoringLoadError ? <p>Monitoring settings need to be loaded before saving.</p> : <MonitoringSummary draft={monitoringDraft} />}</section>
          <section><h2>Participant signature</h2><div className="sc-enrollment-grid two"><Field label="Full name" required><Input value={form.participantSignature} onChange={event => update("participantSignature", event.target.value)} placeholder="Type participant's full name" required /></Field><div className={`sc-enrollment-signature-field ${!form.participantSignatureImage && error.includes("required signature") ? "invalid" : ""}`}><span>Signature *</span><SignatureField value={form.participantSignatureImage} onOpen={() => setSignatureTarget("participant")} onClear={() => update("participantSignatureImage", "")} ariaLabel="Participant signature" required /></div></div></section>
          {form.hasGuardian && <section><h2>Guardian signature</h2><div className="sc-enrollment-grid two"><Field label="Full name" required><Input value={form.guardianSignature} onChange={event => update("guardianSignature", event.target.value)} placeholder="Type guardian's full name" required /></Field><div className={`sc-enrollment-signature-field ${!form.guardianSignatureImage && error.includes("required signature") ? "invalid" : ""}`}><span>Signature *</span><SignatureField value={form.guardianSignatureImage} onOpen={() => setSignatureTarget("guardian")} onClear={() => update("guardianSignatureImage", "")} ariaLabel="Guardian signature" required /></div></div></section>}
          {form.familyMemberParticipates && <section><h2>Family member signature</h2><div className="sc-enrollment-grid two"><Field label="Full name" required><Input value={form.familySignature} onChange={event => update("familySignature", event.target.value)} placeholder="Type family member's full name" required /></Field><div className={`sc-enrollment-signature-field ${!form.familySignatureImage && error.includes("required signature") ? "invalid" : ""}`}><span>Signature *</span><SignatureField value={form.familySignatureImage} onOpen={() => setSignatureTarget("family")} onClear={() => update("familySignatureImage", "")} ariaLabel="Family member signature" required /></div></div></section>}
          <section><h2>Date of signature</h2><div className="sc-enrollment-date"><DatePickerField id="sc-signature-date" label="Date" required ariaInvalid={!form.signedOn && error.includes("date of signature")} maxDate={new Date()} value={form.signedOn ? parseISO(form.signedOn) : undefined} onChange={date => update("signedOn", date ? format(date, "yyyy-MM-dd") : "")} /></div></section>
          <div className="sc-enrollment-note"><span>{isEditMode ? "Changes to the enrollment record will be saved. Formal enrollment still requires the completed program agreement and eligibility approval." : "This creates a pending client record. Formal enrollment still requires the completed program agreement and eligibility approval."}</span></div>
        </div>}
        </fieldset>

        {policySaveFailed && savedClientId && <div role="status" className="mt-4 space-y-2 rounded-lg border border-[#e5c58a] bg-[#fff8e9] p-3 text-sm text-[#795510]">
          <p className="font-medium">Client saved; monitoring settings were not saved.</p>
          <p>Retry saves only the monitoring settings. Your enrollment and attachments will not be submitted again.</p>
          <Link to={Routes.agency.clientDetails.replace(":clientId", savedClientId)} className="font-medium underline">Open saved client</Link>
        </div>}
        {error && <p role="alert" className="sc-enrollment-error">{error}</p>}
        {createResultUnknown && <Button type="button" variant="outline" onClick={() => navigate(Routes.agency.clients)}>Back to clients</Button>}
        <div className="sc-enrollment-actions">
          {!savedClientId && (step === 0 ? <Button type="button" variant="outline" onClick={() => navigate(isEditMode && clientId ? Routes.agency.clientDetails.replace(":clientId", clientId) : Routes.agency.clients)} disabled={saving}>Cancel</Button> : <Button type="button" variant="outline" className="sc-enrollment-back" onClick={() => goTo(step - 1)} disabled={saving || createResultUnknown}>Go back</Button>)}
          {step === 0 && <ScImportFromFilePanel form={form} onApply={applyImport} pendingDocuments={pendingDocuments} onRemoveDocument={removeDocument} disabled={saving || createResultUnknown || Boolean(savedClientId)} />}
          <Button type="submit" disabled={saving || createResultUnknown || Boolean(policyConflict) || (step === 0 && !form.program)}>{saving ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Saving…</> : savedClientId ? "Retry monitoring settings" : step === reviewStep ? isEditMode ? "Save changes" : "Submit enrollment" : step === 0 ? isEditMode ? "Continue editing" : "Get started" : "Continue"}</Button>
        </div>
      </form>
    </main>
    <ConfirmDialog open={Boolean(pendingOutcome)} onOpenChange={open => { if (!open) setPendingOutcomeId(null); }}>
      <ConfirmDialogContent
        title={`Remove outcome ${form.outcomes.findIndex(outcome => outcome.id === pendingOutcomeId) + 1}?`}
        description={pendingOutcome?.services.length ? `This will also remove ${pendingOutcome.services.length} attached service${pendingOutcome.services.length === 1 ? "" : "s"} when you save the client.` : "This outcome will be removed when you save the client."}
        confirmText="Remove outcome"
        onCancel={() => setPendingOutcomeId(null)}
        onConfirm={() => { if (pendingOutcomeId) update("outcomes", form.outcomes.filter(outcome => outcome.id !== pendingOutcomeId)); setPendingOutcomeId(null); }}
      />
    </ConfirmDialog>
    {signatureTarget && <Suspense fallback={null}><DigitalSignatureModal isOpen setIsOpen={open => { if (!open) setSignatureTarget(null); }} useCase="sc-enrollment" skipBackend onSave={saveSignature} disclaimer="This captures an acknowledgement of the enrollment overview. The formal participant enrollment agreement must be completed separately." /></Suspense>}
  </div>;
}
