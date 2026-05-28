import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Plus, Trash2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import {
  Client,
  ClientDsp,
  ClientOutcome,
  ClientService,
  ClientServiceSdrDetails,
  updateClient,
} from "@/lib/api/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  WeeklyDistributionInline,
  WEEKLY_DIST_DISPLAY_CAP,
  type WeeklyDistributionData,
} from "@/pages/shared/client-management/components/WeeklyDistributionInline";
import { ServiceAssignedDspsSection } from "@/pages/shared/client-management/components/ServiceAssignedDspsSection";
import { deriveWeeklyDistributionScalars } from "@/pages/shared/client-management/utils/deriveAuthorizedHoursPerWeek";
import {
  cloneWeeklyDistributionForPersist,
  normalizeWeeklyDistributionUpdate,
  weeklyDistributionFingerprintFromWd,
} from "@/pages/shared/client-management/utils/sdrWeeklyDistribution";

interface ServicesTabProps {
  client: Client;
  clientId: string;
  onServicesUpdated?: () => void;
}

// Editable model mirroring Stage 2 service fields
type EditableServiceRow = {
  id: string;
  name: string;
  code: string;
  hours?: string;
  totalApprovedHours?: string;
  totalUnits?: string;
  staffRate?: string;
  payType?: ClientService["payType"];
  clientRate?: string;
  clientPayType?: ClientService["payType"];
  ispEffectiveDate?: Date | null;
  startAuthDate?: Date | null;
  endAuthDate?: Date | null;
  pcptDate?: Date | null;
  sdrStartDate?: Date | null;
  sdrEndDate?: Date | null;
  provider?: string;
  location?: string;
  claimsSource?: string;
  unitType?: string;
  frequency?: string;
  totalCost?: string;
  procedureName?: string;
  sdrComputedTotalHours?: string;
  /** Canonical PA metadata only; auth dates live on startAuthDate/endAuthDate */
  sdrPriorAuthorization?: {
    paNumber?: string;
    approvedUnitsTillDate?: string;
  };
  sdrWeeklyDistribution?: ClientService["sdrWeeklyDistribution"];
  sdrDetails?: ClientServiceSdrDetails;
  assignedDsps?: ClientDsp[];
};

type EditableOutcomeGroup = {
  id: string;
  statement: string;
  services: EditableServiceRow[];
};

const MAX_SDR_LIST_LINES = 50;

function priorAuthMetadataFromApi(
  pa:
    | ClientService["sdrPriorAuthorization"]
    | EditableServiceRow["sdrPriorAuthorization"]
    | undefined,
): EditableServiceRow["sdrPriorAuthorization"] {
  if (!pa || typeof pa !== "object") return undefined;
  const n = typeof pa.paNumber === "string" ? pa.paNumber.trim() : "";
  const u = typeof pa.approvedUnitsTillDate === "string" ? pa.approvedUnitsTillDate.trim() : "";
  if (!n && !u) return undefined;
  return {
    ...(n ? { paNumber: n } : {}),
    ...(u ? { approvedUnitsTillDate: u } : {}),
  };
}

function priorAuthMetadataToApi(
  pa: EditableServiceRow["sdrPriorAuthorization"],
): ClientService["sdrPriorAuthorization"] | undefined {
  return priorAuthMetadataFromApi(pa);
}

function cloneSdrDetails(d?: ClientServiceSdrDetails): ClientServiceSdrDetails | undefined {
  if (!d || typeof d !== "object") return undefined;
  const source = d.source
    ? {
        ...(d.source.outcomeStatement?.trim()
          ? { outcomeStatement: d.source.outcomeStatement.trim() }
          : {}),
        ...(d.source.serviceName?.trim() ? { serviceName: d.source.serviceName.trim() } : {}),
        ...(d.source.serviceCode?.trim() ? { serviceCode: d.source.serviceCode.trim() } : {}),
        ...(d.source.provider?.trim() ? { provider: d.source.provider.trim() } : {}),
        ...(d.source.claimsSource?.trim()
          ? { claimsSource: d.source.claimsSource.trim() }
          : {}),
      }
    : undefined;
  const out: ClientServiceSdrDetails = {
    ...(d.deliveryMethods?.length ? { deliveryMethods: [...d.deliveryMethods] } : {}),
    ...(d.supportTasks?.length ? { supportTasks: [...d.supportTasks] } : {}),
    ...(d.frequency?.trim() ? { frequency: d.frequency.trim() } : {}),
    ...(d.duration?.trim() ? { duration: d.duration.trim() } : {}),
    ...(d.setting?.trim() ? { setting: d.setting.trim() } : {}),
    ...(d.staffing?.trim() ? { staffing: d.staffing.trim() } : {}),
    ...(source && Object.keys(source).length ? { source } : {}),
    ...(d.importedAt?.trim() ? { importedAt: d.importedAt.trim() } : {}),
  };
  return Object.keys(out).length ? out : undefined;
}

function cloneWeeklyDist(
  raw: ClientService["sdrWeeklyDistribution"] | undefined,
): ClientService["sdrWeeklyDistribution"] | undefined {
  return cloneWeeklyDistributionForPersist(raw) as ClientService["sdrWeeklyDistribution"] | undefined;
}

function splitLinesToList(text: string, max: number): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, max);
}

function emptish(v: string | undefined): string | undefined {
  const t = (v ?? "").trim();
  return t ? t : undefined;
}

function hasWeeklyDistributionContent(
  wd: ClientService["sdrWeeklyDistribution"] | undefined,
): boolean {
  if (!wd || typeof wd !== "object") return false;
  if ((wd.standardLine ?? "").trim()) return true;
  return (wd.rows?.length ?? 0) > 0;
}

function applyWeeklyDistToServiceRow(
  service: EditableServiceRow,
  patchWd: Partial<NonNullable<ClientService["sdrWeeklyDistribution"]>>,
): EditableServiceRow {
  const patch = normalizeWeeklyDistributionUpdate(service.sdrWeeklyDistribution, patchWd);
  return { ...service, ...patch };
}

