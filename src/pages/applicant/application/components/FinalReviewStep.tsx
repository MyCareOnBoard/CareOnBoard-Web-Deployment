import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getFinalReviewChecklist, FinalReviewChecklistItem } from "@/lib/api/job-application";

type ReviewItemStatus = "confirmed" | "pending";

interface ReviewItem {
  id: string;
  title: string;
  date: string;
  time: string;
  status: ReviewItemStatus;
}

interface FinalReviewStepProps {
  onBack?: () => void;
  onNext?: () => void;
}

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

function TimelineIndicator({ status, isFirst, isLast }: TimelineIndicatorProps) {
  const currentStyle = STATUS_STYLES[status];

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
  const [checklist, setChecklist] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allConfirmed, setAllConfirmed] = useState(false);

  useEffect(() => {
    const fetchChecklist = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getFinalReviewChecklist();

        // Sort by order and map to ReviewItem format
        const mappedChecklist = response.checklist
          .sort((a, b) => a.order - b.order)
          .map((item) => formatChecklistItem(item));

        setChecklist(mappedChecklist);
        setAllConfirmed(response.summary.allConfirmed);
      } catch (err) {
        console.error('Error fetching final review checklist:', err);
        setError('Failed to load checklist. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchChecklist();
  }, []);

  const formatChecklistItem = (item: FinalReviewChecklistItem): ReviewItem => {
    const confirmedDate = item.confirmedAt ? new Date(item.confirmedAt) : null;

    return {
      id: item.id,
      title: item.title,
      date: confirmedDate ? formatDate(confirmedDate) : "Pending",
      time: confirmedDate ? formatTime(confirmedDate) : "",
      status: item.status,
    };
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const helperMessage = allConfirmed
    ? "Everything is accepted, You can move to stage 5"
    : "Once everything is accepted, You can move to stage 5";

  if (loading) {
    return (
      <section className="flex flex-col gap-6">
        <header className="space-y-2">
          <p className="max-w-[620px] text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            Internal HR and compliance officer review before official hire.
          </p>
        </header>
        <div className="rounded-[24px] border border-[#00b4b8]/20 bg-white/70 p-6 shadow-[0_6px_40px_-12px_rgba(16,20,26,0.16)] backdrop-blur">
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              <p className="text-[14px] font-medium text-[#808081]">Loading checklist...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex flex-col gap-6">
        <header className="space-y-2">
          <p className="max-w-[620px] text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            Internal HR and compliance officer review before official hire.
          </p>
        </header>
        <div className="rounded-[24px] border border-red-200 bg-red-50 p-6 shadow-[0_6px_40px_-12px_rgba(16,20,26,0.16)]">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            <p className="text-[14px] font-medium text-red-800">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="space-y-2">
        <p className="max-w-[620px] text-[14px] font-semibold leading-[1.4] text-[#10141a]">
          Internal HR and compliance officer review before official hire.
        </p>
      </header>

      <div className="rounded-[24px] border border-[#00b4b8]/20 bg-white/70 p-6 shadow-[0_6px_40px_-12px_rgba(16,20,26,0.16)] backdrop-blur">
        <ol className="space-y-0">
          {checklist.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === checklist.length - 1;
            const previousStatus = checklist[index - 1]?.status;

            return (
              <li
                key={item.id}
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
                  {item.date !== "Pending" ? (
                    <div className="flex items-center gap-[6px] text-[12px] font-medium leading-[1.4] text-[#808081]">
                      <span>{item.date}</span>
                      <span className="inline-block size-[4px] rounded-full bg-[#cccccd]" />
                      <span>{item.time}</span>
                    </div>
                  ) : (
                    <p className="text-[12px] font-medium leading-[1.4] text-[#808081]">Pending confirmation</p>
                  )}
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

