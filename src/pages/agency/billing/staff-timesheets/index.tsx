import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, CornerDownLeft, Loader2, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { resolveEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import {
  listStaffTimesheets,
  reviewStaffTimesheet,
  createStaffPayrollInvoice,
  getStaffTimesheetErrorMessage,
  type StaffTimesheet,
  type StaffTimesheetStatus,
} from "@/lib/api/staff-timesheets";
import { useAuth } from "@/utils/auth";
import {
  OperationalAgencyProvider,
  useOperationalAgency,
} from "@/lib/operational-agency/OperationalAgencyProvider";
import { createAgencyOperationalDataAdapter } from "@/lib/operational-agency/dataAdapters";
import { agencyDirectoryRoutes } from "@/lib/operational-agency/routes";
import type { RootState } from "@/store/redux/store";
import { UserType } from "@/utils/auth/types/user.types";
import StaffTimesheetsTable, { StaffTimesheetStatusPill } from "./StaffTimesheetsTable";


// Shared column template (header/rows/skeleton) — full literal class string so Tailwind JIT
function fmtPeriod(start: string, end: string) {
  try {
    return `${format(parseISO(start), "MMM d")} – ${format(parseISO(end), "MMM d, yyyy")}`;
  } catch {
    return `${start} – ${end}`;
  }
}

function SignaturePreview({ signature }: { signature: StaffTimesheet["signature"] }) {
  if (!signature) return <span className="text-[13px] text-[#b2b2b3]">Not signed</span>;
  if (signature.signatureType === "type") {
    return (
      <p className="text-2xl text-[#10141a]" style={{ fontFamily: "Brush Script MT, cursive" }}>
        {signature.signatureData}
      </p>
    );
  }
  return <img src={signature.signatureData} alt="Signature" className="max-h-[80px] max-w-[220px] object-contain" />;
}

function isAbort(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; name?: string };
  return candidate.code === "ERR_CANCELED"
    || candidate.name === "CanceledError"
    || candidate.name === "AbortError";
}

