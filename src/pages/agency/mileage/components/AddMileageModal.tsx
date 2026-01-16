import React, { useState } from "react";
import { X, Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import TimePicker from "@/components/TimePicker";

interface AddMileageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMileageCreated?: () => void;
}

interface MileageFormData {
  client: string;
  assignDsp: string;
  startIn: string;
  dropOff: string;
  selectDate: Date | null;
  selectTime: string;
  schedulingType: "one-time" | "recurring";
}

const initialFormData: MileageFormData = {
  client: "",
  assignDsp: "",
  startIn: "",
  dropOff: "",
  selectDate: null,
  selectTime: "",
  schedulingType: "one-time",
};

export default function AddMileageModal({ isOpen, onClose, onMileageCreated }: AddMileageModalProps) {
  const [formData, setFormData] = useState<MileageFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Calendar days calculation
  const calendarDays = React.useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const weekDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  const handleInputChange = (field: keyof Omit<MileageFormData, 'selectDate' | 'schedulingType'>, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDateSelect = (date: Date) => {
    setFormData((prev) => ({ ...prev, selectDate: date }));
    setShowDatePicker(false);
  };

  // Convert 12-hour format to 24-hour format
  const convertTo24Hour = (time12h: string): string => {
    if (!time12h) return "";
    const match = time12h.match(/(\d{1,2})[.:](\d{2}):?(AM|PM)/i);
    if (!match) return "";
    
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toUpperCase();
    
    if (period === "PM" && hours !== 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, "0")}:${minutes}`;
  };

  // Convert 24-hour format to 12-hour format
  const convertTo12Hour = (time24h: string): string => {
    if (!time24h) return "";
    const [hoursStr, minutes] = time24h.split(":");
    let hours = parseInt(hoursStr);
    const period = hours >= 12 ? "PM" : "AM";
    
    if (hours === 0) {
      hours = 12;
    } else if (hours > 12) {
      hours -= 12;
    }
    
    return `${hours.toString().padStart(2, "0")}:${minutes}:${period}`;
  };

  const handleSchedulingTypeChange = (type: "one-time" | "recurring") => {
    setFormData((prev) => ({ ...prev, schedulingType: type }));
  };

  const handleSaveAndCancel = () => {
    // Save as draft logic
    console.log("Saving as draft:", formData);
    setFormData(initialFormData);
    onClose();
  };

  const handleSchedule = async () => {
    // Validate form
    if (!formData.client || !formData.assignDsp || !formData.startIn || !formData.dropOff || !formData.selectDate || !formData.selectTime) {
      console.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Schedule mileage logic - replace with actual API call
      console.log("Scheduling mileage:", formData);
      
      // Reset form
      setFormData(initialFormData);
      
      // Notify parent component
      if (onMileageCreated) {
        onMileageCreated();
      }
      
      onClose();
    } catch (error) {
      console.error("Failed to schedule mileage:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end pr-8">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-[30px] border border-[rgba(255,255,255,0.3)] w-full max-w-[500px] max-h-[90vh] shadow-xl flex flex-col">
        {/* Title Bar - Fixed */}
        <div className="flex items-center justify-between p-5 pb-0 shrink-0">
          <h2 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
            Add new Mileage
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="bg-[#eff2f3] border border-[rgba(255,255,255,0.3)] rounded-full p-2 hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4 text-[#10141a]" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex flex-col gap-4">
            {/* Client */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Client</label>
              <div className="bg-white border border-[#cccccd] rounded-xl h-11 px-4 flex items-center">
                <input
                  type="text"
                  placeholder="Search client name..."
                  value={formData.client}
                  onChange={(e) => handleInputChange("client", e.target.value)}
                  className="flex-1 text-[14px] font-normal text-black placeholder:text-[#b2b2b3] outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Assign DSP */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Assign DSP</label>
              <div className="bg-white border border-[#cccccd] rounded-xl h-11 px-4 flex items-center">
                <input
                  type="text"
                  placeholder="Search DSP name..."
                  value={formData.assignDsp}
                  onChange={(e) => handleInputChange("assignDsp", e.target.value)}
                  className="flex-1 text-[14px] font-normal text-black placeholder:text-[#b2b2b3] outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Start in */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Start in</label>
              <div className="bg-white border border-[#cccccd] rounded-xl h-11 px-4 flex items-center">
                <input
                  type="text"
                  placeholder="Search Location"
                  value={formData.startIn}
                  onChange={(e) => handleInputChange("startIn", e.target.value)}
                  className="flex-1 text-[14px] font-normal text-black placeholder:text-[#b2b2b3] outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Drop Off */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Drop Off</label>
              <div className="bg-white border border-[#cccccd] rounded-xl h-11 px-4 flex items-center">
                <input
                  type="text"
                  placeholder="Search Location"
                  value={formData.dropOff}
                  onChange={(e) => handleInputChange("dropOff", e.target.value)}
                  className="flex-1 text-[14px] font-normal text-black placeholder:text-[#b2b2b3] outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Scheduling Type */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Scheduling Type</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, schedulingType: "one-time" }))}
                  className={`px-2.5 py-1.5 rounded-[6px] text-[14px] font-medium cursor-pointer transition-colors ${
                    formData.schedulingType === "one-time"
                      ? "bg-[#00b4b8] text-white"
                      : "border border-[#808081] text-[#10141a]"
                  }`}
                >
                  One time
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, schedulingType: "recurring" }))}
                  className={`px-2.5 py-1.5 rounded-[6px] text-[14px] font-medium cursor-pointer transition-colors ${
                    formData.schedulingType === "recurring"
                      ? "bg-[#00b4b8] text-white"
                      : "border border-[#808081] text-[#10141a]"
                  }`}
                >
                  Recurring
                </button>
              </div>
            </div>

            {/* Select Date */}
            <div className="flex flex-col gap-1 relative">
              <label className="text-[12px] font-normal text-[#10141a]">Select Date</label>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`bg-white border rounded-xl h-11 px-4 flex items-center gap-3 cursor-pointer ${
                  showDatePicker ? "border-[#2b82ff]" : "border-[#b2b2b3]"
                }`}
              >
                <span className={`flex-1 text-left text-[14px] font-normal ${formData.selectDate ? "text-[#10141a]" : "text-[#b2b2b3]"}`}>
                  {formData.selectDate ? format(formData.selectDate, "d MMMM") : "Select date"}
                </span>
                <Calendar className="w-5 h-5 text-[#10141a]" />
              </button>

              {/* Date Picker Dropdown */}
              {showDatePicker && (
                <div className="absolute top-full right-0 mt-1 bg-white rounded-xl border border-[#cccccd] z-10 overflow-hidden w-[320px]">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-center gap-2.5 px-5 py-2">
                    <button
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="w-5 h-5 flex items-center justify-center hover:bg-gray-100 rounded cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5 text-[#808081]" />
                    </button>
                    <span className="flex-1 text-[16px] font-semibold leading-[1.6] text-[#10141a] text-center">
                      {format(currentMonth, "MMMM yyyy")}
                    </span>
                    <button
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="w-5 h-5 flex items-center justify-center hover:bg-gray-100 rounded cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5 text-[#10141a]" />
                    </button>
                  </div>
                  {/* Divider */}
                  <div className="h-px bg-[#e5e5e6] w-full" />
                  {/* Week Days */}
                  <div className="flex items-center justify-center pt-2 w-full">
                    {weekDays.map((day) => (
                      <div key={day} className="flex-1 px-2 py-0.5 text-center text-[12px] font-medium text-[#10141a]">
                        {day}
                      </div>
                    ))}
                  </div>
                  {/* Calendar Grid */}
                  <div className="flex flex-col w-full pb-2">
                    {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, weekIndex) => (
                      <div key={weekIndex} className="flex items-center justify-center py-1 w-full">
                        {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => {
                          const isCurrentMonth = isSameMonth(day, currentMonth);
                          const isSelected = formData.selectDate && isSameDay(day, formData.selectDate);

                          return (
                            <button
                              key={dayIndex}
                              onClick={() => handleDateSelect(day)}
                              className={`
                                flex-1 flex items-center justify-center p-2 text-center transition-colors cursor-pointer
                                ${isSelected 
                                  ? "bg-[#2B82FF] text-white rounded-[6px] font-semibold" 
                                  : isCurrentMonth 
                                    ? "text-[#10141a] font-medium hover:bg-[#e5e5e6] hover:rounded-[6px]" 
                                    : "text-[#b2b2b3] font-medium hover:bg-[#f0f0f0] hover:rounded-[6px]"
                                }
                              `}
                            >
                              <span className="text-[14px] leading-[1.4]">
                                {format(day, "d")}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Select Time */}
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">Select Time</label>
              <TimePicker
                value={convertTo24Hour(formData.selectTime)}
                onChange={(time24h) => {
                  const time12h = convertTo12Hour(time24h);
                  setFormData((prev) => ({ ...prev, selectTime: time12h }));
                }}
              >
                <div className="bg-white border border-[#cccccd] rounded-xl h-11 px-4 flex items-center gap-3 cursor-pointer">
                  <span className={`flex-1 text-[14px] font-normal ${formData.selectTime ? "text-black" : "text-[#b2b2b3]"}`}>
                    {formData.selectTime || "Enter Time"}
                  </span>
                  <Clock className="w-5 h-5 text-[#10141a]" />
                </div>
              </TimePicker>
            </div>
          </div>
        </div>

        {/* Footer Buttons - Fixed */}
        <div className="flex gap-3 p-5 pt-0 shrink-0">
          <Button
            onClick={handleSaveAndCancel}
            disabled={isSubmitting}
            className="flex-1 h-11 bg-transparent hover:bg-[#f3f4f6] text-[#6b7280] hover:text-[#374151] border border-[#e5e7eb] rounded-xl text-[14px] font-medium transition-colors shadow-none"
          >
            Save and Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={isSubmitting}
            className="flex-1 h-11 bg-[#00b4b8] hover:bg-[#009ba1] text-white rounded-xl text-[14px] font-medium transition-colors shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Scheduling..." : "Schedule"}
          </Button>
        </div>
      </div>
    </div>
  );
}
