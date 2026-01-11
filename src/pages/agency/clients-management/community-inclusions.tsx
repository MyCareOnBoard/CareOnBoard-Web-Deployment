import React, { useState, useCallback, useRef, useEffect } from "react";
import { Clock, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import TimePicker from "@/components/TimePicker";
import { searchClients, Client } from "@/lib/api/clients";
import { useAuth } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";
import { createCommunityInclusion, type Attendee } from "@/lib/api/community-inclusions";

interface AttendanceRow {
  id: string;
  name: string;
  signIn: string;
  signOut: string;
}

export default function CommunityInclusionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([
    { id: "1", name: "", signIn: "", signOut: "" },
    { id: "2", name: "", signIn: "", signOut: "" },
    { id: "3", name: "", signIn: "", signOut: "" },
    { id: "4", name: "", signIn: "", signOut: "" },
    { id: "5", name: "", signIn: "", signOut: "" },
    { id: "6", name: "", signIn: "", signOut: "" },
  ]);

  // Client search states
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState<Client[]>([]);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clientSearchTimeoutRef.current) {
        clearTimeout(clientSearchTimeoutRef.current);
      }
    };
  }, []);

  const handleInputChange = (
    id: string,
    field: keyof AttendanceRow,
    value: string
  ) => {
    setAttendanceRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleSave = async () => {
    try {
      // Validate client selection
      if (!clientId) {
        toast({
          title: "Validation Error",
          description: "Please select a client before saving.",
          variant: "destructive",
        });
        return;
      }

      // Filter out empty rows and validate
      const validAttendees = attendanceRows.filter(
        (row) => row.name.trim() && row.signIn && row.signOut
      );

      if (validAttendees.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please add at least one attendee with complete information.",
          variant: "destructive",
        });
        return;
      }

      setIsSaving(true);

      // Convert AttendanceRow[] to Attendee[] format expected by API
      const attendees: Attendee[] = validAttendees.map((row) => ({
        id: row.id,
        name: row.name,
        signIn: row.signIn,
        signOut: row.signOut,
      }));

      // Call API to create community inclusion
      await createCommunityInclusion({
        clientId,
        attendees,
      });

      toast({
        title: "Success",
        description: "Community inclusion saved successfully!",
      });

      // Reset form after successful save
      setClientName("");
      setClientId("");
      setAttendanceRows([
        { id: "1", name: "", signIn: "", signOut: "" },
        { id: "2", name: "", signIn: "", signOut: "" },
        { id: "3", name: "", signIn: "", signOut: "" },
        { id: "4", name: "", signIn: "", signOut: "" },
        { id: "5", name: "", signIn: "", signOut: "" },
        { id: "6", name: "", signIn: "", signOut: "" },
      ]);
    } catch (error: any) {
      console.error("Failed to save community inclusion:", error);
      toast({
        title: "Save Failed",
        description:
          error?.response?.data?.message ||
          "Failed to save community inclusion. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAttendee = () => {
    const newId = (attendanceRows.length + 1).toString();
    setAttendanceRows((prev) => [
      { id: newId, name: "", signIn: "", signOut: "" },
      ...prev,
    ]);
  };

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

  const formatLocation = (loc: Client["location"]): string => {
    if (!loc) return "";
    if (typeof loc === "string") return loc;
    if (typeof loc === "object" && "lat" in loc && "lon" in loc) {
      return `${loc.lat}, ${loc.lon}`;
    }
    return "";
  };

  const handleClientSelect = (client: Client) => {
    setClientName(
      client.firstName && client.lastName
        ? `${client.firstName} ${client.lastName}`
        : client.id
    );
    setClientId(client.id);
    setShowClientDropdown(false);
    setClientSearchResults([]);
  };

  // Convert 24-hour format (HH:mm) to display format
  const formatTimeDisplay = (time24h: string): string => {
    if (!time24h) return "";
    
    const [hoursStr, minutes] = time24h.split(":");
    let hours = parseInt(hoursStr);
    const period = hours >= 12 ? "PM" : "AM";
    
    if (hours === 0) {
      hours = 12;
    } else if (hours > 12) {
      hours -= 12;
    }
    
    return `${hours.toString().padStart(2, "0")}:${minutes} ${period}`;
  };

  return (
    <div className="min-h-[calc(100vh-200px)] px-3 sm:px-4 md:px-6 lg:px-0">
      {/* Page Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-[24px] sm:text-[28px] md:text-[32px] lg:text-[40px] font-semibold leading-[1.4] sm:leading-[1.6] text-[#10141a]">
          Client Management
        </h1>
      </div>

      {/* Community Inclusions Card */}
      <div className="relative overflow-hidden rounded-[16px] sm:rounded-[20px] lg:rounded-[30px] border border-[rgba(255,255,255,0.3)] backdrop-blur bg-[rgba(255,255,255,0.3)]">
        <div className="relative p-3 sm:p-4 md:p-[19px]">
          {/* Section Header */}
          <div className="mb-4 sm:mb-[20px]">
            <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-medium leading-[1.4] sm:leading-[1.6] text-[#10141a]">
              Community Inclusions
            </h2>
          </div>

          {/* Client Search Field */}
          <div className="flex flex-col gap-[4px] mb-4 sm:mb-5 md:mb-[22px] relative w-full lg:w-[377px]">
            <label className="text-[11px] sm:text-[12px] font-normal leading-[normal] text-[#10141a]">
              Client
            </label>
            <div className="bg-white border border-[#cccccd] rounded-[10px] sm:rounded-[12px] h-[42px] sm:h-[44px] px-[14px] sm:px-[16px] flex items-center w-full">
              <input
                type="text"
                value={clientName}
                onChange={(e) => {
                  const value = e.target.value;
                  setClientName(value);
                  setClientId("");
                  handleClientSearch(value);
                }}
                placeholder="Search client name..."
                className="flex-1 text-[13px] sm:text-[14px] font-normal text-[#525253] placeholder:text-[#b2b2b3] outline-none bg-transparent"
              />
              {isSearchingClients && (
                <Loader2 className="w-4 h-4 animate-spin text-[#808081]" />
              )}
            </div>
            
            {/* Client Dropdown */}
            {showClientDropdown && clientSearchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#cccccd] rounded-[10px] sm:rounded-xl shadow-lg z-20 max-h-[180px] sm:max-h-[200px] overflow-y-auto">
                {clientSearchResults.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleClientSelect(client)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left hover:bg-gray-50 first:rounded-t-[10px] sm:first:rounded-t-[12px] last:rounded-b-[10px] sm:last:rounded-b-[12px] cursor-pointer border-b border-[#f0f0f0] last:border-b-0"
                  >
                    <p className="text-[13px] sm:text-[14px] font-normal text-black">
                      {client.firstName && client.lastName
                        ? `${client.firstName} ${client.lastName}`
                        : client.id}
                    </p>
                    <p className="text-[11px] sm:text-[12px] font-normal text-[#808081] truncate">
                      {client.address || formatLocation(client.location)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* List of Attendees Label with Add Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-5 md:mb-[22px]">
            <p className="text-[12px] sm:text-[13px] md:text-[14px] font-medium leading-[1.4] text-[#808081]">
              List of Attendees
            </p>
            <button
              onClick={handleAddAttendee}
              className="flex items-center justify-center gap-2 h-[42px] sm:h-[44px] px-4 rounded-[60px] border border-[#00b4b8] text-[#00b4b8] text-[13px] sm:text-[14px] font-semibold hover:bg-[#00b4b8] hover:text-white transition-colors cursor-pointer w-full sm:w-auto active:scale-95"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Add Attendee
            </button>
          </div>

          {/* Attendance Form */}
          <div className="space-y-4 sm:space-y-5 md:space-y-[22px]">
            {attendanceRows.map((row, index) => (
              <div key={row.id}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[377px_351px_351px] gap-3 sm:gap-3.5 md:gap-[14px] items-end">
                  {/* Name Field */}
                  <div className="flex flex-col gap-[4px] sm:col-span-2 lg:col-span-1">
                  <label className="text-[11px] sm:text-[12px] font-normal leading-[normal] text-[#10141a]">
                    Name
                  </label>
                  <Input
                    value={row.name}
                    onChange={(e) =>
                      handleInputChange(row.id, "name", e.target.value)
                    }
                    placeholder="Enter attendee name"
                    className="h-[42px] sm:h-[44px] rounded-[10px] sm:rounded-[12px] border border-[#cccccd] bg-white px-[14px] sm:px-[16px] text-[13px] sm:text-[14px] font-normal text-[#525253] placeholder:text-[#b2b2b3] focus-visible:ring-1 focus-visible:ring-[#00b4b8]"
                  />
                </div>

                {/* Sign In Field */}
                <div className="flex flex-col gap-[4px]">
                  <label className="text-[11px] sm:text-[12px] font-normal leading-[normal] text-[#10141a]">
                    Sign In
                  </label>
                  <TimePicker
                    value={row.signIn}
                    onChange={(time24h) => handleInputChange(row.id, "signIn", time24h)}
                  >
                    <div className="relative h-[42px] sm:h-[44px] rounded-[10px] sm:rounded-[12px] border border-[#cccccd] bg-white px-[14px] sm:px-[16px] pr-[40px] sm:pr-[44px] flex items-center cursor-pointer hover:border-[#00b4b8] transition-colors active:border-[#00b4b8]">
                      <span className="text-[13px] sm:text-[14px] font-normal text-[#525253] truncate">
                        {row.signIn ? formatTimeDisplay(row.signIn) : "Select time"}
                      </span>
                      <Clock className="absolute right-[12px] sm:right-[16px] top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-[#808081]" />
                    </div>
                  </TimePicker>
                </div>

                {/* Sign Out Field */}
                <div className="flex flex-col gap-[4px]">
                  <label className="text-[11px] sm:text-[12px] font-normal leading-[normal] text-[#10141a]">
                    Sign Out
                  </label>
                  <TimePicker
                    value={row.signOut}
                    onChange={(time24h) => handleInputChange(row.id, "signOut", time24h)}
                  >
                    <div className="relative h-[42px] sm:h-[44px] rounded-[10px] sm:rounded-[12px] border border-[#cccccd] bg-white px-[14px] sm:px-[16px] pr-[40px] sm:pr-[44px] flex items-center cursor-pointer hover:border-[#00b4b8] transition-colors active:border-[#00b4b8]">
                      <span className="text-[13px] sm:text-[14px] font-normal text-[#525253] truncate">
                        {row.signOut ? formatTimeDisplay(row.signOut) : "Select time"}
                      </span>
                      <Clock className="absolute right-[12px] sm:right-[16px] top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-[#808081]" />
                    </div>
                  </TimePicker>
                </div>
                </div>
                
                {/* Divider on mobile/tablet */}
                {index < attendanceRows.length - 1 && (
                  <div className="lg:hidden mt-4 sm:mt-5 border-t border-[rgba(204,204,205,0.3)]" />
                )}
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="mt-5 sm:mt-6 md:mt-[24px]">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="h-[42px] sm:h-[44px] w-full sm:w-[90px] md:w-[80px] rounded-[60px] bg-[#00b4b8] backdrop-blur-[22px] text-[13px] sm:text-[14px] font-semibold text-white hover:bg-[#00a0a3] active:bg-[#008f92] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
