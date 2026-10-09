import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { Link } from "react-router";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/useDebounce";
import { agencyCareApi, type CareGrant, type CareMember, type CareRole, type CareStaffRoster } from "@/lib/api/agencyCare";
import { useAgencyCare } from "./AgencyCareLayout";
import type { CareWorkspaceProps } from "./AgencyCareClientWorkspace";
import { hasCapability, useScopedMutation, useScopedRequest } from "./hooks";
import { CareButton as Button, CareEmpty, CareFailure, CareFormDialog, CareLoad, CareNotice, CarePager, CarePanel, CarePerson, CareStatus, careLabel, careRoleLabel, CARE_ROLE_LABELS as roles } from "./ui";
import "./staff-assignment.css";

const presets = [
  { id: "view", title: "View only", detail: "Read information shared with your agency.", capabilities: ["view"] },
  { id: "message", title: "View and message", detail: "View shared care and send messages in permitted conversations.", capabilities: ["view", "send"] },
  { id: "contribute", title: "Contribute", detail: "View shared care, message, and submit documents or updates for review.", capabilities: ["view", "send", "submit"] },
];
function jobRoleLabel(role?: string | null) { return role ? roles[role as CareRole] || careLabel(role) : "Organization member"; }
function presetFor(capabilities: string[]) {
  return presets.find(preset => preset.capabilities.length === capabilities.length && preset.capabilities.every(value => capabilities.includes(value)));
}
function protectedGrant(grant: CareGrant) {
  return grant.protectedAuthority || !grant.careRole || grant.capabilities.some(value => !["view", "send", "submit"].includes(value));
}

