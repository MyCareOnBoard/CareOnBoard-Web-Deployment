import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, ArrowLeft, MapPin } from "lucide-react";
import TimesheetWeek from "./components/TimesheetWeek";
import ConfirmShiftModal from "./components/ConfirmShiftModal";
import SuccessModal from "./components/SuccessModal";
import { useToast } from "@/hooks/use-toast";
import type { RootState } from "@/store/redux/store";
import { getUserProfile, UserProfile } from "@/lib/api/users";
import { Routes } from "@/routes/constants";
import DigitalSignatureModal from "@/pages/applicant/application/components/DigitalSignature";
import { createShift, CreateShiftRequest, ShiftStatus } from "@/lib/api/shift-management";
import { format, parse } from "date-fns";
import { useSignDocumentMutation } from "@/pages/applicant/application/api";

interface FormData {
  yourFirstName: string;
  yourLastName: string;
  yourEmail: string;
  clientFirstName: string;
  clientLastName: string;
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
 * Signature metadata (type and status) is included in additionalStatus for reference.
 * The backend stores the full signature data in the signatures collection.
 */
function buildManualShiftRequests(
  formData: FormData,
  week1Data: WeekData,
  week2Data: WeekData,
  uid: string,
  agencyId: string,
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

        // Create shift request
        const request: CreateShiftRequest = {
          uid,
          agencyId,
          date: dateStr,
          location: formData.location,
          startTime: dayData.checkIn,
          endTime: dayData.checkOut,
          status: ShiftStatus.COMPLETED,
          client: {
            id: `client-${uid}`,
            name: `${formData.clientFirstName} ${formData.clientLastName}`.trim(),
          },
          additionalStatus: `Manual timesheet - Week ${weekIndex + 1} ${day} - ${sessionDuration} - ${signatureInfo}`,
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
  const profile = useSelector((state: RootState) => state.auth?.profile);
  const user = useSelector((state: RootState) => state.auth?.user);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ display_name: string; place_id: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingLocation, setSearchingLocation] = useState(false);
  
  const locationInputRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Signature upload mutation
  const [signDocument] = useSignDocumentMutation();

  const [formData, setFormData] = useState<FormData>({
    yourFirstName: "",
    yourLastName: "",
    yourEmail: "",
    clientFirstName: "",
    clientLastName: "",
    location: "",
  });

  const [week1Expanded, setWeek1Expanded] = useState(true);
  const [week2Expanded, setWeek2Expanded] = useState(false);

  const [week1Data, setWeek1Data] = useState<WeekData>({
    Sunday: { date: "19 January", checkIn: "10:30 PM", checkOut: "10:30 PM" },
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

  // Handle clicks outside location dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationInputRef.current && !locationInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      // Clear any pending search timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Fetch user profile and populate form
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const profileData = await getUserProfile();
        setUserProfile(profileData);

        // Extract first and last name from fullName
        const fullName = profileData.fullName || user?.fullName || "";
        const nameParts = fullName.trim().split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        // Update form data with user information
        setFormData((prev) => ({
          ...prev,
          yourFirstName: firstName,
          yourLastName: lastName,
          yourEmail: profileData.email || user?.email || "",
        }));
      } catch (error) {
        console.error("❌ Failed to fetch user profile:", error);
        // Fallback to auth state if API fails
        const fullName = user?.fullName || "";
        const nameParts = fullName.trim().split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        setFormData((prev) => ({
          ...prev,
          yourFirstName: firstName,
          yourLastName: lastName,
          yourEmail: user?.email || "",
        }));
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // If it's the location field, trigger search for suggestions
    if (field === "location") {
      handleLocationSearch(value);
    }
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

  const handleSelectSuggestion = (suggestion: { display_name: string; place_id: string }) => {
    setFormData((prev) => ({ ...prev, location: suggestion.display_name }));
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
    if (!formData.clientFirstName || !formData.clientLastName || !formData.location) {
      toast({
        title: "Client Information Required",
        description: "Please fill in client name and location before submitting.",
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
      setConfirmModalOpen(false);

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
        toast({
          title: "Signature Upload Failed",
          description: "Failed to upload signatures. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Step 2: Build shift requests from form data
      const shiftRequests = buildManualShiftRequests(
        formData,
        week1Data,
        week2Data,
        user.uid,
        user.uid, // Using uid as agencyId for now
        clientSignature,
        userSignature
      );

      if (shiftRequests.length === 0) {
        toast({
          title: "No Valid Entries",
          description: "No valid timesheet entries found to submit.",
          variant: "destructive",
        });
        return;
      }

      // Step 3: Submit all shifts in parallel
      const results = await Promise.allSettled(
        shiftRequests.map((request) => createShift(request))
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
        // Show success modal
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
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block mb-2 text-sm font-medium text-[#10141a]">
                Your First Name
              </label>
              <Input
                value={formData.yourFirstName}
                onChange={(e) => handleInputChange("yourFirstName", e.target.value)}
                className="border-[#e5e5e6] rounded-md"
                disabled
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-[#10141a]">
                Your Last Name
              </label>
              <Input
                value={formData.yourLastName}
                onChange={(e) => handleInputChange("yourLastName", e.target.value)}
                className="border-[#e5e5e6] rounded-md"
                disabled
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-[#10141a]">
                Your Email
              </label>
              <Input
                value={formData.yourEmail}
                onChange={(e) => handleInputChange("yourEmail", e.target.value)}
                className="border-[#e5e5e6] rounded-md bg-[#f8f9fa] cursor-not-allowed"
                placeholder="youremail@long.agency"
                disabled
              />
            </div>
          </div>

          {/* Client Information */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block mb-2 text-sm font-medium text-[#10141a]">
                Client First Name
              </label>
              <Input
                value={formData.clientFirstName}
                onChange={(e) => handleInputChange("clientFirstName", e.target.value)}
                className="border-[#e5e5e6] rounded-md"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-[#10141a]">
                Client Last Name
              </label>
              <Input
                value={formData.clientLastName}
                onChange={(e) => handleInputChange("clientLastName", e.target.value)}
                className="border-[#e5e5e6] rounded-md"
              />
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
                className="bg-[#B2B2B3] hover:bg-[#808081] text-white"
              >
                {week1Expanded ? (
                  <>
                    Collapse <ChevronUp className="w-4 h-4 ml-2 text-white" />
                  </>
                ) : (
                  <>
                    Expand <ChevronDown className="w-4 h-4 ml-2 text-white" />
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
                className="bg-[#B2B2B3] hover:bg-[#808081] text-white"
              >
                {week2Expanded ? (
                  <>
                    Collapse <ChevronUp className="w-4 h-4 ml-2 text-white" />
                  </>
                ) : (
                  <>
                    Expand <ChevronDown className="w-4 h-4 ml-2 text-white" />
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
          <div className="flex items-center gap-4 mt-8">
            <Button
              variant="outline"
              className="bg-[#d1d5db] hover:bg-[#9ca3af] text-[#4b5563] rounded-full px-8 py-3 h-auto font-semibold border-0"
              disabled={submitting}
            >
              Save
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-8 py-3 h-auto font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
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
      />

      <SuccessModal
        open={successModalOpen}
        onOpenChange={setSuccessModalOpen}
      />
    </>
  );
}