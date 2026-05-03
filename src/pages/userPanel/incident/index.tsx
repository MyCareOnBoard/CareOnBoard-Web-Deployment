import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  submitUserIncident, 
  CreateUserIncidentPayload 
} from "@/lib/api/incidents";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/utils/auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import CustomDatePicker from "@/components/ui/datePicker";
import TimePicker from "@/components/TimePicker";
import { searchClients, Client } from "@/lib/api/clients";
import { Loader2 } from "lucide-react";

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

  // Client search state
  const [clientSearchResults, setClientSearchResults] = useState<Client[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const clientSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search clients with debouncing
  const handleClientSearch = useCallback(async (query: string) => {
    // Clear existing timeout
    if (clientSearchTimeoutRef.current) {
      clearTimeout(clientSearchTimeoutRef.current);
    }

    // If query is too short, clear results
    if (query.trim().length < 2) {
      setClientSearchResults([]);
      setShowClientDropdown(false);
      return;
    }

    // Debounce the search
    clientSearchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearchingClients(true);
        const results = await searchClients(query, user?.agencyId);
        setClientSearchResults(results);
        setShowClientDropdown(results.length > 0);
      } catch (error) {
        console.error("Failed to search clients:", error);
        setClientSearchResults([]);
      } finally {
        setIsSearchingClients(false);
      }
    }, 300);
  }, [user?.agencyId]);

  const handleClientSelect = (client: Client) => {
    const fullName = client.firstName && client.lastName 
      ? `${client.firstName} ${client.lastName}` 
      : client.id;
    
    setClientName(fullName);
    setClientId(client.id);
    setShowClientDropdown(false);
    setClientSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!clientName.trim()) {
      toast({
        title: "Client Required",
        description: "Please select a client from the search results",
        variant: "destructive",
      });
      return;
    }

    if (!clientId) {
      toast({
        title: "Client Required",
        description: "Please select a client from the dropdown",
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

      if (!user?.agencyId || !user?.uid) {
        toast({
          title: "User Data Missing",
          description: "Unable to submit. Please log out and log back in.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Format date and time as ISO string
      const incidentDateTime = new Date(date);
      const [hours, minutes] = time.split(':');
      incidentDateTime.setHours(parseInt(hours), parseInt(minutes));

      const payload: CreateUserIncidentPayload = {
        clientName: clientName.trim(),
        clientId: clientId || undefined,
        date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        time: time, // Format as HH:mm
        whatHappened: whatHappened.trim(),
        whatActionsTaken: actionsTaken.trim(),
        whatDidYouDo: whatDidYouDo.trim(),
        witness: {
          name: witness.trim(),
          contactInfo: '', // Add these fields to your form if needed
          relationship: '', // Add these fields to your form if needed
        },
      };

      const response = await submitUserIncident(payload);

      console.log('Create incident response:', response);

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
        setClientSearchResults([]);
        setShowClientDropdown(false);
      }
    } catch (error: any) {
      console.error("Error submitting incident:", error);
      console.error("Error response:", error?.response);
      console.error("Error data:", error?.response?.data);
      toast({
        title: "Submission Failed",
        description: error?.response?.data?.message || error?.message || "Failed to submit incident report",
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
        <div className="relative mb-6">
          <Label className="block text-[14px] sm:text-[15px] font-medium text-[#6b7280] mb-2">
            Client Name
          </Label>
          <div className="relative">
            <Input
              type="text"
              value={clientName}
              onChange={(e) => {
                const value = e.target.value;
                setClientName(value);
                setClientId("");
                handleClientSearch(value);
              }}
              placeholder="Search client name..."
              className="pr-10"
            />
            {isSearchingClients && (
              <div className="absolute -translate-y-1/2 right-3 top-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-[#808081]" />
              </div>
            )}
          </div>
          {/* Client Dropdown */}
          {showClientDropdown && clientSearchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#cccccd] rounded-xl shadow-lg z-20 max-h-[200px] overflow-y-auto">
              {clientSearchResults.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleClientSelect(client)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl cursor-pointer border-b border-[#f0f0f0] last:border-b-0"
                >
                  <p className="text-[14px] font-normal text-black">
                    {client.firstName && client.lastName 
                      ? `${client.firstName} ${client.lastName}` 
                      : client.id}
                  </p>
                  {(client.primaryAddress?.address || client.address) && (
                    <p className="text-[12px] font-normal text-[#808081]">
                      {client.primaryAddress?.address || client.address}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
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
