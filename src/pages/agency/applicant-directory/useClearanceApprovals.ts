import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { applicantsApi } from "@/lib/api/applicants";
import { agencyApplicantsExtraApi } from "@/lib/api/agencyApplicantsExtra";

export interface PendingApproval {
  id: string;
  name: string;
  progress: number;
}

interface UseClearanceApprovalsResult {
  pendingApprovals: PendingApproval[];
  clearancePage: number;
  isClearanceLoading: boolean;
  actionLoadingId: string | null;
  nextPage: () => void;
  prevPage: () => void;
  approve: (id: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
}

export function useClearanceApprovals(): UseClearanceApprovalsResult {
  const { toast } = useToast();
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [clearancePage, setClearancePage] = useState(1);
  const [isClearanceLoading, setIsClearanceLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchClearanceApprovals = useCallback(async () => {
    setIsClearanceLoading(true);
    try {
      const res = await applicantsApi.directory({
        tab: "clearance",
        limit: 6,
        offset: (clearancePage - 1) * 6,
      });

      if (res?.success && res?.data && res.data.length > 0) {
        const approvals: PendingApproval[] = res.data.map((applicant: any) => ({
          id: applicant.id,
          name: applicant.name,
          progress: (applicant as any).completionPercent ?? 75,
        }));
        setPendingApprovals(approvals);
      } else {
        setPendingApprovals([]);
      }
    } catch (error) {
      console.error("[useClearanceApprovals] Error fetching clearance approvals:", error);
    } finally {
      setIsClearanceLoading(false);
    }
  }, [clearancePage]);

  useEffect(() => {
    fetchClearanceApprovals();
  }, [fetchClearanceApprovals]);

  const approve = async (id: string) => {
    setActionLoadingId(id);
    try {
      await agencyApplicantsExtraApi.approveForHire(id);
      setPendingApprovals((prev) => prev.filter((item) => item.id !== id));
      toast({
        title: "Success",
        description: "Applicant approved for hire",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to approve applicant",
        variant: "destructive",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const cancel = async (id: string) => {
    setActionLoadingId(id);
    try {
      await agencyApplicantsExtraApi.reject(id, "Clearance rejected by agency");
      setPendingApprovals((prev) => prev.filter((item) => item.id !== id));
      toast({
        title: "Success",
        description: "Applicant clearance rejected",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to reject applicant",
        variant: "destructive",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const nextPage = () => {
    setClearancePage((prev) => prev + 1);
  };

  const prevPage = () => {
    setClearancePage((prev) => Math.max(1, prev - 1));
  };

  return {
    pendingApprovals,
    clearancePage,
    isClearanceLoading,
    actionLoadingId,
    nextPage,
    prevPage,
    approve,
    cancel,
  };
}

