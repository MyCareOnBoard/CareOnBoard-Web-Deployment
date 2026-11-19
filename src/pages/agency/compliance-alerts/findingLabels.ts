// Plain-language names for the rules that produce findings. Unknown rules fall back to a generic label
// so a rule added on the server never breaks the screens.
export const RULE_LABELS: Record<string, string> = {
  'note.required_fields': 'Service notes',
  'shift.punctuality': 'Punctuality',
  'shift.clock_out': 'Clock-out',
};
export const ruleLabel = (ruleId?: string | null) => (ruleId && RULE_LABELS[ruleId]) || 'Compliance';

const FIELD_LABELS: Record<string, string> = {late_start: 'Late start', missing_clock_out: 'No clock-out'};
export const fieldLabel = (key: string) => FIELD_LABELS[key] || key;