function newEntityId(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Math.random().toString(16).slice(2)}`;
}

function emptyEditableServiceRow(): EditableServiceRow {
  return {
    id: newEntityId("svc"),
    name: "",
    code: "",
    hours: "",
    totalApprovedHours: "",
    totalUnits: "",
    staffRate: "",
    payType: undefined,
    clientRate: "",
    clientPayType: undefined,
    ispEffectiveDate: null,
    startAuthDate: null,
    endAuthDate: null,
    pcptDate: null,
    sdrStartDate: null,
    sdrEndDate: null,
    provider: "",
    location: "",
    claimsSource: "",
    unitType: "",
    frequency: "",
    totalCost: "",
    procedureName: "",
    sdrComputedTotalHours: "",
    sdrPriorAuthorization: undefined,
    sdrWeeklyDistribution: undefined,
    sdrDetails: undefined,
  };
}

function emptyOutcomeGroup(): EditableOutcomeGroup {
  return {
    id: newEntityId("outcome"),
    statement: "",
    services: [emptyEditableServiceRow()],
  };
}

function parseDate(
  value?: string | { _seconds?: number; _nanoseconds?: number } | Date,
): Date | null {
  if (!value) return null;
  try {
    if (value instanceof Date) return value;
    if (typeof value === "string") {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof value === "object" && "_seconds" in value && value._seconds) {
      return new Date(value._seconds * 1000);
    }
    return null;
  } catch {
    return null;
  }
}

function mapClientServicesToEditable(services?: ClientService[]): EditableServiceRow[] {
  if (!services) return [];
  return services.map((svc) => ({
    id: svc.id,
    name: svc.name,
    code: svc.code,
    hours: svc.hours,
    totalApprovedHours: svc.totalApprovedHours,
    totalUnits: svc.totalUnits,
    staffRate: svc.staffRate,
    payType: svc.payType,
    clientRate: svc.clientRate,
    clientPayType: svc.clientPayType,
    ispEffectiveDate: parseDate(svc.ispEffectiveDate),
    startAuthDate: parseDate(svc.startAuthDate),
    endAuthDate: parseDate(svc.endAuthDate),
    pcptDate: parseDate(svc.pcptDate),
    sdrStartDate: parseDate(svc.sdrStartDate),
    sdrEndDate: parseDate(svc.sdrEndDate),
    provider: svc.provider ?? "",
    location: svc.location ?? "",
    claimsSource: svc.claimsSource ?? "",
    unitType: svc.unitType ?? "",
    frequency: svc.frequency ?? "",
    totalCost: svc.totalCost ?? "",
    procedureName: svc.procedureName ?? "",
    sdrComputedTotalHours: svc.sdrComputedTotalHours ?? "",
    sdrPriorAuthorization: priorAuthMetadataFromApi(svc.sdrPriorAuthorization),
    sdrWeeklyDistribution: cloneWeeklyDist(svc.sdrWeeklyDistribution),
    sdrDetails: cloneSdrDetails(svc.sdrDetails),
    assignedDsps: svc.assignedDsps?.length ? [...svc.assignedDsps] : undefined,
  }));
}

function mapEditableToClientServices(services: EditableServiceRow[]): ClientService[] {
  return services.map<ClientService>((svc) => ({
    id: svc.id,
    name: svc.name,
    code: svc.code,
    hours: emptish(svc.hours),
    totalApprovedHours: emptish(svc.totalApprovedHours),
    totalUnits: emptish(svc.totalUnits),
    staffRate: emptish(svc.staffRate),
    payType: svc.payType,
    clientRate: emptish(svc.clientRate),
    clientPayType: svc.clientPayType,
    ispEffectiveDate: svc.ispEffectiveDate
      ? svc.ispEffectiveDate.toISOString()
      : undefined,
    startAuthDate: svc.startAuthDate
      ? svc.startAuthDate.toISOString()
      : undefined,
    endAuthDate: svc.endAuthDate ? svc.endAuthDate.toISOString() : undefined,
    pcptDate: svc.pcptDate ? svc.pcptDate.toISOString() : undefined,
    sdrStartDate: svc.sdrStartDate
      ? svc.sdrStartDate.toISOString()
      : undefined,
    sdrEndDate: svc.sdrEndDate ? svc.sdrEndDate.toISOString() : undefined,
    provider: emptish(svc.provider),
    location: emptish(svc.location),
    claimsSource: emptish(svc.claimsSource),
    unitType: emptish(svc.unitType),
    frequency: emptish(svc.frequency),
    totalCost: emptish(svc.totalCost),
    procedureName: emptish(svc.procedureName),
    sdrComputedTotalHours: emptish(svc.sdrComputedTotalHours),
    sdrPriorAuthorization: priorAuthMetadataToApi(svc.sdrPriorAuthorization),
    sdrWeeklyDistribution: cloneWeeklyDist(svc.sdrWeeklyDistribution),
    sdrDetails: cloneSdrDetails(svc.sdrDetails),
    ...(svc.assignedDsps?.length ? { assignedDsps: svc.assignedDsps } : {}),
  }));
}

function mapClientOutcomesToEditable(
  outcomes?: ClientOutcome[],
): EditableOutcomeGroup[] {
  if (!outcomes?.length) return [emptyOutcomeGroup()];
  return outcomes.map((o) => ({
    id: o.id?.trim() || newEntityId("outcome"),
    statement: o.statement ?? "",
    services:
      o.services && o.services.length > 0
        ? mapClientServicesToEditable(o.services)
        : [emptyEditableServiceRow()],
  }));
}

function mapEditableOutcomesToApi(outcomes: EditableOutcomeGroup[]): ClientOutcome[] {
  return outcomes.map((o) => ({
    id: o.id,
    statement: o.statement,
    services: mapEditableToClientServices(o.services),
  }));
}

type ServiceRowProps = {
  service: EditableServiceRow;
  isEditing: boolean;
  onChange: (next: EditableServiceRow) => void;
  onRemove?: () => void;
};

function ServiceRow({
  service,
  isEditing,
  onChange,
  onRemove,
}: ServiceRowProps) {
  const [isIspOpen, setIsIspOpen] = useState(false);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);
  const [isPcptOpen, setIsPcptOpen] = useState(false);
  const [isSdrStartOpen, setIsSdrStartOpen] = useState(false);
  const [isSdrEndOpen, setIsSdrEndOpen] = useState(false);

  const handleFieldChange = (field: keyof EditableServiceRow, value: unknown) => {
    onChange({ ...service, [field]: value });
  };

  /** Stable key so unrelated service edits do not re-run weekly derivation (immutable WD updates assumed). */
  const weeklyDistributionFingerprint = useMemo(
    () => weeklyDistributionFingerprintFromWd(service.sdrWeeklyDistribution),
    [service.sdrWeeklyDistribution],
  );

  const hasWd = hasWeeklyDistributionContent(service.sdrWeeklyDistribution);

  const derivedWdScalars = useMemo(
    () => deriveWeeklyDistributionScalars(service.sdrWeeklyDistribution),
    [weeklyDistributionFingerprint],
  );

  const hoursDerivedFromWeeklyDistribution =
    hasWd && derivedWdScalars.hoursPerWeek !== undefined;

  const totalApprovedHoursDerivedFromWeeklyDistribution =
    hasWd && derivedWdScalars.totalApprovedHours !== undefined;

  const weeklyDistInlineModel = useMemo((): WeeklyDistributionData | undefined => {
    return cloneWeeklyDist(service.sdrWeeklyDistribution);
  }, [weeklyDistributionFingerprint]);

  const displayAuthorizedHoursPerWeek = hasWd
    ? (derivedWdScalars.hoursPerWeek ?? "")
    : (service.hours?.trim() ?? "");

  const displayTotalApprovedHours = hasWd
    ? (derivedWdScalars.totalApprovedHours ?? "")
    : (service.totalApprovedHours?.trim() ?? "");

  const displayDate = (value?: Date | null) =>
    value ? format(value, "MMM d, yyyy") : "";

  const textOrDash = (v?: string) => (v?.trim() ? v.trim() : "—");

  const patchSdrDetails = (partial: Partial<ClientServiceSdrDetails>) => {
    onChange({
      ...service,
      sdrDetails: { ...(service.sdrDetails ?? {}), ...partial },
    });
  };

  return (
    <div className="backdrop-blur-[20px] rounded-[20px] border border-[rgba(255,255,255,0.4)] bg-white/70 px-4 py-3 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3">
            {/* Service code & name (manual / ISP-aligned) */}
            <div className="flex flex-col gap-1">
              <p className="text-[12px] font-normal text-[#10141a]">Service code</p>
              {isEditing ? (
                <Input
                  value={service.code || ""}
                  onChange={(e) => handleFieldChange("code", e.target.value)}
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  placeholder="Procedure or authorization code"
                />
              ) : (
                <p className="text-[14px] font-semibold text-[#10141a]">
                  {service.code?.trim() || "—"}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-[12px] font-normal text-[#10141a]">Service Name</p>
              {isEditing ? (
                <Input
                  value={service.name || ""}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  placeholder="Full service name as on the ISP"
                />
              ) : (
                <p className="text-[14px] font-semibold text-[#10141a]">
                  {service.name?.trim() || "—"}
                </p>
              )}
            </div>

            {/* Authorized hours per week */}
            <div className="flex flex-col gap-1">
              <p className="text-[12px] font-normal text-[#10141a]">
                Authorized hours per week
              </p>
              {isEditing ? (
                <>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    readOnly={hoursDerivedFromWeeklyDistribution}
                    title={
                      hoursDerivedFromWeeklyDistribution
                        ? "Derived from weekly distribution; change weekly rows or standard line."
                        : undefined
                    }
                    value={
                      hoursDerivedFromWeeklyDistribution
                        ? (derivedWdScalars.hoursPerWeek ?? "")
                        : (service.hours || "")
                    }
                    onChange={(e) => handleFieldChange("hours", e.target.value)}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                    placeholder="Enter hours"
                  />
                  {hoursDerivedFromWeeklyDistribution ? (
                    <p className="text-[11px] text-[#808081]">From weekly distribution</p>
                  ) : null}
                </>
              ) : (
                <p className="text-[14px] font-semibold text-[#10141a]">
                  {displayAuthorizedHoursPerWeek || "-"}
                </p>
              )}
            </div>

            {/* Total approved hours */}
            <div className="flex flex-col gap-1">
              <p className="text-[12px] font-normal text-[#10141a]">Total approved hours</p>
              {isEditing ? (
                <>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.01}
                    readOnly={totalApprovedHoursDerivedFromWeeklyDistribution}
                    title={
                      totalApprovedHoursDerivedFromWeeklyDistribution
                        ? "Sum of weekly distribution row hours."
                        : undefined
                    }
                    value={
                      totalApprovedHoursDerivedFromWeeklyDistribution
                        ? (derivedWdScalars.totalApprovedHours ?? "")
                        : (service.totalApprovedHours || "")
                    }
                    onChange={(e) => handleFieldChange("totalApprovedHours", e.target.value)}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                    placeholder="Total hours for authorization period"
                  />
                  {totalApprovedHoursDerivedFromWeeklyDistribution ? (
                    <p className="text-[11px] text-[#808081]">Sum of weekly distribution hours</p>
                  ) : null}
                </>
              ) : (
                <p className="text-[14px] font-semibold text-[#10141a]">
                  {displayTotalApprovedHours || "-"}
                </p>
              )}
            </div>

            {/* Total units (ISP authorization) */}
            <div className="flex flex-col gap-1">
              <p className="text-[12px] font-normal text-[#10141a]">
                Total units
              </p>
              {isEditing ? (
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={service.totalUnits || ""}
                  onChange={(e) =>
                    handleFieldChange("totalUnits", e.target.value)
                  }
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  placeholder="Units for the period"
                />
              ) : (
                <p className="text-[14px] font-semibold text-[#10141a]">
                  {service.totalUnits || "-"}
                </p>
              )}
            </div>
          </div>
        </div>

        {onRemove && (
          <Button
            type="button"
            variant="ghost"
            className="h-9 rounded-full px-2 text-[#d53411] hover:bg-red-50 shrink-0"
            onClick={onRemove}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Remove
          </Button>
        )}
      </div>

      {/* Rate / Pay type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-[12px] font-normal text-[#10141a]">
            Staff Rate / Pay type
          </p>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  value={service.staffRate || ""}
                  onChange={(e) => handleFieldChange("staffRate", e.target.value)}
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  placeholder="Enter rate"
                />
                <Select
                  value={service.payType}
                  onValueChange={(v) => handleFieldChange("payType", v)}
                >
                  <SelectTrigger className="w-[180px] h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                    <SelectValue placeholder="Pay type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="15-min">15 minutes</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="mile">Mile</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : (
              <p className="text-[14px] font-semibold text-[#10141a]">
                {service.staffRate
                  ? `$${service.staffRate} ${
                      service.payType === "15-min"
                        ? "/ 15 mins"
                        : service.payType === "daily"
                          ? "/ day"
                          : service.payType === "mile"
                            ? "/ mile"
                            : "/ hour"
                    }`
                  : "-"}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[12px] font-normal text-[#10141a]">
            Client Rate / Pay type
          </p>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.01}
                  value={service.clientRate || ""}
                  onChange={(e) => handleFieldChange("clientRate", e.target.value)}
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  placeholder="Enter rate"
                />
                <Select
                  value={service.clientPayType}
                  onValueChange={(v) => handleFieldChange("clientPayType", v)}
                >
                  <SelectTrigger className="w-[180px] h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                    <SelectValue placeholder="Pay type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="15-min">15 minutes</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="mile">Mile</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : (
              <p className="text-[14px] font-semibold text-[#10141a]">
                {service.clientRate
                  ? `$${service.clientRate} ${
                      service.clientPayType === "15-min"
                        ? "/ 15 mins"
                        : service.clientPayType === "daily"
                          ? "/ day"
                          : service.clientPayType === "mile"
                            ? "/ mile"
                            : "/ hour"
                    }`
                  : "-"}
              </p>
            )}
          </div>
        </div>
      </div>

      {(isEditing || (service.assignedDsps?.length ?? 0) > 0) && (
        <ServiceAssignedDspsSection
          isEditing={isEditing}
          assignedDsps={service.assignedDsps ?? []}
          onChange={(assignedDsps) => handleFieldChange("assignedDsps", assignedDsps)}
        />
      )}

      {/* Procedure & billing (matches Stage 2 SDR-derived scalars where applicable) */}
      <div className="space-y-3 pt-3 border-t border-[#e5e5e6] mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#808081]">
          Procedure & billing
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-[12px] font-normal text-[#10141a]">Procedure</p>
            {isEditing ? (
              <Input
                value={service.procedureName ?? ""}
                onChange={(e) => handleFieldChange("procedureName", e.target.value)}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="e.g. CBS from SDR"
              />
            ) : (
              <p className="text-[14px] font-semibold text-[#10141a]">{textOrDash(service.procedureName)}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[12px] font-normal text-[#10141a]">Unit type</p>
            {isEditing ? (
              <Input
                value={service.unitType ?? ""}
                onChange={(e) => handleFieldChange("unitType", e.target.value)}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="e.g. 15 Min"
              />
            ) : (
              <p className="text-[14px] font-semibold text-[#10141a]">{textOrDash(service.unitType)}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[12px] font-normal text-[#10141a]">Total computed hours (SDR)</p>
            {isEditing ? (
              <Input
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                value={service.sdrComputedTotalHours ?? ""}
                onChange={(e) => handleFieldChange("sdrComputedTotalHours", e.target.value)}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="Hours from SDR"
              />
            ) : (
              <p className="text-[14px] font-semibold text-[#10141a]">
                {textOrDash(service.sdrComputedTotalHours)}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[12px] font-normal text-[#10141a]">Total cost</p>
            {isEditing ? (
              <Input
                value={service.totalCost ?? ""}
                onChange={(e) => handleFieldChange("totalCost", e.target.value)}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="e.g. $2911.83"
              />
            ) : (
              <p className="text-[14px] font-semibold text-[#10141a]">{textOrDash(service.totalCost)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Location, claims source & ISP-level frequency */}
      <div className="space-y-3 pt-3 border-t border-[#e5e5e6] mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#808081]">
          Location & claims
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-[12px] font-normal text-[#10141a]">Service location</p>
            {isEditing ? (
              <Input
                value={service.location ?? ""}
                onChange={(e) => handleFieldChange("location", e.target.value)}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              />
            ) : (
              <p className="text-[14px] font-semibold text-[#10141a]">{textOrDash(service.location)}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[12px] font-normal text-[#10141a]">Claims source</p>
            {isEditing ? (
              <Input
                value={service.claimsSource ?? ""}
                onChange={(e) => handleFieldChange("claimsSource", e.target.value)}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="e.g. Medicaid"
              />
            ) : (
              <p className="text-[14px] font-semibold text-[#10141a]">{textOrDash(service.claimsSource)}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[12px] font-normal text-[#10141a]">Service frequency (ISP)</p>
            {isEditing ? (
              <Input
                value={service.frequency ?? ""}
                onChange={(e) => handleFieldChange("frequency", e.target.value)}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="e.g. 3x/wk"
              />
            ) : (
              <p className="text-[14px] font-semibold text-[#10141a]">{textOrDash(service.frequency)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="pt-3 border-t border-[#e5e5e6] mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#808081] mb-3">
          Dates
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* ISP Effective Date */}
        <div className="flex flex-col gap-1">
          <p className="text-[12px] font-normal text-[#10141a]">
            ISP Effective Date
          </p>
          {isEditing ? (
            <Popover open={isIspOpen} onOpenChange={setIsIspOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="w-full focus:outline-none">
                  <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
                    <InputGroupInput
                      value={displayDate(service.ispEffectiveDate)}
                      placeholder="Select date"
                      readOnly
                      className="text-[#10141a]"
                    />
                    <InputGroupAddon align="inline-end">
                      <CalendarDays className="h-5 w-5 text-[#10141a]" />
                    </InputGroupAddon>
                  </InputGroup>
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="mt-3 w-auto border-none bg-white p-0 shadow-lg"
              >
                <Calendar
                  mode="single"
                  selected={service.ispEffectiveDate ?? undefined}
                  defaultMonth={service.ispEffectiveDate ?? new Date()}
                  captionLayout="dropdown"
                  fromYear={2000}
                  toYear={new Date().getFullYear() + 10}
                  formatters={{
                    formatMonthDropdown: (date) =>
                      date.toLocaleString("default", { month: "long" }),
                  }}
                  classNames={{
                    dropdown_root:
                      "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
                  }}
                  onSelect={(d) => {
                    if (!d) return;
                    handleFieldChange("ispEffectiveDate", d);
                    setIsIspOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          ) : (
            <p className="text-[14px] font-semibold text-[#10141a]">
              {displayDate(service.ispEffectiveDate)}
            </p>
          )}
        </div>

        {/* Start Date of Authorization */}
        <div className="flex flex-col gap-1">
          <p className="text-[12px] font-normal text-[#10141a]">
            Start Date of Authorization
          </p>
          {isEditing ? (
          <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="w-full focus:outline-none">
                <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
                  <InputGroupInput
                    value={displayDate(service.startAuthDate)}
                    placeholder="Select date"
                    readOnly
                    className="text-[#10141a]"
                  />
                  <InputGroupAddon align="inline-end">
                    <CalendarDays className="h-5 w-5 text-[#10141a]" />
                  </InputGroupAddon>
                </InputGroup>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="mt-3 w-auto border-none bg-white p-0 shadow-lg"
            >
              <Calendar
                mode="single"
                selected={service.startAuthDate ?? undefined}
                defaultMonth={service.startAuthDate ?? new Date()}
                captionLayout="dropdown"
                fromYear={2000}
                toYear={new Date().getFullYear() + 10}
                formatters={{
                  formatMonthDropdown: (date) =>
                    date.toLocaleString("default", { month: "long" }),
                }}
                classNames={{
                  dropdown_root:
                    "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
                }}
                onSelect={(d) => {
                  if (!d) return;
                  handleFieldChange("startAuthDate", d);
                  setIsStartOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          ) : (
            <p className="text-[14px] font-semibold text-[#10141a]">
              {displayDate(service.startAuthDate)}
            </p>
          )}
        </div>

        {/* End Date of Authorization */}
        <div className="flex flex-col gap-1">
          <p className="text-[12px] font-normal text-[#10141a]">
            End Date of Authorization
          </p>
          {isEditing ? (
          <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="w-full focus:outline-none">
                <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
                  <InputGroupInput
                    value={displayDate(service.endAuthDate)}
                    placeholder="Select date"
                    readOnly
                    className="text-[#10141a]"
                  />
                  <InputGroupAddon align="inline-end">
                    <CalendarDays className="h-5 w-5 text-[#10141a]" />
                  </InputGroupAddon>
                </InputGroup>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="mt-3 w-auto border-none bg-white p-0 shadow-lg"
            >
              <Calendar
                mode="single"
                selected={service.endAuthDate ?? undefined}
                defaultMonth={service.endAuthDate ?? new Date()}
                captionLayout="dropdown"
                fromYear={2000}
                toYear={new Date().getFullYear() + 10}
                formatters={{
                  formatMonthDropdown: (date) =>
                    date.toLocaleString("default", { month: "long" }),
                }}
                classNames={{
                  dropdown_root:
                    "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
                }}
                onSelect={(d) => {
                  if (!d) return;
                  handleFieldChange("endAuthDate", d);
                  setIsEndOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          ) : (
            <p className="text-[14px] font-semibold text-[#10141a]">
              {displayDate(service.endAuthDate)}
            </p>
          )}
        </div>

        {/* PCPT Date */}
        <div className="flex flex-col gap-1">
          <p className="text-[12px] font-normal text-[#10141a]">PCPT Date</p>
          {isEditing ? (
          <Popover open={isPcptOpen} onOpenChange={setIsPcptOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="w-full focus:outline-none">
                <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
                  <InputGroupInput
                    value={displayDate(service.pcptDate)}
                    placeholder="Select date"
                    readOnly
                    className="text-[#10141a]"
                  />
                  <InputGroupAddon align="inline-end">
                    <CalendarDays className="h-5 w-5 text-[#10141a]" />
                  </InputGroupAddon>
                </InputGroup>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="mt-3 w-auto border-none bg-white p-0 shadow-lg"
            >
              <Calendar
                mode="single"
                selected={service.pcptDate ?? undefined}
                defaultMonth={service.pcptDate ?? new Date()}
                captionLayout="dropdown"
                fromYear={2000}
                toYear={new Date().getFullYear() + 10}
                formatters={{
                  formatMonthDropdown: (date) =>
                    date.toLocaleString("default", { month: "long" }),
                }}
                classNames={{
                  dropdown_root:
                    "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
                }}
                onSelect={(d) => {
                  if (!d) return;
                  handleFieldChange("pcptDate", d);
                  setIsPcptOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          ) : (
            <p className="text-[14px] font-semibold text-[#10141a]">
              {displayDate(service.pcptDate)}
            </p>
          )}
        </div>

        {/* SDR Start Date */}
        <div className="flex flex-col gap-1">
          <p className="text-[12px] font-normal text-[#10141a]">
            SDR Start Date
          </p>
          {isEditing ? (
          <Popover open={isSdrStartOpen} onOpenChange={setIsSdrStartOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="w-full focus:outline-none">
                <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
                  <InputGroupInput
                    value={displayDate(service.sdrStartDate)}
                    placeholder="Select date"
                    readOnly
                    className="text-[#10141a]"
                  />
                  <InputGroupAddon align="inline-end">
                    <CalendarDays className="h-5 w-5 text-[#10141a]" />
                  </InputGroupAddon>
                </InputGroup>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="mt-3 w-auto border-none bg-white p-0 shadow-lg"
            >
              <Calendar
                mode="single"
                selected={service.sdrStartDate ?? undefined}
                defaultMonth={service.sdrStartDate ?? new Date()}
                captionLayout="dropdown"
                fromYear={2000}
                toYear={new Date().getFullYear() + 10}
                formatters={{
                  formatMonthDropdown: (date) =>
                    date.toLocaleString("default", { month: "long" }),
                }}
                classNames={{
                  dropdown_root:
                    "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
                }}
                onSelect={(d) => {
                  if (!d) return;
                  handleFieldChange("sdrStartDate", d);
                  setIsSdrStartOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          ) : (
            <p className="text-[14px] font-semibold text-[#10141a]">
              {displayDate(service.sdrStartDate)}
            </p>
          )}
        </div>

        {/* SDR End Date */}
        <div className="flex flex-col gap-1">
          <p className="text-[12px] font-normal text-[#10141a]">
            SDR End Date
          </p>
          {isEditing ? (
          <Popover open={isSdrEndOpen} onOpenChange={setIsSdrEndOpen}>
            <PopoverTrigger asChild>
              <button type="button" className="w-full focus:outline-none">
                <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
                  <InputGroupInput
                    value={displayDate(service.sdrEndDate)}
                    placeholder="Select date"
                    readOnly
                    className="text-[#10141a]"
                  />
                  <InputGroupAddon align="inline-end">
                    <CalendarDays className="h-5 w-5 text-[#10141a]" />
                  </InputGroupAddon>
                </InputGroup>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="mt-3 w-auto border-none bg-white p-0 shadow-lg"
            >
              <Calendar
                mode="single"
                selected={service.sdrEndDate ?? undefined}
                defaultMonth={service.sdrEndDate ?? new Date()}
                captionLayout="dropdown"
                fromYear={2000}
                toYear={new Date().getFullYear() + 10}
                formatters={{
                  formatMonthDropdown: (date) =>
                    date.toLocaleString("default", { month: "long" }),
                }}
                classNames={{
                  dropdown_root:
                    "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
                }}
                onSelect={(d) => {
                  if (!d) return;
                  handleFieldChange("sdrEndDate", d);
                  setIsSdrEndOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          ) : (
            <p className="text-[14px] font-semibold text-[#10141a]">
              {displayDate(service.sdrEndDate)}
            </p>
          )}
        </div>
      </div>
      </div>

      {/* Prior authorization metadata — dates are canonical on start/end above */}
      <div className="mt-3 rounded-[12px] border border-[#e1e3e8] bg-[#fafbfc]/50 p-4">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#808081]">
          Prior authorization
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-[12px] font-normal text-[#10141a]">PA number</p>
            {isEditing ? (
              <Input
                value={service.sdrPriorAuthorization?.paNumber ?? ""}
                onChange={(e) =>
                  handleFieldChange(
                    "sdrPriorAuthorization",
                    priorAuthMetadataFromApi({
                      paNumber: e.target.value,
                      approvedUnitsTillDate: service.sdrPriorAuthorization?.approvedUnitsTillDate,
                    }),
                  )
                }
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              />
            ) : (
              <p className="text-[14px] font-semibold text-[#10141a]">
                {textOrDash(service.sdrPriorAuthorization?.paNumber)}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[12px] font-normal text-[#10141a]">Approved units till date</p>
            {isEditing ? (
              <Input
                value={service.sdrPriorAuthorization?.approvedUnitsTillDate ?? ""}
                onChange={(e) =>
                  handleFieldChange(
                    "sdrPriorAuthorization",
                    priorAuthMetadataFromApi({
                      paNumber: service.sdrPriorAuthorization?.paNumber,
                      approvedUnitsTillDate: e.target.value,
                    }),
                  )
                }
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="e.g. 6,269 (may not be a date)"
              />
            ) : (
              <p className="text-[14px] font-semibold text-[#10141a]">
                {textOrDash(service.sdrPriorAuthorization?.approvedUnitsTillDate)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Weekly distribution */}
      <div className="space-y-3 pt-3 border-t border-[#e5e5e6] mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#808081]">
          Weekly distribution
        </p>
        {isEditing ? (
          <div className="grid grid-cols-1 gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-[12px] font-normal text-[#10141a]">Standard line</p>
              <Input
                value={service.sdrWeeklyDistribution?.standardLine ?? ""}
                onChange={(e) =>
                  onChange(
                    applyWeeklyDistToServiceRow(service, {
                      ...service.sdrWeeklyDistribution,
                      rows: service.sdrWeeklyDistribution?.rows,
                      standardLine: e.target.value || undefined,
                    }),
                  )
                }
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="40 @ 15 Min / Weekly"
              />
            </div>
            {weeklyDistInlineModel ? (
              <WeeklyDistributionInline
                hideTitle
                hideStandardLine
                isEditing
                wd={weeklyDistInlineModel}
                className="mt-1"
                onChange={(nextWd) =>
                  onChange(
                    applyWeeklyDistToServiceRow(service, {
                      standardLine: service.sdrWeeklyDistribution?.standardLine,
                      rows: nextWd.rows,
                    }),
                  )
                }
              />
            ) : (
              <WeeklyDistributionInline
                hideTitle
                hideStandardLine
                isEditing
                wd={{ standardLine: service.sdrWeeklyDistribution?.standardLine, rows: [] }}
                onChange={(nextWd) =>
                  onChange(applyWeeklyDistToServiceRow(service, nextWd))
                }
              />
            )}
          </div>
        ) : weeklyDistInlineModel ? (
          <WeeklyDistributionInline hideTitle wd={weeklyDistInlineModel} />
        ) : (
          <p className="text-[13px] text-[#808081]">—</p>
        )}
      </div>

      {/* SDR breakdown */}
      <div className="space-y-3 pt-3 border-t border-[#e5e5e6] mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#808081]">
          SDR breakdown
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1 md:col-span-2">
            <p className="text-[12px] font-normal text-[#10141a]">Delivery methods</p>
            {isEditing ? (
              <Textarea
                value={(service.sdrDetails?.deliveryMethods ?? []).join("\n")}
                onChange={(e) => {
                  const list = splitLinesToList(e.target.value, MAX_SDR_LIST_LINES);
                  patchSdrDetails({ deliveryMethods: list.length ? list : undefined });
                }}
                rows={3}
                className="min-h-[72px] rounded-[12px] border-[#cccccd] bg-white text-[13px]"
                placeholder="One per line"
              />
            ) : (
              <p className="text-[14px] font-semibold text-[#10141a] whitespace-pre-wrap">
                {(service.sdrDetails?.deliveryMethods ?? []).join("\n") || "—"}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <p className="text-[12px] font-normal text-[#10141a]">Support tasks</p>
            {isEditing ? (
              <Textarea
                value={(service.sdrDetails?.supportTasks ?? []).join("\n")}
                onChange={(e) => {
                  const list = splitLinesToList(e.target.value, MAX_SDR_LIST_LINES);
                  patchSdrDetails({ supportTasks: list.length ? list : undefined });
                }}
                rows={3}
                className="min-h-[72px] rounded-[12px] border-[#cccccd] bg-white text-[13px]"
                placeholder="One per line"
              />
            ) : (
              <p className="text-[14px] font-semibold text-[#10141a] whitespace-pre-wrap">
                {(service.sdrDetails?.supportTasks ?? []).join("\n") || "—"}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[12px] font-normal text-[#10141a]">Frequency (SDR detail)</p>
            {isEditing ? (
              <Input
                value={service.sdrDetails?.frequency ?? ""}
                onChange={(e) => patchSdrDetails({ frequency: e.target.value.trim() || undefined })}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              />
            ) : (
              <p className="text-[14px] font-semibold text-[#10141a]">{textOrDash(service.sdrDetails?.frequency)}</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[12px] font-normal text-[#10141a]">Setting</p>
            {isEditing ? (
              <Input
                value={service.sdrDetails?.setting ?? ""}
                onChange={(e) => patchSdrDetails({ setting: e.target.value.trim() || undefined })}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              />
            ) : (
              <p className="text-[14px] font-semibold text-[#10141a]">{textOrDash(service.sdrDetails?.setting)}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-[12px] font-normal text-[#10141a]">SDR provider (source)</p>
            {isEditing ? (
              <Input
                value={service.sdrDetails?.source?.provider ?? ""}
                onChange={(e) =>
                  patchSdrDetails({
                    source: {
                      ...service.sdrDetails?.source,
                      provider: e.target.value.trim() || undefined,
                    },
                  })
                }
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              />
            ) : (
              <p className="text-[14px] font-semibold text-[#10141a]">
                {textOrDash(service.sdrDetails?.source?.provider)}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[12px] font-normal text-[#10141a]">Payer / claims source (SDR)</p>
            {isEditing ? (
              <Input
                value={service.sdrDetails?.source?.claimsSource ?? ""}
                onChange={(e) =>
                  patchSdrDetails({
                    source: {
                      ...service.sdrDetails?.source,
                      claimsSource: e.target.value.trim() || undefined,
                    },
                  })
                }
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              />
            ) : (
              <p className="text-[14px] font-semibold text-[#10141a]">
                {textOrDash(service.sdrDetails?.source?.claimsSource)}
              </p>
            )}
          </div>
        </div>

        {(service.sdrDetails?.source?.serviceCode ||
          service.sdrDetails?.source?.serviceName ||
          service.sdrDetails?.source?.outcomeStatement) && (
          <div className="rounded-[12px] border border-[#e5e5e6] bg-white/70 p-3 text-[13px] text-[#4b4b4c] space-y-1">
            {(service.sdrDetails?.source?.outcomeStatement?.trim()
              ?? service.sdrDetails?.source?.serviceName?.trim()
              ?? service.sdrDetails?.source?.serviceCode?.trim()) ? (
              <>
                {service.sdrDetails?.source?.outcomeStatement ? (
                  <p>
                    <span className="font-medium text-[#10141a]">Outcome: </span>
                    {service.sdrDetails.source.outcomeStatement}
                  </p>
                ) : null}
                {service.sdrDetails?.source?.serviceName ? (
                  <p>
                    <span className="font-medium text-[#10141a]">Extracted service: </span>
                    {service.sdrDetails.source.serviceName}{" "}
                    {service.sdrDetails.source.serviceCode
                      ? `(${service.sdrDetails.source.serviceCode})`
                      : ""}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export function ServicesTab({ client, clientId, onServicesUpdated }: ServicesTabProps) {
  const [outcomeGroups, setOutcomeGroups] = useState<EditableOutcomeGroup[]>(() =>
    mapClientOutcomesToEditable(client.outcomes),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) return;
    setOutcomeGroups(mapClientOutcomesToEditable(client.outcomes));
  }, [client.outcomes, client.id, isEditing]);

  useEffect(() => {
    const has = client.outcomes?.some((o) =>
      o.services?.some((s) => s.name?.trim() && s.code?.trim()),
    );
    if (!has) setIsEditing(true);
  }, [client.id]);

  const hasConfiguredServices = useMemo(
    () =>
      outcomeGroups.some((g) =>
        g.services.some((s) => s.name?.trim() && s.code?.trim()),
      ),
    [outcomeGroups],
  );

  const handleAddOutcome = () => {
    setOutcomeGroups((prev) => [...prev, emptyOutcomeGroup()]);
    setIsEditing(true);
  };

  /** Add an authorization row to the first outcome group (matches common single-outcome flow). */
  const handleAddService = () => {
    setOutcomeGroups((prev) => {
      if (!prev.length) return [emptyOutcomeGroup()];
      const next = [...prev];
      next[0] = {
        ...next[0],
        services: [emptyEditableServiceRow(), ...next[0].services],
      };
      return next;
    });
    setIsEditing(true);
  };

  const handleAddServiceToOutcome = (outcomeIndex: number) => {
    setOutcomeGroups((prev) => {
      const next = [...prev];
      const g = next[outcomeIndex];
      if (!g) return prev;
      next[outcomeIndex] = {
        ...g,
        services: [emptyEditableServiceRow(), ...g.services],
      };
      return next;
    });
    setIsEditing(true);
  };

  const handleRemoveOutcome = (outcomeIndex: number) => {
    setOutcomeGroups((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== outcomeIndex);
    });
  };

  const handleRemoveService = (outcomeIndex: number, serviceId: string) => {
    setOutcomeGroups((prev) => {
      const next = [...prev];
      const g = next[outcomeIndex];
      if (!g) return prev;
      const services = g.services.filter((s) => s.id !== serviceId);
      next[outcomeIndex] = {
        ...g,
        services: services.length ? services : [emptyEditableServiceRow()],
      };
      return next;
    });
  };

  const handleSave = async () => {
    if (!clientId) return;

    const pruned = outcomeGroups
      .map((g) => ({
        ...g,
        services: g.services.filter(
          (s) => s.name?.trim() || s.code?.trim(),
        ),
      }))
      .filter((g) => g.services.length > 0);

    if (!pruned.length) {
      setError("Add at least one service with a name and code before saving.");
      setShowErrorModal(true);
      return;
    }

    const invalid = pruned
      .flatMap((g) => g.services)
      .find((svc) => !svc.name?.trim() || !svc.code?.trim());
    if (invalid) {
      setError("Each service must have a name and code before saving.");
      setShowErrorModal(true);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await updateClient(clientId, {
        outcomes: mapEditableOutcomesToApi(pruned),
      });

      onServicesUpdated?.();
      setIsEditing(false);
    } catch (err: unknown) {
      console.error("Failed to update services:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update services. Please try again.",
      );
      setShowErrorModal(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setOutcomeGroups(mapClientOutcomesToEditable(client.outcomes));
    setError(null);
    setIsEditing(false);
  };

  return (
    <div className="mt-4 backdrop-blur bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] rounded-[30px] p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[24px] font-medium leading-[normal] text-[#10141a]">
            Outcomes &amp; services
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            Edit ISP outcome statements and nested service authorizations (saved as <code className="text-xs">outcomes</code> only).
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {hasConfiguredServices && (
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-[60px] border-[#b2b2b3] text-[#10141a] bg-white/60 hover:bg-white"
              onClick={() => setIsEditing((prev) => !prev)}
              disabled={isSaving}
            >
              {isEditing ? "Stop Editing" : "Edit"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-[60px] border-[#b2b2b3] text-[#10141a] bg-white/60 hover:bg-white"
            onClick={handleAddOutcome}
            disabled={isSaving}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add outcome
          </Button>
          <Button
            type="button"
            className="h-11 rounded-[60px] bg-[#00b4b8] text-white hover:bg-[#00a0a4] px-5 shrink-0"
            onClick={handleAddService}
            disabled={isSaving}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add service
          </Button>
        </div>
      </div>

      {/* Error modal */}
      {error && showErrorModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-[20px] bg-white shadow-lg p-6 flex flex-col items-center gap-4 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <p className="text-[18px] font-semibold text-[#10141a]">
              Unable to save services
            </p>
            <p className="text-[14px] text-[#4b4b4c]">{error}</p>
            <div className="mt-2 flex justify-center">
              <Button
                type="button"
                className="h-10 rounded-[60px] px-5 bg-[#00b4b8] text-white hover:bg-[#00a0a4]"
                onClick={() => setShowErrorModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-2 space-y-8">
        {!hasConfiguredServices && (
          <p className="text-[13px] text-[#808081]">
            Add at least one authorization with a service name and code. Outcome statements are optional but recommended.
          </p>
        )}
        {outcomeGroups.map((group, oi) => (
            <div
              key={group.id}
              className="rounded-[24px] border border-[rgba(16,20,26,0.08)] bg-white/50 p-4 flex flex-col gap-3"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#808081] mb-1">Outcome statement</p>
                  {isEditing ? (
                    <Textarea
                      value={group.statement}
                      onChange={(e) => {
                        const v = e.target.value;
                        setOutcomeGroups((prev) => {
                          const n = [...prev];
                          n[oi] = { ...n[oi], statement: v };
                          return n;
                        });
                      }}
                      className="min-h-[80px] rounded-[12px] border-[#cccccd] bg-white"
                      placeholder="Describe the ISP outcome this group supports"
                    />
                  ) : (
                    <p className="text-[14px] font-semibold text-[#10141a] whitespace-pre-wrap">
                      {group.statement?.trim() ? group.statement : "—"}
                    </p>
                  )}
                </div>
                {isEditing && outcomeGroups.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 rounded-full px-2 text-[#d53411] hover:bg-red-50 shrink-0"
                    onClick={() => handleRemoveOutcome(oi)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove outcome
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {group.services.map((svc) => (
                  <ServiceRow
                    key={svc.id}
                    service={svc}
                    isEditing={isEditing}
                    onChange={(next) =>
                      setOutcomeGroups((prev) => {
                        const n = [...prev];
                        const g = n[oi];
                        if (!g) return prev;
                        n[oi] = {
                          ...g,
                          services: g.services.map((s) => (s.id === svc.id ? next : s)),
                        };
                        return n;
                      })
                    }
                    onRemove={
                      isEditing
                        ? () => handleRemoveService(oi, svc.id)
                        : undefined
                    }
                  />
                ))}
              </div>

              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  className="self-start rounded-[60px]"
                  onClick={() => handleAddServiceToOutcome(oi)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add service to this outcome
                </Button>
              )}
            </div>
          ))}
        </div>

      {isEditing && (
        <div className="mt-4 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-[60px] px-5 text-[#10141a] border-[#b2b2b3] bg-white"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-10 rounded-[60px] px-6 bg-[#00b4b8] text-white hover:bg-[#00a0a4] flex items-center gap-2"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      )}

      {isSaving && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-[20px] bg-white shadow-lg p-6 flex flex-col items-center gap-3 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#e6f7f7]">
              <Loader2 className="w-7 h-7 animate-spin text-[#00b4b8]" />
            </div>
            <p className="text-[16px] font-medium text-[#10141a]">Saving…</p>
            <p className="text-[13px] text-[#808081]">
              Updating outcome groups for this client.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}


