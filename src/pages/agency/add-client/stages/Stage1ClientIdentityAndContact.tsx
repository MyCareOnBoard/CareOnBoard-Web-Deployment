import React, { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
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
import { AddClientFormData } from "@/pages/agency/add-client/formData";

export function Stage1ClientIdentityAndContact({
  footer,
  formData,
  setFormData,
}: {
  footer: React.ReactNode;
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
}) {
  const stage1 = formData.stage1;
  const updateStage1 = (patch: Partial<AddClientFormData["stage1"]>) =>
    setFormData((prev) => ({ ...prev, stage1: { ...prev.stage1, ...patch } }));

  const [isDobOpen, setIsDobOpen] = useState(false);

  // Primary Address autocomplete (same pattern as manual shift "location" field)
  const [addressSuggestions, setAddressSuggestions] = useState<
    Array<{
      display_name?: string;
      place_id: string;
      lat: string;
      lon: string;
      address?: {
        county?: string;
        state?: string;
        postcode?: string;
        state_district?: string;
        city?: string;
        town?: string;
        village?: string;
      };
    }>
  >([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const addressInputRef = useRef<HTMLDivElement>(null);
  const addressSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Secondary Address autocomplete
  const [secondaryAddressSuggestions, setSecondaryAddressSuggestions] = useState<
    Array<{
      display_name?: string;
      place_id: string;
      lat: string;
      lon: string;
      address?: {
        county?: string;
        state?: string;
        postcode?: string;
        state_district?: string;
        city?: string;
        town?: string;
        village?: string;
      };
    }>
  >([]);
  const [showSecondaryAddressSuggestions, setShowSecondaryAddressSuggestions] = useState(false);
  const [searchingSecondaryAddress, setSearchingSecondaryAddress] = useState(false);
  const secondaryAddressInputRef = useRef<HTMLDivElement>(null);
  const secondaryAddressSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addressInputRef.current && !addressInputRef.current.contains(event.target as Node)) {
        setShowAddressSuggestions(false);
      }
      if (secondaryAddressInputRef.current && !secondaryAddressInputRef.current.contains(event.target as Node)) {
        setShowSecondaryAddressSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (addressSearchTimeoutRef.current) {
        clearTimeout(addressSearchTimeoutRef.current);
      }
      if (secondaryAddressSearchTimeoutRef.current) {
        clearTimeout(secondaryAddressSearchTimeoutRef.current);
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
    address?: {
      county?: string;
      state?: string;
      postcode?: string;
      state_district?: string;
    };
  }) => {
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);

    const county = suggestion.address?.county || suggestion.address?.state_district || "";
    const state = suggestion.address?.state || "";
    const postcode = suggestion.address?.postcode || "";

    const countyStateValue =
      county && state ? `${county} / ${state}` : county || state;

    updateStage1({
      address: suggestion.display_name || "",
      location: { lat: suggestion.lat, lon: suggestion.lon },
      countyState: countyStateValue,
      zipCode: postcode,
    });
  };

  const handleSecondaryAddressSearch = useCallback(async (query: string) => {
    if (secondaryAddressSearchTimeoutRef.current) {
      clearTimeout(secondaryAddressSearchTimeoutRef.current);
    }

    if (query.trim().length < 3) {
      setShowSecondaryAddressSuggestions(false);
      setSecondaryAddressSuggestions([]);
      return;
    }

    secondaryAddressSearchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearchingSecondaryAddress(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=5&addressdetails=1`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch address suggestions");
        }

        const data = await response.json();
        setSecondaryAddressSuggestions(data);
        setShowSecondaryAddressSuggestions(data.length > 0);
      } catch (error) {
        console.error("Failed to fetch address suggestions:", error);
        setSecondaryAddressSuggestions([]);
        setShowSecondaryAddressSuggestions(false);
      } finally {
        setSearchingSecondaryAddress(false);
      }
    }, 500);
  }, []);

  const handleSelectSecondaryAddressSuggestion = (suggestion: {
    display_name?: string;
    place_id: string;
    lat: string;
    lon: string;
    address?: {
      county?: string;
      state?: string;
      postcode?: string;
      state_district?: string;
    };
  }) => {
    setShowSecondaryAddressSuggestions(false);
    setSecondaryAddressSuggestions([]);

    const county = suggestion.address?.county || suggestion.address?.state_district || "";
    const state = suggestion.address?.state || "";
    const postcode = suggestion.address?.postcode || "";

    const countyStateValue =
      county && state ? `${county} / ${state}` : county || state;

    updateStage1({
      secondaryAddress: suggestion.display_name || "",
      secondaryLocation: { lat: suggestion.lat, lon: suggestion.lon },
      secondaryCountyState: countyStateValue,
      secondaryZipCode: postcode,
    });
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-10">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
          Add client
        </h1>
      </div>

      {/* 1. Client Identity Information */}
      <div className="mb-10">
        <div className="mb-2">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            1. Client Identity Information
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            These fields uniquely identify the agency in the system.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Client First Name</label>
            <Input
              value={stage1.firstName}
              onChange={(e) => updateStage1({ firstName: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter first name"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Client Last Name</label>
            <Input
              value={stage1.lastName}
              onChange={(e) => updateStage1({ lastName: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter last name"
            />
          </div>

          <div className="flex flex-col gap-1 lg:col-span-1 xl:col-span-1">
            <label className="text-[12px] font-normal text-[#10141a]">Middle Name (optional)</label>
            <Input
              value={stage1.middleName}
              onChange={(e) => updateStage1({ middleName: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter middle name"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Gender</label>
            <Select value={stage1.gender} onValueChange={(v) => updateStage1({ gender: v })}>
              <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                <SelectValue placeholder="Select gender type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="non-binary">Non-binary</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Date of birth</label>
            <Popover open={isDobOpen} onOpenChange={setIsDobOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="w-full focus:outline-none">
                  <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
                    <InputGroupInput
                      value={stage1.dob ? format(stage1.dob, "MMM d, yyyy") : ""}
                      placeholder="Enter DOB"
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
                  selected={stage1.dob}
                  defaultMonth={stage1.dob ?? new Date()}
                  captionLayout="dropdown"
                  fromYear={1900}
                  toYear={new Date().getFullYear()}
                  formatters={{
                    formatMonthDropdown: (date) =>
                      date.toLocaleString("default", { month: "long" }),
                  }}
                  classNames={{
                    dropdown_root: "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
                  }}
                  onSelect={(d) => {
                    if (d) {
                      updateStage1({ dob: d });
                      setIsDobOpen(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Client Medicaid ID</label>
            <Input
              value={stage1.medicaidId}
              onChange={(e) => updateStage1({ medicaidId: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter Medicaid ID"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Client DDD ID</label>
            <Input
              value={stage1.dddId}
              onChange={(e) => updateStage1({ dddId: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter DDD ID"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Social Security Card number</label>
            <Input
              value={stage1.ssn}
              onChange={(e) => updateStage1({ ssn: e.target.value })}
              inputMode="numeric"
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter social security card"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Nursing Level (optional)</label>
            <Select
              value={stage1.nursingLevel}
              onValueChange={(v) => updateStage1({ nursingLevel: v })}
            >
              <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="level-1">Level 1</SelectItem>
                <SelectItem value="level-2">Level 2</SelectItem>
                <SelectItem value="level-3">Level 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 2. Contact Information */}
      <div className="mb-10">
        <div className="mb-2">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            2. Contact Information
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            Used for communication, verification, and notifications.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Primary Address</label>
            <div className="relative" ref={addressInputRef}>
              <Input
                value={stage1.address}
                onChange={(e) => {
                  const v = e.target.value;
                  // If user edits after selecting a suggestion, clear coordinates until re-selected.
                  updateStage1({ address: v, location: undefined });
                  handleAddressSearch(v);
                }}
                onFocus={() => {
                  if (addressSuggestions.length > 0) {
                    setShowAddressSuggestions(true);
                  }
                }}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="Enter primary address"
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
                        <span className="line-clamp-2">
                          {suggestion.display_name}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Primary County / State</label>
            <Input
              value={stage1.countyState}
              onChange={(e) => updateStage1({ countyState: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter County / State"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Primary Zip Code</label>
            <Input
              value={stage1.zipCode}
              onChange={(e) => updateStage1({ zipCode: e.target.value })}
              inputMode="numeric"
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter Zip Code"
            />
          </div>
        </div>

        {/* Secondary Address Section */}
        <div className="mt-6 mb-6">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a] mb-4">
            Secondary Address (Optional)
          </p>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Secondary Address</label>
              <div className="relative" ref={secondaryAddressInputRef}>
                <Input
                  value={stage1.secondaryAddress}
                  onChange={(e) => {
                    const v = e.target.value;
                    // If user edits after selecting a suggestion, clear coordinates until re-selected.
                    updateStage1({ secondaryAddress: v, secondaryLocation: undefined });
                    handleSecondaryAddressSearch(v);
                  }}
                  onFocus={() => {
                    if (secondaryAddressSuggestions.length > 0) {
                      setShowSecondaryAddressSuggestions(true);
                    }
                  }}
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  placeholder="Enter secondary address"
                />

                {showSecondaryAddressSuggestions && secondaryAddressSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-[#e5e5e6] rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                    {searchingSecondaryAddress && (
                      <div className="px-4 py-3 text-sm text-[#808081] flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-[#00b4b8] border-r-transparent" />
                        Searching...
                      </div>
                    )}
                    {!searchingSecondaryAddress &&
                      secondaryAddressSuggestions.map((suggestion) => (
                        <div
                          key={suggestion.place_id}
                          onClick={() => handleSelectSecondaryAddressSuggestion(suggestion)}
                          className="px-4 py-3 text-sm text-[#10141a] hover:bg-[#f8f9fa] cursor-pointer border-b border-[#e5e5e6] last:border-b-0 transition-colors"
                        >
                          <span className="line-clamp-2">
                            {suggestion.display_name}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Secondary County / State</label>
              <Input
                value={stage1.secondaryCountyState}
                onChange={(e) => updateStage1({ secondaryCountyState: e.target.value })}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="Enter County / State"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Secondary Zip Code</label>
              <Input
                value={stage1.secondaryZipCode}
                onChange={(e) => updateStage1({ secondaryZipCode: e.target.value })}
                inputMode="numeric"
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="Enter Zip Code"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Phone Number</label>
            <Input
              value={stage1.phone}
              onChange={(e) => updateStage1({ phone: e.target.value })}
              inputMode="numeric"
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter phone number"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Email</label>
            <Input
              type="email"
              value={stage1.email}
              onChange={(e) => updateStage1({ email: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter email"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Language preference</label>
            <Select value={stage1.language} onValueChange={(v) => updateStage1({ language: v })}>
              <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="spanish">Spanish</SelectItem>
                <SelectItem value="french">French</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Preferred communication method</label>
            <Select
              value={stage1.communicationMethod}
              onValueChange={(v) => updateStage1({ communicationMethod: v })}
            >
              <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {footer}
    </div>
  );
}


