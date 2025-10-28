import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReviewItemStatus = "confirmed" | "pending";

interface ReviewItem {
  title: string;
  date: string;
  time: string;
  status: ReviewItemStatus;
}

interface FinalReviewStepProps {
  onBack?: () => void;
  onNext?: () => void;
}

const TIMELINE_ITEMS: ReviewItem[] = [
  {
    title: "All documents complete & valid.",
    date: "30 Nov 2024",
    time: "5:23 PM",
    status: "confirmed",
  },
  {
    title: "Background Check Cleared",
    date: "23 Nov 2024",
    time: "5:23 PM",
    status: "confirmed",
  },
  {
    title: "Drug test received and Cleared",
    date: "18 Nov 2024",
    time: "5:23 PM",
    status: "pending",
  },
  {
    title: "Fingerprint results received & compliant",
    date: "18 Nov 2024",
    time: "5:23 PM",
    status: "pending",
  },
  {
    title: "Mandatory trainings completed",
    date: "11 Nov 2024",
    time: "5:23 PM",
    status: "pending",
  },
  {
    title: "Create applicant profile in DDD’s provider system (PCS/SAMS)",
    date: "4 Nov 2024",
    time: "5:23 PM",
    status: "pending",
  },
  {
    title: "Schedule Orientation Date",
    date: "27 Oct 2024",
    time: "5:23 PM",
    status: "pending",
  },
];

const STATUS_STYLES: Record<
  ReviewItemStatus,
  { label: string; badgeClassName: string; connectorColor: string; haloShadow: string }
> = {
  confirmed: {
    label: "Confirmed",
    badgeClassName: "bg-[#f0faf4] border-[0.5px] border-[#0eaf52] text-[#0eaf52]",
    connectorColor: "#2b82ff",
    haloShadow: "shadow-[0_0_0_6px_rgba(43,130,255,0.18)]",
  },
  pending: {
    label: "Pending",
    badgeClassName: "bg-[#f0faf4] border-[0.5px] border-[#b2b2b3] text-[#b2b2b3]",
    connectorColor: "#d9d9d9",
    haloShadow: "shadow-[0_0_0_6px_rgba(217,217,217,0.2)]",
  },
};

function StatusBadge({ status }: { status: ReviewItemStatus }) {
  const { label, badgeClassName } = STATUS_STYLES[status];

  return (
    <span
      className={cn(
        "inline-flex min-w-[90px] items-center justify-center gap-[4px] rounded-[60px] border-solid px-[10px] py-[6px] text-center text-[12px] font-semibold leading-[normal]",
        badgeClassName
      )}
    >
      {label}
    </span>
  );
}

interface TimelineIndicatorProps {
  status: ReviewItemStatus;
  isFirst: boolean;
  isLast: boolean;
  previousStatus?: ReviewItemStatus;
}

function TimelineIndicator({ status, isFirst, isLast, previousStatus }: TimelineIndicatorProps) {
  const currentStyle = STATUS_STYLES[status];
  const previousStyle = previousStatus ? STATUS_STYLES[previousStatus] : undefined;

  return (
    <div className="box-border flex h-full w-[12px] flex-col items-center px-0 pb-px pt-0">
      {/* Center dot with halo */}
      <div className="relative size-[12px] shrink-0">
        <span
          className={cn(
            "block size-[12px] rounded-full",
            status === "confirmed" ? "bg-[#00b4b8]" : "bg-[#d9d9d9]",
            isFirst ? currentStyle.haloShadow : null

          )}
        />
      </div>

      {/* Bottom connector line */}
      {!isLast ? (
        <div
          className={cn(
            "absolute h-[85px] w-[3px]",
            status === "confirmed" ? "bg-[#00b4b8]" : "bg-[#d9d9d9]"
          )}
        />
      ) : null}
    </div>
  );
}

export default function FinalReviewStep({ onBack, onNext }: FinalReviewStepProps) {
  const allConfirmed = TIMELINE_ITEMS.every((item) => item.status === "confirmed");
  const helperMessage = allConfirmed
    ? "Everything is accepted, You can move to stage 5"
    : "Once everything is accepted, You can move to stage 5";

  return (
    <section className="flex flex-col gap-6">
      <header className="space-y-2">
        <h2 className="text-[24px] font-semibold leading-[1.4] text-[#10141a]">Final Agency Review</h2>
        <p className="max-w-[620px] text-[14px] font-medium leading-[1.4] text-[#10141a]">
          Internal HR and compliance officer review before official hire.
        </p>
      </header>

      <div className="rounded-[24px] border border-[#00b4b8]/20 bg-white/70 p-6 shadow-[0_6px_40px_-12px_rgba(16,20,26,0.16)] backdrop-blur">
        <ol className="space-y-0">
          {TIMELINE_ITEMS.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === TIMELINE_ITEMS.length - 1;
            const previousStatus = TIMELINE_ITEMS[index - 1]?.status;

            return (
              <li
                key={item.title}
                className="flex items-center gap-6 py-5 first:pt-0 last:pb-0"
              >
                <StatusBadge status={item.status} />

                <TimelineIndicator
                  status={item.status}
                  previousStatus={previousStatus}
                  isFirst={isFirst}
                  isLast={isLast}
                />

                <div className="space-y-2">
                  <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">{item.title}</p>
                  <div className="flex items-center gap-[6px] text-[12px] font-medium leading-[1.4] text-[#808081]">
                    <span>{item.date}</span>
                    <span className="inline-block size-[4px] rounded-full bg-[#cccccd]" />
                    <span>{item.time}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex flex-col items-start gap-4 pt-4">
        <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">{helperMessage}</p>
        {onNext ? (
            <Button
              type="button"
              variant={allConfirmed ? "default" : "secondary"}
              disabled={!allConfirmed}
              className={cn(
                "gap-[10px] text-[14px]",
                allConfirmed
                  ? "shadow-[0_12px_32px_-10px_rgba(0,180,184,0.6)]"
                  : "!bg-[#b2b2b3] text-white opacity-100"
              )}
              onClick={onNext}
            >
              <span>Next</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M4 10H16M16 10L10 4M16 10L10 16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          ) : null}
      </div>
    </section>
  );
}

