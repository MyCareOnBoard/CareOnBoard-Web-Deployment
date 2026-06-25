import { useCallback, useEffect, useMemo, useRef, useState, ChangeEvent } from "react";
import { useForm, useFormState, useWatch } from "react-hook-form";
import { AlertCircle, Info, Upload } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Agency,
  getAgencyById,
  updateAgency,
  UpdateAgencyProfileRequest,
  uploadAgencyFile,
} from "@/lib/api/agencies";
import { useGooglePlacesAutocomplete } from "@/hooks/useGooglePlacesAutocomplete";
import { useAuth } from "@/utils/auth";
import { UserType } from "@/utils/auth/types";
import SettingsFormFieldRow from "./SettingsFormFieldRow";
import SettingsTabActions from "./SettingsTabActions";
import SettingsTabSkeleton from "./SettingsTabSkeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  settingsAlertErrorClass,
  settingsAlertInfoClass,
  settingsCardShellClass,
  settingsCardSubtitleClass,
} from "./settingsCardStyles";
import {
  AGENCY_LOGO_ACCEPT,
  createBrandingPreview,
  isAllowedLogoMime,
  isLetterheadImagePreviewUrl,
  resolveBrandingPreviewSrc,
  revokeBrandingPreview,
} from "./branding-utils";
import OperationalSettingsFields from "@/pages/shared/agency/OperationalSettingsFields";
import {
  agencyOperationalToForm,
  OPERATIONAL_FIELD_KEYS,
  pickOperationalFormValues,
  type OperationalFormSlice,
} from "@/lib/agency/operational-settings";
import {
  buildAgencyProfileUpdatePayload,
  type AgencyProfileFormValues,
} from "@/lib/agency/agency-profile-payload";

export type { AgencyProfileFormValues };

const PREDEFINED_COLORS = ["#D53411", "#D5B111", "#0EAF52", "#115CD5", "#11CBD5"];

const EMPTY_VALUES: AgencyProfileFormValues = {
  name: "",
  legalBusinessName: "",
  dba: "",
  agencyType: "",
  ein: "",
  npi: "",
  providerId: "",
  medicaidProviderId: "",
  email: "",
  phone: "",
  address: "",
  county: "",
  city: "",
  state: "",
  zipCode: "",
  website: "",
  primaryColor: "#11CBD5",
  billingFormat: "",
  invoiceName: "",
  invoiceEmail: "",
  payrollScheduleFrequency: "biweekly",
  payrollScheduleNextPayoutDate: "",
  ...pickOperationalFormValues({}),
};

function agencyToFormValues(agency: Agency): AgencyProfileFormValues {
  return {
    name: agency.name ?? "",
    legalBusinessName: agency.legalBusinessName ?? "",
    dba: agency.dba ?? "",
    agencyType: agency.agencyType ?? "",
    ein: agency.ein ?? "",
    npi: agency.npi ?? "",
    providerId: agency.providerId ?? "",
    medicaidProviderId: agency.medicaidProviderId ?? "",
    email: agency.email ?? "",
    phone: agency.phone ?? "",
    address: agency.address ?? "",
    county: agency.county ?? "",
    city: agency.city ?? "",
    state: agency.state ?? "",
    zipCode: agency.zipCode ?? "",
    website: agency.website ?? "",
    primaryColor: agency.primaryColor ?? "#11CBD5",
    billingFormat: agency.billingFormat ?? "",
    invoiceName: agency.invoiceName ?? "",
    invoiceEmail: agency.invoiceEmail ?? "",
    payrollScheduleFrequency: agency.payrollSchedule?.frequency ?? "biweekly",
    payrollScheduleNextPayoutDate: agency.payrollSchedule?.nextPayoutDate ?? "",
    ...agencyOperationalToForm(agency),
  };
}

