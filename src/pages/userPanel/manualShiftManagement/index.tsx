import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import TimesheetWeek from "./components/TimesheetWeek";
import SignatureModal from "./components/SignatureModal";
import ConfirmShiftModal from "./components/ConfirmShiftModal";
import SuccessModal from "./components/SuccessModal";
import { useToast } from "@/hooks/use-toast";
import type { RootState } from "@/store/redux/store";
import { getUserProfile, UserProfile } from "@/lib/api/users";
import { Routes } from "@/routes/constants";

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

export default function ManualShiftManagementPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const profile = useSelector((state: RootState) => state.auth?.profile);
  const user = useSelector((state: RootState) => state.auth?.user);

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

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
    if (!clientSignature || !userSignature) {
      toast({
        title: "Signatures Required",
        description: "Please add both client and user signatures before submitting.",
        variant: "destructive",
      });
      return;
    }
    setConfirmModalOpen(true);
  };

  const handleConfirmSubmit = () => {
    setConfirmModalOpen(false);
    // Simulate API call
    setTimeout(() => {
      setSuccessModalOpen(true);
    }, 500);
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
              <Input
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                className="border-[#e5e5e6] rounded-md"
              />
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
            >
              Save
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-8 py-3 h-auto font-semibold"
            >
              Submit
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SignatureModal
        open={clientSignatureModalOpen}
        onOpenChange={setClientSignatureModalOpen}
        onSave={handleClientSignatureSave}
        title="Client Signature"
      />

      <SignatureModal
        open={userSignatureModalOpen}
        onOpenChange={setUserSignatureModalOpen}
        onSave={handleUserSignatureSave}
        title="User Signature"
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