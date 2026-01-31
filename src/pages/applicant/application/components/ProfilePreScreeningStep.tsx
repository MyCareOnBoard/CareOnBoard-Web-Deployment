import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch } from "react-redux";
import { useAuth } from "@/utils/auth";
import { updateUserProfile } from "@/utils/auth/store/authSlice";
import type { AppDispatch } from "@/store/redux/store";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Radio } from "@/components/ui/radio";
import { Calendar } from "@/components/ui/calendar";
import { FileUpload } from "@/components/ui/file-upload";
import CalendarDaysIcon from "@/assets/icons/calendar-days.svg?react";
import { Loader } from "lucide-react";
import { format, differenceInYears, subYears } from "date-fns";
import { uploadResume, submitPreScreening, getPreScreening, updatePreScreening, type PreScreeningData } from "@/lib/api/job-application";
import { useGooglePlacesAutocomplete } from "@/hooks/useGooglePlacesAutocomplete";

const DEFAULT_DOB = new Date();

const BOOLEAN_QUESTIONS = [
  { name: "isAdult", label: "Are you at least 18 years old?" },
  { name: "hasDiploma", label: "Do you have a High School Diploma or GED?" },
  { name: "eligibleToWork", label: "Are you legally eligible to work in the U.S.?" },
  { name: "hasDisqualifyingOffense", label: "Have you ever been convicted of a disqualifying offense under NJ law?" },
  { name: "hasTransportation", label: "Do you have reliable transportation?" },
] as const;

type BooleanQuestionName = (typeof BOOLEAN_QUESTIONS)[number]["name"];

const yesNoSchema = z.enum(["Yes", "No"], {
  message: "Please select Yes or No",
});

const booleanQuestionsSchemaShape = (() => {
  const shape = {} as Record<BooleanQuestionName, typeof yesNoSchema>;
  for (const question of BOOLEAN_QUESTIONS) {
    shape[question.name] = yesNoSchema;
  }
  return shape;
})();

const profilePreScreeningSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Enter a valid email address"),
  dateOfBirth: z.date({ message: "Date of birth is required" }),
  address: z.object({
    address: z.string().min(1, "Address is required"),
    city: z.string(),
    zipCode: z.string(),
    latlon: z.object({ lat: z.string(), lon: z.string() }).optional(),
  }),
  gender: z.enum(["Male", "Female"], {
    message: "Please select a gender",
  }),
  booleanQuestions: z.object(booleanQuestionsSchemaShape),
  resume: z.any().nullish(), // Accept any value including undefined and null
  declaration: z.boolean().refine((val) => val, {
    message: "You must confirm the information is correct",
  }),
});

export type ProfilePreScreeningFormValues = z.infer<typeof profilePreScreeningSchema>;

const booleanQuestionsDefaults = BOOLEAN_QUESTIONS.reduce(
  (acc, question) => {
    acc[question.name] = undefined;
    return acc;
  },
  {} as Record<BooleanQuestionName, "Yes" | "No" | undefined>
);

interface ProfilePreScreeningStepProps {
  onSuccess: () => void;
}

