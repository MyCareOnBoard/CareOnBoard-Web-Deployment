export interface Faq {
  question: string;
  answer: string;
}

/** Questions caregivers and DSPs ask most. Keep answers in step with how the app works. */
export const FIELD_STAFF_FAQS: Faq[] = [
  {
    question: "How do I clock in and out of a shift?",
    answer: "Open Shift management and pick your shift. Clock in opens 5 minutes before the shift starts, and Clock out appears once you are clocked in. If you missed a clock in or out, add a manual timesheet for that shift so your agency can review it.",
  },
  {
    question: "Why do I see a client ID instead of a name?",
    answer: "To protect client privacy, caregivers and DSPs see each client by a short ID, such as AB12CD. Your agency will tell you who the client is and where to go before your first visit.",
  },
  {
    question: "Where can I read a client's plan of care?",
    answer: "Go to Plan of care and choose View plan next to the client. If a plan shows Not uploaded, your agency hasn't added it yet. Ask your supervisor before the visit if you need it.",
  },
  {
    question: "How do I record mileage or a work expense?",
    answer: "On the Mileage page you can track a ride while you drive or add one afterwards. On the Expenses page, add the amount, the date and a photo or PDF of the receipt. Your agency reviews each entry before it is paid.",
  },
  {
    question: "What should I do when a document or training is about to expire?",
    answer: "Your dashboard shows a banner when a document or training is expired or due soon. Upload the renewed document or completion certificate from My documents & trainings on the dashboard so you can keep being assigned to shifts.",
  },
  {
    question: "Where do I find my pay statements?",
    answer: "Open Payroll to see each pay period with your hours, gross pay, deductions and net pay. Select a pay period to see the full breakdown and download the PDF when it is available.",
  },
  {
    question: "How do I report an incident?",
    answer: "Go to Incident, choose Report an incident, select the client and describe what happened and any action you took. Your agency is notified as soon as you submit it. In an emergency, call 911 first.",
  },
];
