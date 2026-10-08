import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/utils/auth/context/AuthContext";
import { updateScFollowUp, type ScFollowUp } from "@/lib/api/sc-monitoring";
import {
  agencyCareApi,
  type CareMonitoringTarget,
  type CareMonitoringLink,
  type CareEvidenceCandidate,
} from "@/lib/api/agencyCare";
import { hasCapability, useScopedMutation, useScopedRequest } from "./hooks";
import {
  ProtectedDocumentPreview,
  type CarePreview,
} from "./ProtectedDocumentPreview";
import {
  CareEmpty,
  CareFailure,
  CareFormDialog,
  CareLoad,
  CareNotice,
  CarePager,
  CarePanel,
  CareStatus,
  careDate,
  careLabel,
} from "./ui";
import "./agency-care.css";

type MonitoringBridgeProps = CareMonitoringTarget & {
  recordLabel?: string;
  agencyKey?: string;
  canManage?: boolean;
  onLinked?: () => void;
};
export function MonitoringCareBridge(props: MonitoringBridgeProps) {
  const { user } = useAuth();
  const scope = `${user?.uid}|${props.agencyKey || ""}|${props.clientId}|${props.recordKind}|${props.recordId}`;
  return (
    <MonitoringCareBridgeState
      key={scope}
      {...props}
      scope={scope}
      uid={user?.uid}
    />
  );
}
function MonitoringCareBridgeState({
  clientId,
  recordKind,
  recordId,
  recordLabel,
  agencyKey,
  canManage = false,
  onLinked,
  scope,
  uid,
}: MonitoringBridgeProps & { scope: string; uid?: string }) {
  const target = { clientId, recordKind, recordId };
  const [cursor, setCursor] = useState("");
  const [picker, setPicker] = useState(false);
  const [correct, setCorrect] = useState<CareMonitoringLink | null>(null);
  const [remove, setRemove] = useState<CareMonitoringLink | null>(null);
  const [request, setRequest] = useState(false);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<CarePreview | null>(null);
  const links = useScopedRequest(
    `${scope}|links|${cursor}`,
    (signal) =>
      agencyCareApi.monitoringLinks(target, { agencyKey, cursor, signal }),
    Boolean(uid && clientId && recordId),
  );
  const linkedNetwork = useScopedRequest(
    `${scope}|linked-network`,
    (signal) =>
      agencyCareApi.networkForClient(clientId, "sc", { agencyKey, signal }),
    Boolean(
      links.data?.items.some(
        (link) => link.kind === "conversation" && !link.unavailable,
      ),
    ),
  );
  const mutation = useScopedMutation(scope);
  async function unlink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!remove || !reason.trim()) return;
    const saved = await mutation.run((operationId, signal) =>
      agencyCareApi.removeMonitoringLink(
        target,
        remove.id,
        {
          expectedRevision: remove.revision,
          reason: reason.trim(),
          operationId,
        },
        { agencyKey, signal },
      ),
      { title: "Care link removed" },
    );
    if (saved) {
      setRemove(null);
      links.reload();
      onLinked?.();
    }
  }
  return (
    <div className="agency-care ac-bridge">
      <CarePanel
        title="Linked care evidence"
        actions={
          canManage && (
            <div className="ac-actions">
              <Button variant="outline" onClick={() => setPicker(true)}>
                Add approved evidence
              </Button>
              <Button variant="outline" onClick={() => setRequest(true)}>
                Ask partner
              </Button>
            </div>
          )
        }
      >
        <p className="ac-muted">
          Supporting care items have their own history. They do not create a
          monitoring contact, change its findings, or complete a follow-up.
        </p>
        {links.loading ? (
          <CareLoad rows={1} />
        ) : links.error ? (
          <CareFailure message={links.error} onRetry={links.reload} />
        ) : links.data?.items.length ? (
          <ul className="ac-list">
            {links.data.items.map((link) => (
              <li key={link.id}>
                <div>
                  <strong>
                    {link.unavailable
                      ? "Care item unavailable"
                      : link.title ||
                        (link.kind === "conversation"
                          ? "Shared partner request"
                          : "Approved care evidence")}
                  </strong>
                  <p>
                    {careLabel(link.state)} · {careDate(link.createdAt)}
                    {link.versionNumber &&
                      ` · Exact version ${link.versionNumber}`}
                  </p>
                  {link.reason && <p>Reason: {link.reason}</p>}
                  {link.correctionMarker && (
                    <CareNotice>
                      This source publication has been corrected. The link
                      preserves its selected approved version in monitoring
                      history. Choose an approved replacement when correcting
                      this evidence link.
                    </CareNotice>
                  )}
                  {link.kind === "conversation" &&
                    Boolean(link.responses?.length) && (
                      <CareNotice>
                        {link.responses!.length} partner{" "}
                        {link.responses!.length === 1
                          ? "reply received"
                          : "replies received"}{" "}
                        · Not reviewed for monitoring. Record your own follow-up
                        outcome after reviewing the reply.
                      </CareNotice>
                    )}
                  {link.events?.length && (
                    <details>
                      <summary>Private link history</summary>
                      <ol className="ac-timeline">
                        {link.events.map((event, index) => (
                          <li key={index}>
                            <strong>{careLabel(event.action)}</strong>
                            <p>{event.reason}</p>
                            <small>
                              {event.actorName} · {careDate(event.createdAt)}
                            </small>
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                </div>
                <div className="ac-actions">
                  <CareStatus>{careLabel(link.state)}</CareStatus>
                  {link.state === "active" &&
                    !link.unavailable &&
                    link.fileName &&
                    link.publicationId && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          setPreview({
                            clientId,
                            publicationId: link.publicationId!,
                            fileName: link.fileName!,
                            title: `${link.title || "Approved care evidence"}${link.versionNumber ? ` · Version ${link.versionNumber}` : ""}`,
                          })
                        }
                      >
                        View exact version
                      </Button>
                    )}
                  {link.kind === "conversation" &&
                    link.conversationId &&
                    !link.unavailable &&
                    (linkedNetwork.data?.networkId ? (
                      <Button asChild variant="outline">
                        <Link
                          to={`/agency-care/networks/${encodeURIComponent(linkedNetwork.data.networkId)}/conversations?conversation=${encodeURIComponent(link.conversationId)}`}
                        >
                          Open shared conversation
                        </Link>
                      </Button>
                    ) : (
                      <span className="ac-muted">
                        {linkedNetwork.loading
                          ? "Checking conversation access…"
                          : "Conversation unavailable"}
                      </span>
                    ))}
                  {canManage &&
                    hasCapability(link, "remove") &&
                    link.state === "active" && (
                      <>
                        {link.kind === "evidence" && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setCorrect(link);
                              setPicker(true);
                            }}
                          >
                            Correct link
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => {
                            setRemove(link);
                            setReason("");
                          }}
                        >
                          Remove link
                        </Button>
                      </>
                    )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <CareEmpty title="No care evidence linked">
            Choose an exact approved publication or share a selected question
            with a permitted care partner.
          </CareEmpty>
        )}
        <CarePager cursor={links.data?.nextCursor} onNext={setCursor} />
      </CarePanel>
      {picker && (
        <SavedEvidencePicker
          scope={scope}
          target={target}
          agencyKey={agencyKey}
          recordLabel={recordLabel}
          correction={correct}
          onClose={() => {
            setPicker(false);
            setCorrect(null);
          }}
          onSaved={() => {
            setPicker(false);
            setCorrect(null);
            links.reload();
            onLinked?.();
          }}
        />
      )}
      <CareFormDialog
        open={Boolean(remove)}
        title="Remove evidence link"
        description={recordLabel || "This saved monitoring record"}
        onClose={() => setRemove(null)}
        busy={mutation.saving}
      >
        <form className="ac-stack" onSubmit={(event) => void unlink(event)}>
          <CareNotice>
            The original link, approved version, source receipt and private
            history stay recorded. Removal changes only this link’s current
            state.
          </CareNotice>
          <label className="ac-field">
            <span>Reason for removing this link</span>
            <Textarea
              required
              maxLength={2000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          {mutation.error && <CareNotice danger>{mutation.error}</CareNotice>}
          <div className="ac-actions">
            <Button
              type="submit"
              disabled={mutation.saving || mutation.uncertain}
            >
              Remove link
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={mutation.saving}
              onClick={() => setRemove(null)}
            >
              Keep link
            </Button>
          </div>
        </form>
      </CareFormDialog>
      {request && (
        <PartnerRequestForm
          scope={scope}
          target={target}
          agencyKey={agencyKey}
          recordLabel={recordLabel}
          onClose={() => setRequest(false)}
          onSaved={() => {
            setRequest(false);
            links.reload();
          }}
        />
      )}
      <ProtectedDocumentPreview
        scope={scope}
        agencyKey={agencyKey}
        item={preview}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}

function EvidenceChoices({
  items,
  selected,
  onSelect,
  excluded,
}: {
  items: CareEvidenceCandidate[];
  selected: string;
  onSelect: (id: string) => void;
  excluded?: string;
}) {
  return (
    <fieldset>
      <legend>Exact approved source publication</legend>
      {items.length ? (
        <div className="ac-check-list">
          {items.map((item) => (
            <label key={item.publicationId}>
              <input
                type="radio"
                name="care-evidence"
                value={item.publicationId}
                checked={selected === item.publicationId}
                disabled={
                  item.eligible === false || item.publicationId === excluded
                }
                onChange={() => onSelect(item.publicationId)}
              />
              <span>
                <strong>
                  {item.title} · Version {item.versionNumber}
                </strong>
                <small>
                  Approved {careDate(item.approvedAt)}
                  {item.publicationId === excluded ? " · Already linked" : ""}
                </small>
              </span>
            </label>
          ))}
        </div>
      ) : (
        <CareEmpty title="No eligible publications">
          Only accessible approved versions published to this matching SC source
          record can be linked.
        </CareEmpty>
      )}
    </fieldset>
  );
}
function SavedEvidencePicker({
  scope,
  target,
  agencyKey,
  recordLabel,
  correction,
  onClose,
  onSaved,
}: {
  scope: string;
  target: CareMonitoringTarget;
  agencyKey?: string;
  recordLabel?: string;
  correction?: CareMonitoringLink | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [cursor, setCursor] = useState("");
  const [selected, setSelected] = useState("");
  const [reason, setReason] = useState("");
  const candidates = useScopedRequest(
    `${scope}|candidates|${cursor}`,
    (signal) =>
      agencyCareApi.evidenceCandidates(target.clientId, target, {
        agencyKey,
        cursor,
        signal,
      }),
  );
  const mutation = useScopedMutation(`${scope}|link-evidence`);
  const eligible =
    candidates.data?.items.filter(
      (item) => item.sourceClientId === target.clientId,
    ) || [];
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chosen = eligible.find((item) => item.publicationId === selected);
    if (!chosen || chosen.eligible === false || (correction && !reason.trim()))
      return;
    const saved = await mutation.run((operationId, signal) =>
      agencyCareApi.linkEvidence(
        target,
        {
          publicationId: chosen.publicationId,
          operationId,
          ...(correction
            ? {
                supersedesLinkId: correction.id,
                expectedRevision: correction.revision,
                reason: reason.trim(),
              }
            : {}),
        },
        { agencyKey, signal },
      ),
      { title: correction ? "Evidence link corrected" : "Approved evidence linked" },
    );
    if (saved) onSaved();
  }
  return (
    <CareFormDialog
      open
      title={correction ? "Correct evidence link" : "Add approved evidence"}
      description={
        recordLabel ||
        `Saved ${target.recordKind === "contact" ? "contact" : "follow-up"}`
      }
      onClose={onClose}
      busy={mutation.saving}
    >
      <form className="ac-stack" onSubmit={(event) => void save(event)}>
        <CareNotice>
          {correction
            ? "The old link and exact target stay in private history. A correction records its removal and appends the newly selected approved publication."
            : "This selection attaches to this saved monitoring record. Contact findings and follow-up status remain as recorded."}
        </CareNotice>
        {candidates.loading ? (
          <CareLoad rows={1} />
        ) : candidates.error ? (
          <CareFailure message={candidates.error} onRetry={candidates.reload} />
        ) : (
          <EvidenceChoices
            items={eligible}
            selected={selected}
            onSelect={setSelected}
            excluded={correction?.publicationId}
          />
        )}
        <CarePager cursor={candidates.data?.nextCursor} onNext={setCursor} />
        {correction && (
          <label className="ac-field">
            <span>Correction reason</span>
            <Textarea
              required
              maxLength={2000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
        )}
        {mutation.error && <CareNotice danger>{mutation.error}</CareNotice>}
        <div className="ac-actions">
          <Button
            type="submit"
            disabled={!selected || mutation.saving || mutation.uncertain}
          >
            {correction ? "Record correction" : "Link selected version"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={mutation.saving}
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </form>
    </CareFormDialog>
  );
}

type DraftEvidenceProps = {
  clientId: string;
  agencyKey?: string;
  selected: string[];
  onChange: (publicationIds: string[]) => void;
};
export function MonitoringDraftEvidence({
  clientId,
  agencyKey,
  selected,
  onChange,
}: DraftEvidenceProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState("");
  const [cursor, setCursor] = useState("");
  const scope = `${user?.uid}|${agencyKey || ""}|${clientId}|draft-evidence|${cursor}`;
  const candidates = useScopedRequest(
    scope,
    (signal) =>
      agencyCareApi.evidenceCandidates(clientId, undefined, {
        agencyKey,
        cursor,
        signal,
      }),
    open,
  );
  const eligible =
    candidates.data?.items.filter((item) => item.sourceClientId === clientId) ||
    [];
  return (
    <div className="agency-care ac-bridge">
      <CarePanel title="Supporting care evidence">
        <p>
          {selected.length
            ? `${selected.length} exact approved publication${selected.length === 1 ? "" : "s"} selected for this draft.`
            : "No care evidence selected."}
        </p>
        <p className="ac-muted">
          Selections save with the real contact. They do not prefill findings or
          change contact qualification.
        </p>
        <div className="ac-actions">
          <Button type="button" variant="outline" onClick={() => setOpen(true)}>
            Choose approved evidence
          </Button>
          {selected.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange([])}
            >
              Clear draft selection
            </Button>
          )}
        </div>
      </CarePanel>
      <CareFormDialog
        open={open}
        title="Select evidence for this contact draft"
        description="The selection is staged until the complete contact is saved."
        onClose={() => setOpen(false)}
      >
        {candidates.loading ? (
          <CareLoad rows={1} />
        ) : candidates.error ? (
          <CareFailure message={candidates.error} onRetry={candidates.reload} />
        ) : (
          <EvidenceChoices
            items={eligible.filter(
              (item) => !selected.includes(item.publicationId),
            )}
            selected={choice}
            onSelect={setChoice}
          />
        )}
        <CarePager cursor={candidates.data?.nextCursor} onNext={setCursor} />
        <div className="ac-actions">
          <Button
            type="button"
            disabled={!choice}
            onClick={() => {
              if (
                eligible.some(
                  (item) =>
                    item.publicationId === choice && item.eligible !== false,
                )
              ) {
                onChange([...new Set([...selected, choice])]);
                setChoice("");
                setOpen(false);
              }
            }}
          >
            Stage this exact version
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </CareFormDialog>
    </div>
  );
}

function PartnerRequestForm({
  scope,
  target,
  agencyKey,
  recordLabel,
  onClose,
  onSaved,
}: {
  scope: string;
  target: CareMonitoringTarget;
  agencyKey?: string;
  recordLabel?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const network = useScopedRequest(`${scope}|request-network`, (signal) =>
    agencyCareApi.networkForClient(target.clientId, "sc", {
      agencyKey,
      signal,
    }),
  );
  const networkId = network.data?.networkId || "";
  const team = useScopedRequest(
    `${scope}|request-recipients|${networkId}`,
    (signal) => agencyCareApi.relationships(networkId, { agencyKey, signal }),
    Boolean(networkId),
  );
  const conversations = useScopedRequest(
    `${scope}|request-conversations|${networkId}`,
    (signal) => agencyCareApi.conversations(networkId, { agencyKey, signal }),
    Boolean(networkId),
  );
  const recipients =
    team.data?.items
      .filter((item) => item.state === "active")
      .flatMap((item) =>
        (item.members || []).map((member) => ({
          ...member,
          agencyKey: item.agencyKey,
          agencyName: item.name,
        })),
      ) || [];
  const [recipientKey, setRecipientKey] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [summary, setSummary] = useState("");
  const [replyBy, setReplyBy] = useState("");
  const [error, setError] = useState("");
  const mutation = useScopedMutation(`${scope}|request`);
  const recipient = recipients.find(
    (item) => `${item.agencyKey}|${item.uid}` === recipientKey,
  );
  const permittedConversations =
    conversations.data?.items.filter(
      (item) =>
        item.members.some(
          (member) =>
            member.uid === recipient?.uid &&
            member.agencyKey === recipient?.agencyKey,
        ) && hasCapability(item, "send"),
    ) || [];
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!recipient || !summary.trim()) {
      setError(
        "Choose a currently permitted recipient and enter the selected request to share.",
      );
      return;
    }
    const saved = await mutation.run(async (operationId, signal) => {
      const options = { agencyKey, signal };
      const conversation = conversationId
        ? permittedConversations.find((item) => item.id === conversationId)
        : await agencyCareApi.createConversation(
            networkId,
            {
              type: "direct",
              title: "Care information request",
              members: [{ uid: recipient.uid, agencyKey: recipient.agencyKey }],
              operationId: `${operationId}_conversation`,
            },
            options,
          );
      if (!conversation || signal.aborted)
        throw new DOMException("Unavailable", "AbortError");
      return agencyCareApi.partnerRequest(
        target,
        {
          conversationId: conversation.id,
          recipientAgencyKey: recipient.agencyKey,
          recipientUid: recipient.uid,
          summary: summary.trim(),
          ...(replyBy ? { replyBy } : {}),
          operationId: `${operationId}_request`,
        },
        options,
      );
    }, { title: "Partner request created" });
    if (saved) onSaved();
  }
  return (
    <CareFormDialog
      open
      title="Ask a care partner"
      description={recordLabel || "Selected monitoring question"}
      onClose={onClose}
      busy={mutation.saving}
    >
      <form className="ac-stack" onSubmit={(event) => void send(event)}>
        {network.loading || team.loading || conversations.loading ? (
          <CareLoad rows={1} />
        ) : network.error || team.error || conversations.error ? (
          <CareNotice danger>
            {network.error || team.error || conversations.error}
          </CareNotice>
        ) : (
          <>
            <label className="ac-field">
              <span>Current granted recipient</span>
              <select
                required
                value={recipientKey}
                onChange={(event) => {
                  setRecipientKey(event.target.value);
                  setConversationId("");
                }}
              >
                <option value="">Choose the recipient explicitly</option>
                {recipients.map((item) => (
                  <option
                    key={`${item.agencyKey}|${item.uid}`}
                    value={`${item.agencyKey}|${item.uid}`}
                  >
                    {item.name} · {item.agencyName}
                  </option>
                ))}
              </select>
            </label>
            <label className="ac-field">
              <span>Conversation audience</span>
              <select
                value={conversationId}
                onChange={(event) => setConversationId(event.target.value)}
              >
                <option value="">
                  Create a direct conversation with this recipient
                </option>
                {permittedConversations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} · {item.type} · {item.members.length} permitted
                    members
                  </option>
                ))}
              </select>
            </label>
            <label className="ac-field">
              <span>Selected summary to share</span>
              <Textarea
                required
                maxLength={2000}
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
              />
            </label>
            <label className="ac-field">
              <span>Reply by (optional)</span>
              <Input
                type="date"
                value={replyBy}
                onChange={(event) => setReplyBy(event.target.value)}
              />
            </label>
            <CarePanel title="Recipient preview">
              <p className="ac-preserve">
                {summary || "Your selected question will appear here."}
              </p>
            </CarePanel>
            <CareNotice>
              Only this selected request is shared. Full monitoring findings,
              private record IDs and source links are excluded. A reply remains
              supporting information until the SC reviews it.
            </CareNotice>
          </>
        )}
        {(error || mutation.error) && (
          <CareNotice danger>{error || mutation.error}</CareNotice>
        )}
        <div className="ac-actions">
          <Button
            type="submit"
            disabled={
              !recipient ||
              !summary.trim() ||
              mutation.saving ||
              mutation.uncertain
            }
          >
            Send selected request
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={mutation.saving}
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </form>
    </CareFormDialog>
  );
}

type MonitoringCompletionProps = {
  open: boolean;
  clientId: string;
  followUpId: string;
  revisionToken: string;
  label: string;
  onClose: () => void;
  onCompleted: (followUp: ScFollowUp) => void;
};
export function MonitoringCompleteDialog(props: MonitoringCompletionProps) {
  const { user } = useAuth();
  const scope = `${user?.uid}|${props.clientId}|${props.followUpId}|${props.revisionToken}`;
  return <MonitoringCompleteDialogState key={scope} {...props} scope={scope} />;
}
function MonitoringCompleteDialogState({
  open,
  clientId,
  followUpId,
  revisionToken,
  label,
  onClose,
  onCompleted,
  scope,
}: MonitoringCompletionProps & { scope: string }) {
  const [outcome, setOutcome] = useState("");
  const mutation = useScopedMutation(scope);
  async function complete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!outcome.trim()) return;
    const result = await mutation.run(() =>
      updateScFollowUp(clientId, followUpId, {
        revisionToken,
        status: "completed",
        outcome: outcome.trim(),
      }),
      { title: "Follow-up completed", description: "The SC outcome has been recorded." },
    );
    if (result) {
      setOutcome("");
      onCompleted(result);
    }
  }
  return (
    <CareFormDialog
      open={open}
      title="Record outcome and complete follow-up"
      description={label}
      onClose={onClose}
      busy={mutation.saving}
    >
      <form className="ac-stack" onSubmit={(event) => void complete(event)}>
        <CareNotice>
          Review the supporting information and record the SC outcome
          explicitly. Care messages do not complete this monitoring action or
          reset the monitoring schedule.
        </CareNotice>
        <label className="ac-field">
          <span>SC outcome</span>
          <Textarea
            required
            maxLength={5000}
            value={outcome}
            onChange={(event) => setOutcome(event.target.value)}
          />
        </label>
        {mutation.error && <CareNotice danger>{mutation.error}</CareNotice>}
        <div className="ac-actions">
          <Button
            type="submit"
            disabled={!outcome.trim() || mutation.saving || mutation.uncertain}
          >
            Record outcome and complete
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={mutation.saving}
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </form>
    </CareFormDialog>
  );
}