export default function ProfilePreScreeningStep({ onSuccess }: ProfilePreScreeningStepProps) {
  const [isDobOpen, setIsDobOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [existingResumeUrl, setExistingResumeUrl] = useState<string | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useAuth();

  const addressInputRef = useRef<HTMLDivElement>(null);
  const addressAutocomplete = useGooglePlacesAutocomplete();

  const form = useForm<ProfilePreScreeningFormValues>({
    resolver: zodResolver(profilePreScreeningSchema),
    mode: "onChange", // Enable validation on change to track form validity
    defaultValues: {
      fullName: user?.fullName || user?.profile?.fullName || "",
      email: user?.email || user?.profile?.email || "",
      dateOfBirth: undefined,
      address: {
        address: "",
        city: "",
        zipCode: "",
        latlon: undefined,
      },
      gender: undefined,
      booleanQuestions: booleanQuestionsDefaults,
      resume: undefined,
      declaration: false,
    },
  });

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: Date): number => {
    return differenceInYears(new Date(), dateOfBirth);
  };

  // Watch date of birth to automatically set isAdult
  const dateOfBirth = form.watch("dateOfBirth");
  const isAtLeast18 = dateOfBirth ? calculateAge(dateOfBirth) >= 18 : false;
  const ellibility = form.watch("booleanQuestions.eligibleToWork");
  const isEligible = ellibility === "Yes";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addressInputRef.current && !addressInputRef.current.contains(event.target as Node)) {
        addressAutocomplete.setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [addressAutocomplete.setShowSuggestions]);

  useEffect(() => {
    if (dateOfBirth) {
      const age = calculateAge(dateOfBirth);
      form.setValue("booleanQuestions.isAdult", age >= 18 ? "Yes" : "No", {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  }, [dateOfBirth, form]);

  // Fetch existing pre-screening data on mount
  useEffect(() => {
    const fetchExistingData = async () => {
      try {
        setIsLoadingData(true);
        const response = await getPreScreening();

        if (response.success && response.data) {
          setHasExistingData(true);
          const data = response.data;

          // Prefill form with existing data
          const formData: any = {
            fullName: data.fullName || user?.fullName || user?.profile?.fullName || "",
            email: data.email || user?.email || user?.profile?.email || "",
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
            address: data.address || {
              address: "",
              city: "",
              zipCode: "",
              latlon: undefined,
            },
            gender: data.gender || undefined,
            booleanQuestions: {
              isAdult: data.isAtLeast18 ? "Yes" : "No",
              hasDiploma: data.hasHighSchoolDiploma ? "Yes" : "No",
              eligibleToWork: data.isLegallyEligible ? "Yes" : "No",
              hasDisqualifyingOffense: data.hasBeenConvicted ? "Yes" : "No",
              hasTransportation: data.hasReliableTransportation ? "Yes" : "No",
            },
            resume: data?.resumeUrl,
            declaration: data.declarationAgreed || false,
          };

          // Store existing resume URL if available
          if (data.resumeUrl) {
            setExistingResumeUrl(data.resumeUrl);
          }

          form.reset(formData);
        }
      } catch (error: any) {
        // If 404, it means no data exists yet - this is fine
        if (error.response?.status === 404) {
          setHasExistingData(false);
        } else {
          console.error('Failed to fetch pre-screening data:', error);
        }
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchExistingData();
  }, [user]);

  const handleSelectAddressSuggestion = async (placeId: string) => {
    const details = await addressAutocomplete.selectSuggestion(placeId);
    if (details) {
      form.setValue("address", {
        address: details.formattedAddress,
        city: details.city,
        zipCode: details.zipCode,
        latlon: { lat: String(details.lat), lon: String(details.lng) },
      }, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  };

  const handleSubmit = async (values: ProfilePreScreeningFormValues) => {
    try {
      setUploadError(null);
      let resumeUrl: string | undefined;

      // If a resume file is provided, upload it first
      if (values.resume && values.resume instanceof FileList && values.resume.length > 0) {
        setIsUploading(true);
        const file = values.resume[0];

        try {
          const uploadResponse = await uploadResume(file);
          console.log('Resume uploaded successfully:', uploadResponse);
          resumeUrl = uploadResponse.data.url;
        } catch (error) {
          setUploadError('Failed to upload resume. Please try again.');
          return; // Don't proceed if upload fails
        } finally {
          setIsUploading(false);
        }
      }

      // Transform form data to match backend API structure
      const preScreeningData: PreScreeningData = {
        fullName: values.fullName,
        email: values.email,
        dateOfBirth: format(values.dateOfBirth, 'yyyy-MM-dd'),
        address: values.address,
        gender: values.gender,
        isAtLeast18: values.booleanQuestions.isAdult === 'Yes',
        hasHighSchoolDiploma: values.booleanQuestions.hasDiploma === 'Yes',
        isLegallyEligible: values.booleanQuestions.eligibleToWork === 'Yes',
        hasBeenConvicted: values.booleanQuestions.hasDisqualifyingOffense === 'Yes',
        hasReliableTransportation: values.booleanQuestions.hasTransportation === 'Yes',
        resumeUrl: resumeUrl,
        declarationAgreed: values.declaration,
      };

      // Submit or update pre-screening data to backend
      setIsSubmitting(true);
      try {
        const response = hasExistingData
          ? await updatePreScreening(preScreeningData)
          : await submitPreScreening(preScreeningData);

        // Update user profile with application data
        try {
          const { updateProfileInfo } = await import('@/lib/api/profile');
          await updateProfileInfo({
            fullName: values.fullName,
            email: values.email,
            dateOfBirth: format(values.dateOfBirth, 'yyyy-MM-dd'),
            address: values.address,
            gender: values.gender,
          });

          // Update Redux state - save ONLY in profile sub-object
          dispatch(updateUserProfile({
            fullName: values.fullName,
            email: values.email,
            dateOfBirth: format(values.dateOfBirth, 'yyyy-MM-dd'),
            address: values.address,
            gender: values.gender,
          }));
        } catch (profileUpdateError) {
          console.warn('Failed to update user profile:', profileUpdateError);
        }

        // Proceed to next step with form data
        onSuccess();
      } catch (error) {
        setUploadError('Failed to submit application. Please try again.');
        console.error('Error submitting pre-screening:', error);
      } finally {
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setUploadError('An unexpected error occurred. Please try again.');
      setIsUploading(false);
      setIsSubmitting(false);
    }
  };

  // Show loading state while fetching existing data
  if (isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-[#808081]">Loading your application data...</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-[33px]">
        <div className="flex flex-wrap gap-[50px]">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <div className="w-[353px]">
                <FormItem className="space-y-2">
                  <FormLabel className="text-xs font-normal text-[#10141a]">Full Name</FormLabel>
                  <FormControl className="mb-0">
                    <Input placeholder="Enter full name" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs text-[#d53411]" />
                </FormItem>
              </div>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <div className="w-[353px]">
                <FormItem className="space-y-2">
                  <FormLabel className="text-xs font-normal text-[#10141a]">Email</FormLabel>
                  <FormControl className="mb-0">
                    <Input placeholder="Enter your email" type="email" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs text-[#d53411]" />
                </FormItem>
              </div>
            )}
          />

          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => {
              const formattedDob = field.value ? format(field.value, "MMMM d, yyyy") : "";

              return (
                <div className="w-[353px]">
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-normal text-[#10141a]">Date of birth</FormLabel>
                    <Popover open={isDobOpen} onOpenChange={setIsDobOpen}>
                      <PopoverTrigger asChild>
                        <FormControl className="mb-0">
                          <button type="button" className="w-full focus:outline-none">
                            <InputGroup className="px-4">
                              <InputGroupInput
                                value={formattedDob}
                                placeholder="November 14, 2025"
                                readOnly
                                className="text-[#10141a] cursor-pointer"
                              />
                              <InputGroupAddon align="inline-end">
                                <CalendarDaysIcon className="h-5 w-5 text-[#808081]" />
                              </InputGroupAddon>
                            </InputGroup>
                          </button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="mt-3 w-[353px] border-none bg-white p-0 shadow-none">
                        <Calendar
                          mode="single"
                          className="bg-white"
                          captionLayout="dropdown"
                          startMonth={new Date(1924, 0)}
                          endMonth={subYears(new Date(), 18)}
                          selected={field.value}
                          defaultMonth={field.value ?? DEFAULT_DOB}
                          onSelect={(date) => {
                            if (!date) {
                              return;
                            }
                            field.onChange(date);
                            field.onBlur();
                            setIsDobOpen(false);
                          }}
                          formatters={{
                            formatMonthDropdown: (date) =>
                              date.toLocaleString("default", { month: "long" }),
                          }}
                          classNames={{
                            dropdown_root: "relative border-none shadow-none has-focus:ring-0",
                            caption_label: "rounded-md pl-2 pr-2 flex items-center gap-1 text-sm h-8 [&>svg]:hidden",
                          }}
                          autoFocus={true}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage className="text-xs text-[#d53411]" />
                  </FormItem>
                </div>
              );
            }}
          />
          <FormField
            control={form.control}
            name="address.address"
            render={({ field }) => (
              <div className="w-[353px]">
                <FormItem className="space-y-2">
                  <FormLabel className="text-xs font-normal text-[#10141a]">Address</FormLabel>
                  <FormControl className="mb-0">
                    <div className="relative" ref={addressInputRef}>
                      <Input
                        placeholder="Enter Address"
                        {...field}
                        onChange={(e) => {
                          const v = e.target.value;
                          field.onChange(v);
                          form.setValue("address.latlon", undefined);
                          addressAutocomplete.handleInputChange(v);
                        }}
                        onFocus={() => {
                          if (addressAutocomplete.suggestions.length > 0) {
                            addressAutocomplete.setShowSuggestions(true);
                          }
                        }}
                      />
                      {addressAutocomplete.showSuggestions && addressAutocomplete.suggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-[#e5e5e6] rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                          {addressAutocomplete.isSearching && (
                            <div className="px-4 py-3 text-sm text-[#808081] flex items-center gap-2">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-[#00b4b8] border-r-transparent" />
                              Searching...
                            </div>
                          )}
                          {!addressAutocomplete.isSearching &&
                            addressAutocomplete.suggestions.map((suggestion) => (
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
                  </FormControl>
                  <FormMessage className="text-xs text-[#d53411]" />
                </FormItem>
              </div>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem className="w-[450px] space-y-2">
              <FormLabel className="text-xs font-normal text-[#10141a]">Gender</FormLabel>
              <div className="flex gap-[9px]">
                <Radio
                  id="gender-male"
                  name={field.name}
                  value="Male"
                  label="Male"
                  checked={field.value === "Male"}
                  onChange={() => {
                    field.onChange("Male");
                  }}
                  onBlur={field.onBlur}
                />
                <Radio
                  id="gender-female"
                  name={field.name}
                  value="Female"
                  label="Female"
                  checked={field.value === "Female"}
                  onChange={() => {
                    field.onChange("Female");
                  }}
                  onBlur={field.onBlur}
                />
              </div>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <div className="space-y-[30px]">
          {BOOLEAN_QUESTIONS.map((question) => {
            // Lock the isAdult question based on date of birth
            const isAdultQuestion = question.name === "isAdult";
            const isDisabled = isAdultQuestion && dateOfBirth !== undefined;

            return (
              <FormField
                key={question.name}
                control={form.control}
                name={`booleanQuestions.${question.name}`}
                render={({ field, fieldState }) => (
                  <div className="w-[450px]">
                    <fieldset className="border-0 p-0">
                      <legend className="mb-1 text-xs font-normal text-[#10141a]">{question.label}{question.name === "hasTransportation" ? " (Optional)" : ""}</legend>
                      <div className="flex gap-[9px]">
                        <Radio
                          id={`${question.name}-yes`}
                          name={field.name}
                          value="Yes"
                          label="Yes"
                          checked={field.value === "Yes"}
                          disabled={isDisabled}
                          onChange={() => {
                            field.onChange("Yes");
                            field.onBlur();
                          }}
                        />
                        <Radio
                          id={`${question.name}-no`}
                          name={field.name}
                          value="No"
                          label="No"
                          checked={field.value === "No"}
                          disabled={isDisabled}
                          onChange={() => {
                            field.onChange("No");
                            field.onBlur();
                          }}
                        />
                      </div>
                    </fieldset>
                    {fieldState.error ? (
                      <p className="mt-1 text-xs text-[#d53411]">{fieldState.error.message}</p>
                    ) : null}
                  </div>
                )}
              />
            );
          })}
        </div>

        <FormField
          control={form.control}
          name="resume"
          render={({ field }) => {
            const { ref, name, onBlur, onChange, value } = field;
            const selectedFileName = value && value.length > 0 ? value[0]?.name : undefined;

            return (
              <FormItem className="w-6xl space-y-3">
                <FormLabel className="block text-xs font-normal text-[#10141a]">Upload Resume in PDF format (Optional)</FormLabel>
                <FormControl className="mb-0">
                  <FileUpload
                    ref={ref}
                    name={name}
                    className="h-[101px]"
                    label={selectedFileName ?? "Upload your resume"}
                    accept=".pdf"
                    onBlur={onBlur}
                    onChange={(event) => {
                      onChange(event.target.files ?? undefined);
                      setUploadError(null); // Clear any previous upload errors
                    }}
                  />
                </FormControl>
                {uploadError && <p className="text-xs text-[#d53411]">{uploadError}</p>}

                {/* Show existing resume if available */}
                {existingResumeUrl && (
                  <a
                    href={existingResumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="backdrop-blur-[8px] bg-[rgba(0,216,65,0.08)] border-[rgba(255,255,255,0.3)] border-b border-solid flex gap-2 items-center p-2 rounded-lg hover:bg-[rgba(0,216,65,0.12)] transition-colors"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M11.6667 1.66669H5.00002C4.55799 1.66669 4.13407 1.84228 3.82151 2.15484C3.50895 2.4674 3.33335 2.89133 3.33335 3.33335V16.6667C3.33335 17.1087 3.50895 17.5326 3.82151 17.8452C4.13407 18.1578 4.55799 18.3334 5.00002 18.3334H15C15.442 18.3334 15.866 18.1578 16.1785 17.8452C16.4911 17.5326 16.6667 17.1087 16.6667 16.6667V6.66669M11.6667 1.66669L16.6667 6.66669M11.6667 1.66669V6.66669H16.6667M13.3334 10.8334H6.66669M13.3334 14.1667H6.66669M8.33335 7.50002H6.66669"
                        stroke="#00D841"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="font-['Urbanist',sans-serif] font-medium text-sm text-[#10141a]">View Uploaded Resume</span>
                  </a>
                )}

                <FormMessage className="text-xs text-[#d53411]" />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="declaration"
          render={({ field }) => {
            const { ref, name, onBlur, value, onChange } = field;
            return (
              <FormItem className="space-y-2">
                <FormControl className="mb-0">
                  <Checkbox
                    ref={ref}
                    name={name}
                    onBlur={onBlur}
                    checked={value}
                    onChange={(event) => onChange(event.target.checked)}
                    label="I hereby declared that all the information are correct"
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            );
          }}
        />

        <div className="pb-12">
          {dateOfBirth && !isAtLeast18 && (
            <div className="mb-4 rounded-md bg-[#fef2f2] border border-[#fecaca] px-4 py-3">
              <p className="text-sm text-[#dc2626]">
                You must be at least 18 years old to submit an application. Based on your date of birth, you are currently under 18 years old.
              </p>
            </div>
          )}
          {ellibility && !isEligible && (
            <div className="mb-4 rounded-md bg-[#fef2f2] border border-[#fecaca] px-4 py-3">
              <p className="text-sm text-[#dc2626]">
                You are not eligible to work in the U.S.
              </p>
            </div>
          )}
          <Button
            type="submit"
            disabled={!form.formState.isValid || form.formState.isSubmitting || isUploading || isSubmitting || !isAtLeast18}
            className={(!form.formState.isValid || !isAtLeast18 || !isEligible) ? 'bg-[#b2b2b3] backdrop-blur-[22px] hover:bg-[#b2b2b3] active:bg-[#b2b2b3]' : ''}
          >
            {(isUploading || isSubmitting) && (
              <Loader className="h-5 w-5 animate-spin" />
            )}
            <span>
              {isUploading ? 'Uploading...' : isSubmitting ? 'Saving...' : 'Save'}
            </span>
            {!isUploading && !isSubmitting && (
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none">
                <path
                  d="M4 10H16M16 10L10 4M16 10L10 16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

