import { useEffect, useState } from "react";
import { toast } from "sonner";
import SettingsSectionCard from "./SettingsSectionCard";
import { ciApi, apiErrorMessage, CI_LOCATION_CATEGORIES, type CiLocation, type CiLocationCategory, type CiSettings } from "@/lib/api/ci-tracker";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const INPUT = "h-10 rounded-lg border border-[#e4e7ea] bg-white px-3 text-sm text-[#10141a] outline-none focus-visible:border-[#00b4b8] disabled:bg-[#f3f5f6] dark:border-white/10 dark:bg-[#141b21] dark:text-[#f4f6f7]";
const BUTTON = "cursor-pointer rounded-full bg-[#00b4b8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#009da1] disabled:cursor-not-allowed disabled:opacity-50";

/** Agency settings › Community inclusion: reporting week, alerts, staff ratio and saved places. */
export default function CommunityInclusionSettingsTab() {
  const [settings, setSettings] = useState<CiSettings | null>(null);
  const [ratioText, setRatioText] = useState("");
  const [saving, setSaving] = useState(false);
  const [places, setPlaces] = useState<CiLocation[] | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [newPlace, setNewPlace] = useState<{ name: string; category: CiLocationCategory; address: string }>({ name: "", category: "library", address: "" });
  const [placeBusy, setPlaceBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    ciApi.getSettings()
      .then((s) => { setSettings(s); setRatioText(s.staffRatio == null ? "" : String(s.staffRatio)); })
      .catch((err) => setError(apiErrorMessage(err, "Settings could not be loaded.")));
  }, []);
  useEffect(() => {
    ciApi.listLocations(showArchived).then(setPlaces).catch(() => setPlaces([]));
  }, [showArchived]);

  const ratio = ratioText.trim() === "" ? null : Number(ratioText);
  const ratioValid = ratio === null || (Number.isInteger(ratio) && ratio >= 1 && ratio <= 30);

  async function saveSettings() {
    if (!settings || !ratioValid) return;
    setSaving(true);
    try {
      const saved = await ciApi.saveSettings({ ...settings, staffRatio: ratio });
      setSettings(saved);
      toast.success("Community inclusion settings saved");
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
      const created = await ciApi.createLocation({ name, category: newPlace.category, ...(newPlace.address.trim() ? { address: { address: newPlace.address.trim() } } : {}) });
      setPlaces((prev) => [...(prev || []), created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewPlace({ name: "", category: newPlace.category, address: "" });
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

  const set = <K extends keyof CiSettings>(key: K, value: CiSettings[K]) => setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));

  if (error) return <p role="alert" className="text-sm text-[#b42318]">{error}</p>;
  if (!settings) return <p className="text-sm text-[#5b636b]">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <SettingsSectionCard title="Reporting week" subtitle="Community inclusion and day program logs are due once a week, for every day the client attended.">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[#10141a] dark:text-[#f4f6f7]">
            Week ends on
            <select className={INPUT} value={settings.weekEndsOn} onChange={(e) => set("weekEndsOn", Number(e.target.value))}>
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[#10141a] dark:text-[#f4f6f7]">
            Logs due by (agency time)
            <input type="time" className={INPUT} value={settings.dueTime} onChange={(e) => set("dueTime", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[#10141a] dark:text-[#f4f6f7]">
            Remind staff this many hours before
            <input type="number" min={0} max={168} className={INPUT} value={settings.reminderLeadHours} onChange={(e) => set("reminderLeadHours", Number(e.target.value))} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[#10141a] dark:text-[#f4f6f7]">
            Hours the agency has to review after the due time
            <input type="number" min={0} max={168} className={INPUT} value={settings.adminGraceHours} onChange={(e) => set("adminGraceHours", Number(e.target.value))} />
          </label>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Outings and logs">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[#10141a] dark:text-[#f4f6f7]">
            Clients per staff member (leave empty for no limit)
            <input inputMode="numeric" className={`${INPUT} max-w-[160px]`} value={ratioText} onChange={(e) => setRatioText(e.target.value)} aria-invalid={!ratioValid} />
            {!ratioValid && <span className="text-xs font-normal text-[#b42318]">Enter a whole number from 1 to 30.</span>}
            <span className="text-xs font-normal text-[#5b636b]">Scheduling an outing over this ratio shows a warning but is allowed.</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-[#10141a] dark:text-[#f4f6f7]">
            <input type="checkbox" className="h-4 w-4 accent-[#00b4b8]" checked={settings.requireGoalPerRow} onChange={(e) => set("requireGoalPerRow", e.target.checked)} />
            Every log row must link to an approved goal
          </label>
          <label className="flex items-center gap-2 text-sm text-[#10141a] dark:text-[#f4f6f7]">
            <input type="checkbox" className="h-4 w-4 accent-[#00b4b8]" checked={settings.requireLibraryLocation} onChange={(e) => set("requireLibraryLocation", e.target.checked)} />
            Flag log rows whose place isn't a library
          </label>
          <div>
            <button type="button" className={BUTTON} disabled={saving || !ratioValid} onClick={() => void saveSettings()}>{saving ? "Saving…" : "Save settings"}</button>
          </div>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Saved places" subtitle="Places staff pick from when they schedule an outing or fill in a log row.">
        <div className="flex flex-col gap-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_160px_1fr_auto]">
            <input className={INPUT} placeholder="Name" aria-label="Place name" value={newPlace.name} onChange={(e) => setNewPlace((p) => ({ ...p, name: e.target.value }))} maxLength={120} />
            <select className={INPUT} aria-label="Place type" value={newPlace.category} onChange={(e) => setNewPlace((p) => ({ ...p, category: e.target.value as CiLocationCategory }))}>
              {CI_LOCATION_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input className={INPUT} placeholder="Address (optional)" aria-label="Address" value={newPlace.address} onChange={(e) => setNewPlace((p) => ({ ...p, address: e.target.value }))} maxLength={200} />
            <button type="button" className={BUTTON} disabled={!newPlace.name.trim() || placeBusy === "new"} onClick={() => void addPlace()}>Add place</button>
          </div>
          <label className="flex items-center gap-2 text-sm text-[#5b636b]">
            <input type="checkbox" className="h-4 w-4 accent-[#00b4b8]" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived places
          </label>
          {!places ? <p className="text-sm text-[#5b636b]">Loading places…</p> : places.length === 0 ? <p className="text-sm text-[#5b636b]">No saved places yet.</p> : (
            <ul className="divide-y divide-[#eceef0] rounded-lg border border-[#e4e7ea] dark:divide-white/10 dark:border-white/10">
              {places.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className={`block font-medium ${p.active === false ? "text-[#8a979d]" : "text-[#10141a] dark:text-[#f4f6f7]"}`}>{p.name}{p.active === false ? " (archived)" : ""}</span>
                    <span className="block text-xs text-[#5b636b]">{CI_LOCATION_CATEGORIES.find((c) => c.value === p.category)?.label}{p.address?.address ? ` · ${p.address.address}` : ""}</span>
                  </span>
                  <button type="button" disabled={placeBusy === p.id} onClick={() => void setArchived(p, p.active !== false)} className="cursor-pointer text-sm font-medium text-[#007f84] underline underline-offset-2 disabled:opacity-50">
                    {p.active === false ? "Restore" : "Archive"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SettingsSectionCard>
    </div>
  );
}
