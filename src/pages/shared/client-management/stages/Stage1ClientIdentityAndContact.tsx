import React, { useEffect, useState } from "react";
import { CalendarDays, ArrowLeft, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import { UserType } from "@/utils/auth/types/user.types";
import { format, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { AddClientFormData, type InsuranceDetail } from "@/pages/shared/client-management/types/formData";
import { Button } from "@/components/ui/button";
import { Agency } from "@/lib/api/clients";
import { fetchFirstPlaceDetailsForQuery, type AddressDetails } from "@/hooks/useGooglePlacesAutocomplete";
import HhaBlankFormsCard from "@/pages/shared/client-management/components/HhaBlankFormsCard";
import { AddressAutocompleteField } from "@/pages/shared/client-management/components/forms/AddressAutocompleteField";
import { DatePickerField } from "@/pages/shared/client-management/components/forms/formControls";

const SELECT_TRIGGER_CN =
  "w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white";

const SECTION_HEADER_ACTION_BTN =
  "h-11 shrink-0 rounded-[60px] border border-[#b2b2b3] bg-white/40 px-5 text-[14px] font-semibold text-[#10141a] hover:bg-white/60";

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
  headerRightAction,
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
  headerRightAction?: React.ReactNode;
}) {
  const stage1 = formData.stage1;
  const isHhaClient = formData.type === "hha";
  const updateStage1 = (patch: Partial<AddClientFormData["stage1"]>) =>
    setFormData((prev) => ({ ...prev, stage1: { ...prev.stage1, ...patch } }));
  const clearServiceLocation = (source: "primaryAddress" | "secondaryAddress") =>
    stage1.payrollServiceLocations?.filter((location) => location.source !== source);
  const clearPrimaryPayrollIdentity = (patch: Partial<AddClientFormData["stage1"]>) =>
    updateStage1({ ...patch, line1: undefined, line2: undefined, city: undefined, state: undefined, postalCode: undefined, country: undefined, payrollServiceLocations: clearServiceLocation("primaryAddress") });
  const clearSecondaryPayrollIdentity = (patch: Partial<AddClientFormData["stage1"]>) =>
    updateStage1({ ...patch, secondaryLine1: undefined, secondaryLine2: undefined, secondaryCity: undefined, secondaryState: undefined, secondaryPostalCode: undefined, secondaryCountry: undefined, payrollServiceLocations: clearServiceLocation("secondaryAddress") });
  const hasStructuredPrimaryAddress = Boolean(stage1.line1?.trim() && stage1.city?.trim() && stage1.state?.trim() && stage1.postalCode?.trim() && /^[A-Z]{2}$/.test(stage1.country?.trim() ?? ""));
  const hasStructuredSecondaryAddress = Boolean(stage1.secondaryLine1?.trim() && stage1.secondaryCity?.trim() && stage1.secondaryState?.trim() && stage1.secondaryPostalCode?.trim() && /^[A-Z]{2}$/.test(stage1.secondaryCountry?.trim() ?? ""));
  const primaryServiceLocation = stage1.payrollServiceLocations?.find((location) => location.source === "primaryAddress");
  const secondaryServiceLocation = stage1.payrollServiceLocations?.find((location) => location.source === "secondaryAddress");
  const normalizedIdentity = (value: string | null | undefined) => value?.trim().replace(/\s+/g, " ").toUpperCase() || null;
  const canonicalPrimaryDetails = (details: AddressDetails) => ({
    ...details,
    line1: details.line1.trim().replace(/\s+/g, " "), line2: details.line2?.trim().replace(/\s+/g, " ") || null,
    city: details.city.trim().replace(/\s+/g, " "), state: (details.stateCode ?? details.state).trim().toUpperCase(),
    zipCode: details.zipCode.trim().toUpperCase(), country: (details.countryCode ?? details.country).trim().toUpperCase(),
  });
  const samePrimaryIdentity = (details: { line1: string; line2: string | null; city: string; state: string; zipCode: string; country: string }, current = stage1) =>
    normalizedIdentity(current.line1) === normalizedIdentity(details.line1) && normalizedIdentity(current.line2) === normalizedIdentity(details.line2) && normalizedIdentity(current.city) === normalizedIdentity(details.city) && normalizedIdentity(current.state) === normalizedIdentity(details.state) && normalizedIdentity(current.postalCode) === normalizedIdentity(details.zipCode) && normalizedIdentity(current.country) === normalizedIdentity(details.country);
  const sameSecondaryIdentity = (details: { line1: string; line2: string | null; city: string; state: string; zipCode: string; country: string }) =>
    normalizedIdentity(stage1.secondaryLine1) === normalizedIdentity(details.line1) && normalizedIdentity(stage1.secondaryLine2) === normalizedIdentity(details.line2) && normalizedIdentity(stage1.secondaryCity) === normalizedIdentity(details.city) && normalizedIdentity(stage1.secondaryState) === normalizedIdentity(details.state) && normalizedIdentity(stage1.secondaryPostalCode) === normalizedIdentity(details.zipCode) && normalizedIdentity(stage1.secondaryCountry) === normalizedIdentity(details.country);
  const setServiceLocationAttestation = (source: "primaryAddress" | "secondaryAddress", checked: boolean) => {
    const existing = stage1.payrollServiceLocations ?? [];
    updateStage1({ payrollServiceLocations: checked
      ? [...existing.filter((location) => location.source !== source), { source, attestedActualServiceLocation: true, effectiveFrom: "" }]
      : existing.filter((location) => location.source !== source) });
  };
  const updateServiceLocationDate = (source: "primaryAddress" | "secondaryAddress", effectiveFrom: string) =>
    updateStage1({ payrollServiceLocations: (stage1.payrollServiceLocations ?? []).map((location) => location.source === source ? { ...location, effectiveFrom } : location) });
  const updateHomeInfo = (patch: Partial<NonNullable<AddClientFormData["stage1"]["homeInfo"]>>) =>
    setFormData((prev) => ({
      ...prev,
      stage1: {
        ...prev.stage1,
        homeInfo: { ...(prev.stage1.homeInfo ?? {}), ...patch },
      },
    }));
  const updateReferralInfo = (patch: Partial<NonNullable<AddClientFormData["stage1"]["referralInfo"]>>) =>
    setFormData((prev) => ({
      ...prev,
      stage1: {
        ...prev.stage1,
        referralInfo: { ...(prev.stage1.referralInfo ?? {}), ...patch },
      },
    }));

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
  const [isWaiverEnrollmentOpen, setIsWaiverEnrollmentOpen] = useState(false);
  const [isPlanPrintOpen, setIsPlanPrintOpen] = useState(false);
  const [isReferralDateOpen, setIsReferralDateOpen] = useState(false);

  useEffect(() => {
    if (!formData._pendingImportedPrimaryGeocode) return undefined;

    let cancelled = false;
    const rawQuery = String(formData.stage1.address ?? "").trim();

    if (rawQuery.length < 3) {
      setFormData((prev) => {
        if (!prev._pendingImportedPrimaryGeocode) return prev;
        const next = { ...prev };
        delete next._pendingImportedPrimaryGeocode;
        return next;
      });
      return undefined;
    }

    void (async () => {
      const details = await fetchFirstPlaceDetailsForQuery(rawQuery);
      if (cancelled) return;

      setFormData((prev) => {
        if (!prev._pendingImportedPrimaryGeocode) return prev;

        const base: AddClientFormData = { ...prev };
        delete base._pendingImportedPrimaryGeocode;

        if (String(prev.stage1.address ?? "").trim() !== rawQuery) {
          return base;
        }

        if (!details) {
          return base;
        }

        const countyStateValue =
          details.county && details.stateLong
            ? `${details.county} / ${details.stateLong}`
            : details.county || details.stateLong;

        const canonical = canonicalPrimaryDetails(details);
        return {
          ...base,
          stage1: {
            ...prev.stage1,
            address: details.formattedAddress,
            location: { lat: String(details.lat), lon: String(details.lng) },
            countyState: countyStateValue,
            zipCode: details.zipCode,
            line1: canonical.line1, line2: canonical.line2 ?? prev.stage1.line2, city: canonical.city, state: canonical.state, postalCode: canonical.zipCode, country: canonical.country,
            homeInfo: { ...(prev.stage1.homeInfo ?? {}), apartmentNumber: canonical.line2 ?? prev.stage1.line2 ?? undefined },
            ...(samePrimaryIdentity(canonical, prev.stage1) ? {} : { payrollServiceLocations: prev.stage1.payrollServiceLocations?.filter((location) => location.source !== "primaryAddress") }),
          },
        };
      });

    })();

    return () => {
      cancelled = true;
    };
  }, [
    formData._pendingImportedPrimaryGeocode,
    formData.stage1.address,
    setFormData,
  ]);
  const handlePrimaryAddressDetails = (details: AddressDetails) => {
    const canonical = canonicalPrimaryDetails(details);
    const countyStateValue = details.county && details.stateLong ? `${details.county} / ${details.stateLong}` : details.county || details.stateLong;
    updateStage1({ address: details.formattedAddress, location: { lat: String(details.lat), lon: String(details.lng) }, countyState: countyStateValue, zipCode: details.zipCode, line1: canonical.line1, line2: canonical.line2, city: canonical.city, state: canonical.state, postalCode: canonical.zipCode, country: canonical.country, homeInfo: { ...(stage1.homeInfo ?? {}), apartmentNumber: canonical.line2 ?? undefined }, payrollServiceLocations: samePrimaryIdentity(canonical) ? stage1.payrollServiceLocations : clearServiceLocation("primaryAddress") });
  };
  const handleSecondaryAddressDetails = (details: AddressDetails) => {
    const canonical = canonicalPrimaryDetails(details);
    const countyStateValue = details.county && details.stateLong ? `${details.county} / ${details.stateLong}` : details.county || details.stateLong;
    updateStage1({ secondaryAddress: details.formattedAddress, secondaryLocation: { lat: String(details.lat), lon: String(details.lng) }, secondaryCountyState: countyStateValue, secondaryZipCode: details.zipCode, secondaryLine1: canonical.line1, secondaryLine2: canonical.line2, secondaryCity: canonical.city, secondaryState: canonical.state, secondaryPostalCode: canonical.zipCode, secondaryCountry: canonical.country, payrollServiceLocations: sameSecondaryIdentity(canonical) ? stage1.payrollServiceLocations : clearServiceLocation("secondaryAddress") });
  };

  // SSN Hashing
const [showSSN, setShowSSN] =
  useState(false);

const formatSSN = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 9);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 5) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
};

