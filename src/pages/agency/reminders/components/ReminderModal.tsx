import React, { useEffect, useState } from "react";
import { Bell, BellRing, BrainCircuit, ChevronDown, Clock3, Loader2, X } from "lucide-react";

import TimePicker from "@/components/TimePicker";
import CustomDatePicker from "@/components/ui/datePicker";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import VoiceEnabledTextarea from "@/components/VoiceEnabledTextarea";
import VoiceInputButton from "@/components/VoiceInputButton";
import { VoiceRecordingProvider } from "@/contexts/VoiceRecordingContext";
import { agencyField, agencyOutlineButton, agencyPrimaryButton } from "@/components/agency/AgencyListKit";
import { cn } from "@/lib/utils";

import type { Reminder, ReminderDraft, ReminderRecurrence, ReminderType } from "../types";
import { RECURRENCE_LABELS } from "../types";

const RECURRENCE_OPTIONS: Array<{ value: ReminderRecurrence; label: string }> = [
  { value: "none", label: "One-time (no repeat)" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
];

interface ReminderModalProps {
  open: boolean;
  reminder?: Reminder | null;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: ReminderDraft) => void;
  isSaving?: boolean;
}

function toLocalDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDefaultDateTime() {
  const nextHour = new Date();
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  return { date: toLocalDateInput(nextHour), time: `${String(nextHour.getHours()).padStart(2, "0")}:00` };
}

