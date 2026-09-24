import { useState } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const monitoringQuestions = [
  { label: "Service Delivery", question: "Is the service being delivered as authorized?", options: ["Yes", "Partially", "No"] },
  { label: "Client Satisfaction", question: "Is the individual satisfied with this service?", options: ["Yes", "No", "Unable to determine"] },
  { label: "Goal Alignment", question: "Is the service helping the individual work toward their goals?", options: ["Yes", "No", "Needs Review"] },
  { label: "Issues", question: "Any concerns with the provider or service?", options: ["No", "Yes"] },
] as const;
const monitoringAreas = ["Health", "Safety", "Goals", "Satisfaction", "Living situation"];
const sampleSummary = [
  ["Client Monitoring", "Current", "green"], ["Services", "3 Active", "green"],
  ["PA", "1 Missing", "amber"], ["SDR", "2 Received · 1 Missing", "green"],
  ["Provider Monitoring", "Current", "green"], ["Goals", "Progressing", "green"],
  ["Open Issues", "1 Open", "amber"], ["Follow-up Tasks", "2 Pending", "amber"],
] as const;
const sampleActivity = [
  { date: "Aug 11, 2026", kind: "Monitoring", description: "Monthly monitoring check — PA missing flagged for Community Inclusion", source: "T. Booker" },
  { date: "Aug 5, 2026", kind: "Monitoring", description: "Monthly monitoring completed for all services", source: "T. Booker" },
  { date: "Mar 24, 2026", kind: "ISP", description: "ISP 10.04 activated — plan period 03/24/2026 to 03/23/2027", source: "iRecord" },
  { date: "Mar 10, 2026", kind: "Assessment", description: "Tier D determination effective 03/24/2026", source: "DDD / iRecord" },
  { date: "Feb 23, 2026", kind: "Assessment", description: "NJCAT assessment reviewed and confirmed — Level of care met", source: "DDD / iRecord" },
];

type Activity = (typeof sampleActivity)[number];

