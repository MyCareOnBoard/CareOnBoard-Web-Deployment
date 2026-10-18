import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BillingCornerModalHeader from "@/pages/agency/billing/components/BillingCornerModalHeader";
import {
  BILLING_CHECKBOX_CLASS,
  BILLING_CORNER_MODAL_CLASS,
  BILLING_FIELD_CLASS,
  BILLING_FIELD_LABEL_CLASS,
  BILLING_PRIMARY_BUTTON_CLASS,
  BILLING_SECONDARY_BUTTON_CLASS,
} from "@/pages/agency/billing/components/billingModalStyles";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";
import {
  getEdiSettings,
  saveEdiSettings,
  type EdiAgencyDefaults,
  type EdiSettings,
  type EdiUsageIndicator,
} from "@/lib/api/claims";
import { agencyDefaultPlaceholder, EDI_SETTINGS_FIELDS, EMPTY_EDI_SETTINGS } from "./x12ExportUtils";

type EdiSettingsDialogProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: (settings: EdiSettings) => void;
};

const SECTION_TITLES = {
  submitter: "Submitter",
  payer: "Receiver and payer",
  provider: "Billing provider",
} as const;

function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (message) return message;
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function EdiSettingsDialog({ open, onClose, onSaved }: EdiSettingsDialogProps) {
  const { agencyId } = useOperationalAgency();
  const [settings, setSettings] = useState<EdiSettings>(EMPTY_EDI_SETTINGS);
  const [agencyDefaults, setAgencyDefaults] = useState<EdiAgencyDefaults>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Saving after a failed load would overwrite the real settings with blanks.
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [savedUsage, setSavedUsage] = useState<EdiUsageIndicator>("T");
  const [productionConfirmed, setProductionConfirmed] = useState(false);
  const switchingToProduction = settings.usageIndicator === "P" && savedUsage !== "P";

  useEffect(() => {
    if (!open || !agencyId) return;
    const controller = new AbortController();
    setLoading(true);
    setLoadFailed(false);
    setError("");
    getEdiSettings({ context: { agencyId }, signal: controller.signal })
      .then(({ agencyDefaults: defaults, ...loaded }) => {
        if (controller.signal.aborted) return;
        setAgencyDefaults(defaults ?? {});
        // Keep the NJ defaults for fields that were never saved.
        const merged = { ...EMPTY_EDI_SETTINGS };
        for (const [key, value] of Object.entries(loaded) as Array<[keyof EdiSettings, string]>) {
          if (value) (merged as Record<keyof EdiSettings, string>)[key] = value;
        }
        setSettings(merged);
        setSavedUsage(merged.usageIndicator);
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setLoadFailed(true);
        setError(errorMessage(loadError, "Couldn't load 837P settings."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [agencyId, open, loadAttempt]);

  const update = (key: keyof EdiSettings, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!agencyId || loadFailed || (switchingToProduction && !productionConfirmed)) return;
    setSaving(true);
    setError("");
    try {
      const saved = await saveEdiSettings({ context: { agencyId }, settings });
      onSaved?.(saved);
      onClose();
    } catch (saveError) {
      setError(errorMessage(saveError, "Couldn't save 837P settings."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent showCloseButton={false} className={`${BILLING_CORNER_MODAL_CLASS} flex max-h-[90dvh] flex-col`}>
        <BillingCornerModalHeader
          title="837P settings"
          description="IDs and the billing address used in every 837P file. Get the submitter, receiver and payer IDs from your NJMMIS trading partner agreement and companion guide. Fields left blank use the agency profile."
          onClose={onClose}
          closeDisabled={saving}
        />

        <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-2 pt-6">
          {loading ? <p className="text-[14px] text-[#808081]">Loading…</p> : null}
          {(Object.keys(SECTION_TITLES) as Array<keyof typeof SECTION_TITLES>).map((section) => (
            <section key={section} className="space-y-4">
              <h3 className="text-[16px] font-semibold text-[#10141a]">{SECTION_TITLES[section]}</h3>
              {EDI_SETTINGS_FIELDS.filter((field) => field.section === section).map((field) => (
                <div key={field.key}>
                  <label htmlFor={`edi-${field.key}`} className={BILLING_FIELD_LABEL_CLASS}>
                    {field.label}
                  </label>
                  <Input
                    id={`edi-${field.key}`}
                    value={settings[field.key]}
                    placeholder={agencyDefaultPlaceholder(field.key, agencyDefaults)}
                    disabled={loading || saving || loadFailed}
                    onChange={(event) => update(field.key, event.target.value)}
                    className={`${BILLING_FIELD_CLASS} w-full`}
                  />
                  {field.hint ? <p className="mt-1 text-[12px] text-[#808081]">{field.hint}</p> : null}
                </div>
              ))}
            </section>
          ))}

          <section className="space-y-2">
            <label htmlFor="edi-usageIndicator" className={BILLING_FIELD_LABEL_CLASS}>File type</label>
            <Select
              value={settings.usageIndicator}
              onValueChange={(value) => {
                update("usageIndicator", value as EdiUsageIndicator);
                setProductionConfirmed(false);
              }}
              disabled={loading || saving || loadFailed}
            >
              <SelectTrigger id="edi-usageIndicator" className={`${BILLING_FIELD_CLASS} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="T">Test (send to the NJMMIS test system first)</SelectItem>
                <SelectItem value="P">Production</SelectItem>
              </SelectContent>
            </Select>
            {switchingToProduction ? (
              <div className="space-y-2 rounded-[10px] bg-[#fffaeb] px-4 py-3 text-[14px] text-[#b54708]">
                <p>
                  Production files are paid by NJ Medicaid. Only switch once NJMMIS has accepted your test file.
                </p>
                <Checkbox
                  checked={productionConfirmed}
                  onChange={(event) => setProductionConfirmed(event.target.checked)}
                  disabled={saving}
                  className={BILLING_CHECKBOX_CLASS}
                  label="NJMMIS accepted our test file"
                />
              </div>
            ) : null}
          </section>

          {error ? (
            <div role="alert" className="text-[14px] text-[#d92d20]">
              <p>{error}</p>
              {loadFailed ? (
                <button
                  type="button"
                  onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                  className="mt-1 font-medium underline"
                >
                  Try again
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 px-6 pb-8 pt-4">
          <button type="button" onClick={onClose} disabled={saving} className={BILLING_SECONDARY_BUTTON_CLASS}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || loading || loadFailed || (switchingToProduction && !productionConfirmed)}
            className={BILLING_PRIMARY_BUTTON_CLASS}
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
