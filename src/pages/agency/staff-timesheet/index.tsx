import { useMemo, useRef, useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronUp,
  Save,
  Send,
  Loader2,
  Clock,
  CalendarRange,
  PenLine,
  Check,
  Layers,
} from "lucide-react";
import TimesheetWeek from "@/pages/userPanel/manualShiftManagement/components/TimesheetWeek";
import ConfirmShiftModal from "@/pages/userPanel/manualShiftManagement/components/ConfirmShiftModal";
import SuccessModal from "@/pages/userPanel/manualShiftManagement/components/SuccessModal";
import DigitalSignatureModal from "@/pages/applicant/application/components/DigitalSignature";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/utils/auth";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import {
  WeekData,
  EMPTY_WEEK,
  calculateWeekHours,
  buildTimesheetEntries,
  entriesToWeekData,
} from "./timesheetEntries";
import {
  listStaffTimesheets,
  createStaffTimesheet,
  updateStaffTimesheet,
  getStaffTimesheetErrorMessage,
  type StaffTimesheetSignature,
} from "@/lib/api/staff-timesheets";

type Signature = StaffTimesheetSignature;

/** Renders a saved signature: typed shows as script text, drawn/uploaded as an image. */
function SignaturePreview({ signature }: { signature: Signature }) {
  if (signature.signatureType === "type") {
    return (
      <p
        className="max-w-full break-words text-center text-3xl leading-tight text-[#10141a]"
        style={{ fontFamily: "Brush Script MT, cursive" }}
      >
        {signature.signatureData}
      </p>
    );
  }
  return (
    <img
      src={signature.signatureData}
      alt="Signature"
      className="max-h-[110px] max-w-full object-contain"
    />
  );
}

