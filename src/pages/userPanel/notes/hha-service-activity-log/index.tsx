import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import ContentEditableCell from "@/components/ContentEditableCell";
import VoiceInputButton from "@/components/VoiceInputButton";
import { VoiceRecordingProvider } from "@/contexts/VoiceRecordingContext";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import { toast } from "sonner";
import { getNoteTitle } from "@/lib/notes/noteTypes";
import HhaNoteHeader, { HhaNoteInfoItem } from "@/pages/userPanel/notes/components/HhaNoteHeader";
import {
  useCreateOrUpdateActivityLogMutation,
  useGetSingleActivityLogQuery,
  useSubmitActivityLogNotesMutation,
} from "@/pages/userPanel/notes/api";

type ServiceRow = {
  id: string;
  date: Date | undefined;
  activity: string;
  description: string;
};

const TITLE = getNoteTitle("hha-service-log");

const emptyRows = (): ServiceRow[] =>
  Array.from({ length: 6 }, () => ({ id: "", date: undefined, activity: "", description: "" }));

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-normal text-[#10141a] font-['Urbanist',sans-serif]">{label}</label>
      <Input type="text" value={value} disabled className="h-11 rounded-xl bg-[#fafbfc]" />
    </div>
  );
}

export default function HhaServiceActivityLogPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const activityLogId = new URLSearchParams(useLocation().search).get("id");

  const [rows, setRows] = useState<ServiceRow[]>(emptyRows());
  const [openDateRow, setOpenDateRow] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { data: activityLog, isLoading } = useGetSingleActivityLogQuery(activityLogId!, {
    skip: !activityLogId,
  });
  const [mutateNote] = useCreateOrUpdateActivityLogMutation();
  const [submitNotes, { isLoading: isSubmitting }] = useSubmitActivityLogNotesMutation();

  const infoItems = useMemo<HhaNoteInfoItem[]>(
    () => [
      { label: "Client name", value: activityLog?.metadata?.clientName || activityLog?.metadata?.individual || "" },
      { label: "Date of birth", value: activityLog?.metadata?.clientDob || "" },
      { label: "Address", value: activityLog?.metadata?.clientAddress || "" },
      { label: "Phone", value: activityLog?.metadata?.clientPhone || "" },
    ],
    [activityLog?.metadata],
  );

  // Lock the form once submitted (log status stays "active" server-side, so a
  // local flag is the reliable in-session signal).
  const readOnly = Boolean(activityLog?.status && activityLog.status !== "active");
  const locked = submitted || readOnly;

  const updateRow = async (id: string, index: number, field: keyof ServiceRow, value: any) => {
    if (locked) return;
    const current = rows.find((row, i) => (id ? row.id === id : i === index));
    if (!current) return;
    const nextRow: ServiceRow = { ...current, [field]: value };
    setRows((prev) => prev.map((row, i) => ((id && row.id === id) || (!id && i === index) ? nextRow : row)));
    if (!nextRow.date) return;
    try {
      const { data } = await mutateNote({
        activityLog: activityLogId!,
        data: {
          id: nextRow.id,
          startDate: format(nextRow.date, "yyyy-MM-dd"),
          endDate: format(nextRow.date, "yyyy-MM-dd"),
          metadata: { activity: nextRow.activity, description: nextRow.description },
        },
      }).unwrap();
      if (!nextRow.id && data?.id) {
        setRows((prev) => prev.map((row, i) => (i === index ? { ...row, id: data.id } : row)));
      }
    } catch (error) {
      console.error("Failed to save activity row:", error);
    }
  };

  const handleSubmit = async () => {
    const noteIds = rows.filter((r) => !!r.id).map((r) => r.id);
    if (noteIds.length === 0) {
      toast.error("Add at least one activity (with a date) before submitting.");
      return;
    }
    try {
      await submitNotes({ activityLog: activityLogId!, logNoteIds: noteIds }).unwrap();
      setSubmitted(true);
      toast.success("HHA Service Activity Log submitted.");
    } catch (error: any) {
      console.error("Error submitting service activity log:", error);
      toast.error(error?.data?.message || "Failed to submit.");
    }
  };

  useEffect(() => {
    if (!isLoading && activityLog && activityLog.notes.length > 0) {
      const mapped = activityLog.notes.map((note) => ({
        id: note.id,
        date: note.startDate ? new Date(note.startDate) : undefined,
        activity: note.metadata?.activity ?? "",
        description: note.metadata?.description ?? "",
      }));
      const blanks = emptyRows();
      setRows([...mapped, ...blanks.slice(Math.min(mapped.length, blanks.length))]);
    }
  }, [isLoading, activityLog]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent" />
      </div>
    );
  }

  return (
    <VoiceRecordingProvider pageTitle={TITLE}>
      <div className="min-h-[calc(100vh-200px)] pb-20">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a] font-['Urbanist',sans-serif]">
            Notes
          </h1>
          <Button
            onClick={() => navigate(Routes.userPanel.notes.index)}
            className="flex h-auto items-center gap-2 rounded-full bg-[#00b4b8] px-6 py-3 font-semibold text-white shadow-sm hover:bg-[#009da1]"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Notes
          </Button>
        </div>

        <HhaNoteHeader
          agencyName={activityLog?.metadata?.agencyName ?? user?.agency?.name ?? ""}
          title={TITLE}
          items={infoItems}
        />

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReadOnlyField label="Service code" value={activityLog?.metadata?.serviceCode ?? ""} />
          <ReadOnlyField label="Shift start time" value={activityLog?.metadata?.shiftStartTime ?? ""} />
          <ReadOnlyField label="Shift end time" value={activityLog?.metadata?.shiftEndTime ?? ""} />
          <ReadOnlyField label="Service goal" value={activityLog?.metadata?.serviceGoal ?? ""} />
        </div>

        <div className="mt-8 overflow-x-auto">
          <div className="min-w-[760px] rounded-[6px] border border-[#b2b2b3]">
            <div className="grid grid-cols-[140px_240px_1fr] bg-[#eef4f5]">
              <div className="border-b border-r border-[#b2b2b3] px-4 py-3 text-center text-[14px] font-normal text-black font-['Urbanist',sans-serif]">
                Date
              </div>
              <div className="border-b border-r border-[#b2b2b3] px-4 py-3 text-center text-[14px] font-normal text-black font-['Urbanist',sans-serif]">
                Activity
              </div>
              <div className="border-b border-[#b2b2b3] px-4 py-3 text-center text-[14px] font-normal text-black font-['Urbanist',sans-serif]">
                Description
              </div>
            </div>
            {rows.map((row, index) => (
              <div key={index} className="grid grid-cols-[140px_240px_1fr] bg-white">
                <div className="flex items-center justify-center border-b border-r border-[#b2b2b3] px-2 py-2">
                  <Popover
                    open={openDateRow === String(index)}
                    onOpenChange={(open) => setOpenDateRow(open ? String(index) : null)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={locked}
                        className="flex h-full w-full items-center justify-center text-[14px] text-[#10141a] focus:outline-none disabled:cursor-not-allowed"
                      >
                        {row.date ? format(row.date, "dd.MM.yy") : "Select"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="mt-2 w-auto border-none bg-white p-0 shadow-lg">
                      <Calendar
                        mode="single"
                        selected={row.date}
                        defaultMonth={row.date ?? new Date()}
                        disabled={{ after: new Date() }}
                        onSelect={async (date) => {
                          if (date) {
                            await updateRow(row.id, index, "date", date);
                            setOpenDateRow(null);
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center border-b border-r border-[#b2b2b3] px-3 py-2">
                  <ContentEditableCell
                    value={row.activity}
                    onChange={(value) => updateRow(row.id, index, "activity", value)}
                    fieldName="Activity"
                    pageTitle={TITLE}
                  />
                </div>
                <div className="flex items-center border-b border-[#b2b2b3] px-3 py-2">
                  <ContentEditableCell
                    value={row.description}
                    onChange={(value) => updateRow(row.id, index, "description", value)}
                    fieldName="Description"
                    pageTitle={TITLE}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 max-w-md">
          <label className="mb-1 block text-[12px] font-normal text-[#10141a] font-['Urbanist',sans-serif]">
            Completed by
          </label>
          <Input type="text" value={user?.fullName ?? ""} disabled className="h-11 rounded-xl" />
          <p className="mt-2 text-[12px] font-normal text-black font-['Urbanist',sans-serif]">
            {format(new Date(), "MMMM d, yyyy")}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-end gap-3">
            {locked ? (
              <span className="text-[13px] font-medium text-[#0eaf52]">This note has been submitted.</span>
            ) : null}
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={locked || isSubmitting}
              className="flex h-auto items-center gap-2 rounded-full bg-[#00b4b8] px-6 py-3 font-semibold text-white shadow-sm hover:bg-[#009da1] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {locked ? "Submitted" : isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>

        <VoiceInputButton minimal={false} />
      </div>
    </VoiceRecordingProvider>
  );
}
