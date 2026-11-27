import {describe, expect, it} from 'vitest';
import {concentrationLine, fieldLabel, nextStep, ruleLabel} from './findingLabels';

describe('finding labels', () => {
  it('shows unnamed fields as plain words', () => {
    expect(fieldLabel('goal_progress')).toBe('Goal progress');
    expect(fieldLabel('individualResponse')).toBe('Individual response');
    expect(fieldLabel('metadata.goal_progress')).toBe('Goal progress');
    expect(fieldLabel('narrative')).toBe('Narrative');
  });
  it('keeps the specific names', () => {
    expect(fieldLabel('late_start')).toBe('Late start');
    expect(fieldLabel('completed_late')).toBe('Completed late');
  });
  it('names the training rule', () => {
    expect(ruleLabel('training.timeliness')).toBe('Training deadlines');
  });
});

describe('new rules', () => {
  it('names the new rules and their evidence', () => {
    expect(ruleLabel('note.timeliness')).toBe('Note deadlines');
    expect(ruleLabel('shift.missed_visit')).toBe('Missed visits');
    expect(ruleLabel('shift.gps_verification')).toBe('Location proof');
    expect(fieldLabel('submitted_late')).toBe('Written late');
    expect(fieldLabel('no_location')).toBe('No location');
    expect(nextStep('review.missed_visits')).toContain('availability');
  });
  it('words where a pattern concentrates without naming a client', () => {
    expect(concentrationLine({dimension: 'client', count: 4, of: 5})).toBe('Mostly the same client (4 of 5)');
    expect(concentrationLine({dimension: 'weekday', count: 3, of: 4, weekday: 1})).toBe('Mostly Mondays (3 of 4)');
    expect(concentrationLine({dimension: 'weekday', count: 3, of: 4, weekday: 9})).toBe('');
  });
});
