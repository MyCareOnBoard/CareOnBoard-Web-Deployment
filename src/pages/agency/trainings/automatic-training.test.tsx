import {render,screen} from '@testing-library/react';
import {describe,it,expect} from 'vitest';
import {TrainingPolicyStatus} from './TrainingPolicyFields';
import type {TrainingData} from './trainingApi';
describe('automatic training status',()=>{it('keeps valid CPR and pending replacement distinct',()=>{
 const training={source:'policy',policyVersion:1,policyContextState:'current',policyProgram:'ddd',requirementId:'cpr-certification',reviewState:'awaiting_review',validityState:'valid',deadlineState:'renewal_due',effectiveExpiryDateKey:'2026-10-01',dueDateKey:'2026-10-01'} as TrainingData;
 render(<TrainingPolicyStatus training={training}/>);
 expect(screen.getByText('Certificate valid until 2026-10-01')).toBeTruthy();
 expect(screen.getByText('Certificate submitted. Agency review is pending.')).toBeTruthy();
 expect(screen.getByText('Renewal due 2026-10-01')).toBeTruthy();
});});

it('uses current HHA policy context and separates deadlines from review',()=>{
 const row={source:'policy',policyVersion:1,policyProgram:'hha',policyContextState:'current',deadlineType:'days_from_hire',deadlineDays:90,deadlineState:'overdue',dueDateKey:'2020-03-31',reviewState:'awaiting_review'} as TrainingData;
 const view=render(<TrainingPolicyStatus training={row}/>);
 expect(screen.getByText('Overdue 2020-03-31')).toBeTruthy();
 expect(screen.queryByText('Required before HHA services')).toBeNull();
 view.rerender(<TrainingPolicyStatus training={{...row,policyContextState:'updating'}}/>);
 expect(screen.getByText('Updating requirements')).toBeTruthy();
 view.rerender(<TrainingPolicyStatus training={{...row,deadlineState:'before_work',deadlineType:'before_work'}}/>);
 expect(screen.getByText('Required before HHA services')).toBeTruthy();
});
