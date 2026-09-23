import { useEffect, useState } from "react";
import { ArrowLeft, CircleHelp, FileText, FolderOpen } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAgencyClientById, type Client } from "@/lib/api/clients";
import { DatePickerField } from "@/pages/shared/client-management/components/forms/formControls";
import { clients } from "@/pages/agency/clients-management/supportCoordinatorSampleClients";
import { Routes } from "@/routes/constants";

const tabs = [
  { id: "profile-isp", label: "Profile & ISP" },
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
  { title: "ISP Quality Review", description: "Pre-finalization checklist" },
  { title: "Participant Rights", description: "Rights & Responsibilities record" },
  { title: "PCPT", description: "Person-Centered Planning Tool" },
  { title: "ISP", description: "Individualized Service Plan" },
];

export default function SupportCoordinatorClientDetailsPage() {
  const { clientId } = useParams();
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab: Tab = tabs.some(({ id }) => id === requestedTab) ? requestedTab as Tab : "profile-isp";
  const sample = clients.find((client) => client.id === clientId);
  const [savedClient, setSavedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(Boolean(!sample && clientId));
  const [error, setError] = useState(false);

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
          {activeTab === "profile-isp" ? <AssessmentTab tier={tier} lastName={name.split(" ").at(-1) || name} sample={Boolean(sample)} /> : activeTab === "planning" ? (
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
                {documentShortcuts.map((item) => <div key={item.title} className="rounded-xl border border-[#e5e7eb] p-4">
                  <p className="text-sm font-semibold text-[#10141a]">{item.title}</p>
                  <p className="mt-1 text-sm text-[#4b5563]">{item.description}</p>
                  <p className="mt-2 text-xs text-[#6b7280]">Coming soon</p>
                </div>)}
              </div>
            </section>
          ) : (
            <section aria-label={`${tabs.find((tab) => tab.id === activeTab)?.label} tab`} className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#d1d5db] px-6 text-center">
              {activeTab === "documents" ? <FolderOpen className="mb-3 h-8 w-8 text-[#008f93]" /> : <FileText className="mb-3 h-8 w-8 text-[#008f93]" />}
              <h2 className="text-xl font-semibold text-[#10141a]">{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
              <p className="mt-2 text-sm text-[#6b7280]">This section is ready for client records.</p>
            </section>
          )}
        </main>
      </div>
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
