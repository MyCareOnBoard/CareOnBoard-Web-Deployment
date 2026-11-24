import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DRAWER_ERROR, DRAWER_FIELD, DRAWER_HINT, DRAWER_LABEL, DRAWER_PRIMARY, DRAWER_SECONDARY } from "@/components/agency/ScheduleDrawerParts";
import { PlaceSearchInput } from "@/components/ci/PlaceSearchInput";
import { cn } from "@/lib/utils";
import {
  apiErrorMessage, ciApi, CI_LOCATION_CATEGORIES,
  type CiAddress, type CiLocation, type CiLocationCategory, type CiSettings,
} from "@/lib/api/ci-tracker";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CHECK_ROW = "flex items-start gap-2.5 text-[14px] text-[#10141a] dark:text-[#f4f6f7]";

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-4 border-t border-[#eceef0] px-6 py-5 first:border-t-0 dark:border-white/10">
      <div>
        <h3 className="text-[15px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{title}</h3>
        {subtitle && <p className={cn(DRAWER_HINT, "mt-0.5")}>{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

/**
 * Community inclusion and day program settings (reporting week, outing rules and saved
 * places), opened from the Community inclusion page.
 */
export function CiSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [settings, setSettings] = useState<CiSettings | null>(null);
  const [ratioText, setRatioText] = useState("");
  const [saving, setSaving] = useState(false);
  const [places, setPlaces] = useState<CiLocation[] | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [newPlace, setNewPlace] = useState<{ name: string; category: CiLocationCategory; address: CiAddress | null }>({ name: "", category: "library", address: null });
  const [placeBusy, setPlaceBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    ciApi.getSettings()
      .then((s) => { setSettings(s); setRatioText(s.staffRatio == null ? "" : String(s.staffRatio)); })
      .catch((err) => setError(apiErrorMessage(err, "Settings could not be loaded.")));
  }, [open]);
  useEffect(() => {
    if (!open) return;
    ciApi.listLocations(showArchived).then(setPlaces).catch(() => setPlaces([]));
  }, [open, showArchived]);

  const ratio = ratioText.trim() === "" ? null : Number(ratioText);
  const ratioValid = ratio === null || (Number.isInteger(ratio) && ratio >= 1 && ratio <= 30);
  const set = <K extends keyof CiSettings>(key: K, value: CiSettings[K]) => setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));

  async function saveSettings() {
    if (!settings || !ratioValid) return;
    setSaving(true);
    try {
      const saved = await ciApi.saveSettings({ ...settings, staffRatio: ratio });
      setSettings(saved);
      toast.success("Community inclusion settings saved");
      onOpenChange(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Settings could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  async function addPlace() {
    const name = newPlace.name.trim();
    if (!name) return;
    setPlaceBusy("new");
    try {
      const created = await ciApi.createLocation({ name, category: newPlace.category, ...(newPlace.address ? { address: newPlace.address } : {}) });
      setPlaces((prev) => [...(prev || []), created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewPlace({ name: "", category: newPlace.category, address: null });
    } catch (err) {
      toast.error(apiErrorMessage(err, "The place could not be saved."));
    } finally {
      setPlaceBusy(null);
    }
  }

  async function setArchived(place: CiLocation, archived: boolean) {
    setPlaceBusy(place.id);
    try {
      const updated = await ciApi.updateLocation(place.id, { active: !archived });
      setPlaces((prev) => (prev || []).flatMap((p) => (p.id !== place.id ? [p] : !showArchived && archived ? [] : [updated])));
    } catch (err) {
      toast.error(apiErrorMessage(err, "The place could not be updated."));
    } finally {
      setPlaceBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-32px)] max-w-[640px] flex-col overflow-hidden p-0" showCloseButton={false}>
        <div className="border-b border-[#eceef0] px-6 py-5 dark:border-white/10">
          <DialogTitle className="text-[20px] leading-7">Community inclusion settings</DialogTitle>
          <DialogDescription className="text-[14px]">Applies to community inclusion and day program outings and logs.</DialogDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {error ? (
            <p role="alert" className={cn(DRAWER_ERROR, "px-6 py-5 text-[14px]")}>{error}</p>
          ) : !settings ? (
            <p className="flex items-center gap-2 px-6 py-5 text-[14px] text-[#5b636b]"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Loading settings…</p>
          ) : (
            <>
              <Section title="Reporting week" subtitle="Logs are due once a week, for every day the client attended.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className={DRAWER_LABEL}>Week ends on</span>
                    <select className={DRAWER_FIELD} value={settings.weekEndsOn} onChange={(e) => set("weekEndsOn", Number(e.target.value))}>
                      {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={DRAWER_LABEL}>Logs due by (agency time)</span>
                    <input type="time" className={DRAWER_FIELD} value={settings.dueTime} onChange={(e) => set("dueTime", e.target.value)} />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={DRAWER_LABEL}>Remind staff this many hours before</span>
                    <input type="number" min={0} max={168} className={DRAWER_FIELD} value={settings.reminderLeadHours} onChange={(e) => set("reminderLeadHours", Number(e.target.value))} />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={DRAWER_LABEL}>Hours to review after the due time</span>
                    <input type="number" min={0} max={168} className={DRAWER_FIELD} value={settings.adminGraceHours} onChange={(e) => set("adminGraceHours", Number(e.target.value))} />
                  </label>
                </div>
              </Section>

              <Section title="Outings and logs">
                <label className="flex flex-col gap-1.5">
                  <span className={DRAWER_LABEL}>Clients per staff member</span>
                  <input inputMode="numeric" className={cn(DRAWER_FIELD, "max-w-[160px]")} value={ratioText} onChange={(e) => setRatioText(e.target.value)} aria-invalid={!ratioValid} placeholder="No limit" />
                  {!ratioValid
                    ? <span className={DRAWER_ERROR}>Enter a whole number from 1 to 30.</span>
                    : <span className={DRAWER_HINT}>Leave empty for no limit. Scheduling over the ratio shows a warning but is allowed.</span>}
                </label>
                <label className={CHECK_ROW}>
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#003839]" checked={settings.requireGoalPerRow} onChange={(e) => set("requireGoalPerRow", e.target.checked)} />
                  Every log row must link to an approved goal
                </label>
                <label className={CHECK_ROW}>
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#003839]" checked={settings.requireLibraryLocation} onChange={(e) => set("requireLibraryLocation", e.target.checked)} />
                  <span>
                    Require a saved place for every outing
                    <span className={cn(DRAWER_HINT, "block")}>Log rows whose place isn't a saved library are also flagged.</span>
                  </span>
                </label>
              </Section>

              <Section title="Saved places" subtitle="Places staff pick from when they schedule an outing or fill in a log row.">
                <div className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
                  <PlaceSearchInput
                    value={newPlace.name}
                    placeholder="Search a place, e.g. Ocean County Library"
                    onChange={(name) => setNewPlace((p) => ({ ...p, name, address: null }))}
                    onPick={(picked) => setNewPlace((p) => ({ name: picked.name, category: picked.category ?? p.category, address: picked.address }))}
                  />
                  <select className={DRAWER_FIELD} aria-label="Place type" value={newPlace.category} onChange={(e) => setNewPlace((p) => ({ ...p, category: e.target.value as CiLocationCategory }))}>
                    {CI_LOCATION_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <button type="button" className={cn(DRAWER_SECONDARY, "flex-none")} disabled={!newPlace.name.trim() || placeBusy === "new"} onClick={() => void addPlace()}>
                    {placeBusy === "new" && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}Add place
                  </button>
                  {newPlace.address?.address && <span className={cn(DRAWER_HINT, "sm:col-span-3")}>{newPlace.address.address}</span>}
                </div>
                <label className={cn(CHECK_ROW, "text-[#5b636b] dark:text-[#9aa4a8]")}>
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#003839]" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                  Show archived places
                </label>
                {!places ? <p className={DRAWER_HINT}>Loading places…</p> : places.length === 0 ? <p className={DRAWER_HINT}>No saved places yet.</p> : (
                  <ul className="divide-y divide-[#eceef0] rounded-[10px] border border-[#dcdfe2] dark:divide-white/10 dark:border-white/15">
                    {places.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 px-3.5 py-2.5 text-[14px]">
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate font-medium", p.active === false ? "text-[#8a979d]" : "text-[#10141a] dark:text-[#f4f6f7]")}>{p.name}{p.active === false ? " (archived)" : ""}</span>
                          <span className={cn(DRAWER_HINT, "block truncate")}>{CI_LOCATION_CATEGORIES.find((c) => c.value === p.category)?.label}{p.address?.address ? ` · ${p.address.address}` : ""}</span>
                        </span>
                        <button type="button" disabled={placeBusy === p.id} onClick={() => void setArchived(p, p.active !== false)} className="cursor-pointer text-[13px] font-medium text-[#0b5c5d] underline underline-offset-2 disabled:opacity-50 dark:text-[#7fd3d3]">
                          {p.active === false ? "Restore" : "Archive"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </>
          )}
        </div>

        <div className="flex gap-3 border-t border-[#eceef0] px-6 py-4 dark:border-white/10">
          <button type="button" className={DRAWER_SECONDARY} onClick={() => onOpenChange(false)}>Close</button>
          <button type="button" className={DRAWER_PRIMARY} disabled={!settings || saving || !ratioValid} onClick={() => void saveSettings()}>
            {saving && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}Save settings
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
