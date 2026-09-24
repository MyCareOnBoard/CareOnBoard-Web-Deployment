import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowLeft, CircleHelp, FileText, X } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { normalizeSignaturePayload } from "@/pages/agency/billing/claims/utils/claimReportSignatureUtils";
import { getAgencyClientById, type Client } from "@/lib/api/clients";
import { DatePickerField, SignatureField } from "@/pages/shared/client-management/components/forms/formControls";
import { clients } from "@/pages/agency/clients-management/supportCoordinatorSampleClients";
import { Routes } from "@/routes/constants";
import SupportCoordinatorMonitoringTab from "./SupportCoordinatorMonitoringTab";
import SupportCoordinatorDocumentsTab from "./SupportCoordinatorDocumentsTab";

const DigitalSignatureModal = lazy(() => import("@/pages/applicant/application/components/DigitalSignature"));

const tabs = [
  { id: "assessment", label: "Assessment & Tier" },
  { id: "planning", label: "Planning" },
  { id: "services", label: "Services" },
  { id: "monitoring", label: "Monitoring" },
  { id: "documents", label: "Documents" },
] as const;

type Tab = (typeof tabs)[number]["id"];

const sampleOutcomes = [
  { goal: "will navigate the community.", support: "Individual Supports (Morning Star)" },
  { goal: "will be independent.", support: "Natural Supports Training" },
  { goal: "will be out in the community.", support: "Community Inclusion Services (Morning Star)" },
  { goal: "will socialize with new people.", support: "Respite (Hopes Promise Respite LLC)" },
];

const documentShortcuts = [
  { title: "ISP Quality Review", description: "Pre-finalization checklist", action: "Open →" },
  { title: "Participant Rights", description: "Rights & Responsibilities record", action: "Open →" },
  { title: "PCPT", description: "Person-Centered Planning Tool", action: "Review auto-Draft" },
  { title: "ISP", description: "Individualized Service Plan", action: "Review auto-Draft" },
];

const qualityReviewItems = [
  "Plan is person-centered and reflects individual preferences and goals",
  "Information is consistent with NJCAT assessment findings",
  "Goals are clearly documented with measurable outcomes",
  "Services correspond to identified needs and goals",
  "Provider information is complete and current",
  "Required signatures are complete (Participant, Guardian if applicable, SC)",
  "Required supporting documents are attached (Rights, Enrollment Agreement)",
  "Effective dates and authorization periods have been reviewed",
];

const participantRights = [
  "Be treated with dignity and respect",
  "Participate in ISP development and service choice",
  "Privacy and confidentiality of records (HIPAA)",
  "File a complaint or request a fair hearing",
  "Receive services free from abuse, neglect, and exploitation",
  "Be informed of available service options",
];

const rightsCompletionItems = [
  "Presented to participant / representative",
  "Reviewed together with participant",
  "Participant acknowledged understanding",
];

const sampleServices = [
  { name: "Individual supports", status: "Active", code: "H2016HT", provider: "Morning Star Supportive Services Corp", contact: "Madu Sarah", phone: "551.312.8522", authorization: "03/24/2026 → 03/23/2027", units: "90 hrs/week", rate: "$9.85", totalCost: "$197,728.90", frequency: "Weekly", pa: "Received", sdr: "Received" },
  { name: "Community Inclusion Services", status: "Active", code: "H2015H104", provider: "Morning Star Supportive Services Corp", contact: "Madu Sarah", phone: "551.312.8522", authorization: "03/24/2026 → 03/23/2027", units: "18 hrs/week", rate: "$8.50", totalCost: "$31,416.00", frequency: "Weekly", pa: "Missing", sdr: "Received" },
  { name: "Respite", status: "Review", code: "H2016H1", provider: "Hopes Promise Respite LLC", contact: "Renee Johnson", phone: "609.555.0142", authorization: "05/18/2026 → 08/01/2026", units: "8 days", rate: "$387.00", totalCost: "$3,096.00", frequency: "Weekly", pa: "Pending", sdr: "Pending" },
] as const;

type Service = {
  name: string; code: string; status: string; provider: string; contact: string; phone: string;
  authorization: string; units: string; rate: string; totalCost: string; frequency: string;
  pa: string; sdr: string; source?: string;
};

const sampleAuthorizationWeeks = ["Aug 10–16", "Aug 3–9", "Jul 27–Aug 2", "Jul 20–26", "Jul 13–19"];

