import LockedNoteEvidence from '@/pages/shared/notes/LockedNoteEvidence';
import { useNoteOperation } from '@/lib/notes/useNoteOperation';
import { NoteFieldErrors, focusNoteError } from '@/pages/shared/notes/NoteFieldErrors';
import type { NoteFieldError, ActivityLogNote } from '@/pages/userPanel/notes/apiTypes';
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
  const id = new URLSearchParams(useLocation().search).get("id");
  return <HhaServiceActivityLogPageForm key={id} />;
}

function HhaServiceActivityLogPageForm() {
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
  const operation = useNoteOperation();
  const submissionAttempt = useRef<string | null>(null);
  const submitPending = useRef(false);
  const [flushing, setFlushing] = useState(false);
  const [retrySubmission, setRetrySubmission] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<NoteFieldError[]>([]);
  const [mutateNote] = useCreateOrUpdateActivityLogMutation();
  const [submitNotes, { isLoading: isSubmitting }] = useSubmitActivityLogNotesMutation();

  // Lock the form once submitted (log status stays "active" server-side, so a
  // local flag is the reliable in-session signal).
  const readOnly = Boolean(activityLog?.status && activityLog.status !== "active");
  const locked = submitted || readOnly || Boolean(!activityLog?.notes?.length && ((activityLog?.submittedNotes?.length ?? 0) + (activityLog?.approvedNotes?.length ?? 0)));

  // Persist the current draft once. Chained so concurrent saves can't create
  // duplicate notes, and the new id is captured immediately for the next save.
  const saveNow = () => {
    saveChain.current = saveChain.current
      .catch(() => {})
      .then(async () => {
        const current = rowRef.current;
        if (locked || retrySubmission) return;
        if (!current.content.trim()) throw new Error('Write the activity note before submitting.');
        if (activityLog?.shiftId && !activityLog.serviceDate) throw new Error("The linked service date is unavailable. Ask your agency to review this shift.");
        const today = activityLog?.serviceDate ?? format(new Date(), "yyyy-MM-dd");
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
    if (locked || retrySubmission || submitPending.current) return;
    setRow((prev) => ({ ...prev, content: value }));
    rowRef.current = { ...rowRef.current, content: value };
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void saveNow().catch(() => toast.error('Your changes could not be saved. Try again.')); }, 800);
  };

  // Cancel a pending debounced save on unmount.
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const handleSubmit = async () => {
    if (submitPending.current) return;
    submitPending.current = true; setFlushing(true);
    if (!rowRef.current.content.trim()) {
      submitPending.current = false; setFlushing(false);
      toast.error("Write the activity note before submitting.");
      return;
    }
    clearTimeout(saveTimer.current);
    try {
      if (!submissionAttempt.current) await saveNow(); // flush latest content only before a new submission
      const noteId = submissionAttempt.current ?? rowRef.current.id;
      if (!noteId) {
        toast.error("Couldn't save the note. Please try again.");
        return;
      }
      submissionAttempt.current = noteId;
      await operation.run({action: 'submit', resourceId: activityLogId!, noteIds: [noteId]}, operationId => submitNotes({ activityLog: activityLogId!, logNoteIds: [noteId] , operationId}).unwrap());
      submissionAttempt.current = null; setRetrySubmission(false);
      setSubmitted(true);
      toast.success("HHA Service Activity Log submitted.");
    } catch (error: any) {
      const definitive = typeof error?.status === 'number' && error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429;
      if (definitive) submissionAttempt.current = null;
      setRetrySubmission(Boolean(submissionAttempt.current));
      setFieldErrors(error?.data?.fieldErrors ?? []);
      focusNoteError(error?.data?.fieldErrors ?? []);
      console.error("Error submitting service activity log:", error);
      toast.error(error?.data?.message || "Failed to submit.");
    } finally { submitPending.current = false; setFlushing(false); }
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
      : [...(activityLog.submittedNotes ?? []), ...(activityLog.approvedNotes ?? [])];
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

  const editDraft = async (note: ActivityLogNote) => {
    if (operation.pending || submitPending.current || retrySubmission) return;
    try {
      if (!locked && rowRef.current.content.trim()) await saveNow();
      const next = {id: note.id, content: [note.metadata?.activity, note.metadata?.description].filter(Boolean).join(' � ')};
      rowRef.current = next; setRow(next);
      setSubmitted(false); setFieldErrors([]);
    } catch { toast.error('Save the current draft before opening another row.'); }
  };


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

        <div className="mt-8" data-note-id={row.id}>
          <NoteFieldErrors errors={fieldErrors} />
      <LockedNoteEvidence onEdit={note => void editDraft(note)} displayedId={row.id} notes={[...(activityLog?.notes ?? []).map(note => ({...note, status: "active" as const})), ...(activityLog?.submittedNotes ?? []).map(note => ({...note, status: "submitted" as const})), ...(activityLog?.approvedNotes ?? []).map(note => ({...note, status: "approved" as const}))]} />
      {retrySubmission ? <p role="status" className="text-sm">Submission could not be confirmed. Submit again to retry safely before editing.</p> : null}
          <div className="rounded-[6px] border border-[#b2b2b3]">
            <div className="border-b border-[#b2b2b3] bg-[#eef4f5] px-4 py-3 text-center text-[14px] font-normal text-black font-['Urbanist',sans-serif]">
              {ACTIVITY_COLUMN_HEADER}
            </div>
            <div className="flex items-stretch px-3 py-2 transition-colors hover:bg-white focus-within:bg-white">
              <ContentEditableCell
                fieldKey="description"
                readOnly={locked || operation.pending || retrySubmission || flushing}
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
              disabled={locked || isSubmitting || operation.pending || flushing}
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
