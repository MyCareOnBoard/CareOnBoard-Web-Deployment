import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { StageFooter } from "@/pages/agency/add-client/components/StageFooter";

type ServiceAuthorization = {
  id: string;
  authorizedService?: string;
  authorizedHoursPerWeek: string;
  ratePerHour: string;
  ispEffectiveDate?: Date;
  startAuthDate?: Date;
  endAuthDate?: Date;
  pcptDate?: Date;
  sdrDate?: Date;
};

function ServiceAuthorizationFields({
  service,
  onChange,
}: {
  service: ServiceAuthorization;
  onChange: (next: ServiceAuthorization) => void;
}) {
  const [isIspOpen, setIsIspOpen] = useState(false);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);
  const [isPcptOpen, setIsPcptOpen] = useState(false);
  const [isSdrOpen, setIsSdrOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-normal text-[#10141a]">
          Authorized Service
        </label>
        <Select
          value={service.authorizedService}
          onValueChange={(v) => onChange({ ...service, authorizedService: v })}
        >
          <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
            <SelectValue placeholder="Select service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="respite">Respite</SelectItem>
            <SelectItem value="community">Community</SelectItem>
            <SelectItem value="supported-employment">Supported Employment</SelectItem>
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
          value={service.authorizedHoursPerWeek}
          onChange={(e) =>
            onChange({ ...service, authorizedHoursPerWeek: e.target.value })
          }
          className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
          placeholder="Enter hours"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-normal text-[#10141a]">Rate per hour</label>
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step={0.01}
          value={service.ratePerHour}
          onChange={(e) => onChange({ ...service, ratePerHour: e.target.value })}
          className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
          placeholder="Enter rate"
        />
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
        <label className="text-[12px] font-normal text-[#10141a]">SDR Date</label>
        <Popover open={isSdrOpen} onOpenChange={setIsSdrOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="w-full focus:outline-none">
              <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
                <InputGroupInput
                  value={service.sdrDate ? format(service.sdrDate, "MMM d, yyyy") : ""}
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
              selected={service.sdrDate}
              defaultMonth={service.sdrDate ?? new Date()}
              onSelect={(d) => {
                if (d) {
                  onChange({ ...service, sdrDate: d });
                  setIsSdrOpen(false);
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
  onCancel,
  onNext,
}: {
  onCancel: () => void;
  onNext: () => void;
}) {
  const [declared, setDeclared] = useState(false);

  // Address autocomplete (same pattern as manual shift "location" field)
  const [guardianAddress, setGuardianAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<
    Array<{
      display_name?: string;
      place_id: string;
      lat: string;
      lon: string;
    }>
  >([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const addressInputRef = useRef<HTMLDivElement>(null);
  const addressSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addressInputRef.current && !addressInputRef.current.contains(event.target as Node)) {
        setShowAddressSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (addressSearchTimeoutRef.current) {
        clearTimeout(addressSearchTimeoutRef.current);
      }
    };
  }, []);

  const handleAddressSearch = useCallback(async (query: string) => {
    if (addressSearchTimeoutRef.current) {
      clearTimeout(addressSearchTimeoutRef.current);
    }

    if (query.trim().length < 3) {
      setShowAddressSuggestions(false);
      setAddressSuggestions([]);
      return;
    }

    addressSearchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearchingAddress(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=5&addressdetails=1`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch address suggestions");
        }

        const data = await response.json();
        setAddressSuggestions(data);
        setShowAddressSuggestions(data.length > 0);
      } catch (error) {
        console.error("Failed to fetch address suggestions:", error);
        setAddressSuggestions([]);
        setShowAddressSuggestions(false);
      } finally {
        setSearchingAddress(false);
      }
    }, 500);
  }, []);

  const handleSelectAddressSuggestion = (suggestion: {
    display_name?: string;
    place_id: string;
    lat: string;
    lon: string;
  }) => {
    setGuardianAddress(suggestion.display_name || "");
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
  };
  const createEmptyService = useMemo(
    () => () => ({
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? `service-${crypto.randomUUID()}`
          : `service-${Math.random().toString(16).slice(2)}`,
      authorizedService: undefined,
      authorizedHoursPerWeek: "",
      ratePerHour: "",
      ispEffectiveDate: undefined,
      startAuthDate: undefined,
      endAuthDate: undefined,
      pcptDate: undefined,
      sdrDate: undefined,
    }),
    []
  );

  const [services, setServices] = useState<ServiceAuthorization[]>(() => [
    createEmptyService(),
  ]);

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-10">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
          Add client
        </h1>
      </div>

      {/* Section 3 */}
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
            <Input className="h-[44px] rounded-[12px] border-[#cccccd] bg-white" placeholder="Enter name" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Relationship to client
            </label>
            <Select>
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
            <Input className="h-[44px] rounded-[12px] border-[#cccccd] bg-white" placeholder="Enter email" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Phone number</label>
            <Input className="h-[44px] rounded-[12px] border-[#cccccd] bg-white" placeholder="Enter phone number" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Address (If different from client)
            </label>
            <div className="relative" ref={addressInputRef}>
              <Input
                value={guardianAddress}
                onChange={(e) => {
                  const v = e.target.value;
                  setGuardianAddress(v);
                  handleAddressSearch(v);
                }}
                onFocus={() => {
                  if (addressSuggestions.length > 0) {
                    setShowAddressSuggestions(true);
                  }
                }}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="Enter address"
              />

              {showAddressSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-[#e5e5e6] rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                  {searchingAddress && (
                    <div className="px-4 py-3 text-sm text-[#808081] flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-[#00b4b8] border-r-transparent" />
                      Searching...
                    </div>
                  )}
                  {!searchingAddress &&
                    addressSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.place_id}
                        onClick={() => handleSelectAddressSuggestion(suggestion)}
                        className="px-4 py-3 text-sm text-[#10141a] hover:bg-[#f8f9fa] cursor-pointer border-b border-[#e5e5e6] last:border-b-0 transition-colors"
                      >
                        <span className="line-clamp-2">{suggestion.display_name}</span>
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
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter Support Coordinator Name"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Support Coordinator Agency
            </label>
            <Input
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter Support Coordinator Agency"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Support Coordinator Phone/Email
            </label>
            <Input
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter phone number/email"
            />
          </div>
        </div>
      </div>

      {/* Section 4 */}
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
            onClick={() => setServices((prev) => [...prev, createEmptyService()])}
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
                      setServices((prev) => prev.filter((s) => s.id !== service.id))
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
                  setServices((prev) =>
                    prev.map((s) => (s.id === service.id ? next : s))
                  )
                }
              />
            </div>
          ))}
        </div>
      </div>

      <StageFooter
        declared={declared}
        setDeclared={setDeclared}
        onCancel={onCancel}
        onNext={onNext}
        requireDeclaration={true}
      />
    </div>
  );
}


