import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { NoteFieldError } from '@/pages/userPanel/notes/apiTypes';

const labels: Record<string, string> = {goalIds:'goal selection', supportProvided:'support provided', responseAndProgress:'response and progress', recordedUnits:'recorded units', serviceDate:'service date', description: 'activity description', activities: 'activities', activity: 'activity', units: 'units', strategies: 'strategies', location: 'location', notes: 'activity notes', seProfessional: 'SE professional', noOfHoursStart: 'start time', noOfHoursEnd: 'end time', noOfHoursTotal: 'total hours', whatWasDone: 'what was done', howDidThisAssist: 'how this assisted', activityConducted: 'activity conducted', servicesProvided: 'services provided', EmployeeProgress: 'employee progress', training: 'training', employerVision: 'employer vision', achievementPlan: 'achievement plan', checkedActivities: 'activities performed', completedBy: 'completed by', completionDate: 'completion date', startDate: 'service date', endDate: 'end date'};
function fieldElement(error: NoteFieldError) {
  const row = Array.from(document.querySelectorAll<HTMLElement>('[data-note-id]')).find(el => el.dataset.noteId === error.noteId);
  return Array.from(row?.querySelectorAll<HTMLElement>('[data-note-field]') ?? []).find(el => el.dataset.noteField === error.field.replace(/^metadata\./, "")) ?? row;
}
export function focusNoteError(errors: NoteFieldError[]) {
  requestAnimationFrame(() => {
    if (!errors[0]) return;
    const field = fieldElement(errors[0]);
    const control = field?.matches('input,textarea,button') ? field : field?.querySelector<HTMLElement>('input:not(:disabled),button:not(:disabled),[contenteditable="true"],textarea:not(:disabled)');
    control?.focus();
  });
}
export function NoteFieldErrors({errors}: {errors: NoteFieldError[]}) {
  const [targets, setTargets] = useState<Array<HTMLElement | null>>([]);
  useLayoutEffect(() => { setTargets(errors.map(error => {
    const field = fieldElement(error);
    return field?.dataset.noteField ? (field.matches('input,textarea,button') ? field.parentElement : field) : null;
  })); }, [errors]);
  return <>{errors.map((error, index) => {
    const message = <p role="alert" className="my-1 text-xs text-red-700"><button type="button" className="text-left underline" onClick={() => focusNoteError([error])}>Enter a valid {labels[error.field.replace(/^metadata\./, "")] ?? 'value'} for row {Math.max(1, Array.from(document.querySelectorAll<HTMLElement>('[data-note-id]')).findIndex(row => row.dataset.noteId === error.noteId) + 1)}.</button></p>;
    return targets[index] ? createPortal(message, targets[index]!, `${error.noteId}-${error.field}`) : <div key={`${error.noteId}-${error.field}-${index}`}>{message}</div>;
  })}</>;
}
