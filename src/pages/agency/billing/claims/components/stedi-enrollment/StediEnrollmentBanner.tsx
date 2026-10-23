import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";
import { getStediEnrollmentStatus, type StediEnrollmentOverallStatus } from "@/lib/api/stediEnrollment";
import X12StatusBadge from "../x12-export/X12StatusBadge";
import StediEnrollmentWizard from "./StediEnrollmentWizard";
import { overallStatusInfo } from "./stediEnrollmentUtils";

type StediEnrollmentBannerProps = {
  canManage?: boolean;
};

/**
 * Claims page prompt: shown until the agency's Stedi enrollment is live, with a
 * button that opens the enrollment wizard. Hidden when Stedi isn't set up on
 * the server or the status can't be loaded.
 */
export default function StediEnrollmentBanner({ canManage = true }: StediEnrollmentBannerProps) {
  const { agencyId } = useOperationalAgency();
  const [status, setStatus] = useState<StediEnrollmentOverallStatus | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!agencyId) return;
    const controller = new AbortController();
    setStatus(null);
    getStediEnrollmentStatus({ context: { agencyId }, signal: controller.signal })
      .then((overview) => {
        if (!controller.signal.aborted) setStatus(overview.configured ? overview.enrollment.status : null);
      })
      .catch(() => {
        // The banner is a prompt only; the claims page works without it.
      });
    return () => controller.abort();
  }, [agencyId]);

  if (!status || (status === "live" && !open)) return null;
  const info = overallStatusInfo(status);

  return (
    <>
      {status !== "live" ? (
        <section
          aria-label="Stedi enrollment"
          className="flex flex-col gap-3 rounded-[20px] border border-[#b2e8e9] bg-[#f0fbfb] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="flex min-w-0 items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#00898c]" aria-hidden />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-semibold text-[#10141a]">NJ Medicaid enrollment</h2>
                <X12StatusBadge label={info.label} tone={info.tone} />
              </div>
              <p className="mt-1 text-[14px] text-[#344054]">{info.banner}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#00b4b8] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#009da1]"
          >
            {info.action}
          </button>
        </section>
      ) : null}
      {open ? (
        <StediEnrollmentWizard
          open
          canManage={canManage}
          onClose={() => setOpen(false)}
          onChanged={(enrollment) => setStatus(enrollment.status)}
        />
      ) : null}
    </>
  );
}