export default function StaffTimesheetPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const mode = useEffectiveAgencyMode();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  const [week1Data, setWeek1Data] = useState<WeekData>(structuredClone(EMPTY_WEEK));
  const [week2Data, setWeek2Data] = useState<WeekData>(structuredClone(EMPTY_WEEK));
  const [week1Expanded, setWeek1Expanded] = useState(true);
  const [week2Expanded, setWeek2Expanded] = useState(false);

  const [signature, setSignature] = useState<Signature | null>(null);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  // Guards the save/submit network call so a rapid double-click can't create two drafts.
  const persistInFlightRef = useRef(false);

  const employeeName = user?.fullName || user?.profile?.name || "";
  const role = user?.profile?.role || "";

  // Load the staff member's current draft (if any) to continue editing.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { timesheets } = await listStaffTimesheets({ scope: "mine", status: "draft", limit: 1 });
        if (!active) return;
        const draft = timesheets[0];
        if (draft) {
          setDraftId(draft.id);
          const { week1, week2 } = entriesToWeekData(draft.entries || []);
          setWeek1Data(week1);
          setWeek2Data(week2);
          if (draft.signature) setSignature(draft.signature);
        }
      } catch (error) {
        console.error("Failed to load draft timesheet:", error);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function buildPayload(status: "draft" | "pending") {
    const { entries, periodStart, periodEnd } = buildTimesheetEntries(week1Data, week2Data, new Date());
    return { entries, periodStart, periodEnd, status };
  }

  async function persist(status: "draft" | "pending") {
    if (!mode) {
      toast({
        title: "Select a program",
        description: "Choose DDD or HHA at the top before saving your timesheet.",
        variant: "destructive",
      });
      return false;
    }

    const { entries, periodStart, periodEnd } = buildPayload(status);
    if (entries.length === 0 || !periodStart || !periodEnd) {
      toast({
        title: "No timesheet entries",
        description: "Add at least one day with a date, check-in and check-out.",
        variant: "destructive",
      });
      return false;
    }

    if (status === "pending" && !signature) {
      toast({
        title: "Signature required",
        description: "Add your signature before submitting.",
        variant: "destructive",
      });
      return false;
    }

    const signatureInfo = signature ? `Signed: User(${signature.signatureType})` : "";
    const base = {
      entries,
      periodStart,
      periodEnd,
      mode,
      signatureInfo,
      ...(signature ? { signature } : {}),
    };

    if (persistInFlightRef.current) return false;
    persistInFlightRef.current = true;
    try {
      if (draftId) {
        await updateStaffTimesheet(draftId, { ...base, status });
      } else {
        const created = await createStaffTimesheet({ ...base, status });
        setDraftId(created.id);
      }
      return true;
    } catch (error) {
      toast({
        title: status === "pending" ? "Submission failed" : "Save failed",
        description: getStaffTimesheetErrorMessage(error),
        variant: "destructive",
      });
      return false;
    } finally {
      persistInFlightRef.current = false;
    }
  }

  async function handleSave() {
    setSaving(true);
    const ok = await persist("draft");
    setSaving(false);
    if (ok) {
      toast({ title: "Draft saved", description: "Your timesheet was saved as a draft.", variant: "success" });
    }
  }

  function handleSubmitClick() {
    if (!signature) {
      toast({
        title: "Signature required",
        description: "Add your signature before submitting.",
        variant: "destructive",
      });
      return;
    }
    const { entries } = buildPayload("pending");
    if (entries.length === 0) {
      toast({
        title: "No timesheet entries",
        description: "Add at least one day before submitting.",
        variant: "destructive",
      });
      return;
    }
    setConfirmOpen(true);
  }

  async function handleConfirmSubmit() {
    setSubmitting(true);
    const ok = await persist("pending");
    setSubmitting(false);
    setConfirmOpen(false);
    if (ok) {
      // The submitted sheet leaves the draft slot; reset for the next period.
      setDraftId(null);
      setWeek1Data(structuredClone(EMPTY_WEEK));
      setWeek2Data(structuredClone(EMPTY_WEEK));
      setSignature(null);
      setSuccessOpen(true);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent" />
      </div>
    );
  }

  const totalHours =
    Math.round((calculateWeekHours(week1Data) + calculateWeekHours(week2Data)) * 100) / 100;
  const { periodStart, periodEnd } = buildTimesheetEntries(week1Data, week2Data, new Date());
  const periodLabel =
    periodStart && periodEnd
      ? `${format(parseISO(periodStart), "MMM d")} – ${format(parseISO(periodEnd), "MMM d, yyyy")}`
      : "—";

  return (
    <>
      <div className="min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-0">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
          <div>
            <h1 className="text-[28px] font-bold leading-[1.4] text-[#10141a] sm:text-[32px] lg:text-[40px]">
              Timesheet
            </h1>
            <p className="mt-1 text-[13px] text-[#808081] sm:text-sm">Bi-weekly staff work record</p>
          </div>
          {draftId && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#b2b2b3] px-3 py-1 text-[12px] font-medium text-[#808081]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b2b2b3]" />
              Draft in progress
            </span>
          )}
        </div>

        <div className="space-y-6">
          {/* Employee details */}
          <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <h3 className="mb-4 text-[15px] font-bold text-[#10141a]">Employee details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#6b7280]">Employee</label>
                <Input
                  value={employeeName}
                  disabled
                  className="rounded-lg border-[#e5e5e6] bg-[#f8f9fa] text-[#10141a] disabled:opacity-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#6b7280]">Role</label>
                <Input
                  value={role || "—"}
                  disabled
                  className="rounded-lg border-[#e5e5e6] bg-[#f8f9fa] text-[#10141a] disabled:opacity-100"
                />
              </div>
            </div>
          </div>

          {/* Weeks */}
          {[
            { label: "Week 1", data: week1Data, setData: setWeek1Data, expanded: week1Expanded, setExpanded: setWeek1Expanded },
            { label: "Week 2", data: week2Data, setData: setWeek2Data, expanded: week2Expanded, setExpanded: setWeek2Expanded },
          ].map((week) => (
            <div key={week.label} className="overflow-hidden rounded-2xl bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-[15px] font-bold text-[#10141a]">{week.label}</h3>
                  <span className="rounded-full bg-[#00b4b814] px-2.5 py-0.5 text-[12px] font-semibold text-[#008f93]">
                    {calculateWeekHours(week.data)}h
                  </span>
                </div>
                <Button
                  onClick={() => week.setExpanded(!week.expanded)}
                  variant="ghost"
                  className="h-auto rounded-full bg-[#f3f4f6] px-3 py-1.5 text-xs font-medium text-[#6b7280] hover:bg-[#e5e7eb]"
                >
                  {week.expanded ? (
                    <>
                      <ChevronUp className="mr-1.5 h-4 w-4" /> Collapse
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1.5 h-4 w-4" /> Expand
                    </>
                  )}
                </Button>
              </div>
              {week.expanded && (
                <TimesheetWeek
                  weekData={week.data}
                  onWeekDataChange={week.setData}
                  totalHours={calculateWeekHours(week.data)}
                />
              )}
            </div>
          ))}

          {/* Summary + Signature side by side */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Summary */}
            <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#00b4b8]" />
                <h3 className="text-[15px] font-bold text-[#10141a]">Summary</h3>
              </div>
              <div className="rounded-xl bg-[#00b4b80a] p-4 text-center">
                <p className="text-[12px] font-medium uppercase tracking-wide text-[#008f93]">Total hours</p>
                <p className="mt-1 text-[32px] font-bold leading-none text-[#10141a]">
                  {totalHours}
                  <span className="ml-1 text-[16px] font-semibold text-[#6b7280]">h</span>
                </p>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[13px] text-[#6b7280]">
                    <Layers className="h-3.5 w-3.5" /> Program
                  </span>
                  {mode ? (
                    <span className="rounded-full bg-[#00b4b814] px-2.5 py-0.5 text-[12px] font-semibold uppercase text-[#008f93]">
                      {mode}
                    </span>
                  ) : (
                    <span className="text-[13px] font-medium text-[#f97316]">Not selected</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[13px] text-[#6b7280]">
                    <CalendarRange className="h-3.5 w-3.5" /> Pay period
                  </span>
                  <span className="text-[13px] font-medium text-[#10141a]">{periodLabel}</span>
                </div>
              </div>
            </div>

            {/* Signature */}
            <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-[#00b4b8]" />
                  <h3 className="text-[15px] font-bold text-[#10141a]">Signature</h3>
                </div>
                {signature && (
                  <button
                    onClick={() => setSignatureModalOpen(true)}
                    className="text-[12px] font-semibold text-[#00b4b8] hover:underline"
                  >
                    Re-sign
                  </button>
                )}
              </div>
              <div
                onClick={() => setSignatureModalOpen(true)}
                className="flex min-h-[130px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#e5e5e6] p-4 text-center transition-colors hover:border-[#00b4b8] hover:bg-[#f8fbfb]"
              >
                {signature ? (
                  <SignaturePreview signature={signature} />
                ) : (
                  <>
                    <PenLine className="h-6 w-6 text-[#b2b2b3]" />
                    <span className="text-[13px] text-[#808081]">Tap to sign</span>
                  </>
                )}
              </div>
              {signature ? (
                <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-[#0eaf52]">
                  <Check className="h-3.5 w-3.5" /> Signed
                </p>
              ) : (
                <p className="mt-2 text-[12px] text-[#808081]">Required before you can submit.</p>
              )}
            </div>
          </div>

          {/* Actions — Save draft, then Submit */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-end">
            <Button
              onClick={handleSave}
              variant="outline"
              disabled={saving || submitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full border-[#e5e7eb] font-semibold text-[#4b5563] hover:bg-[#f3f4f6] sm:w-auto sm:min-w-[180px] sm:px-8"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {saving ? "Saving..." : "Save draft"}
            </Button>
            <Button
              onClick={handleSubmitClick}
              disabled={saving || submitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#00b4b8] font-semibold text-white hover:bg-[#009da1] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[180px] sm:px-8"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              {submitting ? "Submitting..." : "Submit for approval"}
            </Button>
          </div>
        </div>
      </div>

      <DigitalSignatureModal
        isOpen={signatureModalOpen}
        setIsOpen={setSignatureModalOpen}
        onSave={(sig) => {
          setSignature(sig);
          setSignatureModalOpen(false);
          toast({ title: "Signature added", variant: "success" });
        }}
        skipBackend
        useCase="staff-timesheet-user"
      />

      <ConfirmShiftModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmSubmit}
        loading={submitting}
      />

      <SuccessModal open={successOpen} onOpenChange={setSuccessOpen} />
    </>
  );
}
