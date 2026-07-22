import { ChevronDown, ExternalLink, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComplianceCategory, ComplianceIssue } from "../complianceApi";

export type ComplianceIssueRowProps = {
  issue: ComplianceIssue;
  category: ComplianceCategory;
  expanded: boolean;
  sending: boolean;
  onToggle: () => void;
  onViewDocument: (issue: ComplianceIssue) => void;
  onViewClient: (issue: ComplianceIssue) => void;
  onSendAlert: (issue: ComplianceIssue) => void;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ComplianceIssueRow({
  issue,
  category,
  expanded,
  sending,
  onToggle,
  onViewDocument,
  onViewClient,
  onSendAlert,
}: ComplianceIssueRowProps) {
  const agencyDetailsId = "compliance-issue-agency-" + issue.id;
  const actionDetailsId = "compliance-issue-actions-" + issue.id;
  const isClient = issue.subjectType === "client";
  const issueLabel =
    category === "documents"
      ? issue.expiryStatus || issue.issueType
      : issue.noteType || issue.issueType;
  const alertDisabled = sending || issue.status === "alerted";

  return (
    <article
      data-testid="compliance-issue-row"
      aria-label={issue.userName + ": " + issueLabel}
      className="grid w-full min-w-0 gap-4 overflow-hidden rounded-2xl border border-[#E6EAEC] bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,auto)] lg:items-center"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#DFF6F6] font-bold text-[#007F83]">
          {issue.userName
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("")}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#10141A]">
            {issue.userName}
          </p>
          <p className="truncate text-sm text-[#808081]">
            {issue.userEmail || (isClient ? "Client" : "")}
          </p>
        </div>
      </div>

      <div
        id={agencyDetailsId}
        data-testid="compliance-issue-agency"
        className={cn(
          "min-w-0 border-t border-[#EDF0F1] pt-4 lg:block lg:border-0 lg:pt-0",
          expanded ? "block" : "hidden",
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-[#808081]">
          Agency
        </p>
        <p className="mt-1 truncate text-sm font-medium text-[#10141A]">
          {issue.agencyName || "Unknown Agency"}
        </p>
      </div>

      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          {category === "documents" && (
            <p className="truncate text-sm font-semibold text-[#10141A]">
              {issue.documentType || "Document"}
            </p>
          )}
          <span className="mt-1 inline-flex max-w-full whitespace-normal break-words rounded-full border border-[#FECACA] bg-[#FFF7F5] px-3 py-1.5 text-xs font-semibold text-[#B42318]">
            {issueLabel}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-expanded={expanded}
          aria-controls={agencyDetailsId + " " + actionDetailsId}
          aria-label={
            (expanded ? "Hide" : "Show") + " details for " + issue.userName
          }
          onClick={onToggle}
          className="shrink-0 border-[#E6EAEC] bg-white lg:hidden"
        >
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "transition-transform duration-200 motion-reduce:transition-none",
              expanded && "rotate-180",
            )}
          />
        </Button>
      </div>

      <div
        id={actionDetailsId}
        data-testid="compliance-issue-details"
        className={cn(
          "min-w-0 flex-col gap-3 border-t border-[#EDF0F1] pt-4 sm:flex-row sm:items-center lg:flex lg:flex-wrap lg:justify-end lg:border-0 lg:pt-0",
          expanded ? "flex" : "hidden",
        )}
      >
        {category !== "documents" && (
          <dl className="grid min-w-0 flex-1 gap-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#808081]">
                Reported
              </dt>
              <dd className="mt-1 text-sm font-medium text-[#10141A]">
                {formatDate(issue.createdAt)}
              </dd>
            </div>
            {issue.details && (
              <div className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#808081]">
                  Details
                </dt>
                <dd className="mt-1 break-words text-sm text-[#565656]">
                  {issue.details}
                </dd>
              </div>
            )}
          </dl>
        )}

        <div
          data-testid="compliance-issue-actions"
          className="flex min-w-0 w-full flex-wrap gap-2 sm:w-auto lg:justify-end"
        >
          {category === "documents" &&
            (isClient ? (
              <Button
                type="button"
                variant="outline"
                aria-label={"View client " + issue.userName}
                onClick={() => onViewClient(issue)}
                className="h-11 max-w-full border-[#00B4B8] bg-white text-[#007F83]"
              >
                <ExternalLink aria-hidden="true" />
                View client
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                aria-label={
                  "View " +
                  (issue.documentType || "document") +
                  " for " +
                  issue.userName
                }
                disabled={alertDisabled}
                onClick={() => onViewDocument(issue)}
                className="h-11 max-w-full border-[#CCCCCD] bg-white text-[#565656]"
              >
                <ExternalLink aria-hidden="true" />
                View document
              </Button>
            ))}
          <Button
            type="button"
            variant="destructive"
            aria-label={
              sending
                ? "Sending compliance alert to " + issue.userName
                : issue.status === "alerted"
                  ? "Compliance alert sent to " + issue.userName
                  : "Send compliance alert to " + issue.userName
            }
            disabled={alertDisabled}
            onClick={() => onSendAlert(issue)}
            className="h-11 max-w-full"
          >
            {sending ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Send aria-hidden="true" />
            )}
            {sending
              ? "Sending"
              : issue.status === "alerted"
                ? "Alert sent"
                : "Send alert"}
          </Button>
        </div>
      </div>
    </article>
  );
}