export function CareStaffAssignments(props: CareWorkspaceProps & {
  highlightedUid?: string;
  openRequested?: boolean;
  onRequestHandled?: () => void;
  onAdvancedAccess?: (grant?: CareGrant) => void;
}) {
  const { network, scope, agencyKey } = props;
  const { uid, organization } = useAgencyCare();
  const manage = hasCapability(network, "manage");
  const canAssign = manage && organization.role === "administrator";
  const [page, setPage] = useState({ uid: props.highlightedUid, cursor: "" });
  const cursor = page.uid === props.highlightedUid ? page.cursor : "";
  function setCursor(value: string) { setPage({ uid: props.highlightedUid, cursor: value }); }
  const [dialog, setDialog] = useState<{ target?: CareGrant } | null>(null);
  const grants = useScopedRequest(`${scope}|staff-grants|${cursor}`, signal =>
    agencyCareApi.grants(network.id, { agencyKey, cursor, signal }), manage);
  const ownRelationship = useScopedRequest(`${scope}|own-staff-relationship`, async signal => {
    let cursor: string | undefined;
    const seen = new Set<string>();
    do {
      const page = await agencyCareApi.relationships(network.id, { agencyKey, cursor, signal, limit: 100 });
      const own = page.items.find(item => item.agencyKey === agencyKey);
      if (own) return own;
      cursor = page.nextCursor || undefined;
      if (cursor && seen.has(cursor)) throw new Error("Care team could not finish loading.");
      if (cursor) seen.add(cursor);
    } while (cursor);
    return null;
  });
  useEffect(() => {
    if (props.openRequested && canAssign) {
      setDialog({});
      props.onRequestHandled?.();
    }
  }, [props.openRequested, canAssign, props.onRequestHandled]);
  const members = ownRelationship.data?.members || [];
  const rows = manage ? (grants.data?.items || []).filter(item => item.state !== "revoked" && item.capabilities.includes("view") && !members.some(member => member.uid === item.uid && member.isSourceCoordinator)) : [];
  const self = members.find(member => member.uid === uid);
  const sourceCoordinator = members.find(member => member.isSourceCoordinator);
  const loading = ownRelationship.loading || grants.loading;
  const error = ownRelationship.error || grants.error;
  const highlighted = Boolean(props.highlightedUid && (sourceCoordinator?.uid === props.highlightedUid || (manage ? rows : members).some(member => member.uid === props.highlightedUid)));
  const notificationRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (loading || error || !highlighted) return;
    notificationRef.current?.scrollIntoView?.({ block: "center" });
    notificationRef.current?.focus({ preventScroll: true });
  }, [props.highlightedUid, highlighted, loading, error, cursor]);
  function refresh() { setCursor(""); grants.reload(); ownRelationship.reload(); }
  return <div className="ac-stack">
    {props.highlightedUid && !loading && !error && <CareNotice>
      <p>{highlighted ? "The staff member referenced by your notification is highlighted below. These are their current care-team details." : manage && grants.data?.nextCursor
        ? "The staff member referenced by this notification is not on this page. This is your agency’s current care team. Use Next page to check more assignments."
        : "The staff record referenced by this notification is not shown in your agency’s current results. Access or team membership may have changed."}</p>
      {!highlighted && cursor && <Button type="button" variant="link" onClick={() => setCursor("")}>Back to first page</Button>}
    </CareNotice>}
    {!manage && self && <CarePanel title="My care assignment">
      <div className="ac-staff-summary"><div><small>Care role</small><strong>{careRoleLabel(self.careRole)}</strong></div><div><small>Client access</small><strong>{presetFor(self.capabilities || network.capabilities || [])?.title || "Current permitted access"}</strong></div></div>
      <p className="ac-muted">Your agency manages this assignment. Care roles describe participation; they do not change formal SC responsibility.</p>
    </CarePanel>}
    {loading ? <CareLoad rows={3} /> : error ? <CareFailure message={error} onRetry={refresh} /> : <CarePanel title={organization.name} actions={canAssign && !props.onRequestHandled ? <Button onClick={() => setDialog({})}><Plus aria-hidden="true" className="size-4" />Assign staff</Button> : undefined}>
      <p className="ac-muted ac-staff-intro">{manage ? "Manage your agency’s assignments for this client." : "People from your agency participating in this client’s care."}</p>
      {sourceCoordinator && <div ref={node => { if (sourceCoordinator.uid === props.highlightedUid) notificationRef.current = node; }} tabIndex={sourceCoordinator.uid === props.highlightedUid ? -1 : undefined} className={`ac-staff-source${sourceCoordinator.uid === props.highlightedUid ? " ac-notification-target" : ""}`}><CarePerson name={sourceCoordinator.name} detail="Formally assigned Support Coordinator" /><CareStatus>Assigned SC</CareStatus></div>}
      {manage ? rows.length ? <div className="ac-staff-table-wrap"><table className="ac-staff-table"><thead><tr><th>Staff member</th><th>Care role</th><th>Client access</th><th>Actions</th></tr></thead><tbody>{rows.map(grant => {
        const member = members.find(item => item.uid === grant.uid);
        const protectedAccess = protectedGrant(grant);
        return <tr key={grant.uid} ref={node => { if (grant.uid === props.highlightedUid) notificationRef.current = node; }} tabIndex={grant.uid === props.highlightedUid ? -1 : undefined} className={grant.uid === props.highlightedUid ? "ac-notification-target" : undefined}><td><CarePerson name={grant.name || member?.name || "Assigned user"} detail={grant.jobRole ? jobRoleLabel(grant.jobRole) : protectedAccess ? "Existing authorized access" : undefined} /></td><td data-label="Care role">{careRoleLabel(grant.careRole)}{grant.isPrimaryContact && <CareStatus>Agency primary contact</CareStatus>}</td><td data-label="Client access">{grant.effective === false ? <CareStatus tone="warning">Access unavailable</CareStatus> : presetFor(grant.capabilities)?.title || "Existing authorized access"}</td><td>{protectedAccess ? props.onAdvancedAccess && <Button variant="outline" onClick={() => props.onAdvancedAccess?.(grant)}>Edit authorized access</Button> : canAssign && <Button variant="outline" onClick={() => setDialog({ target: grant })}>Manage</Button>}</td></tr>;
      })}</tbody></table></div> : <CareEmpty title={grants.data?.nextCursor ? "No active assignments on this page" : "No staff assigned yet"}>Assign eligible people from your agency. Each person receives access to this client only.</CareEmpty> : members.filter(member => !member.isSourceCoordinator).length ? <ul className="ac-list">{members.filter(member => !member.isSourceCoordinator).map(member => <li key={member.uid} ref={node => { if (member.uid === props.highlightedUid) notificationRef.current = node; }} tabIndex={member.uid === props.highlightedUid ? -1 : undefined} className={member.uid === props.highlightedUid ? "ac-notification-target" : undefined}><CarePerson name={member.name} detail={careRoleLabel(member.careRole)} />{member.isPrimaryContact && <CareStatus>Agency primary contact</CareStatus>}</li>)}</ul> : <CareEmpty title="No additional staff assigned">Your agency administrator manages client care assignments.</CareEmpty>}
      {manage && <CarePager cursor={grants.data?.nextCursor} onNext={setCursor} />}
      {manage && props.onAdvancedAccess && <Button variant="ghost" onClick={() => props.onAdvancedAccess?.()}>Manage other authorized client access</Button>}
    </CarePanel>}
    <p className="ac-muted ac-staff-note">Care roles apply to this workspace. Employment, service assignments, and formal SC assignments remain in your existing agency panel.</p>
    {dialog && canAssign && <StaffAssignmentDialog {...props} target={dialog.target} currentPrimaryName={members.find(member => member.isPrimaryContact)?.name} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); refresh(); props.refreshNetwork(); }} />}
  </div>;
}

