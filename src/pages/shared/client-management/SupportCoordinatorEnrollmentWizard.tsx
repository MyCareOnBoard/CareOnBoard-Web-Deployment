import { lazy, Suspense, useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router";
import { format, parseISO } from "date-fns";
import { Eye, EyeOff, Info, Loader2, Upload, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog, ConfirmDialogContent } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FileUpload } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeSignaturePayload } from "@/pages/agency/billing/claims/utils/claimReportSignatureUtils";
import { AddressAutocompleteField } from "./components/forms/AddressAutocompleteField";
import { DatePickerField, SignatureField } from "./components/forms/formControls";
import type { AddressDetails } from "@/hooks/useGooglePlacesAutocomplete";
import { createClient, getAgencyClientById, updateClient, uploadClientDocument, type Client, type ClientOutcome, type CreateClientRequest, type ScEnrollment } from "@/lib/api/clients";
import { useToast } from "@/hooks/use-toast";
import { Routes } from "@/routes/constants";
import "./support-coordinator-enrollment.css";

const steps = ["Program selection", "Participant information", "Guardian / representative", "Medicaid & eligibility", "Enrollment agreement", "Review & sign"] as const;
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
  addressSearch: string; address: string; city: string; county: string; state: string; zip: string; phone: string; email: string; medicaidId: string; dddId: string;
  hasGuardian: boolean; guardianName: string; guardianRelationship: string; guardianPhone: string; guardianEmail: string; guardianAddress: string;
  familyMemberParticipates: boolean; familyMemberName: string; familyMemberRelationship: string;
  outcomes: ClientOutcome[];
  eligibility: Record<EligibilityKey, boolean>; agreementSummaryReviewed: boolean; participantSignature: string; guardianSignature: string; familySignature: string; participantSignatureImage: string; guardianSignatureImage: string; familySignatureImage: string; signedOn: string;
};

