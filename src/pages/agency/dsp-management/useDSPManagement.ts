import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/redux/store";
import {
  listEmployees,
  getEmployeeTrainings,
  searchEmployees,
  getEmployeeStats,
  updateEmployee,
  type Employee,
  type EmployeeStats,
  type EmployeeTraining,
} from "@/lib/api/employees";
import { listShifts, type Shift } from "@/lib/api/shifts";
import { DSP } from "./types";

/**
 * Calculate age from date of birth
 */
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

/**
 * Transform Employee to DSP with computed fields
 */
function transformEmployeeToDSP(employee: Employee): DSP {
  // Normalize status to lowercase to handle case sensitivity issues from backend
  let normalizedStatus: "active" | "inactive" | "pending" | "suspended" = "pending";
  if (employee.status) {
    const statusLower = employee.status.toLowerCase();
    if (statusLower === "active" || statusLower === "inactive" || statusLower === "pending" || statusLower === "suspended") {
      normalizedStatus = statusLower as "active" | "inactive" | "pending" | "suspended";
    }
  }

  return {
    id: employee.id,
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
    address: employee.address || "",
    phoneNumber: employee.phoneNumber || "",
    emergencyContact: employee.emergencyContact || {
      name: "",
      relationship: "",
      phone: ""
    },
    status: normalizedStatus,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
    // Computed fields for UI
    age: calculateAge(employee.dateOfBirth),
    clients: 0,
    completedTrainings: 0,
    totalTrainings: 0,
  };
}

/**
 * Hook to manage DSP list data
 */
export function useDSPList() {
  const [dsps, setDsps] = useState<DSP[]>([]);
  const [stats, setStats] = useState<EmployeeStats>({
    active: 0,
    inactive: 0,
    total: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = useSelector((state: RootState) => state.auth.user);
  const agencyId = user?.agencyId;

  const fetchDSPs = useCallback(async () => {
    if (!agencyId) {
      setError("Agency ID not found");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch employees - stats endpoint may not be available yet
      const employeesResponse = await listEmployees({
        agencyId,
        // Note: Backend may not support role filtering yet
        limit: 100
      });

      const transformedDSPs = employeesResponse.employees.map((employee) => {
        return transformEmployeeToDSP(employee);
      });
      setDsps(transformedDSPs);

      // Try to fetch stats, but don't fail if endpoint doesn't exist
      try {
        const statsResponse = await getEmployeeStats(agencyId);
        setStats({
          active: statsResponse.active,
          inactive: statsResponse.inactive,
          total: statsResponse.total
        });
      } catch (statsErr) {
        console.warn('⚠️ Stats endpoint not available, using defaults:', statsErr);
        // Calculate stats from employees list
        // Match the filtering logic in DSPList.tsx
        const active = transformedDSPs.filter(d => d.status === 'active').length;
        const inactive = transformedDSPs.filter(d => d.status === 'inactive' || d.status === 'suspended').length;
        setStats({
          active,
          inactive,
          total: transformedDSPs.length
        });
      }
    } catch (err: any) {
      console.error("❌ Failed to fetch DSPs:", err);
      console.error("❌ Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(err.message || "Failed to load DSPs");
    } finally {
      setIsLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    fetchDSPs();
  }, [fetchDSPs]);

  return {
    dsps,
    stats,
    isLoading,
    error,
    refetch: fetchDSPs,
  };
}

/**
 * Hook to manage DSP search
 */
export function useDSPSearch() {
  const [results, setResults] = useState<DSP[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const user = useSelector((state: RootState) => state.auth.user);
  const agencyId = user?.agencyId;

  const search = useCallback(async (query: string) => {
    if (!query.trim() || !agencyId) {
      setResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const employees = await searchEmployees(query, agencyId);
      const transformedDSPs = employees.map(transformEmployeeToDSP);
      setResults(transformedDSPs);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [agencyId]);

  return {
    results,
    isSearching,
    search,
  };
}

/**
 * Hook to manage single DSP details
 */
export function useDSPDetails(dspId: string | null) {
  const [trainings, setTrainings] = useState<EmployeeTraining[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = useSelector((state: RootState) => state.auth.user);
  const agencyId = user?.agencyId;

  const fetchDetails = useCallback(async () => {
    if (!dspId || !agencyId) return;

    try {
      setIsLoading(true);
      setError(null);

      const [trainingsData, shiftsData] = await Promise.all([
        getEmployeeTrainings(dspId),
        listShifts({ employeeId: dspId, agencyId, client: true, employee: true }),
      ]);

      setTrainings(trainingsData);
      setShifts(shiftsData.shifts || []);
    } catch (err: any) {
      console.error("Failed to fetch DSP details:", err);
      setError(err.message || "Failed to load DSP details");
    } finally {
      setIsLoading(false);
    }
  }, [dspId, agencyId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return {
    trainings,
    shifts,
    isLoading,
    error,
    refetch: fetchDetails,
  };
}

/**
 * Hook to manage DSP trainings
 */
export function useDSPTrainings(dspId: string | null) {
  const [trainings, setTrainings] = useState<EmployeeTraining[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrainings = useCallback(async () => {
    if (!dspId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await getEmployeeTrainings(dspId);
      setTrainings(data);
    } catch (err: any) {
      console.error("Failed to fetch trainings:", err);
      setError(err.message || "Failed to load trainings");
    } finally {
      setIsLoading(false);
    }
  }, [dspId]);

  useEffect(() => {
    fetchTrainings();
  }, [fetchTrainings]);

  const completedCount = trainings.filter(t => t.status === 'completed').length;
  const totalCount = trainings.length;

  return {
    trainings,
    completedCount,
    totalCount,
    isLoading,
    error,
    refetch: fetchTrainings,
  };
}

/**
 * Hook to update DSP status
 */
export function useUpdateDSPStatus() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = useSelector((state: RootState) => state.auth.user);
  const agencyId = user?.agencyId;

  const updateStatus = useCallback(async (
    dspId: string,
    status: 'active' | 'inactive' | 'suspended'
  ) => {
    try {
      setIsUpdating(true);
      setError(null);
      await updateEmployee(dspId, { status }, agencyId);
      return true;
    } catch (err: any) {
      console.error("Failed to update DSP status:", err);
      setError(err.message || "Failed to update status");
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [agencyId]);

  return {
    updateStatus,
    isUpdating,
    error,
  };
}
