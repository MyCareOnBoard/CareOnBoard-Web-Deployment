import React, { useCallback, useMemo, useState } from "react";
import { CalendarDays, Plus, Trash2, FileUp } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AddClientFormData,
  GUARDIAN_RELATIONSHIP_LABELS,
  GUARDIAN_RELATIONSHIP_VALUES,
  createEmptyOutcome,
  createEmptyGuardianContact,
  createEmptyHhaAuthorization,
  createEmptyHhaInsuranceInfo,
  createEmptyServiceAuthorization,
  type GuardianRelationship,
  type GuardianContact,
  Service,
  type ServicePayType,
  type YesNo,
  SDR_DETAILS_LIST_MAX,
  type ServiceSdrDetails,
} from "@/pages/shared/client-management/types/formData";
import { skipToken } from "@reduxjs/toolkit/query";
import { useListServicesQuery } from "@/lib/api/services";
import { Stage2SdrImportPanel } from "@/pages/shared/client-management/components/Stage2SdrImportPanel";
import { WeeklyDistributionInline } from "@/pages/shared/client-management/components/WeeklyDistributionInline";
import { ServiceAssignedDspsSection } from "@/pages/shared/client-management/components/ServiceAssignedDspsSection";
import { HhaAuthorizationFields } from "@/pages/shared/client-management/components/HhaAuthorizationFields";
import { RatePayTypeField } from "@/pages/shared/client-management/components/RatePayTypeField";
import { applyHhaCatalogService } from "@/pages/shared/client-management/utils/applyHhaCatalogService";
import type { HhaAuthorization } from "@/pages/shared/client-management/types/formData";
import { deriveAuthorizedHoursPerWeek } from "@/pages/shared/client-management/utils/deriveAuthorizedHoursPerWeek";
import { stripExtractedMoney } from "@/pages/shared/client-management/utils/normalizeExtractedServiceAuthorization";
import { weeklyDistributionFingerprintFromWd, normalizeWeeklyDistributionUpdate } from "@/pages/shared/client-management/utils/sdrWeeklyDistribution";
const RATE_INPUT_CLASS = "h-[44px] rounded-[12px] border-[#cccccd] bg-white";
const SELECT_TRIGGER_CLASS = "w-[180px] h-[44px] rounded-[12px] border-[#cccccd] bg-white";
const SECTION_HEADER_ACTION_BTN =
  "h-11 shrink-0 rounded-[60px] border border-[#b2b2b3] bg-white/40 px-5 text-[14px] font-semibold text-[#10141a] hover:bg-white/60";
const SECTION_DANGER_ACTION_BTN =
  "h-9 shrink-0 rounded-[60px] border border-red-200/90 bg-red-50 px-3 text-[14px] font-semibold text-red-700 hover:border-red-300 hover:bg-red-100 hover:text-red-800";
/** Visible on touch; on hover-capable devices show when section is hovered or focused. */
const SECTION_REMOVE_BTN_CLASS = [
  SECTION_DANGER_ACTION_BTN,
  "transition-opacity duration-150",
  "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:pointer-events-none",
  "[@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-hover:pointer-events-auto",
  "[@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-focus-within:pointer-events-auto",
  "focus-visible:opacity-100 focus-visible:pointer-events-auto",
].join(" ");

