import { describe, expect, test } from 'vitest';
import type { MonitoringPolicy } from '@/lib/api/sc-monitoring-policy';
import { createMonitoringDraft, monitoringSettingsEqual, monitoringValidationError, type MonitoringPolicyDraft } from './sc-monitoring-policy-draft';

const emptyDraft: MonitoringPolicyDraft = {
  expectedRevision: 0, enabled: false, intervalDays: null, qualifyingMethods: [], requireDirectContact: false,
  remindersEnabled: false, documentReviewsEnabled: false, documentRemindersEnabled: false,
  documentReviewIntervals: { ISP: null, Assessment: null, Tier: null, SDR: null, PA: null, Enrollment: null, Other: null },
  changeReason: '',
};

describe('createMonitoringDraft', () => {
  test('new clients start with every schedule and reminder off', () => {
    expect(createMonitoringDraft()).toEqual(emptyDraft);
    const first = createMonitoringDraft();
    first.qualifyingMethods.push('phone');
    first.documentReviewIntervals.ISP = 7;
    expect(createMonitoringDraft()).toEqual(emptyDraft);
  });

  test('loaded policies retain revision and copy editable settings without sharing arrays or intervals', () => {
    const policy: MonitoringPolicy = {
      version: 1, revision: 4, enabled: true, intervalDays: 30, qualifyingMethods: ['phone'], requireDirectContact: true,
      remindersEnabled: true, documentReviewsEnabled: true, documentRemindersEnabled: true,
      documentReviewIntervals: { ISP: 90, Assessment: null, Tier: null, SDR: null, PA: null, Enrollment: null, Other: null },
      activatedAt: '2026-10-01', updatedAt: '2026-10-02', updatedBy: 'owner',
    };
    const draft = createMonitoringDraft(policy);
    expect(draft).toEqual({ ...emptyDraft, expectedRevision: 4, enabled: true, intervalDays: 30, qualifyingMethods: ['phone'], requireDirectContact: true,
      remindersEnabled: true, documentReviewsEnabled: true, documentRemindersEnabled: true,
      documentReviewIntervals: { ISP: 90, Assessment: null, Tier: null, SDR: null, PA: null, Enrollment: null, Other: null } });
    draft.qualifyingMethods.push('video');
    draft.documentReviewIntervals.ISP = 7;
    expect(policy.qualifyingMethods).toEqual(['phone']);
    expect(policy.documentReviewIntervals?.ISP).toBe(90);
  });

  test('legacy policies receive complete disabled document settings', () => {
    const policy: MonitoringPolicy = { version: 1, revision: 2, enabled: false, intervalDays: null, qualifyingMethods: [],
      requireDirectContact: false, remindersEnabled: false, activatedAt: null, updatedAt: null, updatedBy: null };
    expect(createMonitoringDraft(policy)).toEqual({ ...emptyDraft, expectedRevision: 2 });
  });
});

describe('monitoringSettingsEqual', () => {
  test('reason, revision, method order and legacy document defaults do not create a settings change', () => {
    const { documentReviewsEnabled: _reviews, documentRemindersEnabled: _reminders, documentReviewIntervals: _intervals, ...legacy } = emptyDraft;
    expect(monitoringSettingsEqual({ ...legacy, expectedRevision: 8, changeReason: 'Review', qualifyingMethods: ['phone', 'video'] },
      { ...emptyDraft, qualifyingMethods: ['video', 'phone'] })).toBe(true);
  });

  test.each([
    { enabled: true }, { intervalDays: 7 }, { qualifyingMethods: ['phone'] }, { requireDirectContact: true },
    { remindersEnabled: true }, { documentReviewsEnabled: true }, { documentRemindersEnabled: true },
    { documentReviewIntervals: { ...emptyDraft.documentReviewIntervals, ISP: 30 } },
  ])('detects a changed policy setting: %j', change => {
    expect(monitoringSettingsEqual(emptyDraft, { ...emptyDraft, ...change })).toBe(false);
  });

  test('comparison does not reorder the caller’s selected methods', () => {
    const left = { ...emptyDraft, qualifyingMethods: ['video', 'phone'] };
    expect(monitoringSettingsEqual(left, { ...emptyDraft, qualifyingMethods: ['phone', 'video'] })).toBe(true);
    expect(left.qualifyingMethods).toEqual(['video', 'phone']);
  });
});

describe('monitoringValidationError', () => {
  test('all-off settings do not need an agency timezone', () => {
    expect(monitoringValidationError(emptyDraft, null)).toBeNull();
  });

  test.each([0, 366, 1.5, NaN, Infinity])('rejects an invalid retained contact interval even with contacts off: %s', intervalDays => {
    expect(monitoringValidationError({ ...emptyDraft, intervalDays }, 'UTC')).toMatch(/whole number.*1.*365/i);
  });

  test.each([0, 366, 1.5, NaN, Infinity])('rejects an invalid retained document interval even with reviews off: %s', ISP => {
    expect(monitoringValidationError({ ...emptyDraft, documentReviewIntervals: { ...emptyDraft.documentReviewIntervals, ISP } }, 'UTC')).toMatch(/whole number.*1.*365/i);
  });

  test('enabled contacts require both an interval and a selected qualifying method', () => {
    expect(monitoringValidationError({ ...emptyDraft, enabled: true }, 'UTC')).toMatch(/interval/i);
    expect(monitoringValidationError({ ...emptyDraft, enabled: true, intervalDays: 30 }, 'UTC')).toMatch(/method/i);
    expect(monitoringValidationError({ ...emptyDraft, enabled: true, intervalDays: 30, qualifyingMethods: ['phone'] }, 'UTC')).toBeNull();
  });

  test('enabled document monitoring requires at least one interval', () => {
    expect(monitoringValidationError({ ...emptyDraft, documentReviewsEnabled: true }, 'UTC')).toMatch(/at least one document/i);
    expect(monitoringValidationError({ ...emptyDraft, documentReviewsEnabled: true,
      documentReviewIntervals: { ...emptyDraft.documentReviewIntervals, Other: 365 } }, 'UTC')).toBeNull();
  });

  test.each([
    { enabled: true, intervalDays: 1, qualifyingMethods: ['phone'] },
    { remindersEnabled: true }, { documentRemindersEnabled: true },
    { documentReviewsEnabled: true, documentReviewIntervals: { ...emptyDraft.documentReviewIntervals, ISP: 1 } },
  ])('any enabled schedule or reminder requires a valid agency timezone: %j', change => {
    const draft = { ...emptyDraft, ...change };
    expect(monitoringValidationError(draft, null)).toMatch(/agency time zone/i);
    expect(monitoringValidationError(draft, 'Invalid/Zone')).toMatch(/agency time zone/i);
    expect(monitoringValidationError(draft, 'America/New_York')).toBeNull();
  });
});
