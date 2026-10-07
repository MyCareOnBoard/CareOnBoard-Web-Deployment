import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { agencyCareApi } from "@/lib/api/agencyCare";
import type { CareWorkspaceProps } from "./AgencyCareClientWorkspace";
import { hasCapability, useScopedRequest } from "./hooks";
import {
  CareEmpty,
  CareFailure,
  CareHeading,
  CareLoad,
  CarePager,
  CarePanel,
  careDate,
  careLabel,
} from "./ui";

export function CareOverviewPage({
  network,
  scope,
  agencyKey,
}: CareWorkspaceProps) {
  const summary = useScopedRequest(scope, (signal) =>
    agencyCareApi.overview(network.id, { agencyKey, signal }),
  );
  const base = `/agency-care/networks/${encodeURIComponent(network.id)}`;
  return (
    <div className="ac-stack">
      <CareHeading
        title="Care overview"
        description="Review the care information and actions that need your attention."
        actions={
          hasCapability(network, "review") && (
            <Button asChild>
              <Link to="/agency-care/review-queue">Review pending items</Link>
            </Button>
          )
        }
      />
      <div className="ac-actions">
        {hasCapability(network, "submit") && (
          <>
            <Button asChild variant="outline">
              <Link to={`${base}/documents?create=1`}>Share a document</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`${base}/updates?create=1`}>Submit an update</Link>
            </Button>
          </>
        )}
      </div>
      {summary.loading ? (
        <CareLoad />
      ) : summary.error ? (
        <CareFailure message={summary.error} onRetry={summary.reload} />
      ) : (
        summary.data && (
          <>
            <div className="ac-metrics">
              {[
                ["Connected agencies", summary.data.counts.agencies],
                [
                  "Unread conversations",
                  summary.data.counts.unreadConversations,
                ],
                ["Documents to review", summary.data.counts.pendingDocuments],
                ["Updates to review", summary.data.counts.pendingUpdates],
              ]
                .filter(([, value]) => value !== undefined)
                .map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
            </div>
            {summary.data.unreadScope === "latest_100_conversations" && (
              <p className="ac-muted">
                Unread conversation count covers your latest 100 conversations.
              </p>
            )}
            <CarePanel title="Pending actions">
              {summary.data.pendingActions.length ? (
                <ul className="ac-list">
                  {summary.data.pendingActions.map((action) => (
                    <li key={action.id}>
                      <div>
                        <strong>{action.title}</strong>
                        {action.description && <p>{action.description}</p>}
                      </div>
                      <Button asChild variant="outline">
                        <Link
                          to={
                            action.submissionId
                              ? `${base}/${action.kind === "care_update" ? "updates" : "documents"}?submission=${encodeURIComponent(action.submissionId)}`
                              : action.conversationId
                                ? `${base}/conversations?conversation=${encodeURIComponent(action.conversationId)}`
                                : `${base}/team`
                          }
                        >
                          Review
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <CareEmpty title="No pending care actions">
                  New authorized submissions and care messages will appear here.
                </CareEmpty>
              )}
            </CarePanel>
            {summary.data.monitoring && (
              <CarePanel title="SC monitoring">
                <p>
                  Monitoring contacts and follow-ups have their own source
                  record and schedule.
                </p>
                <dl className="ac-details">
                  <dt>Last contact</dt>
                  <dd>{careDate(summary.data.monitoring.lastContactAt)}</dd>
                  <dt>Open monitoring follow-ups</dt>
                  <dd>
                    {summary.data.monitoring.openFollowUpCount ??
                      "Not available"}
                  </dd>
                  <dt>Next monitoring contact</dt>
                  <dd>
                    {careDate(summary.data.monitoring.nextMonitoringDueDate)}
                  </dd>
                </dl>
                {summary.data.monitoring.url &&
                  /^\/user-panel\/clients-and-services\/[^/?#]+\/monitoring(?:[?#]|$)/.test(
                    summary.data.monitoring.url,
                  ) && (
                    <Button asChild variant="outline">
                      <Link to={summary.data.monitoring.url}>
                        Open SC monitoring
                      </Link>
                    </Button>
                  )}
              </CarePanel>
            )}
          </>
        )
      )}
    </div>
  );
}
export function CareActivityPage({
  network,
  scope,
  agencyKey,
}: CareWorkspaceProps) {
  const [cursor, setCursor] = useState("");
  const activity = useScopedRequest(`${scope}|${cursor}`, (signal) =>
    agencyCareApi.activity(network.id, { agencyKey, cursor, signal }),
  );
  return (
    <div className="ac-stack">
      <CareHeading
        title="Care activity"
        description="Authorized events and changes in this client’s care workspace."
      />
      {activity.loading ? (
        <CareLoad />
      ) : activity.error ? (
        <CareFailure message={activity.error} onRetry={activity.reload} />
      ) : (
        <>
          <CarePanel title="Recent activity">
            {activity.data?.items.length ? (
              <ol className="ac-timeline">
                {activity.data.items.map((event) => (
                  <li key={event.id}>
                    <strong>{careLabel(event.action)}</strong>
                    <p>{event.description}</p>
                    <small>
                      {event.actorName ? `${event.actorName} · ` : ""}
                      {careDate(event.createdAt)}
                    </small>
                  </li>
                ))}
              </ol>
            ) : (
              <CareEmpty title="No visible activity">
                Care events within your authorized audience appear here.
              </CareEmpty>
            )}
          </CarePanel>
          <CarePager cursor={activity.data?.nextCursor} onNext={setCursor} />
        </>
      )}
    </div>
  );
}
