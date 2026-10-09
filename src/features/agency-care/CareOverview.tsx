import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Building2, ClipboardCheck, Clock3, FileText, MessageCircle, Plus } from "lucide-react";
import { agencyCareApi } from "@/lib/api/agencyCare";
import type { CareWorkspaceProps } from "./AgencyCareClientWorkspace";
import { TeamForm } from "./CareTeam";
import { hasCapability, useScopedRequest } from "./hooks";
import {
  CareButton as Button,
  CareEmpty,
  CareFailure,
  CareHeading,
  CareLoad,
  CarePager,
  CarePanel,
  careDate,
  careLabel,
} from "./ui";

export function CareOverviewPage(props: CareWorkspaceProps) {
  const { network, scope, agencyKey } = props;
  const [inviteOpen, setInviteOpen] = useState(false);
  const canInvite = hasCapability(network, "invite");
  const canReview = hasCapability(network, "review");
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
          <>
            {canReview && (
              <Button asChild>
                <Link to="/agency-care/review-queue">Review pending items</Link>
              </Button>
            )}
            {canInvite && (
              <Button
                variant={canReview ? "outline" : "default"}
                onClick={() => setInviteOpen(true)}
              >
                <Plus size={16} aria-hidden="true" />
                Add an agency
              </Button>
            )}
          </>
        }
      />
      <div className="ac-actions">
        {hasCapability(network, "submit") && (
          <>
            <Button asChild variant="outline">
              <Link to={`${base}/documents?create=1`}><FileText size={16} aria-hidden="true" />Share a document</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`${base}/updates?create=1`}><ClipboardCheck size={16} aria-hidden="true" />Submit an update</Link>
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
                      <div className="ac-row-main">
                        <span className="ac-row-icon" aria-hidden="true">
                          {action.conversationId ? <MessageCircle size={18} /> : action.submissionId ? <FileText size={18} /> : <Building2 size={18} />}
                        </span>
                        <div className="ac-row-copy">
                          <strong>{action.title}</strong>
                          {action.description && <p>{action.description}</p>}
                        </div>
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
      {inviteOpen && canInvite && (
        <TeamForm
          {...props}
          modal={{ kind: "invite" }}
          onClose={() => setInviteOpen(false)}
          onSaved={() => {
            setInviteOpen(false);
            summary.reload();
            props.refreshNetwork();
          }}
        />
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
  const [search] = useSearchParams();
  const selectedEvent = search.get("event") || "";
  const activity = useScopedRequest(`${scope}|${selectedEvent}|${cursor}`, (signal) =>
    agencyCareApi.activity(network.id, { agencyKey, ...(selectedEvent ? { event: selectedEvent } : { cursor }), signal }),
  );
  return (
    <div className="ac-stack">
      <CareHeading
        title="Care activity"
        description={selectedEvent ? "The care activity linked to your notification." : "Authorized events and changes in this client’s care workspace."}
        actions={selectedEvent && <Button asChild variant="outline"><Link to={`?agencyKey=${encodeURIComponent(agencyKey)}`}>View all activity</Link></Button>}
      />
      {activity.loading ? (
        <CareLoad />
      ) : activity.error ? (
        <CareFailure message={activity.error} onRetry={activity.reload} />
      ) : (
        <>
          <CarePanel title={selectedEvent ? "Notification details" : "Recent activity"}>
            {activity.data?.items.length ? (
              <ol className="ac-timeline">
                {activity.data.items.map((event) => (
                  <li key={event.id}>
                    <span className="ac-timeline-marker" aria-hidden="true"><Clock3 size={15} /></span>
                    <div className="ac-timeline-copy">
                      <strong>{event.title || careLabel(event.action)}</strong>
                      <p>{event.description}</p>
                      <small>
                        {event.actorName ? `${event.actorName} · ` : ""}
                        {careDate(event.createdAt)}
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <CareEmpty title={selectedEvent ? "This activity is no longer available" : "No visible activity"}>
                {selectedEvent ? "The event may have been removed or your access changed. View all activity to see the events currently available to you." : "Care events within your authorized audience appear here."}
              </CareEmpty>
            )}
          </CarePanel>
          {!selectedEvent && <CarePager cursor={activity.data?.nextCursor} onNext={setCursor} />}
        </>
      )}
    </div>
  );
}
