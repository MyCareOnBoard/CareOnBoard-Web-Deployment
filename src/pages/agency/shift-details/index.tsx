import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Loader2, StickyNote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";
import { Routes } from "@/routes/constants";
import {
  deleteShift,
  fetchShiftMaintenanceAudit,
  formatShiftLocation,
  getShiftById,
  Shift,
  type ShiftAuditRecord,
} from "@/lib/api/shifts";
import { shiftToAnomalyRecord } from "@/lib/shift-anomaly-detection";
import { getShiftStatusBadgePresentation } from "@/lib/shift-status-badge";
import { shiftToScheduleFormData } from "@/pages/agency/scheduling/shift-to-schedule-form";
import type { ScheduleFormData } from "@/pages/agency/scheduling/components/AddScheduleModal";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import {
  ACTION_LABELS,
  ANOMALY_LABELS,
  ROLE_LABELS,
  formatShiftAuditTimestamp,
  summarizeChanges,
} from "@/pages/shared/shift-maintenance/audit-display";

const AddScheduleModal = lazy(() => import("@/pages/agency/scheduling/components/AddScheduleModal"));
const ShiftDetailsModal = lazy(() => import("@/components/ShiftDetailsModal"));

const AUDIT_PAGE_SIZE = 25;

function formatClockValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") {
    if (value.includes("AM") || value.includes("PM")) return value;
    try {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? "—" : format(d, "h:mm a");
    } catch {
      return "—";
    }
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "—" : format(value, "h:mm a");
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    const seconds = obj._seconds ?? obj.seconds;
    if (typeof seconds === "number") {
      const ns = (obj._nanoseconds ?? obj.nanoseconds ?? 0) as number;
      const ms = seconds * 1000 + (typeof ns === "number" ? ns / 1_000_000 : 0);
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? "—" : format(d, "h:mm a");
    }
  }
  return "—";
}

function getInitialsFromName(name: string) {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function shiftDeleteConfirmMessage(shift: Shift): string {
  const clientLabel = shift.client
    ? `${shift.client.firstName || ""} ${shift.client.lastName || ""}`.trim() || "this client"
    : "this client";
  const when = shift.date ? format(parseISO(shift.date), "MMMM d, yyyy") : "the scheduled date";
  return `Removes ${clientLabel}'s shift on ${when} from the schedule. This can't be undone.`;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-white/30 py-2.5 last:border-0 sm:flex-row sm:items-start sm:gap-4">
      <dt className="shrink-0 text-[14px] font-medium text-[#808081] sm:w-52">{label}</dt>
      <dd className="min-w-0 text-[14px] font-medium text-[#10141a]">{value}</dd>
    </div>
  );
}

