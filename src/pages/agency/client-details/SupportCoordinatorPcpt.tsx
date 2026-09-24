import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Sun, X } from "lucide-react";
import { Link, useBlocker } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Client } from "@/lib/api/clients";
import { getPcpt, reviewPcpt, savePcpt, type PcptContent, type PcptPlan } from "@/lib/api/sc-pcpt";

const steps = ["Relationships", "Strengths & Qualities", "Important To Client", "Hopes & Dreams", "Supporter & Community", "Employment & Communication"];
const employmentOptions = ["Not specified", "Unemployed — Experience/Training", "Unemployed — Seeking work", "Employed", "Student", "Retired", "Not interested in employment"];
const fieldFocus = "rounded-[3px] focus-visible:border-[#2f80ed] focus-visible:ring-0 focus-visible:outline-none";
const groups: { title: string; fields: { key: keyof PcptContent; label: string; hint: string }[] }[] = [
  { title: steps[1], fields: [
    { key: "achievements", label: "Achievements", hint: "Education, awards, milestones…" },
    { key: "likesAboutSelf", label: "What they like about themselves", hint: "What does this person like about themselves?" },
    { key: "othersLike", label: "What others like about them", hint: "What do family, friends, and staff say?" },
    { key: "doesWell", label: "Things they do well", hint: "Things they do independently or with support…" },
  ] },
  { title: steps[2], fields: [
    { key: "dislikes", label: "Dislikes & sensitivities", hint: "Triggers, sensitivities, aversions…" },
    { key: "people", label: "People to see / relationships", hint: "Who is important in their life?" },
    { key: "routines", label: "Personal preferences / daily routines", hint: "Daily schedule and personal preferences…" },
    { key: "pets", label: "Pets", hint: "Pets or comfort around animals…" },
  ] },
  { title: steps[3], fields: [
    { key: "longTermHopes", label: "Long-term hopes and dreams", hint: "Independence, housing, relationships, travel…" },
    { key: "shortTermHopes", label: "Short-term hopes and dreams", hint: "What do they hope to achieve soon?" },
  ] },
  { title: steps[4], fields: [
    { key: "idealSupporter", label: "Characteristics of an ideal supporter", hint: "Patience, personality, skills…" },
    { key: "communityInteraction", label: "Community interaction", hint: "Activities, frequency, locations…" },
    { key: "communityExperience", label: "Previous / current community experience", hint: "Travel, events, life experiences…" },
  ] },
];

function initialContent(client: Client | null): PcptContent {
  const sc = client?.supportCoordinatorName || client?.guardianInfo?.supportCoordinatorName;
  const guardian = client?.guardians?.[0];
  return {
    relationships: [
      ...(sc ? [{ role: "Support Coordinator", name: sc, notes: client?.supportCoordinatorContact || "" }] : []),
      ...(guardian?.name ? [{ role: guardian.relationship || "Guardian", name: guardian.name, notes: "" }] : []),
    ],
    achievements: "", likesAboutSelf: "", othersLike: "", doesWell: "", dislikes: "", people: "", routines: "", pets: "",
    longTermHopes: "", shortTermHopes: "", idealSupporter: "", communityInteraction: "", communityExperience: "",
    employmentStatus: client?.employmentStatus || "Not specified", hasResume: false, appliedForJobs: false, hasSkills: false, knowsJobType: false,
    employmentNotes: client?.employmentPlan || "", communicationStyles: client?.communicationMethod || "", ideas: "",
  };
}