function splitSdrLinesToList(raw: string, maxEntries: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of raw.split(/\n/)) {
    const t = line.trim();
    if (!t || seen.has(t) || out.length >= maxEntries) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function stripCurrencyAndCommas(raw: string): string {
  return raw.replace(/\$/g, "").replace(/,/g, "").trim();
}

function applyGuardianFlagSelection(
  guardians: GuardianContact[],
  pickerValue: string,
  flag: "isLegalGuardian" | "hasPowerOfAttorney",
): GuardianContact[] {
  if (!pickerValue) {
    return guardians.map((g) => ({ ...g, [flag]: "no" as YesNo }));
  }
  return guardians.map((g) => ({
    ...g,
    [flag]: (g.id === pickerValue ? "yes" : "no") as YesNo,
  }));
}

/** Persist cost without `$`; allow decimals. */
function normalizeCostStored(raw: string): string | undefined {
  const s = stripCurrencyAndCommas(raw);
  if (!s) return undefined;
  const sanitized = s.replace(/[^\d.]/g, "");
  return sanitized === "" ? undefined : sanitized;
}

function ServiceCalendarDateField({
  label,
  value,
  open,
  onOpenChange,
  onSelectDate,
  placeholder = " ",
}: {
  label: string;
  value: Date | undefined;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelectDate: (d: Date | undefined) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-normal text-[#10141a]">{label}</label>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button type="button" className="w-full focus:outline-none">
            <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
              <InputGroupInput
                value={value ? format(value, "MMM d, yyyy") : ""}
                placeholder={placeholder}
                readOnly
                className="text-[#10141a]"
              />
              <InputGroupAddon align="inline-end">
                <CalendarDays className="h-5 w-5 text-[#10141a]" />
              </InputGroupAddon>
            </InputGroup>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="mt-3 w-auto border-none bg-white p-0 shadow-lg">
          <Calendar
            mode="single"
            selected={value}
            defaultMonth={value ?? new Date()}
            captionLayout="dropdown"
            fromYear={2000}
            toYear={new Date().getFullYear() + 10}
            formatters={{
              formatMonthDropdown: (date) => date.toLocaleString("default", { month: "long" }),
            }}
            classNames={{
              dropdown_root:
                "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
            }}
            onSelect={(d) => {
              if (d) {
                onSelectDate(d);
                onOpenChange(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function CalendarDateField({
  label,
  value,
  onSelectDate,
  placeholder = "Select date",
}: {
  label: string;
  value: Date | undefined;
  onSelectDate: (d: Date | undefined) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <ServiceCalendarDateField
      label={label}
      value={value}
      open={open}
      onOpenChange={setOpen}
      onSelectDate={onSelectDate}
      placeholder={placeholder}
    />
  );
}

const ServiceAuthorizationFields = React.memo(function ServiceAuthorizationFields({
  service,
  serviceId,
  outcomeId,
  onChange,
}: {
  service: Service;
  serviceId: string;
  outcomeId: string;
  onChange: (outcomeId: string, serviceId: string, next: Service) => void;
}) {
  const update = React.useCallback(
    (patch: Partial<Service>) => onChange(outcomeId, serviceId, { ...service, ...patch }),
    [service, serviceId, outcomeId, onChange],
  );

  const [isIspOpen, setIsIspOpen] = useState(false);
  const [isPcptOpen, setIsPcptOpen] = useState(false);
  const [isAuthStartOpen, setIsAuthStartOpen] = useState(false);
  const [isAuthEndOpen, setIsAuthEndOpen] = useState(false);
  const [isSdrStartOpen, setIsSdrStartOpen] = useState(false);
  const [isSdrEndOpen, setIsSdrEndOpen] = useState(false);

  function patchSdrDetails(partial: Partial<ServiceSdrDetails>): void {
    const prev = service.sdrDetails;
    update({
      sdrDetails: {
        ...(prev ?? {}),
        ...partial,
        importedAt: prev?.importedAt ?? new Date().toISOString(),
      },
    });
  }

  const weeklyDist = service.sdrWeeklyDistribution;
  const weeklyDistributionFingerprint = useMemo(
    () => weeklyDistributionFingerprintFromWd(weeklyDist),
    [weeklyDist],
  );
  const derivedAuthorizedHours = useMemo(
    () => deriveAuthorizedHoursPerWeek(weeklyDist),
    [weeklyDistributionFingerprint],
  );
  const hoursDerivedFromWeekly = derivedAuthorizedHours !== undefined;
  const showWeeklyDistribution =
    !!(weeklyDist?.standardLine ?? "").trim() || (weeklyDist?.rows?.length ?? 0) > 0;
  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-normal text-[#10141a]">Service code</label>
          <Input
            value={service.code ?? ""}
            onChange={(e) => update({ code: e.target.value })}
            className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
            placeholder="Procedure or authorization code (e.g. from ISP)"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-normal text-[#10141a]">Service Name</label>
          <Input
            value={service.name ?? ""}
            onChange={(e) => update({ name: e.target.value })}
            className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
            placeholder="Full service name as shown on the ISP"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-normal text-[#10141a]">Authorized hours per week</label>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            readOnly={hoursDerivedFromWeekly}
            title={
              hoursDerivedFromWeekly
                ? "Derived from weekly distribution; change weekly rows or standard line."
                : undefined
            }
            value={hoursDerivedFromWeekly ? derivedAuthorizedHours ?? "" : service.hours}
            onChange={(e) => update({ hours: e.target.value })}
            className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
            placeholder="Weekly hours"
          />
          {hoursDerivedFromWeekly ? (
            <p className="text-[11px] text-[#808081]">From weekly distribution</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-normal text-[#10141a]">Total hours</label>
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            value={service.totalHours ?? ""}
            onChange={(e) =>
              update({ totalHours: e.target.value || undefined })
            }
            className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
            placeholder="Computed from SDR"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-normal text-[#10141a]">Frequency</label>
          <Input
            value={service.sdrDetails?.frequency ?? service.frequency ?? ""}
            onChange={(e) => {
              const frequency = e.target.value.trim() || undefined;
              patchSdrDetails({ frequency });
              if (service.frequency) {
                update({ frequency: undefined });
              }
            }}
            className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-normal text-[#10141a]">Setting</label>
          <Input
            value={service.sdrDetails?.setting ?? ""}
            onChange={(e) =>
              patchSdrDetails({
                setting: e.target.value.trim() || undefined,
              })
            }
            className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-normal text-[#10141a]">Procedure</label>
          <Input
            value={service.procedureName ?? ""}
            onChange={(e) => update({ procedureName: e.target.value || undefined })}
            className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-normal text-[#10141a]">Unit type</label>
          <Input
            value={service.unitType ?? ""}
            onChange={(e) => update({ unitType: e.target.value || undefined })}
            className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
            placeholder="e.g. 15 Min"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-normal text-[#10141a]">Total units</label>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={service.totalUnits ?? ""}
            onChange={(e) => update({ totalUnits: e.target.value || undefined })}
            className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
            placeholder="Units for the period"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-normal text-[#10141a]">Total cost ($)</label>
          <Input
            type="number"
            inputMode="decimal"
            step={0.01}
            min={0}
            value={
              service.totalCost != null ? stripCurrencyAndCommas(service.totalCost) : ""
            }
            onChange={(e) =>
              update({ totalCost: normalizeCostStored(e.target.value) })
            }
            className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
          />
        </div>

        <RatePayTypeField
          label="Client Rate / Pay Type"
          rate={stripExtractedMoney(service.clientRate ?? "")}
          payType={service.clientPayType}
          includeMile
          onRateChange={(v) => update({ clientRate: v })}
          onPayTypeChange={(v) => update({ clientPayType: v })}
        />

        <RatePayTypeField
          label="Staff Rate / Pay Type"
          rate={service.staffRate ?? ""}
          payType={service.payType}
          includeMile
          onRateChange={(v) => update({ staffRate: v })}
          onPayTypeChange={(v) => update({ payType: v })}
        />

        <ServiceCalendarDateField
          label="ISP Effective Date"
          value={service.ispEffectiveDate}
          open={isIspOpen}
          onOpenChange={setIsIspOpen}
          onSelectDate={(d) => update({ ispEffectiveDate: d })}
        />

        <ServiceCalendarDateField
          label="PCPT Date"
          value={service.pcptDate}
          open={isPcptOpen}
          onOpenChange={setIsPcptOpen}
          onSelectDate={(d) => update({ pcptDate: d })}
        />

        <ServiceCalendarDateField
          label="SDR Start Date"
          value={service.sdrStartDate}
          open={isSdrStartOpen}
          onOpenChange={setIsSdrStartOpen}
          onSelectDate={(d) => update({ sdrStartDate: d })}
        />

        <ServiceCalendarDateField
          label="SDR End Date"
          value={service.sdrEndDate}
          open={isSdrEndOpen}
          onOpenChange={setIsSdrEndOpen}
          onSelectDate={(d) => update({ sdrEndDate: d })}
        />

        <div className="col-span-full rounded-[12px] border border-[#e1e3e8] bg-[#fafbfc]/50 p-4">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#808081]">
            Prior authorization
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <ServiceCalendarDateField
              label="Start Date of Authorization"
              value={service.startAuthDate}
              open={isAuthStartOpen}
              onOpenChange={setIsAuthStartOpen}
              onSelectDate={(d) => update({ startAuthDate: d })}
            />
            <ServiceCalendarDateField
              label="End Date of Authorization"
              value={service.endAuthDate}
              open={isAuthEndOpen}
              onOpenChange={setIsAuthEndOpen}
              onSelectDate={(d) => update({ endAuthDate: d })}
            />
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">PA number</label>
              <Input
                value={service.sdrPriorAuthorization?.paNumber ?? ""}
                onChange={(e) =>
                  update({
                    sdrPriorAuthorization: {
                      ...service.sdrPriorAuthorization,
                      paNumber: e.target.value || undefined,
                    },
                  })
                }
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">
                Approved units till date
              </label>
              <Input
                value={service.sdrPriorAuthorization?.approvedUnitsTillDate ?? ""}
                onChange={(e) =>
                  update({
                    sdrPriorAuthorization: {
                      ...service.sdrPriorAuthorization,
                      approvedUnitsTillDate: e.target.value.trim()
                        ? e.target.value.trim()
                        : undefined,
                    },
                  })
                }
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="e.g. units from PA (may not be a date)"
              />
            </div>
          </div>
        </div>

        {showWeeklyDistribution && weeklyDist ? (
          <WeeklyDistributionInline
            wd={weeklyDist}
            className="col-span-full mt-2"
            isEditing
            onChange={(nextWd) => update(normalizeWeeklyDistributionUpdate(service.sdrWeeklyDistribution, nextWd))}
          />
        ) : null}

        <div className="col-span-full flex flex-col gap-1">
          <label className="text-[12px] font-normal text-[#10141a]">Delivery methods</label>
          <Textarea
            value={(service.sdrDetails?.deliveryMethods ?? []).join("\n")}
            onChange={(e) => {
              const list = splitSdrLinesToList(e.target.value, SDR_DETAILS_LIST_MAX);
              patchSdrDetails({
                deliveryMethods: list.length ? list : undefined,
              });
            }}
            rows={3}
            className="min-h-[72px] rounded-[12px] border-[#cccccd] bg-white text-[13px]"
            placeholder="One method per line"
          />
        </div>

        <div className="col-span-full flex flex-col gap-1">
          <label className="text-[12px] font-normal text-[#10141a]">Support tasks</label>
          <Textarea
            value={(service.sdrDetails?.supportTasks ?? []).join("\n")}
            onChange={(e) => {
              const list = splitSdrLinesToList(e.target.value, SDR_DETAILS_LIST_MAX);
              patchSdrDetails({
                supportTasks: list.length ? list : undefined,
              });
            }}
            rows={3}
            className="min-h-[72px] rounded-[12px] border-[#cccccd] bg-white text-[13px]"
            placeholder="One task per line"
          />
        </div>
      </div>
      <ServiceAssignedDspsSection
        isEditing
        assignedDsps={service.assignedDsps ?? []}
        onChange={(assignedDsps) => update({ assignedDsps })}
      />
    </>
  );
});

export function Stage2GuardianAndFunding({
  footer,
  formData,
  setFormData,
  pageTitle = "Add client",
}: {
  footer: React.ReactNode;
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
  pageTitle?: string;
}) {
  const stage2 = formData.stage2;
  const isHhaClient = formData.type === "hha";
  const { data: hhaServicesData } = useListServicesQuery(
    isHhaClient ? { program: "hha", limit: 200 } : skipToken,
  );
  const hhaServices = hhaServicesData?.services ?? [];
  const hhaServiceById = useMemo(
    () => new Map(hhaServices.map((s) => [s.id, s])),
    [hhaServices],
  );
  const [sdrImportOpen, setSdrImportOpen] = useState(false);
  const updateStage2 = useCallback(
    (patch: Partial<AddClientFormData["stage2"]>) =>
      setFormData((prev) => ({ ...prev, stage2: { ...prev.stage2, ...patch } })),
    [setFormData],
  );

  const handleBillingDirectionChange = useCallback(
    (value: string) =>
      updateStage2({ billingDirection: value === "out-of-pocket" ? "out-of-pocket" : "claims" }),
    [updateStage2],
  );

  const guardianPickerOptions = useMemo(
    () =>
      (stage2.guardians ?? []).map((g, i) => ({
        value: g.id,
        label: g.name?.trim() || `Guardian ${i + 1}`,
      })),
    [stage2.guardians],
  );

  const legalGuardianPickerValue = useMemo(() => {
    return stage2.guardians?.find((g) => g.isLegalGuardian === "yes")?.id ?? "";
  }, [stage2.guardians]);

  const poaPickerValue = useMemo(() => {
    return stage2.guardians?.find((g) => g.hasPowerOfAttorney === "yes")?.id ?? "";
  }, [stage2.guardians]);

  const hasGuardians = guardianPickerOptions.length > 0;

  const handleLegalGuardianPickerChange = useCallback(
    (value: string) => {
      const next = applyGuardianFlagSelection(
        stage2.guardians ?? [],
        value === "__none__" ? "" : value,
        "isLegalGuardian",
      );
      updateStage2({ guardians: next });
    },
    [stage2.guardians, updateStage2],
  );

  const handlePoaPickerChange = useCallback(
    (value: string) => {
      const next = applyGuardianFlagSelection(
        stage2.guardians ?? [],
        value === "__none__" ? "" : value,
        "hasPowerOfAttorney",
      );
      updateStage2({ guardians: next });
    },
    [stage2.guardians, updateStage2],
  );

  const handleOutcomeServiceChange = useCallback(
    (outcomeId: string, serviceId: string, next: Service) => {
      setFormData((prev) => ({
        ...prev,
        stage2: {
          ...prev.stage2,
          outcomes: prev.stage2.outcomes.map((o) =>
            o.id === outcomeId
              ? {
                  ...o,
                  services: o.services.map((s) => (s.id === serviceId ? next : s)),
                }
              : o,
          ),
        },
      }));
    },
    [setFormData],
  );

  const handleHhaAuthorizationChange = useCallback(
    (index: number, patch: Partial<HhaAuthorization>) => {
      setFormData((prev) => {
        const rows = [...(prev.stage2.hhaAuthorizations ?? [])];
        if (!rows[index]) return prev;
        rows[index] = { ...rows[index], ...patch };
        return { ...prev, stage2: { ...prev.stage2, hhaAuthorizations: rows } };
      });
    },
    [setFormData],
  );

  const handleHhaAuthorizationSelectService = useCallback(
    (index: number, serviceId: string | undefined) => {
      setFormData((prev) => {
        const rows = [...(prev.stage2.hhaAuthorizations ?? [])];
        if (!rows[index]) return prev;
        const svc = serviceId ? hhaServiceById.get(serviceId) : undefined;
        rows[index] = applyHhaCatalogService(rows[index], svc);
        return { ...prev, stage2: { ...prev.stage2, hhaAuthorizations: rows } };
      });
    },
    [setFormData, hhaServiceById],
  );

  const outcomes = stage2.outcomes;

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-10">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
          {pageTitle}
        </h1>
      </div>

      <div className="mb-10">
        <div className="mb-4">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            Billing direction
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            Claims bill the provider; out of pocket bills the payer as an invoice. Applies to all of
            this client&apos;s services. Authorization comes from the service authorizations below.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Billing type</label>
            <Select
              value={stage2.billingDirection ?? "claims"}
              onValueChange={handleBillingDirectionChange}
            >
              <SelectTrigger className="h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claims">Claims (provider-paid)</SelectItem>
                <SelectItem value="out-of-pocket">Out of pocket (family-paid)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {stage2.billingDirection === "out-of-pocket" && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-normal text-[#10141a]">Payor name *</label>
                <Input
                  value={stage2.outOfPocketPayerName ?? ""}
                  onChange={(e) => updateStage2({ outOfPocketPayerName: e.target.value })}
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  placeholder="Who pays for these services"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-normal text-[#10141a]">Payer email *</label>
                <Input
                  type="email"
                  value={stage2.outOfPocketPayerEmail ?? ""}
                  onChange={(e) => updateStage2({ outOfPocketPayerEmail: e.target.value })}
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  placeholder="Where invoices are sent"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {isHhaClient ? (
      <div className="mb-10 space-y-10">
        <div>
          <div className="mb-4">
            <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
              4. Insurance information
            </p>
            <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
              Add each payer that may authorize HHA services for this client.
            </p>
          </div>
          <div className="space-y-4">
            {(stage2.insuranceInfo ?? []).map((row, idx) => (
              <div key={row.id || idx} className="rounded-[12px] border border-[#cccccd]/80 bg-white/50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-[14px] font-semibold text-[#10141a]">Insurance {idx + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    className={SECTION_REMOVE_BTN_CLASS}
                    onClick={() =>
                      updateStage2({
                        insuranceInfo: (stage2.insuranceInfo ?? []).filter((_, i) => i !== idx),
                      })
                    }
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Remove insurance
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-normal text-[#10141a]">Coverage type</label>
                    <Select
                      value={row.type || "primary"}
                      onValueChange={(v) => {
                        const next = [...(stage2.insuranceInfo ?? [])];
                        next[idx] = { ...next[idx], type: v as "primary" | "secondary" };
                        updateStage2({ insuranceInfo: next });
                      }}
                    >
                      <SelectTrigger className="h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary</SelectItem>
                        <SelectItem value="secondary">Secondary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(
                    [
                      ["company", "Insurance company", "Company name"],
                      ["memberId", "Member ID", "Member ID"],
                      ["groupNumber", "Group number", "Group number"],
                    ] as const
                  ).map(([key, label, placeholder]) => (
                    <div key={key} className="flex flex-col gap-1">
                      <label className="text-[12px] font-normal text-[#10141a]">{label}</label>
                      <Input
                        value={(row[key] as string) ?? ""}
                        onChange={(e) => {
                          const next = [...(stage2.insuranceInfo ?? [])];
                          next[idx] = { ...next[idx], [key]: e.target.value };
                          updateStage2({ insuranceInfo: next });
                        }}
                        className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                        placeholder={placeholder}
                      />
                    </div>
                  ))}
                  <CalendarDateField
                    label="Effective date"
                    value={row.effectiveDate}
                    onSelectDate={(d) => {
                      const next = [...(stage2.insuranceInfo ?? [])];
                      next[idx] = { ...next[idx], effectiveDate: d };
                      updateStage2({ insuranceInfo: next });
                    }}
                  />
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-normal text-[#10141a]">Authorization required?</label>
                    <Select
                      value={row.authorizationRequired || undefined}
                      onValueChange={(v) => {
                        const next = [...(stage2.insuranceInfo ?? [])];
                        next[idx] = { ...next[idx], authorizationRequired: v as "yes" | "no" };
                        updateStage2({ insuranceInfo: next });
                      }}
                    >
                      <SelectTrigger className="h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                        <SelectValue placeholder="Select answer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed border-[#808081] text-[#10141a] sm:w-auto"
              onClick={() =>
                updateStage2({
                  insuranceInfo: [
                    ...(stage2.insuranceInfo ?? []),
                    createEmptyHhaInsuranceInfo((stage2.insuranceInfo ?? []).length ? "secondary" : "primary"),
                  ],
                })
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Add insurance
            </Button>
          </div>
        </div>

        <div>
          <div className="mb-4">
            <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
              5. Service request
            </p>
            <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
              Capture the requested HHA services before final authorization is entered.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col gap-1 xl:col-span-2">
              <label className="text-[12px] font-normal text-[#10141a]">Requested services</label>
              <Input
                value={(stage2.hhaServiceRequest?.requestedServices ?? []).join(", ")}
                onChange={(e) =>
                  updateStage2({
                    hhaServiceRequest: {
                      ...(stage2.hhaServiceRequest ?? {}),
                      requestedServices: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                    },
                  })
                }
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="Personal care, private duty nursing, adult day care"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Days needed</label>
              <Input
                value={(stage2.hhaServiceRequest?.daysNeeded ?? []).join(", ")}
                onChange={(e) =>
                  updateStage2({
                    hhaServiceRequest: {
                      ...(stage2.hhaServiceRequest ?? {}),
                      daysNeeded: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
                    },
                  })
                }
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="Mon, Tue, Wed"
              />
            </div>
            <CalendarDateField
              label="Start date"
              value={stage2.hhaServiceRequest?.startDate}
              onSelectDate={(d) =>
                updateStage2({
                  hhaServiceRequest: {
                    ...(stage2.hhaServiceRequest ?? {}),
                    startDate: d,
                  },
                })
              }
            />
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Preferred time</label>
              <Input
                value={stage2.hhaServiceRequest?.preferredTime ?? ""}
                onChange={(e) =>
                  updateStage2({
                    hhaServiceRequest: {
                      ...(stage2.hhaServiceRequest ?? {}),
                      preferredTime: e.target.value,
                    },
                  })
                }
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="Morning, afternoon, or exact time"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Hours requested</label>
              <Input
                value={stage2.hhaServiceRequest?.hoursRequested ?? ""}
                onChange={(e) =>
                  updateStage2({
                    hhaServiceRequest: {
                      ...(stage2.hhaServiceRequest ?? {}),
                      hoursRequested: e.target.value,
                    },
                  })
                }
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="Hours per week or per day"
              />
            </div>
          </div>
        </div>

        <div>
          <div className="mb-4">
            <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
              6. Service authorizations
            </p>
            <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
              Choose an HHA service from the catalog for each row, enter payer authorization details,
              and assign caregivers who will deliver that service.
            </p>
          </div>
          <div className="mt-6 space-y-10">
            {(stage2.hhaAuthorizations ?? []).length === 0 ? (
              <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                No service authorizations yet. Add one below.
              </p>
            ) : null}
            {(stage2.hhaAuthorizations ?? []).map((row, idx) => (
              <div
                key={row.id || idx}
                className={`group ${idx === 0 ? "" : "border-t border-[#cccccd]/60 pt-6"}`}
              >
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
                    Service authorization {idx + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    className={SECTION_REMOVE_BTN_CLASS}
                    onClick={() =>
                      updateStage2({
                        hhaAuthorizations: (stage2.hhaAuthorizations ?? []).filter((_, i) => i !== idx),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove service
                  </Button>
                </div>
                <HhaAuthorizationFields
                  row={row}
                  hhaServices={hhaServices}
                  onChange={(patch) => handleHhaAuthorizationChange(idx, patch)}
                  onSelectServiceId={(serviceId) =>
                    handleHhaAuthorizationSelectService(idx, serviceId)
                  }
                />
              </div>
            ))}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed border-[#808081] text-[#10141a] sm:w-auto"
                onClick={() =>
                  updateStage2({
                    hhaAuthorizations: [
                      ...(stage2.hhaAuthorizations ?? []),
                      createEmptyHhaAuthorization(),
                    ],
                  })
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Add service authorization
              </Button>
            </div>
          </div>
        </div>
      </div>
      ) : null}

      <div className="mb-10">
        <div className="mb-4">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            3. Guardians, representatives &amp; support coordinator
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            Add a row for each legal guardian or representative on the ISP. Use the support coordinator fields when that person is listed for the same row (often one per client).
          </p>
        </div>
        <div className="space-y-10">
          {(stage2.guardians ?? []).length === 0 ? (
            <p className="text-[14px] font-medium text-[#808081]">No guardians added yet.</p>
          ) : null}
          {(stage2.guardians ?? []).map((g, gi) => (
            <div key={g.id} className="group">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
                  Guardian {gi + 1}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  className={SECTION_REMOVE_BTN_CLASS}
                  onClick={() =>
                    updateStage2({
                      guardians: (stage2.guardians ?? []).filter((_, i) => i !== gi),
                    })
                  }
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remove guardian
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">
                    Guardian / Representative Name
                  </label>
                  <Input
                    value={g.name ?? ""}
                    onChange={(e) => {
                      const next = [...(stage2.guardians ?? [])];
                      next[gi] = { ...next[gi], name: e.target.value };
                      updateStage2({ guardians: next });
                    }}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                    placeholder="Enter name"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">
                    Relationship to client
                  </label>
                  <Select
                    value={g.relationship ?? "__unset__"}
                    onValueChange={(v) => {
                      const next = [...(stage2.guardians ?? [])];
                      next[gi] = {
                        ...next[gi],
                        relationship: v === "__unset__" ? undefined : (v as GuardianRelationship),
                      };
                      updateStage2({ guardians: next });
                    }}
                  >
                    <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="__unset__">Not specified</SelectItem>
                      {GUARDIAN_RELATIONSHIP_VALUES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {GUARDIAN_RELATIONSHIP_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">Email</label>
                  <Input
                    value={g.email ?? ""}
                    onChange={(e) => {
                      const next = [...(stage2.guardians ?? [])];
                      next[gi] = { ...next[gi], email: e.target.value };
                      updateStage2({ guardians: next });
                    }}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                    placeholder="Enter email"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">Phone number</label>
                  <Input
                    value={g.primaryPhone ?? ""}
                    onChange={(e) => {
                      const next = [...(stage2.guardians ?? [])];
                      next[gi] = { ...next[gi], primaryPhone: e.target.value };
                      updateStage2({ guardians: next });
                    }}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">
                    Address (If different from client)
                  </label>
                  <Input
                    value={g.address ?? ""}
                    onChange={(e) => {
                      const next = [...(stage2.guardians ?? [])];
                      next[gi] = { ...next[gi], address: e.target.value };
                      updateStage2({ guardians: next });
                    }}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                    placeholder="Enter address"
                  />
                </div>

                {!isHhaClient ? (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-normal text-[#10141a]">
                        Support Coordinator Name
                      </label>
                      <Input
                        value={g.supportCoordinatorName ?? ""}
                        onChange={(e) => {
                          const next = [...(stage2.guardians ?? [])];
                          next[gi] = { ...next[gi], supportCoordinatorName: e.target.value };
                          updateStage2({ guardians: next });
                        }}
                        className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                        placeholder="Enter Support Coordinator Name"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-normal text-[#10141a]">
                        Support Coordinator Agency
                      </label>
                      <Input
                        value={g.supportCoordinatorAgency ?? ""}
                        onChange={(e) => {
                          const next = [...(stage2.guardians ?? [])];
                          next[gi] = { ...next[gi], supportCoordinatorAgency: e.target.value };
                          updateStage2({ guardians: next });
                        }}
                        className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                        placeholder="Enter Support Coordinator Agency"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-normal text-[#10141a]">
                        Support Coordinator Phone/Email
                      </label>
                      <Input
                        value={g.supportCoordinatorContact ?? ""}
                        onChange={(e) => {
                          const next = [...(stage2.guardians ?? [])];
                          next[gi] = { ...next[gi], supportCoordinatorContact: e.target.value };
                          updateStage2({ guardians: next });
                        }}
                        className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                        placeholder="Enter phone number/email"
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed border-[#808081] text-[#10141a] sm:w-auto"
            onClick={() =>
              updateStage2({
                guardians: [...(stage2.guardians ?? []), createEmptyGuardianContact()],
              })
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            Add guardian
          </Button>
        </div>

        {isHhaClient ? (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Legal guardian</label>
              <Select
                value={legalGuardianPickerValue || "__none__"}
                onValueChange={handleLegalGuardianPickerChange}
                disabled={!hasGuardians}
              >
                <SelectTrigger className="h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                  <SelectValue
                    placeholder={hasGuardians ? "Select guardian" : "Add a guardian first"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {guardianPickerOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Power of attorney</label>
              <Select
                value={poaPickerValue || "__none__"}
                onValueChange={handlePoaPickerChange}
                disabled={!hasGuardians}
              >
                <SelectTrigger className="h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                  <SelectValue
                    placeholder={hasGuardians ? "Select guardian" : "Add a guardian first"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {guardianPickerOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}

        <div className="mt-10">
          <div className="mb-4">
            <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">Care team</p>
            <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
              Physicians, hospital contacts, and other clinical roles from the ISP.
            </p>
          </div>
          {(stage2.careTeam ?? []).length === 0 ? (
            <p className="text-[13px] text-[#808081] mb-2">None added yet.</p>
          ) : null}
          {(stage2.careTeam ?? []).map((c, ci) => (
            <div
              key={ci}
              className="group mb-4 rounded-[12px] border border-[#cccccd]/80 bg-white/50 p-4"
            >
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
                  Care team contact {ci + 1}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  className={SECTION_REMOVE_BTN_CLASS}
                  onClick={() =>
                    updateStage2({
                      careTeam: (stage2.careTeam ?? []).filter((_, i) => i !== ci),
                    })
                  }
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remove contact
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                <Input
                  placeholder="Role (e.g. Primary care physician)"
                  value={c.role ?? ""}
                  onChange={(e) => {
                    const next = [...(stage2.careTeam ?? [])];
                    next[ci] = { ...next[ci], role: e.target.value };
                    updateStage2({ careTeam: next });
                  }}
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                />
                <Input
                  placeholder="Name"
                  value={c.name ?? ""}
                  onChange={(e) => {
                    const next = [...(stage2.careTeam ?? [])];
                    next[ci] = { ...next[ci], name: e.target.value };
                    updateStage2({ careTeam: next });
                  }}
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                />
                <Input
                  placeholder="Agency"
                  value={c.agency ?? ""}
                  onChange={(e) => {
                    const next = [...(stage2.careTeam ?? [])];
                    next[ci] = { ...next[ci], agency: e.target.value };
                    updateStage2({ careTeam: next });
                  }}
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                />
                <Input
                  placeholder="Phone"
                  value={c.phone ?? ""}
                  onChange={(e) => {
                    const next = [...(stage2.careTeam ?? [])];
                    next[ci] = { ...next[ci], phone: e.target.value };
                    updateStage2({ careTeam: next });
                  }}
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                />
                <Input
                  placeholder="Email"
                  value={c.email ?? ""}
                  onChange={(e) => {
                    const next = [...(stage2.careTeam ?? [])];
                    next[ci] = { ...next[ci], email: e.target.value };
                    updateStage2({ careTeam: next });
                  }}
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                />
                <Input
                  placeholder="Address"
                  value={c.address ?? ""}
                  onChange={(e) => {
                    const next = [...(stage2.careTeam ?? [])];
                    next[ci] = { ...next[ci], address: e.target.value };
                    updateStage2({ careTeam: next });
                  }}
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white lg:col-span-2"
                />
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed border-[#808081] text-[#10141a] sm:w-auto mt-2"
            onClick={() =>
              updateStage2({
                careTeam: [
                  ...(stage2.careTeam ?? []),
                  { role: "", name: "", agency: "", phone: "", email: "", address: "" },
                ],
              })
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            Add care team contact
          </Button>
        </div>
      </div>

      {!isHhaClient ? (
      <div className="mb-10">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
              4. Outcomes &amp; service authorizations
            </p>
            <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
              Each ISP outcome owns one or more service authorization rows (billing and scheduling). Add Dsps per service row.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            aria-label="Import service delivery report"
            className="h-11 min-h-[44px] shrink-0 rounded-[12px] border-[#00b4b8] px-3 text-[#00b4b8] hover:bg-[#e6fafa] sm:px-4"
            onClick={() => setSdrImportOpen(true)}
          >
            <FileUp className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden font-semibold sm:inline">Import SDR</span>
            <span className="font-semibold sm:hidden">Import</span>
          </Button>
        </div>

        <Stage2SdrImportPanel
          open={sdrImportOpen}
          onOpenChange={setSdrImportOpen}
          formData={formData}
          setFormData={setFormData}
        />

        <div className="mt-6 space-y-10">
          {outcomes.length === 0 ? (
            <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
              No outcomes yet. Use &quot;Add outcome&quot; below to add service authorization rows.
            </p>
          ) : null}
          {outcomes.map((outcome, oidx) => (
            <div key={outcome.id} className={`group ${oidx === 0 ? "" : "pt-6 border-t border-[#cccccd]/60"}`}>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 max-w-3xl space-y-2">
                  <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
                    Outcome {oidx + 1}
                  </p>
                  <label className="text-[12px] font-normal text-[#10141a]">Outcome statement</label>
                  <Textarea
                    value={outcome.statement}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateStage2({
                        outcomes: stage2.outcomes.map((o) =>
                          o.id === outcome.id ? { ...o, statement: v } : o,
                        ),
                      });
                    }}
                    rows={4}
                    className="min-h-[100px] resize-y rounded-[12px] border-[#cccccd] bg-white px-4 py-3 text-sm font-normal leading-[1.4] text-[#10141a] placeholder:text-[#b2b2b3] shadow-none transition-colors duration-200 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-[#d53411]"
                    placeholder="ISP outcome / goal statement"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className={SECTION_REMOVE_BTN_CLASS}
                  onClick={() =>
                    updateStage2({
                      outcomes: stage2.outcomes.filter((o) => o.id !== outcome.id),
                    })
                  }
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remove outcome
                </Button>
              </div>

              {outcome.services.length === 0 ? (
                <p className="mb-4 text-[14px] font-medium leading-[1.4] text-[#808081]">
                  No service authorizations for this outcome. Add one below or remove the outcome.
                </p>
              ) : null}
              {outcome.services.map((service, sidx) => (
                <div key={service.id} className={`group ${sidx === 0 ? "" : "pt-6 mt-6 border-t border-[#cccccd]/40"}`}>
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
                      Service authorization {sidx + 1}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      className={SECTION_REMOVE_BTN_CLASS}
                      onClick={() =>
                        updateStage2({
                          outcomes: stage2.outcomes.map((o) =>
                            o.id === outcome.id
                              ? {
                                  ...o,
                                  services: o.services.filter((s) => s.id !== service.id),
                                }
                              : o,
                          ),
                        })
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove service
                    </Button>
                  </div>
                  <ServiceAuthorizationFields
                    service={service}
                    serviceId={service.id}
                    outcomeId={outcome.id}
                    onChange={handleOutcomeServiceChange}
                  />
                </div>
              ))}
              <div className="mt-6 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed border-[#808081] text-[#10141a] sm:w-auto"
                  onClick={() =>
                    updateStage2({
                      outcomes: stage2.outcomes.map((o) =>
                        o.id === outcome.id
                          ? {
                              ...o,
                              services: [...o.services, createEmptyServiceAuthorization()],
                            }
                          : o,
                      ),
                    })
                  }
                >
                  <Plus className="w-5 h-5 mr-1 text-[#10141a]" />
                  Add service to this outcome
                </Button>
              </div>
            </div>
          ))}
          <div className="mt-6 flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed border-[#808081] text-[#10141a] sm:w-auto"
              onClick={() =>
                updateStage2({ outcomes: [...stage2.outcomes, createEmptyOutcome()] })
              }
            >
              <Plus className="w-5 h-5 mr-1 text-[#10141a]" />
              Add outcome
            </Button>
          </div>
        </div>
      </div>
      ) : null}

      {footer}
    </div>
  );
}