export default function SupportCoordinatorClientDetailsPage() {
  const { clientId } = useParams();
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab: Tab = requestedTab === "profile-isp" ? "assessment" : tabs.some(({ id }) => id === requestedTab) ? requestedTab as Tab : "assessment";
  const sample = clients.find((client) => client.id === clientId);
  const [savedClient, setSavedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(Boolean(!sample && clientId));
  const [error, setError] = useState(false);
  const [selectedShortcut, setSelectedShortcut] = useState<string | null>(null);
  const [confirmedItems, setConfirmedItems] = useState<number[]>([]);
  const [reviewerName, setReviewerName] = useState("");
  const [correctionsNote, setCorrectionsNote] = useState("");
  const [showCorrectionsNote, setShowCorrectionsNote] = useState(false);
  const [reviewSaved, setReviewSaved] = useState(false);
  const [rightsChecked, setRightsChecked] = useState<number[]>([]);
  const [rightsDob, setRightsDob] = useState<Date | undefined>();
  const [rightsSignature, setRightsSignature] = useState("");
  const [rightsSignatureOpen, setRightsSignatureOpen] = useState(false);
  const [rightsSignatureError, setRightsSignatureError] = useState("");
  const [rightsSaved, setRightsSaved] = useState(false);

  useEffect(() => {
    setSelectedShortcut(null);
    setConfirmedItems([]);
    setReviewerName("");
    setCorrectionsNote("");
    setShowCorrectionsNote(false);
    setReviewSaved(false);
    setRightsChecked([]);
    setRightsDob(undefined);
    setRightsSignature("");
    setRightsSignatureOpen(false);
    setRightsSignatureError("");
    setRightsSaved(false);
  }, [clientId]);

  useEffect(() => {
    if (sample || !clientId) return;
    const controller = new AbortController();
    getAgencyClientById(clientId, { mode: "sc", signal: controller.signal })
      .then((client) => { setSavedClient(client); setError(false); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [clientId, sample]);

  const name = sample?.name || [savedClient?.firstName, savedClient?.middleName, savedClient?.lastName].filter(Boolean).join(" ");
  const initials = sample?.initials || name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
  const firstName = name.split(" ")[0] || "Participant";
  const county = sample?.county || savedClient?.countyState || "County not set";
  const program = sample?.program || savedClient?.scEnrollment?.program;
  const period = sample?.isp || "Dates not set";
  const tier = sample?.tier || savedClient?.tier || "Not set";
  const planId = sample ? "10.04" : savedClient?.ispMetadata?.planId || "Not set";
  const outcomes = sample ? sampleOutcomes : savedClient?.ispOutcomes ? [{ goal: savedClient.ispOutcomes, support: "" }] : [];

  const tabLink = (tab: Tab) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    return `?${params.toString()}`;
  };

  if (loading) return <p className="px-6 py-12 text-center text-[#6b7280]">Loading client details…</p>;
  if (error || !name) return (
    <div className="rounded-2xl bg-white p-8 text-center">
      <p className="mb-4 text-[#10141a]">Client details could not be found.</p>
      <Button asChild variant="outline"><Link to={Routes.agency.clients}>Back to clients</Link></Button>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-200px)] px-4 pb-8 sm:px-6 lg:px-0">
      <Link to={Routes.agency.clients} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#008f93] hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to clients
      </Link>
      <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-[#e5e7eb] pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-12 w-12 shrink-0">
              {(savedClient?.profileImage || sample?.id === "182441") && <AvatarImage src={savedClient?.profileImage || "/user-profile-image.png"} alt="" className="object-cover" />}
              <AvatarFallback className="bg-[#e6f8f8] font-semibold text-[#007f84]">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-[#10141a]">{name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-[#4b5563]">
                <span>ID: {sample?.id || savedClient?.id}</span><span aria-hidden="true">·</span><span>{county}</span>
                {program && <Badge variant="outline" className="border-[#2b82ff] text-[#2b82ff]">{program}</Badge>}
              </div>
            </div>
          </div>
          <p className="text-sm text-[#10141a]"><strong className="mr-1 text-lg">{sample ? "ISP Active" : "ISP period"}</strong>{period}</p>
        </header>

        <nav aria-label="Client details tabs" className="mt-5 flex gap-2 overflow-x-auto border-b border-[#e5e7eb] pb-3">
          {tabs.map((tab) => (
            <Link key={tab.id} to={tabLink(tab.id)} aria-current={activeTab === tab.id ? "page" : undefined}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00b4b8] ${activeTab === tab.id ? "border-[#00b4b8] bg-[#00b4b8] text-white" : "border-[#e5e7eb] text-[#4b5563] hover:border-[#00b4b8] hover:text-[#008f93]"}`}>
              {tab.label}
            </Link>
          ))}
        </nav>

        <main className="pt-6">
          {activeTab === "assessment" ? <AssessmentTab tier={tier} lastName={name.split(" ").at(-1) || name} sample={Boolean(sample)} /> : activeTab === "planning" ? (
            <section aria-labelledby="sc-planning-heading">
              <div className="mb-6">
                <h2 id="sc-planning-heading" className="text-2xl font-semibold text-[#10141a]">Person-Centered Planning</h2>
                <p className="mt-1 text-sm text-[#4b5563]">Master Client Profile · PCPT · ISP · Rights &amp; Responsibilities</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:gap-6">
                <InfoCard label="ISP Plan ID" value={planId} source={sample ? "iRecord" : undefined} />
                <InfoCard label="ISP Period" value={period} source={sample ? "iRecord" : undefined} />
                <InfoCard label="DDD Tier" value={tier} source={sample ? "Tier Letter" : undefined} />
                <InfoCard label="Program" value={program || "Not set"} source={sample ? "LUCR" : undefined} />
              </div>
              <section aria-labelledby="sc-isp-outcomes-heading" className="mt-6 rounded-xl border border-[#e5e7eb] p-4 sm:p-5">
                <h3 id="sc-isp-outcomes-heading" className="text-lg font-semibold text-[#008f93]">ISP Outcomes</h3>
                {outcomes.length ? <div className="mt-5 divide-y divide-[#e5e7eb]">{outcomes.map((outcome, index) => (
                  <div key={index} className="grid gap-1 py-4 first:pt-0 last:pb-0 sm:grid-cols-[90px_1fr]">
                    <span className="text-sm font-semibold text-[#008f93]">Outcome {index + 1}</span>
                    <div><p className="text-sm font-semibold text-[#10141a]">{sample ? `${firstName} ${outcome.goal}` : outcome.goal}</p>{outcome.support && <p className="mt-0.5 text-sm text-[#6b7280]">{outcome.support}</p>}</div>
                  </div>
                ))}</div> : <p className="mt-4 text-sm text-[#6b7280]">No ISP outcomes recorded yet.</p>}
              </section>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {documentShortcuts.map((item) => <button key={item.title} type="button" onClick={() => setSelectedShortcut(item.title)} className="h-full w-full cursor-pointer rounded-xl border border-[#e5e7eb] p-4 text-left transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-[#00b4b8] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00b4b8]">
                  <p className="text-sm font-semibold text-[#10141a]">{item.title}</p>
                  <p className="mt-1 text-sm text-[#4b5563]">{item.description}</p>
                  <p className="mt-2 text-xs font-semibold text-[#008f93]">{(item.title === "ISP Quality Review" && reviewSaved) || (item.title === "Participant Rights" && rightsSaved) ? "Saved in this preview" : item.action}</p>
                </button>)}
              </div>
            </section>
          ) : activeTab === "services" ? <ServiceAuthorizationTab key={clientId} sample={Boolean(sample)} /> : activeTab === "monitoring" ? <SupportCoordinatorMonitoringTab key={clientId} sample={Boolean(sample)} /> : activeTab === "documents" ? <SupportCoordinatorDocumentsTab key={clientId} sample={Boolean(sample)} /> : (
            <section aria-label={`${tabs.find((tab) => tab.id === activeTab)?.label} tab`} className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#d1d5db] px-6 text-center">
              <FileText className="mb-3 h-8 w-8 text-[#008f93]" />
              <h2 className="text-xl font-semibold text-[#10141a]">{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
              <p className="mt-2 text-sm text-[#6b7280]">This section is ready for client records.</p>
            </section>
          )}
        </main>
      </div>
      <Dialog open={selectedShortcut !== null} onOpenChange={(open) => { if (!open && !rightsSignatureOpen) setSelectedShortcut(null); }}>
        {selectedShortcut && <DialogContent showCloseButton={false} onPointerDownOutside={(event) => { if (rightsSignatureOpen) event.preventDefault(); }} onInteractOutside={(event) => { if (rightsSignatureOpen) event.preventDefault(); }} className={"max-h-[calc(100vh-32px)] w-[calc(100vw-32px)] overflow-y-auto p-4 sm:p-5 " + (selectedShortcut === "ISP Quality Review" || selectedShortcut === "Participant Rights" ? "max-w-[480px]" : "max-w-[400px]")}>
          {selectedShortcut === "ISP Quality Review" ? <form onSubmit={(event) => {
            event.preventDefault();
            if (confirmedItems.length < qualityReviewItems.length && !correctionsNote.trim()) {
              setShowCorrectionsNote(true);
              return;
            }
            setReviewSaved(true);
            setSelectedShortcut(null);
          }}>
            <DialogTitle className="text-xl leading-7">ISP Quality Review Checklist</DialogTitle>
            <DialogDescription className="mt-1 border-b border-[#e5e7eb] pb-3 text-sm leading-5 text-[#4b5563]">Complete this checklist before ISP finalization. All items must be confirmed or a corrections note must be added.</DialogDescription>
            <div className="space-y-3 py-4">
              {qualityReviewItems.map((item, index) => <div key={item} className="[&_label]:items-start [&_label]:gap-2">
                <Checkbox label={item} checked={confirmedItems.includes(index)} onChange={() => {
                  setConfirmedItems((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index]);
                  setReviewSaved(false);
                }} className="mt-0.5 size-4 shrink-0 self-start rounded border-[#00a4a8]" labelClassName="text-sm font-normal leading-5" />
              </div>)}
            </div>
            <p className="rounded border border-[#e5e7eb] px-2 py-1 text-sm text-[#374151]" aria-live="polite">{confirmedItems.length} of {qualityReviewItems.length} items confirmed</p>
            {showCorrectionsNote && confirmedItems.length < qualityReviewItems.length && <div className="mt-4">
              <label htmlFor="sc-review-corrections" className="mb-1 block text-sm font-medium text-[#10141a]">Corrections note*</label>
              <Textarea id="sc-review-corrections" value={correctionsNote} onChange={(event) => { setCorrectionsNote(event.target.value); setReviewSaved(false); }} placeholder="Describe the items that need correction" required className="resize-y" />
              {!correctionsNote.trim() && <p className="mt-1 text-xs text-[#ad182d]">Add a note for the unconfirmed items.</p>}
            </div>}
            <div className="mt-4">
              <label htmlFor="sc-reviewer-name" className="mb-1 block text-sm font-medium text-[#10141a]">Reviewer's name*</label>
              <Input id="sc-reviewer-name" value={reviewerName} onChange={(event) => { setReviewerName(event.target.value); setReviewSaved(false); }} placeholder="SC or Supervisor's name" required pattern=".*\S.*" title="Enter the reviewer's name" maxLength={120} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSelectedShortcut(null)}>Cancel</Button>
              <Button type="submit">Save review</Button>
            </div>
          </form> : selectedShortcut === "Participant Rights" ? <form onSubmit={(event) => {
            event.preventDefault();
            setRightsSaved(true);
            setSelectedShortcut(null);
          }}>
            <DialogTitle className="text-xl leading-7">Participant Rights &amp; Responsibilities</DialogTitle>
            <DialogDescription className="mt-1 border-b border-[#e5e7eb] pb-3 text-sm leading-5 text-[#4b5563]">Document that the participant's rights and responsibilities were reviewed as required by DDD.</DialogDescription>
            <div className="mt-4 rounded-lg border border-[#dce6eb] bg-[#f2f8fa] p-3 text-sm text-[#374151]">
              <p className="font-semibold text-[#10141a]">Rights include the right to:</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 marker:text-[#ad182d]">
                {participantRights.map((right) => <li key={right}>{right}</li>)}
              </ul>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-[#10141a]">Completion status</p>
              <div className="space-y-2">
                {rightsCompletionItems.map((item, index) => <div key={item} className="[&_label]:items-start [&_label]:gap-2">
                  <Checkbox label={item} checked={rightsChecked.includes(index)} onChange={() => {
                    setRightsChecked((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index]);
                    setRightsSaved(false);
                  }} className="mt-0.5 size-4 shrink-0 self-start rounded border-[#00a4a8]" labelClassName="text-sm font-normal leading-5" />
                </div>)}
              </div>
            </div>
            <div className="mt-4">
              <DatePickerField id="sc-rights-dob" label="Date of birth" value={rightsDob} onChange={(date) => { setRightsDob(date); setRightsSaved(false); }} placeholder="-- Select DOB --" maxDate={new Date()} />
            </div>
            <div className="mt-4">
              <p className="mb-1 text-sm font-medium text-[#10141a]">Participant / Representative Signature</p>
              <SignatureField id="sc-rights-signature" value={rightsSignature} onOpen={() => setRightsSignatureOpen(true)} onClear={() => { setRightsSignature(""); setRightsSaved(false); }} ariaLabel="Participant or representative signature" />
              {rightsSignatureError && <p role="alert" className="mt-1 text-xs text-[#ad182d]">{rightsSignatureError}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSelectedShortcut(null)}>Cancel</Button>
              <Button type="submit">Save record</Button>
            </div>
          </form> : <>
            <DialogTitle className="text-xl leading-7">{selectedShortcut}</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-[#4b5563]">This preview is not available yet.</DialogDescription>
            <div className="mt-6 flex justify-end"><Button variant="outline" onClick={() => setSelectedShortcut(null)}>Close</Button></div>
          </>}
        </DialogContent>}
      </Dialog>
      {rightsSignatureOpen && <Suspense fallback={null}><DigitalSignatureModal isOpen setIsOpen={setRightsSignatureOpen} nested skipBackend useCase="sc-participant-rights" onSave={async (payload) => {
        try {
          const normalized = await normalizeSignaturePayload(payload as Parameters<typeof normalizeSignaturePayload>[0]);
          if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(normalized.signatureData) || normalized.signatureData.length > 100000) {
            setRightsSignatureError("This signature could not be saved. Please try a smaller signature.");
            return;
          }
          setRightsSignature(normalized.signatureData);
          setRightsSignatureError("");
          setRightsSaved(false);
        } catch {
          setRightsSignatureError("This signature could not be saved. Please try again.");
        }
      }} disclaimer="This captures a participant or representative acknowledgement of the rights review." /></Suspense>}
    </div>
  );
}

function InfoCard({ label, value, source }: { label: string; value: string; source?: string }) {
  return <div className="rounded-xl border border-[#e5e7eb] px-4 py-3">
    <p className="text-sm font-medium text-[#10141a]">{label}</p>
    <p className="mt-1 text-base font-semibold text-[#10141a]">{value}</p>
    {source && <p className="mt-2 inline-block rounded bg-[#f9fafb] px-1.5 py-0.5 text-xs text-[#4b5563]">Source: {source}</p>}
  </div>;
}

function ServiceAuthorizationTab({ sample }: { sample: boolean }) {
  const [preview, setPreview] = useState<"Add service" | Service | null>(null);
  const [documentWeek, setDocumentWeek] = useState<string | null>(null);
  const [addedServices, setAddedServices] = useState<Service[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [unit, setUnit] = useState("");
  const [frequency, setFrequency] = useState("Weekly");
  const [formError, setFormError] = useState("");
  const services: Service[] = sample ? [...sampleServices, ...addedServices] : addedServices;
  const selectedService = preview && preview !== "Add service" ? preview : null;
  return <section aria-labelledby="sc-services-heading">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 id="sc-services-heading" className="text-2xl font-semibold text-[#10141a]">Service Authorization</h2>
        <p className="mt-1 text-sm text-[#4b5563]">Services · Providers · PA Records · SDR · Authorized Units</p>
      </div>
      <Button type="button" className="h-9 px-3 text-sm" style={{ borderRadius: 8 }} onClick={() => { setStartDate(undefined); setEndDate(undefined); setUnit(""); setFrequency("Weekly"); setFormError(""); setPreview("Add service"); }}>Add service</Button>
    </div>
    {services.length ? <div className="space-y-5">
      {services.map((service, index) => <article key={service.name + service.code + index} className="rounded-xl border border-[#e5e7eb] p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="text-lg font-medium text-[#10141a]">{service.name}</h3>
          <span className={"rounded px-2 py-0.5 text-xs font-semibold " + (service.status === "Active" ? "bg-[#e8fff2] text-[#047857]" : "bg-[#fff8e9] text-[#a16207]")}>{service.status}</span>
          <span className="text-xs text-[#8a929e]">{service.code}</span>
          <button type="button" className="ml-auto cursor-pointer text-sm font-semibold text-[#008f93] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00b4b8]" onClick={() => { setDocumentWeek(null); setPreview(service); }}>View details</button>
        </div>
        <div className="mt-3 grid gap-y-4 border-t border-[#eef0f2] pt-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Provider", service.provider], ["Authorization", service.authorization],
            ["Authorized Units", service.units], ["Rate", service.rate],
            ["Total Cost", service.totalCost], ["Frequency", service.frequency],
          ].map(([label, value], index) => <div key={label} className={"min-w-0 " + (index % 2 ? "sm:border-l sm:border-[#eef0f2] sm:pl-3" : index === 2 ? "xl:border-l xl:border-[#eef0f2] xl:pl-3" : "")}>
            <p className="text-xs text-[#6b7280]">{label}</p>
            <p className="mt-1 break-words text-sm font-medium text-[#10141a]">{value}</p>
          </div>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#f3f4f6] pt-3 text-xs">
          {([["PA", service.pa], ["SDR", service.sdr]] as const).map(([label, status]) => <span key={label} className="inline-flex items-center gap-1.5 text-[#4b5563]">
            <span aria-hidden="true" className={"size-1.5 rounded-full " + (status === "Received" ? "bg-[#00a878]" : status === "Missing" ? "bg-[#d11f35]" : "bg-[#d99b20]")} />
            {label}: <span className={"font-medium " + (status === "Missing" ? "text-[#ad182d]" : "text-[#10141a]")}>{status}</span>
          </span>)}
          <span className="text-[#6b7280]">Source: {service.source ?? "DDD / iRecord"}</span>
        </div>
      </article>)}
    </div> : <p className="rounded-xl border border-dashed border-[#d1d5db] px-6 py-12 text-center text-sm text-[#6b7280]">No service authorizations recorded yet.</p>}
    <Dialog open={preview !== null} onOpenChange={(open) => { if (!open) { setPreview(null); setDocumentWeek(null); } }}>
      {preview && <DialogContent showCloseButton={false} className={"max-h-[calc(100vh-32px)] w-[calc(100vw-32px)] " + (preview === "Add service" ? "flex max-w-[640px] flex-col overflow-hidden rounded-[28px] p-5 sm:p-7" : "max-w-[520px] overflow-y-auto p-4 sm:p-5")}>
        <DialogTitle className={preview === "Add service" ? "shrink-0 border-b border-[#eef0f2] pb-4 text-2xl font-semibold leading-8" : "text-xl font-medium leading-7"}>{selectedService?.name ?? "Add service"}</DialogTitle>
        {preview === "Add service" ? <>
          <DialogDescription className="sr-only">Enter a service authorization to add it to this preview.</DialogDescription>
          <button type="button" aria-label="Close add service" onClick={() => setPreview(null)} className="absolute right-5 top-5 flex size-9 cursor-pointer items-center justify-center rounded-full bg-[#f0f3f5] text-[#303741] hover:bg-[#e4ebed] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00b4b8] sm:right-7 sm:top-7"><X className="size-4" /></button>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const name = String(data.get("name") ?? "").trim();
            const code = String(data.get("code") ?? "").trim();
            const provider = String(data.get("provider") ?? "").trim();
            const totalUnits = Number(data.get("totalUnits"));
            const rate = Number(data.get("rate"));
            if (!name || !code || !provider || !startDate || !endDate || !unit || !Number.isFinite(totalUnits) || totalUnits <= 0 || !Number.isFinite(rate) || rate < 0) {
              setFormError("Complete all service fields before adding the service.");
              return;
            }
            if (endDate < startDate) {
              setFormError("End date must be on or after the start date.");
              return;
            }
            const dateOptions = { month: "2-digit", day: "2-digit", year: "numeric" } as const;
            setAddedServices((current) => [...current, {
              name, code, provider, status: "Review", contact: "—", phone: "—",
              authorization: startDate.toLocaleDateString("en-US", dateOptions) + " → " + endDate.toLocaleDateString("en-US", dateOptions),
              units: totalUnits.toLocaleString("en-US") + " total · " + unit,
              rate: rate.toLocaleString("en-US", { style: "currency", currency: "USD" }),
              totalCost: (totalUnits * rate).toLocaleString("en-US", { style: "currency", currency: "USD" }),
              frequency, pa: "Pending", sdr: "Pending", source: "Local preview",
            }]);
            setPreview(null);
            setStartDate(undefined);
            setEndDate(undefined);
            setUnit("");
            setFrequency("Weekly");
            setFormError("");
          }}>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-0.5 py-5">
            <div><label htmlFor="sc-service-name" className="mb-2 block text-sm font-semibold text-[#10141a]">Service name<span aria-hidden="true" className="ml-0.5 text-[#d53411]">*</span></label><Input id="sc-service-name" name="name" required maxLength={120} placeholder="e.g. Community Inclusion Services" className="h-12 rounded-xl border-[#e5e7eb] text-base placeholder:text-[#9ca3af]" /></div>
            <div><label htmlFor="sc-service-code" className="mb-2 block text-sm font-semibold text-[#10141a]">Service code<span aria-hidden="true" className="ml-0.5 text-[#d53411]">*</span></label><Input id="sc-service-code" name="code" required maxLength={40} placeholder="e.g. H2015H104" className="h-12 rounded-xl border-[#e5e7eb] text-base placeholder:text-[#9ca3af]" /></div>
            <div><label htmlFor="sc-service-provider" className="mb-2 block text-sm font-semibold text-[#10141a]">Provider / Agency<span aria-hidden="true" className="ml-0.5 text-[#d53411]">*</span></label><Input id="sc-service-provider" name="provider" required maxLength={120} placeholder="Agency name" className="h-12 rounded-xl border-[#e5e7eb] text-base placeholder:text-[#9ca3af]" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="[&_label]:text-sm [&_label]:font-medium [&_label]:text-[#10141a]"><DatePickerField id="sc-service-start-date" label="Start date" value={startDate} onChange={(date) => { setStartDate(date); setFormError(""); }} placeholder="Select start date" required ariaInvalid={Boolean(formError && !startDate)} /></div>
              <div className="[&_label]:text-sm [&_label]:font-medium [&_label]:text-[#10141a]"><DatePickerField id="sc-service-end-date" label="End date" value={endDate} onChange={(date) => { setEndDate(date); setFormError(""); }} placeholder="Select end date" required ariaInvalid={Boolean(formError && !endDate)} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="sc-service-units" className="mb-2 block text-sm font-semibold text-[#10141a]">Total authorized units<span aria-hidden="true" className="ml-0.5 text-[#d53411]">*</span></label><Input id="sc-service-units" name="totalUnits" type="number" inputMode="numeric" min="1" step="1" required placeholder="e.g. 120 total units" className="h-12 rounded-xl border-[#e5e7eb] text-base placeholder:text-[#9ca3af]" /></div>
              <div><label htmlFor="sc-service-unit" className="mb-2 block text-sm font-semibold text-[#10141a]">Unit<span aria-hidden="true" className="ml-0.5 text-[#d53411]">*</span></label><Select value={unit} required onValueChange={(value) => { setUnit(value); setFormError(""); }}><SelectTrigger id="sc-service-unit" aria-label="Unit" aria-invalid={Boolean(formError && !unit)} className="h-12 w-full rounded-xl border-[#e5e7eb] text-base"><SelectValue placeholder="Select unit" /></SelectTrigger><SelectContent>{["15 min", "Hourly", "Daily", "Weekly", "Mile"].map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="sc-service-rate" className="mb-2 block text-sm font-semibold text-[#10141a]">Rate<span aria-hidden="true" className="ml-0.5 text-[#d53411]">*</span></label><Input id="sc-service-rate" name="rate" type="number" inputMode="decimal" min="0" step="0.01" required placeholder="Price per selected unit" className="h-12 rounded-xl border-[#e5e7eb] text-base placeholder:text-[#9ca3af]" /></div>
              <div><label htmlFor="sc-service-frequency" className="mb-2 block text-sm font-medium text-[#10141a]">Frequency<span aria-hidden="true" className="ml-0.5 text-[#d53411]">*</span></label><Select value={frequency} required onValueChange={setFrequency}><SelectTrigger id="sc-service-frequency" aria-label="Frequency" className="h-12 w-full rounded-xl border-[#e5e7eb] text-base"><SelectValue /></SelectTrigger><SelectContent>{["Daily", "Weekly", "Monthly", "As needed"].map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>
            </div>
            </div>
            <div className="shrink-0 border-t border-[#eef0f2] pt-4">
              {formError && <p role="alert" className="mb-3 text-sm text-[#ad182d]">{formError}</p>}
              <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setPreview(null)} className="rounded-lg">Cancel</Button><Button type="submit" className="rounded-lg">Add service</Button></div>
            </div>
          </form>
        </> : selectedService ? <>
          <DialogDescription className="sr-only">Service authorization, prior authorization history, and SDR record</DialogDescription>
          <div className="flex items-center gap-2 border-b border-[#e5e7eb] pb-3 text-xs">
            <span className={"rounded px-2 py-0.5 font-semibold " + (selectedService.status === "Active" ? "bg-[#e8fff2] text-[#047857]" : "bg-[#fff8e9] text-[#a16207]")}>{selectedService.status}</span>
            <span className="text-[#8a929e]">{selectedService.code}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {([
              ["Provider", selectedService.provider], ["Contact", selectedService.contact], ["Phone", selectedService.phone],
              ["Start Date", selectedService.authorization.split(" → ")[0]], ["End Date", selectedService.authorization.split(" → ")[1]], ["Authorized", selectedService.units],
              ["Rate", selectedService.rate], ["Total Cost", selectedService.totalCost], ["Frequency", selectedService.frequency],
            ] as const).map(([label, value]) => <div key={label} className="min-w-0 rounded border border-[#ebedf0] bg-[#fafbfc] px-2.5 py-2 text-xs">
              <p className="text-[#8a929e]">{label}</p>
              <p className="mt-0.5 break-words font-medium text-[#10141a]">{value}</p>
            </div>)}
          </div>
          <div className="mt-2">
            <h3 className="mb-1 text-xs font-semibold uppercase text-[#303741]">Prior authorization history</h3>
            {selectedService.pa === "Received" ? <div className="overflow-hidden rounded border border-[#e5e7eb]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#fafbfc] text-[#303741]"><tr><th scope="col" className="px-2.5 py-1.5">Week</th><th scope="col" className="px-2.5 py-1.5">Status</th><th scope="col" className="px-2.5 py-1.5">Document</th></tr></thead>
                <tbody>{sampleAuthorizationWeeks.map((week) => <tr key={week} className="border-t border-[#f0f1f3]">
                  <td className="px-2.5 py-1.5 text-[#303741]">{week}</td>
                  <td className="px-2.5 py-1.5 text-[#303741]"><span aria-hidden="true" className="mr-1.5 inline-block size-1.5 rounded-full bg-[#00a878]" />✓ Received</td>
                  <td className="px-2.5 py-1.5"><button type="button" className="cursor-pointer font-medium text-[#008f93] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00b4b8]" aria-label={"View PA document for " + week} onClick={() => setDocumentWeek(week)}>View</button></td>
                </tr>)}</tbody>
              </table>
            </div> : <p className="rounded border border-[#e5e7eb] px-3 py-2 text-xs text-[#6b7280]">{selectedService.pa === "Missing" ? "No prior authorization history recorded." : "Prior authorization is pending."}</p>}
            {documentWeek && <p role="status" className="mt-2 text-xs text-[#6b7280]">Sample PA document for {documentWeek} is not available yet.</p>}
          </div>
          <div className="mt-1">
            <h3 className="mb-1 text-xs font-semibold uppercase text-[#303741]">SDR record</h3>
            <div className={"flex flex-wrap items-center justify-between gap-2 rounded border px-2.5 py-2 text-xs " + (selectedService.sdr === "Received" ? "border-[#b7f0d5] bg-[#f0fff8]" : "border-[#f5dfb1] bg-[#fffaf0]")}>
              <span className="text-[#303741]"><span aria-hidden="true" className={"mr-1.5 inline-block size-1.5 rounded-full " + (selectedService.sdr === "Received" ? "bg-[#00a878]" : "bg-[#d99b20]")} /><strong>{selectedService.sdr}</strong>{selectedService.sdr === "Received" && " · Effective " + selectedService.authorization.split(" → ")[0]}</span>
              <span className="text-[#6b7280]">Source: {selectedService.source ?? "DDD / iRecord"}</span>
            </div>
          </div>
        </> : null}
        {selectedService && <div className="mt-2 flex justify-end"><Button variant="outline" onClick={() => setPreview(null)}>Close</Button></div>}
      </DialogContent>}
    </Dialog>
  </section>;
}

function AssessmentTab({ tier, lastName, sample }: { tier: string; lastName: string; sample: boolean }) {
  const [answer, setAnswer] = useState<"yes" | "pending" | "unavailable">(sample ? "yes" : "pending");
  const [assessmentDate, setAssessmentDate] = useState<Date | undefined>(sample ? new Date(2026, 3, 7) : undefined);
  const [determinationDate, setDeterminationDate] = useState<Date | undefined>(sample ? new Date(2026, 3, 7) : undefined);
  const [effectiveDate, setEffectiveDate] = useState<Date | undefined>(sample ? new Date(2026, 3, 7) : undefined);
  const history = [
    { year: "2026", tier, date: "02/23/2026", source: "DDD / State record", current: true, reviewedBy: "T. Booker", notes: `Annual reassessment. ${tier} confirmed. Level of care met per NJCAT review on 02/23/2026.` },
    { year: "2023", tier: "Tier C", date: "04/11/2023", source: "DDD / State record", current: false, reviewedBy: "—", notes: "Historical NJCAT assessment. Tier C recorded on 04/11/2023." },
    { year: "2020", tier: "Tier C", date: "01/08/2020", source: "Document provided to SCA", current: false, reviewedBy: "—", notes: "Historical NJCAT assessment. Tier C recorded on 01/08/2020." },
  ];
  const [selectedDocument, setSelectedDocument] = useState<"njcat" | "tier" | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<(typeof history)[number] | null>(null);
  const isTierLetter = selectedDocument === "tier";

  return <section aria-labelledby="sc-assessment-heading">
    <h2 id="sc-assessment-heading" className="text-2xl font-semibold text-[#10141a]">DDD Assessment &amp; Determination</h2>
    <p className="mt-1 text-sm text-[#4b5563]">Record available DDD assessment and tier information. Do not re-administer the NJCAT in CareOnBoard.</p>
    <p className="mt-1 text-xs text-[#6b7280]">Preview only — changes here are not saved yet.</p>

    <div className="mt-6 rounded-xl border border-[#f9d681] bg-[#fffbef] p-4 text-sm text-[#a44a09]">
      <p className="font-semibold">Next Step: DDD Assessment Information</p>
      <p className="mt-1">Do you have DDD assessment information for this client?</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {([
          ["yes", "Yes, I have information"],
          ["pending", "No, information is pending"],
          ["unavailable", "Not applicable / not yet available"],
        ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={answer === value} onClick={() => setAnswer(value)}
          className={`rounded-md border border-[#e3a646] px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b45309] ${answer === value ? "bg-[#a94b08] text-white" : "bg-white text-[#a44a09] hover:bg-[#fff4d3]"}`}>
          {label}
        </button>)}
      </div>
    </div>

    {answer === "yes" && <div className="mt-7 grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="sc-njcat-status-heading">
        <h3 id="sc-njcat-status-heading" className="border-b border-[#f7d9dc] pb-2 text-sm font-semibold text-[#10141a]">Section A — NJCAT Status</h3>
        <div className="mt-4 space-y-4">
          <AssessmentSelect label="NJCAT Status" value={sample ? "Available" : "Not selected"} options={["Not selected", "Available", "Pending", "Not available"]} />
          <DatePickerField id="sc-njcat-assessment-date" label="NJCAT Assessment Date" value={assessmentDate} onChange={setAssessmentDate} />
          <AssessmentSelect label="Assessment Source" value={sample ? "DDD / State record" : "Not selected"} options={["Not selected", "DDD / State record", "Document provided to SCA", "Other"]} />
          {sample ? <SampleDocument label="NJCAT Document" filename={`NJCAT_${lastName}_2026.pdf`} onView={() => setSelectedDocument("njcat")} /> : <p className="text-sm text-[#6b7280]">No NJCAT document recorded.</p>}
        </div>
      </section>
      <section aria-labelledby="sc-tier-heading">
        <h3 id="sc-tier-heading" className="border-b border-[#f7d9dc] pb-2 text-sm font-semibold text-[#10141a]">Section B — DDD Tier Determination</h3>
        <div className="mt-4 space-y-4">
          <AssessmentSelect label="Tier" value={tier} options={["Not set", "Tier A", "Tier B", "Tier C", "Tier D", "Tier E"]} />
          <div className="grid gap-4 sm:grid-cols-2">
            <DatePickerField id="sc-determination-date" label="Determination Date" value={determinationDate} onChange={setDeterminationDate} />
            <DatePickerField id="sc-effective-date" label="Effective Date" value={effectiveDate} onChange={setEffectiveDate} />
          </div>
          <AssessmentSelect label="Tier Letter Available?" value={sample ? "Yes" : "Pending"} options={["Yes", "No", "Pending"]} />
          {sample ? <SampleDocument label="Tier Letter Document" filename={`TierLetter_${lastName}_2026.pdf`} onView={() => setSelectedDocument("tier")} /> : <p className="text-sm text-[#6b7280]">No tier letter recorded.</p>}
        </div>
      </section>
    </div>}

    <section aria-labelledby="sc-assessment-history-heading" className="mt-7">
      <h3 id="sc-assessment-history-heading" className="border-b border-[#f7d9dc] pb-2 text-sm font-semibold text-[#10141a]">Assessment History / Timeline</h3>
      <p className="mt-3 text-sm text-[#6b7280]">Previous assessments are preserved and never overwritten.</p>
      {sample ? <div className="mt-2 space-y-2">
        {history.map((item) => <div key={item.year} className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-3 text-sm ${item.current ? "border-[#fce3e7] bg-[#fff0f2]" : "border-[#f1f2f3] bg-[#fbfbfc]"}`}>
          <span className="text-[#6b7280]">{item.year}</span><span className="font-medium text-[#10141a]">NJCAT</span><span>{item.tier}</span><span className="text-[#6b7280]">{item.date}</span>
          <span className="ml-auto text-[#8a929e]">{item.source}</span>
          <span className={`rounded px-2 py-1 ${item.current ? "bg-white text-[#047857]" : "bg-white text-[#6b7280]"}`}>{item.current ? "Current" : "Historical"}</span>
          <button type="button" aria-label={`View NJCAT history for ${item.year}`} onClick={() => setSelectedHistory(item)} className="font-medium text-[#ad182d] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ad182d]">View</button>
        </div>)}
      </div> : <p className="mt-3 text-sm text-[#6b7280]">No assessment history recorded yet.</p>}
    </section>

    {answer !== "yes" && <section aria-labelledby="sc-data-lineage-heading" className="mt-5 rounded-xl border border-[#e5e7eb] p-4">
      <h3 id="sc-data-lineage-heading" className="text-sm font-semibold text-[#10141a]">Data Lineage</h3>
      <div className="mt-4 space-y-2 text-sm">
        {(sample ? [["DDD Tier", tier, "Tier Letter (DDD / iRecord)"], ["Medical Support Need", "—", "NJCAT — Medical Domain"], ["Employment Goal", "—", "LUCR — Goals"]] : [["DDD Tier", tier, "Not recorded"]]).map(([label, value, source]) =>
          <div key={label} className="flex flex-wrap items-center justify-between gap-2"><span>{label}: {value}</span><span className="rounded border border-[#e5e7eb] px-2 py-0.5 text-xs text-[#6b7280]">Source: {source}</span></div>)}
      </div>
    </section>}
    <Dialog open={selectedDocument !== null} onOpenChange={(open) => { if (!open) setSelectedDocument(null); }}>
      <DialogContent showCloseButton={false} className="max-h-[min(90vh,720px)] w-[calc(100vw-32px)] max-w-[400px] overflow-y-auto p-4 sm:p-5">
        <DialogTitle className="text-xl leading-7">{isTierLetter ? `Tier Letter — ${tier}` : "NJCAT Assessment"}</DialogTitle>
        <DialogDescription className="mt-2 flex items-center gap-2 text-sm">
          <span className="rounded bg-[#e8fff2] px-1.5 py-0.5 text-xs font-semibold text-[#047857]">Current</span>
          Assessment
        </DialogDescription>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#e5e7eb] pt-3">
          {[
            ["Document Type", isTierLetter ? "Tier" : "Assessment"], ["Version", "1"],
            ["Status", "Current"], ["Effective Date", history[0].date],
            ["Expiration", "—"], ["Source", isTierLetter ? "DDD / iRecord" : history[0].source],
            ["Related Provider", "—"], ["Related Service", "—"],
            ["Signature Status", "N/A"], ["Last Modified", history[0].date],
          ].map(([label, value]) => <div key={label} className="min-w-0 rounded border border-[#f0f1f3] bg-[#fbfbfc] px-2 py-1.5">
            <p className="text-xs text-[#8a929e]">{label}</p><p className="break-words text-sm font-medium text-[#10141a]">{value}</p>
          </div>)}
        </div>
        <div className="mt-3 flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#d8dce2] px-3 py-2 text-sm text-[#8a929e]">
          <FileText className="h-4 w-4" aria-hidden="true" /><span className="break-all text-center">{isTierLetter ? `TierLetter_${lastName}_2026.pdf` : `NJCAT_${lastName}_2026.pdf`}</span>
        </div>
        <div className="mt-5 flex items-center justify-between gap-2">
          <Button variant="outline" onClick={() => setSelectedDocument(null)}>Close</Button>
          <Button disabled title="Sample document unavailable">Download</Button>
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={selectedHistory !== null} onOpenChange={(open) => { if (!open) setSelectedHistory(null); }}>
      {selectedHistory && <DialogContent showCloseButton={false} className="max-h-[min(90vh,620px)] w-[calc(100vw-32px)] max-w-[405px] overflow-y-auto p-4 sm:p-5">
        <DialogTitle className="text-xl leading-7">NJCAT — {selectedHistory.year}</DialogTitle>
        <DialogDescription className="mt-2 flex items-center gap-2 text-sm">
          <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${selectedHistory.current ? "bg-[#e8fff2] text-[#047857]" : "bg-[#f3f4f6] text-[#6b7280]"}`}>{selectedHistory.current ? "Current" : "Historical"}</span>
          NJCAT · {selectedHistory.date}
        </DialogDescription>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#e5e7eb] pt-3">
          {[["Tier", selectedHistory.tier], ["Assessment Date", selectedHistory.date], ["Source", selectedHistory.source], ["Reviewed By", selectedHistory.reviewedBy]].map(([label, value]) =>
            <div key={label} className="min-w-0 rounded border border-[#f0f1f3] bg-[#fbfbfc] px-2 py-1.5">
              <p className="text-xs text-[#8a929e]">{label}</p><p className="break-words text-sm font-medium text-[#10141a]">{value}</p>
            </div>)}
        </div>
        <div className="mt-4">
          <p className="mb-1.5 text-sm font-semibold text-[#10141a]">Notes</p>
          <p className="rounded-lg border border-[#e5e7eb] p-2 text-sm text-[#10141a]">{selectedHistory.notes}</p>
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-[#fff8e9] px-2 py-2 text-sm text-[#a16207]">
          <CircleHelp aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          This record is read-only. Previous assessments are never overwritten.
        </p>
        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={() => setSelectedHistory(null)}>Close</Button>
        </div>
      </DialogContent>}
    </Dialog>
  </section>;
}

function AssessmentSelect({ label, value, options }: { label: string; value: string; options: string[] }) {
  const [selected, setSelected] = useState(value);
  const choices = options.includes(value) ? options : [value, ...options];
  return <div className="space-y-1.5">
    <p className="text-sm font-semibold text-[#10141a]">{label}</p>
    <Select value={selected} onValueChange={setSelected}>
      <SelectTrigger aria-label={label} className="h-11 w-full rounded-lg border-[#e5e7eb] bg-white text-sm"><SelectValue /></SelectTrigger>
      <SelectContent>{choices.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
    </Select>
  </div>;
}

function SampleDocument({ label, filename, onView }: { label: string; filename: string; onView?: () => void }) {
  return <div className="space-y-1.5">
    <p className="text-sm text-[#6b7280]">{label}</p>
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-[#32d597] bg-[#f5fffa] px-3 py-3 text-sm text-[#05725e]">
      <span aria-hidden="true">✓</span><span className="min-w-0 flex-1 truncate">{filename}</span>
      <span className="rounded bg-[#ddf9e8] px-1.5 py-0.5 text-xs">SC Verified</span>
      <button type="button" aria-label={`View ${label}`} disabled={!onView} title={onView ? undefined : "Sample document unavailable"} onClick={onView} className="ml-auto text-[#ad182d] hover:underline disabled:cursor-not-allowed disabled:opacity-60 disabled:no-underline">View</button>
    </div>
  </div>;
}