export default function SupportCoordinatorMonitoringTab({ sample }: { sample: boolean }) {
  const [today] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dialog, setDialog] = useState<"follow-up" | "monitoring" | null>(null);
  const [method, setMethod] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({ Issues: "No" });
  const [areas, setAreas] = useState<string[]>(["Health"]);
  const [monitoringNotes, setMonitoringNotes] = useState("");
  const [monitoringError, setMonitoringError] = useState(false);
  const [activity, setActivity] = useState<Activity[]>(sample ? sampleActivity : []);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [monitoringSaved, setMonitoringSaved] = useState(false);
  const selectedSampleDay = sample && isSameDay(selectedDate, today);
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });

  function saveFollowUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!method) return;
    setFollowUpCount((count) => count + 1);
    setActivity((items) => [{ date: format(selectedDate, "MMM d, yyyy"), kind: "Monitoring", description: `Missing PA follow-up task created · ${method}${followUpNotes.trim() ? ` · ${followUpNotes.trim()}` : ""}`, source: "Local preview" }, ...items]);
    setDialog(null);
    setMethod("");
    setFollowUpNotes("");
  }

  function saveMonitoring(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (monitoringQuestions.some(({ label }) => !answers[label])) {
      setMonitoringError(true);
      return;
    }
    setActivity((items) => [{ date: format(selectedDate, "MMM d, yyyy"), kind: "Monitoring", description: `Individual Supports monitoring recorded${monitoringNotes.trim() ? ` · ${monitoringNotes.trim()}` : ""}`, source: "Local preview" }, ...items]);
    setMonitoringSaved(true);
    setDialog(null);
    setMonitoringError(false);
  }

  return <section aria-labelledby="sc-monitoring-heading" className="space-y-6 text-sm text-[#10141a]">
    <h2 id="sc-monitoring-heading" className="sr-only">Monitoring</h2>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <h3 className="text-xl font-medium">{format(selectedDate, "EEE, MMMM d")}</h3>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild><button type="button" aria-label="Choose monitoring date" className="grid size-9 place-items-center rounded-full border border-[#e5e7eb] transition-colors hover:border-[#00a4a8] hover:text-[#008f93]"><CalendarDays className="size-4" /></button></PopoverTrigger>
          <PopoverContent align="start" className="w-auto border border-[#e5e7eb] p-1 shadow-lg"><Calendar mode="single" selected={selectedDate} onSelect={(day) => { if (day) { setSelectedDate(day); setCalendarOpen(false); } }} /></PopoverContent>
        </Popover>
      </div>
      <div className="flex max-w-full items-center gap-1 overflow-x-auto" aria-label="Monitoring dates">
        <button type="button" aria-label="Previous week" onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-[#f3f4f6]"><ChevronLeft className="size-5" /></button>
        {Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)).map((day) => <button key={day.toISOString()} type="button" onClick={() => setSelectedDate(day)} aria-current={isSameDay(day, selectedDate) ? "date" : undefined} aria-label={format(day, "EEEE, MMMM d, yyyy")} className={`flex min-w-9 shrink-0 flex-col items-center rounded-full px-2 py-1 text-xs leading-5 transition-colors ${isSameDay(day, selectedDate) ? "border border-[#80b8ff] bg-[#e8f2ff] text-[#1d4ed8]" : "hover:bg-[#f3f4f6]"}`}><span>{format(day, "EEE")}</span><span className="font-semibold">{format(day, "d")}</span></button>)}
        <button type="button" aria-label="Next week" onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-[#f3f4f6]"><ChevronRight className="size-5" /></button>
      </div>
    </div>

    {sample && <div role="status" className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-[#ffc8d0] bg-[#fff7f8] px-3 py-2 text-xs text-[#b42332]">
      <span className="size-2 rounded-full bg-[#c52236]" aria-hidden="true" /><strong>PA Missing</strong><span>Weekly PA for Community Inclusion Services has not been recorded.</span>
      <button type="button" onClick={() => setDialog("follow-up")} className="ml-auto font-semibold hover:underline">Follow up</button>
    </div>}

    <div>
      <h3 className="mb-2 text-xs font-semibold">Services to monitor {selectedSampleDay ? "today" : `on ${format(selectedDate, "MMM d")}`}</h3>
      {selectedSampleDay ? <article className="overflow-hidden rounded-xl border border-[#e5e7eb]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[#f0f1f2] px-4 py-3">
          <h4 className="font-medium">Individual Supports</h4><span className="rounded bg-[#e8fbf4] px-2 py-0.5 text-xs font-semibold text-[#16815e]">Active</span>
          <span className="ml-auto text-xs text-[#9199a6]">Morning Star Supportive Services Corp</span>
          <Button type="button" onClick={() => setDialog("monitoring")} className="bg-[#008f93] text-xs hover:bg-[#00777b]">{monitoringSaved ? "Update monitoring" : "Start monitoring"}</Button>
        </div>
        <div className="grid gap-3 px-4 py-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-[#9199a6]">Authorization</p><p className="mt-1">03/24/2026 → 03/23/2027<br />90 hrs/week</p></div>
          <div><p className="text-[#9199a6]">PA</p><p className="mt-1"><StatusDot color="green" /> Received<br /><span className="text-[#9199a6]">Latest: Aug 10–16</span></p></div>
          <div><p className="text-[#9199a6]">SDR</p><p className="mt-1"><StatusDot color="green" /> Received<br /><span className="text-[#9199a6]">03/24/2026</span></p></div>
          <div><p className="text-[#9199a6]">Monitoring</p><p className="mt-1">Monthly<br /><span className="text-[#9199a6]">Last: Jul 5</span><br /><strong>{monitoringSaved ? "Completed today" : "Next: Today"}</strong></p></div>
        </div>
      </article> : <p className="rounded-xl border border-dashed border-[#d1d5db] px-4 py-6 text-center text-[#6b7280]">No services scheduled for this date.</p>}
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <section aria-labelledby="sc-monitoring-summary" className="overflow-hidden rounded-xl border border-[#e5e7eb]">
        <h3 id="sc-monitoring-summary" className="border-b border-[#e5e7eb] px-4 py-4 text-lg font-medium">Summary</h3>
        {sample ? <div className="px-4 pb-3"><div className="flex justify-between py-2 text-[11px] font-semibold text-[#4b5563]"><span>AREA</span><span>STATUS</span></div>
          {sampleSummary.map(([area, status, color]) => <div key={area} className="flex items-center justify-between gap-3 py-2 text-sm text-[#4b5563]"><span>{area}</span><span className="shrink-0 text-right text-[#10141a]"><StatusDot color={color} /> {area === "Follow-up Tasks" ? `${2 + followUpCount} Pending` : status}</span></div>)}
        </div> : <p className="px-4 py-8 text-center text-[#6b7280]">No monitoring summary recorded yet.</p>}
      </section>
      <section aria-labelledby="sc-monitoring-timeline" className="overflow-hidden rounded-xl border border-[#e5e7eb]">
        <h3 id="sc-monitoring-timeline" className="border-b border-[#e5e7eb] px-4 py-4 text-lg font-medium">Activity Timeline</h3>
        {activity.length ? <ol className="max-h-[300px] overflow-y-auto px-4">{activity.map((item, index) => <li key={`${item.date}-${item.description}-${index}`} className="grid grid-cols-[90px_70px_1fr] gap-x-2 border-b border-[#f0f1f2] py-3 text-xs last:border-0 sm:grid-cols-[95px_75px_1fr]">
          <span className="text-[#9199a6]">{item.date}</span><span className={`w-fit rounded px-1.5 py-0.5 font-semibold ${item.kind === "Monitoring" ? "bg-[#eaf1ff] text-[#1556bd]" : item.kind === "ISP" ? "bg-[#ffecef] text-[#ad283b]" : "bg-[#e8fbf4] text-[#16815e]"}`}>{item.kind}</span>
          <span className="leading-5 text-[#4b5563]">{item.description}</span><span className="col-start-2 mt-1 text-[#9199a6]">{item.source}</span>
        </li>)}</ol> : <p className="px-4 py-8 text-center text-[#6b7280]">No monitoring activity recorded yet.</p>}
      </section>
    </div>

    <Dialog open={dialog === "follow-up"} onOpenChange={(open) => { if (!open) setDialog(null); }}>
      <DialogContent showCloseButton={false} className="flex max-h-[calc(100vh-32px)] w-[calc(100vw-32px)] max-w-[464px] flex-col overflow-hidden p-0">
        <form onSubmit={saveFollowUp} className="flex min-h-0 flex-col">
          <div className="flex items-start justify-between gap-4 px-5 pt-5"><DialogTitle className="text-lg leading-7">Follow-Up: Missing PA (Aug 10–16)</DialogTitle><CloseButton onClick={() => setDialog(null)} /></div>
          <DialogDescription className="sr-only">Create a follow-up task for the missing weekly prior authorization.</DialogDescription>
          <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-4">
            <div className="rounded-lg border border-[#f9dc85] bg-[#fffdf2] p-3 text-xs leading-5 text-[#a54a0b]"><strong>Missing PA</strong><p>Weekly PA for Community Inclusion Services (Aug 10–16) has not been recorded. A follow-up task will be created.</p></div>
            <div><label htmlFor="sc-follow-up-method" className="mb-1 block font-semibold">Follow-Up Method</label><Select value={method} onValueChange={setMethod} required><SelectTrigger id="sc-follow-up-method" className="w-full"><SelectValue placeholder="-- Select method --" /></SelectTrigger><SelectContent><SelectItem value="Phone call">Phone call</SelectItem><SelectItem value="Email">Email</SelectItem><SelectItem value="In person">In person</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
            <div><label htmlFor="sc-follow-up-notes" className="mb-1 block font-semibold">Notes</label><Textarea id="sc-follow-up-notes" value={followUpNotes} onChange={(event) => setFollowUpNotes(event.target.value)} placeholder="e.g. Community Inclusion Services" className="min-h-20 resize-y" /></div>
          </div>
          <div className="flex justify-end gap-2 px-5 pb-5"><Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit" disabled={!method} className="bg-[#008f93] hover:bg-[#00777b]">Create follow-up task</Button></div>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={dialog === "monitoring"} onOpenChange={(open) => { if (!open) setDialog(null); }}>
      <DialogContent showCloseButton={false} className="flex max-h-[calc(100vh-32px)] w-[calc(100vw-32px)] max-w-[464px] flex-col overflow-hidden p-0">
        <form onSubmit={saveMonitoring} className="flex min-h-0 flex-col">
          <div className="flex items-start justify-between gap-4 px-5 pt-5"><div><DialogTitle className="text-xl font-medium leading-7">Individual Supports</DialogTitle><DialogDescription className="mt-1 flex items-center gap-2 text-xs leading-5 text-[#4b5563]">Morning Star Supportive Services Corp <span className="rounded bg-[#e8fbf4] px-2 py-0.5 font-semibold text-[#16815e]">Active</span></DialogDescription></div><CloseButton onClick={() => setDialog(null)} /></div>
          <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-4">
            {monitoringQuestions.map(({ label, question, options }) => <fieldset key={label}><legend className="text-sm"><strong>{label}:</strong> {question}</legend><div className="mt-1 flex flex-wrap gap-1.5">{options.map((option) => <button key={option} type="button" onClick={() => { setAnswers((current) => ({ ...current, [label]: option })); setMonitoringError(false); }} aria-pressed={answers[label] === option} className={`rounded border px-3 py-1 text-xs font-semibold transition-colors ${answers[label] === option ? "border-[#00a975] bg-[#0bad78] text-white" : "border-[#e5e7eb] bg-white hover:border-[#00a4a8]"}`}>{option}</button>)}</div></fieldset>)}
            {monitoringError && <p role="alert" className="text-xs text-[#ad283b]">Answer each monitoring question before saving.</p>}
            <fieldset className="border-t border-[#e5e7eb] pt-3"><legend className="pt-2 font-semibold">Client monitoring</legend><div className="mt-2 grid grid-cols-2 gap-3 rounded-lg border border-[#e5e7eb] p-2 sm:grid-cols-3">{monitoringAreas.map((area) => <Checkbox key={area} label={area} checked={areas.includes(area)} onChange={() => setAreas((current) => current.includes(area) ? current.filter((item) => item !== area) : [...current, area])} className="size-4 rounded border-[#00a4a8]" labelClassName="text-xs font-normal" />)}</div></fieldset>
            <div><label htmlFor="sc-monitoring-notes" className="mb-1 block font-semibold">Notes</label><Textarea id="sc-monitoring-notes" value={monitoringNotes} onChange={(event) => setMonitoringNotes(event.target.value)} placeholder="e.g. Community Inclusion Services" className="min-h-20 resize-y" /></div>
          </div>
          <div className="flex justify-end gap-2 px-5 pb-5"><Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button type="submit" className="bg-[#008f93] hover:bg-[#00777b]">Save monitoring record</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </section>;
}

function StatusDot({ color }: { color: "green" | "amber" }) {
  return <span aria-hidden="true" className={`inline-block size-2 rounded-full ${color === "green" ? "bg-[#06b981]" : "bg-[#f5b400]"}`} />;
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return <button type="button" aria-label="Close" onClick={onClick} className="grid size-7 shrink-0 place-items-center rounded-full bg-[#f1f4f6] text-[#374151] transition-colors hover:bg-[#e5e7eb]"><X className="size-4" /></button>;
}
