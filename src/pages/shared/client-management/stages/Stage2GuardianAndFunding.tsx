import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Plus, Trash2, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  createEmptyServiceAuthorization,
  type GuardianRelationship,
  Service,
  type ServicePayType,
} from "@/pages/shared/client-management/types/formData";
import { useListServicesQuery, type Service as ApiService } from "@/lib/api/services";
import { searchEmployees, type Employee } from "@/lib/api/employees";
import { useAuth } from "@/utils/auth";

const RATE_INPUT_CLASS = "h-[44px] rounded-[12px] border-[#cccccd] bg-white";
const SELECT_TRIGGER_CLASS = "w-[180px] h-[44px] rounded-[12px] border-[#cccccd] bg-white";
const SECTION_HEADER_ACTION_BTN =
  "h-11 shrink-0 rounded-[60px] border border-[#b2b2b3] bg-white/40 px-5 text-[14px] font-semibold text-[#10141a] hover:bg-white/60";
const SECTION_SUBROW_ACTION_BTN =
  "h-9 shrink-0 rounded-[60px] border border-[#b2b2b3] bg-white/40 px-3 text-[14px] font-semibold text-[#10141a] hover:bg-white/60";

function DspSearchSlotRow({
  assigned,
  onPick,
  onRemoveSlot,
}: {
  assigned: { id: string }[];
  onPick: (emp: Employee) => void;
  onRemoveSlot: () => void;
}) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    (q: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (q.trim().length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }
      const agencyId = user?.agencyId || user?.uid;
      const assignedIds = new Set(assigned.map((d) => d.id));
      timeoutRef.current = setTimeout(async () => {
        try {
          setSearching(true);
          const res = await searchEmployees(q, agencyId);
          const filtered = res.filter((e) => !assignedIds.has(e.id));
          setResults(filtered);
          setOpen(filtered.length > 0);
        } catch {
          setResults([]);
          setOpen(false);
        } finally {
          setSearching(false);
        }
      }, 300);
    },
    [user?.agencyId, user?.uid, assigned],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="flex gap-2 items-start max-w-md">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="relative flex-1 min-w-0">
            <Input
              value={query}
              onChange={(e) => {
                const v = e.target.value;
                setQuery(v);
                runSearch(v);
              }}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Search Dsps by name (at least 2 characters)"
            />
            {searching ? (
              <div className="absolute right-3 top-3">
                <Loader2 className="h-4 w-4 animate-spin text-[#808081]" />
              </div>
            ) : null}
          </div>
        </PopoverAnchor>
        <PopoverContent className="p-0 w-[min(100vw-2rem,28rem)]" align="start">
          <div className="max-h-48 overflow-y-auto">
            {results.map((emp) => (
              <button
                key={emp.id}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-[#f8f9fa]"
                onClick={() => {
                  onPick(emp);
                  setQuery("");
                  setOpen(false);
                  setResults([]);
                }}
              >
                {emp.fullName}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-[44px] w-[44px] shrink-0 text-[#10141a]"
        onClick={onRemoveSlot}
        aria-label="Remove Dsp search"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ServicePerServiceStaffOnly({
  service,
  update,
}: {
  service: Service;
  update: (patch: Partial<Service>) => void;
}) {
  const [dspSearchSlotIds, setDspSearchSlotIds] = useState<string[]>([]);

  const assigned = service.assignedDsps ?? [];

  const addDspFromEmployee = useCallback(
    (emp: Employee) => {
      const cur = service.assignedDsps ?? [];
      if (cur.some((d) => d.id === emp.id)) return;
      update({ assignedDsps: [...cur, { id: emp.id, name: emp.fullName }] });
    },
    [service.assignedDsps, update],
  );

  const removeDsp = (id: string) => {
    update({ assignedDsps: assigned.filter((d) => d.id !== id) });
  };

  const addSearchSlot = () => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Math.random());
    setDspSearchSlotIds((s) => [...s, id]);
  };

  const removeSearchSlot = (slotId: string) => {
    setDspSearchSlotIds((s) => s.filter((x) => x !== slotId));
  };

  return (
    <div className="col-span-full mt-6 space-y-6 border-t border-[#cccccd]/60 pt-6">
      <div>
        <div className="mb-4">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a] mb-1">
            Dsps assigned to this service
          </p>
          <p className="text-[13px] text-[#808081]">
            Add a search row for each Dsp you want to look up. Dsps are not imported from uploaded documents.
          </p>
        </div>
        {assigned.length === 0 ? (
          <p className="text-[13px] text-[#808081] mb-2">No Dsps assigned yet.</p>
        ) : (
          <ul className="flex flex-col gap-2 mb-3">
            {assigned.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-[12px] border border-[#cccccd] bg-white px-3 py-2"
              >
                <span className="text-[14px] text-[#10141a]">{d.name}</span>
                <button
                  type="button"
                  className="text-[#10141a] p-1 rounded-md hover:bg-[#f8f9fa]"
                  onClick={() => removeDsp(d.id)}
                  aria-label={`Remove ${d.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-3 mb-2">
          {dspSearchSlotIds.map((slotId) => (
            <DspSearchSlotRow
              key={slotId}
              assigned={assigned}
              onPick={(emp) => {
                addDspFromEmployee(emp);
                removeSearchSlot(slotId);
              }}
              onRemoveSlot={() => removeSearchSlot(slotId)}
            />
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed border-[#808081] text-[#10141a] sm:w-auto"
          onClick={addSearchSlot}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Dsp
        </Button>
      </div>
    </div>
  );
}

function RatePayTypeField({
  label,
  rate,
  payType,
  includeMile = false,
  onRateChange,
  onPayTypeChange,
}: {
  label: string;
  rate: string;
  payType?: ServicePayType;
  /** Include per-mile option (client and staff reimbursement). */
  includeMile?: boolean;
  onRateChange: (value: string) => void;
  onPayTypeChange: (value: ServicePayType) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-normal text-[#10141a]">{label}</label>
      <div className="flex gap-2">
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step={0.01}
          value={rate}
          onChange={(e) => onRateChange(e.target.value)}
          className={RATE_INPUT_CLASS}
          placeholder="Enter rate"
        />
        <Select value={payType} onValueChange={(v) => onPayTypeChange(v as ServicePayType)}>
          <SelectTrigger className={SELECT_TRIGGER_CLASS}>
            <SelectValue placeholder="Pay type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hourly">Hourly</SelectItem>
            <SelectItem value="15-min">15 minutes</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            {includeMile ? <SelectItem value="mile">Mile</SelectItem> : null}
          </SelectContent>
        </Select>
      </div>
    </div>
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
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);
  const [isPcptOpen, setIsPcptOpen] = useState(false);
  const [isSdrStartOpen, setIsSdrStartOpen] = useState(false);
  const [isSdrEndOpen, setIsSdrEndOpen] = useState(false);
  const [offeredServices, setOfferedServices] = useState<ApiService[]>([]);
  const [selectedType, setSelectedType] = useState<string>("");
  const {data, isLoading: loadingServices} = useListServicesQuery({});

  useEffect(() => {
    if (data && !loadingServices) {
      setOfferedServices(data.services);
    }
  }, [data, loadingServices]);

  useEffect(() => {
    if (!loadingServices && offeredServices.length > 0 && (service.name || service.code) && !selectedType) {
      const matchingService = offeredServices.find(
        (s) => (service.name && s.name === service.name) || (service.code && s.code === service.code)
      );
      if (matchingService && matchingService.type) {
        setSelectedType(matchingService.type);
      }
    }
  }, [loadingServices, offeredServices, service.name, service.code, selectedType]);

  const serviceTypes = useMemo(
    () =>
      Array.from(
        new Set(
          offeredServices
            .map((svc) => svc.type)
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

  useEffect(() => {
    if (!selectedType || loadingServices || offeredServices.length === 0) return;
    const stillValid = filteredServices.some(
      (svc) => svc.name === service.name && svc.code === service.code,
    );
    if (!stillValid && (service.name || service.code)) {
      update({ name: "", code: "" });
    }
  }, [selectedType, filteredServices, service.name, service.code, update, loadingServices, offeredServices.length]);

  return (
    <>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-normal text-[#10141a]">
          Service Type
        </label>
        <Select
          value={selectedType}
          onValueChange={(v) => setSelectedType(v)}
          disabled={loadingServices || serviceTypes.length === 0}
        >
          <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
            <SelectValue
              placeholder={
                loadingServices
                  ? "Loading service types..."
                  : serviceTypes.length === 0
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
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-normal text-[#10141a]">
          Service
        </label>
        <Select
          value={service.name}
          onValueChange={(v) => {
            const selectedService = filteredServices.find((s) => s.name === v);
            update({ name: v, code: selectedService?.code || "" });
          }}
          disabled={
            loadingServices ||
            !selectedType ||
            filteredServices.length === 0
          }
        >
          <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
            <SelectValue
              placeholder={
                loadingServices
                  ? "Loading services..."
                  : !selectedType
                  ? "Select service type first"
                  : filteredServices.length === 0
                  ? "No services available for this type"
                  : "Select service"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {filteredServices.map((svc) => (
              <SelectItem key={svc.id} value={svc.name}>
                {svc.name} - {svc.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-normal text-[#10141a]">
          Authorized hours per week
        </label>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={service.hours}
          onChange={(e) => update({ hours: e.target.value })}
          className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
          placeholder="Enter hours"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-normal text-[#10141a]">
          Total approved hours
        </label>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={service.totalApprovedHours}
          onChange={(e) => update({ totalApprovedHours: e.target.value })}
          className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
          placeholder="Enter total approved hours"
        />
      </div>

      <RatePayTypeField
        label="Client Rate / Pay Type"
        rate={service.clientRate ?? ""}
        payType={service.clientPayType}
        includeMile
        onRateChange={(v) => update({ clientRate: v })}
        onPayTypeChange={(v) => update({ clientPayType: v })}
      />
      
      <RatePayTypeField
        label="Staff Rate / Pay Type"
        rate={service.rate ?? ""}
        payType={service.payType}
        includeMile
        onRateChange={(v) => update({ rate: v })}
        onPayTypeChange={(v) => update({ payType: v })}
      />

      

      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-normal text-[#10141a]">
          ISP Effective Date
        </label>
        <Popover open={isIspOpen} onOpenChange={setIsIspOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="w-full focus:outline-none">
              <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
                <InputGroupInput
                  value={
                    service.ispEffectiveDate
                      ? format(service.ispEffectiveDate, "MMM d, yyyy")
                      : ""
                  }
                  placeholder=" "
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
              selected={service.ispEffectiveDate}
              defaultMonth={service.ispEffectiveDate ?? new Date()}
              captionLayout="dropdown"
              fromYear={2000}
              toYear={new Date().getFullYear() + 10}
              formatters={{
                formatMonthDropdown: (date) =>
                  date.toLocaleString("default", { month: "long" }),
              }}
              classNames={{
                dropdown_root: "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
              }}
              onSelect={(d) => {
                if (d) {
                  update({ ispEffectiveDate: d });
                  setIsIspOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-normal text-[#10141a]">
          Start Date of Authorization
        </label>
        <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="w-full focus:outline-none">
              <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
                <InputGroupInput
                  value={service.startAuthDate ? format(service.startAuthDate, "MMM d, yyyy") : ""}
                  placeholder=" "
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
              selected={service.startAuthDate}
              defaultMonth={service.startAuthDate ?? new Date()}
              captionLayout="dropdown"
              fromYear={2000}
              toYear={new Date().getFullYear() + 10}
              formatters={{
                formatMonthDropdown: (date) =>
                  date.toLocaleString("default", { month: "long" }),
              }}
              classNames={{
                dropdown_root: "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
              }}
              onSelect={(d) => {
                if (d) {
                  update({ startAuthDate: d });
                  setIsStartOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-normal text-[#10141a]">
          End Date of Authorization
        </label>
        <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="w-full focus:outline-none">
              <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
                <InputGroupInput
                  value={service.endAuthDate ? format(service.endAuthDate, "MMM d, yyyy") : ""}
                  placeholder=" "
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
              selected={service.endAuthDate}
              defaultMonth={service.endAuthDate ?? new Date()}
              captionLayout="dropdown"
              fromYear={2000}
              toYear={new Date().getFullYear() + 10}
              formatters={{
                formatMonthDropdown: (date) =>
                  date.toLocaleString("default", { month: "long" }),
              }}
              classNames={{
                dropdown_root: "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
              }}
              onSelect={(d) => {
                if (d) {
                  update({ endAuthDate: d });
                  setIsEndOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-normal text-[#10141a]">PCPT Date</label>
        <Popover open={isPcptOpen} onOpenChange={setIsPcptOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="w-full focus:outline-none">
              <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
                <InputGroupInput
                  value={service.pcptDate ? format(service.pcptDate, "MMM d, yyyy") : ""}
                  placeholder=" "
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
              selected={service.pcptDate}
              defaultMonth={service.pcptDate ?? new Date()}
              captionLayout="dropdown"
              fromYear={2000}
              toYear={new Date().getFullYear() + 10}
              formatters={{
                formatMonthDropdown: (date) =>
                  date.toLocaleString("default", { month: "long" }),
              }}
              classNames={{
                dropdown_root: "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
              }}
              onSelect={(d) => {
                if (d) {
                  update({ pcptDate: d });
                  setIsPcptOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-normal text-[#10141a]">
          SDR Start Date
        </label>
        <Popover open={isSdrStartOpen} onOpenChange={setIsSdrStartOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="w-full focus:outline-none">
              <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
                <InputGroupInput
                  value={
                    service.sdrStartDate
                      ? format(service.sdrStartDate, "MMM d, yyyy")
                      : ""
                  }
                  placeholder=" "
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
              selected={service.sdrStartDate}
              defaultMonth={service.sdrStartDate ?? new Date()}
              captionLayout="dropdown"
              fromYear={2000}
              toYear={new Date().getFullYear() + 10}
              formatters={{
                formatMonthDropdown: (date) =>
                  date.toLocaleString("default", { month: "long" }),
              }}
              classNames={{
                dropdown_root: "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
              }}
              onSelect={(d) => {
                if (d) {
                  update({ sdrStartDate: d });
                  setIsSdrStartOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-normal text-[#10141a]">
          SDR End Date
        </label>
        <Popover open={isSdrEndOpen} onOpenChange={setIsSdrEndOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="w-full focus:outline-none">
              <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
                <InputGroupInput
                  value={
                    service.sdrEndDate
                      ? format(service.sdrEndDate, "MMM d, yyyy")
                      : ""
                  }
                  placeholder=" "
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
              selected={service.sdrEndDate}
              defaultMonth={service.sdrEndDate ?? new Date()}
              captionLayout="dropdown"
              fromYear={2000}
              toYear={new Date().getFullYear() + 10}
              formatters={{
                formatMonthDropdown: (date) =>
                  date.toLocaleString("default", { month: "long" }),
              }}
              classNames={{
                dropdown_root: "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
              }}
              onSelect={(d) => {
                if (d) {
                  update({ sdrEndDate: d });
                  setIsSdrEndOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
    <ServicePerServiceStaffOnly service={service} update={update} />
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
  const updateStage2 = useCallback(
    (patch: Partial<AddClientFormData["stage2"]>) =>
      setFormData((prev) => ({ ...prev, stage2: { ...prev.stage2, ...patch } })),
    []
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
            <div key={gi}>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
                  Guardian {gi + 1}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  className={SECTION_SUBROW_ACTION_BTN}
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
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed border-[#808081] text-[#10141a] sm:w-auto"
            onClick={() =>
              updateStage2({
                guardians: [
                  ...(stage2.guardians ?? []),
                  {
                    name: "",
                    email: "",
                    primaryPhone: "",
                    address: "",
                    supportCoordinatorName: "",
                    supportCoordinatorAgency: "",
                    supportCoordinatorContact: "",
                  },
                ],
              })
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            Add guardian
          </Button>
        </div>

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
              className="mb-4 rounded-[12px] border border-[#cccccd]/80 bg-white/50 p-4"
            >
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
                  Care team contact {ci + 1}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  className={SECTION_SUBROW_ACTION_BTN}
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

      <div className="mb-10">
        <div className="mb-4">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            4. Outcomes &amp; service authorizations
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            Each ISP outcome owns one or more service authorization rows (billing and scheduling). Add Dsps per service row.
          </p>
        </div>

        <div className="mt-6 space-y-10">
          {outcomes.map((outcome, oidx) => (
            <div key={outcome.id} className={oidx === 0 ? "" : "pt-6 border-t border-[#cccccd]/60"}>
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
                {outcomes.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className={SECTION_SUBROW_ACTION_BTN}
                    onClick={() =>
                      updateStage2({
                        outcomes: stage2.outcomes.filter((o) => o.id !== outcome.id),
                      })
                    }
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove outcome
                  </Button>
                ) : null}
              </div>

              {outcome.services.map((service, sidx) => (
                <div key={service.id} className={sidx === 0 ? "" : "pt-6 mt-6 border-t border-[#cccccd]/40"}>
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
                      Service authorization {sidx + 1}
                    </p>
                    {outcome.services.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className={SECTION_SUBROW_ACTION_BTN}
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
                    ) : null}
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

      {footer}
    </div>
  );
}
