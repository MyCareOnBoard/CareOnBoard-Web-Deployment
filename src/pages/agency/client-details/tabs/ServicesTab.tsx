import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Plus, Trash2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Client, ClientService } from "@/lib/api/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { updateClient } from "@/lib/api/clients";
import { listServices, useListServicesQuery, type Service as ApiService } from "@/lib/api/services";

interface ServicesTabProps {
  client: Client;
  clientId: string;
  onServicesUpdated?: () => void;
}

// Editable model mirroring Stage 2 service fields
type EditableService = {
  id: string;
  name: string;
  code: string;
  hours?: string;
  totalApprovedHours?: string;
  rate?: string;
  payType?: ClientService["payType"];
  clientRate?: string;
  clientPayType?: ClientService["payType"];
  ispEffectiveDate?: Date | null;
  startAuthDate?: Date | null;
  endAuthDate?: Date | null;
  pcptDate?: Date | null;
  sdrStartDate?: Date | null;
  sdrEndDate?: Date | null;
};

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

function mapClientServicesToEditable(services?: ClientService[]): EditableService[] {
  if (!services) return [];
  return services.map((svc) => ({
    id: svc.id,
    name: svc.name,
    code: svc.code,
    hours: svc.hours,
    totalApprovedHours: svc.totalApprovedHours,
    rate: svc.rate,
    payType: svc.payType,
    clientRate: svc.clientRate,
    clientPayType: svc.clientPayType,
    ispEffectiveDate: parseDate(svc.ispEffectiveDate),
    startAuthDate: parseDate(svc.startAuthDate),
    endAuthDate: parseDate(svc.endAuthDate),
    pcptDate: parseDate(svc.pcptDate),
    sdrStartDate: parseDate(svc.sdrStartDate),
    sdrEndDate: parseDate(svc.sdrEndDate),
  }));
}

function mapEditableToClientServices(services: EditableService[]): ClientService[] {
  return services.map<ClientService>((svc) => ({
    id: svc.id,
    name: svc.name,
    code: svc.code,
    hours: svc.hours,
    totalApprovedHours: svc.totalApprovedHours,
    rate: svc.rate,
    payType: svc.payType,
    clientRate: svc.clientRate,
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
  }));
}

type ServiceRowProps = {
  service: EditableService;
  offeredServices: ApiService[];
  isEditing: boolean;
  onChange: (next: EditableService) => void;
  onRemove?: () => void;
};

