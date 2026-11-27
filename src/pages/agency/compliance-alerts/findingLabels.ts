// Plain-language names for the rules that produce findings. Unknown rules fall back to a generic label
// so a rule added on the server never breaks the screens.
export const RULE_LABELS: Record<string, string> = {
  'note.required_fields': 'Service notes',
  'note.timeliness': 'Note deadlines',
  'shift.punctuality': 'Punctuality',
  'shift.clock_out': 'Clock-out',
  'shift.missed_visit': 'Missed visits',
  'shift.gps_verification': 'Location proof',
  'document.expiry_lapse': 'Document renewals',
  'training.timeliness': 'Training deadlines',
};
export const ruleLabel = (ruleId?: string | null) => (ruleId && RULE_LABELS[ruleId]) || 'Compliance';

const FIELD_LABELS: Record<string, string> = {late_start: 'Late start', missing_clock_out: 'No clock-out', expired_document: 'Expired', overdue: 'Overdue', expired: 'Expired', completed_late: 'Completed late', missing_note: 'Never written', unsubmitted_draft: 'Left as a draft', needs_correction: 'Sent back for correction', submitted_late: 'Written late', missed_visit: 'Missed visit', manual_entry: 'Entered manually', no_location: 'No location'};
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
  'review.note_timeliness': 'Agree when notes should be written, and check which shifts still have no note.',
  'review.missed_visits': 'Check this staff member\'s availability and how their shifts are communicated.',
  'review.gps_verification': 'Check the phone\'s location settings and how this person clocks in.',
};
export const nextStep = (key?: string | null) => (key && NEXT_STEPS[key]) || null;

const TREND_WORDS: Record<string, string> = {worsening: 'getting worse', improving: 'getting better', stable: 'about the same'};
/** "Before: 1 of 10 · getting worse", or null when there is no earlier period to compare with. */
export const trendLine = (trend?: string | null, prior?: {numerator: number; denominator: number} | null) =>
  prior && trend && TREND_WORDS[trend] ? `Before: ${prior.numerator} of ${prior.denominator} · ${TREND_WORDS[trend]}` : null;

const DAY_NAMES = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
/** "Mostly the same client (4 of 5)" or "Mostly Mondays (4 of 5)". No client is ever named. */
export const concentrationLine = (c: {dimension: 'client' | 'weekday'; count: number; of: number; weekday?: number}) =>
  c.dimension === 'client' ? `Mostly the same client (${c.count} of ${c.of})` : c.weekday !== undefined && DAY_NAMES[c.weekday] ? `Mostly ${DAY_NAMES[c.weekday]} (${c.count} of ${c.of})` : '';
