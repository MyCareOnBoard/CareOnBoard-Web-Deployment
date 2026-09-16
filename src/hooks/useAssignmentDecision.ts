import {useCallback, useEffect, useRef, useState} from 'react';
import {CHECKS_UNAVAILABLE, getAssignmentDecision, type AssignmentDecision, type DecisionSelection} from '@/lib/api/assignment-decision';

export function useAssignmentDecision(selection: DecisionSelection | null, {enabled, scopeKey, previewEnabled = true}: {enabled: boolean; scopeKey: string; previewEnabled?: boolean}) {
  const viewKey = JSON.stringify([scopeKey, enabled ? selection : null]);
  const current = useRef({selection, enabled, viewKey, previewEnabled}); current.current = {selection, enabled, viewKey, previewEnabled};
  const request = useRef<{generation: number; controller?: AbortController}>({generation: 0});
  const [state, setState] = useState<{key: string; decision: AssignmentDecision | null; loading: boolean; error: string | null; accessDenied?: boolean}>({key: '', decision: null, loading: false, error: null});
  const refresh = useCallback(async (force = true) => {
    const captured = current.current;
    request.current.controller?.abort();
    const generation = ++request.current.generation;
    if (!captured.enabled || !captured.selection || (!captured.previewEnabled && !force)) return;
    const controller = new AbortController(); request.current.controller = controller;
    const active = () => !controller.signal.aborted && current.current.viewKey === captured.viewKey && request.current.generation === generation;
    setState({key: captured.viewKey, decision: null, loading: true, error: null});
    try {const decision = await getAssignmentDecision(captured.selection, controller.signal); if (active()) setState({key: captured.viewKey, decision, loading: false, error: decision.state === 'unavailable' ? CHECKS_UNAVAILABLE : null});}
    catch (error) {if (active()) {
      const status = (error as {response?: {status?: number}})?.response?.status;
      const accessDenied = status === 401 || status === 403;
      setState({key: captured.viewKey, decision: null, loading: false, accessDenied, error: accessDenied ? 'You no longer have access to these assignment checks. Ask your agency administrator.' : CHECKS_UNAVAILABLE});
    }}
  }, []);
  useEffect(() => {void refresh(false); return () => {request.current.generation++; request.current.controller?.abort();};}, [viewKey, refresh]);
  const acceptDecision = useCallback((decision: AssignmentDecision | null, submittedKey: string, saved = false) => {
    if (current.current.viewKey !== submittedKey || !current.current.enabled) return false;
    request.current.generation++; request.current.controller?.abort();
    setState({key: submittedKey, decision, loading: false, error: decision ? null : saved ? 'Assignment saved. Assignment checks are unavailable.' : CHECKS_UNAVAILABLE});
    return true;
  }, []);
  return {viewKey, decision: state.key === viewKey ? state.decision : null, loading: enabled && previewEnabled && !!selection && (state.key !== viewKey || state.loading), error: state.key === viewKey ? state.error : null, accessDenied: state.key === viewKey && !!state.accessDenied, refresh, acceptDecision};
}
