import React, {useEffect, useState} from "react";
import {Input} from "@/components/ui/input";
import {Radio} from "@/components/ui/radio";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Calendar} from "@/components/ui/calendar";
import {InputGroup, InputGroupAddon, InputGroupInput} from "@/components/ui/input-group";
import CalendarDaysIcon from "@/assets/icons/calendar-days.svg?react";
import {format} from "date-fns";
import VoiceEnabledTextarea from "@/components/VoiceEnabledTextarea";
import VoiceInputButton from "@/components/VoiceInputButton";
import {VoiceRecordingProvider} from "@/contexts/VoiceRecordingContext";
import {Button} from "@/components/ui/button";
import {Routes} from "@/routes/constants";
import {ArrowLeft} from "lucide-react";
import {useLocation, useNavigate} from "react-router";
import {
  useCreateOrUpdateActivityLogMutation,
  useGetSingleActivityLogQuery,
  useSubmitActivityLogNotesMutation
} from "@/pages/userPanel/notes/api";
import {toast} from "sonner";

type MealType = "breakfast" | "lunch" | "dinner";

export default function RespiteLogPage() {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [medication, setMedication] = useState("");
  const [medicationTime, setMedicationTime] = useState<"AM" | "PM" | "">("");
  const [selectedMeals, setSelectedMeals] = useState<MealType[]>(["breakfast"]);
  const [activities, setActivities] = useState("");
  const [comments, setComments] = useState("");
  const [toileting, setToileting] = useState("");
  const [healthConcerns, setHealthConcerns] = useState("");
  const [suppliesNeeded, setSuppliesNeeded] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<string>("");

  const toggleMeal = (meal: MealType) => {
    setSelectedMeals((prev) =>
      prev.includes(meal) ? prev.filter((m) => m !== meal) : [...prev, meal]
    );
  };

  const navigate = useNavigate();
  const activityLogId = new URLSearchParams(useLocation().search).get("id");
  const [mutateNote] = useCreateOrUpdateActivityLogMutation();
  const [submitNotes, {isLoading: isSubmitting}] = useSubmitActivityLogNotesMutation();
  const {data: activityLog, isLoading} = useGetSingleActivityLogQuery(activityLogId!, {
    skip: !activityLogId
  });

  const handleSave = async () => {
    if (!date) {
      toast.error("Date is required.");
      return;
    }
    try {
      await mutateNote({
        activityLog: activityLogId!,
        data: {
          id: selectedActivity,
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
      toast.success("Respite Log saved successfully!");
    } catch (error) {    }
  };

  const handleSubmit = async () => {
    if (!date) {
      toast.error("Date is required.");
      return;
    }
    try {
      const {data} = await mutateNote({
        activityLog: activityLogId!,
        data: {
          id: selectedActivity,
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
      await submitNotes({
        activityLog: activityLogId!,
        logNoteIds: [data.id]
      }).unwrap();
      toast.success("Respite Log submitted successfully!");
      setDate(undefined);
      setMedication("");
      setMedicationTime("");
      setSelectedMeals([]);
      setActivities("");
      setComments("");
      setHealthConcerns("");
      setSuppliesNeeded("");
      setToileting("");
      setSelectedActivity("");
    } catch (error) {    }
  };

  useEffect(() => {
    if (activityLog && activityLog.notes.length > 0) {
      const note = activityLog.notes[activityLog.notes.length - 1];
      setDate(note?.startDate ? new Date(note.startDate) : undefined);
      setMedication(note?.metadata?.medication ?? "");
      setMedicationTime(note?.metadata?.medicationTime ?? "");
      setSelectedMeals(note?.metadata?.meals ?? []);
      setActivities(note?.metadata?.activities ?? "");
      setComments(note?.metadata?.comments ?? "");
      setHealthConcerns(note?.metadata?.healthConcerns ?? "");
      setSuppliesNeeded(note?.metadata?.suppliesNeeded ?? "");
      setSelectedActivity(note.id);
      setToileting(note?.metadata?.toileting ?? "");
    }
  }, [activityLog]);

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

  return (
    <VoiceRecordingProvider pageTitle="Respite Log">
      <div className="min-h-[calc(100vh-200px)] pb-20">
        {/* Page Header */}
        <div className="mb-3 flex justify-between items-center">
          <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a] font-['Urbanist',sans-serif]">
            Notes
          </h1>
          <Button
            onClick={() => navigate(Routes.userPanel.notes.index)}
            className="flex items-center gap-2 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-6 py-3 h-auto font-semibold shadow-sm"
          >
            <ArrowLeft className="w-5 h-5"/>
            Back to Notes
          </Button>
        </div>

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
                value={activityLog?.metadata?.individual ?? ""}
                disabled={true}
                className="h-11 bg-white border border-[#cccccd] rounded-xl px-4"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
                Service Code
              </label>
              <Input
                type="text"
                value={activityLog?.metadata?.serviceCode ?? ""}
                disabled={true}
                className="h-11 bg-white border border-[#cccccd] rounded-xl px-4 text-[#b2b2b3]"
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
                className="h-11 bg-white border border-[#cccccd] rounded-xl px-4"
              />
            </div>
          </div>

          {/* Row 2: Date, Medication with AM/PM */}
          <div className="grid grid-cols-3 gap-[18px]">
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
                Date
              </label>
              <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
                <PopoverTrigger asChild>
                  <button type="button" className="w-full focus:outline-none">
                    <InputGroup className="h-11 bg-white border border-[#cccccd] rounded-xl px-4">
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
                    onSelect={(selectedDate) => {
                      if (selectedDate) {
                        setDate(selectedDate);
                        setIsDateOpen(false);
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
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
                Medication
              </label>
              <Input
                type="text"
                value={medication}
                onChange={(e) => setMedication(e.target.value)}
                className="h-11 bg-white border border-[#cccccd] rounded-xl px-4"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif] opacity-0">
                &nbsp;
              </label>
              <div className="flex gap-[9px] items-center h-11">
                <div className="flex gap-1 items-center">
                  <Radio
                    name="medicationTime"
                    value="AM"
                    checked={medicationTime === "AM"}
                    onChange={(e) => setMedicationTime(e.target.checked ? "AM" : "")}
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
                    onChange={(e) => setMedicationTime(e.target.checked ? "PM" : "")}
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
                className={`px-[10px] py-[6px] rounded-[6px] transition-colors border-[0.5px] ${
                  selectedMeals.includes("breakfast")
                    ? "bg-[#00b4b8] border-[#00b4b8] text-white"
                    : "border-[#808081] text-[#10141a]"
                }`}
              >
              <span className="text-[14px] font-medium leading-[1.4] font-['Urbanist',sans-serif]">
                Breakfast
              </span>
              </button>
              <button
                type="button"
                onClick={() => toggleMeal("lunch")}
                className={`px-[10px] py-[6px] rounded-[6px] transition-colors border-[0.5px] ${
                  selectedMeals.includes("lunch")
                    ? "bg-[#00b4b8] border-[#00b4b8] text-white"
                    : "border-[#808081] text-[#10141a]"
                }`}
              >
              <span className="text-[14px] font-medium leading-[1.4] font-['Urbanist',sans-serif]">
                Lunch
              </span>
              </button>
              <button
                type="button"
                onClick={() => toggleMeal("dinner")}
                className={`px-[10px] py-[6px] rounded-[6px] transition-colors border-[0.5px] ${
                  selectedMeals.includes("dinner")
                    ? "bg-[#00b4b8] border-[#00b4b8] text-white"
                    : "border-[#808081] text-[#10141a]"
                }`}
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
            <VoiceEnabledTextarea
              value={activities}
              onChange={setActivities}
              className="h-[143px] bg-white border border-[#cccccd] rounded-xl px-4 py-3 resize-none"
              placeholder=""
              fieldName="Activities"
              pageTitle="Respite Log"
            />
          </div>

          {/* Comments */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
              Comments:
            </label>
            <VoiceEnabledTextarea
              value={comments}
              onChange={setComments}
              className="h-[143px] bg-white border border-[#cccccd] rounded-xl px-4 py-3 resize-none"
              placeholder=""
              fieldName="Comments"
              pageTitle="Respite Log"
            />
          </div>

          {/* Health Concerns */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
              Health Concerns:
            </label>
            <VoiceEnabledTextarea
              value={healthConcerns}
              onChange={setHealthConcerns}
              className="h-[90px] bg-white border border-[#cccccd] rounded-xl px-4 py-3 resize-none"
              placeholder=""
              fieldName="Health Concerns"
              pageTitle="Respite Log"
            />
          </div>

          {/* Supplies Needed Soon */}
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
              Supplies Needed Soon:
            </label>
            <VoiceEnabledTextarea
              value={suppliesNeeded}
              onChange={setSuppliesNeeded}
              className="h-[90px] bg-white border border-[#cccccd] rounded-xl px-4 py-3 resize-none"
              placeholder=""
              fieldName="Supplies Needed Soon"
              pageTitle="Respite Log"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-[16px] items-center pt-[10px]">
            <button
              type="button"
              onClick={handleSave}
              className="bg-[#b2b2b3] backdrop-blur-[22px] rounded-[60px] px-[8px] py-[8px] w-[71px] flex items-center justify-center"
            >
            <span className="text-[12px] font-semibold leading-[1.4] text-white font-['Urbanist',sans-serif]">
              Save
            </span>
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="cursor-pointer bg-[#00b4b8] backdrop-blur-[22px] rounded-[60px] px-[8px] py-[8px] w-[71px] flex items-center justify-center"
            >
            <span className="text-[12px] font-semibold leading-[1.4] text-white font-['Urbanist',sans-serif]">
              {isSubmitting ? "Submitting..." : "Submit"}
            </span>
            </button>
          </div>
        </div>

        {/* Floating Action Button */}
        <VoiceInputButton/>
      </div>
    </VoiceRecordingProvider>
  );
}

