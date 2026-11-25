import { useMemo, useRef, useState, useEffect, type ReactNode } from "react";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDown,
  ChevronUp,
  Save,
  Send,
  Loader2,
  Clock,
  ClipboardList,
  PenLine,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AgencyPageHeader, AgencyPanel } from "@/components/agency/AgencyShell";
import { AgencyPill, agencyOutlineButton, agencyPrimaryButton } from "@/components/agency/AgencyListKit";
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
  listMyStaffTimesheets,
  createStaffTimesheet,
  updateStaffTimesheet,
  getStaffTimesheetErrorMessage,
  type StaffTimesheetSignature,
} from "@/lib/api/staff-timesheets";

type Signature = StaffTimesheetSignature;

const card = "overflow-hidden rounded-[16px] border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b]";

function TimesheetSkeleton() {
  return (
    <div role="status" aria-label="Loading timesheet" aria-busy="true" className="pb-6">
      <div aria-hidden="true">
        <div className="flex flex-col gap-4 border-b border-[#eceef0] pb-6 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="w-40 h-8" />
              <Skeleton className="w-64 h-4" />
            </div>
          </div>
          <div className="flex gap-2.5">
            <Skeleton className="h-10 w-28 rounded-[10px]" />
            <Skeleton className="h-10 w-40 rounded-[10px]" />
          </div>
        </div>

        <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            {Array.from({ length: 2 }, (_, week) => (
              <div key={week} className={card}>
                <div className="flex items-center justify-between px-4 py-3.5">
                  <Skeleton className="w-20 h-5" />
                  <Skeleton className="h-8 w-24 rounded-[8px]" />
                </div>
                <div className="h-10 border-y border-[#eceef0] bg-[#f8f9fa] dark:border-white/10 dark:bg-white/5" />
                {Array.from({ length: week === 0 ? 7 : 0 }, (_, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 border-b border-[#eceef0] px-4 py-2.5 last:border-b-0 dark:border-white/10">
                    <Skeleton className="w-20 h-4 max-w-full my-auto" />
                    {Array.from({ length: 3 }, (_, field) => <Skeleton key={field} className="h-9 w-full rounded-[8px]" />)}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="space-y-5">
            <div className={cn(card, "p-4")}>
              <Skeleton className="w-24 h-5 mb-4" />
              <Skeleton className="h-44 w-full rounded-[12px]" />
              <Skeleton className="w-32 h-8 mt-4" />
            </div>
            <div className={cn(card, "p-4")}>
              <Skeleton className="w-24 h-5 mb-4" />
              <Skeleton className="h-[130px] w-full rounded-[12px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Renders a saved signature: typed shows as script text, drawn/uploaded as an image. */
function SignaturePreview({ signature }: { signature: Signature }) {
  if (signature.signatureType === "type") {
    return (
      <p
        className="max-w-full break-words text-center text-3xl leading-tight text-[#003839] dark:text-[#f4f6f7]"
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
        const { timesheets } = await listMyStaffTimesheets({ scope: "mine", status: "draft", limit: 1 });
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
    return <TimesheetSkeleton />;
  }

  const totalHours =
    Math.round((calculateWeekHours(week1Data) + calculateWeekHours(week2Data)) * 100) / 100;
  const { periodStart, periodEnd } = buildTimesheetEntries(week1Data, week2Data, new Date());
  const periodLabel =
    periodStart && periodEnd
      ? `${format(parseISO(periodStart), "MMM d")} – ${format(parseISO(periodEnd), "MMM d, yyyy")}`
      : "—";

  const summaryRows: { label: string; value: ReactNode }[] = [
    { label: "Employee", value: employeeName || "—" },
    { label: "Role", value: role || "—" },
    {
      label: "Program",
      value: mode
        ? <span className="uppercase">{mode}</span>
        : <span className="font-medium text-[#b54708] dark:text-[#f0cf6b]">Not selected</span>,
    },
    { label: "Pay period", value: periodLabel },
    { label: "Week 1", value: `${calculateWeekHours(week1Data)} h` },
    { label: "Week 2", value: `${calculateWeekHours(week2Data)} h` },
  ];

  return (
    <>
      <div className="pb-6">
        <AgencyPageHeader
          icon={Clock}
          title="Timesheet"
          description="Bi-weekly staff work record. Save a draft any time, then sign and submit for approval."
          actions={<>
            {draftId && <AgencyPill tone="grey">Draft in progress</AgencyPill>}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || submitting}
              className={agencyOutlineButton}
            >
              {saving ? <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" /> : <Save aria-hidden="true" className="w-4 h-4" />}
              {saving ? "Saving..." : "Save draft"}
            </button>
            <button
              type="button"
              onClick={handleSubmitClick}
              disabled={saving || submitting}
              className={agencyPrimaryButton}
            >
              {submitting ? <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" /> : <Send aria-hidden="true" className="w-4 h-4" />}
              {submitting ? "Submitting..." : "Submit for approval"}
            </button>
          </>}
        />

        <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* Weeks */}
          <div className="min-w-0 space-y-5">
            {[
              { label: "Week 1", data: week1Data, setData: setWeek1Data, expanded: week1Expanded, setExpanded: setWeek1Expanded },
              { label: "Week 2", data: week2Data, setData: setWeek2Data, expanded: week2Expanded, setExpanded: setWeek2Expanded },
            ].map((week) => (
              <section key={week.label} aria-label={week.label} className={card}>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <h2 className="text-[16px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{week.label}</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-[14px] font-medium tabular-nums text-[#007679] dark:text-[#7fd3d3]">
                      {calculateWeekHours(week.data)} h
                    </span>
                    <button
                      type="button"
                      onClick={() => week.setExpanded(!week.expanded)}
                      aria-expanded={week.expanded}
                      className={cn(agencyOutlineButton, "h-8 rounded-[8px] px-2.5 text-[13px] font-medium")}
                    >
                      {week.expanded ? (
                        <>
                          <ChevronUp aria-hidden="true" className="w-4 h-4" /> Collapse
                        </>
                      ) : (
                        <>
                          <ChevronDown aria-hidden="true" className="w-4 h-4" /> Expand
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {week.expanded && (
                  <TimesheetWeek
                    weekData={week.data}
                    onWeekDataChange={week.setData}
                    totalHours={calculateWeekHours(week.data)}
                  />
                )}
              </section>
            ))}
          </div>

          <div className="min-w-0 space-y-5">
            {/* Summary */}
            <AgencyPanel icon={ClipboardList} title="Summary">
              <dl className="space-y-0 rounded-[12px] bg-[#f4f5f6] px-3.5 py-1 dark:bg-white/5">
                {summaryRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">{row.label}</dt>
                    <dd className="text-right text-[14px] text-[#10141a] dark:text-[#f4f6f7]">{row.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex items-end justify-between gap-4 mt-4">
                <span className="text-[14px] font-bold text-[#10141a] dark:text-[#9aa4a8]">Total hours</span>
                <span className="text-[32px] font-bold leading-none tabular-nums text-[#10141a] dark:text-[#f4f6f7]">
                  {totalHours} h
                </span>
              </div>
            </AgencyPanel>

            {/* Signature */}
            <AgencyPanel
              icon={PenLine}
              title="Signature"
              action={signature && (
                <button
                  type="button"
                  onClick={() => setSignatureModalOpen(true)}
                  className="cursor-pointer rounded text-[14px] font-medium text-[#007679] underline underline-offset-4 hover:text-[#005c5e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:text-[#7fd3d3]"
                >
                  Re-sign
                </button>
              )}
            >
              <button
                type="button"
                onClick={() => setSignatureModalOpen(true)}
                aria-label={signature ? "Signature added. Sign again" : "Add your signature"}
                className="flex min-h-[130px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[12px] border border-[#dcdfe2] bg-[#f4f5f6] p-4 text-center transition-colors hover:border-[#007679] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:border-white/15 dark:bg-white/5"
              >
                {signature ? (
                  <SignaturePreview signature={signature} />
                ) : (
                  <>
                    <PenLine aria-hidden="true" className="h-6 w-6 text-[#9aa1a7]" />
                    <span className="text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">Tap to sign</span>
                  </>
                )}
              </button>
              {signature ? (
                <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-[#1a7f37] dark:text-[#7ee2a8]">
                  <Check aria-hidden="true" className="h-3.5 w-3.5" /> Signed
                </p>
              ) : (
                <p className="mt-2 text-[12px] text-[#4b535b] dark:text-[#9aa4a8]">Required before you can submit.</p>
              )}
            </AgencyPanel>
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