function fromDateInput(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatTimeDisplay(value: string) {
  if (!value) return "Select time";
  const [hours, minutes] = value.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${period}`;
}

const TYPE_OPTIONS: Array<{ value: ReminderType; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = [
  { value: "normal", label: "Reminder", icon: Bell, desc: "Sends you a notification at the scheduled time." },
  { value: "ai_prompt", label: "AI prompt", icon: BrainCircuit, desc: "Runs your prompt at the scheduled time and sends you the result." },
];

const label = "mb-1.5 block text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]";

export default function ReminderModal({ open, reminder, onOpenChange, onSave, isSaving = false }: ReminderModalProps) {
  const [type, setType] = useState<ReminderType>("normal");
  const [message, setMessage] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>("none");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const defaults = getDefaultDateTime();
    setType(reminder?.type ?? "normal");
    setMessage(reminder?.message ?? "");
    setDate(reminder?.scheduledDate ?? defaults.date);
    setTime(reminder?.scheduledTime ?? defaults.time);
    setRecurrence(reminder?.recurrence ?? "none");
    setError("");
  }, [open, reminder]);

  const isAiPrompt = type === "ai_prompt";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim() || !date || !time) {
      setError(
        type === "ai_prompt"
          ? "Enter an AI prompt, date, and time."
          : "Enter a reminder message, date, and time."
      );
      return;
    }
    onSave({ type, message: message.trim(), scheduledDate: date, scheduledTime: time, recurrence });
    onOpenChange(false);
  };

  const close = () => onOpenChange(false);

  return (
    <VoiceRecordingProvider pageTitle="Reminder Modal">
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false} className="w-[calc(100vw-32px)] max-w-[580px] gap-0 rounded-[20px] p-0">
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex items-start gap-3.5 border-b border-[#eceef0] px-5 py-4 dark:border-white/10">
              <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#dcdfe2] text-[#007679] dark:border-white/15 dark:text-[#7fd3d3]">
                <BellRing className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-[22px] font-medium leading-tight">{reminder ? "Edit reminder" : "Add reminder"}</DialogTitle>
                <DialogDescription className="mt-0.5 text-[14px] leading-normal text-[#4b535b]">
                  {reminder ? "Change the message or when it is sent." : "Choose a type and when it should be sent."}
                </DialogDescription>
              </div>
              <button type="button" onClick={close} aria-label="Close reminder form"
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border border-[#dcdfe2] text-[#4b535b] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:opacity-50 dark:border-white/15 dark:text-[#c9d1d4]">
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(100vh-220px)] space-y-4 overflow-y-auto px-5 py-5">
              <fieldset>
                <legend className={label}>Type{reminder && <span className="font-normal text-[#6b737a]"> (can't be changed)</span>}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TYPE_OPTIONS.map(({ value, label: text, icon: Icon, desc }) => {
                    const on = type === value;
                    return (
                      <button key={value} type="button" aria-pressed={on} disabled={!!reminder}
                        onClick={() => { setType(value); setMessage(""); setError(""); }}
                        className={cn(
                          "flex items-start gap-3 rounded-[12px] border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed",
                          on ? "border-[#007679] bg-[#007679]/5" : "border-[#dcdfe2] hover:bg-[#f8f9fa] disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/5",
                        )}>
                        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", on ? "bg-[#007679] text-white" : "bg-[#f4f5f6] text-[#4b535b] dark:bg-white/10 dark:text-[#c9d1d4]")}>
                          <Icon aria-hidden="true" className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{text}</span>
                          <span className="mt-0.5 block text-[12px] leading-snug text-[#4b535b] dark:text-[#9aa4a8]">{desc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div>
                <label htmlFor="reminder-message" className={label}>{isAiPrompt ? "Prompt" : "Message"}</label>
                <VoiceEnabledTextarea
                  id="reminder-message"
                  value={message}
                  onChange={setMessage}
                  placeholder={isAiPrompt ? "e.g. Generate a weekly care summary for my agency" : "What do you need to remember?"}
                  rows={4}
                  className={cn(agencyField, "min-h-[110px] resize-none py-2.5")}
                />
                {isAiPrompt && (
                  <p className="mt-1.5 text-[12px] text-[#4b535b] dark:text-[#9aa4a8]">Gemini runs this prompt at the scheduled time and sends you the result as a notification.</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="reminder-date" className={label}>Date</label>
                  <CustomDatePicker
                    date={fromDateInput(date)}
                    setDate={(selected) => setDate(selected ? toLocalDateInput(selected) : "")}
                    placeholder="Select date"
                    startMonth={new Date(2000, 0)}
                    endMonth={new Date(2100, 11)}
                    className="h-11 min-h-11 rounded-[10px]"
                  />
                </div>
                <div>
                  <label htmlFor="reminder-time" className={label}>Time</label>
                  <TimePicker value={time} onChange={setTime}>
                    <button id="reminder-time" type="button" className={cn(agencyField, "relative flex h-11 items-center pr-11 text-left")}>
                      <span className="truncate">{formatTimeDisplay(time)}</span>
                      <Clock3 aria-hidden="true" className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4b535b]" />
                    </button>
                  </TimePicker>
                </div>
              </div>

              <div>
                <label htmlFor="reminder-recurrence" className={label}>Repeat</label>
                <div className="relative">
                  <select id="reminder-recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value as ReminderRecurrence)}
                    className={cn(agencyField, "h-11 cursor-pointer appearance-none pr-9")}>
                    {RECURRENCE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                  <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4b535b]" />
                </div>
                {recurrence !== "none" && (
                  <p className="mt-1.5 text-[12px] text-[#4b535b] dark:text-[#9aa4a8]">Repeats {RECURRENCE_LABELS[recurrence].toLowerCase()} after each time it is sent.</p>
                )}
              </div>

              {error && (
                <p role="alert" className="rounded-[10px] border border-[#f5c2bd] bg-[#fdf3f2] px-3.5 py-2.5 text-[13px] text-[#b42318] dark:border-[#ef4444]/30 dark:bg-[#ef4444]/10 dark:text-[#f8a1a1]">{error}</p>
              )}
            </div>

            <div className="flex justify-end gap-2.5 border-t border-[#eceef0] px-5 py-4 dark:border-white/10">
              <button type="button" onClick={close} disabled={isSaving} className={agencyOutlineButton}>Cancel</button>
              <button type="submit" disabled={isSaving} className={agencyPrimaryButton}>
                {isSaving && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                {isSaving ? "Saving…" : reminder ? "Save changes" : "Add reminder"}
              </button>
            </div>
          </form>
          <VoiceInputButton />
        </DialogContent>
      </Dialog>
    </VoiceRecordingProvider>
  );
}
