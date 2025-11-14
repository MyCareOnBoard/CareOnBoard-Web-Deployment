import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Radio } from "@/components/ui/radio";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import CalendarDaysIcon from "@/assets/icons/calendar-days.svg?react";
import { format } from "date-fns";

type MealType = "breakfast" | "lunch" | "dinner";

export default function RespiteLogPage() {
  const [respiteLogFor, setRespiteLogFor] = useState("");
  const [serviceCode] = useState("TDHJ/3421");
  const [toileting, setToileting] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [medication, setMedication] = useState("");
  const [medicationTime, setMedicationTime] = useState<"AM" | "PM" | "">("");
  const [selectedMeals, setSelectedMeals] = useState<MealType[]>(["breakfast"]);
  const [activities, setActivities] = useState("");
  const [comments, setComments] = useState("");
  const [healthConcerns, setHealthConcerns] = useState("");
  const [suppliesNeeded, setSuppliesNeeded] = useState("");

  const toggleMeal = (meal: MealType) => {
    setSelectedMeals((prev) =>
      prev.includes(meal) ? prev.filter((m) => m !== meal) : [...prev, meal]
    );
  };

  const handleSave = () => {
    console.log("Saving form...");
  };

  const handleSubmit = () => {
    console.log("Submitting form...");
  };

  return (
    <div className="min-h-[calc(100vh-200px)] pb-20">
      {/* Page Header */}
      <div className="mb-3">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a] font-['Urbanist',sans-serif]">
          Notes
        </h1>
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
              value={respiteLogFor}
              onChange={(e) => setRespiteLogFor(e.target.value)}
              className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
              Service Code
            </label>
            <Input
              type="text"
              value={serviceCode}
              disabled
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
                      <CalendarDaysIcon className="h-5 w-5 text-[#808081]" />
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
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
              Medication
            </label>
            <Input
              type="text"
              value={medication}
              onChange={(e) => setMedication(e.target.value)}
              className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif] opacity-0">
              &nbsp;
            </label>
            <div className="flex gap-[9px] items-center h-[44px]">
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
          <Textarea
            value={activities}
            onChange={(e) => setActivities(e.target.value)}
            className="h-[143px] bg-white border border-[#cccccd] rounded-[12px] px-4 py-3 resize-none"
            placeholder=""
          />
        </div>

        {/* Comments */}
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
            Comments:
          </label>
          <Textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="h-[143px] bg-white border border-[#cccccd] rounded-[12px] px-4 py-3 resize-none"
            placeholder=""
          />
        </div>

        {/* Health Concerns */}
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
            Health Concerns:
          </label>
          <Textarea
            value={healthConcerns}
            onChange={(e) => setHealthConcerns(e.target.value)}
            className="h-[90px] bg-white border border-[#cccccd] rounded-[12px] px-4 py-3 resize-none"
            placeholder=""
          />
        </div>

        {/* Supplies Needed Soon */}
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-normal leading-[normal] text-[#10141a] font-['Urbanist',sans-serif]">
            Supplies Needed Soon:
          </label>
          <Textarea
            value={suppliesNeeded}
            onChange={(e) => setSuppliesNeeded(e.target.value)}
            className="h-[90px] bg-white border border-[#cccccd] rounded-[12px] px-4 py-3 resize-none"
            placeholder=""
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
            onClick={handleSubmit}
            className="bg-[#00b4b8] backdrop-blur-[22px] rounded-[60px] px-[8px] py-[8px] w-[71px] flex items-center justify-center"
          >
            <span className="text-[12px] font-semibold leading-[1.4] text-white font-['Urbanist',sans-serif]">
              Submit
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

