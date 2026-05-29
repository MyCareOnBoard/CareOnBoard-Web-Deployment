import { useCallback, useEffect, useRef, useState, ChangeEvent } from "react";
import { useForm, useFormState, useWatch } from "react-hook-form";
import { AlertCircle, Info, Loader2, Upload } from "lucide-react";
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
import SettingsSectionRow from "./SettingsSectionRow";
import SettingsTabActions from "./SettingsTabActions";
import SuccessModal from "./SuccessModal";

const PREDEFINED_COLORS = ["#D53411", "#D5B111", "#0EAF52", "#115CD5", "#11CBD5"];

export type AgencyProfileFormValues = {
  name: string;
  legalBusinessName: string;
  dba: string;
  agencyType: string;
  ein: string;
  npi: string;
  providerId: string;
  medicaidProviderId: string;
  email: string;
  phone: string;
  address: string;
  county: string;
  city: string;
  state: string;
  zipCode: string;
  website: string;
  primaryColor: string;
  billingFormat: string;
  invoiceName: string;
  invoiceEmail: string;
};

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
  };
}

function formValuesToUpdatePayload(values: AgencyProfileFormValues): UpdateAgencyProfileRequest {
  const trim = (value: string) => value.trim();
  const nullable = (value: string) => {
    const trimmed = trim(value);
    return trimmed === "" ? null : trimmed;
  };

  return {
    name: trim(values.name),
    legalBusinessName: nullable(values.legalBusinessName),
    dba: nullable(values.dba),
    agencyType: nullable(values.agencyType),
    ein: nullable(values.ein),
    npi: nullable(values.npi),
    providerId: nullable(values.providerId),
    medicaidProviderId: nullable(values.medicaidProviderId),
    email: trim(values.email),
    phone: nullable(values.phone),
    address: nullable(values.address),
    county: nullable(values.county),
    city: nullable(values.city),
    state: nullable(values.state),
    zipCode: nullable(values.zipCode),
    website: nullable(values.website),
    primaryColor: nullable(values.primaryColor),
    billingFormat: nullable(values.billingFormat),
    invoiceName: nullable(values.invoiceName),
    invoiceEmail: nullable(values.invoiceEmail),
  };
}

interface AgencyInfoTabProps {
  onSaved?: () => void;
}

