import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ContentEditableCell from "@/components/ContentEditableCell";
import VoiceInputButton from "@/components/VoiceInputButton";
import { VoiceRecordingProvider } from "@/contexts/VoiceRecordingContext";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import { toast } from "sonner";
import { getNoteTitle } from "@/lib/notes/noteTypes";
import HhaNoteHeader, { InfoField } from "@/pages/userPanel/notes/components/HhaNoteHeader";
import {
  useCreateOrUpdateActivityLogMutation,
  useGetSingleActivityLogQuery,
  useSubmitActivityLogNotesMutation,
} from "@/pages/userPanel/notes/api";

type ServiceRow = {
  id: string;
  content: string;
};

const TITLE = getNoteTitle("hha-service-log");

const ACTIVITY_COLUMN_HEADER =
  "Describe the day and how the activities helped the individual work toward the service goal above.";

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

  const [row, setRow] = useState<ServiceRow>({ id: "", content: "" });
  const [submitted, setSubmitted] = useState(false);
  // Latest row for the debounced/serialized autosave (avoids stale closures).
  const rowRef = useRef(row);
  rowRef.current = row;
  const hydratedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Serialize saves so rapid edits never create duplicate notes server-side.
  const saveChain = useRef<Promise<void>>(Promise.resolve());

  const { data: activityLog, isLoading } = useGetSingleActivityLogQuery(activityLogId!, {
    skip: !activityLogId,
  });
  const [mutateNote] = useCreateOrUpdateActivityLogMutation();
  const [submitNotes, { isLoading: isSubmitting }] = useSubmitActivityLogNotesMutation();

  // Lock the form once submitted (log status stays "active" server-side, so a
  // local flag is the reliable in-session signal).
  const readOnly = Boolean(activityLog?.status && activityLog.status !== "active");
  const locked = submitted || readOnly || Boolean(activityLog?.hasSubmittedNotes);

  // Persist the current draft once. Chained so concurrent saves can't create
  // duplicate notes, and the new id is captured immediately for the next save.
  const saveNow = () => {
    saveChain.current = saveChain.current
      .catch(() => {})
      .then(async () => {
        const current = rowRef.current;
        if (locked || !current.content.trim()) return;
        const today = format(new Date(), "yyyy-MM-dd");
        const { data } = await mutateNote({
          activityLog: activityLogId!,
          data: {
            id: current.id,
            startDate: today,
            endDate: today,
            metadata: { description: current.content },
          },
        }).unwrap();
        if (!current.id && data?.id) {
          rowRef.current = { ...rowRef.current, id: data.id };
          setRow((prev) => ({ ...prev, id: data.id }));
        }
      });
    return saveChain.current;
  };

  const updateContent = (value: string) => {
    if (locked) return;
    setRow((prev) => ({ ...prev, content: value }));
    rowRef.current = { ...rowRef.current, content: value };
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveNow, 800);
  };

  // Cancel a pending debounced save on unmount.
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const handleSubmit = async () => {
    if (!rowRef.current.content.trim()) {
      toast.error("Write the activity note before submitting.");
      return;
    }
    clearTimeout(saveTimer.current);
    try {
      await saveNow(); // flush the latest content and ensure the note exists
      const noteId = rowRef.current.id;
      if (!noteId) {
        toast.error("Couldn't save the note. Please try again.");
        return;
      }
      await submitNotes({ activityLog: activityLogId!, logNoteIds: [noteId] }).unwrap();
      setSubmitted(true);
      toast.success("HHA Service Activity Log submitted.");
    } catch (error: any) {
      console.error("Error submitting service activity log:", error);
      toast.error(error?.data?.message || "Failed to submit.");
    }
  };

  useEffect(() => {
    // Hydrate once from the server; ignore later refetches (triggered by autosave
    // invalidation) so they can't clobber what the user is currently typing.
    if (isLoading || hydratedRef.current || !activityLog) return;
    hydratedRef.current = true;
    // Prefer active (editable) notes; fall back to submitted notes so a locked
    // log still renders after a reload. Legacy multi-row notes only surface their
    // first entry — acceptable for this redesigned single-field note.
    const sourceNotes = activityLog.notes?.length
      ? activityLog.notes
      : activityLog.submittedNotes ?? [];
    const note = sourceNotes[0];
    if (note) {
      const content = [note.metadata?.activity, note.metadata?.description]
        .filter(Boolean)
        .join(" — ");
      setRow({ id: note.id, content });
      rowRef.current = { id: note.id, content };
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
          items={[]}
        />

        <div className="mt-6 flex flex-col gap-4">
          <InfoField
            label="Client name"
            value={activityLog?.metadata?.clientName || activityLog?.metadata?.individual || ""}
          />
          <InfoField label="Address" value={activityLog?.metadata?.clientAddress || ""} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ReadOnlyField label="Service code" value={activityLog?.metadata?.serviceCode ?? ""} />
          <ReadOnlyField label="Shift start time" value={activityLog?.metadata?.shiftStartTime ?? ""} />
          <ReadOnlyField label="Shift end time" value={activityLog?.metadata?.shiftEndTime ?? ""} />
        </div>

        <div className="mt-4">
          <ReadOnlyField label="Service goal" value={activityLog?.metadata?.serviceGoal ?? ""} />
        </div>

        <div className="mt-8">
          <div className="rounded-[6px] border border-[#b2b2b3]">
            <div className="border-b border-[#b2b2b3] bg-[#eef4f5] px-4 py-3 text-center text-[14px] font-normal text-black font-['Urbanist',sans-serif]">
              {ACTIVITY_COLUMN_HEADER}
            </div>
            <div className="flex items-stretch px-3 py-2 transition-colors hover:bg-white focus-within:bg-white">
              <ContentEditableCell
                value={row.content}
                onChange={updateContent}
                style={{ minHeight: 260, textAlign: "left" }}
                fieldName="Activity"
                pageTitle={TITLE}
              />
            </div>
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