const initialForm: Form = {
  program: "", firstName: "", middleName: "", lastName: "", dob: "", gender: "", ssn: "",
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

export function SupportCoordinatorEnrollmentWizard({ isEditMode = false }: { isEditMode?: boolean }) {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const { toast } = useToast();
  const [form, setForm] = useState<Form>(initialForm);
  const [existingClient, setExistingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [document, setDocument] = useState<File | null>(null);
  const [pendingOutcomeId, setPendingOutcomeId] = useState<string | null>(null);
  const [pendingDocument, setPendingDocument] = useState<File | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showSSN, setShowSSN] = useState(false);
  const [signatureTarget, setSignatureTarget] = useState<"participant" | "guardian" | "family" | null>(null);
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState<boolean[]>(Array(6).fill(false));
  const [visited, setVisited] = useState<boolean[]>([true, false, false, false, false, false]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const completedCount = completed.filter(Boolean).length;
  const progress = Math.round(completedCount / steps.length * 100);
  const pendingOutcome = form.outcomes.find(outcome => outcome.id === pendingOutcomeId);
  const name = form.firstName.trim() ? `${isEditMode ? "Editing" : "Enrolling"} ${form.firstName.trim()} ${form.lastName.trim()}`.trim() : isEditMode ? "Edit client" : "New client enrollment";
  useEffect(() => {
    if (!isEditMode) return;
    if (!clientId) { setLoadError(true); setLoading(false); return; }
    const controller = new AbortController();
    getAgencyClientById(clientId, { mode: "sc", signal: controller.signal }).then(client => {
      const enrollment = client.scEnrollment;
      if (!enrollment) { setLoadError(true); return; }
      const dob = client.dateOfBirth;
      setExistingClient(client);
      setForm({
        program: enrollment.program, firstName: client.firstName || "", middleName: client.middleName || "", lastName: client.lastName || "",
        dob: typeof dob === "string" ? dob.slice(0, 10) : dob instanceof Date ? format(dob, "yyyy-MM-dd") : dob?._seconds ? format(new Date(dob._seconds * 1000), "yyyy-MM-dd") : "",
        gender: client.gender || "", ssn: client.ssn || "", addressSearch: client.primaryAddress?.address || "", address: client.primaryAddress?.line1 || "",
        city: client.primaryAddress?.city || "", county: client.countyState || "", state: client.primaryAddress?.state || "", zip: client.primaryAddress?.postalCode || client.primaryAddress?.zipCode || "",
        phone: client.phone || "", email: client.email || "", medicaidId: client.medicaidId || "", dddId: client.dddId || "",
        hasGuardian: enrollment.hasGuardian, guardianName: client.guardianName || "", guardianRelationship: client.guardianRelationship || "", guardianPhone: client.guardianPhone || "", guardianEmail: client.guardianEmail || "", guardianAddress: client.guardianAddress || "",
        familyMemberParticipates: enrollment.familyMemberParticipates, familyMemberName: enrollment.familyMemberName || "", familyMemberRelationship: enrollment.familyMemberRelationship || "",
        outcomes: client.scOutcomes || [], eligibility: enrollment.eligibility, agreementSummaryReviewed: enrollment.agreementSummaryReviewed,
        participantSignature: enrollment.participantSignature, guardianSignature: enrollment.guardianSignature || "", familySignature: enrollment.familySignature || "",
        participantSignatureImage: enrollment.participantSignatureImage, guardianSignatureImage: enrollment.guardianSignatureImage || "", familySignatureImage: enrollment.familySignatureImage || "", signedOn: enrollment.signedOn,
      });
      setCompleted(Array(6).fill(true));
      setVisited(Array(6).fill(true));
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
  const selectDocument = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setPendingDocument(null);
      setUploadError("Choose a PDF, PNG, or JPG file under 10 MB.");
      return;
    }
    setPendingDocument(file);
    setUploadError("");
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === 1 && !form.dob) { setError("Select the participant's date of birth to continue."); return; }
    if (step === 1 && (!form.address || !form.city || !form.state || !form.zip)) { setError("Select an address from the suggestions to fill the address fields."); return; }
    if (step === 4 && !form.agreementSummaryReviewed) { setError("Review the agreement overview to continue."); return; }
    if (step < 5) {
      setCompleted(previous => previous.map((value, index) => index === step ? true : value));
      goTo(step + 1);
      return;
    }
    const firstIncomplete = completed.slice(0, 5).findIndex(value => !value);
    if (firstIncomplete !== -1) { goTo(firstIncomplete); setError(`Complete ${steps[firstIncomplete]} before submitting.`); return; }
    if (!form.program) { goTo(0); return; }
    if (!form.agreementSummaryReviewed) { goTo(4); setError("Review the agreement overview before saving."); return; }
    if (form.outcomes.some(outcome => outcome.services.length > 0 && !outcome.statement.trim())) { goTo(2); setError("An outcome with attached services needs a statement."); return; }
    if (!form.participantSignatureImage || (form.hasGuardian && !form.guardianSignatureImage) || (form.familyMemberParticipates && !form.familySignatureImage)) { setError("Capture each required signature before submitting."); return; }
    if (!form.signedOn) { setError("Select the date of signature before submitting."); return; }
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
      primaryAddress: { address: form.addressSearch.trim(), line1: form.address.trim(), city: form.city.trim(), state: form.state.trim(), postalCode: form.zip.trim(), zipCode: form.zip.trim(), country: "US" },
      guardianName: form.hasGuardian ? form.guardianName.trim() : isEditMode ? "" : undefined,
      guardianRelationship: form.hasGuardian ? form.guardianRelationship : isEditMode ? "" : undefined,
      guardianPhone: form.hasGuardian ? form.guardianPhone.trim() : isEditMode ? "" : undefined,
      guardianEmail: form.hasGuardian ? form.guardianEmail.trim() : isEditMode ? "" : undefined,
      guardianAddress: form.hasGuardian ? form.guardianAddress.trim() : isEditMode ? "" : undefined,
      scOutcomes: form.outcomes.map(outcome => ({ ...outcome, statement: outcome.statement.trim() })).filter(outcome => outcome.statement),
    };
    try {
      const savedId = isEditMode ? clientId! : (await createClient(payload)).id;
      if (isEditMode) {
        const { type: _type, servicePrograms: _servicePrograms, status: _status, ...changes } = payload;
        await updateClient(savedId, changes);
      }
      const attachmentErrors: string[] = [];
      if (photoFile) {
        try {
          const uploaded = await uploadClientDocument(savedId, "client-photo", photoFile);
          await updateClient(savedId, { profileImage: uploaded.url });
        } catch {
          attachmentErrors.push("photo");
        }
      }
      if (document) {
        try {
          const uploaded = await uploadClientDocument(savedId, "consent-and-releases", document);
          await updateClient(savedId, { documents: [...(existingClient?.documents || []), { key: "consents", title: "Enrollment document", fileName: uploaded.fileName, url: uploaded.url }] });
        } catch {
          attachmentErrors.push("document");
        }
      }
      toast(attachmentErrors.length ? { title: "Client saved with missing attachments", description: `The ${attachmentErrors.join(" and ")} could not be attached. Add it from the client record.`, variant: "destructive" } : { title: isEditMode ? "Client updated" : "Enrollment saved", description: isEditMode ? "Client changes were saved." : "A pending client record was created.", variant: "success" });
      navigate(Routes.agency.clientDetails.replace(":clientId", savedId));
    } catch (cause: unknown) {
      const response = cause as { response?: { data?: { error?: string; message?: string } } };
      const message = response.response?.data?.error || response.response?.data?.message || "Enrollment could not be saved. Please try again.";
      setError(message);
      toast({ title: isEditMode ? "Could not update client" : "Could not save enrollment", description: message, variant: "destructive" });
    } finally { setSaving(false); }
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
        <div className="sc-enrollment-ring" style={{ "--progress": `${progress}%` } as CSSProperties} aria-label={`${completedCount} of 6 steps completed, ${progress}%`}><span>{progress}%</span></div>
      </div>
      <p className="sc-enrollment-count">{completedCount} of 6 steps completed</p>
      <nav aria-label="Enrollment steps">{steps.map((label, index) => {
        const status = completed[index] ? "Completed" : index === step ? "In progress" : visited[index] ? "Needs attention" : "Not started";
        return <button key={label} type="button" className="sc-enrollment-step" aria-current={index === step ? "step" : undefined} disabled={index > step && !completed[index]} onClick={() => goTo(index)}>
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
        "Review the program terms with the participant before signing.",
        "Confirm the participant's signature and submit the enrollment.",
      ][step]}</p></div><span className="sc-enrollment-step-number">Step {step + 1} of 6</span></div>
      <form onSubmit={submit} className="sc-enrollment-form">
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
            <Field label="Phone"><Input type="tel" value={form.phone} onChange={event => update("phone", event.target.value)} placeholder="Enter phone number" /></Field>
            <Field label="Email address" className="span-two"><Input type="email" value={form.email} onChange={event => update("email", event.target.value)} placeholder="name@example.com" /></Field>
          </div></section>
          <section><h2>3. Program identifiers</h2><div className="sc-enrollment-grid two">
            <Field label="Medicaid ID"><Input value={form.medicaidId} onChange={event => update("medicaidId", event.target.value)} placeholder="Enter Medicaid ID" /></Field>
            <Field label="DDD client ID (if known)"><Input value={form.dddId} onChange={event => update("dddId", event.target.value)} placeholder="Enter DDD client ID" /></Field>
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

        {step === 4 && <div className="sc-enrollment-card sc-enrollment-agreement">
          <div className="sc-enrollment-agreement-header"><small>DDD · NJ FamilyCare Comprehensive Demonstration</small><h2>Participant enrollment agreement overview</h2><span>{form.program === "CCP" ? "Community Care Program" : "Supports Program"} · NJ Division of Developmental Disabilities</span></div>
          <ol>{agreementTerms.map(term => <li key={term}>{term}</li>)}</ol>
          <div className="sc-enrollment-accept"><Checkbox checked={form.agreementSummaryReviewed} onChange={event => update("agreementSummaryReviewed", event.target.checked)} aria-label="I have reviewed the enrollment overview" /><span>I have reviewed this overview with the participant. The formal agreement must be completed separately.</span></div>
        </div>}

        {step === 5 && <div className="sc-enrollment-card sc-enrollment-sections">
          <div className="sc-enrollment-agreement-header">Enter each full name and capture each signature to acknowledge this enrollment overview.</div>
          <section><h2>Participant signature</h2><div className="sc-enrollment-grid two"><Field label="Full name" required><Input value={form.participantSignature} onChange={event => update("participantSignature", event.target.value)} placeholder="Type participant's full name" required /></Field><div className={`sc-enrollment-signature-field ${!form.participantSignatureImage && error.includes("required signature") ? "invalid" : ""}`}><span>Signature *</span><SignatureField value={form.participantSignatureImage} onOpen={() => setSignatureTarget("participant")} onClear={() => update("participantSignatureImage", "")} ariaLabel="Participant signature" required /></div></div></section>
          {form.hasGuardian && <section><h2>Guardian signature</h2><div className="sc-enrollment-grid two"><Field label="Full name" required><Input value={form.guardianSignature} onChange={event => update("guardianSignature", event.target.value)} placeholder="Type guardian's full name" required /></Field><div className={`sc-enrollment-signature-field ${!form.guardianSignatureImage && error.includes("required signature") ? "invalid" : ""}`}><span>Signature *</span><SignatureField value={form.guardianSignatureImage} onOpen={() => setSignatureTarget("guardian")} onClear={() => update("guardianSignatureImage", "")} ariaLabel="Guardian signature" required /></div></div></section>}
          {form.familyMemberParticipates && <section><h2>Family member signature</h2><div className="sc-enrollment-grid two"><Field label="Full name" required><Input value={form.familySignature} onChange={event => update("familySignature", event.target.value)} placeholder="Type family member's full name" required /></Field><div className={`sc-enrollment-signature-field ${!form.familySignatureImage && error.includes("required signature") ? "invalid" : ""}`}><span>Signature *</span><SignatureField value={form.familySignatureImage} onOpen={() => setSignatureTarget("family")} onClear={() => update("familySignatureImage", "")} ariaLabel="Family member signature" required /></div></div></section>}
          <section><h2>Date of signature</h2><div className="sc-enrollment-date"><DatePickerField id="sc-signature-date" label="Date" required ariaInvalid={!form.signedOn && error.includes("date of signature")} maxDate={new Date()} value={form.signedOn ? parseISO(form.signedOn) : undefined} onChange={date => update("signedOn", date ? format(date, "yyyy-MM-dd") : "")} /></div></section>
          <div className="sc-enrollment-note"><span>{isEditMode ? "Changes to the enrollment record will be saved. Formal enrollment still requires the completed program agreement and eligibility approval." : "This creates a pending client record. Formal enrollment still requires the completed program agreement and eligibility approval."}</span></div>
        </div>}

        {error && <p role="alert" className="sc-enrollment-error">{error}</p>}
        <div className="sc-enrollment-actions">
          {step === 0 ? <Button type="button" variant="outline" onClick={() => navigate(isEditMode && clientId ? Routes.agency.clientDetails.replace(":clientId", clientId) : Routes.agency.clients)} disabled={saving}>Cancel</Button> : <Button type="button" variant="outline" className="sc-enrollment-back" onClick={() => goTo(step - 1)} disabled={saving}>Go back</Button>}
          {step === 0 && <Button type="button" variant="outline" className="sc-enrollment-upload" onClick={() => { setPendingDocument(document); setUploadError(""); setUploadOpen(true); }}><Upload size={16} />{document ? document.name : "Upload document"}</Button>}
          <Button type="submit" disabled={saving || (step === 0 && !form.program)}>{saving ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Saving…</> : step === 5 ? isEditMode ? "Save changes" : "Submit enrollment" : step === 0 ? isEditMode ? "Continue editing" : "Get started" : "Continue"}</Button>
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
    <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
      <DialogContent showCloseButton={false} className="sc-enrollment-modal w-[min(92vw,440px)] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3"><DialogTitle className="text-[18px] leading-tight">Download & fill forms</DialogTitle><Button type="button" variant="ghost" size="icon" className="sc-enrollment-modal-close h-7 w-7 rounded-full bg-[#f2f4f6]" aria-label="Close upload dialog" onClick={() => setUploadOpen(false)}><X size={16} /></Button></div>
        <div className="mt-4"><p className="text-[12px] font-semibold text-[#10141a]">Upload your filled forms here</p><DialogDescription className="mt-1 text-[12px] leading-normal">Choose a completed enrollment document. It will be attached when you submit enrollment.</DialogDescription></div>
        <FileUpload label={pendingDocument ? pendingDocument.name : "Click to upload or drag and drop"} icon={<span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#59636e]"><UploadCloud size={19} /></span>} accept=".pdf,.png,.jpg,.jpeg" onFilesSelected={selectDocument} className="sc-enrollment-dropzone mt-4 min-h-[112px] max-w-none border-0 bg-[#f7f7f8]" />
        <p className="mt-1 text-center text-[11px] text-[#777f89]">PDF, PNG, or JPG · Max 10 MB</p>
        {uploadError && <p role="alert" className="mt-2 text-[12px] text-[#b42318]">{uploadError}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" className="h-9 rounded-lg px-3 text-[12px]" disabled>Download document here</Button><Button type="button" className="h-9 rounded-lg px-3 text-[12px]" disabled={!pendingDocument} onClick={() => { setDocument(pendingDocument); setUploadOpen(false); }}>Upload document</Button></div>
      </DialogContent>
    </Dialog>
    {signatureTarget && <Suspense fallback={null}><DigitalSignatureModal isOpen setIsOpen={open => { if (!open) setSignatureTarget(null); }} useCase="sc-enrollment" skipBackend onSave={saveSignature} disclaimer="This captures an acknowledgement of the enrollment overview. The formal participant enrollment agreement must be completed separately." /></Suspense>}
  </div>;
}