const handleSSNChange = (value: string) => {
  const ssn = formatSSN(value);
  updateStage1({ ssn });
};

const handleSSNPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
  const clipboardValue = event.clipboardData.getData("text");
  const ssn = formatSSN(clipboardValue);
  updateStage1({ ssn });
  event.preventDefault();
};

const maskSSN = (value: string) => {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.length < 4) {
    return "*".repeat(digits.length);
  }

  if (digits.length < 6) {
    return `***-${"*".repeat(digits.length - 3)}`;
  }

  if (digits.length < 9) {
    return `***-**-${"*".repeat(digits.length - 5)}`;
  }

  return `***-**-${digits.slice(-4)}`;
};

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-10 flex flex-wrap items-center justify-between gap-3 gap-y-2">
        <div className="flex min-w-0 max-w-full flex-1 items-center gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="cursor-pointer flex shrink-0 items-center justify-center w-10 h-10 rounded-full bg-[rgba(255,255,255,0.5)] backdrop-blur-sm border border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.7)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#10141a]" />
          </button>
          <h1 className="min-w-0 text-[28px] font-semibold leading-[1.3] text-[#10141a] sm:text-[36px] sm:leading-[1.5] md:text-[40px] md:leading-[1.6]">
            {pageTitle}
          </h1>
        </div>
        {headerRightAction ? (
          <div className="flex w-full shrink-0 items-center justify-end sm:ml-auto sm:w-auto">
            {headerRightAction}
          </div>
        ) : null}
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
              <SelectTrigger className={SELECT_TRIGGER_CN}>
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

      {isHhaClient ? (
        <HhaBlankFormsCard formData={formData} setFormData={setFormData} />
      ) : null}

      <div className="mb-10">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
              1. Client Identity Information
            </p>
            <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
              These fields uniquely identify the client in the system.
            </p>
          </div>
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

          {isHhaClient ? (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-normal text-[#10141a]">Preferred name</label>
                <Input
                  value={stage1.preferredName ?? ""}
                  onChange={(e) => updateStage1({ preferredName: e.target.value })}
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  placeholder="Name the client prefers"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-normal text-[#10141a]">Marital status</label>
                <Select
                  value={stage1.maritalStatus || undefined}
                  onValueChange={(v) => updateStage1({ maritalStatus: v })}
                >
                  <SelectTrigger className={SELECT_TRIGGER_CN}>
                    <SelectValue placeholder="Select marital status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="separated">Separated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Gender</label>
            <Select value={stage1.gender} onValueChange={(v) => updateStage1({ gender: v })}>
              <SelectTrigger className={SELECT_TRIGGER_CN} aria-label="Gender">
                <SelectValue placeholder="Select gender type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="other">Other</SelectItem>
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

          {!isHhaClient ? (
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Client DDD ID</label>
              <Input
                value={stage1.dddId}
                onChange={(e) => updateStage1({ dddId: e.target.value })}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="Enter DDD ID"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Medicare ID</label>
              <Input
                value={stage1.medicareId ?? ""}
                onChange={(e) => updateStage1({ medicareId: e.target.value })}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder="Enter Medicare ID"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Social Security Card number</label>
            <div className="relative">
              <Input
                type="tel"
                name="ssn"
                autoComplete="off"
                spellCheck={false}
                inputMode="numeric"
                pattern="[0-9]*"
                value={stage1.ssn}
                onChange={(e) => handleSSNChange(e.target.value)}
                onPaste={handleSSNPaste}
                maxLength={11}
                className={
                  `
                    h-[44px]
                    rounded-[12px]
                    border-[#cccccd]
                    bg-white
                    pr-10
                    ${showSSN ? "" : "text-transparent caret-[#10141a]"}
                  `
                }
                style={showSSN ? undefined : { caretColor: "#10141a" }}
                placeholder="123-45-6789"
              />

              {!showSSN && stage1.ssn ? (
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#10141a]">
                  {maskSSN(stage1.ssn)}
                </span>
              ) : null}

              <button
                type="button"
                onClick={() => setShowSSN((prev) => !prev)}
                className="
                  absolute right-3 top-1/2
                  -translate-y-1/2
                  text-[#6B7280]
                  hover:text-[#10141a]
                "
              >
                {showSSN ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {!isHhaClient ? (
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Tier</label>
              <Select
                value={stage1.tier}
                onValueChange={(v) => updateStage1({ tier: v })}
              >
                <SelectTrigger className={SELECT_TRIGGER_CN}>
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
          ) : null}
        </div>
      </div>

      <div className="mb-10">
        <div className="mb-2">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            2. Contact Information
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            Used for communication and verification. Confirmed service addresses also become payroll workplaces.
          </p>
        </div>

        <p className="mb-4 text-[14px] font-semibold leading-[1.4] text-[#10141a]">
          Primary Address
        </p>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
          <div className="flex flex-col gap-1 lg:col-span-3 xl:col-span-4">
            <AddressAutocompleteField label="Primary / mailing address search" id="primary-mailing-address" value={stage1.address} required placeholder="Search for the primary address" onChange={(address) => clearPrimaryPayrollIdentity({ address, location: undefined })} onSelectDetails={handlePrimaryAddressDetails} />
            <p className="text-[12px] text-[#5d5d5f]">Select an address to fill the verified payroll address fields below.</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]" htmlFor="primary-street-address">Street address</label>
            <Input id="primary-street-address" value={stage1.line1 ?? ""} readOnly className="h-[44px] rounded-[12px] border-[#cccccd] bg-white" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]" htmlFor="primary-city">City</label>
            <Input id="primary-city" value={stage1.city ?? ""} readOnly className="h-[44px] rounded-[12px] border-[#cccccd] bg-white" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]" htmlFor="primary-state">State abbreviation</label>
            <Input id="primary-state" value={stage1.state ?? ""} readOnly className="h-[44px] rounded-[12px] border-[#cccccd] bg-white" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]" htmlFor="primary-postal-code">ZIP code</label>
            <Input id="primary-postal-code" value={stage1.postalCode ?? ""} readOnly className="h-[44px] rounded-[12px] border-[#cccccd] bg-white" />
          </div>

          <div className="flex flex-col gap-2 lg:col-span-3 xl:col-span-4">
            <Checkbox
              id="actual-service-location"
              checked={(stage1.payrollServiceLocations ?? []).some((location) => location.source === "primaryAddress")}
              disabled={!hasStructuredPrimaryAddress}
              aria-describedby={!hasStructuredPrimaryAddress ? "actual-service-location-address-help" : undefined}
              onChange={(event) => setServiceLocationAttestation("primaryAddress", event.target.checked)}
              label="I confirm services are delivered at this primary address. Use it as a Check payroll workplace."
              labelClassName="text-[13px] font-normal"
            />
            {!hasStructuredPrimaryAddress && <p id="actual-service-location-address-help" className="text-[12px] text-[#5d5d5f]">Enter a complete primary address before confirming it as a service location.</p>}
            <p className="text-[12px] text-[#5d5d5f]">Choose the first service date at this address. Later address changes will not rewrite earlier payroll records.</p>
            {primaryServiceLocation && (
              <div className="flex max-w-[260px] flex-col gap-1">
                <DatePickerField
                  id="actual-service-location-effective-from"
                  label="Primary service effective date"
                  value={primaryServiceLocation.effectiveFrom ? parseISO(primaryServiceLocation.effectiveFrom) : undefined}
                  onChange={(date) => updateServiceLocationDate("primaryAddress", date ? format(date, "yyyy-MM-dd") : "")}
                  required
                  ariaInvalid={!primaryServiceLocation.effectiveFrom}
                  ariaDescribedBy={!primaryServiceLocation.effectiveFrom ? "actual-service-location-effective-from-error" : undefined}
                />
                {!primaryServiceLocation.effectiveFrom && <p id="actual-service-location-effective-from-error" className="text-[12px] text-red-600" role="alert">Choose an effective date before saving.</p>}
              </div>
            )}
          </div>

          {isHhaClient ? (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-normal text-[#10141a]" htmlFor="primary-apartment-number">Apartment number</label>
                <Input
                  id="primary-apartment-number"
                  value={stage1.line2 ?? stage1.homeInfo?.apartmentNumber ?? ""}
                  onChange={(e) => {
                    const apartmentNumber = e.target.value;
                    const sameLine2 = normalizedIdentity(stage1.line2) === normalizedIdentity(apartmentNumber);
                    setFormData((prev) => ({
                      ...prev,
                      stage1: {
                        ...prev.stage1,
                        line2: apartmentNumber,
                        payrollServiceLocations: sameLine2
                          ? prev.stage1.payrollServiceLocations
                          : prev.stage1.payrollServiceLocations?.filter((location) => location.source !== "primaryAddress"),
                        homeInfo: { ...(prev.stage1.homeInfo ?? {}), apartmentNumber },
                      },
                    }));
                  }}
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  placeholder="Apartment, unit, or suite"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-normal text-[#10141a]">County</label>
                <Input
                  value={stage1.homeInfo?.county ?? ""}
                  onChange={(e) => updateHomeInfo({ county: e.target.value })}
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  placeholder="County"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-normal text-[#10141a]">Home type</label>
                <Select
                  value={stage1.homeInfo?.homeType || undefined}
                  onValueChange={(v) => updateHomeInfo({ homeType: v })}
                >
                  <SelectTrigger className={SELECT_TRIGGER_CN}>
                    <SelectValue placeholder="Select home type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single-family">Single-family home</SelectItem>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="assisted-living">Assisted living</SelectItem>
                    <SelectItem value="facility">Facility</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1 lg:col-span-2 xl:col-span-4">
                <label className="text-[12px] font-normal text-[#10141a]">Access instructions</label>
                <Input
                  value={stage1.homeInfo?.accessInstructions ?? ""}
                  onChange={(e) => updateHomeInfo({ accessInstructions: e.target.value })}
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  placeholder="Gate code, entry notes, parking, pets, or other arrival instructions"
                />
              </div>
            </>
          ) : null}
        </div>

        <div className="mt-6 mb-6">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a] mb-4">
            Secondary Address (Optional)
          </p>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
            <div className="flex flex-col gap-1 lg:col-span-3 xl:col-span-4">
              <AddressAutocompleteField label="Secondary address search" id="secondary-address" value={stage1.secondaryAddress} placeholder="Search for the secondary address" onChange={(secondaryAddress) => clearSecondaryPayrollIdentity({ secondaryAddress, secondaryLocation: undefined })} onSelectDetails={handleSecondaryAddressDetails} />
              <p className="text-[12px] text-[#5d5d5f]">Select an address to fill the verified payroll address fields below.</p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]" htmlFor="secondary-street-address">Street address</label>
              <Input id="secondary-street-address" value={stage1.secondaryLine1 ?? ""} readOnly className="h-[44px] rounded-[12px] border-[#cccccd] bg-white" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]" htmlFor="secondary-city">City</label>
              <Input id="secondary-city" value={stage1.secondaryCity ?? ""} readOnly className="h-[44px] rounded-[12px] border-[#cccccd] bg-white" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]" htmlFor="secondary-state">State abbreviation</label>
              <Input id="secondary-state" value={stage1.secondaryState ?? ""} readOnly className="h-[44px] rounded-[12px] border-[#cccccd] bg-white" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]" htmlFor="secondary-postal-code">ZIP code</label>
              <Input id="secondary-postal-code" value={stage1.secondaryPostalCode ?? ""} readOnly className="h-[44px] rounded-[12px] border-[#cccccd] bg-white" />
            </div>
            <div className="flex flex-col gap-2 lg:col-span-3 xl:col-span-4">
              <Checkbox
                id="actual-secondary-service-location"
                checked={(stage1.payrollServiceLocations ?? []).some((location) => location.source === "secondaryAddress")}
                disabled={!hasStructuredSecondaryAddress}
                aria-describedby={!hasStructuredSecondaryAddress ? "actual-secondary-service-location-address-help" : undefined}
                onChange={(event) => setServiceLocationAttestation("secondaryAddress", event.target.checked)}
                label="I confirm services are delivered at this secondary address. Use it as a Check payroll workplace."
                labelClassName="text-[13px] font-normal"
              />
              {!hasStructuredSecondaryAddress && <p id="actual-secondary-service-location-address-help" className="text-[12px] text-[#5d5d5f]">Enter a complete secondary address before confirming it as a service location.</p>}
              {secondaryServiceLocation && (
                <div className="mt-2 flex max-w-[260px] flex-col gap-1">
                  <DatePickerField
                    id="actual-secondary-service-location-effective-from"
                    label="Secondary service effective date"
                    value={secondaryServiceLocation.effectiveFrom ? parseISO(secondaryServiceLocation.effectiveFrom) : undefined}
                    onChange={(date) => updateServiceLocationDate("secondaryAddress", date ? format(date, "yyyy-MM-dd") : "")}
                    required
                    ariaInvalid={!secondaryServiceLocation.effectiveFrom}
                    ariaDescribedBy={!secondaryServiceLocation.effectiveFrom ? "actual-secondary-service-location-effective-from-error" : undefined}
                  />
                  {!secondaryServiceLocation.effectiveFrom && <p id="actual-secondary-service-location-effective-from-error" className="text-[12px] text-red-600" role="alert">Choose an effective date before saving.</p>}
                </div>
              )}
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
              <SelectTrigger className={SELECT_TRIGGER_CN}>
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
              <SelectTrigger className={SELECT_TRIGGER_CN}>
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

      {!isHhaClient ? (
      <>
      <div className="mb-10">
        <div className="mb-2">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            2.1 ISP plan details
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            Information taken from the approved ISP when available.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Plan ID</label>
            <Input
              value={stage1.planId ?? ""}
              onChange={(e) => updateStage1({ planId: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="e.g. authorization or plan reference"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Plan type</label>
            <Input
              value={stage1.planType ?? ""}
              onChange={(e) => updateStage1({ planType: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="e.g. annual, amendment"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Program</label>
            <Input
              value={stage1.program ?? ""}
              onChange={(e) => updateStage1({ program: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Program or waiver name"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">DDD status</label>
            <Input
              value={stage1.dddStatus ?? ""}
              onChange={(e) => updateStage1({ dddStatus: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="As listed on ISP"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Medicaid type</label>
            <Input
              value={stage1.medicaidType ?? ""}
              onChange={(e) => updateStage1({ medicaidType: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="e.g. MCO, FFS"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Waiver enrollment date</label>
            <Popover open={isWaiverEnrollmentOpen} onOpenChange={setIsWaiverEnrollmentOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="w-full focus:outline-none">
                  <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
                    <InputGroupInput
                      value={
                        stage1.waiverEnrollmentDate
                          ? format(stage1.waiverEnrollmentDate, "MMM d, yyyy")
                          : ""
                      }
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
              <PopoverContent align="start" className="mt-3 w-auto border-none bg-white p-0 shadow-lg">
                <Calendar
                  mode="single"
                  selected={stage1.waiverEnrollmentDate}
                  defaultMonth={stage1.waiverEnrollmentDate ?? new Date()}
                  captionLayout="dropdown"
                  fromYear={1990}
                  toYear={new Date().getFullYear() + 5}
                  formatters={{
                    formatMonthDropdown: (date) =>
                      date.toLocaleString("default", { month: "long" }),
                  }}
                  classNames={{
                    dropdown_root:
                      "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
                  }}
                  onSelect={(d) => {
                    if (d) {
                      updateStage1({ waiverEnrollmentDate: d });
                      setIsWaiverEnrollmentOpen(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Plan print date</label>
            <Popover open={isPlanPrintOpen} onOpenChange={setIsPlanPrintOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="w-full focus:outline-none">
                  <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
                    <InputGroupInput
                      value={
                        stage1.planPrintDate ? format(stage1.planPrintDate, "MMM d, yyyy") : ""
                      }
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
              <PopoverContent align="start" className="mt-3 w-auto border-none bg-white p-0 shadow-lg">
                <Calendar
                  mode="single"
                  selected={stage1.planPrintDate}
                  defaultMonth={stage1.planPrintDate ?? new Date()}
                  captionLayout="dropdown"
                  fromYear={1990}
                  toYear={new Date().getFullYear() + 5}
                  formatters={{
                    formatMonthDropdown: (date) =>
                      date.toLocaleString("default", { month: "long" }),
                  }}
                  classNames={{
                    dropdown_root:
                      "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
                  }}
                  onSelect={(d) => {
                    if (d) {
                      updateStage1({ planPrintDate: d });
                      setIsPlanPrintOpen(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="mb-10">
        <div className="mb-4">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            2.2 Insurance details
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            Add each payer or coverage row from the ISP (MCO, ASO, private, etc.).
          </p>
        </div>

        <div className="space-y-4">
          {(stage1.insuranceDetails ?? []).length === 0 ? (
            <p className="text-[14px] text-[#808081]">No insurance plans added yet.</p>
          ) : null}

          {(stage1.insuranceDetails ?? []).map((row, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-3 rounded-[12px] border border-[#e5e5e6] bg-white/60 p-4 lg:flex-row lg:flex-wrap lg:items-end"
            >
              {(
                [
                  ["type", "Plan type", "e.g. MCO, Commercial"] as const,
                  ["name", "Plan name", "Insurance name"] as const,
                  ["idGroup", "Member / group ID", "ID or group number"] as const,
                  ["caseManager", "Case manager", "Name"] as const,
                  ["contact", "Contact", "Phone or email"] as const,
                ] as const
              ).map(([key, label, ph]) => (
                <div key={key} className="flex min-w-[160px] flex-1 flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">{label}</label>
                  <Input
                    value={(row[key as keyof InsuranceDetail] as string) ?? ""}
                    onChange={(e) => {
                      const next = [...(stage1.insuranceDetails ?? [])];
                      next[idx] = { ...next[idx], [key]: e.target.value };
                      updateStage1({ insuranceDetails: next });
                    }}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                    placeholder={ph}
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-[44px] w-[44px] shrink-0 border-[#cccccd]"
                aria-label="Remove insurance plan"
                onClick={() => {
                  updateStage1({
                    insuranceDetails: (stage1.insuranceDetails ?? []).filter((_, i) => i !== idx),
                  });
                }}
              >
                <Trash2 className="h-4 w-4 text-[#10141a]" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed border-[#808081] text-[#10141a] sm:w-auto"
            onClick={() =>
              updateStage1({
                insuranceDetails: [
                  ...(stage1.insuranceDetails ?? []),
                  { type: "", name: "", idGroup: "", caseManager: "", contact: "" },
                ],
              })
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            Add insurance plan
          </Button>
        </div>
      </div>
      </>
      ) : (
      <div className="mb-10">
        <div className="mb-2">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            2.1 Referral information
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            Capture where the HHA intake request came from and who to contact if details are missing.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Referral source</label>
            <Input
              value={stage1.referralInfo?.source ?? ""}
              onChange={(e) => updateReferralInfo({ source: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Hospital, MCO, family, physician, or other source"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Referral date</label>
            <Popover open={isReferralDateOpen} onOpenChange={setIsReferralDateOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="w-full focus:outline-none">
                  <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
                    <InputGroupInput
                      value={stage1.referralInfo?.date ? format(stage1.referralInfo.date, "MMM d, yyyy") : ""}
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
              <PopoverContent align="start" className="mt-3 w-auto border-none bg-white p-0 shadow-lg">
                <Calendar
                  mode="single"
                  selected={stage1.referralInfo?.date}
                  defaultMonth={stage1.referralInfo?.date ?? new Date()}
                  captionLayout="dropdown"
                  fromYear={2000}
                  toYear={new Date().getFullYear() + 5}
                  onSelect={(d) => {
                    if (d) {
                      updateReferralInfo({ date: d });
                      setIsReferralDateOpen(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Referring organization</label>
            <Input
              value={stage1.referralInfo?.organization ?? ""}
              onChange={(e) => updateReferralInfo({ organization: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Organization name"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Contact person</label>
            <Input
              value={stage1.referralInfo?.contactPerson ?? ""}
              onChange={(e) => updateReferralInfo({ contactPerson: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Referral contact"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Contact number</label>
            <Input
              value={stage1.referralInfo?.contactNumber ?? ""}
              onChange={(e) => updateReferralInfo({ contactNumber: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Phone number"
            />
          </div>
        </div>
      </div>
      )}

      {footer}
    </div>
  );
}
