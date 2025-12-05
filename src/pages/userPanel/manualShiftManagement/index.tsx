import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, ArrowLeft, MapPin, Save, Send, Loader2 } from "lucide-react";
import TimesheetWeek from "./components/TimesheetWeek";
import ConfirmShiftModal from "./components/ConfirmShiftModal";
import SuccessModal from "./components/SuccessModal";
import { useToast } from "@/hooks/use-toast";
import { Routes } from "@/routes/constants";
import DigitalSignatureModal from "@/pages/applicant/application/components/DigitalSignature";
import { createShift, CreateShiftRequest, ShiftStatus, ShiftType, SubmissionStatus, listShifts, Shift, deleteShift, updateShift, ShiftActionStatus } from "@/lib/api/shifts";
import { format, parse } from "date-fns";
import { useSignDocumentMutation, useCheckSignatureStatusQuery } from "@/pages/applicant/application/api";
import { searchClients, Client } from "@/lib/api/clients";
import { useAuth } from "@/utils/auth";

interface FormData {
  client: string;
  clientId: string;
  location: string;
}

interface WeekData {
  [day: string]: {
    date: string;
    checkIn: string;
    checkOut: string;
  };
}

/**
 * Helper function to transform week data into CreateShiftRequest[]
 * 
 * Note: Signatures are uploaded separately via POST /signature endpoint before shift submission.
 * Signature information (type and status) is included in signatureInfo field for reference.
 * The backend stores the full signature data in the signatures collection.
 */
function buildManualShiftRequests(
  formData: FormData,
  week1Data: WeekData,
  week2Data: WeekData,
  employeeId: string,
  agencyId: string,
  clientId: string,
  clientSignature: { signatureType: string; signatureData: string } | null,
  userSignature: { signatureType: string; signatureData: string } | null
): CreateShiftRequest[] {
  const requests: CreateShiftRequest[] = [];
  const currentYear = new Date().getFullYear();

  // Process both weeks
  [week1Data, week2Data].forEach((weekData, weekIndex) => {
    Object.entries(weekData).forEach(([day, dayData]) => {
      // Skip if missing required data
      if (!dayData.date || !dayData.checkIn || !dayData.checkOut) {
        return;
      }

      try {
        // Parse the date (format: "19 January" or similar)
        const parsedDate = parse(dayData.date, "d MMMM", new Date(currentYear, 0, 1));
        const dateStr = format(parsedDate, "yyyy-MM-dd");

        // Calculate session duration
        const checkInTime = new Date(`2000-01-01 ${dayData.checkIn}`);
        const checkOutTime = new Date(`2000-01-01 ${dayData.checkOut}`);
        const durationMinutes = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60);
        const hours = Math.floor(durationMinutes / 60);
        const minutes = Math.floor(durationMinutes % 60);
        const sessionDuration = `${hours}h ${minutes}m`;

        // Create signature metadata
        const signatureInfo = clientSignature && userSignature 
          ? `Signed: Client(${clientSignature.signatureType}), User(${userSignature.signatureType})`
          : "Manual entry";

        // Create shift request (status and submissionStatus will be set by caller)
        const request: CreateShiftRequest = {
          employeeId,
          agencyId,
          date: dateStr,
          location: formData.location,
          startTime: dayData.checkIn,
          endTime: dayData.checkOut,
          status: ShiftStatus.PENDING, // Default to PENDING, will be overridden by caller
          type: ShiftType.MANUAL,
          submissionStatus: SubmissionStatus.DRAFT, // Default to DRAFT, will be overridden by caller
          clientId: clientId || undefined,
          week: weekIndex + 1,
          day: day,
          sessionDuration: sessionDuration,
          signatureInfo: signatureInfo,
        };

        requests.push(request);
      } catch (error) {
        console.error(`Failed to parse date for ${day}:`, error);
      }
    });
  });

  return requests;
}

