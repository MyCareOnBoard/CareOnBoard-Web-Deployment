import { Button } from "@/components/ui/button";
import type { Applicant } from "@/lib/api/applicants";

interface ProfileTabProps {
  applicant: {
    gender?: string;
    email?: string;
    questionnaire?: {
      highSchoolDiploma?: string;
      legallyEligible?: string;
      convicted?: string;
      convictedRepeat?: string;
    };
  } & Pick<Applicant, "name">;
}

export function ProfileTab({ applicant }: ProfileTabProps) {
  return (
    <div className="backdrop-blur-[8px] bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] rounded-[30px] p-4 md:p-6 space-y-3">
      {/* Gender */}
      <div className="flex items-center justify-between rounded-[20px] bg-[rgba(255,255,255,0.7)] px-4 py-3">
        <span className="text-[16px] font-medium leading-[1.6] text-[#808081]">
          Gender
        </span>
        <span className="text-[16px] font-semibold leading-[1.6] text-[#10141a]">
          {applicant.gender || "-"}
        </span>
      </div>

      {/* Email */}
      <div className="flex items-center justify-between rounded-[20px] bg-[rgba(255,255,255,0.7)] px-4 py-3">
        <span className="text-[16px] font-medium leading-[1.6] text-[#808081]">
          Email
        </span>
        <span className="text-[16px] font-semibold leading-[1.6] text-[#10141a]">
          {applicant.email || "-"}
        </span>
      </div>

      {/* Questions */}
      <div className="rounded-[20px] bg-[rgba(255,255,255,0.7)] px-4 py-3">
        <p className="text-[16px] font-medium leading-[1.6] text-[#808081]">
          Do you have a High School Diploma or GED?
        </p>
        <p className="mt-1 text-[16px] font-semibold leading-[1.6] text-[#10141a]">
          {applicant.questionnaire?.highSchoolDiploma ?? "-"}
        </p>
      </div>

      <div className="rounded-[20px] bg-[rgba(255,255,255,0.7)] px-4 py-3">
        <p className="text-[16px] font-medium leading-[1.6] text-[#808081]">
          Are you legally eligible to work in the U.S.?
        </p>
        <p className="mt-1 text-[16px] font-semibold leading-[1.6] text-[#10141a]">
          {applicant.questionnaire?.legallyEligible ?? "-"}
        </p>
      </div>

      <div className="rounded-[20px] bg-[rgba(255,255,255,0.7)] px-4 py-3">
        <p className="text-[16px] font-medium leading-[1.6] text-[#808081]">
          Have you ever been convicted of a disqualifying offense under NJ law?
        </p>
        <p className="mt-1 text-[16px] font-semibold leading-[1.6] text-[#10141a]">
          {applicant.questionnaire?.convicted ?? "-"}
        </p>
      </div>

      <div className="rounded-[20px] bg-[rgba(255,255,255,0.7)] px-4 py-3">
        <p className="text-[16px] font-medium leading-[1.6] text-[#808081]">
          Have you ever been convicted of a disqualifying offense under NJ law?
        </p>
        <p className="mt-1 text-[16px] font-semibold leading-[1.6] text-[#10141a]">
          {applicant.questionnaire?.convictedRepeat ?? "-"}
        </p>
      </div>

      {/* Resume */}
      <div className="rounded-[20px] bg-[rgba(255,255,255,0.7)] px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-[60px] w-[52.5px] items-center justify-center rounded-[8px] bg-white shadow-sm">
              <svg
                className="h-6 w-6 text-[#808081]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <span className="text-[16px] font-semibold leading-[1.6] text-[#10141a]">
              Resume
            </span>
          </div>
          <Button
            variant="outline"
            className="rounded-[60px] border-[#0eaf52] bg-[rgba(14,175,82,0.1)] px-4 py-[6px] text-[11px] font-semibold text-[#0eaf52] hover:bg-[rgba(14,175,82,0.15)]"
          >
            View Resume
          </Button>
        </div>
      </div>
    </div>
  );
}

