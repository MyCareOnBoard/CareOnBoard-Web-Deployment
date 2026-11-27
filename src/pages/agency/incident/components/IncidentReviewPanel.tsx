import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Clock, Eye, Loader2, User, Users } from "lucide-react";
import { toast } from "sonner";
import VoiceEnabledTextarea from "@/components/VoiceEnabledTextarea";
import VoiceInputButton from "@/components/VoiceInputButton";
import { VoiceRecordingProvider } from "@/contexts/VoiceRecordingContext";
import { IncidentStatus, markIncidentNotResolved, resolveIncident, type IncidentReport } from "@/lib/api/incidents";
import { cn } from "@/lib/utils";
import { useAuth } from "@/utils/auth";
import { clientNameOf, formatWhen, IncidentStatusPill, isPending, witnessText } from "./incidentFormat";

type Decision = "resolve" | "notResolved";

const darkButton = "inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[#003839] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#0b4c4d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#0f7e7d] dark:hover:bg-[#13908f]";
const outlineButton = "inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#dcdfe2] bg-white px-4 text-[14px] font-medium text-[#10141a] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="rounded-[8px] bg-[#f4f5f6] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.08em] text-[#4b535b] dark:bg-white/5 dark:text-[#9aa4a8]">
      {children}
    </h3>
  );
}