function ReportSection({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return <section className="mt-2 border border-[#d5deed] bg-white">
    <h3 className="bg-[#485568] px-3 py-1.5 text-xs font-semibold text-white">{title}</h3>
    <div className="space-y-2 p-3">{rows.map(({ label, value }) => <div key={label}>
      <h4 className="text-[11px] font-semibold text-[#1f2937]">{label}</h4>
      <p className="whitespace-pre-wrap pl-2 text-[11px] leading-4 text-[#374151]">{value.trim() || "Not provided"}</p>
    </div>)}</div>
  </section>;
}

export default function SupportCoordinatorPcpt({ client, name, clientId, period, photo, backTo, sample = false }: { client: Client | null; name: string; clientId: string; period: string; photo?: string; backTo: string; sample?: boolean }) {
  const [step, setStep] = useState(0);
  const [content, setContent] = useState<PcptContent>(() => initialContent(client));
  const [plan, setPlan] = useState<PcptPlan | null>(null);
  const [canEdit, setCanEdit] = useState(sample);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(!sample);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [showHint, setShowHint] = useState(true);
  const blocker = useBlocker(() => dirty || busy);

  useEffect(() => {
    if (blocker.state === "blocked") {
      if (window.confirm("Leave the PCPT? Unsaved changes will be lost.")) blocker.proceed();
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
    getPcpt(clientId, controller.signal).then(({ plan: loaded, canEdit: editableAccess, canReview: allowed }) => {
      if (loaded) { setPlan(loaded); setContent(loaded.content); }
      else setContent(initialContent(client));
      setCanReview(allowed);
      setCanEdit(editableAccess);
    }).catch(() => { if (!controller.signal.aborted) setError("Unable to load the PCPT. Try again before editing."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [clientId, client, sample]);

  const editable = !loading && !busy && canEdit && (!plan || plan.status === "draft" || plan.status === "changes_requested");
  const change = (key: keyof PcptContent, value: string) => { setContent(current => ({ ...current, [key]: value })); setDirty(true); setNotice(""); };
  const changeRelationship = (index: number, key: "role" | "name" | "notes", value: string) => {
    setContent(current => ({ ...current, relationships: current.relationships.map((item, i) => i === index ? { ...item, [key]: value } : item) })); setDirty(true);
  };
  async function save(submit: boolean) {
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = await savePcpt(clientId, content, submit);
      setPlan(saved); setDirty(false); if (submit) setCanReview(false);
      setNotice(submit ? "PCPT submitted for supervisor review." : "Draft saved.");
    } catch { setError(submit ? "Could not submit the PCPT. Your entries remain on this page." : "Could not save the draft. Your entries remain on this page."); }
    finally { setBusy(false); }
  }
  async function review(decision: "approved" | "changes_requested") {
    setBusy(true); setError(""); setNotice("");
    try { setPlan(await reviewPcpt(clientId, decision, reviewNote)); setNotice(decision === "approved" ? "PCPT approved." : "Changes requested from the coordinator."); setReviewNote(""); }
    catch { setError("Could not save the review. Please try again."); }
    finally { setBusy(false); }
  }

  const status = plan?.status || "draft";
  const preview = plan?.status === "approved" && !dirty ? plan.content : content;
  const formatRows = (fields: typeof groups[number]["fields"]) => fields.map(({ label, key }) => ({ label, value: String(preview[key]) }));
  const date = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  return <section aria-label="PCPT editor">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2"><Button asChild variant="outline" size="sm" className="rounded-[3px]"><Link to={backTo}><ArrowLeft className="mr-1 size-4" /> Go back</Link></Button>
        <h2 className="text-xl font-semibold text-[#10141a]">PCPT {status === "approved" ? "Approved" : status === "submitted" ? "Submitted" : "Draft"}</h2></div>
      <div className="flex flex-wrap gap-2">
        {editable && !sample && <Button type="button" variant="outline" className="rounded-[3px]" disabled={busy || loading || !dirty} onClick={() => void save(false)}>Save draft</Button>}
        {editable && <Button type="button" className="rounded-[3px] bg-[#008b90] hover:bg-[#00767a]" disabled={busy || loading || sample || Boolean(error && !plan)} onClick={() => void save(true)}>Submit supervisor</Button>}
      </div>
    </div>
    {sample && <p className="mb-3 rounded-[3px] border border-[#bad4f9] bg-[#f4f8ff] p-3 text-sm text-[#2357a2]">Sample client preview. Open a saved client to save or submit a PCPT.</p>}
    {plan?.status === "changes_requested" && <p className="mb-3 rounded-[3px] border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Supervisor requested changes: {plan.reviewNote}</p>}
    {plan?.status === "submitted" && <p className="mb-3 rounded-[3px] border border-[#bad4f9] bg-[#f4f8ff] p-3 text-sm text-[#2357a2]">Submitted for supervisor review. Editing is paused until a decision is made.</p>}
    {plan?.status === "submitted" && canReview && <div className="mb-3 rounded-[3px] border border-[#d5deed] p-3">
      <label htmlFor="pcpt-review-note" className="mb-1 block text-xs font-semibold uppercase tracking-wide">Supervisor review note</label>
      <Textarea id="pcpt-review-note" className={fieldFocus} value={reviewNote} onChange={event => setReviewNote(event.target.value)} maxLength={2000} placeholder="Reason for requested changes" />
      <div className="mt-2 flex gap-2"><Button className="rounded-[3px]" disabled={busy} onClick={() => void review("approved")}>Approve PCPT</Button><Button variant="outline" className="rounded-[3px]" disabled={busy || !reviewNote.trim()} onClick={() => void review("changes_requested")}>Request changes</Button></div>
    </div>}
    {error && <p role="alert" className="mb-3 text-sm text-[#ad182d]">{error}</p>}
    {notice && <p role="status" className="mb-3 text-sm text-[#007f84]">{notice}</p>}
    <div className="grid min-w-0 gap-0 overflow-hidden border border-[#e5e7eb] lg:h-[calc(100dvh-250px)] lg:min-h-[440px] lg:grid-cols-[minmax(310px,34%)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
      <div className="flex min-h-[570px] min-w-0 flex-col bg-white lg:min-h-0">
        <nav aria-label="PCPT steps" className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#e5e7eb] p-2">
          {steps.map((label, index) => <button key={label} type="button" onClick={() => setStep(index)} aria-current={step === index ? "step" : undefined}
            className={`shrink-0 cursor-pointer rounded-[3px] px-2 py-1.5 text-xs font-medium ${step === index ? "bg-[#2f80ed] text-white" : "text-[#6b7280] hover:bg-[#f3f7fc]"}`}>{index + 1}. {label}</button>)}
        </nav>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {showHint && <div className="relative flex gap-2 rounded-[3px] border border-[#bed6ff] bg-[#f2f8ff] px-3 py-3 pr-8 text-xs leading-4 text-[#2361ba]">
            <Sun className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div><strong className="block text-[#174a9c]">Auto-populated from client record</strong><p>Available fields are pre-filled from the client record. Review each section, update any missing details, then submit to your supervisor.</p></div>
            <button type="button" aria-label="Dismiss prefill note" className="absolute right-2 top-2 cursor-pointer text-[#2f80ed]" onClick={() => setShowHint(false)}><X className="size-3.5" /></button>
          </div>}
          <h3 className="text-sm font-medium text-[#10141a]">{steps[step]}</h3>
          {step === 0 && <><p className="text-sm text-[#374151]">Add family members, guardians, and key relationships for {name.split(" ")[0]}.</p>
            {content.relationships.map((item, index) => <div key={index} className="space-y-3 rounded-[3px] border border-[#e5e7eb] p-3">
              <div className="flex justify-between text-xs font-semibold"><span>RELATIONSHIP {index + 1}</span><button type="button" disabled={!editable} className="text-[#c22b42] disabled:opacity-50" onClick={() => { setContent(current => ({ ...current, relationships: current.relationships.filter((_, i) => i !== index) })); setDirty(true); }}>Remove</button></div>
              {(["role", "name", "notes"] as const).map(key => <label key={key} className="block text-xs font-semibold uppercase tracking-wide text-[#4b5563]">{key === "role" ? "Role / relationship" : key === "name" ? "Full name" : "Notes"}
                {key === "notes" ? <Textarea className={`mt-1 min-h-20 ${fieldFocus}`} disabled={!editable} maxLength={4000} value={item[key]} placeholder="Role in this person's life and guardianship status…" onChange={event => changeRelationship(index, key, event.target.value)} />
                  : <Input className={`mt-1 h-9 ${fieldFocus}`} disabled={!editable} maxLength={key === "role" ? 100 : 150} value={item[key]} onChange={event => changeRelationship(index, key, event.target.value)} />}</label>)}
            </div>)}
            <Button type="button" variant="outline" size="sm" className="rounded-[3px]" disabled={!editable || content.relationships.length >= 30} onClick={() => { setContent(current => ({ ...current, relationships: [...current.relationships, { role: "", name: "", notes: "" }] })); setDirty(true); }}><Plus className="mr-1 size-4" /> Add relationship</Button>
          </>}
          {step > 0 && step < 5 && groups[step - 1].fields.map(({ key, label, hint }) => <label key={key} className="block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">{label}
            <Textarea className={`mt-1 min-h-20 font-normal normal-case tracking-normal text-[#10141a] ${fieldFocus}`} disabled={!editable} maxLength={4000} value={String(content[key])} placeholder={hint} onChange={event => change(key, event.target.value)} />
          </label>)}
          {step === 5 && <>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Employment status<select className="mt-1 h-10 w-full rounded-[3px] border border-[#d1d5db] bg-white px-3 text-sm font-normal text-[#10141a] focus:border-[#2f80ed] focus:outline-none" disabled={!editable} value={content.employmentStatus} onChange={event => change("employmentStatus", event.target.value)}>
              {(!employmentOptions.includes(content.employmentStatus) ? [content.employmentStatus, ...employmentOptions] : employmentOptions).map(option => <option key={option}>{option}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-3">{([ ["hasResume", "Has a resume?"], ["appliedForJobs", "Applied for jobs?"], ["hasSkills", "Has the necessary skills?"], ["knowsJobType", "Knows desired job type?"] ] as [keyof PcptContent, string][]).map(([key, label]) => <fieldset key={key}><legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">{label}</legend><div className="flex gap-1">{[true, false].map(value => <button key={String(value)} type="button" disabled={!editable} aria-pressed={content[key] === value} onClick={() => { setContent(current => ({ ...current, [key]: value })); setDirty(true); }} className={`h-8 flex-1 rounded-[3px] border text-xs ${content[key] === value ? "border-[#007f84] bg-[#007f84] text-white" : "border-[#d1d5db] bg-white text-[#374151]"}`}>{value ? "Yes" : "No"}</button>)}</div></fieldset>)}</div>
            {([ ["employmentNotes", "Employment notes", "Employment plans, volunteer activities, referrals…"], ["communicationStyles", "Communication styles", "Verbal, nonverbal, AAC device, signs…"], ["ideas", "Ideas / to do list", "Aspirations, planned activities, goals…"] ] as [keyof PcptContent, string, string][]).map(([key, label, hint]) => <label key={key} className="block text-xs font-semibold uppercase tracking-wide text-[#6b7280]">{label}<Textarea className={`mt-1 min-h-20 font-normal normal-case tracking-normal ${fieldFocus}`} disabled={!editable} maxLength={4000} value={String(content[key])} placeholder={hint} onChange={event => change(key, event.target.value)} /></label>)}
          </>}
        </div>
        <div className="grid min-h-12 shrink-0 grid-cols-3 items-center border-t border-[#f1f2f5] bg-white px-3 text-xs">
          <button type="button" className="inline-flex w-fit items-center gap-1 text-[#8b929c] hover:text-[#374151] disabled:cursor-default disabled:text-[#b8bec6]" disabled={step === 0} onClick={() => setStep(current => current - 1)}><ArrowLeft className="size-3" /> Back</button>
          <span className="text-center text-[#374151]">{step + 1} / 6</span>
          {step === 5 ? <button type="button" className="justify-self-end rounded-[3px] bg-[#008b90] px-3 py-1.5 font-semibold text-white disabled:opacity-50" disabled={!editable || sample} onClick={() => void save(true)}>Submit supervisor</button>
            : <button type="button" className="inline-flex cursor-pointer items-center gap-1 justify-self-end rounded-[3px] bg-[#2f80ed] px-3 py-1.5 font-semibold text-white hover:bg-[#206bd0]" onClick={() => setStep(current => current + 1)}>Next <ArrowRight className="size-3" /></button>}
        </div>
      </div>
      <div className="min-w-0 bg-[#e4e6eb]">
        <div className="flex flex-wrap items-center gap-2 bg-[#f1f2f5] px-4 py-2 text-xs text-[#4b5563]"><strong>Live Document Preview</strong>{status !== "approved" && <span className="rounded-[3px] border border-[#edc97c] bg-white px-1 font-semibold text-[#9a5b00]">DRAFT WATERMARK</span>}<span>{status === "approved" ? "Approved by supervisor" : "Watermark removed upon supervisor approval"}</span></div>
        <div className="max-h-[690px] overflow-y-auto p-4 lg:h-[calc(100%-34px)] lg:p-8"><article className="mx-auto max-w-[720px] bg-white p-3 shadow-lg sm:p-4" aria-label="PCPT report preview">
          <div className="flex items-start justify-between gap-3 bg-[#fff7e9] text-right text-[11px] text-[#243d69]"><div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center bg-[#214077] text-center text-[8px] font-semibold leading-[1.2] text-white"><span className="mb-1.5 grid grid-cols-2 gap-[3px]" aria-hidden="true"><i className="size-[11px] rounded-[2px] bg-white" /><i className="size-[11px] rounded-[2px] bg-[#5299d8]" /><i className="size-[11px] rounded-[2px] bg-white" /><i className="size-[11px] rounded-[2px] bg-[#5299d8]" /></span><span>Division of<br />Developmental<br />Disabilities</span></div><div className="p-2"><strong className="text-xs">Person-Centered Planning Tool (PCPT) Report</strong><p><strong>PCPT Version:</strong> {status === "approved" ? "Approved" : "Draft"}</p><p><strong>Last Updated On:</strong> {date}</p><p><strong>Print Date:</strong> {date}</p></div></div>
          <div className="mt-2 flex gap-3 border border-[#d5deed] p-3 text-xs"><div className="flex h-16 w-12 shrink-0 items-center justify-center bg-[#f2f8ff] text-[10px] text-[#9aa8bb]">{photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : "Photo"}</div><div><strong>Participant's Name: {name}</strong><p className="mt-1">DDD ID: {client?.dddId || clientId}</p></div></div>
          <div className="mt-2 border border-[#d5deed] p-3 text-[11px]"><strong>Support Coordination Agency Name:</strong> {client?.supportCoordinatorAgency || "Not provided"}<br /><strong>SC:</strong> {client?.supportCoordinatorName || "Not provided"}<br /><strong>Contact:</strong> {client?.supportCoordinatorContact || "Not provided"}<br /><strong>ISP Period:</strong> {period}</div>
          <ReportSection title="Relationships" rows={preview.relationships.length ? preview.relationships.map((item, i) => ({ label: `${item.role || `Relationship ${i + 1}`}: ${item.name || "Not provided"}`, value: item.notes })) : [{ label: "Key relationships", value: "" }]} />
          {groups.map(group => <ReportSection key={group.title} title={group.title} rows={formatRows(group.fields)} />)}
          <ReportSection title="Employment & Communication" rows={[
            { label: "Employment status", value: preview.employmentStatus },
            { label: "Resume / Jobs / Skills / Job type", value: `${preview.hasResume ? "Yes" : "No"} / ${preview.appliedForJobs ? "Yes" : "No"} / ${preview.hasSkills ? "Yes" : "No"} / ${preview.knowsJobType ? "Yes" : "No"}` },
            { label: "Employment notes", value: preview.employmentNotes }, { label: "Communication styles", value: preview.communicationStyles }, { label: "Ideas / to do list", value: preview.ideas },
          ]} />
        </article></div>
      </div>
    </div>
  </section>;
}