export function StaffTimesheetsApprovalContent() {
  const { agencyId, mode } = useOperationalAgency();
  const { toast } = useToast();

  const [timesheets, setTimesheets] = useState<StaffTimesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<StaffTimesheet | null>(null);
  const [rejectTarget, setRejectTarget] = useState<StaffTimesheet | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const loadControllerRef = useRef<AbortController | null>(null);
  const loadRequestIdRef = useRef(0);
  const mutationControllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    loadControllerRef.current?.abort();
    const controller = new AbortController();
    loadControllerRef.current = controller;
    if (!agencyId) {
      setTimesheets([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { timesheets: rows } = await listStaffTimesheets({
        context: { agencyId },
        query: { scope: "agency", ...(mode ? { mode } : {}) },
        signal: controller.signal,
      });
      if (controller.signal.aborted || loadRequestIdRef.current !== requestId) return;
      setTimesheets(rows);
    } catch (error) {
      if (controller.signal.aborted || loadRequestIdRef.current !== requestId || isAbort(error)) return;
      toast({
        title: "Failed to load timesheets",
        description: getStaffTimesheetErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      if (!controller.signal.aborted && loadRequestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [agencyId, mode, toast]);

  useEffect(() => {
    void load();
    return () => {
      loadRequestIdRef.current += 1;
      loadControllerRef.current?.abort();
      loadControllerRef.current = null;
      mutationControllerRef.current?.abort();
      mutationControllerRef.current = null;
    };
  }, [load]);

  const beginMutation = useCallback(() => {
    mutationControllerRef.current?.abort();
    const controller = new AbortController();
    mutationControllerRef.current = controller;
    return controller;
  }, []);

  async function handleApprove(t: StaffTimesheet) {
    const controller = beginMutation();
    setBusyId(t.id);
    try {
      await reviewStaffTimesheet({
        context: { agencyId },
        timesheetId: t.id,
        status: "approved",
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      toast({ title: "Timesheet approved", variant: "success" });
      await load();
    } catch (error) {
      if (controller.signal.aborted || isAbort(error)) return;
      toast({ title: "Approval failed", description: getStaffTimesheetErrorMessage(error), variant: "destructive" });
    } finally {
      if (!controller.signal.aborted && mutationControllerRef.current === controller) {
        setBusyId(null);
        mutationControllerRef.current = null;
      }
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    if (rejectNotes.trim().length < 1) {
      toast({ title: "Add a reason", description: "A reason is required to reject.", variant: "destructive" });
      return;
    }
    const controller = beginMutation();
    setBusyId(rejectTarget.id);
    try {
      await reviewStaffTimesheet({
        context: { agencyId },
        timesheetId: rejectTarget.id,
        status: "rejected",
        reviewerNotes: rejectNotes.trim(),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      toast({ title: "Timesheet rejected", variant: "success" });
      setRejectTarget(null);
      setRejectNotes("");
      await load();
    } catch (error) {
      if (controller.signal.aborted || isAbort(error)) return;
      toast({ title: "Rejection failed", description: getStaffTimesheetErrorMessage(error), variant: "destructive" });
    } finally {
      if (!controller.signal.aborted && mutationControllerRef.current === controller) {
        setBusyId(null);
        mutationControllerRef.current = null;
      }
    }
  }

  async function handleCreatePayroll(t: StaffTimesheet) {
    const controller = beginMutation();
    setBusyId(t.id);
    try {
      await createStaffPayrollInvoice({
        context: { agencyId },
        payload: {
          staffUid: t.staffUid,
          periodStart: t.periodStart,
          periodEnd: t.periodEnd,
          staffTimesheetIds: [t.id],
        },
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      toast({
        title: "Payroll created",
        description: `Invoice created for ${t.staffName}. Find it in Payroll → Generated.`,
        variant: "success",
      });
      await load();
    } catch (error) {
      if (controller.signal.aborted || isAbort(error)) return;
      toast({ title: "Couldn't create payroll", description: getStaffTimesheetErrorMessage(error), variant: "destructive" });
    } finally {
      if (!controller.signal.aborted && mutationControllerRef.current === controller) {
        setBusyId(null);
        mutationControllerRef.current = null;
      }
    }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-0">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-[28px] font-bold leading-[1.4] text-[#10141a] sm:text-[32px] lg:text-[40px]">
          Staff Timesheets
        </h1>
      </div>

      <StaffTimesheetsTable
        timesheets={timesheets}
        loading={loading}
        busyId={busyId}
        onView={setViewing}
        onApprove={handleApprove}
        onReject={(timesheet) => {
          setRejectTarget(timesheet);
          setRejectNotes("");
        }}
        onCreatePayroll={handleCreatePayroll}
      />

      {/* Detail modal */}
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="flex w-[560px] max-w-[95vw] flex-col gap-4 rounded-[24px] bg-white p-6">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6 text-[20px] font-bold leading-snug text-[#10141a]">
                  {viewing.staffName || "Staff timesheet"}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Review submitted hours, signature, and payroll status for this staff timesheet.
                </DialogDescription>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StaffTimesheetStatusPill status={viewing.status} />
                  <span className="text-[13px] text-[#6b7280]">{fmtPeriod(viewing.periodStart, viewing.periodEnd)}</span>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                <div>
                  <p className="mb-0.5 text-[12px] font-semibold uppercase tracking-wide text-[#808081]">Role</p>
                  <p className="text-[14px] text-[#6b7280]">{viewing.role || "—"}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-[12px] font-semibold uppercase tracking-wide text-[#808081]">Total hours</p>
                  <p className="text-[14px] font-semibold text-[#10141a]">{viewing.totalHours}h</p>
                </div>
                <div>
                  <p className="mb-0.5 text-[12px] font-semibold uppercase tracking-wide text-[#808081]">Program</p>
                  <p className="text-[14px] uppercase text-[#6b7280]">{viewing.mode}</p>
                </div>
              </div>

              {viewing.reviewerNotes && (
                <div className="rounded-lg bg-[#fef2f2] p-3">
                  <p className="mb-0.5 text-[12px] font-semibold uppercase tracking-wide text-[#ef4444]">Rejection reason</p>
                  <p className="text-[13px] text-[#7f1d1d]">{viewing.reviewerNotes}</p>
                </div>
              )}

              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#808081]">Entries</p>
                <div className="overflow-hidden rounded-lg border border-[#e5e7eb]">
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr_60px] gap-2 bg-[#f9fafb] px-3 py-2 text-[11px] font-semibold uppercase text-[#808081]">
                    <span>Day</span>
                    <span>Date</span>
                    <span>In</span>
                    <span>Out</span>
                    <span>Hrs</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {viewing.entries.map((e, i) => (
                      <div
                        key={`${e.week}-${e.day}-${i}`}
                        className="grid grid-cols-[1fr_1fr_1fr_1fr_60px] gap-2 border-t border-[#e5e7eb] px-3 py-2 text-[13px] text-[#353535]"
                      >
                        <span>{e.day}</span>
                        <span>{e.date}</span>
                        <span>{e.checkIn}</span>
                        <span>{e.checkOut}</span>
                        <span>{e.hours ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#808081]">Signature</p>
                <div className="flex min-h-[60px] items-center rounded-lg border border-[#e5e7eb] px-3 py-2">
                  <SignaturePreview signature={viewing.signature} />
                </div>
              </div>

              <DialogFooter className="flex justify-end gap-2 pt-1">
                <Button variant="outline" className="rounded-full" onClick={() => setViewing(null)}>
                  Close
                </Button>
                {viewing.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      className="gap-1.5 rounded-full border-[#ef4444] text-[#ef4444] hover:bg-[#fef2f2]"
                      onClick={() => {
                        setRejectTarget(viewing);
                        setRejectNotes("");
                        setViewing(null);
                      }}
                    >
                      <CornerDownLeft className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                    <Button
                      className="gap-1.5 rounded-full bg-[#0eaf52] text-white hover:bg-[#0c9a48]"
                      onClick={() => {
                        handleApprove(viewing);
                        setViewing(null);
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                  </>
                )}
                {viewing.status === "approved" && !viewing.payrollInvoiceId && (
                  <Button
                    className="gap-1.5 rounded-full bg-[#00b4b8] text-white hover:bg-[#009da1]"
                    onClick={() => {
                      handleCreatePayroll(viewing);
                      setViewing(null);
                    }}
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    Create payroll
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Reject timesheet</DialogTitle>
            <DialogDescription className="text-sm text-[#808081]">
              Let {rejectTarget?.staffName || "the staff member"} know why this timesheet is being rejected.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Reason for rejection…"
            aria-label="Reason for rejection"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={busyId === rejectTarget?.id || rejectNotes.trim().length < 1}
              className="rounded-full bg-[#ef4444] text-white hover:bg-[#dc2626]"
            >
              {busyId === rejectTarget?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject timesheet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StaffTimesheetsApprovalPage() {
  const { agencyId, mode } = useOperationalAgency();
  return <StaffTimesheetsApprovalContent key={`${agencyId}:${mode ?? "all"}`} />;
}

export function AgencyStaffTimesheetsApprovalPage() {
  const { user } = useAuth();
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const supportedClientTypes = user?.agency?.supportedClientTypes ?? [];
  const storedMode = useSelector((state: RootState) => state.agencyMode.modeByAgency[agencyId]);
  const mode = resolveEffectiveAgencyMode(supportedClientTypes, storedMode);
  const data = useMemo(() => createAgencyOperationalDataAdapter(agencyId), [agencyId]);
  const accessList = user?.profile?.accessList ?? [];
  const isAgencyOwner = user?.userType === UserType.AGENCY;

  if (!agencyId) {
    return <p role="alert" className="px-4 py-8 text-sm text-[#808081]">Sign in again to manage billing.</p>;
  }

  return (
    <OperationalAgencyProvider
      key={agencyId}
      actor="agency"
      agencyId={agencyId}
      agency={{
        id: agencyId,
        name: user?.agency?.name || user?.fullName || "Agency",
        status: "active",
        supportedClientTypes,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      }}
      mode={mode}
      capabilities={{
        canManageShifts: true,
        canManageBilling: true,
        shiftMaintenance: true,
        canAccessClientDirectory: isAgencyOwner || accessList.includes("Client Management"),
        canAccessStaffDirectory: isAgencyOwner || accessList.includes("DSP Management"),
      }}
      directoryRoutes={agencyDirectoryRoutes}
      data={data}
    >
      <StaffTimesheetsApprovalPage />
    </OperationalAgencyProvider>
  );
}
