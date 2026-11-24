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

// What a person should do next, by the recommendation the server attached to the finding.
const NEXT_STEPS: Record<string, string> = {
  'refresher.documentation': 'Review the notes with this staff member and consider a documentation refresher training.',
  'review.punctuality': 'Check the schedule and talk with this staff member about start times.',
  'review.clock_out': 'Remind this staff member to clock out, and check the shifts with no clock-out.',
  'review.document_renewals': 'Ask for the renewed documents and set reminders before the next expiry.',
  'review.training_deadlines': 'Check which trainings are overdue and agree dates to finish them.',
};
export const nextStep = (key?: string | null) => (key && NEXT_STEPS[key]) || null;

const TREND_WORDS: Record<string, string> = {worsening: 'getting worse', improving: 'getting better', stable: 'about the same'};
/** "Before: 1 of 10 · getting worse", or null when there is no earlier period to compare with. */
export const trendLine = (trend?: string | null, prior?: {numerator: number; denominator: number} | null) =>
  prior && trend && TREND_WORDS[trend] ? `Before: ${prior.numerator} of ${prior.denominator} · ${TREND_WORDS[trend]}` : null;
