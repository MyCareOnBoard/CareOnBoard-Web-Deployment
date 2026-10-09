import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { ClipboardCheck, FileText, LoaderCircle, Plus, UploadCloud } from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  agencyCareApi,
  type CareSubmission,
  type CareVersion,
  type CarePublicationOperation,
} from "@/lib/api/agencyCare";
import type { CareWorkspaceProps } from "./AgencyCareClientWorkspace";
import { hasCapability, useScopedMutation, useScopedRequest } from "./hooks";
import {
  ProtectedDocumentPreview,
  type CarePreview,
} from "./ProtectedDocumentPreview";
import {
  CareButton as Button,
  CareEmpty,
  CareFailure,
  CareFormDialog,
  CareHeading,
  CareLoad,
  CareNotice,
  CarePager,
  CarePanel,
  CareStatus,
  careDate,
  careLabel,
} from "./ui";

export function validateCareVersion(
  kind: "document" | "care_update",
  input: { file?: File | null; serviceDate?: string; summary?: string },
): string | null {
  if (kind === "care_update") {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(input.serviceDate || "") ||
      !Number.isFinite(Date.parse(`${input.serviceDate}T00:00:00Z`)) ||
      new Date(`${input.serviceDate}T00:00:00Z`).toISOString().slice(0, 10) !==
        input.serviceDate
    )
      return "Enter a valid service date.";
    if (!input.summary?.trim() || input.summary.length > 5000)
      return "Enter a service summary of at most 5,000 characters.";
    return null;
  }
  if (!input.file) return "Choose a file to upload.";
  if (!["application/pdf", "image/png", "image/jpeg"].includes(input.file.type))
    return "Choose a PDF, PNG or JPEG file.";
  if (input.file.size <= 0 || input.file.size > 10 * 1024 * 1024)
    return "Choose a nonempty PDF, PNG or JPEG up to 10 MiB.";
  return null;
}