export default function ManualShiftManagementPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ display_name?: string; place_id: string; lat: string; lon: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ display_name?: string; place_id?: string; lat?: string; lon?: string } | null>(null);
  const locationInputRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Signature upload mutation
  const [signDocument] = useSignDocumentMutation();

  // Fetch existing signatures
  const { data: clientSignatureData } = useCheckSignatureStatusQuery("manual-timesheet-client", {
    skip: !user?.uid,
  });
  const { data: userSignatureData } = useCheckSignatureStatusQuery("manual-timesheet-user", {
    skip: !user?.uid,
  });

  const [formData, setFormData] = useState<FormData>({
    client: "",
    clientId: "",
    location: "",
  });
  const employeeName =
    user?.profile?.fullName ||
    [user?.profile?.firstName, user?.profile?.lastName].filter(Boolean).join(" ").trim() ||
    "";
  const agencyName = user?.agency?.name || "";

  // Client search states
  const [clientSearchResults, setClientSearchResults] = useState<Client[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const clientSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clientInputRef = useRef<HTMLDivElement>(null);

  const [week1Expanded, setWeek1Expanded] = useState(true);
  const [week2Expanded, setWeek2Expanded] = useState(false);

  const [week1Data, setWeek1Data] = useState<WeekData>({
    Sunday: { date: "", checkIn: "", checkOut: "" },
    Monday: { date: "", checkIn: "", checkOut: "" },
    Tuesday: { date: "", checkIn: "", checkOut: "" },
    Wednesday: { date: "", checkIn: "", checkOut: "" },
    Thursday: { date: "", checkIn: "", checkOut: "" },
    Friday: { date: "", checkIn: "", checkOut: "" },
    Saturday: { date: "", checkIn: "", checkOut: "" },
  });

  const [week2Data, setWeek2Data] = useState<WeekData>({
    Sunday: { date: "", checkIn: "", checkOut: "" },
    Monday: { date: "", checkIn: "", checkOut: "" },
    Tuesday: { date: "", checkIn: "", checkOut: "" },
    Wednesday: { date: "", checkIn: "", checkOut: "" },
    Thursday: { date: "", checkIn: "", checkOut: "" },
    Friday: { date: "", checkIn: "", checkOut: "" },
    Saturday: { date: "", checkIn: "", checkOut: "" },
  });

  const [clientSignatureModalOpen, setClientSignatureModalOpen] = useState(false);
  const [userSignatureModalOpen, setUserSignatureModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  const [clientSignature, setClientSignature] = useState<{
    signatureType: string;
    signatureData: string;
  } | null>(null);
  
  const [userSignature, setUserSignature] = useState<{
    signatureType: string;
    signatureData: string;
  } | null>(null);

  // Handle clicks outside location and client dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationInputRef.current && !locationInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
      if (clientInputRef.current && !clientInputRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      // Clear any pending search timeouts
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (clientSearchTimeoutRef.current) {
        clearTimeout(clientSearchTimeoutRef.current);
      }
    };
  }, []);

  // Load saved draft shifts
  useEffect(() => {
    const loadDraftShifts = async () => {
      if (!user?.profile?.agencyId) return;

      try {
        setLoading(true);
        // Fetch manual draft shifts
        const response = await listShifts({
          agencyId: user?.profile?.agencyId,
          type: ShiftType.MANUAL,
          submissionStatus: SubmissionStatus.DRAFT,
          limit: 100,
        });

        // Filter for manual shifts with draft submission status
        const draftShifts = response.shifts.filter(
          (shift) => shift.type === ShiftType.MANUAL && shift.submissionStatus === SubmissionStatus.DRAFT
        );

        if (draftShifts.length === 0) return;

        // Parse drafts back into form structure
        const firstShift = draftShifts[0];
        
        // Extract client info from first shift
        if (firstShift.client) {
          const client = firstShift.client as Client;
          const clientName = (client.firstName && client.lastName)
            ? `${client.firstName} ${client.lastName}`
            : client.id || "";
          
          setFormData((prev) => ({
            ...prev,
            client: clientName,
            clientId: client.id || "",
            location: firstShift.location || prev.location,
          }));
        }

        // Group shifts by week and day
        const newWeek1Data = { ...week1Data };
        const newWeek2Data = { ...week2Data };
        
        draftShifts.forEach((shift) => {
          // Get week number and day name from shift fields
          const weekNum = shift.week;
          const dayName = shift.day;
          if (!weekNum || !dayName) return;

          // Parse date to display format (e.g., "19 January")
          const shiftDate = new Date(shift.date);
          const displayDate = format(shiftDate, "d MMMM");

          const dayData = {
            date: displayDate,
            checkIn: shift.startTime || "",
            checkOut: shift.endTime || "",
          };

          // Update appropriate week data
          if (weekNum === 1 && dayName in newWeek1Data) {
            newWeek1Data[dayName as keyof WeekData] = dayData;
          } else if (weekNum === 2 && dayName in newWeek2Data) {
            newWeek2Data[dayName as keyof WeekData] = dayData;
          }
        });

        setWeek1Data(newWeek1Data);
        setWeek2Data(newWeek2Data);
      } catch (error) {
        console.error("❌ Failed to load draft shifts:", error);
        // Silent fail - don't show error toast as this is optional functionality
      } finally {
        setLoading(false);
      }
    };

    loadDraftShifts();
  }, [user?.profile?.agencyId, user?.profile?.id]); // Only run when user changes

  // Load existing signatures if available
  useEffect(() => {
    if (clientSignatureData?.success && clientSignatureData?.data) {
      const { signatureType, signatureData } = clientSignatureData.data;
      setClientSignature({
        signatureType,
        signatureData,
      });
    }
  }, [clientSignatureData]);

  useEffect(() => {
    if (userSignatureData?.success && userSignatureData?.data) {
      const { signatureType, signatureData } = userSignatureData.data;
      setUserSignature({
        signatureType,
        signatureData,
      });
    }
  }, [userSignatureData]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // If it's the location field, trigger search for suggestions
    if (field === "location") {
      handleLocationSearch(value);
    }
    
    // If it's the client field, trigger client search
    if (field === "client") {
      handleClientSearch(value);
    }
  };

  // Client search handler
  const handleClientSearch = useCallback(async (query: string) => {
    // Clear existing timeout
    if (clientSearchTimeoutRef.current) {
      clearTimeout(clientSearchTimeoutRef.current);
    }

    // If query is too short or no agency, hide dropdown
    if (query.trim().length < 2 || !user?.profile?.agencyId) {
      setShowClientDropdown(false);
      setClientSearchResults([]);
      return;
    }

    // Debounce the search
    clientSearchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearchingClients(true);
        if (!user?.profile?.agencyId) {
          setClientSearchResults([]);
          setShowClientDropdown(false);
          return;
        }
        const clients = await searchClients(query, user?.profile?.agencyId);
        setClientSearchResults(clients);
        setShowClientDropdown(clients.length > 0);
      } catch (error) {
        console.error("Failed to search clients:", error);
        setClientSearchResults([]);
        setShowClientDropdown(false);
      } finally {
        setIsSearchingClients(false);
      }
    }, 300); // 300ms debounce
  }, [user?.profile?.agencyId]);

  // Handle client selection
  const handleClientSelect = (client: Client) => {
    const clientName = client.firstName && client.lastName 
      ? `${client.firstName} ${client.lastName}` 
      : client.id;
    setFormData((prev) => ({
      ...prev,
      client: clientName,
      clientId: client.id,
    }));
    setShowClientDropdown(false);
    setClientSearchResults([]);
  };

  const handleLocationSearch = async (query: string) => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If query is too short, hide suggestions
    if (query.trim().length < 3) {
      setShowSuggestions(false);
      setLocationSuggestions([]);
      return;
    }

    // Debounce the search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearchingLocation(true);
        
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
        );
        
        if (!response.ok) {
          throw new Error("Failed to fetch suggestions");
        }

        const data = await response.json();
        setLocationSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch (error) {
        console.error("Failed to fetch location suggestions:", error);
        setLocationSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setSearchingLocation(false);
      }
    }, 500); // 500ms debounce
  };

  const handleSelectSuggestion = (suggestion: { display_name?: string; place_id?: string; lat?: string; lon?: string }) => {
    setFormData((prev) => ({ ...prev, location: suggestion.display_name || '' }));
    setSelectedLocation(suggestion);
    setShowSuggestions(false);
    setLocationSuggestions([]);
  };

  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      });
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Use Nominatim (OpenStreetMap) reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          
          if (!response.ok) {
            throw new Error("Failed to fetch address");
          }

          const data = await response.json();
          
          // Format address from the response
          const address = data.display_name || `${latitude}, ${longitude}`;
          
          setFormData((prev) => ({ ...prev, location: address }));
          
          toast({
            title: "Location Retrieved",
            description: "Your current location has been added.",
          });
        } catch (error) {
          console.error("Failed to get address:", error);
          // Fallback to coordinates if reverse geocoding fails
          setFormData((prev) => ({ 
            ...prev, 
            location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` 
          }));
          
          toast({
            title: "Location Retrieved",
            description: "Location coordinates have been added.",
          });
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setGettingLocation(false);
        
        let errorMessage = "Failed to get your location.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    );
  };

  const handleClientSignatureSave = (signatureData: {
    signatureType: string;
    signatureData: string;
  }) => {
    console.log("Client signature saved:", signatureData);
    setClientSignature(signatureData);
    setClientSignatureModalOpen(false);
    toast({
      title: "Signature Added",
      description: "Client signature has been added successfully.",
    });
  };

  const handleUserSignatureSave = (signatureData: {
    signatureType: string;
    signatureData: string;
  }) => {
    console.log("User signature saved:", signatureData);
    setUserSignature(signatureData);
    setUserSignatureModalOpen(false);
    toast({
      title: "Signature Added",
      description: "Your signature has been added successfully.",
    });
  };

  const handleSave = async () => {
    if (!user?.uid) {
      toast({
        title: "Authentication Error",
        description: "User not authenticated. Please log in and try again.",
        variant: "destructive",
      });
      return;
    }

    // Validate client information
    if (!formData.clientId || !formData.location) {
      toast({
        title: "Client Information Required",
        description: "Please select a client and enter location before saving.",
        variant: "destructive",
      });
      return;
    }

    if (formData.location.length < 3) {
      toast({
        title: "Location Required",
        description: "Please enter a valid location before saving.",
        variant: "destructive",
      });
      return;
    }

    // Validate that at least one shift entry exists
    const hasShiftData = [...Object.values(week1Data), ...Object.values(week2Data)].some(
      (day) => day.date && day.checkIn && day.checkOut
    );

    if (!hasShiftData) {
      toast({
        title: "No Timesheet Entries",
        description: "Please add at least one timesheet entry before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      // Step 0: Upload signatures if they exist (optional for drafts)
      try {
        if (clientSignature) {
          await signDocument({
            context: "manual-timesheet-client",
            data: clientSignature,
          }).unwrap();
          console.log("✅ Uploaded client signature");
        }

        if (userSignature) {
          await signDocument({
            context: "manual-timesheet-user",
            data: userSignature,
          }).unwrap();
          console.log("✅ Uploaded user signature");
        }
      } catch (signatureError: any) {
        console.warn("⚠️ Failed to upload signatures during save (continuing anyway):", signatureError);
        // Don't block saving if signature upload fails - signatures are optional for drafts
      }

      // Step 1: Fetch existing draft shifts
      const existingDraftsResponse = await listShifts({
        agencyId: user?.profile?.agencyId,
        employeeId: user?.profile?.id,
        type: ShiftType.MANUAL,
        submissionStatus: SubmissionStatus.DRAFT,
        limit: 100,
      });

      const existingDrafts = existingDraftsResponse.shifts

      // Step 2: Build shift requests as drafts (no signatures required)
      const shiftRequests = buildManualShiftRequests(
        formData,
        week1Data,
        week2Data,
        user?.profile?.id,
        user?.profile?.agencyId,
        formData.clientId,
        clientSignature,
        userSignature
      );

      // Step 3: Override submission status to DRAFT and set clocked times
      const draftRequests = shiftRequests.map(request => ({
        ...request,
        location: `${selectedLocation?.lat},${selectedLocation?.lon}` || request.location,
        submissionStatus: SubmissionStatus.DRAFT,
        status: ShiftStatus.PENDING, // Use PENDING for drafts instead of COMPLETED
        type: ShiftType.MANUAL, // Ensure type is set to manual
        clockedInAt: request.startTime, // Set clockedInAt from startTime
        clockedOutAt: request.endTime, // Set clockedOutAt from endTime
      }));

      if (draftRequests.length === 0) {
        toast({
          title: "No Valid Entries",
          description: "No valid timesheet entries found to save.",
          variant: "destructive",
        });
        return;
      }

      // Step 4: Update existing or create new shifts
      const savePromises = draftRequests.map(async (request) => {
        // Try to find an existing draft for the same date
        const existingShift = existingDrafts.find(
          (draft) => draft.date === request.date
        );

        if (existingShift) {
          // Update existing shift
          return updateShift(existingShift.id, {
            location: `${selectedLocation?.lat},${selectedLocation?.lon}` || request.location,
            startTime: request.startTime,
            endTime: request.endTime,
            clockedInAt: request.clockedInAt,
            clockedOutAt: request.clockedOutAt,
            week: request.week,
            day: request.day,
            sessionDuration: request.sessionDuration,
            signatureInfo: request.signatureInfo,
            status: request.status,
            submissionStatus: request.submissionStatus,
            type: request.type,
          });
        } else {
          // Create new shift
          console.log(`➕ Creating new shift for ${request.date}`);
          return createShift({
            ...request,
            location: `${selectedLocation?.lat},${selectedLocation?.lon}` || request.location,
          });
        }
      });

      // Step 5: Delete drafts that are no longer in the form
      const requestDates = new Set(draftRequests.map(r => r.date));
      const shiftsToDelete = existingDrafts.filter(
        (draft) => !requestDates.has(draft.date)
      );

      const deletePromises = shiftsToDelete.map((shift) => {
        console.log(`🗑️ Deleting removed draft for ${shift.date}`);
        return deleteShift(shift.id);
      });

      // Step 6: Execute all save and delete operations
      const [saveResults, deleteResults] = await Promise.all([
        Promise.allSettled(savePromises),
        Promise.allSettled(deletePromises),
      ]);

      // Combine results
      const results = [...saveResults, ...deleteResults];

      // Check for failures
      const failures = results.filter((r) => r.status === "rejected");
      const successes = results.filter((r) => r.status === "fulfilled");

      if (failures.length > 0) {
        console.error("Failed to save some shifts:", failures);
        toast({
          title: "Partial Save",
          description: `Saved timesheet entries as drafts.`,
          variant: failures.length === results.length ? "destructive" : "success",
        });
      }

      if (successes.length > 0) {
        const hasSignatures = clientSignature || userSignature;
        const signaturesText = hasSignatures 
          ? " Signatures have been uploaded." 
          : " You can add signatures later before submitting.";
        
        toast({
          title: "Draft Saved",
          description: `Successfully saved timesheet entry(ies) as draft.`,
          variant: "success",
        });
      }
    } catch (error: any) {
      console.error("Failed to save draft timesheet:", error);
      toast({
        title: "Save Failed",
        description: error?.response?.data?.error || "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    // Validate signatures
    if (!clientSignature || !userSignature) {
      toast({
        title: "Signatures Required",
        description: "Please add both client and user signatures before submitting.",
        variant: "destructive",
      });
      return;
    }

    // Validate client information
    if (!formData.clientId || !formData.location) {
      toast({
        title: "Client Information Required",
        description: "Please select a client and enter location before submitting.",
        variant: "destructive",
      });
      return;
    }

    // Validate that at least one shift entry exists
    const hasShiftData = [...Object.values(week1Data), ...Object.values(week2Data)].some(
      (day) => day.date && day.checkIn && day.checkOut
    );

    if (!hasShiftData) {
      toast({
        title: "No Timesheet Entries",
        description: "Please add at least one timesheet entry before submitting.",
        variant: "destructive",
      });
      return;
    }

    setConfirmModalOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!user?.uid) {
      toast({
        title: "Authentication Error",
        description: "User not authenticated. Please log in and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Step 1: Upload signatures to backend
      try {
        if (clientSignature) {
          await signDocument({
            context: "manual-timesheet-client",
            data: clientSignature,
          }).unwrap();
        }

        if (userSignature) {
          await signDocument({
            context: "manual-timesheet-user",
            data: userSignature,
          }).unwrap();
        }
      } catch (signatureError: any) {
        console.error("Failed to upload signatures:", signatureError);
        setConfirmModalOpen(false);
        toast({
          title: "Signature Upload Failed",
          description: "Failed to upload signatures. Please try again.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Step 2: Build shift requests from form data
      const shiftRequests = buildManualShiftRequests(
        formData,
        week1Data,
        week2Data,
        user?.profile?.id,
        user?.profile?.agencyId,
        formData.clientId,
        clientSignature,
        userSignature
      );

      if (shiftRequests.length === 0) {
        setConfirmModalOpen(false);
        toast({
          title: "No Valid Entries",
          description: "No valid timesheet entries found to submit.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Step 3: Set status to COMPLETED and add clockedInAt/clockedOutAt for submission
      const finalShiftRequests = shiftRequests.map(request => ({
        ...request,
        location: `${selectedLocation?.lat},${selectedLocation?.lon}` || request.location,
        status: ShiftStatus.COMPLETED, // Set to COMPLETED only on submit
        submissionStatus: SubmissionStatus.SUBMITTED, // Set to SUBMITTED only on submit
        actionStatus: ShiftActionStatus.CLOCK_IN,
        clockedInAt: request.startTime, // Set clockedInAt from startTime
        clockedOutAt: request.endTime, // Set clockedOutAt from endTime
        type: ShiftType.MANUAL, // Ensure type is set to manual
      }));

      // Step 4: Submit all shifts in parallel
      const results = await Promise.allSettled(
        finalShiftRequests.map((request) => createShift(request))
      );

      // Check for failures
      const failures = results.filter((r) => r.status === "rejected");
      const successes = results.filter((r) => r.status === "fulfilled");

      if (failures.length > 0) {
        console.error("Failed to submit some shifts:", failures);
        toast({
          title: "Partial Submission",
          description: `Successfully submitted ${successes.length} of ${shiftRequests.length} shifts. ${failures.length} failed.`,
          variant: failures.length === results.length ? "destructive" : "default",
        });
      }

      if (successes.length > 0) {
        // Close confirmation modal and show success modal
        setConfirmModalOpen(false);
        setSuccessModalOpen(true);

        toast({
          title: "Timesheet Submitted",
          description: `Successfully submitted ${successes.length} shift(s) with signatures.`,
        });

        // Reset form (optional - keeping data for now in case user wants to review)
        // Clear signatures to prevent re-submission
        setClientSignature(null);
        setUserSignature(null);
      }
    } catch (error: any) {
      console.error("Failed to submit manual timesheet:", error);
      setConfirmModalOpen(false);
      toast({
        title: "Submission Failed",
        description: error?.response?.data?.error || "Failed to submit timesheet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotalHours = (weekData: WeekData) => {
    let totalMinutes = 0;
    Object.values(weekData).forEach((day) => {
      if (day.checkIn && day.checkOut) {
        const checkIn = new Date(`2000-01-01 ${day.checkIn}`);
        const checkOut = new Date(`2000-01-01 ${day.checkOut}`);
        const diff = checkOut.getTime() - checkIn.getTime();
        totalMinutes += diff / (1000 * 60);
      }
    });
    return Math.floor(totalMinutes / 60);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent"></div>
          <p className="text-sm text-[#808081]">Loading your information...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-[calc(100vh-200px)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
              Shift Management
            </h1>
            <p className="text-sm text-[#808081] mt-1">
              Manual Time Sheet (Bi-weekly Employee Work Record)
            </p>
          </div>
          <Button 
            onClick={() => navigate(Routes.userPanel.shiftManagement)}
            className="flex items-center gap-2 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-6 py-3 h-auto font-semibold shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            Automatic Timesheet
          </Button>
        </div>

        {/* Form Container */}
        <div className="">
          {/* Personal Information */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block mb-2 text-sm font-medium text-[#10141a]">
                Employee
              </label>
              <Input
                value={employeeName}
                className="border-[#e5e5e6] rounded-md bg-[#f8f9fa] cursor-not-allowed"
                placeholder="Employee"
                disabled
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-[#10141a]">
                Agency
              </label>
              <Input
                value={agencyName}
                className="border-[#e5e5e6] rounded-md bg-[#f8f9fa] cursor-not-allowed"
                placeholder="Agency"
                disabled
              />
            </div>
          </div>

          {/* Client Information */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block mb-2 text-sm font-medium text-[#10141a]">
                Client
              </label>
              <div className="relative" ref={clientInputRef}>
                <Input
                  value={formData.client}
                  onChange={(e) => handleInputChange("client", e.target.value)}
                  onFocus={() => {
                    if (clientSearchResults.length > 0) {
                      setShowClientDropdown(true);
                    }
                  }}
                  placeholder="Type to search for client..."
                  className="border-[#e5e5e6] rounded-md"
                />
                
                {/* Client Dropdown */}
                {showClientDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-[#e5e5e6] rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                    {isSearchingClients && (
                      <div className="px-4 py-3 text-sm text-[#808081] flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#00b4b8]" />
                        Searching...
                      </div>
                    )}
                    {!isSearchingClients && clientSearchResults.length === 0 && formData.client.length >= 2 && (
                      <div className="px-4 py-3 text-sm text-[#808081]">
                        No clients found
                      </div>
                    )}
                    {!isSearchingClients && clientSearchResults.map((client) => {
                      const clientName = client.firstName && client.lastName
                        ? `${client.firstName} ${client.lastName}`
                        : client.id;
                      return (
                        <div
                          key={client.id}
                          onClick={() => handleClientSelect(client)}
                          className="px-4 py-3 text-sm text-[#10141a] hover:bg-[#f8f9fa] cursor-pointer border-b border-[#e5e5e6] last:border-b-0 transition-colors"
                        >
                          <div className="font-medium">{clientName}</div>
                          {client.location && (
                            <div className="text-xs text-[#808081] mt-1">{client.location}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-[#10141a]">
                Location
              </label>
              <div className="relative" ref={locationInputRef}>
                <Input
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  className="border-[#e5e5e6] rounded-md pr-10"
                  placeholder="Type to search for location..."
                  onFocus={() => {
                    if (locationSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={gettingLocation}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Get current location"
                >
                  <MapPin 
                    className={`w-5 h-5 text-[#00b4b8] cursor-pointer ${gettingLocation ? 'animate-pulse' : ''}`} 
                  />
                </button>
                
                {/* Suggestions Dropdown */}
                {showSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-[#e5e5e6] rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                    {searchingLocation && (
                      <div className="px-4 py-3 text-sm text-[#808081] flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-[#00b4b8] border-r-transparent"></div>
                        Searching...
                      </div>
                    )}
                    {!searchingLocation && locationSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.place_id}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="px-4 py-3 text-sm text-[#10141a] hover:bg-[#f8f9fa] cursor-pointer border-b border-[#e5e5e6] last:border-b-0 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-[#00b4b8] flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{suggestion.display_name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Week 1 Timesheet */}
          <div className="mb-8 rounded-xl bg-[#FFFFFF4D]">
            <div className="flex items-center justify-between mb-4 p-4 bg-[#FFFFFF4D]">
              <div>
                <h3 className="text-lg font-bold text-[#10141a]">
                  Timesheet Entries From Week 1
                </h3>
                <p className="mt-1 text-sm text-[#808081]">
                  These entries are not changeable once you input them. Please fill out carefully
                </p>
              </div>
              <Button
                onClick={() => setWeek1Expanded(!week1Expanded)}
                variant="ghost"
                className="backdrop-blur-[22px] bg-[rgba(178,178,179,0.1)] hover:bg-[rgba(178,178,179,0.2)] text-[#808081] rounded-[60px] px-4 py-2 h-auto font-normal text-xs transition-all"
              >
                {week1Expanded ? (
                  <>
                    <ChevronUp className="w-[18px] h-[18px] mr-2 text-[#808081]" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-[18px] h-[18px] mr-2 text-[#808081]" />
                    Expand
                  </>
                )}
              </Button>
            </div>

            {week1Expanded && (
              <TimesheetWeek
                weekData={week1Data}
                onWeekDataChange={setWeek1Data}
                totalHours={calculateTotalHours(week1Data)}
              />
            )}
          </div>

          {/* Week 2 Timesheet */}
          <div className="mb-8 rounded-xl bg-[#FFFFFF4D]">
            <div className="flex items-center justify-between mb-4 p-4 bg-[#FFFFFF4D]">
              <div>
                <h3 className="text-lg font-bold text-[#10141a]">
                  Timesheet Entries From Week 2
                </h3>
                <p className="mt-1 text-sm text-[#808081]">
                  These entries are not changeable once you input them. Please fill out carefully
                </p>
              </div>
              <Button
                onClick={() => setWeek2Expanded(!week2Expanded)}
                variant="ghost"
                className="backdrop-blur-[22px] bg-[rgba(178,178,179,0.1)] hover:bg-[rgba(178,178,179,0.2)] text-[#808081] rounded-[60px] px-4 py-2 h-auto font-normal text-xs transition-all"
              >
                {week2Expanded ? (
                  <>
                    <ChevronUp className="w-[18px] h-[18px] mr-2 text-[#808081]" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-[18px] h-[18px] mr-2 text-[#808081]" />
                    Expand
                  </>
                )}
              </Button>
            </div>

            {week2Expanded && (
              <TimesheetWeek
                weekData={week2Data}
                onWeekDataChange={setWeek2Data}
                totalHours={calculateTotalHours(week2Data)}
              />
            )}
          </div>

          {/* Progress Note */}
          <div className="p-4 mb-8 bg-[#f8f9fa] rounded-lg">
            <p className="text-sm text-[#353535]">
              Progress note is the summary of activities engaged in while staff is with the consumer for the stated period. Time sheet MUST be submitted with progress notes; failure to comply will result in decrease of pay for the said pay period.
            </p>
          </div>

          {/* Signature Module */}
          <div>
            <h3 className="mb-4 text-lg font-bold text-[#10141a]">Signature Module</h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Client Signature */}
              <div>
                <p className="mb-3 text-sm text-[#808081]">
                  Click to open client signature module
                </p>
                <div
                  onClick={() => setClientSignatureModalOpen(true)}
                  className="border-2 border-dashed border-[#e5e5e6] rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#00b4b8] hover:bg-[#f8f9fa] transition-colors min-h-[150px]"
                >
                  <svg className="w-8 h-8 mb-2 text-[#808081]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm text-[#808081]">Client Signature</span>
                </div>
                {clientSignature && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-[#22c55e]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Client Signature Added
                  </div>
                )}
              </div>

              {/* User Signature */}
              <div>
                <p className="mb-3 text-sm text-[#808081]">
                  Click to open user signature module
                </p>
                <div
                  onClick={() => setUserSignatureModalOpen(true)}
                  className="border-2 border-dashed border-[#e5e5e6] rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#00b4b8] hover:bg-[#f8f9fa] transition-colors min-h-[150px]"
                >
                  <svg className="w-8 h-8 mb-2 text-[#808081]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm text-[#808081]">User Signature</span>
                </div>
                {userSignature && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-[#22c55e]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    User Signature Added
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-4 mt-8">
            <Button
              onClick={handleSave}
              variant="outline"
              className="bg-[#d1d5db] hover:bg-[#9ca3af] text-[#4b5563] rounded-full px-8 py-3 h-auto font-semibold border-0 flex items-center gap-2"
              disabled={saving || submitting}
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || submitting}
              className="bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-8 py-3 h-auto font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DigitalSignatureModal
        isOpen={clientSignatureModalOpen}
        setIsOpen={setClientSignatureModalOpen}
        onSave={handleClientSignatureSave}
        skipBackend
        useCase="manual-timesheet-client"
      />

      <DigitalSignatureModal
        isOpen={userSignatureModalOpen}
        setIsOpen={setUserSignatureModalOpen}
        onSave={handleUserSignatureSave}
        skipBackend
        useCase="manual-timesheet-user"
      />

      <ConfirmShiftModal
        open={confirmModalOpen}
        onOpenChange={setConfirmModalOpen}
        onConfirm={handleConfirmSubmit}
        loading={submitting}
      />

      <SuccessModal
        open={successModalOpen}
        onOpenChange={setSuccessModalOpen}
      />
    </>
  );
}