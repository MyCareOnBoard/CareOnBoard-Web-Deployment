import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [question, setQuestion] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle question submission
    console.log("Question submitted:", question);
    setQuestion("");
  };

  return (
    <div className="mx-auto max-w-[1147px]">
      {/* Page Title */}
      <div className="mb-12">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">Help Center</h1>
      </div>

      {/* FAQ Accordion */}
      <div className="mb-[158px]">
        <Accordion type="single" collapsible defaultValue="item-0" className="w-full">
          {faqData.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Contact Form */}
      <div className="mx-auto w-full max-w-[496px]">
        <div className="mb-3 text-center">
          <p className="text-[20px] font-normal leading-[1.6] text-[#111111]">
            Still have questions? Drop your questions below
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="Submit your question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full"
          />
          <Button type="submit" size="lg" className="w-full">
            Send us
          </Button>
        </form>
      </div>
    </div>
  );
}

