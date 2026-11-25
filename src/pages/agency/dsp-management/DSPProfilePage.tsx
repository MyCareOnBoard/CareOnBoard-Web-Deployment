import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { getEmployeeById } from "@/lib/api/employees";
import { DSPProfile } from "./DSPProfile";
import { DSP } from "./types";
import { Routes } from "@/routes/constants";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import { agencyOutlineButton } from "@/components/agency/AgencyListKit";

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
  const mode = useEffectiveAgencyMode();
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
          hireDate: employee.hireDate || "",
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

  const sectionLabel = mode === "hha" ? "Caregiver management" : "DSP management";

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading profile" className="space-y-6 pb-6">
        <div aria-hidden="true" className="space-y-5 border-b border-[#eceef0] pb-6 dark:border-white/10">
          <div className="h-9 w-64 animate-pulse rounded-full bg-[#f4f5f6] dark:bg-white/5" />
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 animate-pulse rounded-full bg-[#f4f5f6] dark:bg-white/5" />
            <div className="space-y-2">
              <div className="h-7 w-56 animate-pulse rounded-[8px] bg-[#f4f5f6] dark:bg-white/5" />
              <div className="h-4 w-80 max-w-full animate-pulse rounded-[6px] bg-[#f4f5f6] dark:bg-white/5" />
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="h-64 animate-pulse rounded-[16px] bg-[#f4f5f6] dark:bg-white/5" />
      </div>
    );
  }

  if (error || !dsp) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div role="alert" className="max-w-md rounded-[16px] border border-[#e4e7ea] bg-white px-8 py-10 text-center dark:border-white/10 dark:bg-[#1b232b]">
          <p className="text-[16px] font-medium text-[#b42318] dark:text-[#f8a1a1]">Failed to load DSP profile</p>
          <p className="mt-1 text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">{error}</p>
          <button
            type="button"
            onClick={() => navigate(Routes.agency.dspManagement)}
            className={`${agencyOutlineButton} mt-5`}
          >
            Back to Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <DSPProfile
      dsp={dsp}
      sectionLabel={sectionLabel}
      onBack={() => navigate(Routes.agency.dspManagement)}
    />
  );
}
