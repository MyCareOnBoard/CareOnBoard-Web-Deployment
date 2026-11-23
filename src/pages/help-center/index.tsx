import { useLocation } from "react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AskSupportPanel } from "@/components/support/AskSupportPanel";

const faqData = [
  {
    question: "What is the purpose of the Applicant Panel?",
    answer:
      "The Applicant Panel is a platform designed for job seekers to manage their entire recruitment process with the NJ DSP. You can use it to apply for a position, upload necessary documents, schedule pre-hire tasks like interviews and fingerprinting, and track the status of your application from start to finish.",
  },
  {
    question: "How do I track the status of my application?",
    answer:
      "You can track your application status in real-time through the Application page. The system provides updates at each stage of the recruitment process, from initial submission to final review. You'll receive notifications for any status changes.",
  },
  {
    question: "What kind of documents do I need to upload, and what happens after I upload them?",
    answer:
      "Required documents typically include identification, certifications, and background check forms. Once uploaded, your documents will be reviewed by our team. You'll be notified if any additional documentation is needed or if your documents have been approved.",
  },
  {
    question: "Can I reschedule an appointment through the panel?",
    answer:
      "Yes, you can reschedule appointments directly through the Applicant Panel. Navigate to your scheduled appointments section and select the appointment you wish to reschedule. Choose a new time slot from the available options.",
  },
  {
    question: "How will I be notified about updates to my application?",
    answer:
      "You'll receive notifications through multiple channels including email and in-app notifications. Important updates will also be visible in your dashboard. Make sure to keep your contact information up to date to receive timely notifications.",
  },
];

export default function HelpCenterPage() {
  const { pathname } = useLocation();
  return (
    <div className="mx-auto max-w-[1147px]">
      {/* Page Title */}
      <div className="mb-12">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">Help Center</h1>
      </div>

      {/* FAQ Accordion */}
      <div className="mb-16">
        <Accordion type="single" collapsible defaultValue="item-0" className="w-full">
          {faqData.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Ask support: the assistant answers first, then a person. */}
      <section aria-labelledby="help-center-ask" className="mb-16">
        <h2 id="help-center-ask" className="mb-1 text-[20px] font-semibold text-[#111111]">Still have questions?</h2>
        <p className="mb-4 text-[14px] text-[#5d6b73]">Ask below. Our assistant answers right away when it can, and passes your question to a person when it can&apos;t.</p>
        <div className="flex h-[620px] flex-col">
          <AskSupportPanel
            deskName="the support team"
            contextPage={pathname}
            showUrgentOption={false}
            placeholder="For example: which documents do I still need to upload?"
          />
        </div>
      </section>
    </div>
  );
}