const linkLabel: Record<string, string> = { note: "Open note", shift: "Open shift", document: "Open profile", training: "Open profile" };
const evidenceWhen = (at: string | null) => (at ? new Date(at).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Unknown date");

/** The records that triggered a system-opened incident, each with a way to open it. */
function EvidenceList({ evidence }: { evidence: NonNullable<IncidentReport["evidence"]> }) {
  return (
    <section className="space-y-2">
      <SectionLabel>Records behind this</SectionLabel>
      <ul className="divide-y divide-[#e6eaec] px-1 text-[14px] dark:divide-white/10">
        {evidence.map((item, index) => (
          <li key={`${item.shiftId || "record"}-${index}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2">
            <span>
              <span className="font-medium">{evidenceWhen(item.at)}</span>
              {item.what && <span className="text-[#4b535b] dark:text-[#9aa4a8]"> · {item.what}</span>}
              {item.problems.length > 0 && <span> · {item.problems.join(", ")}</span>}
              {item.minutesLate !== null && item.minutesLate > 0 && <span> · {item.minutesLate} min late</span>}
            </span>
            {item.link && <a href={item.link} className="shrink-0 font-semibold text-[#007679] underline dark:text-[#7fd3d3]">{linkLabel[item.kind] || "Open record"}</a>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Narrative({ label, text }: { label: string; text?: string | null }) {
  return (
    <section className="space-y-2">
      <SectionLabel>{label}</SectionLabel>
      <p className={cn("whitespace-pre-wrap break-words px-1 text-[14px] leading-6", text?.trim() ? "text-[#10141a] dark:text-[#e6eaec]" : "text-[#6b737a] dark:text-[#9aa4a8]")}>
        {text?.trim() || "Not recorded."}
      </p>
    </section>
  );
}

/**
 * The selected incident: who, when, the report itself, and (while it is pending) the reviewer's
 * decision. Resolving needs reviewer notes; "not resolved" needs a reason. Both accept voice input.
 */
export default function IncidentReviewPanel({ incident, staffNoun, onDecided }: {
  incident: IncidentReport;
  /** "DSP", "Caregiver"… for "Reported by". */
  staffNoun: string;
  onDecided: (incidentId: string, status: IncidentStatus) => void;
}) {
  const { user } = useAuth();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  // A different incident starts with a clean slate.
  useEffect(() => { setDecision(null); setText(""); }, [incident.id]);

  const pending = isPending(incident.status);
  const reporter = incident.employee?.fullName
    || [incident.employee?.firstName, incident.employee?.lastName].filter(Boolean).join(" ")
    || "Unknown";
  const rows: { icon: ComponentType<{ className?: string }>; label: string; value: string }[] = [
    { icon: User, label: "Client", value: clientNameOf(incident) },
    { icon: Users, label: incident.source === "compliance_pattern" ? "Detected for" : "Reported by", value: `${reporter}, ${staffNoun}` },
    { icon: Clock, label: "When", value: formatWhen(incident) },
    { icon: Eye, label: "Witness", value: witnessText(incident.witness) },
  ];

  const choose = (next: Decision) => { setDecision(next); setText(""); };

  const submit = async () => {
    if (!decision) return;
    if (!user?.id || !user?.agencyId) { toast.error("Sign in again to review incidents."); return; }
    if (!text.trim()) return;
    setSaving(true);
    try {
      if (decision === "resolve") {
        await resolveIncident(incident.id, { reviewerId: user.id, reviewerNotes: text.trim() });
        toast.success("Incident marked as resolved.");
        onDecided(incident.id, IncidentStatus.RESOLVED);
      } else {
        await markIncidentNotResolved(incident.id, { reviewerId: user.id, reason: text.trim() });
        toast.success("Incident marked as not resolved.");
        onDecided(incident.id, IncidentStatus.NOT_RESOLVED);
      }
      setDecision(null);
      setText("");
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
      toast.error(data?.message || data?.error || (error as Error)?.message || "The incident could not be updated. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const outcome = incident.status === IncidentStatus.RESOLVED ? incident.reviewerNotes
    : incident.status === IncidentStatus.NOT_RESOLVED ? incident.notResolvedReason || incident.reviewerNotes
      : undefined;

  return (
    <VoiceRecordingProvider pageTitle="Incident review">
      <article aria-labelledby="incident-panel-title" className="rounded-[16px] border border-[#e4e7ea] bg-white p-5 dark:border-white/10 dark:bg-[#1b232b]">
        <div className="flex items-start justify-between gap-3">
          <h2 id="incident-panel-title" className="text-[20px] font-medium leading-snug text-[#10141a] dark:text-[#f4f6f7]">Incident report</h2>
          <IncidentStatusPill status={incident.status} />
        </div>

        <div className="mt-4 space-y-4">
          <section className="space-y-2">
            <SectionLabel>Details</SectionLabel>
            <dl className="rounded-[12px] bg-[#f8f9fa] px-3 py-1 dark:bg-white/5">
              {rows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start justify-between gap-4 py-2.5 text-[14px]">
                  <dt className="flex shrink-0 items-center gap-2.5 text-[#4b535b] dark:text-[#9aa4a8]">
                    <Icon aria-hidden="true" className="h-[18px] w-[18px] text-[#007679] dark:text-[#7fd3d3]" />{label}
                  </dt>
                  <dd className="min-w-0 break-words text-right text-[#10141a] dark:text-[#f4f6f7]">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <Narrative label="What happened" text={incident.whatHappened} />
          {!!incident.evidence?.length && <EvidenceList evidence={incident.evidence} />}
          <Narrative label="Actions taken" text={incident.whatActionsTaken || incident.actionsTaken} />
          <Narrative label="What the staff did" text={incident.whatDidYouDo || incident.staffAction} />

          {!pending && outcome?.trim() && (
            <Narrative label={incident.status === IncidentStatus.RESOLVED ? "Reviewer notes" : "Why it was not resolved"} text={outcome} />
          )}
        </div>

        {pending && (
          <div className="mt-5 space-y-3">
            {decision && (
              <div className={cn(
                "rounded-[12px] border p-3",
                decision === "resolve" ? "border-[#007679]/40 bg-[#007679]/5" : "border-[#f5c2bd] bg-[#fdf3f2] dark:border-[#ef4444]/30 dark:bg-[#ef4444]/10",
              )}>
                <label htmlFor="incident-decision" className="mb-1.5 block text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
                  {decision === "resolve" ? "Reviewer notes" : "Why can't it be resolved?"}
                  <span className="sr-only"> (required)</span>
                </label>
                <VoiceEnabledTextarea
                  id="incident-decision"
                  value={text}
                  onChange={setText}
                  required
                  disabled={saving}
                  placeholder={decision === "resolve" ? "What was done to resolve it?" : "What is still outstanding?"}
                  className="min-h-[96px] bg-white text-[14px] dark:bg-[#151c22]"
                  fieldName={decision === "resolve" ? "Reviewer notes" : "Reason for not resolving"}
                  pageTitle="Incident review"
                />
              </div>
            )}
            <div className="flex flex-col gap-2.5 sm:flex-row">
              {decision ? (
                <>
                  <button type="button" onClick={() => { setDecision(null); setText(""); }} disabled={saving} className={outlineButton}>Back</button>
                  <button type="button" onClick={() => void submit()} disabled={saving || !text.trim()}
                    className={cn(darkButton, decision === "notResolved" && "bg-[#c4262e] hover:bg-[#a91f26] dark:bg-[#c4262e] dark:hover:bg-[#a91f26]")}>
                    {saving && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                    {decision === "resolve" ? "Confirm resolved" : "Confirm not resolved"}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => choose("notResolved")} className={outlineButton}>Mark as not resolved</button>
                  <button type="button" onClick={() => choose("resolve")} className={darkButton}>Mark as resolved</button>
                </>
              )}
            </div>
            <VoiceInputButton className="z-[60]" />
          </div>
        )}
      </article>
    </VoiceRecordingProvider>
  );
}
