import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Upload, Check } from "lucide-react";
import ServicesAvatar from "@/assets/icons/services-avatar.png";
import { DSP, Client, ScheduleForm } from "./types";
import { MOCK_CLIENTS, CLOCK_IN_TIMES, CLOCK_OUT_TIMES } from "./mockData";

interface ScheduleModalProps {
  dsp: DSP;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (form: ScheduleForm) => void;
}

export function ScheduleModal({ dsp, isOpen, onClose, onSuccess }: ScheduleModalProps) {
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    client: null,
    service: "",
    serviceCode: "",
    schedulingType: "One time",
    date: "",
    clockInTime: "",
    clockOutTime: "",
    planOfCare: null,
  });

  const filteredClients = MOCK_CLIENTS.filter(client =>
    client.name.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleClientSelect = (client: Client) => {
    setScheduleForm({ ...scheduleForm, client });
    setClientSearchQuery(client.name);
    setShowClientDropdown(false);
  };

  const handleScheduleSubmit = () => {
    if (!scheduleForm.client || !scheduleForm.date || !scheduleForm.clockInTime || !scheduleForm.clockOutTime) return;
    onSuccess(scheduleForm);
    // Reset form
    setScheduleForm({
      client: null,
      service: "",
      serviceCode: "",
      schedulingType: "One time",
      date: "",
      clockInTime: "",
      clockOutTime: "",
      planOfCare: null,
    });
    setClientSearchQuery("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScheduleForm({ ...scheduleForm, planOfCare: file });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-end z-50 pr-6">
      <div className="bg-white rounded-2xl w-full max-w-md h-fit my-6">
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Add new Schedule</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Client Search */}
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-gray-700">Client</Label>
            <div className="relative" ref={searchRef}>
              <Input
                placeholder="Search client name or ID"
                value={clientSearchQuery}
                onChange={(e) => {
                  setClientSearchQuery(e.target.value);
                  setShowClientDropdown(true);
                }}
                onFocus={() => setShowClientDropdown(true)}
                className="h-9 rounded-lg text-xs"
              />
              {showClientDropdown && filteredClients.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredClients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleClientSelect(client)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={client.profileImage || ServicesAvatar} alt={client.name} />
                        <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                          {getInitials(client.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-900">{client.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          DSP Info
          {/* {scheduleForm.client && (
            <div className="p-2.5 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={dsp.profileImage || ServicesAvatar} alt={dsp.fullName} />
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-xs font-medium">
                      {getInitials(dsp.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900 text-xs">{dsp.fullName}</p>
                    <p className="text-[10px] text-gray-500">Assigned DSP</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500">Billing rate</p>
                  <p className="text-xs font-semibold text-gray-900">$25/hr</p>
                </div>
              </div>
            </div>
          )} */}

          {/* Service & Code */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-gray-700">Service</Label>
              <Input
                placeholder="General Assistance"
                value={scheduleForm.service}
                onChange={(e) => setScheduleForm({ ...scheduleForm, service: e.target.value })}
                className="h-9 rounded-lg text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-gray-700">Service Code</Label>
              <Input
                placeholder="Enter code"
                value={scheduleForm.serviceCode}
                onChange={(e) => setScheduleForm({ ...scheduleForm, serviceCode: e.target.value })}
                className="h-9 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Scheduling Type Toggle */}
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-gray-700">Scheduling Type</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setScheduleForm({ ...scheduleForm, schedulingType: "One time" })}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  scheduleForm.schedulingType === "One time"
                    ? "bg-[#00B4B8] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                One time
              </button>
              <button
                onClick={() => setScheduleForm({ ...scheduleForm, schedulingType: "Recurring" })}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  scheduleForm.schedulingType === "Recurring"
                    ? "bg-[#00B4B8] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Recurring
              </button>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-gray-700">Select Date</Label>
            <Input
              type="date"
              value={scheduleForm.date}
              onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
              className="h-9 rounded-lg text-xs "
            />
          </div>

          {/* Clock In Time */}
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-gray-700">Clock In Time</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {CLOCK_IN_TIMES.map((time) => (
                <button
                  key={time}
                  onClick={() => setScheduleForm({ ...scheduleForm, clockInTime: time })}
                  className={`px-1.5 py-1 rounded text-[10px] font-medium transition-colors ${
                    scheduleForm.clockInTime === time
                      ? "bg-[#00B4B8] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Clock Out Time */}
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-gray-700">Clock Out Time</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {CLOCK_OUT_TIMES.map((time) => (
                <button
                  key={time}
                  onClick={() => setScheduleForm({ ...scheduleForm, clockOutTime: time })}
                  className={`px-1.5 py-1 rounded text-[10px] font-medium transition-colors ${
                    scheduleForm.clockOutTime === time
                      ? "bg-[#00B4B8] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Plan of Care Upload */}
          <div className="space-y-1">
            <Label className="text-[11px] font-medium text-gray-700">Plan of care</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                id="planOfCare"
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.doc,.docx"
              />
              <label htmlFor="planOfCare" className="cursor-pointer">
                <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <p className="text-[11px] text-gray-600">
                  {scheduleForm.planOfCare ? scheduleForm.planOfCare.name : "Upload plan of care"}
                </p>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-1.5 border border-gray-300 text-gray-700 text-xs rounded-full hover:bg-gray-50 transition-colors"
            >
              Save and Cancel
            </button>
            <button
              onClick={handleScheduleSubmit}
              disabled={!scheduleForm.client || !scheduleForm.date || !scheduleForm.clockInTime || !scheduleForm.clockOutTime}
              className="flex-1 px-4 py-1.5 bg-[#00B4B8] text-white text-xs rounded-full hover:bg-[#00A0A4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ScheduleSuccessModalProps {
  clientName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ScheduleSuccessModal({ clientName, isOpen, onClose }: ScheduleSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-8 text-center">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Scheduled</h3>
        <p className="text-gray-600 mb-6">
          Your schedule has been successfully created for {clientName}
        </p>
        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-[#00B4B8] text-white rounded-full hover:bg-[#00A0A4] transition-colors"
        >
          Edit Shift
        </button>
      </div>
    </div>
  );
}
