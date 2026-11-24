// Plain-language names for the rules that produce findings. Unknown rules fall back to a generic label
// so a rule added on the server never breaks the screens.
export const RULE_LABELS: Record<string, string> = {
  'note.required_fields': 'Service notes',
  'shift.punctuality': 'Punctuality',
  'shift.clock_out': 'Clock-out',
  'document.expiry_lapse': 'Document renewals',
  'training.timeliness': 'Training deadlines',
};
export const ruleLabel = (ruleId?: string | null) => (ruleId && RULE_LABELS[ruleId]) || 'Compliance';

const FIELD_LABELS: Record<string, string> = {late_start: 'Late start', missing_clock_out: 'No clock-out', expired_document: 'Expired', overdue: 'Overdue', expired: 'Expired', completed_late: 'Completed late'};
// A field the server reports that has no name above (a note field such as goal_progress, goalProgress or
// metadata.goal_progress) is shown as plain words: "Goal progress".
const humanize = (key: string) => {
  const words = key.split('.').pop()!.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_\-\s]+/g, ' ').trim().toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : key;
};
export const fieldLabel = (key: string) => FIELD_LABELS[key] || humanize(key);
