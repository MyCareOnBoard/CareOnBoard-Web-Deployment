import React, { useEffect, useState } from "react";
import { BrainCircuit, Bell, Clock3, X } from "lucide-react";

import TimePicker from "@/components/TimePicker";
import { Button } from "@/components/ui/button";
import CustomDatePicker from "@/components/ui/datePicker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import type { Reminder, ReminderDraft, ReminderRecurrence, ReminderType } from "../types";
import { RECURRENCE_LABELS } from "../types";

const RECURRENCE_OPTIONS: Array<{ value: ReminderRecurrence; label: string }> = [
  { value: "none",     label: "One-time (no repeat)" },
  { value: "daily",    label: "Daily" },
  { value: "weekly",   label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly",  label: "Monthly" },
];

interface ReminderModalProps {
  open: boolean;
  reminder?: Reminder | null;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: ReminderDraft) => void;
  isSaving?: boolean;
}

function toLocalDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultDateTime() {
  const nextHour = new Date();
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  return {
    date: toLocalDateInput(nextHour),
    time: `${String(nextHour.getHours()).padStart(2, "0")}:00`,
  };
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

const TYPE_OPTIONS: Array<{ value: ReminderType; label: string; icon: React.ReactNode; desc: string }> = [
  {
    value: "normal",
    label: "Normal Reminder",
    icon: <Bell className="h-4 w-4" />,
    desc: "Sends you a notification at the scheduled time",
  },
  {
    value: "ai_prompt",
    label: "AI Prompt",
    icon: <BrainCircuit className="h-4 w-4" />,
    desc: "Runs a Gemini prompt and delivers the result as a notification",
  },
];

export default function ReminderModal({
  open,
  reminder,
  onOpenChange,
  onSave,
  isSaving = false,
}: ReminderModalProps) {
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

  const isAiPrompt = type === "ai_prompt";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(580px,calc(100vw-32px))] rounded-[24px] border border-[#e5e7eb] bg-white p-6"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-[22px] font-bold leading-tight text-[#10141a]">
                {reminder ? "Edit reminder" : "Add reminder"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-[14px] text-[#6b7280]">
                {reminder
                  ? "Update the type, message, or schedule for this reminder."
                  : "Choose a type and schedule for your reminder."}
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eff2f3] transition-colors hover:bg-[#e0e3e4]"
              aria-label="Close reminder form"
            >
              <X className="h-4 w-4 text-[#10141a]" />
            </button>
          </div>

          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setType(opt.value);
                  setMessage("");
                  setError("");
                }}
                disabled={!!reminder}
                className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  type === opt.value
                    ? "border-[#00b4b8] bg-[#f0fbfb] text-[#008f93]"
                    : "border-[#e5e7eb] text-[#6b7280] hover:border-[#cccccd]"
                }`}
              >
                <span className={`mt-0.5 shrink-0 ${type === opt.value ? "text-[#00b4b8]" : "text-[#9ca3af]"}`}>
                  {opt.icon}
                </span>
                <div>
                  <p className={`text-[13px] font-semibold ${type === opt.value ? "text-[#008f93]" : "text-[#10141a]"}`}>
                    {opt.label}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-[#9ca3af]">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label htmlFor="reminder-message" className="text-[14px] font-semibold text-[#10141a]">
              {isAiPrompt ? "AI Prompt" : "Reminder message"}
            </label>
            <Textarea
              id="reminder-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={
                isAiPrompt
                  ? "e.g. Generate a weekly care summary for my agency"
                  : "What do you need to remember?"
              }
              rows={5}
              className="min-h-[120px] resize-none rounded-xl border-[#cccccd] bg-white px-4 py-3 text-[14px] text-[#10141a] focus-visible:border-[#00b4b8] focus-visible:ring-[#00b4b8]/20"
              autoFocus
            />
            {isAiPrompt && (
              <p className="text-[12px] text-[#9ca3af]">
                Gemini will run this prompt at the scheduled time and deliver the result as a notification.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="reminder-date" className="text-[14px] font-semibold text-[#10141a]">
                Date
              </label>
              <CustomDatePicker
                date={fromDateInput(date)}
                setDate={(selectedDate) => setDate(selectedDate ? toLocalDateInput(selectedDate) : "")}
                placeholder="Select date"
                startMonth={new Date(2000, 0)}
                endMonth={new Date(2100, 11)}
                className="h-11 min-h-11"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="reminder-time" className="text-[14px] font-semibold text-[#10141a]">
                Time
              </label>
              <TimePicker value={time} onChange={setTime}>
                <button
                  id="reminder-time"
                  type="button"
                  className="relative flex h-11 w-full items-center rounded-xl border border-[#cccccd] bg-white px-4 pr-11 text-left text-[14px] text-[#10141a] transition-colors hover:border-[#00b4b8]"
                >
                  <span className="truncate">{formatTimeDisplay(time)}</span>
                  <Clock3 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#808081]" />
                </button>
              </TimePicker>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="reminder-recurrence" className="text-[14px] font-semibold text-[#10141a]">
              Repeat
            </label>
            <select
              id="reminder-recurrence"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as ReminderRecurrence)}
              className="h-11 w-full rounded-xl border border-[#cccccd] bg-white px-4 text-[14px] text-[#10141a] outline-none focus:border-[#00b4b8] focus:ring-2 focus:ring-[#00b4b8]/20"
            >
              {RECURRENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {recurrence !== "none" && (
              <p className="text-[12px] text-[#9ca3af]">
                This reminder will repeat {RECURRENCE_LABELS[recurrence].toLowerCase()} after each firing.
              </p>
            )}
          </div>

          {error && <p className="text-[13px] font-medium text-[#d53411]">{error}</p>}

          <DialogFooter className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : reminder ? "Save changes" : "Add reminder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
