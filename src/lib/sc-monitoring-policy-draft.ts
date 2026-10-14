import { documentReviewTypes, emptyDocumentReviewIntervals, type DocumentReviewIntervals, type MonitoringPolicy, type MonitoringPolicyInput } from '@/lib/api/sc-monitoring-policy';

export type MonitoringPolicyDraft = MonitoringPolicyInput & {
  documentReviewsEnabled: boolean;
  documentRemindersEnabled: boolean;
  documentReviewIntervals: DocumentReviewIntervals;
};

export function createMonitoringDraft(policy?: MonitoringPolicy): MonitoringPolicyDraft {
  return {
    expectedRevision: policy?.revision ?? 0,
    enabled: policy?.enabled ?? false,
    intervalDays: policy?.intervalDays ?? null,
    qualifyingMethods: [...(policy?.qualifyingMethods ?? [])],
    requireDirectContact: policy?.requireDirectContact ?? false,
    remindersEnabled: policy?.remindersEnabled ?? false,
    documentReviewsEnabled: policy?.documentReviewsEnabled ?? false,
    documentRemindersEnabled: policy?.documentRemindersEnabled ?? false,
    documentReviewIntervals: { ...emptyDocumentReviewIntervals(), ...policy?.documentReviewIntervals },
    changeReason: '',
  };
}

export function monitoringSettingsEqual(a: MonitoringPolicyInput, b: MonitoringPolicyInput): boolean {
  const settings = (input: MonitoringPolicyInput) => ({
    enabled: input.enabled,
    intervalDays: input.intervalDays,
    qualifyingMethods: [...input.qualifyingMethods].sort(),
    requireDirectContact: input.requireDirectContact,
    remindersEnabled: input.remindersEnabled,
    documentReviewsEnabled: input.documentReviewsEnabled ?? false,
    documentRemindersEnabled: input.documentRemindersEnabled ?? false,
    documentReviewIntervals: { ...emptyDocumentReviewIntervals(), ...input.documentReviewIntervals },
  });
  return JSON.stringify(settings(a)) === JSON.stringify(settings(b));
}

export function monitoringValidationError(draft: MonitoringPolicyDraft, timezone: string | null): string | null {
  const validInterval = (days: number | null) => days === null || Number.isInteger(days) && days >= 1 && days <= 365;
  if (!validInterval(draft.intervalDays)) return 'Contact interval must be a whole number from 1 to 365.';
  if (documentReviewTypes.some(type => !validInterval(draft.documentReviewIntervals[type]))) return 'Document review intervals must be whole numbers from 1 to 365.';
  if (draft.enabled && draft.intervalDays === null) return 'Add an interval for monitoring contact schedules.';
  if (draft.enabled && !draft.qualifyingMethods.length) return 'Select at least one qualifying contact method.';
  if (draft.documentReviewsEnabled && !documentReviewTypes.some(type => draft.documentReviewIntervals[type] !== null)) return 'Add an interval for at least one document type.';
  if (draft.enabled || draft.remindersEnabled || draft.documentReviewsEnabled || draft.documentRemindersEnabled) {
    try {
      if (!timezone) throw new Error('Missing timezone');
      new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    } catch {
      return 'Set a valid agency time zone before enabling monitoring schedules, document reviews, or reminders.';
    }
  }
  return null;
}
