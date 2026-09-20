import {useId, useState} from 'react';
import {format, parseISO} from 'date-fns';
import {Calendar} from '@/components/ui/calendar';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Button} from '@/components/ui/button';
import type {TrainingData} from './trainingApi';
export function TrainingDateField({label,value,onChange,disabled=false}: {label:string;value:string;onChange:(date:string)=>void;disabled?:boolean}) {
 const id=useId(), [open,setOpen]=useState(false);
 return <div className="space-y-1"><label htmlFor={id} className="block text-xs font-medium">{label}</label><Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button id={id} type="button" variant="outline" disabled={disabled} className="rounded-xl" aria-label={label}>{value || 'Select date'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={value ? parseISO(value) : undefined} onSelect={date=>{onChange(date ? format(date,'yyyy-MM-dd') : '');setOpen(false);}}/></PopoverContent></Popover></div>;
}
export function trainingPolicyLabel(training:TrainingData) {
 const labels:Record<string,string>={satisfied:'Accepted',before_work:'Required before work',upcoming:'Upcoming',due_soon:'Due soon',due_today:'Due today',overdue:'Overdue',expired:'Expired',renewal_due:'Renewal due',not_required:'Not currently required',details_needed:'Details needed'};
 if(training.policyContextState==='updating')return 'Updating requirements';
 if(training.policyContextState!=='current')return 'Not assessed';
 if(training.deadlineState==='before_work' && training.policyProgram==='hha')return 'Required before HHA services';
 return labels[training.deadlineState || ''] || 'Not assessed';
}
export function TrainingPolicyStatus({training,canEditHireDate=false,showSummary=true}: {training:TrainingData;canEditHireDate?:boolean;showSummary?:boolean}) {
 if(training.source!=='policy')return null;
 const explanations:Record<string,string>={hire_date_needed:canEditHireDate?'Add a hire date in the staff profile to calculate training deadlines.':'Ask your agency administrator to add your hire date.',invalid_timezone:'Review agency time zone.',service_details_needed:'Review service details to confirm the CPR requirement.',evidence_unavailable:'The accepted certificate could not be verified. Review its source.'};
 if (!showSummary && !(training.policyContextState==='current' && (training.effectiveExpiryDateKey || ['awaiting_review','changes_requested'].includes(training.reviewState || '') || training.reasonCode && explanations[training.reasonCode]))) return null;
 return <div className="space-y-1 text-xs text-[#596065]">{showSummary && <><p className="font-medium">Automatically assigned</p><p>{trainingPolicyLabel(training)}{training.policyContextState==='current' && training.dueDateKey && !['satisfied','not_required','details_needed','expired','before_work'].includes(training.deadlineState || '') ? ' ' + training.dueDateKey : ''}</p></>}
 {training.policyContextState==='current' && <>{training.validityState==='valid' && training.effectiveExpiryDateKey && <p>Certificate valid until {training.effectiveExpiryDateKey}</p>}
 {training.effectiveExpiryDateKey && <p>{training.acceptedCertificate?.printedExpiryDate ? 'Effective expiry date: ' : 'Calculated renewal date: '}{training.effectiveExpiryDateKey}</p>}
 {training.reviewState==='awaiting_review' && <p>Certificate submitted. Agency review is pending.</p>}
 {training.reviewState==='changes_requested' && <p>Changes requested: {training.reviewReason || 'Review the certificate with your agency.'}</p>}
 {training.reasonCode && explanations[training.reasonCode] && <p>{explanations[training.reasonCode]}</p>}</>}</div>;
}