function ServiceRow({
  service,
  offeredServices,
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
  const [selectedType, setSelectedType] = useState<string>("");

  const serviceTypes = useMemo(
    () =>
      Array.from(
        new Set(
          offeredServices
            .map((s) => s.type)
            .filter((t): t is string => Boolean(t)),
        ),
      ),
    [offeredServices],
  );

  const filteredServices = useMemo(
    () =>
      offeredServices.filter((svc) =>
        selectedType ? svc.type === selectedType : false,
      ),
    [offeredServices, selectedType],
  );

  // Infer type from existing service when possible
  useEffect(() => {
    if (!selectedType && service.name && service.code) {
      const match = offeredServices.find(
        (s) => s.name === service.name && s.code === service.code,
      );
      if (match && match.type) {
        setSelectedType(match.type);
      }
    }
  }, [offeredServices, service.name, service.code, selectedType]);

  const handleFieldChange = (field: keyof EditableService, value: any) => {
    onChange({ ...service, [field]: value });
  };

  const handleFieldsChange = (patch: Partial<EditableService>) => {
    onChange({ ...service, ...patch });
  };

  const displayDate = (value?: Date | null) =>
    value ? format(value, "MMM d, yyyy") : "";

  return (
    <div className="backdrop-blur-[20px] rounded-[20px] border border-[rgba(255,255,255,0.4)] bg-white/70 px-4 py-3 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3">
            {/* Service Type */}
            <div className="flex flex-col gap-1">
              <p className="text-[12px] font-normal text-[#10141a]">
                Service Type
              </p>
              {isEditing ? (
                <Select
                  value={selectedType}
                  onValueChange={(v) => {
                    setSelectedType(v);
                    const stillValid = filteredServices.some(
                      (s) => s.name === service.name && s.code === service.code,
                    );
                    if (!stillValid) {
                      handleFieldsChange({ code: "", name: "" });
                    }
                  }}
                  disabled={serviceTypes.length === 0}
                >
                  <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                    <SelectValue
                      placeholder={
                        serviceTypes.length === 0
                          ? "No service types available"
                          : "Select service type"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-[14px] font-semibold text-[#10141a]">
                  {selectedType || "Not set"}
                </p>
              )}
            </div>

            {/* Service (name + code) */}
            <div className="flex flex-col gap-1">
              <p className="text-[12px] font-normal text-[#10141a]">Service</p>
              {isEditing ? (
                <Select
                  value={service.code || ""}
                  onValueChange={(v) => {
                    const selected = filteredServices.find(
                      (s) => s.code === v,
                    );
                    handleFieldsChange({
                      name: selected?.name || "",
                      code: selected?.code || "",
                    });
                  }}
                  disabled={!selectedType || filteredServices.length === 0}
                >
                  <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                    <SelectValue
                      placeholder={
                        !selectedType
                          ? "Select service type first"
                          : filteredServices.length === 0
                          ? "No services for this type"
                          : "Select service"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredServices.map((svc) => (
                      <SelectItem key={svc.id} value={svc.code}>
                        {svc.name} - {svc.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-[14px] font-semibold text-[#10141a]">
                  {service.name
                    ? `${service.name} - ${service.code || ""}`
                    : "Not set"}
                </p>
              )}
            </div>

            {/* Authorized hours per week */}
            <div className="flex flex-col gap-1">
              <p className="text-[12px] font-normal text-[#10141a]">
                Authorized hours per week
              </p>
              {isEditing ? (
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={service.hours || ""}
                  onChange={(e) => handleFieldChange("hours", e.target.value)}
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  placeholder="Enter hours"
                />
              ) : (
                <p className="text-[14px] font-semibold text-[#10141a]">
                  {service.hours || "-"}
                </p>
              )}
            </div>

            {/* Total approved hours */}
            <div className="flex flex-col gap-1">
              <p className="text-[12px] font-normal text-[#10141a]">
                Total approved hours
              </p>
              {isEditing ? (
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={service.totalApprovedHours || ""}
                  onChange={(e) =>
                    handleFieldChange("totalApprovedHours", e.target.value)
                  }
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  placeholder="Enter total hours"
                />
              ) : (
                <p className="text-[14px] font-semibold text-[#10141a]">
                  {service.totalApprovedHours || "-"}
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
                  value={service.rate || ""}
                  onChange={(e) => handleFieldChange("rate", e.target.value)}
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
                {service.rate
                  ? `$${service.rate} ${
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

      {/* Date fields – same pattern as Stage 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-[#e5e5e6] mt-3">
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
                <InputGroup className="h-[44px] bgwhite border border-[#cccccd] rounded-[12px] px-4">
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
  );
}

export function ServicesTab({ client, clientId, onServicesUpdated }: ServicesTabProps) {
  const [services, setServices] = useState<EditableService[]>(
    mapClientServicesToEditable(client.services),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offeredServices, setOfferedServices] = useState<ApiService[]>([]);
  const {data, isLoading: loadingServices} = useListServicesQuery({});

  useEffect(() => {
    if (data && !loadingServices) {
      setOfferedServices(data.services);
    }
  }, [data, loadingServices]);

  // Keep local state in sync when client.services changes
  useEffect(() => {
    setServices(mapClientServicesToEditable(client.services));
  }, [client.services]);

  const hasServices = useMemo(() => services.length > 0, [services.length]);

  const handleAddService = () => {
    const newService: EditableService = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? `svc-${crypto.randomUUID()}`
          : `svc-${Math.random().toString(16).slice(2)}`,
      name: "",
      code: "",
      hours: "",
      totalApprovedHours: "",
      rate: "",
      payType: undefined,
      clientRate: "",
      clientPayType: undefined,
      ispEffectiveDate: null,
      startAuthDate: null,
      endAuthDate: null,
      pcptDate: null,
      sdrStartDate: null,
      sdrEndDate: null,
    };

    setServices((prev) => [newService, ...prev]);
    setIsEditing(true);
  };

  const handleRemoveService = (id: string) => {
    setServices((prev) => prev.filter((svc) => svc.id !== id));
  };

  const handleSave = async () => {
    if (!clientId) return;

    const invalid = services.find((svc) => !svc.name || !svc.code);
    if (invalid) {
      setError("Each service must have a name and code before saving.");
      setShowErrorModal(true);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const payload = mapEditableToClientServices(services);
      await updateClient(clientId, { services: payload });

      if (onServicesUpdated) {
        onServicesUpdated();
      }
      setIsEditing(false);
    } catch (err: any) {
      console.error("Failed to update services:", err);
      setError(err?.message || "Failed to update services. Please try again.");
      setShowErrorModal(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setServices(mapClientServicesToEditable(client.services));
    setError(null);
    setIsEditing(false);
  };

  return (
    <div className="mt-4 backdrop-blur bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] rounded-[30px] p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[24px] font-medium leading-[normal] text-[#10141a]">
            Services
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            Manage the services authorized for this client.
          </p>
          {loadingServices && (
            <p className="text-[12px] text-[#808081] flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading available services...
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasServices && (
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-[60px] border-[#b2b2b3] text-[#10141a] bg-white/60 hover:bg-white"
              onClick={() => setIsEditing((prev) => !prev)}
              disabled={loadingServices || isSaving}
            >
              {isEditing ? "Stop Editing" : "Edit services"}
            </Button>
          )}
          <Button
            type="button"
            className="h-11 rounded-[60px] bg-[#00b4b8] text-white hover:bg-[#00a0a4] px-5 shrink-0"
            onClick={handleAddService}
            disabled={loadingServices || isSaving}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Service
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

      {/* Services List */}
      {!hasServices ? (
        <div className="py-12 text-center">
          <p className="text-[14px] font-medium text-[#808081]">
            No services configured for this client yet. Click &quot;Add
            Service&quot; to create one.
          </p>
        </div>
      ) : (
        <div className="mt-2 space-y-4">
          {services.map((svc) => (
            <ServiceRow
              key={svc.id}
              service={svc}
              offeredServices={offeredServices}
              isEditing={isEditing}
              onChange={(next) =>
                setServices((prev) =>
                  prev.map((s) => (s.id === svc.id ? next : s)),
                )
              }
              onRemove={isEditing ? () => handleRemoveService(svc.id) : undefined}
            />
          ))}
        </div>
      )}

      {/* Footer actions */}
      {hasServices && isEditing && (
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

      {/* Saving modal */}
      {isSaving && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-[20px] bg-white shadow-lg p-6 flex flex-col items-center gap-3 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#e6f7f7]">
              <Loader2 className="w-7 h-7 animate-spin text-[#00b4b8]" />
            </div>
            <p className="text-[16px] font-medium text-[#10141a]">
              Saving services...
            </p>
            <p className="text-[13px] text-[#808081]">
              Please wait while we save the updated service details for this client.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}


