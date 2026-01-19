import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { createIncident, CreateIncidentPayload } from "@/lib/api/incidents";
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
  const [clientId, setClientId] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState("12:00");
  const [whatHappened, setWhatHappened] = useState("");
  const [actionsTaken, setActionsTaken] = useState("");
  const [whatDidYouDo, setWhatDidYouDo] = useState("");
  const [witness, setWitness] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Client search state
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [clients, setClients] = useState<any[]>([]);

  // For simplicity, mock client data - replace with actual API call
  useEffect(() => {
    // TODO: Fetch user's assigned clients from API
    // For now using mock data
    setClients([
      { id: "1", firstName: "John", lastName: "Doe" },
      { id: "2", firstName: "Jane", lastName: "Smith" },
      { id: "3", firstName: "Robert", lastName: "Johnson" },
    ]);
  }, []);

  const filteredClients = clients.filter((client) =>
    `${client.firstName} ${client.lastName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const handleClientSelect = (client: any) => {
    setClientName(`${client.firstName} ${client.lastName}`);
    setClientId(client.id);
    setShowClientSearch(false);
    setSearchQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!clientId) {
      toast({
        title: "Client Required",
        description: "Please select a client",
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

    if (!user?.id || !user?.agencyId) {
      toast({
        title: "Authentication Error",
        description: "User not properly authenticated",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Combine date and time
      const [hours, minutes] = time.split(":");
      const incidentDate = new Date(date);
      incidentDate.setHours(parseInt(hours), parseInt(minutes));
      const incidentDateTime = incidentDate.toISOString();

      const payload: CreateIncidentPayload = {
        agencyId: user.agencyId,
        employeeId: user.id,
        clientId: clientId,
        incidentDate: incidentDateTime,
        whatHappened: whatHappened.trim(),
        actionsTaken: actionsTaken.trim(),
        staffAction: whatDidYouDo.trim(),
        witness: witness.trim(),
      };

      const response = await createIncident(payload);

      if (response.success) {
        toast({
          title: "Incident Reported",
          description: "Your incident report has been submitted successfully",
        });

        // Reset form
        setClientName("");
        setClientId("");
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
          <div className="relative">
            <div
              onClick={() => setShowClientSearch(!showClientSearch)}
              className="w-full px-4 py-3 h-11 border border-[#cccccd] rounded-xl bg-white text-[14px] sm:text-[15px] text-[#10141a] cursor-pointer hover:border-[#00b8d4] transition-colors flex items-center justify-between"
            >
              <span className={clientName ? "text-[#10141a]" : "text-[#b2b2b3]"}>
                {clientName || "Search"}
              </span>
              <Search className="w-5 h-5 text-[#808081]" />
            </div>

            {/* Dropdown Search */}
            {showClientSearch && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-[#e5e7eb] rounded-lg shadow-lg max-h-[200px] overflow-y-auto">
                <div className="p-2 border-b border-[#e5e7eb]">
                  <Input
                    type="text"
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="max-h-[150px] overflow-y-auto">
                  {filteredClients.length > 0 ? (
                    filteredClients.map((client) => (
                      <div
                        key={client.id}
                        onClick={() => handleClientSelect(client)}
                        className="px-4 py-2 text-[14px] hover:bg-[#f3f4f6] cursor-pointer"
                      >
                        {client.firstName} {client.lastName}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-[14px] text-[#6b7280]">
                      No clients found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
        <div className="mb-8">
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
        <div>
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
