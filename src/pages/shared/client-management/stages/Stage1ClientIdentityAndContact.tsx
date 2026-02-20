import React, { useEffect, useRef, useState } from "react";
import { CalendarDays, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import { UserType } from "@/utils/auth/types/user.types";
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
import { AddClientFormData } from "@/pages/shared/client-management/types/formData";
import { Agency } from "@/lib/api/clients";
import { useGooglePlacesAutocomplete } from "@/hooks/useGooglePlacesAutocomplete";

export function Stage1ClientIdentityAndContact({
  showAgencySelection = false,
  agencies = [],
  loadingAgencies = false,
  userAgencyId,
  footer,
  formData,
  setFormData,
  pageTitle = "Add client",
  backNavigate,
  clientId,
  isEditMode = false,
}: {
  showAgencySelection?: boolean;
  agencies?: Agency[];
  loadingAgencies?: boolean;
  userAgencyId?: string;
  footer: React.ReactNode;
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
  pageTitle?: string;
  backNavigate?: string;
  clientId?: string;
  isEditMode?: boolean;
}) {
  const stage1 = formData.stage1;
  const updateStage1 = (patch: Partial<AddClientFormData["stage1"]>) =>
    setFormData((prev) => ({ ...prev, stage1: { ...prev.stage1, ...patch } }));

  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.userType === UserType.SUPER_ADMIN;

  const handleBack = () => {
    if (backNavigate) {
      navigate(backNavigate);
    } else if (isEditMode && clientId) {
      // For edit mode, go to client details page
      const detailsPath = isSuperAdmin 
        ? Routes.superAdmin.clientDetails.replace(":clientId", clientId)
        : Routes.agency.clientDetails.replace(":clientId", clientId);
      navigate(detailsPath);
    } else {
      // For add mode, go to client directory
      const directoryPath = isSuperAdmin ? Routes.superAdmin.clientDirectory : Routes.agency.clients;
      navigate(directoryPath);
    }
  };

  useEffect(() => {
    if (!showAgencySelection && userAgencyId && !formData.agencyId) {
      setFormData((prev) => ({ ...prev, agencyId: userAgencyId }));
    }
  }, [showAgencySelection, userAgencyId, formData.agencyId, setFormData]);

  const [isDobOpen, setIsDobOpen] = useState(false);

  const addressInputRef = useRef<HTMLDivElement>(null);
  const secondaryAddressInputRef = useRef<HTMLDivElement>(null);

  const primaryAddress = useGooglePlacesAutocomplete();
  const secondaryAddress = useGooglePlacesAutocomplete();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addressInputRef.current && !addressInputRef.current.contains(event.target as Node)) {
        primaryAddress.setShowSuggestions(false);
      }
      if (secondaryAddressInputRef.current && !secondaryAddressInputRef.current.contains(event.target as Node)) {
        secondaryAddress.setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [primaryAddress.setShowSuggestions, secondaryAddress.setShowSuggestions]);

  const handleSelectAddressSuggestion = async (placeId: string) => {
    const details = await primaryAddress.selectSuggestion(placeId);
    if (details) {
      const countyStateValue =
        details.county && details.state
          ? `${details.county} / ${details.state}`
          : details.county || details.state;
      updateStage1({
        address: details.formattedAddress,
        location: { lat: String(details.lat), lon: String(details.lng) },
        countyState: countyStateValue,
        zipCode: details.zipCode,
      });
    }
  };

  const handleSelectSecondaryAddressSuggestion = async (placeId: string) => {
    const details = await secondaryAddress.selectSuggestion(placeId);
    if (details) {
      const countyStateValue =
        details.county && details.state
          ? `${details.county} / ${details.state}`
          : details.county || details.state;
      updateStage1({
        secondaryAddress: details.formattedAddress,
        secondaryLocation: { lat: String(details.lat), lon: String(details.lng) },
        secondaryCountyState: countyStateValue,
        secondaryZipCode: details.zipCode,
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-10 flex items-center gap-4">
        <button
          onClick={handleBack}
          className="cursor-pointer flex items-center justify-center w-10 h-10 rounded-full bg-[rgba(255,255,255,0.5)] backdrop-blur-sm border border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.7)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#10141a]" />
        </button>
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
          {pageTitle}
        </h1>
      </div>

      {showAgencySelection && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4 mb-10">
          <div className="flex flex-col gap-1">
            <label className="text-[14px] font-semibold text-[#10141a]">Agency</label>
            <p className="text-[12px] font-medium leading-[1.4] text-[#808081]">
              Select the agency for the client.
            </p>
            <Select 
              value={formData.agencyId || undefined} 
              onValueChange={(v) => setFormData((prev) => ({ ...prev, agencyId: v }))}
              disabled={loadingAgencies}
            >
              <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                <SelectValue placeholder={loadingAgencies ? "Loading agencies..." : "Select agency"} />
              </SelectTrigger>
              <SelectContent>
                {agencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

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
            <label className="text-[12px] font-normal text-[#10141a]">Tier</label>
            <Select
              value={stage1.tier}
              onValueChange={(v) => updateStage1({ tier: v })}
            >
              <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Tier A</SelectItem>
                <SelectItem value="B">Tier B</SelectItem>
                <SelectItem value="C">Tier C</SelectItem>
                <SelectItem value="D">Tier D</SelectItem>
                <SelectItem value="E">Tier E</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

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
                  updateStage1({ address: v, location: undefined });
                  primaryAddress.handleInputChange(v);
                }}
                onFocus={() => {
                  if (primaryAddress.suggestions.length > 0) {
                    primaryAddress.setShowSuggestions(true);
                  }
                }}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="Enter primary address"
              />

              {primaryAddress.showSuggestions && primaryAddress.suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-[#e5e5e6] rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                  {primaryAddress.isSearching && (
                    <div className="px-4 py-3 text-sm text-[#808081] flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-[#00b4b8] border-r-transparent" />
                      Searching...
                    </div>
                  )}
                  {!primaryAddress.isSearching &&
                    primaryAddress.suggestions.map((suggestion) => (
                      <div
                        key={suggestion.placeId}
                        onClick={() => handleSelectAddressSuggestion(suggestion.placeId)}
                        className="px-4 py-3 text-sm text-[#10141a] hover:bg-[#f8f9fa] cursor-pointer border-b border-[#e5e5e6] last:border-b-0 transition-colors"
                      >
                        <span className="line-clamp-2">
                          {suggestion.description}
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
                    updateStage1({ secondaryAddress: v, secondaryLocation: undefined });
                    secondaryAddress.handleInputChange(v);
                  }}
                  onFocus={() => {
                    if (secondaryAddress.suggestions.length > 0) {
                      secondaryAddress.setShowSuggestions(true);
                    }
                  }}
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  placeholder="Enter secondary address"
                />

                {secondaryAddress.showSuggestions && secondaryAddress.suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-[#e5e5e6] rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                    {secondaryAddress.isSearching && (
                      <div className="px-4 py-3 text-sm text-[#808081] flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-[#00b4b8] border-r-transparent" />
                        Searching...
                      </div>
                    )}
                    {!secondaryAddress.isSearching &&
                      secondaryAddress.suggestions.map((suggestion) => (
                        <div
                          key={suggestion.placeId}
                          onClick={() => handleSelectSecondaryAddressSuggestion(suggestion.placeId)}
                          className="px-4 py-3 text-sm text-[#10141a] hover:bg-[#f8f9fa] cursor-pointer border-b border-[#e5e5e6] last:border-b-0 transition-colors"
                        >
                          <span className="line-clamp-2">
                            {suggestion.description}
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
