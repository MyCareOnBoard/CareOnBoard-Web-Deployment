import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { getEmployeeById } from "@/lib/api/employees";
import { DSPProfile } from "./DSPProfile";
import { DSP } from "./types";
import { Routes } from "@/routes/constants";

function normalizeAddress(address: any): string {
  if (!address) return "";
  if (typeof address === "string") return address;
  const parts = [address.address, address.city, address.zipCode].filter(Boolean);
  return parts.join(", ");
}

function calculateAge(dateOfBirth?: string): number | undefined {
  if (!dateOfBirth) return undefined;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function DSPProfilePage() {
  const { dspId } = useParams<{ dspId: string }>();
  const navigate = useNavigate();
  const [dsp, setDsp] = useState<DSP | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dspId) {
      navigate(Routes.agency.dspManagement);
      return;
    }

    setIsLoading(true);
    setError(null);
    getEmployeeById(dspId)
      .then((employee) => {
        let normalizedStatus: DSP["status"] = "pending";
        if (employee.status) {
          const s = employee.status.toLowerCase();
          if (s === "active" || s === "inactive" || s === "pending" || s === "suspended") {
            normalizedStatus = s as DSP["status"];
          } else if (s === "terminated") {
            normalizedStatus = "inactive";
          }
        }

        setDsp({
          id: employee.id,
          uid: employee.uid || "",
          userId: employee.userId,
          fullName: employee.fullName,
          email: employee.email,
          bio: employee.bio || "",
          dateOfBirth: employee.dateOfBirth || "",
          workAvailability: employee.workAvailability || false,
          hireDate: employee.hireDate || employee.createdAt || "",
          profilePicture: employee.profilePicture || "",
          tagId: employee.tagId || "",
          role: employee.role || "DSP",
          address: normalizeAddress(employee.address),
          phoneNumber: employee.phoneNumber || "",
          emergencyContact: employee.emergencyContact || { name: "", relationship: "", phone: "" },
          status: normalizedStatus,
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt,
          age: calculateAge(employee.dateOfBirth),
          clients: 0,
          completedTrainings: 0,
          totalTrainings: 0,
        });
      })
      .catch((err) => {
        console.error("Failed to load DSP:", err);
        setError(err.message || "Failed to load DSP");
      })
      .finally(() => setIsLoading(false));
  }, [dspId, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00B4B8]" />
      </div>
    );
  }

  if (error || !dsp) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load DSP profile</p>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => navigate(Routes.agency.dspManagement)}
            className="mt-4 px-4 py-2 bg-gray-900 text-white text-sm rounded-full"
          >
            Back to Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">DSP Management</h1>
        <DSPProfile
          dsp={dsp}
          onBack={() => navigate(Routes.agency.dspManagement)}
        />
      </div>
    </div>
  );
}
