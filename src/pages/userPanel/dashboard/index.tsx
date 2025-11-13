import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUserProfile, UserProfile } from "@/lib/api/users";
import type { RootState } from "@/store/redux/store";

// Mock data for documents - replace with actual API call
const mockDocuments = [
  { id: 1, name: "Proof-Of-Driver's License, State ID, Passport)", status: "Available" },
  { id: 2, name: "Social Security Card", status: "Available" },
  { id: 3, name: "Hepatitis B vaccination series documents", status: "Available" },
  { id: 4, name: "Hepatitis B immunity titer result)", status: "Available" },
  { id: 5, name: "Tb test result", status: "Available" },
  { id: 6, name: "I-9 form", status: "Expired" },
  { id: 7, name: "W-4 Form", status: "Pending Soon" },
];

// Mock data for trainings - replace with actual API call
const mockTrainings = [
  { id: 1, name: "Training one", status: "New Training" },
];

export default function UserPanelDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const profile = useSelector((state: RootState) => state.auth?.profile);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const profileData = await getUserProfile();
        setUserProfile(profileData);
      } catch (error) {
        console.error("❌ Failed to fetch user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "available":
        return "bg-[#d4f4dd] text-[#0e6027] border-[#0e6027]/20";
      case "expired":
        return "bg-[#ffd4cc] text-[#d53411] border-[#d53411]/20";
      case "pending soon":
        return "bg-[#ffe8cc] text-[#cc6600] border-[#cc6600]/20";
      case "new training":
        return "bg-[#e5f7f7] text-[#00b4b8] border-[#00b4b8]/20";
      case "assigned":
        return "bg-[#e5f7f7] text-[#00b4b8] border-[#00b4b8]/20";
      default:
        return "bg-gray-100 text-gray-600 border-gray-300/20";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent"></div>
          <p className="text-sm text-[#808081]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Dashboard
        </h1>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Left Column - Profile Card */}
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-[20px] p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                {/* Profile Image */}
                <div className="relative">
                  {userProfile?.photoURL || userProfile?.photo ? (
                    <img
                      src={userProfile.photoURL || userProfile.photo}
                      alt={userProfile.fullName}
                      className="w-[88px] h-[88px] rounded-[12px] object-cover"
                    />
                  ) : (
                    <div className="w-[88px] h-[88px] rounded-[12px] bg-gradient-to-br from-[#00b4b8] to-[#0090a8] flex items-center justify-center text-white text-2xl font-bold">
                      {userProfile?.fullName?.charAt(0) || "U"}
                    </div>
                  )}
                  {/* ID Badge */}
                  <div className="absolute -bottom-2 -right-2 bg-[#00b4b8] text-white text-[10px] font-semibold px-2 py-1 rounded-full">
                    ID-2223
                  </div>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="space-y-2 mb-4">
              <h2 className="text-[24px] font-bold text-[#10141a]">
                {userProfile?.fullName || "User Name"}
              </h2>
              <p className="text-[14px] text-[#808081]">
                {userProfile?.role || "DSA"} • {userProfile?.gender && `${userProfile.gender} yrs old`}
              </p>
              <p className="text-[14px] text-[#808081]">
                Hiring Date: {formatDate(userProfile?.joiningDate)}
              </p>
            </div>

            {/* Work Availability Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#00b4b8] rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-[12px] font-semibold text-white">Work Availability</span>
            </div>
          </div>

          {/* Trainings Section */}
          <div className="bg-white rounded-[20px] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[20px] font-bold text-[#10141a]">Trainings</h3>
              <Button
                className="flex items-center gap-2 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-4 py-2 h-auto text-[14px] font-semibold shadow-sm transition-all duration-200"
              >
                <Plus size={16} />
                Start your training
              </Button>
            </div>

            {/* Training Items */}
            <div className="space-y-3">
              {mockTrainings.map((training) => (
                <div
                  key={training.id}
                  className="flex items-center justify-between p-3 rounded-[12px] border border-[#e5e5e6] hover:border-[#00b4b8]/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#808081]" />
                    <span className="text-[14px] font-medium text-[#10141a]">
                      {training.name}
                    </span>
                  </div>
                  <span
                    className={`text-[12px] font-semibold px-3 py-1 rounded-full border ${getStatusColor(
                      training.status
                    )}`}
                  >
                    {training.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Documents */}
        <div className="bg-white rounded-[20px] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[20px] font-bold text-[#10141a]">Documents</h3>
              <p className="text-[14px] text-[#808081] mt-1">
                Here are all your uploaded documents
              </p>
            </div>
            <Button
              className="flex items-center gap-2 bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full px-4 py-2 h-auto text-[14px] font-semibold shadow-sm transition-all duration-200"
            >
              <Plus size={16} />
              Upload new document
            </Button>
          </div>

          {/* Documents List */}
          <div className="space-y-3">
            {mockDocuments.map((document) => (
              <div
                key={document.id}
                className="flex items-center justify-between p-4 rounded-[12px] border border-[#e5e5e6] hover:border-[#00b4b8]/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-[#808081]" />
                  <span className="text-[14px] font-medium text-[#10141a]">
                    {document.name}
                  </span>
                </div>
                <span
                  className={`text-[12px] font-semibold px-3 py-1 rounded-full border ${getStatusColor(
                    document.status
                  )}`}
                >
                  {document.status}
                </span>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <span className="text-[14px] text-[#808081]">1</span>
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <span className="text-[14px] text-[#808081]">of</span>
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <span className="text-[14px] text-[#808081]">1</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

