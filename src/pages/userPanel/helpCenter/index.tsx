import { useId, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { Loader2, Plus, Search, X } from "lucide-react";
import { createSupportCase, supportErrorMessage } from "@/lib/api/support";
import { cn } from "@/lib/utils";
import { Routes } from "@/routes/constants";
import { FIELD_STAFF_FAQS } from "./faqs";

const CONTACT = Routes.userPanel.messages;

/** Caregiver and DSP help: ask the assistant, common questions, and a way to reach the agency. */
export default function FieldStaffHelpCenterPage() {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim() || asking) return;
    setAsking(true);
    try {
      const created = await createSupportCase({ content: question.trim(), context: { page: Routes.userPanel.helpCenter } });
      navigate(`${CONTACT}?case=${created.case.id}`);
    } catch (error) {
      toast.error(supportErrorMessage(error, "Your question was not sent. Try again."));
      setAsking(false);
    }
  };

  return <div className="flex min-h-[calc(100vh-200px)] flex-col">
    <div className="flex flex-1 flex-col rounded-[20px] bg-white p-4 shadow-[0_1px_2px_rgba(16,40,44,0.06)] sm:p-6 dark:bg-[#1b232b]">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <h1 className="text-lg font-semibold text-[#10141a] dark:text-[#f4f6f7]">How can we help you today?</h1>
        <Link to={CONTACT} className="inline-flex h-9 items-center rounded-full bg-[#10141a] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#2a3138] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:bg-[#f4f6f7] dark:text-[#10141a] dark:hover:bg-white">
          Contact support agency
        </Link>
      </div>

      <form onSubmit={ask} className="mb-2 flex flex-col gap-2 rounded-[14px] bg-[#f2fbfb] p-3 sm:flex-row sm:items-center dark:bg-[#00686b]/15">
        <label htmlFor={`${baseId}-ask`} className="sr-only">Ask a question</label>
        <span className="relative flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5d6b73]" />
          <input id={`${baseId}-ask`} value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={4000}
            placeholder="Ask anything, for example: how do I fix a missed clock out?"
            className="h-10 w-full rounded-[10px] border border-[#cfeaea] bg-white pl-9 pr-3 text-[14px] text-[#10141a] outline-none focus:border-[#007679] focus:ring-2 focus:ring-[#007679]/20 dark:border-white/15 dark:bg-[#1b232b] dark:text-[#f4f6f7]" />
        </span>
        <button type="submit" disabled={asking || !question.trim()} className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[#007679] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#00686b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50">
          {asking && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}{asking ? "Finding an answer…" : "Ask"}
        </button>
      </form>
      <p className="mb-4 px-1 text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">Our assistant answers from your agency&apos;s help articles and hands you to a person if it can&apos;t help.</p>

      <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_268px]">
        <section aria-labelledby={`${baseId}-faq`}>
          <h2 id={`${baseId}-faq`} className="sr-only">Frequently asked questions</h2>
          <ol>
            {FIELD_STAFF_FAQS.map((faq, index) => {
              const expanded = open === index;
              const panelId = `${baseId}-answer-${index}`;
              const Icon = expanded ? X : Plus;
              return <li key={faq.question} className="border-b border-[#edf1f2] dark:border-white/10">
                <h3>
                  <button type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setOpen(expanded ? null : index)}
                    className="flex w-full cursor-pointer items-center gap-3 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679]">
                    <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] border border-[#e3e8ea] text-[12px] font-medium text-[#10141a] dark:border-white/15 dark:text-[#f4f6f7]">{index + 1}</span>
                    <span className={cn("flex-1 text-[14px] text-[#10141a] dark:text-[#f4f6f7]", expanded && "font-semibold")}>{faq.question}</span>
                    <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#e3e8ea] text-[#10141a] dark:border-white/15 dark:text-[#f4f6f7]"><Icon className="h-4 w-4" /></span>
                  </button>
                </h3>
                <div id={panelId} role="region" aria-label={faq.question} hidden={!expanded}
                  className="pb-4 pl-10 pr-11 text-[13px] leading-relaxed text-[#34434c] dark:text-[#c9d3d6]">
                  {faq.answer}
                </div>
              </li>;
            })}
          </ol>
        </section>

        <aside aria-labelledby={`${baseId}-more`} className="flex flex-col self-start overflow-hidden rounded-[16px] bg-gradient-to-b from-[#00a3a7] to-[#003839] p-3 text-white">
          <img src="/assets/family-care-couple.jpg" alt="" className="hidden h-[320px] w-full rounded-[12px] object-cover object-[30%_center] lg:block" />
          <div className="px-1 pb-1 pt-3 lg:pt-4">
            <h2 id={`${baseId}-more`} className="text-[20px] font-bold">Still have questions</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/85">Can&apos;t find what you&apos;re looking for? Reach out to your agency and they&apos;ll be happy to help.</p>
            <Link to={CONTACT} className="mt-4 flex h-10 items-center justify-center rounded-[6px] bg-[#007679] text-[14px] font-semibold text-white transition-colors hover:bg-[#00898c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Contact us
            </Link>
          </div>
        </aside>
      </div>
    </div>
  </div>;
}