function StaffAssignmentDialog({ network, scope, agencyKey, target: initialTarget, currentPrimaryName, onClose, onSaved }: CareWorkspaceProps & {
  target?: CareGrant;
  currentPrimaryName?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { organization } = useAgencyCare();
  const [target, setTarget] = useState(initialTarget);
  const [selected, setSelected] = useState<CareMember | null>(initialTarget ? {
    ...initialTarget, name: initialTarget.name || "Assigned staff member", assignment: initialTarget, status: "active",
  } : null);
  const [queryInput, setQueryInput] = useState("");
  const query = useDebounce(queryInput.trim());
  const [cursor, setCursor] = useState("");
  const [careRole, setCareRole] = useState<CareRole | "">(initialTarget?.careRole || initialTarget?.eligibleCareRoles?.[0] || "");
  const [access, setAccess] = useState(presetFor(initialTarget?.capabilities || ["view"])?.id || "view");
  const [primary, setPrimary] = useState(initialTarget?.isPrimaryContact || false);
  const [removing, setRemoving] = useState(false);
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [validation, setValidation] = useState("");
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [freshRoster, setFreshRoster] = useState<CareStaffRoster | null>(null);
  const [reconcile, setReconcile] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [selected?.uid, removing]);
  const refreshController = useRef<AbortController | null>(null);
  useEffect(() => () => { refreshController.current?.abort(); }, [scope]);
  const waiting = query !== queryInput.trim();
  const roster = useScopedRequest(`${scope}|staff-candidates|${query}|${cursor}`, signal =>
    agencyCareApi.networkMembers(network.id, { agencyKey, query, cursor, signal, limit: 25 }), !waiting);
  const authority = freshRoster || roster.data;
  const currentPerson = authority?.items.find(member => member.uid === selected?.uid) || selected;
  const eligibleRoles = (currentPerson?.eligibleCareRoles || []).filter(role => role !== "support_coordinator" || organization.kind === "internal");
  const allowed = (currentPerson?.allowedCapabilities || []).filter(value => authority?.allowedCapabilities.includes(value) && network.capabilities?.includes(value));
  const availablePresets = presets.filter(preset => preset.capabilities.every(value => allowed.includes(value)));
  const chosenPreset = availablePresets.find(preset => preset.id === access);
  const mutation = useScopedMutation(`${scope}|staff-assignment|${selected?.uid || "new"}`);
  type StaffCommand = Omit<Parameters<typeof agencyCareApi.grant>[2], "operationId">;
  const command = useRef<{ uid: string; input: StaffCommand } | null>(null);
  async function persist(input: StaffCommand, uid: string) {
    const result = await mutation.run((operationId, signal) => agencyCareApi.grant(network.id, uid, { ...input, operationId }, { agencyKey, signal }).catch(error => {
      if (!signal.aborted && error?.response?.status === 409) setNeedsRefresh(true);
      throw error;
    }), { title: input.capabilities.length ? initialTarget ? "Staff assignment updated" : "Staff assigned" : "Staff removed", description: input.capabilities.length ? "Client care access is now updated." : "Their access to this care workspace has ended." });
    if (result) onSaved();
  }
  useEffect(() => {
    if (reconcile && !mutation.uncertain && !mutation.saving && command.current) {
      setReconcile(false);
      void persist(command.current.input, command.current.uid);
    }
  }, [reconcile, mutation.uncertain, mutation.saving]);
  async function refreshAuthority() {
    refreshController.current?.abort();
    const controller = new AbortController();
    refreshController.current = controller;
    setRefreshing(true); setValidation("");
    try {
      const fresh = await agencyCareApi.networkMembers(network.id, { agencyKey, query: selected?.name || query, limit: 100, signal: controller.signal });
      if (controller.signal.aborted) return;
      let cursor: string | undefined;
      let current: CareGrant | undefined;
      const seen = new Set<string>();
      do {
        const page = await agencyCareApi.grants(network.id, { agencyKey, cursor, limit: 100, signal: controller.signal });
        if (controller.signal.aborted) return;
        current = page.items.find(grant => grant.uid === selected?.uid);
        if (current) break;
        cursor = page.nextCursor || undefined;
        if (cursor && seen.has(cursor)) throw new Error("Could not finish checking current assignments.");
        if (cursor) seen.add(cursor);
      } while (cursor);
      setFreshRoster(fresh); setTarget(current);
      const person = fresh.items.find(member => member.uid === selected?.uid);
      if (person) setSelected(person);
      else if (selected && current) setSelected({ ...selected, ...current, name: current.name || selected.name });
      else if (selected) setSelected({ ...selected, status: "unavailable", eligibleCareRoles: [], allowedCapabilities: [] });
      setNeedsRefresh(false); mutation.reset();
    } catch { if (!controller.signal.aborted) setValidation("Could not refresh current access. Your choices are kept; try again."); }
    finally { if (!controller.signal.aborted) setRefreshing(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setValidation("");
    if (!selected || !authority || needsRefresh || mutation.saving || mutation.uncertain || refreshing || (target && protectedGrant(target))) return;
    if (removing && !reason.trim()) { setValidation("Choose a reason for removal."); return; }
    if (removing && reason === "Other" && !otherReason.trim()) { setValidation("Enter a reason for removal."); return; }
    if (!removing && (!eligibleRoles.includes(careRole as CareRole) || !chosenPreset || currentPerson?.status !== "active")) { setValidation("Choose an eligible care role and permitted access for an active staff member."); return; }
    const input: StaffCommand = {
      agencyKey, capabilities: removing ? [] : chosenPreset!.capabilities,
      ...(careRole ? { careRole: careRole as CareRole } : {}),
      ...(selected.employeeId ? { employeeId: selected.employeeId } : {}),
      isPrimaryContact: removing ? false : primary,
      expectedRevision: target?.revision ?? currentPerson?.grantRevision ?? 0,
      expectedRelationshipRevision: authority.relationshipRevision,
      ...(removing ? { reason: reason === "Other" ? otherReason.trim() : reason } : {}),
    };
    command.current = { uid: selected.uid, input };
    await persist(input, selected.uid);
  }
  function pick(member: CareMember) {
    setSelected(member); setTarget(member.assignment || undefined); setCareRole(member.eligibleCareRoles?.[0] || "");
    const available = presets.filter(preset => preset.capabilities.every(value => member.allowedCapabilities?.includes(value) && authority?.allowedCapabilities.includes(value) && network.capabilities?.includes(value)));
    setAccess(available[0]?.id || "view"); setPrimary(false); setValidation("");
  }
  const busy = mutation.saving || refreshing;
  const protectedAccess = Boolean(target && protectedGrant(target));
  const blocked = busy || mutation.uncertain || needsRefresh || protectedAccess || roster.loading || Boolean(roster.error) || !authority || !selected || (!removing && (!chosenPreset || !eligibleRoles.includes(careRole as CareRole) || currentPerson?.status !== "active"));
  return <CareFormDialog open title={removing ? "Remove staff from this care team" : initialTarget ? "Manage staff assignment" : "Assign staff"} description={`${network.client.name} · ${organization.name}`} busy={busy} onClose={onClose} className="ac-form-dialog ac-staff-dialog">
    <form className="ac-dialog-form" onSubmit={event => void submit(event)}>
      <div ref={bodyRef} className="ac-dialog-body"><fieldset disabled={busy || mutation.uncertain} className="ac-stack">
        {removing ? <>
          <CarePerson name={selected?.name || "Staff member"} detail={careRoleLabel(target?.careRole)} />
          <p>Removing this assignment ends their access to {network.client.name}’s care workspace. Existing messages, documents and audit history remain attributed to them.</p>
          {target?.isPrimaryContact && <CareNotice>The agency’s primary contact will be cleared. You can choose another assigned contact later.</CareNotice>}
          <label className="ac-field"><span>Reason for removal</span><select required value={reason} onChange={event => setReason(event.target.value)}><option value="">Select a reason</option>{["Staff reassigned", "No longer part of this care team", "Assignment made in error", "Other"].map(value => <option key={value}>{value}</option>)}</select></label>
          {reason === "Other" && <label className="ac-field"><span>Removal details</span><Textarea required value={otherReason} maxLength={2000} onChange={event => setOtherReason(event.target.value)} /></label>}
        </> : !selected ? <>
          <label className="ac-field"><span>Search {organization.kind === "external" ? "agency members" : "your agency’s staff"}</span><div className="ac-staff-search"><Search aria-hidden="true" className="size-4" /><Input type="search" value={queryInput} maxLength={80} placeholder="Search by name or job role" onChange={event => { setQueryInput(event.target.value); setCursor(""); setFreshRoster(null); }} onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }} /><Button type="button" variant="ghost" aria-label="Clear staff search" onClick={() => { setQueryInput(""); setCursor(""); }}><X aria-hidden="true" className="size-4" /></Button></div><small>Results update as you type. Only your agency’s staff are shown.</small></label>
          {waiting || roster.loading ? <CareLoad rows={3} /> : roster.error ? <CareFailure message={roster.error} onRetry={roster.reload} /> : <>
            <fieldset className="ac-staff-roster"><legend>Choose a staff member</legend>{roster.data?.items.length ? roster.data.items.map(member => {
              const assigned = member.assignment?.state === "active" && member.assignment.capabilities.includes("view");
              const disabled = assigned || member.status !== "active" || !member.eligibleCareRoles?.length;
              return <label key={member.uid} className="ac-staff-candidate"><input type="radio" name="care-staff-candidate" disabled={disabled} checked={false} aria-label={`Select ${member.name}`} onChange={() => pick(member)} /><CarePerson name={member.name} detail={jobRoleLabel(member.jobRole)} />{disabled && <CareStatus>{assigned ? "Already assigned" : member.status === "active" ? "No eligible care role" : member.status || "Unavailable"}</CareStatus>}</label>;
            }) : <CareEmpty title={roster.data?.nextCursor ? "No matching staff on this page" : query ? "No matching staff" : "No eligible staff yet"}>{query ? "Try a different name or clear the search." : "Staff need active, linked accounts before receiving client access."}</CareEmpty>}</fieldset>
            <CarePager cursor={roster.data?.nextCursor} onNext={setCursor} />
          </>}
          <p className="ac-muted">Missing someone? <Link to={organization.kind === "external" ? "/agency-care/settings" : "/agency/dsp-management"}>Manage agency {organization.kind === "external" ? "members" : "employees"}</Link>, then return to assign client access.</p>
        </> : <>
          <div className="ac-staff-selected"><CarePerson name={selected.name} detail={jobRoleLabel(selected.jobRole)} />{!initialTarget && <Button type="button" variant="ghost" onClick={() => { setSelected(null); setTarget(undefined); setFreshRoster(null); }}>Change</Button>}</div>
          <label className="ac-field"><span>Care role for this client</span><select required value={careRole} onChange={event => setCareRole(event.target.value as CareRole)}><option value="">Choose a care role</option>{careRole && !eligibleRoles.includes(careRole) && <option value={careRole} disabled>{careRoleLabel(careRole)} · no longer available</option>}{eligibleRoles.map(role => <option key={role} value={role}>{careRoleLabel(role)}</option>)}</select><small>Roles describe care-team participation. SC roles are available only to verified SC-agency staff.</small></label>
          {careRole === "support_coordinator" && <CareNotice>This collaboration role does not change the formally assigned SC, monitoring access or review authority.</CareNotice>}
          <fieldset className="ac-staff-presets"><legend>Client access</legend>{availablePresets.map(preset => <label key={preset.id} className="ac-staff-preset"><input type="radio" name="care-staff-access" value={preset.id} checked={access === preset.id} onChange={() => setAccess(preset.id)} /><span><strong>{preset.title}</strong><small>{preset.detail}</small></span></label>)}</fieldset>
          {!chosenPreset && <CareNotice danger>Choose access within your agency’s current approved permissions.</CareNotice>}
          <label className="ac-staff-primary"><input type="checkbox" checked={primary} onChange={event => setPrimary(event.target.checked)} /><span>Primary contact for {organization.name}<small>{authority?.primaryContactUid && authority.primaryContactUid !== selected.uid ? `This replaces ${currentPrimaryName || "the current contact"} as your agency’s primary contact.` : "Optional. The care team can identify your agency’s main point of contact."}</small></span></label>
          <p className="ac-muted">Access applies to information shared with your agency for this client.</p>
          {initialTarget && <Button type="button" variant="ghost" className="ac-staff-remove" onClick={() => { setRemoving(true); setValidation(""); }}>Remove from care team</Button>}
        </>}
        {protectedAccess && <CareNotice danger>This person now has protected authorization. Close this dialog and use authorized access management.</CareNotice>}
        {(validation || mutation.error) && <CareNotice danger>{validation || mutation.error}{needsRefresh && <p>Your selections are kept. Refresh current permissions before saving again.</p>}</CareNotice>}
      </fieldset>
      {needsRefresh && <Button type="button" variant="outline" disabled={busy} onClick={() => void refreshAuthority()}>{refreshing && <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />}Refresh permissions</Button>}
      {mutation.uncertain && <Button type="button" variant="outline" onClick={() => { mutation.reset(); setReconcile(true); }}>Check assignment outcome</Button>}
      </div>
      <div className="ac-dialog-footer"><small>Applies to this client only</small><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" aria-busy={mutation.saving} disabled={blocked}>{mutation.saving && <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />}{mutation.saving ? removing ? "Removing…" : "Saving…" : removing ? "Remove staff" : initialTarget ? "Save changes" : "Assign staff"}</Button></div>
    </form>
  </CareFormDialog>;
}