export default function AgencyInfoTab({ onSaved }: AgencyInfoTabProps) {
  const { user } = useAuth();
  const agencyId = user?.agencyId || "";
  const readOnly = user?.userType === UserType.AGENCY_STAFF;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [initialValues, setInitialValues] = useState<AgencyProfileFormValues>(EMPTY_VALUES);
  const [initialLogo, setInitialLogo] = useState("");
  const [initialLetterhead, setInitialLetterhead] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [letterheadPreview, setLetterheadPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [letterheadFile, setLetterheadFile] = useState<File | null>(null);
  const [addressFocused, setAddressFocused] = useState(false);

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
      const values = agencyToFormValues(agency);
      setInitialValues(values);
      setInitialLogo(agency.logo || "");
      setInitialLetterhead(agency.letterhead || "");
      setLogoPreview(agency.logo || null);
      setLetterheadPreview(agency.letterhead || null);
      setLogoFile(null);
      setLetterheadFile(null);
      form.reset(values, { keepDefaultValues: false });
    } catch (e: any) {
      setError(e.message || "Couldn't load agency information. Check your connection and try again.");
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

  const isLetterheadImagePreview =
    letterheadPreview &&
    (letterheadPreview.startsWith("data:image") ||
      (letterheadPreview.startsWith("http") && !/\.pdf(\?|$)/i.test(letterheadPreview)));

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
      setError("Image must be under 5MB.");
      return;
    }

    if (field === "letterhead" && file.type === "application/pdf") {
      setLetterheadFile(file);
      setLetterheadPreview(file.name);
      setError("");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      if (field === "logo") {
        setLogoFile(file);
        setLogoPreview(preview);
      } else {
        setLetterheadFile(file);
        setLetterheadPreview(preview);
      }
    };
    reader.readAsDataURL(file);
    setError("");
  };

  const handleCancel = () => {
    form.reset(initialValues, { keepDefaultValues: false });
    setLogoFile(null);
    setLetterheadFile(null);
    setLogoPreview(initialLogo || null);
    setLetterheadPreview(initialLetterhead || null);
    setError("");
  };

  const handleSave = async (values: AgencyProfileFormValues) => {
    if (!agencyId || readOnly || !hasChanges) return;

    if (!values.name.trim()) {
      setError("Agency name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      let logoUrl = initialLogo;
      let letterheadUrl = initialLetterhead;

      const [logoResult, letterheadResult] = await Promise.all([
        logoFile ? uploadAgencyFile(agencyId, logoFile, "logo") : Promise.resolve(null),
        letterheadFile ? uploadAgencyFile(agencyId, letterheadFile, "letterhead") : Promise.resolve(null),
      ]);

      if (logoResult) logoUrl = logoResult.url;
      if (letterheadResult) letterheadUrl = letterheadResult.url;

      const payload: UpdateAgencyProfileRequest = {
        ...formValuesToUpdatePayload(values),
        logo: logoUrl || null,
        letterhead: letterheadUrl || null,
      };

      const updated = await updateAgency(agencyId, payload);
      const nextValues = agencyToFormValues(updated);

      setInitialValues(nextValues);
      setInitialLogo(updated.logo || "");
      setInitialLetterhead(updated.letterhead || "");
      setLogoPreview(updated.logo || null);
      setLetterheadPreview(updated.letterhead || null);
      setLogoFile(null);
      setLetterheadFile(null);
      form.reset(nextValues, { keepDefaultValues: false });

      onSaved?.();
      setIsModalVisible(true);
    } catch (e: any) {
      setError(e.message || "Failed to save agency information.");
    } finally {
      setSaving(false);
    }
  };

  const inputClassName = "bg-white";
  const disabled = saving || readOnly;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white border rounded-lg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#00b3ad]" />
          <p className="text-sm text-gray-500">Loading agency information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h4 className="text-[20px] font-bold text-[#10141a] leading-[1.3]">Agency Information</h4>
        <p className="text-[#4f4f4f]">
          View and manage your agency&apos;s public profile, branding, and billing details.
        </p>
      </div>

      {readOnly && (
        <div className="flex items-start gap-2 p-3 text-sm text-[#10141a] rounded-lg bg-[#e8fafa] border border-[#00b4b8]/20">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-[#00b4b8]" />
          <span>
            You&apos;re viewing agency information in read-only mode. Ask your agency owner to make changes.
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 text-sm text-red-600 rounded-lg bg-red-50">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)}>
          <Accordion type="multiple" defaultValue={["identity"]} className="w-full">
            <AccordionItem value="identity">
              <AccordionTrigger>Identity &amp; Registration</AccordionTrigger>
              <AccordionContent className="pb-2">
                <SettingsSectionRow
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
                </SettingsSectionRow>

                <SettingsSectionRow title="Legal Business Name" description="Use if different from your agency name.">
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
                </SettingsSectionRow>

                <SettingsSectionRow title="DBA" description="Doing Business As, if applicable.">
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
                </SettingsSectionRow>

                <SettingsSectionRow title="Agency Type" description="How your agency is classified.">
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
                </SettingsSectionRow>

                <SettingsSectionRow
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
                </SettingsSectionRow>

                <SettingsSectionRow
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
                </SettingsSectionRow>

                <SettingsSectionRow
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
                </SettingsSectionRow>

                <SettingsSectionRow
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
                </SettingsSectionRow>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="contact">
              <AccordionTrigger>Contact &amp; Location</AccordionTrigger>
              <AccordionContent className="pb-2">
                <SettingsSectionRow title="Email" description="Primary contact email for your agency.">
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
                </SettingsSectionRow>

                <SettingsSectionRow title="Phone" description="Main phone number for your agency.">
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
                </SettingsSectionRow>

                <SettingsSectionRow title="Primary Address" description="Your agency's main business address.">
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
                </SettingsSectionRow>

                <SettingsSectionRow title="County" description="County where your agency operates.">
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
                </SettingsSectionRow>

                <SettingsSectionRow title="City" description="City for your primary address.">
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
                </SettingsSectionRow>

                <SettingsSectionRow title="State" description="State for your primary address.">
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
                </SettingsSectionRow>

                <SettingsSectionRow title="Zip Code" description="Postal code for your primary address.">
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
                </SettingsSectionRow>

                <SettingsSectionRow title="Website" description="Your agency website, including https://">
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
                </SettingsSectionRow>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="branding">
              <AccordionTrigger>Branding</AccordionTrigger>
              <AccordionContent className="pb-2">
                <SettingsSectionRow title="Logo" description="Upload your agency logo. JPG/PNG, max 5MB.">
                  <div className="space-y-3">
                    <label className="flex items-center justify-center gap-2 w-full min-h-11 px-4 py-3 bg-[#00b3ad] hover:bg-[#00a39f] text-white font-medium rounded-full transition cursor-pointer sm:w-auto sm:inline-flex">
                      <Upload className="w-4 h-4" />
                      {logoPreview ? "Change logo" : "Upload logo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={disabled}
                        onChange={(e) => handleBrandingFileChange("logo", e)}
                      />
                    </label>
                    {logoPreview && (
                      <img src={logoPreview} alt="Logo preview" className="h-16 object-contain" />
                    )}
                  </div>
                </SettingsSectionRow>

                <SettingsSectionRow title="Primary Color" description="Choose a brand color for your agency.">
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
                </SettingsSectionRow>

                <SettingsSectionRow
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
                    {isLetterheadImagePreview && (
                      <img src={letterheadPreview} alt="Letterhead preview" className="h-16 object-contain" />
                    )}
                    {letterheadPreview && !isLetterheadImagePreview && (
                      <p className="text-sm text-[#4f4f4f]">PDF letterhead selected.</p>
                    )}
                  </div>
                </SettingsSectionRow>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="billing">
              <AccordionTrigger>Billing Configuration</AccordionTrigger>
              <AccordionContent className="pb-2">
                <SettingsSectionRow
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
                </SettingsSectionRow>

                <SettingsSectionRow
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
                </SettingsSectionRow>

                <SettingsSectionRow title="Invoice Contact Email" description="Email for billing and invoice correspondence.">
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
                </SettingsSectionRow>
              </AccordionContent>
            </AccordionItem>
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

      <SuccessModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title="Agency Information Updated"
        message="Agency information saved. Updates will appear on claims and reports that use this data."
      />
    </div>
  );
}
