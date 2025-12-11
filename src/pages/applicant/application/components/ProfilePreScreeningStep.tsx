import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch } from "react-redux";
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
import { format, differenceInYears } from "date-fns";
import { uploadResume, submitPreScreening, type PreScreeningData } from "@/lib/api/job-application";

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

const fileListSchema = z.custom<FileList>(
  (value: unknown) => {
    if (typeof FileList === "undefined") {
      return true;
    }
    return value instanceof FileList && value.length > 0;
  },
  {
    message: "Resume file is required",
  }
).optional();

const profilePreScreeningSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Enter a valid email address"),
  dateOfBirth: z.date({ message: "Date of birth is required" }),
  address: z.string().min(1, "Address is required"),
  gender: z.enum(["Male", "Female"], {
    message: "Please select a gender",
  }),
  booleanQuestions: z.object(booleanQuestionsSchemaShape),
  resume: fileListSchema,
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
  onNext: () => void;
}

export default function ProfilePreScreeningStep({ onNext }: ProfilePreScreeningStepProps) {
  const [isDobOpen, setIsDobOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const dispatch = useDispatch<AppDispatch>();

  const form = useForm<ProfilePreScreeningFormValues>({
    resolver: zodResolver(profilePreScreeningSchema),
    mode: "onChange", // Enable validation on change to track form validity
    defaultValues: {
      fullName: "",
      email: "",
      dateOfBirth: undefined,
      address: "",
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

  const handleSubmit = async (values: ProfilePreScreeningFormValues) => {
    try {
      setUploadError(null);
      let resumeUrl: string | undefined;
      
      // If a resume file is provided, upload it first
      if (values.resume && values.resume.length > 0) {
        setIsUploading(true);
        const file = values.resume[0];
        
        try {
          const uploadResponse = await uploadResume(file);          resumeUrl = uploadResponse.data.url;
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

      // Submit pre-screening data to backend
      setIsSubmitting(true);
      try {
        const response = await submitPreScreening(preScreeningData);
        
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
        onNext();
      } catch (error) {
        setUploadError('Failed to submit application. Please try again.');      } finally {
        setIsSubmitting(false);
      }
    } catch (error) {      setUploadError('An unexpected error occurred. Please try again.');
      setIsUploading(false);
      setIsSubmitting(false);
    }
  };

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
                                className="text-[#10141a]"
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
                          endMonth={new Date()}
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
            name="address"
            render={({ field }) => (
              <div className="w-[353px]">
                <FormItem className="space-y-2">
                  <FormLabel className="text-xs font-normal text-[#10141a]">Address</FormLabel>
                  <FormControl className="mb-0">
                    <Input placeholder="Enter Address" {...field} />
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
                      <legend className="mb-1 text-xs font-normal text-[#10141a]">{question.label}</legend>
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
                <FormLabel className="block text-xs font-normal text-[#10141a]">Upload Resume</FormLabel>
                <FormControl className="mb-0">
                  <FileUpload
                    ref={ref}
                    name={name}
                    className="h-[101px]"
                    label={selectedFileName ?? "Upload your resume"}
                    accept=".pdf,.doc,.docx"
                    onBlur={onBlur}
                    onChange={(event) => {
                      onChange(event.target.files ?? undefined);
                      setUploadError(null); // Clear any previous upload errors
                    }}
                  />
                </FormControl>
                {uploadError && <p className="text-xs text-[#d53411]">{uploadError}</p>}
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
          <Button 
            type="submit" 
            disabled={!form.formState.isValid || form.formState.isSubmitting || isUploading || isSubmitting || !isAtLeast18}
            className={(!form.formState.isValid || !isAtLeast18) ? 'bg-[#b2b2b3] backdrop-blur-[22px] hover:bg-[#b2b2b3] active:bg-[#b2b2b3]' : ''}
          >
            <span>
              {isUploading ? 'Uploading...' : isSubmitting ? 'Submitting...' : 'Next'}
            </span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 10H16M16 10L10 4M16 10L10 16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        </div>
      </form>
    </Form>
  );
}

