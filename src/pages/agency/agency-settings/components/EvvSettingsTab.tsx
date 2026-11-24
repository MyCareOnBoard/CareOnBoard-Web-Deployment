import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import SettingsSectionCard from "./SettingsSectionCard";
import { Routes } from "@/routes/constants";
import { evvApi, evvErrorMessage, type EvvCode, type EvvProgram, type EvvSettings } from "@/lib/api/evv";

const INPUT = "h-10 rounded-lg border border-[#e4e7ea] bg-white px-3 text-sm text-[#10141a] outline-none focus-visible:border-[#00b4b8] disabled:bg-[#f3f5f6] dark:border-white/10 dark:bg-[#141b21] dark:text-[#f4f6f7]";
const BUTTON = "cursor-pointer rounded-full bg-[#00b4b8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#009da1] disabled:cursor-not-allowed disabled:opacity-50";
const GHOST = "cursor-pointer rounded-full border border-[#d5dadf] bg-white px-4 py-2 text-sm font-medium text-[#10141a] hover:border-[#00b4b8] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-transparent dark:text-[#f4f6f7]";
const LABEL = "flex flex-col gap-1.5 text-sm font-medium text-[#10141a] dark:text-[#f4f6f7]";

type CodeListKey = "payers" | "reasonCodes" | "actionCodes" | "missedReasonCodes" | "missedActionCodes" | "taskCodes";
const CODE_LISTS: { key: CodeListKey; title: string; hint: string }[] = [
  { key: "payers", title: "Payers", hint: "HHAeXchange payer ids, e.g. HRNJ for Horizon or FFNJ for Fee for Service." },
  { key: "reasonCodes", title: "Visit edit reasons", hint: "For manual entries and corrections (200 to 228). 222 needs a note." },
  { key: "actionCodes", title: "Visit edit actions taken", hint: "Sent with every visit edit reason (11 to 25)." },
  { key: "missedReasonCodes", title: "Missed visit reasons", hint: "Why a scheduled visit did not happen (600 to 609)." },
  { key: "missedActionCodes", title: "Missed visit actions taken", hint: "Sent with every missed visit reason (51 to 56)." },
  { key: "taskCodes", title: "Duties", hint: "Task codes sent as performed at clock-out (115 to 203)." },
];

const OFFICE_NPI = /^\d{10}$/;

/** One "CODE, Label" per line, so the agency can paste HHAeXchange's lists straight in. */
export function parseCodeLines(text: string): { codes: EvvCode[]; errors: string[] } {
  const codes: EvvCode[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const comma = line.indexOf(",");
    const code = (comma < 0 ? line : line.slice(0, comma)).trim();
    const label = (comma < 0 ? code : line.slice(comma + 1)).trim() || code;
    if (!code || code.length > 40 || label.length > 120) errors.push(`Line ${index + 1} is too long.`);
    else if (seen.has(code)) errors.push(`Code ${code} is listed twice.`);
    else { seen.add(code); codes.push({ code, label }); }
  });
  if (codes.length > 200) errors.push("Lists can hold up to 200 codes.");
  return { codes, errors };
}

const toLines = (codes: EvvCode[]) => codes.map((c) => (c.label && c.label !== c.code ? `${c.code}, ${c.label}` : c.code)).join("\n");