export function CareSubmissionsPage(
  props: CareWorkspaceProps & { kind: "document" | "care_update" },
) {
  const { network, scope, agencyKey, kind } = props;
  const [search, setSearch] = useSearchParams();
  const [cursor, setCursor] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [create, setCreate] = useState(search.get("create") === "1");
  const selected = search.get("submission") || "";
  const requestedVersionId = search.get("version") || "";
  const list = useScopedRequest(
    `${scope}|${kind}|${cursor}|${status}|${query}`,
    (signal) =>
      agencyCareApi.submissions(network.id, {
        agencyKey,
        kind,
        cursor,
        status,
        query,
        signal,
      }),
    !selected,
  );
  const title = kind === "document" ? "Documents" : "Care updates";
  function open(submissionId: string) {
    setSearch({ submission: submissionId });
  }
  if (selected)
    return (
      <CareSubmissionDetail
        {...props}
        submissionId={selected}
        requestedVersionId={requestedVersionId}
        onBack={() => setSearch({})}
      />
    );
  return (
    <div className="ac-stack">
      <CareHeading
        title={title}
        description={
          kind === "document"
            ? "Share care files and follow their review and publication."
            : "Submit service information for the current Support Coordinator to review."
        }
        actions={
          hasCapability(network, "submit") && (
            <Button onClick={() => setCreate(true)}>
              <Plus size={16} aria-hidden="true" />
              {kind === "document" ? "Add a document" : "Submit an update"}
            </Button>
          )
        }
      />
      <CarePanel>
        <form
          className="ac-filter ac-filter-bar"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(searchInput.trim());
            setCursor("");
          }}
        >
          <label className="ac-field">
            <span>Search {title.toLowerCase()}</span>
            <Input
              type="search"
              value={searchInput}
              maxLength={80}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </label>
          <label className="ac-field">
            <span>Review status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setCursor("");
              }}
            >
              <option value="">All visible statuses</option>
              {[
                "draft",
                "pending_review",
                "revision_requested",
                "approved",
                "rejected",
                "archived",
              ].map((value) => (
                <option key={value} value={value}>
                  {careLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      </CarePanel>
      {list.loading ? (
        <CareLoad />
      ) : list.error ? (
        <CareFailure message={list.error} onRetry={list.reload} />
      ) : (
        <>
          <CarePanel title="Client submissions">
            {list.data?.items.length ? (
              <ul className="ac-list">
                {list.data.items.map((item) => (
                  <li key={item.id}>
                    <div className="ac-row-main">
                      <span className="ac-row-icon" aria-hidden="true">{kind === "document" ? <FileText size={18} /> : <ClipboardCheck size={18} />}</span>
                      <div className="ac-row-copy">
                        <strong>{item.title}</strong>
                        <p>
                        {careLabel(item.category)} ·{" "}
                        {item.draftVersionId
                          ? "Draft version available"
                          : "Submitted version"}
                        {item.syncStatus
                          ? ` · Publication: ${careLabel(item.syncStatus)}`
                          : ""}
                        </p>
                      </div>
                    </div>
                    <CareStatus>{careLabel(item.reviewStatus)}</CareStatus>
                    <Button variant="outline" onClick={() => open(item.id)}>
                      Open submission
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <CareEmpty title="No matching submissions">
                Only documents and updates within your current client grant and
                audience appear here.
              </CareEmpty>
            )}
          </CarePanel>
          <CarePager cursor={list.data?.nextCursor} onNext={setCursor} />
        </>
      )}
      {create && hasCapability(network, "submit") && (
        <CareSubmissionForm
          {...props}
          onClose={() => {
            setCreate(false);
            setSearch({});
          }}
          onSaved={(item) => {
            setCreate(false);
            open(item.id);
          }}
        />
      )}
    </div>
  );
}

export function CareSubmissionDetail(
  props: CareWorkspaceProps & {
    submissionId: string;
    requestedVersionId?: string;
    onBack: () => void;
  },
) {
  const {
    submissionId,
    network,
    scope,
    agencyKey,
    onBack,
    requestedVersionId = "",
  } = props;
  const detail = useScopedRequest(`${scope}|${submissionId}`, (signal) =>
    agencyCareApi.submission(submissionId, { agencyKey, signal }),
  );
  const linkedVersion = useScopedRequest(
    `${scope}|${submissionId}|notification-version|${requestedVersionId}`,
    (signal) =>
      agencyCareApi.versions(submissionId, {
        agencyKey,
        version: requestedVersionId,
        signal,
      }),
    Boolean(requestedVersionId && detail.data?.networkId === network.id),
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCursor, setHistoryCursor] = useState("");
  const history = useScopedRequest(
    `${scope}|${submissionId}|versions|${historyCursor}`,
    (signal) =>
      agencyCareApi.versions(submissionId, {
        agencyKey,
        cursor: historyCursor,
        signal,
      }),
    historyOpen,
  );
  const [preview, setPreview] = useState<CarePreview | null>(null);
  const [revision, setRevision] = useState(false);
  const [correction, setCorrection] = useState(false);
  const [decision, setDecision] = useState<
    "approve" | "reject" | "request_revision" | null
  >(null);
  const [publication, setPublication] =
    useState<CarePublicationOperation | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [formError, setFormError] = useState("");
  const [destinationCursor, setDestinationCursor] = useState("");
  const [destinationConfirmed, setDestinationConfirmed] = useState(false);
  const [newDestination, setNewDestination] = useState("");
  const destinations = useScopedRequest(
    `${scope}|recovery-destination|${publication?.id || ""}|${destinationCursor}`,
    (signal) =>
      agencyCareApi.sourceLinks(network.id, {
        agencyKey,
        cursor: destinationCursor,
        limit: 100,
        signal,
      }),
    Boolean(publication),
  );
  const mutation = useScopedMutation(`${scope}|${submissionId}`);
  if (detail.loading) return <CareLoad />;
  if (detail.error || !detail.data || detail.data.networkId !== network.id)
    return (
      <CareFailure
        message={
          detail.error ||
          "This submission is unavailable in this client workspace."
        }
        onRetry={detail.reload}
      />
    );
  const item = detail.data;
  const current = item.currentVersion;
  const notificationVersion = linkedVersion.data?.items.find(
    (version) => version.id === requestedVersionId,
  );
  const notificationIsCurrent = Boolean(notificationVersion && current?.id === notificationVersion.id);
  const draft = item.draftVersion;
  const newDestinations =
    destinations.data?.items
      .filter(
        (link) =>
          link.state === "confirmed" &&
          Boolean(link.acceptanceId) &&
          item.audience.some(
            (audience) =>
              audience.agencyKey === link.agencyKey &&
              audience.acceptanceId === link.acceptanceId,
          ),
      )
      .flatMap((link) =>
        link.programs
          .filter(
            (program) =>
              !item.publicationOperations?.some(
                (operation) =>
                  operation.destinationClientId === link.clientId &&
                  operation.program === program,
              ),
          )
          .map((program) => ({
            link,
            program,
            key: `${link.clientId}|${program}`,
          })),
      ) || [];
  const selectedDestination = newDestinations.find(
    (destination) => destination.key === newDestination,
  );
  const currentDestination = publication?.id
    ? destinations.data?.items.find(
        (link) =>
          link.state === "confirmed" &&
          link.clientId === publication.destinationClientId &&
          Boolean(
            publication.program && link.programs.includes(publication.program),
          ),
      )
    : selectedDestination?.link;
  const destinationProgram = publication?.id
    ? publication.program
    : selectedDestination?.program;
  const editable =
    hasCapability(item, "submit") &&
    ["draft", "revision_requested", "rejected"].includes(item.reviewStatus);
  const reviewable =
    hasCapability(item, "review") &&
    item.reviewStatus === "pending_review" &&
    Boolean(item.currentVersionId);
  const canArchive =
    hasCapability(item, "manage") ||
    (hasCapability(item, "submit") && item.reviewStatus === "draft");
  function showFile(version: CareVersion) {
    if (version.file)
      setPreview({
        submissionId,
        versionId: version.id,
        fileName: version.file.fileName,
        title: `${item.title} · Version ${version.number}`,
      });
  }
  function refresh() {
    setComment("");
    setConfirmed(false);
    setDecision(null);
    setPublication(null);
    setArchiveOpen(false);
    detail.reload();
    if (historyOpen) history.reload();
    mutation.reset();
  }
  async function submitDraft() {
    if (!draft?.id || !confirmed) {
      setFormError(
        "Confirm that this exact draft version is ready for review.",
      );
      return;
    }
    if (
      await mutation.run(
        (operationId, signal) =>
          agencyCareApi.submit(
            submissionId,
            { versionId: draft.id, expectedRevision: item.revision, operationId },
            { agencyKey, signal },
          ),
        { title: "Version submitted for review" },
      )
    )
      refresh();
  }
  async function decide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (
      publication &&
      (!currentDestination ||
        !destinationConfirmed ||
        destinations.error ||
        destinations.loading)
    ) {
      setFormError(
        "Confirm the current connected client and program before publication recovery.",
      );
      return;
    }
    if (
      (decision === "reject" ||
        decision === "request_revision" ||
        publication ||
        archiveOpen) &&
      !comment.trim()
    ) {
      setFormError("A reason or instruction is required.");
      return;
    }
    const saved = await mutation.run((operationId, signal) => {
      const options = { agencyKey, signal };
      if (decision && item.currentVersionId)
        return agencyCareApi.review(
          submissionId,
          {
            versionId: item.currentVersionId,
            expectedRevision: item.revision,
            decision,
            comment: comment.trim(),
            operationId,
          },
          options,
        );
      if (publication)
        return agencyCareApi.publicationOperation(
          submissionId,
          {
            action:
              !publication.id || publication.status === "withheld"
                ? "reauthorize"
                : "retry",
            ...(publication.id
              ? { destinationOperationId: publication.id }
              : { program: destinationProgram }),
            destinationClientId: currentDestination!.clientId,
            expectedRevision: item.revision,
            reason: comment.trim(),
            operationId,
          },
          options,
        );
      return agencyCareApi.archive(
        submissionId,
        {
          expectedRevision: item.revision,
          reason: comment.trim(),
          operationId,
        },
        options,
      );
    }, {
      title: publication
        ? "Publication queued"
        : decision === "approve"
          ? "Version approved"
          : decision === "reject"
            ? "Version rejected"
            : decision === "request_revision"
              ? "Revision requested"
              : "Submission archived",
      ...(publication && { description: "Check publication status for the result." }),
    });
    if (saved) refresh();
  }
  return (
    <div className="ac-stack">
      <CareHeading
        title={item.title}
        description={`${careLabel(item.category)} · ${careLabel(item.kind)}`}
        actions={
          <Button variant="outline" onClick={onBack}>
            Back to list
          </Button>
        }
      />
      <div className="ac-actions">
        <CareStatus>{careLabel(item.reviewStatus)}</CareStatus>
        <CareStatus>
          Publication: {careLabel(item.syncStatus || "not_required")}
        </CareStatus>
        {item.supersedesSubmissionId && (
          <span className="ac-muted">
            Linked correction of a previously approved submission
          </span>
        )}
      </div>
      {item.reviewComment && <CareNotice>{item.reviewComment}</CareNotice>}
      {requestedVersionId && !notificationIsCurrent && (
        <CarePanel title="Version linked to your notification">
          {linkedVersion.loading ? (
            <CareLoad rows={1} />
          ) : linkedVersion.error ? (
            <CareFailure
              message={linkedVersion.error}
              onRetry={linkedVersion.reload}
            />
          ) : notificationVersion ? (
            <div className="ac-stack">
              <CareNotice>
                This notification refers to version {notificationVersion.number}.
                This version is read-only. Review actions below apply to the
                current submitted version.
              </CareNotice>
              <strong>Version {notificationVersion.number}</strong>
              <VersionContents
                version={notificationVersion}
                onPreview={() => showFile(notificationVersion)}
              />
            </div>
          ) : (
            <CareEmpty title="This version is no longer available">
              The linked version may have been removed or your access changed.
              Current submission details remain below.
            </CareEmpty>
          )}
        </CarePanel>
      )}
      <div className="ac-two-columns">
        <div className="ac-stack">
          <CarePanel
            title={
              current
                ? `Submitted version ${current.number}`
                : "Submission draft"
            }
          >
            {notificationIsCurrent && (
              <CareNotice>
                This is the version linked to your notification.
              </CareNotice>
            )}
            {current ? (
              <VersionContents
                version={current}
                onPreview={() => showFile(current)}
              />
            ) : (
              <p className="ac-muted">
                No version has been submitted for review.
              </p>
            )}
          </CarePanel>
          {draft && (
            <CarePanel title={`Draft version ${draft.number}`}>
              <VersionContents
                version={draft}
                onPreview={() => showFile(draft)}
              />
              <CareNotice>
                Previous submitted versions and decisions stay in history until
                this draft is explicitly submitted.
              </CareNotice>
              {editable && (
                <>
                  <label className="ac-check">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                    />
                    <span>
                      I reviewed this exact draft and its selected audience.
                    </span>
                  </label>
                  <Button
                    disabled={
                      !confirmed || mutation.saving || mutation.uncertain
                    }
                    onClick={() => void submitDraft()}
                  >
                    Submit this version for review
                  </Button>
                </>
              )}
            </CarePanel>
          )}
          {editable && (
            <Button variant="outline" onClick={() => setRevision(true)}>
              {draft
                ? "Replace draft file or content"
                : "Prepare a new draft version"}
            </Button>
          )}
          {item.reviewStatus === "approved" &&
            hasCapability(item, "submit") && (
              <Button variant="outline" onClick={() => setCorrection(true)}>
                Prepare linked correction
              </Button>
            )}
          <CarePanel title="Version and decision history">
            <Button
              variant="outline"
              onClick={() => setHistoryOpen((value) => !value)}
              aria-expanded={historyOpen}
            >
              {historyOpen ? "Hide history" : "Show version history"}
            </Button>
            {historyOpen &&
              (history.loading ? (
                <CareLoad rows={1} />
              ) : history.error ? (
                <CareFailure message={history.error} onRetry={history.reload} />
              ) : (
                <>
                  <ul className="ac-list">
                    {history.data?.items.map((version) => (
                      <li key={version.id}>
                        <div>
                          <strong>Version {version.number}</strong>
                          <p>
                            {careDate(version.submittedAt || version.createdAt)}{" "}
                            ·{" "}
                            {version.review
                              ? careLabel(version.review.decision)
                              : "Draft or submitted"}
                            {version.review?.comment &&
                              ` · ${version.review.comment}`}
                          </p>
                        </div>
                        {version.file && (
                          <Button
                            variant="outline"
                            onClick={() => showFile(version)}
                          >
                            View exact version
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                  <CarePager
                    cursor={history.data?.nextCursor}
                    onNext={setHistoryCursor}
                  />
                </>
              ))}
          </CarePanel>
        </div>
        <aside className="ac-stack">
          <CarePanel title="Review and publication">
            <dl className="ac-details">
              <dt>Client</dt>
              <dd>{network.client.name}</dd>
              <dt>Current submitted version</dt>
              <dd>{current?.number ?? "Not submitted"}</dd>
              <dt>Review</dt>
              <dd>{careLabel(item.reviewStatus)}</dd>
              <dt>Publication</dt>
              <dd>{careLabel(item.syncStatus || "not_required")}</dd>
            </dl>
            {reviewable && (
              <div className="ac-stack">
                <Button
                  onClick={() => {
                    setDecision("approve");
                    setComment("");
                  }}
                >
                  Approve exact version
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDecision("request_revision");
                    setComment("");
                  }}
                >
                  Request revision
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDecision("reject");
                    setComment("");
                  }}
                >
                  Reject version
                </Button>
              </div>
            )}
            {item.reviewStatus === "approved" && (
              <p className="ac-muted">
                Approval is separate from successful publication to each
                authorized destination.
              </p>
            )}
          </CarePanel>
          {Boolean(item.publicationOperations?.length) && (
            <CarePanel title="Publication status">
              <ul className="ac-list">
                {item.publicationOperations?.map((operation) => (
                  <li key={operation.id}>
                    <div>
                      <strong>
                        {operation.destinationName || "Authorized destination"}
                        {operation.program &&
                          ` · ${operation.program.toUpperCase()}`}
                      </strong>
                      <p>
                        {careLabel(operation.status)}
                        {operation.reason && ` · ${operation.reason}`}
                      </p>
                      {operation.supersedesOperationId && (
                        <small>
                          New authorization preserves the previous operation.
                        </small>
                      )}
                    </div>
                    {hasCapability(
                      operation,
                      operation.status === "withheld" ? "reauthorize" : "retry",
                    ) &&
                      ["failed", "conflict", "withheld"].includes(
                        operation.status,
                      ) && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setPublication(operation);
                            setDestinationCursor("");
                            setDestinationConfirmed(false);
                            setComment("");
                          }}
                        >
                          {operation.status === "withheld"
                            ? "Reauthorize destination"
                            : "Retry destination"}
                        </Button>
                      )}
                  </li>
                ))}
              </ul>
            </CarePanel>
          )}
          {item.reviewStatus === "approved" &&
            hasCapability(network, "review") && (
              <Button
                variant="outline"
                onClick={() => {
                  setPublication({ id: "", status: "not_requested" });
                  setDestinationCursor("");
                  setNewDestination("");
                  setDestinationConfirmed(false);
                  setComment("");
                }}
              >
                Publish to newly linked record
              </Button>
            )}
          {canArchive &&
            ["draft", "approved", "rejected"].includes(item.reviewStatus) && (
              <Button variant="outline" onClick={() => setArchiveOpen(true)}>
                Archive submission
              </Button>
            )}
        </aside>
      </div>
      {!decision &&
        !publication &&
        !archiveOpen &&
        (formError || mutation.error) && (
          <CareFailure
            message={formError || mutation.error}
            onRetry={refresh}
          />
        )}
      <ProtectedDocumentPreview
        scope={scope}
        agencyKey={agencyKey}
        item={preview}
        onClose={() => setPreview(null)}
      />
      {(revision || correction) && (
        <CareSubmissionForm
          {...props}
          kind={item.kind}
          existing={item}
          correction={correction}
          onClose={() => {
            setRevision(false);
            setCorrection(false);
          }}
          onSaved={() => {
            setRevision(false);
            setCorrection(false);
            refresh();
          }}
        />
      )}
      <CareFormDialog
      className="ac-form-dialog"
        open={Boolean(decision || publication || archiveOpen)}
        title={
          decision
            ? `${careLabel(decision)} · Version ${current?.number ?? ""}`
            : publication
              ? publication.id
                ? "Publication recovery"
                : "Publish to a newly linked record"
              : "Archive submission"
        }
        description={item.title}
        onClose={() => {
          setDecision(null);
          setPublication(null);
          setArchiveOpen(false);
        }}
        busy={mutation.saving}
      >
        <form className="ac-dialog-form" onSubmit={(event) => void decide(event)}>
        <fieldset className="ac-dialog-body ac-stack" disabled={mutation.saving}>
          <CareNotice>
            {decision === "approve"
              ? "This decision approves the exact current submitted version. Authorized publication runs separately."
              : publication && !publication.id
                ? "This publishes the same approved version to a currently confirmed record within its original approved audience. It creates a new destination operation and preserves existing receipts."
                : publication?.status === "withheld"
                  ? "Reauthorization requires a current confirmed destination. The old withheld attempt and any successful receipts remain in history."
                  : archiveOpen
                    ? "Archiving preserves previous decisions and source publication receipts."
                    : "Record clear instructions or the reason for this action."}
          </CareNotice>
          {publication && (
            <section
              className="ac-stack"
              aria-label="Current publication destination"
            >
              <h3>Confirm the current destination</h3>
              {publication.id ? (
                <p>
                  Previous attempt: {careLabel(publication.status)} ·{" "}
                  {publication.program?.toUpperCase()}
                </p>
              ) : (
                <div className="ac-field">
                  <label htmlFor="care-new-destination">
                    Newly confirmed destination
                  </label>
                  <select
                    id="care-new-destination"
                    aria-describedby="care-new-destination-help"
                    required
                    value={newDestination}
                    onChange={(event) => {
                      setNewDestination(event.target.value);
                      setDestinationConfirmed(false);
                    }}
                  >
                    <option value="">
                      Choose an eligible connected record
                    </option>
                    {newDestinations.map((destination) => (
                      <option key={destination.key} value={destination.key}>
                        {destination.link.clientName || network.client.name} ·{" "}
                        {destination.program.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <small id="care-new-destination-help">
                    Only confirmed destinations matching the original approved
                    audience without an existing operation appear.
                  </small>
                </div>
              )}
              {destinations.loading ? (
                <CareLoad rows={1} />
              ) : destinations.error ? (
                <CareFailure
                  message={destinations.error}
                  onRetry={destinations.reload}
                />
              ) : currentDestination ? (
                <>
                  <dl className="ac-details">
                    <dt>Client record</dt>
                    <dd>
                      {currentDestination.clientName || network.client.name}
                    </dd>
                    <dt>Program</dt>
                    <dd>{destinationProgram?.toUpperCase()}</dd>
                    <dt>Connection</dt>
                    <dd>
                      Confirmed
                      {currentDestination.confirmedAt
                        ? ` · ${careDate(currentDestination.confirmedAt)}`
                        : ""}
                    </dd>
                  </dl>
                  <label className="ac-check">
                    <input
                      type="checkbox"
                      checked={destinationConfirmed}
                      onChange={(event) =>
                        setDestinationConfirmed(event.target.checked)
                      }
                    />
                    I confirm this currently connected client and program are
                    the intended publication destination.
                  </label>
                </>
              ) : (
                <CareNotice danger>
                  No matching current confirmed destination is available in this
                  page. Review the care team connection before continuing.
                </CareNotice>
              )}
              <CarePager
                cursor={destinations.data?.nextCursor}
                onNext={(value) => {
                  setDestinationConfirmed(false);
                  setDestinationCursor(value);
                }}
              />
            </section>
          )}
          <label className="ac-field">
            <span>
              {decision === "approve"
                ? "Review comment (optional)"
                : "Reason or instructions"}
            </span>
            <Textarea
              required={decision !== "approve"}
              value={comment}
              maxLength={2000}
              onChange={(event) => setComment(event.target.value)}
            />
          </label>
          {formError && <CareNotice danger>{formError}</CareNotice>}
          {mutation.error && <CareNotice danger>{mutation.error}</CareNotice>}
        </fieldset>
        <div className="ac-dialog-footer">
            <Button
              type="button"
              variant="outline"
              disabled={mutation.saving}
              onClick={() => {
                setDecision(null);
                setPublication(null);
                setArchiveOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                mutation.saving ||
                mutation.uncertain ||
                Boolean(
                  publication &&
                    (!currentDestination ||
                      !destinationConfirmed ||
                      destinations.loading ||
                      destinations.error),
                )
              }
            >
              {mutation.saving && <LoaderCircle size={16} aria-hidden="true" className="motion-safe:animate-spin" />}
              {mutation.saving ? "Saving…" : "Confirm action"}
            </Button>
          </div>
        </form>
      </CareFormDialog>
    </div>
  );
}

function VersionContents({
  version,
  onPreview,
}: {
  version: CareVersion;
  onPreview: () => void;
}) {
  return (
    <div className="ac-stack">
      {version.file && (
        <>
          <strong>{version.file.fileName}</strong>
          <p className="ac-muted">
            {Math.round(version.file.sizeBytes / 1024)} KB · Exact version{" "}
            {version.number}
          </p>
          <Button variant="outline" onClick={onPreview}>
            View file
          </Button>
        </>
      )}
      {version.body && (
        <>
          <dl className="ac-details">
            <dt>Service date</dt>
            <dd>{version.body.serviceDate}</dd>
            {version.body.serviceReference && (
              <>
                <dt>Service reference</dt>
                <dd>{version.body.serviceReference}</dd>
              </>
            )}
          </dl>
          <p className="ac-preserve">{version.body.summary}</p>
        </>
      )}
      {version.review && (
        <CareNotice>
          <strong>{careLabel(version.review.decision)}</strong>
          <p>{version.review.comment}</p>
          <small>{careDate(version.review.reviewedAt)}</small>
        </CareNotice>
      )}
    </div>
  );
}

export function CareSubmissionForm({
  network,
  scope,
  agencyKey,
  kind,
  existing,
  correction = false,
  sourceDocumentId,
  onClose,
  onSaved,
}: CareWorkspaceProps & {
  kind: "document" | "care_update";
  existing?: CareSubmission;
  correction?: boolean;
  sourceDocumentId?: string;
  onClose: () => void;
  onSaved: (item: CareSubmission) => void;
}) {
  const [mode, setMode] = useState<"upload" | "share">(
    sourceDocumentId ? "share" : "upload",
  );
  const [sourceId, setSourceId] = useState(sourceDocumentId || "");
  const [title, setTitle] = useState(existing?.title || "");
  const [category, setCategory] = useState(
    existing?.category ||
      (kind === "document" ? "service_report" : "service_update"),
  );
  const [file, setFile] = useState<File | null>(null);
  const [serviceDate, setServiceDate] = useState(
    existing?.draftVersion?.body?.serviceDate || "",
  );
  const [summary, setSummary] = useState(
    existing?.draftVersion?.body?.summary || "",
  );
  const [reference, setReference] = useState(
    existing?.draftVersion?.body?.serviceReference || "",
  );
  const [audience, setAudience] = useState<string[]>(
    existing?.audience.map((item) => item.agencyKey) || [],
  );
  const [draft, setDraft] = useState<CareSubmission | undefined>(
    correction ? undefined : existing,
  );
  const [formError, setFormError] = useState("");
  const relationships = useScopedRequest(
    `${scope}|submission-audience`,
    (signal) => agencyCareApi.relationships(network.id, { agencyKey, signal }),
  );
  const availableAudience =
    relationships.data?.items.filter((item) => item.state === "active") || [];
  const selectedAudienceCount = availableAudience.filter((item) =>
    audience.includes(item.agencyKey),
  ).length;
  const sourceDocuments = useScopedRequest(
    `${scope}|source-documents`,
    (signal) =>
      agencyCareApi.sourceDocuments(network.id, { agencyKey, signal }),
    mode === "share",
  );
  const mutation = useScopedMutation(
    `${scope}|submission-form|${existing?.id ?? "new"}|${correction}`,
  );
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!title.trim() || title.length > 160) {
      setFormError("Enter a title of at most 160 characters.");
      return;
    }
    if (!existing && !audience.length) {
      setFormError("Select the authorized audience for this submission.");
      return;
    }
    if (mode === "upload") {
      const error = validateCareVersion(kind, { file, serviceDate, summary });
      if (error) {
        setFormError(error);
        return;
      }
    }
    const saved = await mutation.run(async (operationId, signal) => {
      const options = { agencyKey, signal };
      if (mode === "share")
        return agencyCareApi.shareSourceDocument(
          network.id,
          {
            sourceDocumentId: sourceId.trim(),
            title: title.trim(),
            audience,
            operationId,
          },
          options,
        );
      const target =
        draft ??
        (await agencyCareApi.createSubmission(
          network.id,
          {
            kind,
            title: title.trim(),
            category,
            audience,
            operationId: `${operationId}_draft`,
            ...(correction && existing
              ? { supersedesSubmissionId: existing.id }
              : {}),
          },
          options,
        ));
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      setDraft(target);
      if (kind === "care_update")
        return agencyCareApi.addVersion(
          target.id,
          {
            expectedRevision: target.revision,
            operationId: `${operationId}_version`,
            body: {
              kind: "service_update",
              serviceDate,
              summary: summary.trim(),
              ...(reference.trim()
                ? { serviceReference: reference.trim() }
                : {}),
            },
          },
          options,
        );
      const formData = new FormData();
      formData.append(
        "metadata",
        JSON.stringify({
          expectedRevision: target.revision,
          operationId: `${operationId}_version`,
        }),
      );
      formData.append("file", file!);
      return agencyCareApi.addVersion(target.id, formData, options);
    }, {
      title: mode === "share"
        ? "Source document submitted for review"
        : correction
          ? "Correction draft version saved"
          : "Draft version saved",
    });
    if (saved) onSaved(saved);
  }
  function close() {
    if (
      (file || summary.trim() || title.trim()) &&
      !window.confirm(
        "Discard the unsaved changes in this form? Saved server drafts stay in your submissions.",
      )
    )
      return;
    onClose();
  }
  return (
    <CareFormDialog
      open
      className="ac-form-dialog"
      title={
        correction
          ? "Prepare a linked correction"
          : existing
            ? "Prepare a draft revision"
            : mode === "share"
              ? "Share an authorized source document"
              : kind === "document"
                ? "Add a care document"
                : "Prepare a service update"
      }
      description={network.client.name}
      onClose={close}
      busy={mutation.saving}
    >
      <form onSubmit={(event) => void save(event)} className="ac-dialog-form">
        <div className="ac-dialog-body">
          <fieldset className="ac-stack" disabled={mutation.saving}>
            {kind === "document" &&
              !existing &&
              hasCapability(network, "manage") && (
                <div className="ac-field">
                  <label htmlFor="care-document-source">Document source</label>
                  <select
                    id="care-document-source"
                    value={mode}
                    disabled={Boolean(draft)}
                    onChange={(event) => setMode(event.target.value as typeof mode)}
                  >
                    <option value="upload">Upload a new care file</option>
                    <option value="share">
                      Share an existing authorized source document
                    </option>
                  </select>
                </div>
              )}
            {kind === "document" && mode === "upload" && (
              <div className="ac-field">
                <span>Document file</span>
                <FileUpload
                  required
                  aria-label="Document file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onFilesSelected={(files) => {
                    if (mutation.saving) return;
                    const selected = files?.[0] || null;
                    setFile(selected);
                    setFormError(
                      selected
                        ? validateCareVersion("document", { file: selected }) || ""
                        : "",
                    );
                  }}
                  icon={
                    <span className="ac-upload-icon flex size-10 items-center justify-center rounded-full">
                      <UploadCloud className="size-5" aria-hidden="true" />
                    </span>
                  }
                  label={
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="ac-upload-title break-all">
                        {file ? (
                          file.name
                        ) : (
                          <>
                            <span className="ac-upload-state font-medium">
                              Click to upload
                            </span>{" "}
                            or drag and drop
                          </>
                        )}
                      </span>
                      <span className="ac-upload-help text-xs">
                        {file
                          ? `${Math.round(file.size / 1024)} KB · Click to replace`
                          : "PDF, PNG or JPEG · Maximum 10 MiB"}
                      </span>
                    </span>
                  }
                  className="ac-upload min-h-32 max-w-none border-dashed px-4 py-5 [&>span]:min-w-0 [&>span]:flex-col [&>span]:gap-2 [&>span]:text-center"
                />
              </div>
            )}
            <div className="ac-form-grid">
              <label className="ac-field">
                <span>Title</span>
                <Input
                  required
                  value={title}
                  placeholder={
                    kind === "document"
                      ? "e.g. Monthly progress report"
                      : "e.g. Service visit update"
                  }
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={160}
                  disabled={Boolean(draft)}
                />
              </label>
              <div className="ac-field">
                <label htmlFor="care-submission-category">Category</label>
                <select
                  id="care-submission-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  disabled={Boolean(draft)}
                >
                  {(kind === "document"
                    ? [
                      "service_report",
                      "progress_report",
                      "assessment",
                      "care_plan",
                      "incident_documentation",
                      "supporting_document",
                      "other_authorized_record",
                    ]
                    : ["service_update"]
                  ).map((value) => (
                    <option key={value} value={value}>
                      {careLabel(value)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {mode === "share" ? (
              sourceDocuments.loading ? (
                <CareLoad rows={1} />
              ) : sourceDocuments.error ? (
                <CareFailure
                  message={sourceDocuments.error}
                  onRetry={sourceDocuments.reload}
                />
              ) : (
                <div className="ac-field">
                  <label htmlFor="care-source-document">Existing authorized source document</label>
                  <select
                    id="care-source-document"
                    aria-describedby="care-source-document-help"
                    required
                    value={sourceId}
                    onChange={(event) => {
                      setSourceId(event.target.value);
                      const chosen = sourceDocuments.data?.items.find(
                        (item) => item.id === event.target.value,
                      );
                      if (chosen) {
                        setTitle(chosen.title);
                        setCategory(chosen.category);
                      }
                    }}
                  >
                    <option value="">Choose the source document</option>
                    {sourceDocuments.data?.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} · {item.fileName}
                      </option>
                    ))}
                  </select>
                  <small id="care-source-document-help">
                    Its current source authorization and selected care audience are
                    checked before a private snapshot is created.
                  </small>
                </div>
              )
            ) : kind === "care_update" ? (
              <>
                <label className="ac-field">
                  <span>Service date</span>
                  <Input
                    required
                    type="date"
                    value={serviceDate}
                    onChange={(event) => setServiceDate(event.target.value)}
                  />
                </label>
                <label className="ac-field">
                  <span>Service summary</span>
                  <Textarea
                    required
                    value={summary}
                    maxLength={5000}
                    onChange={(event) => setSummary(event.target.value)}
                  />
                </label>
                <label className="ac-field">
                  <span>Related service reference (optional)</span>
                  <Input
                    value={reference}
                    maxLength={200}
                    onChange={(event) => setReference(event.target.value)}
                  />
                </label>
              </>
            ) : null}
            {!existing || correction ? (
              <fieldset
                className="ac-audience"
                aria-describedby="care-submission-audience-help"
              >
                <legend>Selected care audience</legend>
                <p id="care-submission-audience-help" className="ac-muted">
                  Choose the connected agencies who should receive this{" "}
                  {kind === "document" ? "document" : "update"}.
                </p>
                {relationships.loading ? (
                  <CareLoad rows={1} />
                ) : relationships.error ? (
                  <CareFailure
                    message={relationships.error}
                    onRetry={relationships.reload}
                  />
                ) : availableAudience.length ? (
                  <>
                    <div className="ac-audience-options">
                      {availableAudience.map((item) => (
                        <label
                          className="ac-audience-option"
                          key={item.agencyKey}
                        >
                          <input
                            type="checkbox"
                            aria-label={item.name}
                            disabled={Boolean(draft)}
                            checked={audience.includes(item.agencyKey)}
                            onChange={(event) =>
                              setAudience((current) =>
                                event.target.checked
                                  ? [...current, item.agencyKey]
                                  : current.filter(
                                    (value) => value !== item.agencyKey,
                                  ),
                              )
                            }
                          />
                          <span className="ac-audience-details">
                            <strong>{item.name}</strong>
                            <small>
                              {item.kind === "internal"
                                ? "CareOnBoard agency"
                                : item.kind === "external"
                                  ? "External care agency"
                                  : "Connected care agency"}
                            </small>
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="ac-muted" aria-live="polite">
                      {selectedAudienceCount}{" "}
                      {selectedAudienceCount === 1 ? "agency" : "agencies"}{" "}
                      selected
                    </p>
                  </>
                ) : (
                  <CareNotice>
                    No active agencies are available in this list. Check this
                    client's connections in Care team before sharing.
                  </CareNotice>
                )}
              </fieldset>
            ) : (
              <p className="ac-muted">
                The submission’s previously authorized audience stays attached to
                this draft revision.
              </p>
            )}
            <CareNotice>
              {mode === "share"
                ? "Only an already authorized source document can be shared. Source access and the selected care audience are rechecked."
                : "Saving creates an unsubmitted draft version. Review the exact version and audience before explicitly submitting it."}
              {correction &&
                " The prior approval and publication remain in history."}
            </CareNotice>
            {draft && !existing && (
              <CareNotice>
                This draft’s title, category and audience are already saved. Retry
                the file or service summary step to finish this draft version.
              </CareNotice>
            )}
            {(formError || mutation.error) && (
              <CareNotice danger>{formError || mutation.error}</CareNotice>
            )}
          </fieldset>
        </div>
        <div className="ac-dialog-footer">
          <Button
            type="button"
            variant="outline"
            disabled={mutation.saving}
            onClick={close}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              mutation.saving || mutation.uncertain || relationships.loading
            }
          >
            {mutation.saving && <LoaderCircle size={16} aria-hidden="true" className="motion-safe:animate-spin" />}
            {mutation.saving
              ? "Saving…"
              : mode === "share"
                ? "Share source document"
                : "Save draft version"}
          </Button>
        </div>
      </form>
    </CareFormDialog>
  );
}
