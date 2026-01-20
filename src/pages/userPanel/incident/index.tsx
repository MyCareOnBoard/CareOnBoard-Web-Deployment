import React, { useState, useEffect } from "react";
import { submitUserIncident, CreateUserIncidentPayload } from "@/lib/api/incidents";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/utils/auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import CustomDatePicker from "@/components/ui/datePicker";
import TimePicker from "@/components/TimePicker";

export default function UserIncidentPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Form state
  const [clientName, setClientName] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState("12:00");
  const [whatHappened, setWhatHappened] = useState("");
  const [actionsTaken, setActionsTaken] = useState("");
  const [whatDidYouDo, setWhatDidYouDo] = useState("");
  
  const [witness, setWitness] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!clientName.trim()) {
      toast({
        title: "Client Required",
        description: "Please enter the client name",
        variant: "destructive",
      });
      return;
    }

    if (!date) {
      toast({
        title: "Date Required",
        description: "Please specify when the incident occurred",
        variant: "destructive",
      });
      return;
    }

    if (!whatHappened.trim()) {
      toast({
        title: "Description Required",
        description: "Please describe what happened",
        variant: "destructive",
      });
      return;
    }

    if (!actionsTaken.trim()) {
      toast({
        title: "Actions Required",
        description: "Please describe what actions were taken",
        variant: "destructive",
      });
      return;
    }

    if (!whatDidYouDo.trim()) {
      toast({
        title: "Your Actions Required",
        description: "Please describe what you did",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Format date as YYYY-MM-DD
      const formattedDate = date.toISOString().split('T')[0];

      const payload: CreateUserIncidentPayload = {
        clientName: clientName.trim(),
        date: formattedDate,
        time: time,
        whatHappened: whatHappened.trim(),
        whatActionsTaken: actionsTaken.trim(),
        whatDidYouDo: whatDidYouDo.trim(),
        witness: {
          name: witness.trim(),
          contactInfo: "",
          relationship: "",
        },
      };

      const response = await submitUserIncident(payload);

      if (response.success) {
        toast({
          title: "Incident Reported",
          description: "Your incident report has been submitted successfully",
        });

        // Reset form
        setClientName("");
        setDate(null);
        setTime("12:00");
        setWhatHappened("");
        setActionsTaken("");
        setWhatDidYouDo("");
        setWitness("");
      }
    } catch (error: any) {
      console.error("Error submitting incident:", error);
      toast({
        title: "Submission Failed",
        description: error?.response?.data?.message || "Failed to submit incident report",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-0">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-[28px] sm:text-[32px] lg:text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Incident
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 bg-white shadow-sm rounded-xl sm:rounded-2xl sm:p-8 lg:p-10">
        {/* Client Name */}
        <div className="mb-6">
          <Label className="block text-[14px] sm:text-[15px] font-medium text-[#6b7280] mb-2">
            Client Name
          </Label>
          <Input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Enter client name..."
          />
        </div>

        {/* Date and Time Row */}
        <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 sm:gap-6">
          {/* Date */}
          <div>
            <Label className="block text-[14px] sm:text-[15px] font-medium text-[#6b7280] mb-2">
              Date
            </Label>
            <CustomDatePicker
              date={date}
              setDate={setDate}
              placeholder="Select date"
              endMonth={new Date()}
            />
          </div>

          {/* Time */}
          <div>
            <Label className="block text-[14px] sm:text-[15px] font-medium text-[#6b7280] mb-2">
              Time
            </Label>
            <TimePicker value={time} onChange={setTime}>
              <Input
                type="text"
                value={time}
                readOnly
                placeholder="Select time"
                className="cursor-pointer"
              />
            </TimePicker>
          </div>
        </div>

        {/* What Happened */}
        <div className="mb-6">
          <Label className="block text-[14px] sm:text-[15px] font-medium text-[#6b7280] mb-2">
            What Happened
          </Label>
          <Textarea
            value={whatHappened}
            onChange={(e) => setWhatHappened(e.target.value)}
            className="min-h-[120px]"
            placeholder="Describe what happened..."
          />
        </div>

        {/* What Actions were taken */}
        <div className="mb-6">
          <Label className="block text-[14px] sm:text-[15px] font-medium text-[#6b7280] mb-2">
            What Actions were taken?
          </Label>
          <Textarea
            value={actionsTaken}
            onChange={(e) => setActionsTaken(e.target.value)}
            className="min-h-[120px]"
            placeholder="Describe the actions taken..."
          />
        </div>

        {/* What did you do */}
        <div className="mb-6">
          <Label className="block text-[14px] sm:text-[15px] font-medium text-[#6b7280] mb-2">
            What did you do?
          </Label>
          <Textarea
            value={whatDidYouDo}
            onChange={(e) => setWhatDidYouDo(e.target.value)}
            className="min-h-[120px]"
            placeholder="Describe your actions..."
          />
        </div>

        {/* Witness */}
        <div className="mb-6">
          <Label className="block text-[14px] sm:text-[15px] font-medium text-[#6b7280] mb-2">
            Witness
          </Label>
          <Input
            type="text"
            value={witness}
            onChange={(e) => setWitness(e.target.value)}
            placeholder="Enter witness name..."
          />
        </div>

        {/* Submit Button */}
        <div className="mt-8">
          <Button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 bg-[#00b8d4] text-white text-[15px] sm:text-[16px] font-medium rounded-lg hover:bg-[#00a5c0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </form>
    </div>
  );
}
