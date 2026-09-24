import { useEffect, useState } from "react";
import { Link, useBlocker } from "react-router";
import { ArrowLeft, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Client } from "@/lib/api/clients";
import { getIsp, reviewIsp, saveIsp, type IspNarratives, type IspPlan } from "@/lib/api/sc-isp";

type ReportService = { name: string; code?: string; provider?: string; location?: string; startAuthDate?: string; endAuthDate?: string; hours?: string; clientRate?: string; frequency?: string };
export type ReportOutcome = { statement: string; services: ReportService[] };
type Props = { client: Client | null; clientId: string; name: string; period: string; program?: string; backTo: string; sample?: boolean; sampleOutcomes?: ReportOutcome[] };
const fields: { key: keyof IspNarratives; label: string; placeholder: string }[] = [
  { key: "serviceDeliveryNotes", label: "Service delivery notes", placeholder: "EVV status, service delivery details, special provider instructions…" },
  { key: "employmentNarrative", label: "Employment first narrative", placeholder: "Describe employment interests, current status, and opportunities…" },
  { key: "healthNotes", label: "Health notes / discrepancies", placeholder: "Note any discrepancies between NJCAT and family-reported health conditions…" },
];
const fieldStyle = "mt-1 min-h-20 rounded-[3px] font-normal normal-case tracking-normal focus-visible:border-[#2f80ed] focus-visible:ring-0 focus-visible:outline-none";
const safe = (value?: string | null) => value?.trim() || "Not provided";
const dateText = (value?: string | Date | { _seconds?: number }) => {
  if (!value) return "Not provided";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value.slice(5, 7)}/${value.slice(8, 10)}/${value.slice(0, 4)}`;
  const date = value instanceof Date ? value : typeof value === "string" ? new Date(value) : new Date((value._seconds ?? Number.NaN) * 1000);
  return Number.isNaN(date.getTime()) ? (typeof value === "string" ? value : "Not provided") : date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
};

function ReportPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-2 border border-[#d5deed] bg-white text-[11px]">
    <h3 className="bg-[#d5dae2] px-3 py-1.5 text-center font-semibold text-[#252b35]">{title}</h3>
    <div className="space-y-2 p-3">{children}</div>
  </section>;
}

export default function SupportCoordinatorIsp({ client, clientId, name, period, program, backTo, sample = false, sampleOutcomes }: Props) {
  const [content, setContent] = useState<IspNarratives>(() => ({ serviceDeliveryNotes: "", employmentNarrative: client?.employmentPlan || "", healthNotes: "" }));
  const [plan, setPlan] = useState<IspPlan | null>(null);
  const [canEdit, setCanEdit] = useState(sample);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(!sample);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [showHint, setShowHint] = useState(true);
  const blocker = useBlocker(() => dirty || busy);

  useEffect(() => {
    if (blocker.state === "blocked") {
      if (window.confirm("Leave the ISP? Unsaved changes will be lost.")) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty || busy) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);
  useEffect(() => {
    if (sample) return;
    const controller = new AbortController();
    getIsp(clientId, controller.signal).then(({ plan: loaded, canEdit: allowed, canReview: reviewer }) => {
      if (loaded) { setPlan(loaded); setContent(loaded.content); }
      else setContent({ serviceDeliveryNotes: "", employmentNarrative: client?.employmentPlan || "", healthNotes: "" });
      setCanEdit(allowed); setCanReview(reviewer);
    }).catch(() => { if (!controller.signal.aborted) setError("Unable to load the ISP. Try again before editing."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [clientId, client, sample]);

  const editable = !loading && !busy && canEdit && (!plan || plan.status === "draft" || plan.status === "changes_requested");
  async function save(submit: boolean) {
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = await saveIsp(clientId, content, submit);
      setPlan(saved); setDirty(false); if (submit) setCanReview(false);
      setNotice(submit ? "ISP submitted for supervisor review." : "Draft saved.");
    } catch { setError(submit ? "Could not submit the ISP. Your entries remain on this page." : "Could not save the draft. Your entries remain on this page."); }
    finally { setBusy(false); }
  }
  async function review(decision: "approved" | "changes_requested") {
    setBusy(true); setError(""); setNotice("");
    try { setPlan(await reviewIsp(clientId, decision, reviewNote)); setNotice(decision === "approved" ? "ISP approved." : "Changes requested from the coordinator."); setReviewNote(""); }
    catch { setError("Could not save the review. Please try again."); }
    finally { setBusy(false); }
  }

  const status = plan?.status || "draft";
  const preview = plan?.status === "approved" && !dirty ? plan.content : content;
  const reportOutcomes: ReportOutcome[] = sampleOutcomes || (client?.outcomes?.length
    ? client.outcomes.map(outcome => ({ statement: outcome.statement, services: outcome.services || [] }))
    : client?.ispOutcomes || client?.services?.length
      ? [{ statement: client?.ispOutcomes || "Services in client record", services: client?.services || [] }]
      : []);
  const physician = client?.healthcareSafety?.physicianInfo || client?.physicianInfo;
  const health = client?.healthcareSafety;
  const address = [client?.address, client?.city, client?.state, client?.zipCode].filter(Boolean).join(", ");
  const today = dateText(new Date().toISOString());
  return <section aria-label="ISP editor">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><Button asChild variant="outline" size="sm" className="rounded-[3px]"><Link to={backTo}><ArrowLeft className="mr-1 size-4" /> Go back</Link></Button><h2 className="text-xl font-semibold text-[#10141a]">ISP {status === "approved" ? "Approved" : status === "submitted" ? "Submitted" : "Draft"}</h2></div>
      <div className="flex gap-2">{editable && !sample && <Button type="button" variant="outline" className="rounded-[3px]" disabled={!dirty} onClick={() => void save(false)}>Save draft</Button>}
        {editable && <Button type="button" className="rounded-[3px] bg-[#008b90] hover:bg-[#00767a]" disabled={sample || Boolean(error && !plan)} onClick={() => void save(true)}>Submit supervisor</Button>}</div>
    </div>
    {sample && <p className="mb-3 rounded-[3px] border border-[#bad4f9] bg-[#f4f8ff] p-3 text-sm text-[#2357a2]">Sample client preview. Open a saved client to save or submit an ISP.</p>}
    {plan?.status === "changes_requested" && <p className="mb-3 rounded-[3px] border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Supervisor requested changes: {plan.reviewNote}</p>}
    {plan?.status === "submitted" && <p className="mb-3 rounded-[3px] border border-[#bad4f9] bg-[#f4f8ff] p-3 text-sm text-[#2357a2]">Submitted for supervisor review. Editing is paused until a decision is made.</p>}
    {plan?.status === "submitted" && canReview && <div className="mb-3 rounded-[3px] border border-[#d5deed] p-3">
      <label htmlFor="isp-review-note" className="mb-1 block text-xs font-semibold uppercase tracking-wide">Supervisor review note</label>
      <Textarea id="isp-review-note" className={fieldStyle} value={reviewNote} onChange={event => setReviewNote(event.target.value)} maxLength={2000} placeholder="Reason for requested changes" />
      <div className="mt-2 flex gap-2"><Button className="rounded-[3px]" disabled={busy} onClick={() => void review("approved")}>Approve ISP</Button><Button variant="outline" className="rounded-[3px]" disabled={busy || !reviewNote.trim()} onClick={() => void review("changes_requested")}>Request changes</Button></div>
    </div>}
    {error && <p role="alert" className="mb-3 text-sm text-[#ad182d]">{error}</p>}
    {notice && <p role="status" className="mb-3 text-sm text-[#007f84]">{notice}</p>}
    <div className="grid min-w-0 overflow-hidden border border-[#e5e7eb] lg:h-[calc(100dvh-250px)] lg:min-h-[440px] lg:grid-cols-[minmax(310px,34%)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
      <div className="min-h-[530px] min-w-0 overflow-y-auto bg-white px-4 py-4 lg:min-h-0">
        {showHint && <div className="relative mb-5 flex gap-2 rounded-[3px] border border-[#bed6ff] bg-[#f2f8ff] px-3 py-3 pr-8 text-xs leading-4 text-[#2361ba]"><Sun className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><div><strong className="block text-[#174a9c]">Auto-populated from client record</strong><p>Available fields are pre-filled from the client record. Review the plan, update any missing details, then submit to your supervisor.</p></div><button type="button" aria-label="Dismiss prefill note" className="absolute right-2 top-2 cursor-pointer text-[#2f80ed]" onClick={() => setShowHint(false)}><X className="size-3.5" /></button></div>}
        <h3 className="mb-3 text-sm font-medium text-[#10141a]">Service Details</h3>
        <p className="mb-4 text-sm text-[#4b5563]">The ISP uses the client record. Review the details and add narrative notes below.</p>
        <div className="space-y-5">{fields.map(({ key, label, placeholder }) => <label key={key} className="block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">{label}
          <Textarea className={fieldStyle} disabled={!editable} maxLength={4000} value={content[key]} placeholder={placeholder} onChange={event => { setContent(current => ({ ...current, [key]: event.target.value })); setDirty(true); setNotice(""); }} />
        </label>)}</div>
      </div>
      <div className="min-w-0 bg-[#e4e6eb]">
        <div className="flex flex-wrap items-center gap-2 bg-[#f1f2f5] px-4 py-2 text-xs text-[#4b5563]"><strong>Live Document Preview</strong>{status !== "approved" && <span className="rounded-[3px] border border-[#edc97c] bg-white px-1 font-semibold text-[#9a5b00]">DRAFT WATERMARK</span>}<span>{status === "approved" ? "Approved by supervisor" : "Watermark removed upon supervisor approval"}</span></div>
        <div className="max-h-[690px] overflow-auto p-4 lg:h-[calc(100%-34px)] lg:p-8"><article className="relative mx-auto min-w-[650px] max-w-[720px] bg-white p-3 text-[#1f2937] shadow-lg sm:p-4" aria-label="ISP report preview">
          {status !== "approved" && <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden text-[100px] font-bold text-[#475569]/10" aria-hidden="true"><span className="-rotate-45">DRAFT</span></span>}
          <div className="flex items-start justify-between bg-[#fff7e9] text-right text-[11px] text-[#243d69]"><div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center bg-[#214077] text-center text-[8px] font-semibold leading-[1.2] text-white"><span className="mb-1.5 grid grid-cols-2 gap-[3px]" aria-hidden="true"><i className="size-[11px] rounded-[2px] bg-white" /><i className="size-[11px] rounded-[2px] bg-[#5299d8]" /><i className="size-[11px] rounded-[2px] bg-white" /><i className="size-[11px] rounded-[2px] bg-[#5299d8]" /></span><span>Division of<br />Developmental<br />Disabilities</span></div><div className="p-2"><strong className="text-xs">New Jersey Individualized Service Plan (NJ ISP)</strong><p><strong>Plan ID:</strong> {safe(client?.ispMetadata?.planId)}</p><p><strong>Print Date:</strong> {today}</p></div></div>
          <div className="mt-2 grid grid-cols-3 border border-[#d5deed] text-[11px] [&>section]:min-w-0 [&>section]:border-r [&>section]:border-[#d5deed] [&>section]:p-2 last:[&>section]:border-r-0">
            <section><h3 className="mb-2 bg-[#d5dae2] px-2 py-1 text-center font-semibold">{name}</h3><p><strong>ID:</strong> {safe(client?.dddId || clientId)}</p><p><strong>DOB:</strong> {dateText(client?.dateOfBirth)}</p><p><strong>Gender:</strong> {safe(client?.gender)}</p><p><strong>County:</strong> {safe(client?.countyState)}</p><p><strong>Program:</strong> {safe(program || client?.scEnrollment?.program || client?.ispMetadata?.program)}</p><br /><p><strong>Medicaid ID:</strong> {safe(client?.medicaidId)}</p><p><strong>DDD Status:</strong> {safe(client?.ispMetadata?.dddStatus)}</p><p><strong>Waiver:</strong> {dateText(client?.ispMetadata?.waiverEnrollmentDate)}</p><p>{safe(address)}</p><hr className="my-2 border-[#d5deed]" /><h4 className="text-center font-semibold">Diagnosis</h4><p className="whitespace-pre-wrap">{safe(health?.diagnosis || client?.diagnosis || client?.medicalConditions?.join(", "))}</p></section>
            <section><h3 className="mb-2 bg-[#d5dae2] px-2 py-1 text-center font-semibold">Support Coordination</h3><p><strong>{safe(client?.supportCoordinatorAgency || client?.guardianInfo?.supportCoordinatorAgency)}</strong></p><p><strong>SC:</strong> {safe(client?.supportCoordinatorName || client?.guardianInfo?.supportCoordinatorName)}</p><p className="break-words"><strong>Contact:</strong> {safe(client?.supportCoordinatorContact || client?.guardianInfo?.supportCoordinatorContact)}</p><p><strong>ISP Period:</strong> {period}</p><h4 className="mt-3 bg-[#d5dae2] px-2 py-1 text-center font-semibold">Guardianship</h4><p>{safe(client?.guardians?.[0]?.name || client?.guardianName)}</p></section>
            <section><h3 className="mb-2 bg-[#d5dae2] px-2 py-1 text-center font-semibold">Preferred Hospital</h3><p>{safe(client?.emergencyContacts?.[0]?.hospitalPreference)}</p><h4 className="mt-3 bg-[#d5dae2] px-2 py-1 text-center font-semibold">Primary Care Physician</h4><p>{safe(physician?.name)}</p><p>{safe(physician?.address)}</p><p>{safe(physician?.phone)}</p><h4 className="mt-3 bg-[#d5dae2] px-2 py-1 text-center font-semibold">Managed Care Organization (MCO)</h4><p>{safe(client?.ispMetadata?.insuranceDetails?.[0]?.name)}</p></section>
          </div>
          {reportOutcomes.length ? reportOutcomes.map((outcome, index) => <ReportPanel key={index} title={`Outcome ${index + 1}`}><p className="whitespace-pre-wrap">{safe(outcome.statement)}</p>{outcome.services.map((service, serviceIndex) => <div key={serviceIndex} className="border-t border-[#d5deed] pt-2"><h4 className="mb-1 bg-[#d5dae2] px-2 py-1 text-center font-semibold">Service {serviceIndex + 1}: {safe(service.name)}</h4><p><strong>Provider:</strong> {safe(service.provider)}</p><div className="grid grid-cols-3 gap-2 text-[10px]"><p><strong>Code:</strong> {safe(service.code)}<br /><strong>Location:</strong> {safe(service.location)}</p><p><strong>Start:</strong> {dateText(service.startAuthDate)}<br /><strong>End:</strong> {dateText(service.endAuthDate)}<br /><strong>Units:</strong> {safe(service.hours)}</p><p><strong>Frequency:</strong> {safe(service.frequency)}<br /><strong>Rate:</strong> {safe(service.clientRate)}</p></div></div>)}</ReportPanel>) : <ReportPanel title="Outcomes & Services"><p>No outcomes or services are recorded for this client.</p></ReportPanel>}
          <ReportPanel title="Service Details"><p className="whitespace-pre-wrap">{safe(preview.serviceDeliveryNotes)}</p></ReportPanel>
          <ReportPanel title="Employment Narrative"><p className="whitespace-pre-wrap">{safe(preview.employmentNarrative)}</p></ReportPanel>
          <ReportPanel title="Health Notes"><p className="whitespace-pre-wrap">{safe(preview.healthNotes)}</p>{(health?.medicalConditions?.length || client?.medicalConditions?.length) ? <p><strong>Medical conditions:</strong> {(health?.medicalConditions || client?.medicalConditions)?.join(", ")}</p> : null}{(health?.allergies?.length || client?.allergies?.length) ? <p><strong>Allergies:</strong> {(health?.allergies || client?.allergies)?.join(", ")}</p> : null}</ReportPanel>
        </article></div>
      </div>
    </div>
  </section>;
}
