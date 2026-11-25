import { FileText } from "lucide-react";
import type { Applicant } from "@/lib/api/applicants";
import { agencyOutlineButton } from "@/components/agency/AgencyListKit";
import { cn } from "@/lib/utils";

interface ProfileTabProps {
  applicant: {
    gender?: string;
    email?: string;
    resumeUrl?: string;
    questionnaire?: {
      isAtLeast18?: string;
      highSchoolDiploma?: string;
      legallyEligible?: string;
      convicted?: string;
      reliableTransportation?: string;
    };
  } & Pick<Applicant, "name">;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">{label}</dt>
      <dd className="shrink-0 text-right text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{value}</dd>
    </div>
  );
}

const sectionLabel = "rounded-[8px] bg-[#f4f5f6] px-3 py-1.5 text-[12px] font-medium uppercase tracking-[0.08em] text-[#4b535b] dark:bg-white/5 dark:text-[#9aa4a8]";
const listPanel = "divide-y divide-[#e4e7ea] rounded-[12px] bg-[#f4f5f6] dark:divide-white/10 dark:bg-white/5";

export function ProfileTab({ applicant }: ProfileTabProps) {
  return (
    <div className="space-y-4 rounded-[16px] border border-[#e4e7ea] bg-white p-4 md:p-5 dark:border-white/10 dark:bg-[#1b232b]">
      <h3 className={sectionLabel}>Details</h3>
      <dl className={listPanel}>
        <DetailRow label="Gender" value={applicant.gender || "-"} />
        <DetailRow label="Email" value={applicant.email || "-"} />
      </dl>

      <h3 className={sectionLabel}>Pre-screening</h3>
      <dl className={listPanel}>
        <DetailRow label="Are you at least 18 years old?" value={applicant.questionnaire?.isAtLeast18 ?? "-"} />
        <DetailRow label="Do you have a High School Diploma or GED?" value={applicant.questionnaire?.highSchoolDiploma ?? "-"} />
        <DetailRow label="Are you legally eligible to work in the U.S.?" value={applicant.questionnaire?.legallyEligible ?? "-"} />
        <DetailRow label="Have you ever been convicted of a disqualifying offense under NJ law?" value={applicant.questionnaire?.convicted ?? "-"} />
        <DetailRow label="Do you have reliable transportation? (Optional)" value={applicant.questionnaire?.reliableTransportation ?? "-"} />
      </dl>

      {/* Resume */}
      <div className="flex items-center justify-between gap-4 rounded-[12px] bg-[#f4f5f6] px-4 py-3 dark:bg-white/5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white dark:bg-white/10">
            <FileText aria-hidden="true" className="h-5 w-5 text-[#007679] dark:text-[#7fd3d3]" />
          </span>
          <span className="text-[15px] font-medium text-[#10141a] dark:text-[#f4f6f7]">Resume</span>
        </div>
        {applicant.resumeUrl ? (
          <a href={applicant.resumeUrl} target="_blank" rel="noreferrer" className={cn(agencyOutlineButton, "h-8 rounded-[8px] px-3 text-[13px] font-medium")}>
            View Resume
          </a>
        ) : (
          <button type="button" disabled className={cn(agencyOutlineButton, "h-8 rounded-[8px] px-3 text-[13px] font-medium")}>
            View Resume
          </button>
        )}
      </div>
    </div>
  );
}
