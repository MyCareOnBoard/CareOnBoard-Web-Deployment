import React, { useEffect, useState } from "react";
import { Clock3, X } from "lucide-react";

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

import type { Reminder, ReminderDraft } from "../types";

interface ReminderModalProps {
  open: boolean;
  reminder?: Reminder | null;
  onOpenChange: (open: boolean) => void;
  onSave: (reminder: ReminderDraft) => void;
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

export default function ReminderModal({
  open,
  reminder,
  onOpenChange,
  onSave,
}: ReminderModalProps) {
  const [message, setMessage] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const defaults = getDefaultDateTime();
    setMessage(reminder?.message ?? "");
    setDate(reminder?.date ?? defaults.date);
    setTime(reminder?.time ?? defaults.time);
    setError("");
  }, [open, reminder]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!message.trim() || !date || !time) {
      setError("Enter a reminder message, date, and time.");
      return;
    }

    onSave({ message: message.trim(), date, time });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[min(560px,calc(100vw-32px))] rounded-[24px] border border-[#e5e7eb] bg-white p-6"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-[22px] font-bold leading-tight text-[#10141a]">
                {reminder ? "Edit reminder" : "Add reminder"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-[14px] text-[#6b7280]">
                {reminder
                  ? "Update the message or schedule for this reminder."
                  : "Choose when you want this reminder to appear."}
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

          <div className="space-y-2">
            <label htmlFor="reminder-message" className="text-[14px] font-semibold text-[#10141a]">
              Reminder message
            </label>
            <Textarea
              id="reminder-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="What do you need to remember?"
              rows={5}
              className="min-h-[120px] resize-none rounded-xl border-[#cccccd] bg-white px-4 py-3 text-[14px] text-[#10141a] focus-visible:border-[#00b4b8] focus-visible:ring-[#00b4b8]/20"
              autoFocus
            />
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

          {error && <p className="text-[13px] font-medium text-[#d53411]">{error}</p>}

          <DialogFooter className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {reminder ? "Save changes" : "Add reminder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