export default function AgencyInfoTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const agencyId = user?.agencyId || "";
  const readOnly = user?.userType === UserType.AGENCY_STAFF;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [initialValues, setInitialValues] = useState<AgencyProfileFormValues>(EMPTY_VALUES);
  const [initialLogo, setInitialLogo] = useState("");
  const [initialLetterhead, setInitialLetterhead] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [letterheadPreview, setLetterheadPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [letterheadFile, setLetterheadFile] = useState<File | null>(null);
  const [addressFocused, setAddressFocused] = useState(false);
  const [supportedClientTypes, setSupportedClientTypes] = useState<string[] | null>(null);

  const addressInputRef = useRef<HTMLDivElement>(null);
  const {
    suggestions,
    isSearching,
    showSuggestions,
    setShowSuggestions,
    handleInputChange,
    selectSuggestion,
  } = useGooglePlacesAutocomplete();

  const form = useForm<AgencyProfileFormValues>({
    mode: "onChange",
    defaultValues: EMPTY_VALUES,
  });

  const { isDirty } = useFormState({ control: form.control });
  const primaryColor = useWatch({ control: form.control, name: "primaryColor" });
  const watchedOperational = useWatch({
    control: form.control,
    name: OPERATIONAL_FIELD_KEYS,
  });
  const operationalValues = useMemo(() => {
    if (!Array.isArray(watchedOperational)) {
      return pickOperationalFormValues(undefined);
    }
    const partial = Object.fromEntries(
      OPERATIONAL_FIELD_KEYS.map((key, index) => [key, watchedOperational[index]]),
    ) as Partial<OperationalFormSlice>;
    return pickOperationalFormValues(partial);
  }, [watchedOperational]);
  const hasChanges = isDirty || !!logoFile || !!letterheadFile;

  const load = useCallback(async () => {
    if (!agencyId) {
      setError("No agency found for your account.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const agency = await getAgencyById(agencyId);
      setSupportedClientTypes(agency.supportedClientTypes ?? null);
      const values = agencyToFormValues(agency);
      setInitialValues(values);
      setInitialLogo(agency.logo || "");
      setInitialLetterhead(agency.letterhead || "");
      setLogoPreview(agency.logo || null);
      setLetterheadPreview(agency.letterhead || null);
      setLogoFile(null);
      setLetterheadFile(null);
      form.reset(values, { keepDefaultValues: false });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Couldn't load agency information. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [agencyId, form]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addressInputRef.current && !addressInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setShowSuggestions]);

  useEffect(() => {
    return () => {
      revokeBrandingPreview(logoPreview);
      revokeBrandingPreview(letterheadPreview);
    };
  }, [logoPreview, letterheadPreview]);

  const isLetterheadImagePreview = isLetterheadImagePreviewUrl(letterheadPreview);

  const handleSelectAddressSuggestion = async (placeId: string) => {
    const details = await selectSuggestion(placeId);
    if (!details) return;

    form.setValue("address", details.formattedAddress, { shouldDirty: true });
    form.setValue("city", details.city, { shouldDirty: true });
    form.setValue("state", details.state, { shouldDirty: true });
    form.setValue("county", details.county, { shouldDirty: true });
    form.setValue("zipCode", details.zipCode, { shouldDirty: true });
    setShowSuggestions(false);
  };

  const handleBrandingFileChange = (
    field: "logo" | "letterhead",
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("File must be under 5MB.");
      return;
    }

    if (field === "logo") {
      if (!isAllowedLogoMime(file.type)) {
        setError("Only JPEG, PNG, GIF, or WEBP images are allowed for the logo.");
        return;
      }
      revokeBrandingPreview(logoPreview);
      setLogoFile(file);
      setLogoPreview(createBrandingPreview(file));
      setError("");
      return;
    }

    if (file.type === "application/pdf") {
      revokeBrandingPreview(letterheadPreview);
      setLetterheadFile(file);
      setLetterheadPreview(file.name);
      setError("");
      return;
    }

    if (!isAllowedLogoMime(file.type)) {
      setError("Letterhead must be a PDF or image (JPEG, PNG, GIF, WEBP).");
      return;
    }

    revokeBrandingPreview(letterheadPreview);
    setLetterheadFile(file);
    setLetterheadPreview(createBrandingPreview(file));
    setError("");
  };

  const handleCancel = () => {
    form.reset(initialValues, { keepDefaultValues: false });
    setLogoFile(null);
    setLetterheadFile(null);
    revokeBrandingPreview(logoPreview);
    revokeBrandingPreview(letterheadPreview);
    setLogoPreview(initialLogo || null);
    setLetterheadPreview(initialLetterhead || null);
    setError("");
  };

  const applyAgencyState = (updated: Agency) => {
    const nextValues = agencyToFormValues(updated);
    setInitialValues(nextValues);
    setInitialLogo(updated.logo || "");
    setInitialLetterhead(updated.letterhead || "");
    revokeBrandingPreview(logoPreview);
    revokeBrandingPreview(letterheadPreview);
    setLogoPreview(updated.logo || null);
    setLetterheadPreview(updated.letterhead || null);
    setLogoFile(null);
    setLetterheadFile(null);
    form.reset(nextValues, { keepDefaultValues: false });
  };

  const handleSave = async (values: AgencyProfileFormValues) => {
    if (!agencyId || readOnly || !hasChanges) return;

    if (!values.name.trim()) {
      setError("Agency name is required.");
      return;
    }

    setSaving(true);
    setError("");

    const hasTextChanges = isDirty;
    const hasFileChanges = !!logoFile || !!letterheadFile;
    let updated: Agency | null = null;
    let textSaved = false;

    try {
      if (hasTextChanges) {
        const payload = buildAgencyProfileUpdatePayload(values, form.formState.dirtyFields);
        if (Object.keys(payload).length > 0) {
          updated = await updateAgency(agencyId, payload);
          textSaved = true;
        }
      }

      if (hasFileChanges) {
        try {
          const [logoResult, letterheadResult] = await Promise.all([
            logoFile ? uploadAgencyFile(agencyId, logoFile, "logo") : Promise.resolve(null),
            letterheadFile
              ? uploadAgencyFile(agencyId, letterheadFile, "letterhead")
              : Promise.resolve(null),
          ]);

          const brandingPayload: UpdateAgencyProfileRequest = {};
          if (logoResult) brandingPayload.logo = logoResult.url;
          if (letterheadResult) brandingPayload.letterhead = letterheadResult.url;

          if (Object.keys(brandingPayload).length > 0) {
            updated = await updateAgency(agencyId, brandingPayload);
          }
        } catch (uploadErr: unknown) {
          const uploadMessage =
            uploadErr instanceof Error ? uploadErr.message : "Failed to upload branding files.";

          if (textSaved && updated) {
            applyAgencyState(updated);
            setError(uploadMessage);
            toast({
              title: "Partial save",
              description: "Your text changes were saved, but branding upload failed. Please try again.",
              variant: "destructive",
            });
            return;
          }

          throw uploadErr;
        }
      }

      if (updated) {
        applyAgencyState(updated);
        toast({
          title: "Agency information updated",
          description: "Updates will appear on claims and reports that use this data.",
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save agency information.");
    } finally {
      setSaving(false);
    }
  };

  const inputClassName = "bg-white";
  const disabled = saving || readOnly;

  const handleOperationalChange = (
    field: keyof OperationalFormSlice,
    value: OperationalFormSlice[keyof OperationalFormSlice],
  ) => {
    form.setValue(field, value as AgencyProfileFormValues[typeof field], { shouldDirty: true });
  };

  if (loading) {
    return <SettingsTabSkeleton variant="accordion" cardCount={5} />;
  }

  const accordionItemClass = cn(settingsCardShellClass, "border-b-0 px-0");

  return (
    <div className="flex flex-col gap-4">
      {readOnly && (
        <div className={settingsAlertInfoClass}>
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#00b4b8]" />
          <span>
            You&apos;re viewing agency information in read-only mode. Ask your agency owner to make changes.
          </span>
        </div>
      )}

      {error && (
        <div className={settingsAlertErrorClass}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)}>
          <Accordion type="multiple" defaultValue={["identity"]} className="flex flex-col gap-4">
            <AccordionItem value="identity" className={accordionItemClass}>
              <AccordionTrigger className="px-5 py-4 sm:px-6 hover:no-underline">
                <div className="text-left">
                  <span className="text-[17px] font-semibold text-[#10141a]">Identity &amp; Registration</span>
                  <p className={cn(settingsCardSubtitleClass, "font-normal normal-case")}>
                    Legal identity, provider IDs, and registration details.
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 sm:px-6">
                <SettingsFormFieldRow
                  title={
                    <>
                      Agency Name <span className="text-red-500">*</span>
                    </>
                  }
                  description="The name shown across your agency portal."
                >
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{ required: "Agency name is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter agency name" {...field} disabled={disabled} className={inputClassName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>

                <SettingsFormFieldRow title="Legal Business Name" description="Use if different from your agency name.">
                  <FormField
                    control={form.control}
                    name="legalBusinessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter legal business name" {...field} disabled={disabled} className={inputClassName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>

                <SettingsFormFieldRow title="DBA" description="Doing Business As, if applicable.">
                  <FormField
                    control={form.control}
                    name="dba"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter DBA" {...field} disabled={disabled} className={inputClassName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>

                <SettingsFormFieldRow title="Agency Type" description="How your agency is classified.">
                  <FormField
                    control={form.control}
                    name="agencyType"
                    render={({ field }) => (
                      <FormItem>
                        <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                          <FormControl>
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Select agency type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="provider">Provider Agency</SelectItem>
                            <SelectItem value="support_coordination">Support Coordination Agency</SelectItem>
                            <SelectItem value="others">Others</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>

                {!readOnly && (
                  <>
                <SettingsFormFieldRow
                  title="EIN"
                  description="Your 9-digit Employer Identification Number (format: XX-XXXXXXX)."
                >
                  <FormField
                    control={form.control}
                    name="ein"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter EIN" {...field} disabled={disabled} className={inputClassName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>

                <SettingsFormFieldRow
                  title="NPI"
                  description="National Provider Identifier — 10 digits, no dashes."
                >
                  <FormField
                    control={form.control}
                    name="npi"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter NPI" {...field} disabled={disabled} className={inputClassName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>

                <SettingsFormFieldRow
                  title="Provider ID"
                  description="Used to prefill billing claims. Enter your state's provider or DDD identifier."
                >
                  <FormField
                    control={form.control}
                    name="providerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter provider ID" {...field} disabled={disabled} className={inputClassName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>

                <SettingsFormFieldRow
                  title="Medicaid / CDD Provider ID"
                  description="Optional. Use if your Medicaid ID differs from your general provider ID."
                >
                  <FormField
                    control={form.control}
                    name="medicaidProviderId"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter Medicaid / CDD ID" {...field} disabled={disabled} className={inputClassName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="contact" className={accordionItemClass}>
              <AccordionTrigger className="px-5 py-4 sm:px-6 hover:no-underline">
                <div className="text-left">
                  <span className="text-[17px] font-semibold text-[#10141a]">Contact &amp; Location</span>
                  <p className={cn(settingsCardSubtitleClass, "font-normal normal-case")}>
                    Email, phone, and primary business address.
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 sm:px-6">
                <SettingsFormFieldRow title="Email" description="Primary contact email for your agency.">
                  <FormField
                    control={form.control}
                    name="email"
                    rules={{ required: "Email is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="email" placeholder="Enter email" {...field} disabled={disabled} className={inputClassName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>

                <SettingsFormFieldRow title="Phone" description="Main phone number for your agency.">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} disabled={disabled} className={inputClassName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>

                <SettingsFormFieldRow title="Primary Address" description="Your agency's main business address.">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative" ref={addressInputRef}>
                            <Input
                              placeholder="Enter primary address"
                              {...field}
                              disabled={disabled}
                              className={inputClassName}
                              onFocus={() => {
                                setAddressFocused(true);
                                if (field.value.length >= 3) {
                                  handleInputChange(field.value);
                                  setShowSuggestions(true);
                                }
                              }}
                              onChange={(e) => {
                                field.onChange(e);
                                if (addressFocused) {
                                  handleInputChange(e.target.value);
                                  setShowSuggestions(true);
                                }
                              }}
                            />
                            {showSuggestions && suggestions.length > 0 && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                                {isSearching && (
                                  <div className="px-4 py-3 text-sm text-[#808081]">Searching...</div>
                                )}
                                {!isSearching &&
                                  suggestions.map((suggestion) => (
                                    <button
                                      key={suggestion.placeId}
                                      type="button"
                                      onClick={() => handleSelectAddressSuggestion(suggestion.placeId)}
                                      className="w-full px-4 py-3 text-sm text-left text-[#10141a] hover:bg-[#f8f9fa] border-b border-gray-100 last:border-b-0"
                                    >
                                      {suggestion.description}
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>

                <SettingsFormFieldRow title="County" description="County where your agency operates.">
                  <FormField
                    control={form.control}
                    name="county"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter county" {...field} disabled={disabled} className={inputClassName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>

                <SettingsFormFieldRow title="City" description="City for your primary address.">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter city" {...field} disabled={disabled} className={inputClassName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>

                <SettingsFormFieldRow title="State" description="State for your primary address.">
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter state" {...field} disabled={disabled} className={inputClassName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>

                <SettingsFormFieldRow title="Zip Code" description="Postal code for your primary address.">
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter zip code" {...field} disabled={disabled} className={inputClassName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>

                <SettingsFormFieldRow title="Website" description="Your agency website, including https://">
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} disabled={disabled} className={inputClassName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="branding" className={accordionItemClass}>
              <AccordionTrigger className="px-5 py-4 sm:px-6 hover:no-underline">
                <div className="text-left">
                  <span className="text-[17px] font-semibold text-[#10141a]">Branding</span>
                  <p className={cn(settingsCardSubtitleClass, "font-normal normal-case")}>
                    Logo, colors, and letterhead for reports.
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 sm:px-6">
                <SettingsFormFieldRow title="Logo" description="Upload your agency logo. JPG/PNG, max 5MB.">
                  <div className="space-y-3">
                    <label className="flex items-center justify-center gap-2 w-full min-h-11 px-4 py-3 bg-[#00b3ad] hover:bg-[#00a39f] text-white font-medium rounded-full transition cursor-pointer sm:w-auto sm:inline-flex">
                      <Upload className="w-4 h-4" />
                      {logoPreview ? "Change logo" : "Upload logo"}
                      <input
                        type="file"
                        accept={AGENCY_LOGO_ACCEPT}
                        className="hidden"
                        disabled={disabled}
                        onChange={(e) => handleBrandingFileChange("logo", e)}
                      />
                    </label>
                    {resolveBrandingPreviewSrc(logoPreview) && (
                      <div className="flex h-16 items-center">
                        <img
                          src={resolveBrandingPreviewSrc(logoPreview)!}
                          alt="Logo preview"
                          className="max-h-16 object-contain"
                        />
                      </div>
                    )}
                  </div>
                </SettingsFormFieldRow>

                <SettingsFormFieldRow title="Primary Color" description="Choose a brand color for your agency.">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {PREDEFINED_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          disabled={disabled}
                          onClick={() => form.setValue("primaryColor", color, { shouldDirty: true })}
                          className={`w-8 h-8 rounded-full transition-all ${
                            primaryColor === color ? "ring-2 ring-offset-2 ring-[#00b4b8]" : ""
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label={`Select color ${color}`}
                        />
                      ))}
                    </div>
                    <FormField
                      control={form.control}
                      name="primaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={field.value}
                                disabled={disabled}
                                onChange={field.onChange}
                                className="w-8 h-8 rounded-full cursor-pointer"
                              />
                              <Input {...field} disabled={disabled} className={`font-mono ${inputClassName}`} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </SettingsFormFieldRow>

                <SettingsFormFieldRow
                  title="Letterhead"
                  description="Upload letterhead for reports. JPG/PNG/PDF, max 5MB."
                >
                  <div className="space-y-3">
                    <label className="flex items-center justify-center gap-2 w-full min-h-11 px-4 py-3 border border-[#00b3ad] text-[#00b3ad] font-medium rounded-full transition cursor-pointer sm:w-auto sm:inline-flex">
                      <Upload className="w-4 h-4" />
                      {letterheadPreview ? "Change letterhead" : "Upload letterhead"}
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        disabled={disabled}
                        onChange={(e) => handleBrandingFileChange("letterhead", e)}
                      />
                    </label>
                    {isLetterheadImagePreview && resolveBrandingPreviewSrc(letterheadPreview) && (
                      <div className="flex h-16 items-center">
                        <img
                          src={resolveBrandingPreviewSrc(letterheadPreview)!}
                          alt="Letterhead preview"
                          className="max-h-16 object-contain"
                        />
                      </div>
                    )}
                    {letterheadPreview && !isLetterheadImagePreview && (
                      <p className="text-sm text-[#4f4f4f]">PDF letterhead selected.</p>
                    )}
                  </div>
                </SettingsFormFieldRow>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="operational" className={accordionItemClass}>
              <AccordionTrigger className="px-5 py-4 sm:px-6 hover:no-underline">
                <div className="text-left">
                  <span className="text-[17px] font-semibold text-[#10141a]">Operational Settings</span>
                  <p className={cn(settingsCardSubtitleClass, "font-normal normal-case")}>
                    Scheduling, mileage, notifications, and file upload rules.
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 sm:px-6">
                <SettingsFormFieldRow
                  title="Operational preferences"
                  description="Mileage rate applies to mileage reimbursement and payroll mileage pay. Other options control scheduling and uploads."
                >
                  <OperationalSettingsFields
                    values={operationalValues}
                    onChange={handleOperationalChange}
                    disabled={disabled}
                    variant="stacked"
                    showTravelTimeRate={!supportedClientTypes || supportedClientTypes.includes("hha")}
                  />
                </SettingsFormFieldRow>
              </AccordionContent>
            </AccordionItem>

            {!readOnly && (
            <AccordionItem value="billing" className={accordionItemClass}>
              <AccordionTrigger className="px-5 py-4 sm:px-6 hover:no-underline">
                <div className="text-left">
                  <span className="text-[17px] font-semibold text-[#10141a]">Billing Configuration</span>
                  <p className={cn(settingsCardSubtitleClass, "font-normal normal-case")}>
                    Billing format and invoice contact details.
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 sm:px-6">
                <SettingsFormFieldRow
                  title="Preferred Billing Agency"
                  description="Your preferred billing agency or format."
                >
                  <FormField
                    control={form.control}
                    name="billingFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter preferred billing agency" {...field} disabled={disabled} className={inputClassName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>

                <SettingsFormFieldRow
                  title="Invoice Contact Name"
                  description="Name of the person who handles billing questions."
                >
                  <FormField
                    control={form.control}
                    name="invoiceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter contact name" {...field} disabled={disabled} className={inputClassName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>

                <SettingsFormFieldRow title="Invoice Contact Email" description="Email for billing and invoice correspondence.">
                  <FormField
                    control={form.control}
                    name="invoiceEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="email" placeholder="Enter invoice email" {...field} disabled={disabled} className={inputClassName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>

                <SettingsFormFieldRow
                  title="Payroll frequency"
                  description="How often your agency runs payroll. Used for the upcoming payout date on the payroll dashboard."
                >
                  <FormField
                    control={form.control}
                    name="payrollScheduleFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                          <FormControl>
                            <SelectTrigger className={inputClassName}>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Biweekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>

                <SettingsFormFieldRow
                  title="Next payout date"
                  description="The next scheduled payroll payout date shown on your dashboard."
                >
                  <FormField
                    control={form.control}
                    name="payrollScheduleNextPayoutDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="date" {...field} disabled={disabled} className={inputClassName} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </SettingsFormFieldRow>
              </AccordionContent>
            </AccordionItem>
            )}
          </Accordion>

          {!readOnly && (
            <SettingsTabActions
              hasChanges={hasChanges}
              saving={saving}
              onCancel={handleCancel}
            />
          )}
        </form>
      </Form>
    </div>
  );
}
