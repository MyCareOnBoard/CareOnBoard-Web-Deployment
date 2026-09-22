import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/utils/auth";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import { useAssignmentReviewScope } from "@/hooks/useAssignmentReview";
import { setAgencyMode } from "@/store/redux/agencyModeSlice";
import {
  getComplianceSources,
  parseComplianceView,
  sourceSection,
  sourceLabels,
  type Source,
  type ComplianceView,
} from "./workspaceScope";
import "./compliance.css";
import InitialFindings from "./InitialFindings";
import StaffChecks from "./StaffChecks";
import ClientChecks from "./ClientChecks";
import ShiftNotesSection from "./ShiftNotesSection";
import ManualAuditsSection from "./ManualAuditsSection";
const restricted =
  "You do not have access to these records. Ask your agency administrator.";
export default function ComplianceAlertsPage() {
  const { user } = useAuth();
  const mode = useEffectiveAgencyMode();
  const dispatch = useDispatch();
  const [params, setParams] = useSearchParams();
  const parsed = parseComplianceView(params);
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const scopeKey = JSON.stringify([useAssignmentReviewScope(), agencyId, mode]);
  const [lastScope, setLastScope] = useState(scopeKey);
  const pendingMode = useRef<string | null>(null);
  const setView = useCallback(
    (next: ComplianceView) => {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(next))
        if (value) search.set(key, value);
      setParams(search);
    },
    [setParams],
  );
  const lastUrl = useRef<string | null>(null);
  const requestedMode = parsed.ok ? parsed.view.mode : undefined;
  const modeSources = requestedMode
    ? getComplianceSources(user, requestedMode)
    : [];
  const modeAllowed =
    !requestedMode ||
    (modeSources.length > 0 &&
      (!parsed.ok ||
        !parsed.view.source ||
        modeSources.includes(parsed.view.source)));
  const urlChanged = lastUrl.current !== params.toString();
  useEffect(() => {
    const changed = lastUrl.current !== params.toString();
    lastUrl.current = params.toString();
    if (changed && requestedMode && requestedMode !== mode && modeAllowed) {
      pendingMode.current = requestedMode;
      dispatch(setAgencyMode({ agencyId, mode: requestedMode }));
      return;
    }
    if (lastScope !== scopeKey) {
      setLastScope(scopeKey);
      if (!changed && pendingMode.current !== mode) {
        const next = new URLSearchParams(params);
        for (const key of [
          "mode",
          "employeeId",
          "clientId",
          "auditId",
          "shiftId",
          "cursor",
          "staffCursor",
          "initialRunId",
        ])
          next.delete(key);
        setParams(next, { replace: true });
      }
      pendingMode.current = null;
    }
  }, [
    scopeKey,
    lastScope,
    params,
    requestedMode,
    mode,
    modeAllowed,
    dispatch,
    agencyId,
    setParams,
  ]);
  if (
    (urlChanged && requestedMode && requestedMode !== mode && modeAllowed) ||
    lastScope !== scopeKey
  )
    return null;
  const sources = getComplianceSources(user, mode);
  const reset = () => setParams({});
  return (
    <div className="compliance-workspace min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-0">
      <h1 className="mb-2 text-[28px] font-bold tracking-tight text-[#16343a] sm:text-[36px]">
        Compliance Alerts
      </h1>
      <p className="mb-7 text-sm text-[#5e7378]">See what needs attention. Open the affected record to take the next step.</p>
      {!parsed.ok ? (
        <div role="alert">
          {parsed.message}{" "}
          <Button variant="outline" onClick={reset}>
            Reset view
          </Button>
        </div>
      ) : !modeAllowed ||
        !sources.length ||
        (parsed.view.source && !sources.includes(parsed.view.source)) ? (
        <p role="alert">{restricted}</p>
      ) : parsed.view.initialRunId ? (
        <InitialFindings key={scopeKey+parsed.view.initialRunId} scopeKey={scopeKey} runId={parsed.view.initialRunId} mode={mode!} onBack={reset}/>
      ) : (
        <Workspace
          key={scopeKey}
          scopeKey={scopeKey}
          agencyId={agencyId}
          viewerId={user?.uid || ""}
          mode={mode!}
          sources={sources}
          view={parsed.view}
          setView={setView}
        />
      )}
    </div>
  );
}
function Workspace({
  scopeKey,
  agencyId,
  viewerId,
  mode,
  sources,
  view: incoming,
  setView,
}: {
  scopeKey: string;
  agencyId: string;
  viewerId: string;
  mode: string;
  sources: Source[];
  view: ComplianceView;
  setView: (view: ComplianceView) => void;
}) {
  const source = incoming.source || sources[0];
  const view = { ...incoming, source, section: sourceSection[source] };
  const lastSource = useRef<Partial<Record<string, Source>>>({});
  lastSource.current[view.section] = source;
  const saved = useRef<Partial<Record<Source, ComplianceView>>>({});
  saved.current[source] = view;
  const histories = useRef(new Map<string, Map<string, string | undefined>>());
  const selectSource = (next: Source) =>
    setView(
      saved.current[next] || {
        source: next,
        section: sourceSection[next],
        ...(mode === "ddd" || mode === "hha" ? { mode } : {}),
      },
    );
  const onApply = (filters: Partial<ComplianceView>) => {
    setView({
      ...view,
      ...filters,
      search: filters.search?.trim() || undefined,
      cursor: undefined,
      staffCursor: undefined,
    });
  };
  const onSelect = (selection: Partial<ComplianceView>) => {
    setView({ ...view, ...selection });
  };
  const onPage = useCallback(
    (cursor?: string, staff = false) => {
      const key = source + (staff ? ":staff" : "");
      const field = staff ? "staffCursor" : "cursor";
      if (cursor) {
        const history =
          histories.current.get(key) ?? new Map<string, string | undefined>();
        history.set(cursor, view[field]);
        histories.current.set(key, history);
      }
      setView({ ...view, [field]: cursor });
    },
    [source, JSON.stringify(view), setView],
  );
  const onPrevious = (staff = false) => {
    const key = source + (staff ? ":staff" : "");
    // Browser Back/Forward changes the current URL; it must not consume page history.
    const cursor = histories.current
      .get(key)
      ?.get(view[staff ? "staffCursor" : "cursor"] || "");
    setView({ ...view, [staff ? "staffCursor" : "cursor"]: cursor });
  };
  const props = {
    view,
    scopeKey,
    agencyId,
    viewerId,
    mode,
    onApply,
    onSelect,
    onPage,
    onPrevious,
  };
  const sections = [...new Set(sources.map((item) => sourceSection[item]))];
  return (
    <>
      <div
        role="tablist"
        aria-label="Compliance sections"
        className="mb-5 flex flex-wrap gap-6 border-b border-[#dce7e8]"
      >
        {sections.map((section, index) => (
          <button
            key={section}
            type="button"
            role="tab"
            id={`compliance-tab-${section}`}
            aria-controls={`compliance-panel-${section}`}
            aria-selected={view.section === section}
            tabIndex={view.section === section ? 0 : -1}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? sections.length - 1
                    : (index +
                        (event.key === "ArrowRight"
                          ? 1
                          : sections.length - 1)) %
                      sections.length;
              (
                event.currentTarget.parentElement?.children[next] as HTMLElement
              )?.focus();
              selectSource(
                lastSource.current[sections[next]] ||
                  sources.find(
                    (item) => sourceSection[item] === sections[next],
                  )!,
              );
            }}
            onClick={() =>
              selectSource(
                lastSource.current[section] ||
                  sources.find((item) => sourceSection[item] === section)!,
              )
            }
            className={`border-b-[3px] px-1 py-3 text-base font-semibold transition-colors ${view.section === section ? "border-[#008b90] text-[#007f84]" : "border-transparent text-[#5e7378] hover:text-[#007f84]"}`}
          >
            {section[0].toUpperCase() + section.slice(1)}
          </button>
        ))}
      </div>
      {mode === "sc" && (
        <p className="mb-4 text-sm text-[#808081]">
          Client checklist and shift-note checks are available in DDD and HHA
          only.
        </p>
      )}
      <div
        role="tabpanel"
        id={`compliance-panel-${view.section}`}
        aria-labelledby={`compliance-tab-${view.section}`}
        className="min-w-0 overflow-hidden rounded-2xl border border-[#dce7e8] bg-white"
      >
        <div className="flex flex-wrap gap-2 border-b border-[#dce7e8] p-3 sm:px-5">
          {sources
            .filter((item) => sourceSection[item] === view.section)
            .map((item) => (
              <Button
                key={item}
                variant="ghost"
                aria-pressed={item === source}
                className={`rounded-lg px-4 text-sm ${item === source ? "bg-[#e4f5f4] text-[#007f84] hover:bg-[#d8eeee]" : "text-[#5e7378] hover:bg-[#f5f9f9]"}`}
                onClick={() => selectSource(item)}
              >
                {sourceLabels[item]}
              </Button>
            ))}
        </div>
        {(source === "document_expiry" || source === "training") && (
          <StaffChecks key={source} {...props} />
        )}
        {(source === "client_documents" || source === "unsigned_form485") && (
          <ClientChecks key={source} {...props} />
        )}
        {source === "manual_audits" && <ManualAuditsSection key={source} {...props} />}
        {source === "shift_notes" && (
          <ShiftNotesSection key={source} {...props} />
        )}
      </div>
    </>
  );
}
