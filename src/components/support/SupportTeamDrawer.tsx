import { useEffect, useMemo, useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  getEligibleMembers,
  getSupportSettings,
  saveSupportSettings,
  supportErrorMessage,
  type EligibleMember,
  type SupportDesk,
  type SupportSettings,
  type SupportTeamMember,
} from "@/lib/api/support";

export const fieldClass = "h-9 w-full rounded-[8px] border border-[#e3e8ea] bg-white px-2.5 text-[13.5px] text-[#10141a] outline-none focus:border-[#007679] focus:ring-2 focus:ring-[#007679]/20 disabled:opacity-60 dark:border-white/15 dark:bg-[#1b232b] dark:text-[#f4f6f7]";

/** A panel that slides in from the right. */
export function SideDrawer({ open, onOpenChange, title, description, children, footer, width = "max-w-[560px]" }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/25" />
        <DialogPrimitive.Content className={cn("fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl outline-none dark:bg-[#1b232b]", width)}>
          <div className="flex items-start gap-3 border-b border-[#e3e8ea] px-5 py-4 dark:border-white/10">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-[18px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{title}</DialogPrimitive.Title>
              {description ? <DialogPrimitive.Description className="mt-0.5 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">{description}</DialogPrimitive.Description> : <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>}
            </div>
            <DialogPrimitive.Close aria-label="Close" className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-[#10141a] hover:bg-[#f1f3f4] dark:text-[#f4f6f7] dark:hover:bg-white/10">
              <X aria-hidden="true" className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-[#e3e8ea] px-5 py-3 dark:border-white/10">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="border-b border-[#edf1f2] py-4 first:pt-0 last:border-0 dark:border-white/10">
      <h3 className="text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{title}</h3>
      {hint && <p className="mt-0.5 text-[12.5px] text-[#5d6b73] dark:text-[#9aa4a8]">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export const primaryButton = "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#007679] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#00686b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButton = "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[#e3e8ea] px-4 text-[13px] font-medium text-[#10141a] transition-colors hover:bg-[#f3f5f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-[#f4f6f7] dark:hover:bg-white/5";

/**
 * Who answers support, when, how fast, and whether the assistant answers first.
 * Leads (and the agency owner, or a global super admin on the corporate desk) can edit;
 * everyone else on the team sees it read-only.
 */
export function SupportTeamDrawer({ desk, open, onOpenChange, onSaved }: {
  desk: SupportDesk;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (settings: SupportSettings) => void;
}) {
  const [settings, setSettings] = useState<SupportSettings | null>(null);
  const [eligible, setEligible] = useState<EligibleMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [keywords, setKeywords] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSettings(null);
    getSupportSettings(desk)
      .then(async (loaded) => {
        if (cancelled) return;
        setSettings(loaded);
        setKeywords(loaded.urgentKeywords.join(", "));
        if (loaded.canManage) setEligible(await getEligibleMembers(desk));
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(supportErrorMessage(error, "Support settings could not be loaded."));
          onOpenChange(false);
        }
      });
    return () => { cancelled = true; };
  }, [open, desk, onOpenChange]);

  const available = useMemo(() => eligible.filter((person) => !settings?.team.some((m) => m.uid === person.uid)), [eligible, settings]);
  const readOnly = !settings?.canManage;

  const patch = (next: Partial<SupportSettings>) => setSettings((current) => (current ? { ...current, ...next } : current));
  const patchMember = (uid: string, next: Partial<SupportTeamMember>) =>
    setSettings((current) => (current ? { ...current, team: current.team.map((m) => (m.uid === uid ? { ...m, ...next } : m)) } : current));

  const addMember = () => {
    const person = eligible.find((p) => p.uid === adding);
    if (!person || !settings) return;
    patch({ team: [...settings.team, { uid: person.uid, name: person.name, email: person.email, userType: person.userType, role: "agent", categories: [], receivesUrgent: true, active: true }] });
    setAdding("");
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const saved = await saveSupportSettings(desk, {
        aiEnabled: settings.aiEnabled,
        assistantName: settings.assistantName,
        routing: settings.routing,
        hours: settings.hours,
        replyTargetMinutes: settings.replyTargetMinutes,
        autoResolveHours: settings.autoResolveHours,
        categories: settings.categories,
        urgentKeywords: keywords.split(",").map((k) => k.trim()).filter((k) => k.length >= 2),
        team: settings.team.map(({ uid, role, categories, receivesUrgent, active }) => ({ uid, role, categories, receivesUrgent, active })),
      });
      setSettings(saved);
      onSaved?.(saved);
      toast.success("Support settings saved");
      onOpenChange(false);
    } catch (error) {
      toast.error(supportErrorMessage(error, "Settings were not saved."));
    } finally {
      setSaving(false);
    }
  };

  const hoursLabel = (minutes: number) => (minutes >= 60 ? `${Math.round((minutes / 60) * 10) / 10} h` : `${minutes} min`);

  return (
    <SideDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Support team"
      description={desk === "corporate" ? "Who answers agencies, and how the CareOnboard assistant works." : "Who answers your staff, and how the assistant works."}
      footer={settings && !readOnly ? (
        <>
          <button type="button" className={secondaryButton} onClick={() => onOpenChange(false)}>Cancel</button>
          <button type="button" className={primaryButton} onClick={() => void save()} disabled={saving}>{saving && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}Save</button>
        </>
      ) : undefined}
    >
      {!settings ? (
        <div className="grid place-items-center py-16"><Loader2 aria-label="Loading" className="h-6 w-6 animate-spin text-[#5d6b73]" /></div>
      ) : (
        <fieldset disabled={readOnly} className="min-w-0">
          {readOnly && <p className="mb-4 rounded-[10px] bg-[#f4f6f7] p-3 text-[12.5px] text-[#5d6b73] dark:bg-white/5 dark:text-[#9aa4a8]">Only a support lead can change these settings.</p>}

          <Section title="People who answer" hint="New cases go to these people. Leads can change settings. Topics limit which cases someone gets; leave empty for all.">
            {settings.team.length === 0 && <p className="mb-3 text-[13px] text-[#8a5300]">Nobody is on the team yet, so new cases go to {desk === "corporate" ? "every super admin with Corporate Support" : "the agency owner"}.</p>}
            <ul className="flex flex-col gap-2">
              {settings.team.map((member) => (
                <li key={member.uid} className={cn("rounded-[12px] border border-[#e3e8ea] p-3 dark:border-white/10", !member.active && "opacity-60")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{member.name}</p>
                      <p className="truncate text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{member.email}</p>
                    </div>
                    <label className="sr-only" htmlFor={`role-${member.uid}`}>Role for {member.name}</label>
                    <select id={`role-${member.uid}`} value={member.role} onChange={(e) => patchMember(member.uid, { role: e.target.value as "lead" | "agent" })} className={cn(fieldClass, "w-auto")}>
                      <option value="agent">Agent</option>
                      <option value="lead">Lead</option>
                    </select>
                    <button type="button" aria-label={`Remove ${member.name}`} onClick={() => patch({ team: settings.team.filter((m) => m.uid !== member.uid) })} className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-[#b42318] hover:bg-[#fde8e8] dark:hover:bg-[#b42318]/20">
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label={`Topics for ${member.name}`}>
                    {settings.categories.map((category) => {
                      const on = member.categories.includes(category);
                      return (
                        <button key={category} type="button" aria-pressed={on}
                          onClick={() => patchMember(member.uid, { categories: on ? member.categories.filter((c) => c !== category) : [...member.categories, category] })}
                          className={cn("h-7 cursor-pointer rounded-full border px-2.5 text-[12px]", on ? "border-[#007679] bg-[#e3f6f6] text-[#00686b] dark:bg-[#00686b]/25 dark:text-[#7fd3d3]" : "border-[#e3e8ea] text-[#5d6b73] dark:border-white/15 dark:text-[#9aa4a8]")}>
                          {category}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-4 text-[12.5px] text-[#10141a] dark:text-[#f4f6f7]">
                    <label className="flex items-center gap-2"><Switch checked={member.receivesUrgent} onCheckedChange={(v) => patchMember(member.uid, { receivesUrgent: v })} aria-label={`${member.name} gets urgent cases`} />On call for urgent</label>
                    <label className="flex items-center gap-2"><Switch checked={member.active} onCheckedChange={(v) => patchMember(member.uid, { active: v })} aria-label={`${member.name} is taking cases`} />Taking cases</label>
                  </div>
                </li>
              ))}
            </ul>
            {!readOnly && (
              <div className="mt-3 flex gap-2">
                <label className="sr-only" htmlFor="support-add-member">Add a person</label>
                <select id="support-add-member" value={adding} onChange={(e) => setAdding(e.target.value)} className={fieldClass}>
                  <option value="">{available.length ? "Add a person…" : "Everyone who can answer is on the team"}</option>
                  {available.map((person) => <option key={person.uid} value={person.uid}>{person.name} · {person.title}</option>)}
                </select>
                <button type="button" className={secondaryButton} onClick={addMember} disabled={!adding}><Plus aria-hidden="true" className="h-4 w-4" />Add</button>
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 text-[13px] text-[#10141a] dark:text-[#f4f6f7]">
              <label htmlFor="support-routing">New cases go to</label>
              <select id="support-routing" value={settings.routing} onChange={(e) => patch({ routing: e.target.value as SupportSettings["routing"] })} className={cn(fieldClass, "w-auto")}>
                <option value="round_robin">one person at a time, in turn</option>
                <option value="team">the whole team</option>
              </select>
            </div>
          </Section>

          <Section title="AI assistant" hint="The assistant answers from your help articles first and hands the case to a person when it isn't sure, the person asks, or it sounds urgent.">
            <label className="flex items-center gap-2.5 text-[13.5px] text-[#10141a] dark:text-[#f4f6f7]">
              <Switch checked={settings.aiEnabled} onCheckedChange={(v) => patch({ aiEnabled: v })} aria-label="Assistant answers first" />
              Assistant answers first
            </label>
            <label className="mt-3 block text-[12.5px] font-medium text-[#5d6b73] dark:text-[#9aa4a8]" htmlFor="support-assistant-name">Assistant name</label>
            <input id="support-assistant-name" value={settings.assistantName} maxLength={60} onChange={(e) => patch({ assistantName: e.target.value })} className={cn(fieldClass, "mt-1")} />
          </Section>

          <Section title="Reply targets" hint="Counted in business hours. Urgent counts every minute.">
            <div className="grid grid-cols-3 gap-2">
              {(["normal", "high", "urgent"] as const).map((priority) => (
                <label key={priority} className="text-[12.5px] font-medium capitalize text-[#5d6b73] dark:text-[#9aa4a8]">
                  {priority} <span className="font-normal">({hoursLabel(settings.replyTargetMinutes[priority])})</span>
                  <select value={settings.replyTargetMinutes[priority]} onChange={(e) => patch({ replyTargetMinutes: { ...settings.replyTargetMinutes, [priority]: Number(e.target.value) } })} className={cn(fieldClass, "mt-1")}>
                    {[15, 30, 60, 120, 240, 480, 1440].map((m) => <option key={m} value={m}>{hoursLabel(m)}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <label className="mt-3 block text-[12.5px] font-medium text-[#5d6b73] dark:text-[#9aa4a8]">
              Close cases waiting on the person after
              <select value={settings.autoResolveHours} onChange={(e) => patch({ autoResolveHours: Number(e.target.value) })} className={cn(fieldClass, "mt-1")}>
                {[24, 48, 72, 120, 168].map((h) => <option key={h} value={h}>{h / 24} day{h === 24 ? "" : "s"}</option>)}
              </select>
            </label>
          </Section>

          <Section title="Business hours">
            <label className="flex items-center gap-2.5 text-[13.5px] text-[#10141a] dark:text-[#f4f6f7]">
              <Switch checked={settings.hours.allDay} onCheckedChange={(v) => patch({ hours: { ...settings.hours, allDay: v } })} aria-label="Answer around the clock" />
              Around the clock
            </label>
            {!settings.hours.allDay && (
              <>
                <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Days">
                  {DAYS.map((day, index) => {
                    const on = settings.hours.days.includes(index);
                    return (
                      <button key={day} type="button" aria-pressed={on}
                        onClick={() => patch({ hours: { ...settings.hours, days: on ? settings.hours.days.filter((d) => d !== index) : [...settings.hours.days, index].sort() } })}
                        className={cn("h-8 w-11 cursor-pointer rounded-[8px] border text-[12.5px]", on ? "border-[#007679] bg-[#e3f6f6] text-[#00686b] dark:bg-[#00686b]/25 dark:text-[#7fd3d3]" : "border-[#e3e8ea] text-[#5d6b73] dark:border-white/15")}>
                        {day}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <label className="text-[12.5px] font-medium text-[#5d6b73] dark:text-[#9aa4a8]">From<input type="time" value={settings.hours.start} onChange={(e) => patch({ hours: { ...settings.hours, start: e.target.value } })} className={cn(fieldClass, "mt-1")} /></label>
                  <label className="text-[12.5px] font-medium text-[#5d6b73] dark:text-[#9aa4a8]">To<input type="time" value={settings.hours.end} onChange={(e) => patch({ hours: { ...settings.hours, end: e.target.value } })} className={cn(fieldClass, "mt-1")} /></label>
                  <div className="text-[12.5px] font-medium text-[#5d6b73] dark:text-[#9aa4a8]">Time zone
                    <p className={cn(fieldClass, "mt-1 flex items-center bg-[#f6f8f9] font-normal dark:bg-white/5")}>Eastern Time</p>
                  </div>
                </div>
              </>
            )}
          </Section>

          <Section title="Topics" hint="People pick one when they ask, and the assistant files cases under them.">
            <ul className="flex flex-wrap gap-1.5">
              {settings.categories.map((category) => (
                <li key={category} className="inline-flex h-7 items-center gap-1 rounded-full bg-[#f1f3f4] pl-2.5 pr-1 text-[12.5px] text-[#10141a] dark:bg-white/10 dark:text-[#f4f6f7]">
                  {category}
                  {!readOnly && settings.categories.length > 1 && (
                    <button type="button" aria-label={`Remove ${category}`} onClick={() => patch({ categories: settings.categories.filter((c) => c !== category), team: settings.team.map((m) => ({ ...m, categories: m.categories.filter((c) => c !== category) })) })} className="grid h-5 w-5 cursor-pointer place-items-center rounded-full hover:bg-black/10"><X aria-hidden="true" className="h-3 w-3" /></button>
                  )}
                </li>
              ))}
            </ul>
            {!readOnly && (
              <div className="mt-2 flex gap-2">
                <label className="sr-only" htmlFor="support-new-topic">New topic</label>
                <input id="support-new-topic" value={newCategory} maxLength={60} onChange={(e) => setNewCategory(e.target.value)} placeholder="Add a topic" className={fieldClass} />
                <button type="button" className={secondaryButton} disabled={!newCategory.trim() || settings.categories.includes(newCategory.trim())}
                  onClick={() => { patch({ categories: [...settings.categories, newCategory.trim()] }); setNewCategory(""); }}>Add</button>
              </div>
            )}
          </Section>

          <Section title="Extra urgent words" hint="Messages with these words skip the assistant and alert everyone on call. Common ones like 911, fell, injured and abuse are always included.">
            <label className="sr-only" htmlFor="support-keywords">Extra urgent words, separated by commas</label>
            <input id="support-keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="For example: van broke down, locked out" className={fieldClass} />
          </Section>
        </fieldset>
      )}
    </SideDrawer>
  );
}
