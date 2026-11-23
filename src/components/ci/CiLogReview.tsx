import { useEffect, useMemo, useState } from "react";
import EditableNoteActions from "@/pages/shared/notes/EditableNoteActions";
import type { SubmittedNoteDetails, GoalAlignmentInput } from "@/pages/agency/notes/apiTypes";
import { ciApi, CI_ALIGNMENT, CI_PROGRESS, type CiGoal, type CiProgram } from "@/lib/api/ci-tracker";

const progressLabel = (value?: string) => CI_PROGRESS.find((p) => p.value === value)?.label || "";

/**
 * Agency review of a community inclusion / day program log: where each row
 * happened, which approved goals it worked on, and the reviewer's alignment call.
 */
export function CiLogReview({ submittedNote, program, readOnly }: {
  submittedNote: SubmittedNoteDetails;
  program: CiProgram;
  readOnly: boolean;
}) {
  const clientId = submittedNote.metadata?.clientId as string | undefined;
  const [goals, setGoals] = useState<CiGoal[]>([]);
  const [alignment, setAlignment] = useState<GoalAlignmentInput["value"] | "">("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!clientId) return;
    const controller = new AbortController();
    ciApi.clientGoals(clientId, program, controller.signal)
      .then((res) => setGoals(res.approved?.goals || []))
      .catch(() => undefined);
    return () => controller.abort();
  }, [clientId, program]);

  const goalName = useMemo(() => new Map(goals.map((g) => [g.id, g.number ? `${g.number}. ${g.description}` : g.description])), [goals]);
  const rows = [...submittedNote.notes].sort((a, b) => String(a.startDate || "").localeCompare(String(b.startDate || "")));
  const editable = !readOnly && submittedNote.status === "submitted";
  const goalAlignment = alignment ? { value: alignment, comment: comment.trim() || undefined } : undefined;

  return (
    <section aria-label="Goals and alignment" className="mb-6 rounded-[12px] border border-[#e4e7ea] p-4 print:border-0 print:p-0">
      <h3 className="text-[16px] font-semibold text-[#10141a]">Goals worked on</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-[14px]">
          <thead>
            <tr className="border-b border-[#eceef0] text-left text-[12px] font-medium text-[#5b636b]">
              <th scope="col" className="py-2 pr-3 font-medium">Date</th>
              <th scope="col" className="py-2 pr-3 font-medium">Place</th>
              <th scope="col" className="py-2 pr-3 font-medium">Goals</th>
              <th scope="col" className="py-2 font-medium">Progress</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const ids: string[] = Array.isArray(row.metadata?.goalIds) ? row.metadata.goalIds : [];
              const progress = row.metadata?.progress as Record<string, string> | string | null | undefined;
              return (
                <tr key={row.id} className="border-b border-[#f0f1f3] align-top last:border-0">
                  <td className="whitespace-nowrap py-2 pr-3">{row.startDate?.slice(0, 10) || "—"}</td>
                  <td className="py-2 pr-3">{row.metadata?.location || "—"}</td>
                  <td className="py-2 pr-3">
                    {ids.length ? <ul className="flex flex-col gap-0.5">{ids.map((id) => <li key={id}>{goalName.get(id) || "Goal from an earlier version"}</li>)}</ul> : <span className="text-[#b42318]">No goal linked</span>}
                  </td>
                  <td className="py-2">
                    {typeof progress === "string" ? progressLabel(progress)
                      : progress && ids.length ? <ul className="flex flex-col gap-0.5">{ids.map((id) => <li key={id}>{progressLabel(progress[id]) || "—"}</li>)}</ul>
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editable && (
        <div className="mt-4 flex flex-col gap-3 border-t border-[#eceef0] pt-4 print:hidden">
          <fieldset>
            <legend className="text-[14px] font-semibold text-[#10141a]">Do these activities match the client's goals?</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {CI_ALIGNMENT.map((option) => (
                <label key={option.value} className={`cursor-pointer rounded-full border px-3 py-1.5 text-[13px] font-medium ${alignment === option.value ? "border-[#00B5B8] bg-[#00B5B8]/10 text-[#006f72]" : "border-[#e4e7ea] text-[#10141a]"}`}>
                  <input type="radio" name={`alignment-${submittedNote.submissionId}`} className="sr-only" checked={alignment === option.value} onChange={() => setAlignment(option.value)} />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-[#10141a]">Comment for staff (optional)</span>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} className="min-h-[72px] rounded-lg border border-[#e4e7ea] px-3 py-2 text-[14px] outline-none focus-visible:border-[#00B5B8]" />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <EditableNoteActions submissionId={submittedNote.submissionId || submittedNote.id} onEdit={() => undefined} canEdit={false} goalAlignment={goalAlignment} />
          </div>
        </div>
      )}
    </section>
  );
}

export default CiLogReview;
