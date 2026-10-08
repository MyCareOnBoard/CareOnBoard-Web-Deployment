import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/utils/auth/context/AuthContext";
import {
  agencyCareApi,
  type CareSourcePublication,
} from "@/lib/api/agencyCare";
import { Textarea } from "@/components/ui/textarea";
import { useScopedMutation, useScopedRequest } from "./hooks";
import {
  ProtectedDocumentPreview,
  type CarePreview,
} from "./ProtectedDocumentPreview";
import {
  CareEmpty,
  CareFailure,
  CareLoad,
  CarePager,
  CarePanel,
  CareStatus,
  CareFormDialog,
  CareNotice,
  careDate,
} from "./ui";
import "./agency-care.css";

type SourceProps = { clientId: string; program: string; agencyKey?: string };
export function AgencyCareSourcePublications(props: SourceProps) {
  const { user } = useAuth();
  const scope = `${user?.uid}|${props.agencyKey || ""}|${props.clientId}|${props.program}`;
  return (
    <SourcePublications
      key={scope}
      {...props}
      scope={scope}
      authenticated={Boolean(user?.uid)}
    />
  );
}
function SourcePublications({
  clientId,
  program,
  agencyKey,
  scope,
  authenticated,
}: SourceProps & { scope: string; authenticated: boolean }) {
  const [cursor, setCursor] = useState("");
  const [preview, setPreview] = useState<CarePreview | null>(null);
  const [correction, setCorrection] = useState<CareSourcePublication | null>(
    null,
  );
  const publications = useScopedRequest(
    `${scope}|${cursor}`,
    (signal) =>
      agencyCareApi.sourcePublications(clientId, {
        program,
        agencyKey,
        cursor,
        signal,
      }),
    authenticated && Boolean(clientId),
  );
  return (
    <div className="agency-care ac-bridge">
      <CarePanel title="Published Agency Care records">
        <p className="ac-muted">
          Approved versions published to this exact client record keep their
          original receipt and source access policy.
        </p>
        {publications.loading ? (
          <CareLoad rows={1} />
        ) : publications.error ? (
          <CareFailure
            message={publications.error}
            onRetry={publications.reload}
          />
        ) : publications.data?.items.length ? (
          <ul className="ac-list">
            {publications.data.items.map((item) => {
              const fileName = item.fileName || item.file?.fileName;
              return (
                <li key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>
                      {item.versionNumber
                        ? `Exact version ${item.versionNumber} · `
                        : ""}
                      Published {careDate(item.publishedAt)}
                    </p>
                    {item.correctionMarker && <p>{item.correctionMarker}</p>}
                    {item.body && (
                      <p className="ac-preserve">
                        {item.body.serviceDate} · {item.body.summary}
                      </p>
                    )}
                  </div>
                  <div className="ac-actions">
                    {item.unavailable ? (
                      <CareStatus>File unavailable</CareStatus>
                    ) : (
                      fileName && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            setPreview({
                              clientId,
                              publicationId: item.publicationId || item.id,
                              fileName,
                              title: `${item.title}${item.versionNumber ? ` · Version ${item.versionNumber}` : ""}`,
                            })
                          }
                        >
                          View published version
                        </Button>
                      )
                    )}
                    {Boolean(item.allowedActions?.length) && (
                        <Button
                          variant="outline"
                          onClick={() => setCorrection(item)}
                        >
                          Correct publication
                        </Button>
                      )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <CareEmpty title="No visible publications">
            Authorized approved records published to this client appear here.
          </CareEmpty>
        )}
        <CarePager cursor={publications.data?.nextCursor} onNext={setCursor} />
      </CarePanel>
      <ProtectedDocumentPreview
        scope={scope}
        agencyKey={agencyKey}
        item={preview}
        onClose={() => setPreview(null)}
      />
      {correction && (
        <PublicationCorrection
          key={`${correction.id}|${correction.revision}`}
          clientId={clientId}
          program={program}
          agencyKey={agencyKey}
          scope={scope}
          item={correction}
          onClose={() => setCorrection(null)}
          onSaved={() => {
            setCorrection(null);
            setPreview(null);
            publications.reload();
          }}
        />
      )}
    </div>
  );
}

function PublicationCorrection({
  clientId,
  program,
  agencyKey,
  scope,
  item,
  onClose,
  onSaved,
}: SourceProps & {
  scope: string;
  item: CareSourcePublication;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [action, setAction] = useState<"retract" | "mark_corrected">(
    item.allowedActions?.[0] || "retract",
  );
  const [reason, setReason] = useState("");
  const [replacement, setReplacement] = useState("");
  const [cursor, setCursor] = useState("");
  const [error, setError] = useState("");
  const candidates = useScopedRequest(
    `${scope}|replacement|${item.id}|${cursor}`,
    (signal) =>
      agencyCareApi.sourcePublications(clientId, {
        program,
        agencyKey,
        cursor,
        signal,
      }),
    action === "mark_corrected",
  );
  const eligible =
    candidates.data?.items.filter(
      (row) =>
        row.id !== item.id &&
        row.state === "published" &&
        row.supersedesSubmissionId === item.submissionId,
    ) || [];
  const mutation = useScopedMutation(
    `${scope}|source-correction|${item.id}|${item.revision}`,
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (
      !item.allowedActions?.includes(action) ||
      !reason.trim() ||
      (action === "mark_corrected" &&
        !eligible.some((row) => (row.publicationId || row.id) === replacement))
    ) {
      setError(
        "Enter a reason and choose an approved replacement when marking a correction.",
      );
      return;
    }
    const saved = await mutation.run((operationId, signal) =>
      agencyCareApi.correctSourcePublication(
        clientId,
        item.publicationId || item.id,
        {
          action,
          reason: reason.trim(),
          expectedRevision: item.revision ?? 0,
          operationId,
          ...(action === "mark_corrected"
            ? { supersedingPublicationId: replacement }
            : {}),
        },
        { agencyKey, signal },
      ),
      { title: action === "retract" ? "Publication retracted" : "Publication marked as corrected" },
    );
    if (saved) onSaved();
  }
  return (
    <CareFormDialog
      open
      title="Correct a published source record"
      description={`${item.title} · Exact version ${item.versionNumber || ""}`}
      onClose={onClose}
      busy={mutation.saving}
    >
      <form className="ac-stack" onSubmit={(event) => void submit(event)}>
        <CareNotice>
          The original approved version, decision and receipt remain in history.
          Retraction makes this source copy unavailable; marking a correction
          identifies an independently approved replacement.
        </CareNotice>
        <label className="ac-field">
          <span>Correction action</span>
          <select
            value={action}
            onChange={(event) => {
              setAction(event.target.value as typeof action);
              setReplacement("");
            }}
          >
            {item.allowedActions?.map((value) => (
              <option key={value} value={value}>
                {value === "retract"
                  ? "Retract this publication"
                  : "Mark corrected with a replacement"}
              </option>
            ))}
          </select>
        </label>
        {action === "mark_corrected" && (
          <>
            {candidates.loading ? (
              <CareLoad rows={1} />
            ) : candidates.error ? (
              <CareFailure
                message={candidates.error}
                onRetry={candidates.reload}
              />
            ) : (
              <label className="ac-field">
                <span>Approved replacement publication</span>
                <select
                  required
                  value={replacement}
                  onChange={(event) => setReplacement(event.target.value)}
                >
                  <option value="">Choose an approved correction</option>
                  {eligible.map((row) => (
                    <option key={row.id} value={row.publicationId || row.id}>
                      {row.title} · Version {row.versionNumber}
                    </option>
                  ))}
                </select>
                <small>
                  Only independently approved corrections of this original
                  submission appear.
                </small>
              </label>
            )}
            <CarePager
              cursor={candidates.data?.nextCursor}
              onNext={(value) => {
                setReplacement("");
                setCursor(value);
              }}
            />
          </>
        )}
        <label className="ac-field">
          <span>Reason</span>
          <Textarea
            required
            value={reason}
            maxLength={2000}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        {(error || mutation.error) && (
          <CareNotice danger>{error || mutation.error}</CareNotice>
        )}
        <div className="ac-actions">
          <Button
            type="submit"
            disabled={
              mutation.saving ||
              mutation.uncertain ||
              !reason.trim() ||
              (action === "mark_corrected" && !replacement)
            }
          >
            Save source correction
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
