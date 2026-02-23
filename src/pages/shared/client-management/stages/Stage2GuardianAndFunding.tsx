import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { AddClientFormData, Service } from "@/pages/shared/client-management/types/formData";
import { listServices, useListServicesQuery, type Service as ApiService } from "@/lib/api/services";
import { useGooglePlacesAutocomplete } from "@/hooks/useGooglePlacesAutocomplete";

function ServiceAuthorizationFields({
  service,
  onChange,
}: {
  service: Service;
  onChange: (next: Service) => void;
}) {
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
      onChange({ ...service, name: "", code: "" });
    }
  }, [selectedType, filteredServices, service.name, service.code, onChange, loadingServices, offeredServices.length]);

  return (
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
            onChange({ ...service, name: v, code: selectedService?.code || "" });
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
          onChange={(e) =>
            onChange({ ...service, hours: e.target.value })
          }
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
          onChange={(e) =>
            onChange({ ...service, totalApprovedHours: e.target.value })
          }
          className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
          placeholder="Enter total approved hours"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-normal text-[#10141a]">
          Staff Rate / Pay Type
        </label>
        <div className="flex gap-2">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.01}
            value={service.rate}
            onChange={(e) => onChange({ ...service, rate: e.target.value })}
            className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
            placeholder="Enter rate"
          />
          <Select
            value={service.payType}
            onValueChange={(v) => onChange({ ...service, payType: v as any })}
          >
            <SelectTrigger className="w-[180px] h-[44px] rounded-[12px] border-[#cccccd] bg-white">
              <SelectValue placeholder="Pay type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="15-min">15 minutes</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

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
                  onChange({ ...service, ispEffectiveDate: d });
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
                  onChange({ ...service, startAuthDate: d });
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
                  onChange({ ...service, endAuthDate: d });
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
                  onChange({ ...service, pcptDate: d });
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
                  onChange({ ...service, sdrStartDate: d });
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
                  onChange({ ...service, sdrEndDate: d });
                  setIsSdrEndOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

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
  const updateStage2 = (patch: Partial<AddClientFormData["stage2"]>) =>
    setFormData((prev) => ({ ...prev, stage2: { ...prev.stage2, ...patch } }));

  const addressInputRef = useRef<HTMLDivElement>(null);
  const guardianAddressAutocomplete = useGooglePlacesAutocomplete();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addressInputRef.current && !addressInputRef.current.contains(event.target as Node)) {
        guardianAddressAutocomplete.setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [guardianAddressAutocomplete.setShowSuggestions]);

  const handleSelectAddressSuggestion = async (placeId: string) => {
    const details = await guardianAddressAutocomplete.selectSuggestion(placeId);
    if (details) {
      updateStage2({ guardianAddress: details.formattedAddress });
    }
  };

  const createEmptyService = useMemo(
    () => () => ({
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? `service-${crypto.randomUUID()}`
          : `service-${Math.random().toString(16).slice(2)}`,
      name: undefined,
      code: undefined,
      hours: "",
      rate: "",
      ispEffectiveDate: undefined,
      startAuthDate: undefined,
      endAuthDate: undefined,
      pcptDate: undefined,
      sdrDate: undefined,
    } as Service),
    []
  );

  const services = stage2.services;

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-10">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
          {pageTitle}
        </h1>
      </div>

      <div className="mb-10">
        <div className="mb-2">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            3. Guardian / Representative Information
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            Required if the client has a guardian, parent, or support coordinator.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Guardian / Representative Name
            </label>
            <Input
              value={stage2.guardianName}
              onChange={(e) => updateStage2({ guardianName: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter name"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Relationship to client
            </label>
            <Select
              value={stage2.guardianRelationship}
              onValueChange={(v) => updateStage2({ guardianRelationship: v })}
            >
              <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="guardian">Guardian</SelectItem>
                <SelectItem value="support-coordinator">Support Coordinator</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Email</label>
            <Input
              value={stage2.guardianEmail}
              onChange={(e) => updateStage2({ guardianEmail: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter email"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Phone number</label>
            <Input
              value={stage2.guardianPhone}
              onChange={(e) => updateStage2({ guardianPhone: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter phone number"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Address (If different from client)
            </label>
            <div className="relative" ref={addressInputRef}>
              <Input
                value={stage2.guardianAddress}
                onChange={(e) => {
                  const v = e.target.value;
                  updateStage2({ guardianAddress: v });
                  guardianAddressAutocomplete.handleInputChange(v);
                }}
                onFocus={() => {
                  if (guardianAddressAutocomplete.suggestions.length > 0) {
                    guardianAddressAutocomplete.setShowSuggestions(true);
                  }
                }}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="Enter address"
              />

              {guardianAddressAutocomplete.showSuggestions && guardianAddressAutocomplete.suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-[#e5e5e6] rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                  {guardianAddressAutocomplete.isSearching && (
                    <div className="px-4 py-3 text-sm text-[#808081] flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-[#00b4b8] border-r-transparent" />
                      Searching...
                    </div>
                  )}
                  {!guardianAddressAutocomplete.isSearching &&
                    guardianAddressAutocomplete.suggestions.map((suggestion) => (
                      <div
                        key={suggestion.placeId}
                        onClick={() => handleSelectAddressSuggestion(suggestion.placeId)}
                        className="px-4 py-3 text-sm text-[#10141a] hover:bg-[#f8f9fa] cursor-pointer border-b border-[#e5e5e6] last:border-b-0 transition-colors"
                      >
                        <span className="line-clamp-2">{suggestion.description}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Support Coordinator Name
            </label>
            <Input
              value={stage2.supportCoordinatorName}
              onChange={(e) => updateStage2({ supportCoordinatorName: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter Support Coordinator Name"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Support Coordinator Agency
            </label>
            <Input
              value={stage2.supportCoordinatorAgency}
              onChange={(e) => updateStage2({ supportCoordinatorAgency: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter Support Coordinator Agency"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Support Coordinator Phone/Email
            </label>
            <Input
              value={stage2.supportCoordinatorContact}
              onChange={(e) => updateStage2({ supportCoordinatorContact: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter phone number/email"
            />
          </div>
        </div>
      </div>

      <div className="mb-10">
        <div className="mb-2 flex items-start justify-between gap-4">
          <div>
            <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
              4. Service Authorization &amp; Funding
            </p>
            <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
              Core information for billing and scheduling.
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="h-11 rounded-[60px] border border-[#b2b2b3] bg-white/40 px-5 text-[14px] font-semibold text-[#10141a] hover:bg-white/60"
            onClick={() => updateStage2({ services: [...services, createEmptyService()] })}
          >
            <Plus className="w-5 h-5 text-[#10141a]" />
            Add Service
          </Button>
        </div>

        <div className="mt-6">
          {services.map((service, idx) => (
            <div key={service.id} className={idx === 0 ? "" : "pt-6"}>
              {idx !== 0 && (
                <div className="mb-6">
                  <div className="h-px w-full bg-[#cccccd]/60" />
                </div>
              )}

              <div className="mb-3 flex items-center justify-between gap-4">
                <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
                  Service {idx + 1}
                </p>
                {services.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 rounded-[60px] px-3 text-[14px] font-semibold text-[#10141a] hover:bg-white/60"
                    onClick={() =>
                      updateStage2({ services: services.filter((s) => s.id !== service.id) })
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </Button>
                )}
              </div>

              <ServiceAuthorizationFields
                service={service}
                onChange={(next) =>
                  updateStage2({
                    services: services.map((s) => (s.id === service.id ? next : s)),
                  })
                }
              />
            </div>
          ))}
        </div>
      </div>

      {footer}
    </div>
  );
}