/** Agency settings › HHAeXchange EVV: switch, go-live date, programs, offices and code lists. */
export default function EvvSettingsTab({ canManage, supportedPrograms }: { canManage: boolean; supportedPrograms: EvvProgram[] }) {
  const [settings, setSettings] = useState<EvvSettings | null>(null);
  const [lists, setLists] = useState<Record<CodeListKey, string>>({ payers: "", reasonCodes: "", actionCodes: "", missedReasonCodes: "", missedActionCodes: "", taskCodes: "" });
  const [officesText, setOfficesText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  function adopt(next: EvvSettings) {
    setSettings(next);
    setLists({
      payers: toLines(next.payers),
      reasonCodes: toLines(next.reasonCodes),
      actionCodes: toLines(next.actionCodes),
      missedReasonCodes: toLines(next.missedReasonCodes),
      missedActionCodes: toLines(next.missedActionCodes),
      taskCodes: toLines(next.taskCodes),
    });
    setOfficesText(toLines(next.offices.map((o) => ({ code: o.hhaxOfficeId, label: o.name }))));
  }

  useEffect(() => {
    evvApi.getSettings().then(adopt).catch((err) => setError(evvErrorMessage(err, "EVV settings could not be loaded.")));
  }, []);

  const parsed = Object.fromEntries(CODE_LISTS.map(({ key }) => [key, parseCodeLines(lists[key])])) as Record<CodeListKey, ReturnType<typeof parseCodeLines>>;
  const parsedOffices = parseCodeLines(officesText);
  const offices = {
    codes: parsedOffices.codes,
    errors: [...parsedOffices.errors, ...parsedOffices.codes.filter((o) => !OFFICE_NPI.test(o.code)).map((o) => `Office NPI ${o.code} must be 10 digits.`)],
  };
  const listErrors = [...Object.values(parsed).flatMap((p) => p.errors), ...offices.errors];
  const goLiveMissing = Boolean(settings?.enabled && !settings.goLiveDate);

  const set = <K extends keyof EvvSettings>(key: K, value: EvvSettings[K]) => setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));

  async function save() {
    if (!settings || listErrors.length || goLiveMissing) return;
    setSaving(true);
    try {
      const officeList = offices.codes.map((o) => ({ hhaxOfficeId: o.code, name: o.label }));
      adopt(await evvApi.saveSettings({
        enabled: settings.enabled,
        environment: settings.environment,
        goLiveDate: settings.goLiveDate || null,
        programs: settings.programs,
        offices: officeList,
        defaultOfficeId: officeList.some((o) => o.hhaxOfficeId === settings.defaultOfficeId) ? settings.defaultOfficeId : officeList[0]?.hhaxOfficeId ?? null,
        payers: parsed.payers.codes,
        reasonCodes: parsed.reasonCodes.codes,
        actionCodes: parsed.actionCodes.codes,
        missedReasonCodes: parsed.missedReasonCodes.codes,
        missedActionCodes: parsed.missedActionCodes.codes,
        taskCodes: parsed.taskCodes.codes,
      }));
      toast.success("EVV settings saved");
    } catch (err) {
      toast.error(evvErrorMessage(err, "EVV settings could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    try {
      const result = await evvApi.testConnection();
      set("connection", { status: result.status, message: result.message, checkedAt: result.checkedAt ?? new Date().toISOString() });
      if (result.status === "connected") toast.success(`Connected to HHAeXchange ${result.environment}`);
      else toast.error(result.message || "HHAeXchange did not accept the connection.");
    } catch (err) {
      toast.error(evvErrorMessage(err, "The connection test failed."));
    } finally {
      setTesting(false);
    }
  }

  if (error) return <p role="alert" className="text-sm text-[#b42318]">{error}</p>;
  if (!settings) return <p className="text-sm text-[#5b636b]">Loading…</p>;
  const disabled = !canManage;
  const identity = settings.provider_identity;

  return (
    <div className="flex flex-col gap-6">
      <SettingsSectionCard title="HHAeXchange EVV" subtitle="Completed and missed visits for EVV clients are sent to HHAeXchange automatically, from the go-live date on.">
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm text-[#10141a] dark:text-[#f4f6f7]">
            <input type="checkbox" className="h-4 w-4 accent-[#00b4b8]" disabled={disabled} checked={settings.enabled} onChange={(e) => set("enabled", e.target.checked)} />
            Send visits to HHAeXchange
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={LABEL}>
              Send visits dated on or after
              <input type="date" className={INPUT} disabled={disabled} value={settings.goLiveDate ?? ""} onChange={(e) => set("goLiveDate", e.target.value || null)} aria-invalid={goLiveMissing} />
              {goLiveMissing && <span className="text-xs font-normal text-[#b42318]">Pick a go-live date before turning sending on.</span>}
            </label>
            <label className={LABEL}>
              HHAeXchange environment
              <select className={INPUT} disabled={disabled} value={settings.environment} onChange={(e) => set("environment", e.target.value as EvvSettings["environment"])}>
                <option value="sandbox">Sandbox (testing)</option>
                <option value="production">Production</option>
              </select>
              {settings.effectiveEnvironment !== settings.environment && <span className="text-xs font-normal text-[#5b636b]">This staging site always uses the sandbox.</span>}
            </label>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-[#10141a] dark:text-[#f4f6f7]">Programs</legend>
            {(["hha", "ddd"] as EvvProgram[]).filter((p) => supportedPrograms.includes(p)).map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm text-[#10141a] dark:text-[#f4f6f7]">
                <input type="checkbox" className="h-4 w-4 accent-[#00b4b8]" disabled={disabled} checked={settings.programs[p]} onChange={(e) => set("programs", { ...settings.programs, [p]: e.target.checked })} />
                {p === "hha" ? "HHA (personal care, home health)" : "DDD (developmental disabilities)"}
              </label>
            ))}
            <span className="text-xs text-[#5b636b]">Support Coordination is never sent. Clients marked as not needing EVV are skipped.</span>
          </fieldset>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Connection" subtitle="CareOnboard's HHAeXchange credentials are kept on the server and are never shown here.">
        <div className="flex flex-col gap-3 text-sm">
          <p>
            Status: <strong>{settings.credentialsConfigured ? connectionLabel(settings.connection.status) : "Credentials not set up on the server"}</strong>
            {settings.connection.checkedAt && <span className="text-[#5b636b]"> · checked {new Date(settings.connection.checkedAt).toLocaleString()}</span>}
          </p>
          {settings.connection.message && <p className="text-[#b42318]">{settings.connection.message}</p>}
          {!settings.sendsEnabled && settings.effectiveEnvironment === "production" && <p className="text-[#9a5b00]">Production sending is switched off on the server. Visits will wait in the queue.</p>}
          <p className="text-[#5b636b]">
            Sent as tax id •••• {identity.taxIdLast4 ?? "missing"}, NPI {identity.npi ?? "missing"}.{" "}
            <Link to={`${Routes.agency.agencySettings}?tab=agencyInfo`} className="text-[#007c7f] hover:underline">Edit in Agency information</Link>
          </p>
          {canManage && (
            <div><button type="button" className={GHOST} disabled={testing} onClick={() => void testConnection()}>{testing ? "Testing…" : "Test connection"}</button></div>
          )}
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Offices and code lists" subtitle="These start with New Jersey's lists from the HHAeXchange specification. Change them only if HHAeXchange gives the agency different ones. One per line as CODE, Label.">
        <div className="grid gap-4 lg:grid-cols-2">
          <CodeArea title="Offices" hint="Only for agencies with more than one HHAeXchange office: the office-level NPI, then the office name. The first one is the default. Leave empty to send the agency tax id." value={officesText} disabled={disabled} onChange={setOfficesText} errors={offices.errors} />
          {CODE_LISTS.map(({ key, title, hint }) => (
            <CodeArea key={key} title={title} hint={hint} value={lists[key]} disabled={disabled} errors={parsed[key].errors} onChange={(value) => setLists((prev) => ({ ...prev, [key]: value }))} />
          ))}
        </div>
      </SettingsSectionCard>

      {canManage && (
        <div>
          <button type="button" className={BUTTON} disabled={saving || listErrors.length > 0 || goLiveMissing} onClick={() => void save()}>{saving ? "Saving…" : "Save EVV settings"}</button>
        </div>
      )}
    </div>
  );
}

function connectionLabel(status: EvvSettings["connection"]["status"]) {
  return { connected: "Connected", auth_error: "Credentials refused", error: "Last test failed", not_configured: "Not set up", unknown: "Not tested yet" }[status] ?? status;
}

function CodeArea({ title, hint, value, disabled, errors, onChange }: { title: string; hint: string; value: string; disabled: boolean; errors: string[]; onChange: (value: string) => void }) {
  return (
    <label className={LABEL}>
      {title}
      <textarea className={`${INPUT} h-32 py-2 font-mono`} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} aria-invalid={errors.length > 0} />
      <span className="text-xs font-normal text-[#5b636b]">{hint}</span>
      {errors.map((e) => <span key={e} className="text-xs font-normal text-[#b42318]">{e}</span>)}
    </label>
  );
}