export default function AgencyShiftDetailsPage() {
  const { shiftId } = useParams<{ shiftId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const [shift, setShift] = useState<Shift | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [audits, setAudits] = useState<ShiftAuditRecord[]>([]);
  const [auditCursor, setAuditCursor] = useState<string | null>(null);
  const [auditHasNext, setAuditHasNext] = useState(false);
  const [auditLoadingMore, setAuditLoadingMore] = useState(false);

  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [editFormData, setEditFormData] = useState<ScheduleFormData | null>(null);

  const [showShiftDetailsModal, setShowShiftDetailsModal] = useState(false);

  const [shiftPendingDelete, setShiftPendingDelete] = useState(false);
  const [isDeletingShift, setIsDeletingShift] = useState(false);

  const [auditNoteModal, setAuditNoteModal] = useState<{
    reason: string;
    when: string;
    who: string;
  } | null>(null);

  const agencyId = user?.agencyId;

  const refetchShiftAndRelated = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!shiftId || !agencyId) return;
      const silent = options?.silent === true;
      if (!silent) {
        setPageLoading(true);
      }
      setLoadError(null);
      try {
        const res = await getShiftById(shiftId, { agencyId, client: true, employee: true });
        const s = res.shift;
        setShift(s);

        const auditRes = await fetchShiftMaintenanceAudit({
          agencyId,
          shiftId,
          limit: AUDIT_PAGE_SIZE,
        });

        setAudits(auditRes.audits);
        setAuditCursor(auditRes.nextCursor);
        setAuditHasNext(auditRes.hasNextPage);
      } catch (e) {
        console.error(e);
        setLoadError("We couldn't load this shift. It may have been removed or you may not have access.");
        setShift(null);
      } finally {
        if (!silent) {
          setPageLoading(false);
        }
      }
    },
    [shiftId, agencyId]
  );

  useEffect(() => {
    if (!shiftId || !agencyId) {
      setPageLoading(false);
      if (!agencyId) setLoadError("Sign in again to view shift details.");
      else setLoadError("Missing shift.");
      return;
    }
    refetchShiftAndRelated();
  }, [shiftId, agencyId, refetchShiftAndRelated]);

  const loadMoreAudits = async () => {
    if (!agencyId || !shiftId || !auditCursor || auditLoadingMore) return;
    setAuditLoadingMore(true);
    try {
      const res = await fetchShiftMaintenanceAudit({
        agencyId,
        shiftId,
        limit: AUDIT_PAGE_SIZE,
        startAfter: auditCursor,
      });
      setAudits((prev) => [...prev, ...res.audits]);
      setAuditCursor(res.nextCursor);
      setAuditHasNext(res.hasNextPage);
    } catch {
      toast({
        title: "Couldn't load more activity",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setAuditLoadingMore(false);
    }
  };

  const openUpdateModal = () => {
    if (!shift) return;
    setEditFormData(shiftToScheduleFormData(shift));
    setShowAddScheduleModal(true);
  };

  const handleShiftsUpdated = async (updated: Shift[]) => {
    const next = updated.find((x) => x.id === shiftId);
    if (next) setShift(next);
    await refetchShiftAndRelated({ silent: true });
  };

  const confirmDeleteShift = async () => {
    if (!shift || !shiftId) return;
    setIsDeletingShift(true);
    try {
      await deleteShift(shiftId);
      toast({
        title: "Shift deleted",
        description: "This shift was removed from the schedule.",
      });
      setShiftPendingDelete(false);
      goBack();
    } catch (err) {
      console.error(err);
      toast({
        title: "Couldn't delete shift",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingShift(false);
    }
  };

  const clientName = shift?.client
    ? `${shift.client.firstName || ""} ${shift.client.lastName || ""}`.trim() || "Unknown client"
    : "Unknown client";

  const dspName = shift?.employee?.fullName || "No DSP assigned";

  const derivedAnomaly = useMemo(() => (shift ? shiftToAnomalyRecord(shift) : null), [shift]);

  if (!shiftId) {
    return (
      <div className="px-4 py-8">
        <p className="text-[#808081]">Invalid link.</p>
        <Button type="button" variant="outline" className="mt-4" onClick={goBack}>
          Go back
        </Button>
      </div>
    );
  }

  if (pageLoading && !shift) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#00b4b8]" aria-label="Loading shift" />
      </div>
    );
  }

  if (loadError && !shift) {
    return (
      <div className="px-4 py-8">
        <p className="text-[#10141a] font-medium">Something went wrong</p>
        <p className="mt-2 text-[14px] text-[#808081]">{loadError}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={() => refetchShiftAndRelated()}>
            Try again
          </Button>
          <Button type="button" variant="outline" onClick={goBack}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  if (!shift) return null;

  const scheduleStatusBadge = getShiftStatusBadgePresentation(shift);

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={goBack}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.5)] backdrop-blur-sm transition-colors hover:bg-[rgba(255,255,255,0.7)]"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5 text-[#10141a]" />
            </button>
            <div>
              <h1 className="text-[32px] font-semibold leading-tight text-[#10141a] sm:text-[40px]">
                Shift details
              </h1>
              <p className="mt-1 text-[14px] font-medium text-[#808081]">
                {clientName} · {shift.date ? format(parseISO(shift.date), "MMMM d, yyyy") : "No date"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.5)] px-4 font-semibold text-[#10141a] shadow-sm hover:bg-white/80"
              onClick={openUpdateModal}
            >
              Update shift
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-[rgba(255,255,255,0.5)] bg-white px-4 font-semibold text-[#10141a] shadow-sm hover:bg-white/90"
              onClick={() => setShowShiftDetailsModal(true)}
            >
              Edit clock times
            </Button>
            <Button
              type="button"
              className="rounded-full bg-[#d93c24] px-4 font-semibold text-white hover:bg-[#c52d16]"
              onClick={() => setShiftPendingDelete(true)}
            >
              Delete shift
            </Button>
          </div>
        </div>

        <div className="rounded-[20px] border border-white bg-[#FFFFFF4D] p-6 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:gap-12">
              <div className="flex items-center gap-4">
                <Avatar className="size-[52px] rounded-[8px]">
                  {shift.client?.profileImage && (
                    <AvatarImage src={shift.client.profileImage} alt={clientName} className="object-cover" />
                  )}
                  <AvatarFallback className="rounded-[8px] bg-linear-to-br from-[#00b4b8] to-[#0090a8] text-white">
                    {getInitialsFromName(clientName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[16px] font-semibold text-[#10141a]">{clientName}</p>
                  <p className="text-[14px] text-[#808081]">Client</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Avatar className="size-[52px] rounded-[8px]">
                  {shift.employee?.profilePicture && (
                    <AvatarImage src={shift.employee.profilePicture} alt={dspName} className="object-cover" />
                  )}
                  <AvatarFallback className="rounded-[8px] bg-linear-to-br from-[#00b4b8] to-[#0090a8] text-white">
                    {getInitialsFromName(dspName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[16px] font-semibold text-[#10141a]">{dspName}</p>
                  <p className="text-[14px] text-[#808081]">DSP</p>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex sm:shrink-0 sm:items-center sm:justify-end">
              <Badge variant={scheduleStatusBadge.variant} className="w-fit capitalize">
                {scheduleStatusBadge.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-[20px] border border-white bg-[#FFFFFF4D] p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[18px] font-semibold text-[#10141a]">What needs attention</h2>
            {derivedAnomaly ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit rounded-full"
                onClick={() => setShowShiftDetailsModal(true)}
              >
                Resolve and fix
              </Button>
            ) : null}
          </div>
          {derivedAnomaly ? (
            <div className="flex flex-wrap gap-2">
              {derivedAnomaly.anomalyCodes.map((code) => (
                <span
                  key={code}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${ANOMALY_LABELS[code]?.color || "bg-gray-100 text-gray-600"}`}
                >
                  {ANOMALY_LABELS[code]?.label || code}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-[#808081]">
              Nothing stands out from this shift&apos;s schedule and clock times. Use{" "}
              <span className="font-semibold text-[#10141a]">Edit clock times</span> above to adjust clocks or
              completion. For agency-wide flagged shifts, open{" "}
              <button
                type="button"
                className="font-semibold text-[#10141a] underline underline-offset-2"
                onClick={() => navigate(Routes.agency.shiftMaintenance)}
              >
                Shift maintenance
              </button>
              .
            </p>
          )}
        </div>

        <div className="rounded-[20px] border border-white bg-[#FFFFFF4D] p-6 shadow-sm">
          <h2 className="mb-2 text-[18px] font-semibold text-[#10141a]">Schedule</h2>
          <dl>
            <DetailRow label="Date" value={shift.date ? format(parseISO(shift.date), "MMMM d, yyyy") : "—"} />
            <DetailRow label="Scheduled start" value={shift.startTime || "—"} />
            <DetailRow label="Scheduled end" value={shift.endTime || "—"} />
            <DetailRow label="Location" value={formatShiftLocation(shift.location) || "—"} />
            <DetailRow
              label="Status"
              value={
                <Badge variant={scheduleStatusBadge.variant} className="w-fit capitalize">
                  {scheduleStatusBadge.label}
                </Badge>
              }
            />
            <DetailRow label="Service code" value={shift.serviceCode || "—"} />
            <DetailRow label="Scheduling type" value={shift.schedulingType || "—"} />
            <DetailRow label="ISP outcome" value={shift.ispOutcome || "—"} />
            <DetailRow label="Session duration" value={shift.sessionDuration || "—"} />
            <DetailRow label="Submission" value={shift.submissionStatus || "—"} />
          </dl>
        </div>

        <div className="rounded-[20px] border border-white bg-[#FFFFFF4D] p-6 shadow-sm">
          <h2 className="mb-2 text-[18px] font-semibold text-[#10141a]">Clock activity</h2>
          <dl>
            <DetailRow label="Clock in" value={formatClockValue(shift.clockedInAt)} />
            <DetailRow label="Clock out" value={formatClockValue(shift.clockedOutAt)} />
          </dl>
        </div>

        {(shift.comment || shift.notesType) && (
          <div className="rounded-[20px] border border-white bg-[#FFFFFF4D] p-6 shadow-sm">
            <h2 className="mb-2 text-[18px] font-semibold text-[#10141a]">Notes</h2>
            <dl>
              {shift.notesType ? <DetailRow label="Note type" value={shift.notesType} /> : null}
              {shift.comment ? <DetailRow label="Comment" value={shift.comment} /> : null}
            </dl>
          </div>
        )}

        <div className="rounded-[20px] border border-white bg-[#FFFFFF4D] p-6 shadow-sm">
          <h2 className="mb-4 text-[18px] font-semibold text-[#10141a]">Activity on this shift</h2>
          {audits.length === 0 ? (
            <p className="text-[14px] text-[#808081]">
              No recorded activity for this shift yet. Events appear when people create, clock in or out, or update
              the schedule.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-3 font-medium">Time</th>
                      <th className="pb-3 font-medium">Who</th>
                      <th className="pb-3 font-medium">Role</th>
                      <th className="pb-3 font-medium">Action</th>
                      <th className="pb-3 font-medium">Details</th>
                      <th className="pb-3 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audits.map((a) => {
                      const actionMeta = ACTION_LABELS[a.action] || {
                        label: a.action,
                        color: "bg-gray-100 text-gray-600",
                      };
                      return (
                        <tr key={a.id} className="border-b border-gray-100">
                          <td className="py-3 whitespace-nowrap">{formatShiftAuditTimestamp(a.timestamp)}</td>
                          <td className="py-3">{a.actorName || a.actorUid}</td>
                          <td className="py-3 text-xs text-gray-500">{ROLE_LABELS[a.actorUserType] || a.actorUserType}</td>
                          <td className="py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionMeta.color}`}>
                              {actionMeta.label}
                            </span>
                          </td>
                          <td className="max-w-[220px] truncate py-3 text-gray-600">
                            {summarizeChanges(a.action, a.changes)}
                          </td>
                          <td className="py-3 text-gray-600">
                            {a.reason ? (
                              <button
                                type="button"
                                className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#10141a] transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2 focus-visible:outline-none"
                                aria-label="View activity note"
                                title={a.reason}
                                onClick={() =>
                                  setAuditNoteModal({
                                    reason: a.reason!,
                                    when: formatShiftAuditTimestamp(a.timestamp),
                                    who: a.actorName || a.actorUid,
                                  })
                                }
                              >
                                <StickyNote className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                              </button>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {auditHasNext ? (
                <div className="mt-4 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    disabled={auditLoadingMore}
                    onClick={() => loadMoreAudits()}
                  >
                    {auditLoadingMore ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      "Load more"
                    )}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {showAddScheduleModal && editFormData && (
        <Suspense fallback={null}>
          <AddScheduleModal
            isOpen={showAddScheduleModal}
            onClose={() => {
              setShowAddScheduleModal(false);
              setEditFormData(null);
            }}
            onShiftsUpdated={handleShiftsUpdated}
            editData={editFormData}
            mode="edit"
          />
        </Suspense>
      )}

      {showShiftDetailsModal ? (
        <Suspense fallback={null}>
          <ShiftDetailsModal
            isOpen={showShiftDetailsModal}
            shift={shift}
            anomalyCodes={derivedAnomaly?.anomalyCodes ?? []}
            hydrateFromServer={false}
            onClose={() => setShowShiftDetailsModal(false)}
            onShiftUpdated={(updated) => {
              setShift(updated);
              void refetchShiftAndRelated({ silent: true });
            }}
          />
        </Suspense>
      ) : null}

      <Dialog open={auditNoteModal !== null} onOpenChange={(open) => !open && setAuditNoteModal(null)}>
        <DialogContent className="w-[min(440px,92vw)] gap-0 rounded-[20px] border border-white/30 bg-white p-6 shadow-xl sm:max-w-[440px]">
          <DialogHeader className="items-start space-y-1 text-left">
            <DialogTitle className="text-[18px] font-semibold text-[#10141a]">Activity note</DialogTitle>
            {auditNoteModal ? (
              <p id="audit-note-context" className="text-[13px] leading-snug text-[#808081]">
                {auditNoteModal.when} · {auditNoteModal.who}
              </p>
            ) : null}
          </DialogHeader>
          {auditNoteModal ? (
            <p
              className="mt-4 max-h-[min(320px,50vh)] overflow-y-auto text-[14px] leading-relaxed break-words whitespace-pre-wrap text-[#10141a]"
              aria-describedby="audit-note-context"
            >
              {auditNoteModal.reason}
            </p>
          ) : null}
          <DialogFooter className="mt-6 flex w-full flex-row justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-full font-semibold"
              onClick={() => setAuditNoteModal(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationModal
        isOpen={shiftPendingDelete}
        onClose={() => {
          if (!isDeletingShift) setShiftPendingDelete(false);
        }}
        onConfirm={confirmDeleteShift}
        isDeleting={isDeletingShift}
        title="Delete this shift?"
        message={shiftDeleteConfirmMessage(shift)}
        confirmText="Delete shift"
        cancelText="Cancel"
      />
    </>
  );
}
