import {VoiceRecordingProvider} from "@/contexts/VoiceRecordingContext";
import {Input} from "@/components/ui/input";
import {Radio} from "@/components/ui/radio";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Calendar} from "@/components/ui/calendar";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group";
import CalendarDaysIcon from "@/assets/icons/calendar-days.svg?react";
import VoiceEnabledTextarea from "@/components/VoiceEnabledTextarea";
import VoiceInputButton from "@/components/VoiceInputButton";
import React, {useEffect, useState} from "react";
import {useUpdateSubmittedNoteMutation} from "@/pages/agency/notes/api";
import {format} from "date-fns";
import {SubmittedNoteDetails} from "@/pages/agency/notes/apiTypes";

type MealType = "breakfast" | "lunch" | "dinner";

interface AgencyRespiteLogProps {
  submissionId: string | null;
  isLoading: boolean;
  submittedNote?: SubmittedNoteDetails;
}

export default function AgencyRespiteLog(
  {submissionId, isLoading, submittedNote}: AgencyRespiteLogProps
) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [medication, setMedication] = useState("");
  const [medicationTime, setMedicationTime] = useState<"AM" | "PM" | "">("");
  const [selectedMeals, setSelectedMeals] = useState<MealType[]>([]);
  const [activities, setActivities] = useState("");
  const [comments, setComments] = useState("");
  const [toileting, setToileting] = useState("");
  const [healthConcerns, setHealthConcerns] = useState("");
  const [suppliesNeeded, setSuppliesNeeded] = useState("");
  const [noteId, setNoteId] = useState<string>("");

  const [mutateNote] = useUpdateSubmittedNoteMutation();

  const currentDate = new Date().toLocaleDateString("en-US", {month: "long", day: "numeric", year: "numeric"});

  const toggleMeal = (meal: MealType) => {
    if (submittedNote?.status !== "submitted") return;
    
    setSelectedMeals((prev) =>
      prev.includes(meal) ? prev.filter((m) => m !== meal) : [...prev, meal]
    );
  };

  const handleSave = async () => {
    if (!date || !noteId) return;

    try {
      await mutateNote({
        submissionId: submissionId!,
        data: {
          id: noteId,
          startDate: format(date, "yyyy-MM-dd"),
          endDate: format(date, "yyyy-MM-dd"),
          metadata: {
            medication: medication,
            meals: selectedMeals,
            activities: activities,
            comments: comments,
            toileting: toileting,
            healthConcerns: healthConcerns,
            suppliesNeeded: suppliesNeeded,
            medicationTime: medicationTime
          }
        }
      }).unwrap();
    } catch (error) {
      console.error("Error saving respite log:", error);
    }
  };

  // Auto-save when fields change (only for submitted status)
  useEffect(() => {
    if (submittedNote?.status === "submitted" && noteId && date) {
      const timer = setTimeout(() => {
        handleSave();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [medication, medicationTime, selectedMeals, activities, comments, healthConcerns, suppliesNeeded]);

  useEffect(() => {
    if (!isLoading && submittedNote && submittedNote.notes.length > 0) {
      const note = submittedNote.notes[0];
      setNoteId(note.id);
      setDate(note?.startDate ? new Date(note.startDate) : undefined);
      setMedication(note?.metadata?.medication ?? "");
      setMedicationTime(note?.metadata?.medicationTime ?? "");
      setSelectedMeals(note?.metadata?.meals ?? []);
      setActivities(note?.metadata?.activities ?? "");
      setComments(note?.metadata?.comments ?? "");
      setHealthConcerns(note?.metadata?.healthConcerns ?? "");
      setSuppliesNeeded(note?.metadata?.suppliesNeeded ?? "");
      setToileting(note?.metadata?.toileting ?? "");
    }
  }, [isLoading, submittedNote]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div
            className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent"></div>
          <p className="text-sm text-[#808081]">Loading notes...</p>
        </div>
      </div>
    );
  }

  const isEditable = submittedNote?.status === "submitted";

  return (
    <VoiceRecordingProvider pageTitle="Respite Log">
      <div className="min-h-[calc(100vh-200px)] pb-20">
        {/* Form Title */}
        <h2 className="text-[14px] font-semibold leading-[1.4] text-black mb-[34px] font-['Urbanist',sans-serif]">
          Respite Log
        </h2>

        {/* Form Fields */}
        <div className="space-y-[27px]">
          {/* Row 1: Respite log for, Service Code, Toileting */}
          <div className="grid grid-cols-3 gap-[18px]">
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
                Respite log for
              </label>
              <Input
                type="text"
                value={submittedNote?.metadata?.individual ?? ""}
                disabled={true}
                className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
                Service Code
              </label>
              <Input
                type="text"
                value={submittedNote?.metadata?.serviceCode ?? ""}
                disabled={true}
                className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4 text-[#b2b2b3]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
                Toileting
              </label>
              <Input
                type="text"
                value={toileting}
                onChange={(e) => setToileting(e.target.value)}
                className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4"
              />
            </div>
          </div>

          {/* Row 2: Date, Medication with AM/PM */}
          <div className="grid grid-cols-3 gap-[18px]">
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
                Date
              </label>
              {isEditable ? (
                <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" className="w-full focus:outline-none">
                      <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
                        <InputGroupInput
                          value={date ? format(date, "MMMM d, yyyy") : ""}
                          placeholder="Select date"
                          readOnly
                          className="text-[#10141a] border-0 bg-transparent"
                        />
                        <InputGroupAddon align="inline-end">
                          <CalendarDaysIcon className="h-5 w-5 text-[#808081]"/>
                        </InputGroupAddon>
                      </InputGroup>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="mt-3 w-auto border-none bg-white p-0 shadow-lg">
                    <Calendar
                      mode="single"
                      className="bg-white"
                      captionLayout="dropdown"
                      startMonth={new Date(1924, 0)}
                      endMonth={new Date()}
                      selected={date}
                      defaultMonth={date ?? new Date()}
                      disabled={{
                        after: new Date()
                      }}
                      onSelect={(selectedDate) => {
                        if (selectedDate) {
                          setDate(selectedDate);
                          setIsDateOpen(false);
                          handleSave();
                        }
                      }}
                      formatters={{
                        formatMonthDropdown: (date) =>
                          date.toLocaleString("default", {month: "long"}),
                      }}
                      classNames={{
                        dropdown_root: "relative border-none shadow-none has-focus:ring-0",
                        caption_label: "rounded-md pl-2 pr-2 flex items-center gap-1 text-sm h-8 [&>svg]:hidden",
                      }}
                      autoFocus={true}
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <Input
                  type="text"
                  value={date ? format(date, "MMMM d, yyyy") : ""}
                  disabled={true}
                  className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4"
                />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
                Medication
              </label>
              <Input
                type="text"
                value={medication}
                onChange={(e) => setMedication(e.target.value)}
                disabled={!isEditable}
                className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif] opacity-0">
                &nbsp;
              </label>
              <div className="flex gap-[9px] items-center h-[44px]">
                <div className="flex gap-1 items-center">
                  <Radio
                    name="medicationTime"
                    value="AM"
                    checked={medicationTime === "AM"}
                    onChange={(e) => isEditable && setMedicationTime(e.target.checked ? "AM" : "")}
                    disabled={!isEditable}
                  />
                  <span className="text-[14px] font-medium leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]">
                    AM
                  </span>
                </div>
                <div className="flex gap-1 items-center">
                  <Radio
                    name="medicationTime"
                    value="PM"
                    checked={medicationTime === "PM"}
                    onChange={(e) => isEditable && setMedicationTime(e.target.checked ? "PM" : "")}
                    disabled={!isEditable}
                  />
                  <span className="text-[14px] font-medium leading-[1.4] text-[#10141a] font-['Urbanist',sans-serif]">
                    PM
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Meals Section */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
              Meals
            </label>
            <div className="flex gap-[10px] items-center">
              <button
                type="button"
                onClick={() => toggleMeal("breakfast")}
                disabled={!isEditable}
                className={`px-[10px] py-[6px] rounded-[6px] transition-colors border-[0.5px] ${
                  selectedMeals.includes("breakfast")
                    ? "bg-[#00b4b8] border-[#00b4b8] text-white"
                    : "border-[#808081] text-[#10141a]"
                } ${!isEditable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className="text-[14px] font-medium leading-[1.4] font-['Urbanist',sans-serif]">
                  Breakfast
                </span>
              </button>
              <button
                type="button"
                onClick={() => toggleMeal("lunch")}
                disabled={!isEditable}
                className={`px-[10px] py-[6px] rounded-[6px] transition-colors border-[0.5px] ${
                  selectedMeals.includes("lunch")
                    ? "bg-[#00b4b8] border-[#00b4b8] text-white"
                    : "border-[#808081] text-[#10141a]"
                } ${!isEditable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className="text-[14px] font-medium leading-[1.4] font-['Urbanist',sans-serif]">
                  Lunch
                </span>
              </button>
              <button
                type="button"
                onClick={() => toggleMeal("dinner")}
                disabled={!isEditable}
                className={`px-[10px] py-[6px] rounded-[6px] transition-colors border-[0.5px] ${
                  selectedMeals.includes("dinner")
                    ? "bg-[#00b4b8] border-[#00b4b8] text-white"
                    : "border-[#808081] text-[#10141a]"
                } ${!isEditable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className="text-[14px] font-medium leading-[1.4] font-['Urbanist',sans-serif]">
                  Dinner
                </span>
              </button>
            </div>
          </div>

          {/* Activities */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
              Activities
            </label>
            {isEditable ? (
              <VoiceEnabledTextarea
                value={activities}
                onChange={setActivities}
                className="h-[143px] bg-white border border-[#cccccd] rounded-[12px] px-4 py-3 resize-none"
                placeholder=""
                fieldName="Activities"
                pageTitle="Respite Log"
              />
            ) : (
              <textarea
                value={activities}
                disabled={true}
                className="h-[143px] bg-white border border-[#cccccd] rounded-[12px] px-4 py-3 resize-none"
              />
            )}
          </div>

          {/* Comments */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
              Comments:
            </label>
            {isEditable ? (
              <VoiceEnabledTextarea
                value={comments}
                onChange={setComments}
                className="h-[143px] bg-white border border-[#cccccd] rounded-[12px] px-4 py-3 resize-none"
                placeholder=""
                fieldName="Comments"
                pageTitle="Respite Log"
              />
            ) : (
              <textarea
                value={comments}
                disabled={true}
                className="h-[143px] bg-white border border-[#cccccd] rounded-[12px] px-4 py-3 resize-none"
              />
            )}
          </div>

          {/* Health Concerns */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
              Health Concerns:
            </label>
            {isEditable ? (
              <VoiceEnabledTextarea
                value={healthConcerns}
                onChange={setHealthConcerns}
                className="h-[90px] bg-white border border-[#cccccd] rounded-[12px] px-4 py-3 resize-none"
                placeholder=""
                fieldName="Health Concerns"
                pageTitle="Respite Log"
              />
            ) : (
              <textarea
                value={healthConcerns}
                disabled={true}
                className="h-[90px] bg-white border border-[#cccccd] rounded-[12px] px-4 py-3 resize-none"
              />
            )}
          </div>

          {/* Supplies Needed Soon */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
              Supplies Needed Soon:
            </label>
            {isEditable ? (
              <VoiceEnabledTextarea
                value={suppliesNeeded}
                onChange={setSuppliesNeeded}
                className="h-[90px] bg-white border border-[#cccccd] rounded-[12px] px-4 py-3 resize-none"
                placeholder=""
                fieldName="Supplies Needed Soon"
                pageTitle="Respite Log"
              />
            ) : (
              <textarea
                value={suppliesNeeded}
                disabled={true}
                className="h-[90px] bg-white border border-[#cccccd] rounded-[12px] px-4 py-3 resize-none"
              />
            )}
          </div>
        </div>

        {/* Submitted By Section */}
        <div className="mt-8">
          <label
            className="block text-[12px] font-normal leading-[normal] text-[#10141a] mb-1 font-['Urbanist',sans-serif]">
            Submitted by
          </label>
          <Input
            type="text"
            value={submittedNote?.employee?.fullName || ""}
            placeholder=""
            disabled={true}
            className="max-w-md"
          />
          <p className="mt-2 text-[12px] font-normal leading-[normal] text-black font-['Urbanist',sans-serif]">
            {submittedNote?.submittedAt ? new Date(submittedNote.submittedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric"
            }) : currentDate}
          </p>
        </div>

        {/* Floating Action Button - Only show when editable */}
        {isEditable && <VoiceInputButton/>}
      </div>
    </VoiceRecordingProvider>
  );
}
