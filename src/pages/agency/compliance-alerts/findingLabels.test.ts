import {describe, expect, it} from 'vitest';
import {fieldLabel, ruleLabel} from './findingLabels';

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
